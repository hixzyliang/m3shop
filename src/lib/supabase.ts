import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = "https://vrqwgffmvtwfpreydexh.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXdnZmZtdnR3ZnByZXlkZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDkxMDIsImV4cCI6MjA3MTgyNTEwMn0.ZZAWPfReJs3kf1WdwMTR_MpFVPaSLbqbUEKUwN9MKDU";

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection function with detailed logging
export const testSupabaseConnection = async () => {
  try {
    console.log("Testing Supabase connection...");
    console.log("URL:", supabaseUrl);
    console.log("Key length:", supabaseKey.length);

    // Test basic connection with more detailed error handling
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      console.error("Supabase connection error:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    console.log("Supabase connection successful");
    console.log("Data received:", data);
    return true;
  } catch (error) {
    console.error("Supabase connection test failed:", error);
    return false;
  }
};

// Test specific tables with detailed error logging
export const testDatabaseTables = async () => {
  const tables = [
    "users",
    "locations",
    "categories",
    "goods",
    "goods_history",
    "damaged_goods",
    "transactions",
    "financial_categories",
    "cash_balances",
    "transaction_descriptions",
    "informations",
  ];
  const results: {
    [key: string]: { success: boolean; error?: any; data?: any };
  } = {};

  for (const table of tables) {
    try {
      console.log(`Testing table: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select("count")
        .limit(1);

      if (error) {
        console.error(`Error testing table ${table}:`, error);
        results[table] = {
          success: false,
          error: error,
          data: null,
        };
      } else {
        console.log(`Table ${table}: OK - Count: ${data?.[0]?.count || "N/A"}`);
        results[table] = {
          success: true,
          error: null,
          data: data,
        };
      }
    } catch (error) {
      console.error(`Exception testing table ${table}:`, error);
      results[table] = {
        success: false,
        error: error,
        data: null,
      };
    }
  }

  return results;
};

// User interface based on ERD
export interface User {
  id: string;
  // Support both legacy and new schemas
  username?: string;
  email?: string;
  password?: string;
  password_hash?: string;
  role: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// User with location information (for admin users)
export interface UserWithLocation extends User {
  location_id?: string;
  location?: Location;
}

// Location interface based on ERD
export interface Location {
  id: string;
  locationname: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Category interface based on ERD
export interface Category {
  id: string;
  categoryname: string;
  created_at: string;
  updated_at: string;
}

// Good interface based on ERD
export interface Good {
  id: string;
  idcategory: string;
  idlocation: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  damaged_stock: number;
  created_at: string;
  updated_at: string;
}

// GoodWithDetails interface for joined data
export interface GoodWithDetails extends Good {
  categoryname?: string;
  locationname?: string;
  available_stock: number;
}

// Stock interface for stock management (using goods table)
export interface Stock {
  id: string;
  idgood: string;
  idlocation: string;
  stock: number; // Changed from quantity to stock to match database
  type: "in" | "out" | "adjustment" | "initial"; // Added missing types
  payment_type?: string; // Financial category ID
  price?: number;
  created_at: string;
  good?: Good;
  location?: Location;
}

// Goods History interface based on ERD
export interface GoodsHistory {
  id: string;
  idgood: string;
  idlocation: string;
  stock: number;
  type: "in" | "out" | "adjustment" | "initial";
  payment_type: string | null;
  price: number;
  description: string | null;
  note: string | null;
  created_at: string;
  good?: Good;
  location?: Location;
}

// Transaction interface based on ERD
export interface Transaction {
  id: string;
  type: "in" | "out";
  total: number;
  id_description?: string | null;
  note?: string | null;
  payment_type: string; // Financial category ID
  created_at: string;
}

// Cash Balance interface for financial tracking
export interface CashBalance {
  id: string;
  id_category: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

// Transaction Description interface
export interface TransactionDescription {
  id: string;
  descriptionname: string;
  type: 'in' | 'out';
  is_active: boolean;
  created_at: string;
}

// Financial Category interface for dynamic money types
export interface FinancialCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Damaged Goods interface
export interface DamagedGood {
  id: string;
  idgood: string;
  stock: number;
  reason: string;
  reported_by: string | null;
  created_at: string;
  good?: Good;
}

// Information interface based on ERD
export interface Information {
  id: string;
  informationname: string;
  created_at: string;
}

// Enhanced interfaces for better type safety
export interface CreateGoodData {
  idcategory: string;
  idlocation: string;
  code: string;
  name: string;
  price: number;
  stock: number;
}

export interface UpdateGoodData {
  idcategory?: string;
  idlocation?: string;
  code?: string;
  name?: string;
  price?: number;
  stock?: number;
  damaged_stock?: number;
}

export interface CreateTransactionData {
  type: 'in' | 'out';
  total: number;
  id_description?: string | null;
  note?: string | null;
  payment_type: string;
}

export interface UpdateTransactionData {
  type?: 'in' | 'out';
  total?: number;
  id_description?: string | null;
  note?: string | null;
  payment_type?: string;
}

export interface CreateStockData {
  idgood: string;
  idlocation: string;
  stock: number;
  type: 'in' | 'out';
  payment_type: string;
  price: number;
  description: string;
  note?: string;
}

export interface CreateDamagedGoodData {
  idgood: string;
  stock: number;
  reason: string;
  reported_by?: string;
}

// Export all interfaces
// (Removed duplicate export block to avoid TS conflicts)
