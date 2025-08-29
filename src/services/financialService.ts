import { supabase, Transaction, Information, TransactionDescription } from '../lib/supabase';

// New interface for dynamic financial categories
export interface FinancialCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_primary?: boolean;
  is_change?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Enhanced transaction interface
export interface EnhancedTransaction extends Transaction {
  description_name?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export class FinancialService {
  // Financial Category Management
  static async getAllFinancialCategories(): Promise<FinancialCategory[]> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Get financial categories error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get financial categories error:', error);
      return [];
    }
  }

  static async createFinancialCategory(categoryData: {
    name: string;
    color: string;
    icon: string;
    is_primary?: boolean;
    is_change?: boolean;
  }): Promise<FinancialCategory | null> {
    try {
      if (categoryData.is_primary) {
        await supabase.from('financial_categories').update({ is_primary: false }).eq('is_primary', true);
      }
      if (categoryData.is_change) {
        await supabase.from('financial_categories').update({ is_change: false }).eq('is_change', true);
      }

      const { data, error } = await supabase
        .from('financial_categories')
        .insert([{
          ...categoryData,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Create financial category error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create financial category error:', error);
      return null;
    }
  }

  static async updateFinancialCategory(id: string, categoryData: {
    name?: string;
    color?: string;
    icon?: string;
    is_active?: boolean;
    is_primary?: boolean;
    is_change?: boolean;
  }): Promise<FinancialCategory | null> {
    try {
      if (categoryData.is_primary) {
        await supabase.from('financial_categories').update({ is_primary: false }).eq('is_primary', true);
      }
      if (categoryData.is_change) {
        await supabase.from('financial_categories').update({ is_change: false }).eq('is_change', true);
      }

      const { data, error } = await supabase
        .from('financial_categories')
        .update({
          ...categoryData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update financial category error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Update financial category error:', error);
      return null;
    }
  }

  static async deleteFinancialCategory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Delete financial category error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete financial category error:', error);
      return false;
    }
  }

  // Enhanced Transaction Management
  static async getAllTransactions(adminLocationId?: string): Promise<EnhancedTransaction[]> {
    try {
      let query = supabase.from('transactions').select('*');
      
      // If admin location is provided, filter transactions that are related to that location
      if (adminLocationId) {
        // Get goods history records for this location
        const { data: goodsHistory } = await supabase
          .from('goods_history')
          .select('id')
          .eq('idlocation', adminLocationId);
        
        const goodsHistoryIds = goodsHistory?.map(gh => gh.id) || [];
        
        if (goodsHistoryIds.length > 0) {
          query = query.in('id_goods_history', goodsHistoryIds);
        } else {
          // If no goods history for this location, return empty array
          return [];
        }
      }
      
      const [txRes, categories, descriptions] = await Promise.all([
        query.order('created_at', { ascending: false }),
        this.getAllFinancialCategories(),
        this.getAllTransactionDescriptions()
      ]);

      const { data, error } = txRes as any;
      if (error) {
        console.error('Get all transactions error:', error);
        return [];
      }

      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const descMap = new Map(descriptions.map(d => [d.id, d]));

      return (data || []).map((transaction: any) => {
        const category = categoryMap.get(transaction.payment_type);
        const desc = transaction.id_description ? descMap.get(transaction.id_description) : undefined;
        return {
          ...transaction,
          description_name: desc?.descriptionname,
          category_name: category?.name,
          category_color: category?.color,
          category_icon: category?.icon
        } as EnhancedTransaction;
      });
    } catch (error) {
      console.error('Get all transactions error:', error);
      return [];
    }
  }

  static async getTransactionsByLocation(locationId: string): Promise<EnhancedTransaction[]> {
    return this.getAllTransactions(locationId);
  }

  // Get goods history details for a specific transaction
  static async getTransactionGoodsDetails(transactionId: string): Promise<any[]> {
    try {
      console.log('Getting goods details for transaction:', transactionId);
      
      // First, get the transaction to check if it has id_goods_history
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('id_goods_history')
        .eq('id', transactionId)
        .single();

      if (txError) {
        console.error('Error fetching transaction:', txError);
        return [];
      }

      console.log('Transaction id_goods_history:', transaction?.id_goods_history);

      // If transaction has id_goods_history, get that specific goods_history record
      if (transaction?.id_goods_history) {
        console.log('Getting goods by id_goods_history...');
        const { data: singleGood, error: singleError } = await supabase
          .from('goods_history')
          .select(`
            *,
            good:goods(name, code, categories(categoryname)),
            location:locations(locationname)
          `)
          .eq('id', transaction.id_goods_history)
          .single();

        if (singleError) {
          console.error('Error fetching single goods_history:', singleError);
        } else if (singleGood) {
          console.log('Found single goods_history:', singleGood);
          
          const transformedData = [{
            idgood: singleGood.idgood,
            good_code: singleGood.good?.code || '',
            good_name: singleGood.good?.name || '',
            category_name: singleGood.good?.categories?.categoryname || '',
            location_name: singleGood.location?.locationname || '',
            stock: singleGood.stock || 0,
            price: singleGood.price || 0,
            total_price: (singleGood.stock || 0) * (singleGood.price || 0),
            type: singleGood.type || '',
            description: singleGood.description || `${singleGood.type === 'in' ? 'Barang masuk' : 'Barang keluar'} - ${singleGood.good?.name || ''}`,
            note: singleGood.note || ''
          }];

          console.log('Transformed single data:', transformedData);
          return transformedData;
        }
      }

      // Find goods_history by transaction_id (for bulk transactions and admin sales)
      let { data, error } = await supabase
        .from('goods_history')
        .select(`
          *,
          good:goods(name, code, categories(categoryname)),
          location:locations(locationname)
        `)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get transaction goods details error:', error);
        return [];
      }

      console.log('Found goods by transaction_id:', data?.length || 0);

      // If no results, try to find by payment_type (for old admin sales)
      if (!data || data.length === 0) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('goods_history')
          .select(`
            *,
            good:goods(name, code, categories(categoryname)),
            location:locations(locationname)
          `)
          .eq('payment_type', transactionId)
          .order('created_at', { ascending: false });

        if (paymentError) {
          console.error('Get transaction goods details by payment_type error:', paymentError);
          return [];
        }

        data = paymentData;
        console.log('Found goods by payment_type:', data?.length || 0);
      }

      // If still no results, try to find by note containing transaction ID (for old admin sales)
      if (!data || data.length === 0) {
        const { data: noteData, error: noteError } = await supabase
          .from('goods_history')
          .select(`
            *,
            good:goods(name, code, categories(categoryname)),
            location:locations(locationname)
          `)
          .ilike('note', `%${transactionId}%`)
          .order('created_at', { ascending: false });

        if (noteError) {
          console.error('Get transaction goods details by note error:', noteError);
          return [];
        }

        data = noteData;
        console.log('Found goods by note:', data?.length || 0);
      }

      // Transform data to match expected format
      const transformedData = (data || []).map(item => ({
        idgood: item.idgood,
        good_code: item.good?.code || '',
        good_name: item.good?.name || '',
        category_name: item.good?.categories?.categoryname || '',
        location_name: item.location?.locationname || '',
        stock: item.stock || 0,
        price: item.price || 0,
        total_price: (item.stock || 0) * (item.price || 0),
        type: item.type || '',
        description: item.description || `${item.type === 'in' ? 'Barang masuk' : 'Barang keluar'} - ${item.good?.name || ''}`,
        note: item.note || ''
      }));

      console.log('Transformed data:', transformedData);
      return transformedData;
    } catch (error) {
      console.error('Get transaction goods details error:', error);
      return [];
    }
  }

  static async getTransactionsByDateRange(startDate: string, endDate: string): Promise<EnhancedTransaction[]> {
    try {
      const [txRes, categories, descriptions] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false }),
        this.getAllFinancialCategories(),
        this.getAllTransactionDescriptions()
      ]);

      const { data, error } = txRes as any;
      if (error) {
        console.error('Get transactions by date range error:', error);
        return [];
      }

      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const descMap = new Map(descriptions.map(d => [d.id, d]));

      return (data || []).map((transaction: any) => {
        const category = categoryMap.get(transaction.payment_type);
        const desc = transaction.id_description ? descMap.get(transaction.id_description) : undefined;
        return {
          ...transaction,
          description_name: desc?.descriptionname,
          category_name: category?.name,
          category_color: category?.color,
          category_icon: category?.icon
        } as EnhancedTransaction;
      });
    } catch (error) {
      console.error('Get transactions by date range error:', error);
      return [];
    }
  }

  static async createTransaction(transactionData: {
    type: 'in' | 'out';
    total: number;
    id_description?: string | null;
    id_goods_history?: string | null;
    note?: string | null;
    payment_type: string | null; // Financial category ID
  }): Promise<Transaction | null> {
    try {
      console.log('Creating transaction with data:', transactionData);
      
      // Validate required fields
      if (!transactionData.type || !transactionData.total) {
        console.error('Missing required fields for creating transaction');
        return null;
      }
      
      // Check if payment_type is valid (either null or a non-empty string)
      if (transactionData.payment_type !== null && (!transactionData.payment_type || transactionData.payment_type.trim() === '')) {
        console.error('Invalid payment_type: must be null or a valid UUID');
        return null;
      }

      const insertData = {
        type: transactionData.type,
        total: transactionData.total,
        id_description: transactionData.id_description || null,
        id_goods_history: transactionData.id_goods_history || null,
        note: transactionData.note || null,
        payment_type: transactionData.payment_type
      };

      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([insertData])
        .select('*')
        .single();

      if (error) {
        console.error('Create transaction error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }

      console.log('Transaction created successfully:', data);
      return data;
    } catch (error) {
      console.error('Create transaction error:', error);
      return null;
    }
  }

  static async updateTransaction(id: string, transactionData: {
    type?: 'in' | 'out';
    total?: number;
    id_description?: string | null;
    note?: string | null;
    payment_type?: string;
  }): Promise<Transaction | null> {
    try {
      console.log('Updating transaction with ID:', id, 'and data:', transactionData);
      
      // Remove undefined values
      const updateData = Object.fromEntries(
        Object.entries(transactionData).filter(([_, value]) => value !== undefined)
      );

      console.log('Update data:', updateData);
      
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Update transaction error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }

      console.log('Transaction updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Update transaction error:', error);
      return null;
    }
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete transaction error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete transaction error:', error);
      return false;
    }
  }

  // Financial Summary with Dynamic Categories
  static async getFinancialSummary(): Promise<Record<string, number>> {
    try {
      const categories = await this.getAllFinancialCategories();
      const transactions = await this.getAllTransactions();
      
      const summary: Record<string, number> = {};
      
      // Initialize all categories with 0
      categories.forEach(category => {
        summary[category.id] = 0;
      });
      
      // Calculate totals for each category
      transactions.forEach(transaction => {
        if (transaction.payment_type && summary.hasOwnProperty(transaction.payment_type)) {
          if (transaction.type === 'in') {
            summary[transaction.payment_type] += transaction.total;
          } else {
            summary[transaction.payment_type] -= transaction.total;
          }
        }
      });
      
      return summary;
    } catch (error) {
      console.error('Get financial summary error:', error);
      return {};
    }
  }

  // Cash Balance Management
  static async getCashBalance(categoryId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('cash_balances')
        .select('amount')
        .eq('id_category', categoryId)
        .limit(1);

      if (error) {
        console.error('Get cash balance error:', error);
        return 0;
      }

      const first = (data as any[])?.[0];
      return first?.amount || 0;
    } catch (error) {
      console.error('Get cash balance error:', error);
      return 0;
    }
  }

  static async updateCashBalance(categoryId: string, amount: number, note?: string): Promise<boolean> {
    try {
      // Check if balance exists
      const { data: existing } = await supabase
        .from('cash_balances')
        .select('id')
        .eq('id_category', categoryId)
        .single();

      if (existing) {
        // Update existing balance
        const { error } = await supabase
          .from('cash_balances')
          .update({ amount, updated_at: new Date().toISOString() })
          .eq('id_category', categoryId);

        if (error) {
          console.error('Update cash balance error:', error);
          return false;
        }
      } else {
        // Create new balance
        const { error } = await supabase
          .from('cash_balances')
          .insert([{ id_category: categoryId, amount }]);

        if (error) {
          console.error('Create cash balance error:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Update cash balance error:', error);
      return false;
    }
  }

  // Transaction Descriptions
  static async getAllTransactionDescriptions(): Promise<TransactionDescription[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_descriptions')
        .select('*')
        .eq('is_active', true)
        .order('descriptionname', { ascending: true });

      if (error) {
        console.error('Get transaction descriptions error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get transaction descriptions error:', error);
      return [];
    }
  }

  static async createTransactionDescription(descriptionData: {
    descriptionname: string;
    type: 'in' | 'out';
  }): Promise<TransactionDescription | null> {
    try {
      const { data, error } = await supabase
        .from('transaction_descriptions')
        .insert([{
          ...descriptionData,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Create transaction description error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create transaction description error:', error);
      return null;
    }
  }

  static async updateTransactionDescription(id: string, updates: Partial<TransactionDescription>): Promise<TransactionDescription | null> {
    try {
      const { data, error } = await supabase
        .from('transaction_descriptions')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        console.error('Update transaction description error:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Update transaction description error:', error);
      return null;
    }
  }

  static async deleteTransactionDescription(id: string): Promise<boolean> {
    try {
      // Guard: block delete if any transactions reference this description
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('id_description', id);
      if ((count || 0) > 0) {
        console.error('Delete transaction description blocked: referenced by transactions');
        return false;
      }
      const { error } = await supabase
        .from('transaction_descriptions')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Delete transaction description error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Delete transaction description error:', error);
      return false;
    }
  }

  // Stock Transaction Integration
  static async createStockTransaction(stockData: {
    idgood: string;
    idlocation: string;
    stock: number;
    type: 'in' | 'out';
    payment_type: string;
    price: number;
    description: string;
    note?: string;
  }): Promise<boolean> {
    try {
      // Create goods history record
      const { error: historyError } = await supabase
        .from('goods_history')
        .insert([stockData]);

      if (historyError) {
        console.error('Create goods history error:', historyError);
        return false;
      }

      // Update goods stock
      const { data: good } = await supabase
        .from('goods')
        .select('stock')
        .eq('id', stockData.idgood)
        .single();

      if (good) {
        const newStock = stockData.type === 'in' 
          ? (good.stock || 0) + stockData.stock
          : (good.stock || 0) - stockData.stock;

        const { error: updateError } = await supabase
          .from('goods')
          .update({ stock: Math.max(0, newStock) })
          .eq('id', stockData.idgood);

        if (updateError) {
          console.error('Update goods stock error:', updateError);
          return false;
        }
      }

      // Create financial transaction if stock out (sales)
      if (stockData.type === 'out' && stockData.price > 0) {
        const totalAmount = stockData.stock * stockData.price;
        await this.createTransaction({
          type: 'in',
          total: totalAmount,
          payment_type: stockData.payment_type,
          note: `Penjualan: ${stockData.description}`
        });
      }

      // Deduct from financial category if stock in (purchase)
      if (stockData.type === 'in' && stockData.price > 0) {
        const totalAmount = stockData.stock * stockData.price;
        await this.createTransaction({
          type: 'out',
          total: totalAmount,
          payment_type: stockData.payment_type,
          note: `Pembelian: ${stockData.description}`
        });
      }

      return true;
    } catch (error) {
      console.error('Create stock transaction error:', error);
      return false;
    }
  }

  // Information Management
  static async getAllInformations(): Promise<Information[]> {
    try {
      const { data, error } = await supabase
        .from('informations')
        .select('*')
        .order('informationname', { ascending: true });

      if (error) {
        console.error('Get informations error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get informations error:', error);
      return [];
    }
  }

  // Sales Transaction Helper
  static async createSalesTransaction(amount: number, paymentType: string): Promise<boolean> {
    try {
      const transactionData: { type: 'in' | 'out'; total: number; payment_type: string; note: string } = {
        type: 'in',
        total: amount,
        payment_type: paymentType,
        note: 'Penjualan Barang'
      };

      const result = await this.createTransaction(transactionData);
      return result !== null;
    } catch (error) {
      console.error('Create sales transaction error:', error);
      return false;
    }
  }

  static async getPrimaryWalletId(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('is_primary', true)
        .single();
      if (error) return null;
      return (data as any)?.id || null;
    } catch {
      return null;
    }
  }

  // Helper: find wallet id by exact name
  static async getWalletIdByName(name: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('name', name)
        .single();
      if (error) return null;
      return (data as any)?.id || null;
    } catch {
      return null;
    }
  }

  // Get change wallet ID
  static async getChangeWalletId(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('is_change', true)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Get change wallet ID error:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Get change wallet ID error:', error);
      return null;
    }
  }





  // Admin Sale Processing: multi-item sale with cash received and change taken from change wallet
  static async processAdminSale(params: {
    adminId: string;
    items: Array<{ idgood: string; idlocation: string; quantity: number; price: number }>;
    cashReceived: number;
    paymentMethod?: 'cash' | 'digital';
    walletOmsetName?: string; // default 'Omset'
    note?: string;
  }): Promise<{ success: boolean; message?: string } > {
    try {
      const walletOmsetName = params.walletOmsetName || 'Omset';

      const [omsetId, changeWalletId] = await Promise.all([
        this.getWalletIdByName(walletOmsetName),
        this.getChangeWalletId()
      ]);
      if (!omsetId || !changeWalletId) {
        return { success: false, message: 'Dompet Omset atau Dompet Kembalian tidak ditemukan' };
      }

      const total = params.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
      const paymentMethod = params.paymentMethod || 'cash';
      const change = paymentMethod === 'digital' ? 0 : Math.max(0, (params.cashReceived || 0) - total);

      console.log('Admin Sale Debug Info:', {
        walletOmsetName,
        omsetId,
        changeWalletId,
        total,
        cashReceived: params.cashReceived,
        paymentMethod,
        change
      });

      // 1) Create financial transaction first
      const transaction = await this.createTransaction({
        type: 'in',
        total: total,
        id_description: await this.getTransactionDescriptionId('Penjualan'),
        payment_type: omsetId,
        note: params.note || 'Penjualan (admin)'
      });

      if (!transaction) {
        return { success: false, message: 'Gagal membuat transaksi keuangan' };
      }

      // 2) Record goods out and update stocks
      for (const it of params.items) {
        // Verify that the good exists before creating history
        const { data: goodExists, error: goodCheckError } = await supabase
          .from('goods')
          .select('id')
          .eq('id', it.idgood)
          .single();

        if (goodCheckError || !goodExists) {
          console.error('Good not found for admin sale:', it.idgood);
          return { success: false, message: 'Barang tidak ditemukan' };
        }

        // Verify that the location exists
        const { data: locationExists, error: locationCheckError } = await supabase
          .from('locations')
          .select('id')
          .eq('id', it.idlocation)
          .single();

        if (locationCheckError || !locationExists) {
          console.error('Location not found for admin sale:', it.idlocation);
          return { success: false, message: 'Lokasi tidak ditemukan' };
        }

        // Check current stock before processing
        const { data: currentStockData } = await supabase
          .from('location_stocks')
          .select('stock')
          .eq('idgood', it.idgood)
          .eq('idlocation', it.idlocation)
          .single();
        
        const currentStockValue = currentStockData?.stock || 0;
        
        if (it.quantity > currentStockValue) {
          console.error('Insufficient stock for admin sale:', {
            goodId: it.idgood,
            locationId: it.idlocation,
            requested: it.quantity,
            available: currentStockValue
          });
          return { success: false, message: `Stok tidak mencukupi. Tersedia: ${currentStockValue}, Diminta: ${it.quantity}` };
        }

        const { error: historyError } = await supabase.from('goods_history').insert([{
          idgood: it.idgood,
          idlocation: it.idlocation,
          stock: it.quantity,
          type: 'out',
          payment_type: omsetId,
          transaction_id: transaction.id, // Link to the financial transaction
          price: it.price,
          description: 'Penjualan oleh admin',
          note: `admin:${params.adminId}`
        }]);

        if (historyError) {
          console.error('Failed to create goods history for admin sale:', historyError);
          return { success: false, message: 'Gagal mencatat riwayat barang' };
        }

        // Update location stock
        const newStock = Math.max(0, currentStockValue - it.quantity);
        
        await supabase
          .from('location_stocks')
          .update({ stock: newStock })
          .eq('idgood', it.idgood)
          .eq('idlocation', it.idlocation);
              }

      // 3) Update cash balances: omset += total; change wallet -= change (only for cash payment)

      const [omsetBal, changeWalletBalance] = await Promise.all([
        this.getCashBalance(omsetId),
        this.getCashBalance(changeWalletId)
      ]);
      
      console.log('Cash Balance Debug Info:', {
        omsetBalance: omsetBal,
        changeWalletBalance: changeWalletBalance,
        total,
        change,
        paymentMethod
      });
      
      // Update omset balance (money received from customer)
      await this.updateCashBalance(omsetId, (omsetBal || 0) + total, 'Penjualan admin');
      
      // Update change wallet balance (money given as change to customer) - only for cash payment
      if (paymentMethod === 'cash' && change > 0) {
        const newChangeWalletBalance = Math.max(0, (changeWalletBalance || 0) - change);
        await this.updateCashBalance(changeWalletId, newChangeWalletBalance, 'Kembalian penjualan');
        console.log(`Updated change wallet balance: ${changeWalletBalance || 0} - ${change} = ${newChangeWalletBalance}`);
        console.log(`Change wallet balance before: ${changeWalletBalance || 0}, change: ${change}, after: ${newChangeWalletBalance}`);
      } else {
        console.log('No change wallet balance update needed:', {
          paymentMethod,
          change,
          reason: paymentMethod === 'digital' ? 'Digital payment - no change' : 'No change needed'
        });
      }

      return { success: true };
    } catch (error) {
      console.error('processAdminSale error:', error);
      return { success: false, message: 'Gagal memproses penjualan admin' };
    }
  }

  // Get transaction description ID by name
  static async getTransactionDescriptionId(name: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('transaction_descriptions')
        .select('id')
        .eq('descriptionname', name)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Get transaction description ID error:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Get transaction description ID error:', error);
      return null;
    }
  }

  // Bulk Stock Transaction Processing: single transaction with multiple goods
  static async processBulkStockTransaction(params: {
    items: Array<{ idgood: string; idlocation: string; quantity: number; price: number; goodName?: string }>;
    type: 'in' | 'out';
    payment_type: string;
    note?: string;
  }): Promise<{ success: boolean; message?: string; transactionId?: string }> {
    try {
      if (params.items.length === 0) {
        return { success: false, message: 'Tidak ada barang yang dipilih' };
      }

      const total = params.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
      
      // 1. Create single financial transaction
      const descriptionId = await this.getTransactionDescriptionId(params.type === 'in' ? 'Pembelian' : 'Penjualan');
      console.log('Description ID for bulk transaction:', descriptionId);
      
      // Create detailed note for bulk transaction
      const itemDetails = params.items
        .filter(item => item.quantity > 0)
        .map(item => `${item.quantity} x ${item.goodName || 'Barang'}`)
        .join(', ');
      
      const transaction = await this.createTransaction({
        type: params.type === 'in' ? 'out' : 'in', // Reverse for financial transaction
        total: total,
        id_description: descriptionId,
        payment_type: params.payment_type,
        note: params.note || `${params.type === 'in' ? 'Barang Masuk' : 'Barang Keluar'}: ${itemDetails}`
      });

      if (!transaction) {
        return { success: false, message: 'Gagal membuat transaksi keuangan' };
      }

      // 2. Create goods history records for all items
      for (const item of params.items) {
        // Verify that the good exists
        const { data: goodExists, error: goodCheckError } = await supabase
          .from('goods')
          .select('id')
          .eq('id', item.idgood)
          .single();

        if (goodCheckError || !goodExists) {
          console.error('Good not found for bulk transaction:', item.idgood);
          continue; // Skip this item but continue with others
        }

        // Verify that the location exists
        const { data: locationExists, error: locationCheckError } = await supabase
          .from('locations')
          .select('id')
          .eq('id', item.idlocation)
          .single();

        if (locationCheckError || !locationExists) {
          console.error('Location not found for bulk transaction:', item.idlocation);
          continue; // Skip this item but continue with others
        }

        // Check stock for stock out transactions
        if (params.type === 'out') {
          const { data: currentStockData } = await supabase
            .from('location_stocks')
            .select('stock')
            .eq('idgood', item.idgood)
            .eq('idlocation', item.idlocation)
            .single();
          
          const currentStockValue = currentStockData?.stock || 0;
          
          if (item.quantity > currentStockValue) {
            console.error('Insufficient stock for bulk transaction:', {
              goodId: item.idgood,
              locationId: item.idlocation,
              requested: item.quantity,
              available: currentStockValue
            });
            return { success: false, message: `Stok tidak mencukupi untuk ${item.goodName || 'barang'}. Tersedia: ${currentStockValue}, Diminta: ${item.quantity}` };
          }
        }

        // Create goods history record
        const { error: historyError } = await supabase.from('goods_history').insert([{
          idgood: item.idgood,
          idlocation: item.idlocation,
          stock: item.quantity,
          type: params.type,
          payment_type: params.payment_type,
          transaction_id: transaction.id, // Link to the financial transaction
          price: item.price,
          description: `Bulk ${params.type === 'in' ? 'Barang Masuk' : 'Barang Keluar'}`,
          note: params.note || `Bulk ${params.type === 'in' ? 'masuk' : 'keluar'} - ${item.idgood}`
        }]);

        if (historyError) {
          console.error('Failed to create goods history for bulk transaction:', historyError);
          continue; // Skip this item but continue with others
        }

        // Update location stock
        const { data: currentStockData } = await supabase
          .from('location_stocks')
          .select('stock')
          .eq('idgood', item.idgood)
          .eq('idlocation', item.idlocation)
          .single();

        const currentStockValue = currentStockData?.stock || 0;
        const newStock = params.type === 'in' 
          ? currentStockValue + item.quantity 
          : Math.max(0, currentStockValue - item.quantity);

        await supabase
          .from('location_stocks')
          .update({ stock: newStock })
          .eq('idgood', item.idgood)
          .eq('idlocation', item.idlocation);
      }

      // 3. Update cash balance
      const { data: currentBalance } = await supabase
        .from('cash_balances')
        .select('amount')
        .eq('id_category', params.payment_type)
        .single();

      const currentBalanceValue = currentBalance?.amount || 0;
      const newBalance = params.type === 'in' 
        ? currentBalanceValue - total // Money goes out for stock in
        : currentBalanceValue + total; // Money comes in for stock out

      await supabase
        .from('cash_balances')
        .update({ amount: newBalance })
        .eq('id_category', params.payment_type);

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      console.error('processBulkStockTransaction error:', error);
      return { success: false, message: 'Gagal memproses bulk transaksi stok' };
    }
  }
}