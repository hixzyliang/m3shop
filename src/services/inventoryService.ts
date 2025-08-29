import { supabase, Good, GoodWithDetails, Location, Category, Stock } from '../lib/supabase';

export interface DamagedGood {
  id: string;
  idgood: string;
  stock: number;
  reason: string;
  reported_by: string | null;
  created_at: string;
  good?: Good;
}

export interface GoodsHistory {
  id: string;
  idgood: string;
  idlocation: string;
  stock: number;
  type: 'in' | 'out' | 'adjustment' | 'initial';
  payment_type: string | null;
  price: number;
  description: string | null;
  note: string | null;
  created_at: string;
  good?: Good;
  location?: Location;
}

export class InventoryService {
  // Goods Management
  static async createGoodWithInitialStock(goodData: {
    idcategory: string;
    code: string;
    name: string;
    price: number;
    stock: number;
    locationId: string; // from UI, mapped to idlocation
  }): Promise<Good | null> {
    try {
      const mappedData = {
        idcategory: goodData.idcategory,
        code: goodData.code,
        name: goodData.name,
        price: goodData.price ?? 0,
        damaged_stock: 0
      };

      if (!mappedData.idcategory || !goodData.locationId || !mappedData.code || !mappedData.name) {
        const err = new Error('Missing required fields for creating good with initial stock');
        console.error(err.message, mappedData);
        throw err;
      }

      // Verify that the location exists before creating the good
      const { data: locationExists, error: locationCheckError } = await supabase
        .from('locations')
        .select('id')
        .eq('id', goodData.locationId)
        .single();

      if (locationCheckError || !locationExists) {
        console.error('Location not found for creating good:', goodData.locationId);
        throw new Error('Location not found');
      }

      const { data: createdGood, error: createError } = await supabase
        .from('goods')
        .insert([mappedData])
        .select('*')
        .single();

      if (createError || !createdGood) {
        console.error('Create good with initial stock error:', createError);
        throw createError || new Error('Failed to insert good');
      }

      // Create location_stocks record if locationId is provided
      if (goodData.locationId) {
        const { error: locationStockError } = await supabase
          .from('location_stocks')
          .insert([{
            idgood: createdGood.id,
            idlocation: goodData.locationId,
            stock: goodData.stock || 0
          }]);
        
        if (locationStockError) {
          console.error('Create location stock error:', locationStockError);
          // If location_stocks creation fails, we should clean up the created good
          await supabase.from('goods').delete().eq('id', createdGood.id);
          throw locationStockError;
        }
      }

      return createdGood as unknown as Good;
    } catch (error) {
      console.error('Create good with initial stock error (exception):', error);
      throw error;
    }
  }
  static async getAllGoods(): Promise<Good[]> {
    try {
      const { data, error } = await supabase
        .from('goods')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Get all goods error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get all goods error:', error);
      return [];
    }
  }

  static async getAllGoodsWithDetails(locationId?: string): Promise<GoodWithDetails[]> {
    try {
      let query = supabase
        .from('location_stocks')
        .select(`
          id,
          idgood,
          idlocation,
          stock,
          created_at,
          updated_at,
          good:goods(
            id,
            idcategory,
            code,
            name,
            price,
            damaged_stock,
            created_at,
            updated_at,
            category:categories(categoryname)
          ),
          location:locations(locationname, address, is_active)
        `);

      // Filter by location if provided
      if (locationId) {
        query = query.eq('idlocation', locationId);
      }

      const { data, error } = await query.order('id', { ascending: true });

      if (error) {
        console.error('Get all goods with details error:', error);
        return [];
      }

      // Transform the data to show one row per location per good
      const transformedData = (data || []).map((item: any) => {
        return {
          id: item.id, // Use location_stocks id as unique identifier
          goodsId: item.idgood, // Store the actual goods ID for editing
          idcategory: item.good?.idcategory,
          idlocation: item.idlocation,
          code: item.good?.code,
          name: item.good?.name,
          price: item.good?.price,
          stock: item.stock || 0,
          damaged_stock: item.good?.damaged_stock || 0,
          available_stock: item.stock || 0,
          created_at: item.good?.created_at,
          updated_at: item.updated_at,
          categoryname: item.good?.category?.categoryname || '',
          locationname: item.location?.locationname || '',
          locationaddress: item.location?.address || ''
        };
      });

      // Sort by good name on client side
      transformedData.sort((a, b) => a.name.localeCompare(b.name));

      return transformedData;
    } catch (error) {
      console.error('Get all goods with details error:', error);
      return [];
    }
  }

