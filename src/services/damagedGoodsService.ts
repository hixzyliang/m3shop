import { supabase } from '../lib/supabase';
import { InventoryService, DamagedGood } from './inventoryService';

export class DamagedGoodsService {
  // Get all damaged goods with good details
  static async getAllDamagedGoods(): Promise<DamagedGood[]> {
    try {
      const { data, error } = await supabase
        .from('damaged_goods')
        .select(`
          *,
          goods!inner(
            id,
            name, 
            code, 
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get all damaged goods error:', error);
        return [];
      }

      console.log('Damaged goods data:', data);

      // Map the data to match expected structure
      return (data || []).map((item: any) => ({
        ...item,
        good: item.goods
      }));
    } catch (error) {
      console.error('Get all damaged goods error:', error);
      return [];
    }
  }

  // Get damaged goods by good ID
  static async getDamagedGoodsByGood(goodId: string): Promise<DamagedGood[]> {
    try {
      const { data, error } = await supabase
        .from('damaged_goods')
        .select(`
          *,
          goods!inner(
            id,
            name, 
            code, 
            price
          )
        `)
        .eq('idgood', goodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get damaged goods by good error:', error);
        return [];
      }

      // Map the data to match expected structure
      return (data || []).map((item: any) => ({
        ...item,
        good: item.goods
      }));
    } catch (error) {
      console.error('Get damaged goods by good error:', error);
      return [];
    }
  }

  // Create damaged good record
  static async createDamagedGood(damagedData: {
    idgood: string;
    stock: number;
    reason: string;
    reported_by?: string;
  }): Promise<DamagedGood | null> {
    try {
      console.log('Creating damaged good with data:', damagedData);
      
      // Validate required fields
      if (!damagedData.idgood || !damagedData.reason || damagedData.stock <= 0) {
        console.error('Missing required fields for creating damaged good');
        return null;
      }

      // First, check if the good exists and has enough stock
      const { data: good, error: goodError } = await supabase
        .from('goods')
        .select('stock, damaged_stock')
        .eq('id', damagedData.idgood)
        .single();

      if (goodError || !good) {
        console.error('Good not found:', damagedData.idgood);
        return null;
      }

      const availableStock = (good.stock || 0) - (good.damaged_stock || 0);
      if (damagedData.stock > availableStock) {
        console.error('Not enough available stock');
        return null;
      }

      const insertData = {
        idgood: damagedData.idgood,
        stock: damagedData.stock,
        reason: damagedData.reason,
        reported_by: damagedData.reported_by || null
      };

      console.log('Insert data:', insertData);

      // Create damaged good record
      const { data, error } = await supabase
        .from('damaged_goods')
        .insert([insertData])
        .select('*')
        .single();

      if (error) {
        console.error('Create damaged good error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }

      // Update the good's damaged_stock
      const newDamagedStock = (good.damaged_stock || 0) + damagedData.stock;
      await supabase
        .from('goods')
        .update({ damaged_stock: newDamagedStock })
        .eq('id', damagedData.idgood);

      console.log('Damaged good created successfully:', data);
      return data;
    } catch (error) {
      console.error('Create damaged good error:', error);
      return null;
    }
  }

  // Update damaged good record
  static async updateDamagedGood(id: string, damagedData: {
    stock?: number;
    reason?: string;
  }): Promise<DamagedGood | null> {
    try {
      // Get current damaged good record
      const { data: currentDamaged } = await supabase
        .from('damaged_goods')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentDamaged) {
        console.error('Damaged good record not found');
        return null;
      }

      // If stock is being updated, adjust the good's damaged_stock
      if (damagedData.stock !== undefined && damagedData.stock !== currentDamaged.stock) {
        const stockDifference = damagedData.stock - currentDamaged.stock;
        
        const { data: good } = await supabase
          .from('goods')
          .select('damaged_stock')
          .eq('id', currentDamaged.idgood)
          .single();

        if (good) {
          const newDamagedStock = (good.damaged_stock || 0) + stockDifference;
          await supabase
            .from('goods')
            .update({ damaged_stock: Math.max(0, newDamagedStock) })
            .eq('id', currentDamaged.idgood);
        }
      }

      // Update damaged good record
      const { data, error } = await supabase
        .from('damaged_goods')
        .update(damagedData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update damaged good error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Update damaged good error:', error);
      return null;
    }
  }

  // Delete damaged good record
  static async deleteDamagedGood(id: string): Promise<boolean> {
    try {
      // Get current damaged good record
      const { data: currentDamaged } = await supabase
        .from('damaged_goods')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentDamaged) {
        console.error('Damaged good record not found');
        return false;
      }

      // Adjust the good's damaged_stock
      const { data: good } = await supabase
        .from('goods')
        .select('damaged_stock')
        .eq('id', currentDamaged.idgood)
        .single();

      if (good) {
        const newDamagedStock = Math.max(0, (good.damaged_stock || 0) - currentDamaged.stock);
        await supabase
          .from('goods')
          .update({ damaged_stock: newDamagedStock })
          .eq('id', currentDamaged.idgood);
      }

      // Delete damaged good record
      const { error } = await supabase
        .from('damaged_goods')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete damaged good error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete damaged good error:', error);
      return false;
    }
  }

  // Get damaged goods summary
  static async getDamagedGoodsSummary(): Promise<{
    totalDamagedItems: number;
    totalDamagedStock: number;
    totalValue: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('damaged_goods')
        .select(`
          stock,
          goods!inner(price)
        `);

      if (error) {
        console.error('Get damaged goods summary error:', error);
        return {
          totalDamagedItems: 0,
          totalDamagedStock: 0,
          totalValue: 0
        };
      }

      const rows = (data as unknown as Array<{ stock: number; goods: { price: number } }> ) || [];
      const totalDamagedItems = rows.length;
      const totalDamagedStock = rows.reduce((sum, item) => sum + (item.stock || 0), 0);
      const totalValue = rows.reduce((sum, item) => {
        const price = item.goods?.price || 0;
        return sum + (price * (item.stock || 0));
      }, 0);

      return {
        totalDamagedItems,
        totalDamagedStock,
        totalValue
      };
    } catch (error) {
      console.error('Get damaged goods summary error:', error);
      return {
        totalDamagedItems: 0,
        totalDamagedStock: 0,
        totalValue: 0
      };
    }
  }

  // Get damaged goods by date range
  static async getDamagedGoodsByDateRange(startDate: string, endDate: string): Promise<DamagedGood[]> {
    try {
      const { data, error } = await supabase
        .from('damaged_goods')
        .select(`
          *,
          goods!inner(
            id,
            name, 
            code, 
            price
          )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get damaged goods by date range error:', error);
        return [];
      }

      // Map the data to match expected structure
      return (data || []).map((item: any) => ({
        ...item,
        good: item.goods
      }));
    } catch (error) {
      console.error('Get damaged goods by date range error:', error);
      return [];
    }
  }
}