  static async getGoodsByLocation(locationId: string): Promise<GoodWithDetails[]> {
    return this.getAllGoodsWithDetails(locationId);
  }

  // Stock Management
  static async getAllStocks(): Promise<Stock[]> {
    try {
      const { data, error } = await supabase
        .from('location_stocks')
        .select(`
          id,
          idgood,
          idlocation,
          stock,
          created_at,
          updated_at,
          good:goods(
            id,
            idcategory,
            code,
            name,
            price,
            damaged_stock
          ),
          location:locations(locationname, address, is_active)
        `)
        .order('id', { ascending: true });

      if (error) {
        console.error('Get all stocks error:', error);
        return [];
      }

      // Transform data to match Stock interface
      const stocks: Stock[] = (data as any[] || []).map((item: any) => ({
        id: item.id,
        idgood: item.idgood,
        idlocation: item.idlocation,
        stock: item.stock || 0,
        type: 'in' as const,
        payment_type: undefined,
        price: item.good?.price || 0,
        created_at: item.created_at || new Date().toISOString(),
        good: {
          id: item.idgood,
          idcategory: item.good?.idcategory || '',
          idlocation: item.idlocation,
          code: item.good?.code || '',
          name: item.good?.name || '',
          price: item.good?.price || 0,
          stock: item.stock || 0,
          damaged_stock: item.good?.damaged_stock || 0,
          created_at: item.created_at || '',
          updated_at: item.updated_at || ''
        },
        location: {
          id: item.idlocation,
          locationname: item.location?.locationname || '',
          address: item.location?.address || '',
          is_active: item.location?.is_active ?? true,
          created_at: item.created_at || '',
          updated_at: item.updated_at || ''
        }
      }));

      // Sort by good name on client side with safety check
      stocks.sort((a, b) => (a.good?.name || '').localeCompare(b.good?.name || ''));

      return stocks;
    } catch (error) {
      console.error('Get all stocks error:', error);
      return [];
    }
  }

  static async getAllGoodsHistory(locationId?: string): Promise<GoodsHistory[]> {
    try {
      let query = supabase
        .from('goods_history')
        .select(`
          *,
          good:goods(name, code),
          location:locations(locationname)
        `);

      // Filter by location if provided
      if (locationId) {
        query = query.eq('idlocation', locationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Get all goods history error:', error);
        return [];
      }

      return (data || []) as GoodsHistory[];
    } catch (error) {
      console.error('Get all goods history error:', error);
      return [];
    }
  }

  static async getGoodsHistoryByLocation(locationId: string): Promise<GoodsHistory[]> {
    return this.getAllGoodsHistory(locationId);
  }

  static async createStock(stockData: {
    idgood: string;
    idlocation: string;
    stock: number;
    type: 'in' | 'out';
    payment_type: string;
    price: number;
  }): Promise<boolean> {
    try {
      // Create goods history record
      const historyData = {
        idgood: stockData.idgood,
        idlocation: stockData.idlocation,
        stock: stockData.stock,
        type: stockData.type,
        payment_type: stockData.payment_type,
        price: stockData.price,
        description: stockData.type === 'in' ? 'Barang Masuk' : 'Barang Keluar',
        note: null
      };

      const { error: historyError } = await supabase
        .from('goods_history')
        .insert([historyData]);

      if (historyError) {
        console.error('Create stock history error:', historyError);
        return false;
      }

      // Update goods stock
      const { data: currentGood } = await supabase
        .from('goods')
        .select('stock')
        .eq('id', stockData.idgood)
        .single();

      const currentStock = currentGood?.stock || 0;
      const newStock = stockData.type === 'in' 
        ? currentStock + stockData.stock 
        : currentStock - stockData.stock;

      const { error: updateError } = await supabase
        .from('goods')
        .update({ stock: newStock })
        .eq('id', stockData.idgood);

      if (updateError) {
        console.error('Update goods stock error:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Create stock error:', error);
      return false;
    }
  }

  static async updateStock(id: string, stockData: {
    idgood: string;
    idlocation: string;
    stock: number;
    type: 'in' | 'out';
    payment_type: string;
    price: number;
  }): Promise<boolean> {
    try {
      // Update goods stock directly
      const { error } = await supabase
        .from('goods')
        .update({ 
          stock: stockData.stock,
          price: stockData.price
        })
        .eq('id', stockData.idgood);

      if (error) {
        console.error('Update stock error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update stock error:', error);
      return false;
    }
  }

  static async deleteStock(id: string): Promise<boolean> {
    try {
      // Delete a single goods_history row by its id
      const { error } = await supabase
        .from('goods_history')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete stock history error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete stock error:', error);
      return false;
    }
  }

  static async createGood(goodData: {
    idcategory: string;
    idlocation: string;
    code: string;
    name: string;
    price: number;
    stock: number;
  }): Promise<Good | null> {
    try {
      console.log('Creating good with data:', goodData);
      
      // Validate required fields
      if (!goodData.idcategory || !goodData.idlocation || !goodData.code || !goodData.name) {
        console.error('Missing required fields for creating good');
        return null;
      }

      const insertData = {
        idcategory: goodData.idcategory,
        idlocation: goodData.idlocation,
        code: goodData.code,
        name: goodData.name,
        price: goodData.price || 0,
        stock: goodData.stock || 0,
        damaged_stock: 0
      };

      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('goods')
        .insert([insertData])
        .select('*')
        .single();

      if (error) {
        console.error('Create good error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }

      console.log('Good created successfully:', data);
      return data;
    } catch (error) {
      console.error('Create good error:', error);
      return null;
    }
  }

  static async updateGood(id: string, goodData: {
    idcategory?: string;
    idlocation?: string;
    code?: string;
    name?: string;
    price?: number;
    stock?: number;
    damaged_stock?: number;
  }): Promise<Good | null> {
    try {
      console.log('Updating good with ID:', id, 'and data:', goodData);
      
      // First check if the good exists
      const { data: existingGood, error: checkError } = await supabase
        .from('goods')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingGood) {
        console.error('Good not found for update:', id);
        return null;
      }
      
      // Filter out fields that don't exist in the goods table
      const { idlocation, stock, ...validGoodData } = goodData;
      
      // Remove undefined values
      const updateData = Object.fromEntries(
        Object.entries(validGoodData).filter(([_, value]) => value !== undefined)
      );

      console.log('Update data:', updateData);
      
      const { data, error } = await supabase
        .from('goods')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Update good error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }

      console.log('Good updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Update good error:', error);
      return null;
    }
  }

  static async updateLocationStock(id: string, stockData: {
    stock?: number;
  }): Promise<boolean> {
    try {
      console.log('Updating location stock with ID:', id, 'and data:', stockData);
      
      const { error } = await supabase
        .from('location_stocks')
        .update(stockData)
        .eq('id', id);

      if (error) {
        console.error('Update location stock error:', error);
        return false;
      }

      console.log('Location stock updated successfully');
      return true;
    } catch (error) {
      console.error('Update location stock error:', error);
      return false;
    }
  }

  static async deleteLocationStock(id: string): Promise<boolean> {
    try {
      console.log('Deleting location stock with ID:', id);
      
      // Delete the location_stocks record
      const { error } = await supabase
        .from('location_stocks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete location stock error:', error);
        return false;
      }

      console.log('Location stock deleted successfully');
      return true;
    } catch (error) {
      console.error('Delete location stock error:', error);
      return false;
    }
  }

  static async deleteGood(id: string): Promise<boolean> {
    try {
      console.log('Deleting good with ID:', id);
      
      // Check for foreign key references
      const [{ count: historyCount }, { count: damagedCount }] = await Promise.all([
        supabase.from('goods_history').select('id', { count: 'exact', head: true }).eq('idgood', id),
        supabase.from('damaged_goods').select('id', { count: 'exact', head: true }).eq('idgood', id)
      ]) as any;

      if ((historyCount || 0) > 0 || (damagedCount || 0) > 0) {
        const error = new Error('Gagal dihapus karena data terpakai');
        (error as any).code = 'FOREIGN_KEY_CONSTRAINT';
        throw error;
      }

      // Delete the good
      const { error } = await supabase
        .from('goods')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete good error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Check if it's a foreign key constraint error
        if (error.code === '23503') { // PostgreSQL foreign key violation code
          const constraintError = new Error('Gagal dihapus karena data terpakai');
          (constraintError as any).code = 'FOREIGN_KEY_CONSTRAINT';
          throw constraintError;
        }
        
        throw error;
      }

      console.log('Good deleted successfully');
      return true;
    } catch (error) {
      console.error('Delete good error:', error);
      throw error; // Re-throw the error to be handled by the UI
    }
  }

  // Stock Management with Financial Integration
  static async createStockTransaction(stockData: {
    idgood: string;
    idlocation: string;
    stock: number;
    type: 'in' | 'out';
    payment_type: string; // Financial category ID
    price: number;
    description: string;
    note?: string;
  }): Promise<boolean> {
    try {
      // First, verify that the good exists
      const { data: goodExists, error: goodCheckError } = await supabase
        .from('goods')
        .select('id')
        .eq('id', stockData.idgood)
        .single();

      if (goodCheckError || !goodExists) {
        console.error('Good not found for stock transaction:', stockData.idgood);
        return false;
      }

      // Verify that the location exists
      const { data: locationExists, error: locationCheckError } = await supabase
        .from('locations')
        .select('id')
        .eq('id', stockData.idlocation)
        .single();

      if (locationCheckError || !locationExists) {
        console.error('Location not found for stock transaction:', stockData.idlocation);
        return false;
      }

      // Validate stock for stock out
      if (stockData.type === 'out') {
        const { data: currentStock } = await supabase
          .from('location_stocks')
          .select('stock')
          .eq('idgood', stockData.idgood)
          .eq('idlocation', stockData.idlocation)
          .single();
        
        const currentStockValue = currentStock?.stock || 0;
        
        if (stockData.stock > currentStockValue) {
          console.error('Insufficient stock for stock out:', {
            goodId: stockData.idgood,
            locationId: stockData.idlocation,
            requested: stockData.stock,
            available: currentStockValue
          });
          throw new Error(`Stok tidak mencukupi. Tersedia: ${currentStockValue}, Diminta: ${stockData.stock}`);
        }
      }

      // Prepare data for goods history with proper UUID handling
      const historyData = {
        idgood: stockData.idgood,
        idlocation: stockData.idlocation,
        stock: stockData.stock,
        type: stockData.type,
        payment_type: stockData.payment_type && stockData.payment_type.trim() !== '' ? stockData.payment_type : null,
        price: stockData.price,
        description: stockData.type === 'in' ? 'Barang Masuk' : 'Barang Keluar',
        note: stockData.note || null
      };

      // Create goods history record
      const { data: goodsHistoryData, error: historyError } = await supabase
        .from('goods_history')
        .insert([historyData])
        .select('*')
        .single();

      if (historyError) {
        console.error('Create goods history error:', historyError);
        return false;
      }

      // Update location_stocks
      const { data: locationStock } = await supabase
        .from('location_stocks')
        .select('stock')
        .eq('idgood', stockData.idgood)
        .eq('idlocation', stockData.idlocation)
        .single();

      if (locationStock) {
        const newStock = stockData.type === 'in' 
          ? (locationStock.stock || 0) + stockData.stock
          : (locationStock.stock || 0) - stockData.stock;

        const { error: updateError } = await supabase
          .from('location_stocks')
          .update({ stock: Math.max(0, newStock) })
          .eq('idgood', stockData.idgood)
          .eq('idlocation', stockData.idlocation);

        if (updateError) {
          console.error('Update location stock error:', updateError);
          return false;
        }
      } else {
        // If no location_stocks record exists, create one
        const { error: insertError } = await supabase
          .from('location_stocks')
          .insert([{
            idgood: stockData.idgood,
            idlocation: stockData.idlocation,
            stock: stockData.type === 'in' ? stockData.stock : 0
          }]);

        if (insertError) {
          console.error('Create location stock error:', insertError);
          return false;
        }
      }

      // Import FinancialService to create financial transactions
      const { FinancialService } = await import('./financialService');
      
      // Create financial transaction if stock out (sales)
      if (stockData.type === 'out' && stockData.price > 0) {
        const totalAmount = stockData.stock * stockData.price;
        let paymentType = stockData.payment_type && stockData.payment_type.trim() !== '' ? stockData.payment_type : null;
        if (!paymentType) {
          paymentType = (await FinancialService.getPrimaryWalletId()) || null;
        }
        if (paymentType) {
          // Get transaction description for sales
          const { data: descriptions } = await supabase
            .from('transaction_descriptions')
            .select('id')
            .eq('descriptionname', 'Penjualan')
            .eq('type', 'in')
            .eq('is_active', true)
            .limit(1);

          const transactionData = {
            type: 'in' as const,
            total: totalAmount,
            payment_type: paymentType,
            note: `Barang Keluar: ${stockData.stock} x ${goodsHistoryData?.goods?.name || 'Barang'}`,
            id_description: descriptions && descriptions.length > 0 ? descriptions[0].id : null,
            id_goods_history: goodsHistoryData?.id || null
          };

          const transaction = await FinancialService.createTransaction(transactionData);
          
          // Update goods_history with transaction_id for linking
          if (transaction && goodsHistoryData?.id) {
            await supabase
              .from('goods_history')
              .update({ transaction_id: transaction.id })
              .eq('id', goodsHistoryData.id);
          }
        }
      }

      // Deduct from financial category if stock in (purchase)
      if (stockData.type === 'in' && stockData.price > 0) {
        const totalAmount = stockData.stock * stockData.price;
        let paymentType = stockData.payment_type && stockData.payment_type.trim() !== '' ? stockData.payment_type : null;
        if (!paymentType) {
          paymentType = (await FinancialService.getPrimaryWalletId()) || null;
        }
        if (paymentType) {
          // Get transaction description for purchase
          const { data: descriptions } = await supabase
            .from('transaction_descriptions')
            .select('id')
            .eq('descriptionname', 'Pembelian')
            .eq('type', 'out')
            .eq('is_active', true)
            .limit(1);

          const transactionData = {
            type: 'out' as const,
            total: totalAmount,
            payment_type: paymentType,
            note: `Barang Masuk: ${stockData.stock} x ${goodsHistoryData?.goods?.name || 'Barang'}`,
            id_description: descriptions && descriptions.length > 0 ? descriptions[0].id : null,
            id_goods_history: goodsHistoryData?.id || null
          };

          const transaction = await FinancialService.createTransaction(transactionData);
          
          // Update goods_history with transaction_id for linking
          if (transaction && goodsHistoryData?.id) {
            await supabase
              .from('goods_history')
              .update({ transaction_id: transaction.id })
              .eq('id', goodsHistoryData.id);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Create stock transaction error:', error);
      return false;
    }
  }

  // Fixed function that was missing
  static async getGoodsHistoryByGood(goodId: string): Promise<GoodsHistory[]> {
    try {
      const { data, error } = await supabase
        .from('goods_history')
        .select(`
          *,
          good:goods(name, code),
          location:locations(locationname)
        `)
        .eq('idgood', goodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get goods history by good error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get goods history by good error:', error);
      return [];
    }
  }

  // Damaged Goods Management
  static async getAllDamagedGoods(): Promise<DamagedGood[]> {
    try {
      const { data, error } = await supabase
        .from('damaged_goods')
        .select(`
          *,
          good:goods(name, code, price)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get all damaged goods error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get all damaged goods error:', error);
      return [];
    }
  }

  static async createDamagedGood(damagedData: {
    idgood: string;
    stock: number;
    reason: string;
    reported_by?: string;
  }): Promise<DamagedGood | null> {
    try {
      const { data, error } = await supabase
        .from('damaged_goods')
        .insert([damagedData])
        .select()
        .single();

      if (error) {
        console.error('Create damaged good error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create damaged good error:', error);
      return null;
    }
  }

  static async updateDamagedGood(id: string, damagedData: {
    stock?: number;
    reason?: string;
  }): Promise<DamagedGood | null> {
    try {
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

  static async deleteDamagedGood(id: string): Promise<boolean> {
    try {
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

  // Categories Management
  static async getAllCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('categoryname', { ascending: true });

      if (error) {
        console.error('Get all categories error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get all categories error:', error);
      return [];
    }
  }

  static async createCategory(categoryData: { categoryname: string }): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) {
        console.error('Create category error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create category error:', error);
      return null;
    }
  }

  static async updateCategory(id: string, categoryData: { categoryname: string }): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update category error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Update category error:', error);
      return null;
    }
  }

  static async deleteCategory(id: string): Promise<boolean> {
    try {
      // Guard: block delete if any goods reference this category
      const { count } = await supabase
        .from('goods')
        .select('id', { count: 'exact', head: true })
        .eq('idcategory', id);
      if ((count || 0) > 0) {
        console.error('Delete category blocked: referenced by goods');
        return false;
      }
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete category error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete category error:', error);
      return false;
    }
  }

  // Locations Management
  static async getAllLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('locationname', { ascending: true });

      if (error) {
        console.error('Get all locations error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get all locations error:', error);
      return [];
    }
  }

  static async createLocation(locationData: { locationname: string }): Promise<Location | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert([locationData])
        .select()
        .single();

      if (error) {
        console.error('Create location error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create location error:', error);
      return null;
    }
  }

  static async updateLocation(id: string, locationData: { locationname: string }): Promise<Location | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .update(locationData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update location error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Update location error:', error);
      return null;
    }
  }

  static async deleteLocation(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete location error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete location error:', error);
      return false;
    }
  }



  // Search functionality
  static async searchGoods(searchTerm: string): Promise<GoodWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('goods_with_details')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,categoryname.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Search goods error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Search goods error:', error);
      return [];
    }
  }

  // Get low stock goods
  static async getLowStockGoods(threshold: number = 10): Promise<GoodWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('goods_with_details')
        .select('*')
        .lt('available_stock', threshold)
        .order('available_stock', { ascending: true });

      if (error) {
        console.error('Get low stock goods error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get low stock goods error:', error);
      return [];
    }
  }
}