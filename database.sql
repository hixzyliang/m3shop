-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS goods_history CASCADE;
DROP TABLE IF EXISTS damaged_goods CASCADE;
DROP TABLE IF EXISTS location_stocks CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS transaction_descriptions CASCADE;
DROP TABLE IF EXISTS financial_categories CASCADE;
DROP TABLE IF EXISTS goods CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS informations CASCADE;
DROP TABLE IF EXISTS cash_balances CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create locations table first (needed for users table)
CREATE TABLE locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    locationname VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure plain username/password columns exist for simple auth testing
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Create categories table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoryname VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_categories table for dynamic money types
CREATE TABLE financial_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    icon VARCHAR(50) NOT NULL DEFAULT 'wallet',
    is_primary BOOLEAN DEFAULT FALSE,
    is_change BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint to prevent a wallet from being both primary and change
ALTER TABLE financial_categories ADD CONSTRAINT no_primary_and_change CHECK (NOT (is_primary = TRUE AND is_change = TRUE));

-- Create goods table
CREATE TABLE goods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idcategory UUID REFERENCES categories(id) ON DELETE CASCADE,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15,2) DEFAULT 0,
    damaged_stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_descriptions table
CREATE TABLE transaction_descriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descriptionname VARCHAR(255) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('in', 'out')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table with enhanced fields (without goods_history reference first)
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(10) CHECK (type IN ('in', 'out')) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    id_description UUID REFERENCES transaction_descriptions(id) ON DELETE SET NULL,
    note TEXT,
    payment_type UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_stocks table for location-based stock management
CREATE TABLE location_stocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idgood UUID REFERENCES goods(id) ON DELETE CASCADE,
    idlocation UUID REFERENCES locations(id) ON DELETE CASCADE,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(idgood, idlocation)
);

-- Create goods_history table for stock tracking
CREATE TABLE goods_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idgood UUID REFERENCES goods(id) ON DELETE CASCADE,
    idlocation UUID REFERENCES locations(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL,
    type VARCHAR(20) CHECK (type IN ('in', 'out', 'adjustment', 'initial')) NOT NULL,
    payment_type UUID, -- Financial category ID for stock transactions
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Link to financial transaction
    price DECIMAL(15,2) DEFAULT 0,
    description TEXT, -- For stock transaction descriptions
    note TEXT, -- Additional notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add id_goods_history column to transactions table after goods_history is created
ALTER TABLE transactions ADD COLUMN id_goods_history UUID REFERENCES goods_history(id) ON DELETE SET NULL;

-- Create damaged_goods table
CREATE TABLE damaged_goods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idgood UUID REFERENCES goods(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reported_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cash_balances table
CREATE TABLE cash_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_category UUID REFERENCES financial_categories(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create informations table
CREATE TABLE informations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    informationname VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique indexes instead of constraints with WHERE clauses
CREATE UNIQUE INDEX unique_primary_wallet ON financial_categories (is_primary) WHERE is_primary = TRUE;
CREATE UNIQUE INDEX unique_change_wallet ON financial_categories (is_change) WHERE is_change = TRUE;

-- Insert default data
INSERT INTO financial_categories (name, color, icon) VALUES
('Uang Tunai', '#10B981', 'cash'),
('Uang Digital', '#3B82F6', 'card'),
('Setoran', '#F59E0B', 'bank'),
('Omset', '#8B5CF6', 'trending-up'),
('Saldo Receh', '#6B7280', 'coins'),
('Uang Tabungan', '#059669', 'piggy-bank');

-- Set default primary wallet to 'Uang Tunai'
UPDATE financial_categories SET is_primary = TRUE WHERE name = 'Uang Tunai';

-- Set default change wallet to 'Saldo Receh'
UPDATE financial_categories SET is_change = TRUE WHERE name = 'Saldo Receh';

INSERT INTO transaction_descriptions (descriptionname, type) VALUES
('Penjualan', 'in'),
('Pembelian', 'out'),
('Biaya Operasional', 'out'),
('Pendapatan Lainnya', 'in'),
('Setoran Modal', 'in'),
('Penarikan Modal', 'out');

-- Insert sample user
INSERT INTO users (email, password_hash, role, username, password, is_active) VALUES
('owner@m3shop.com', '$2a$10$dummy.hash.for.testing', 'owner', 'owner', '1', true)
ON CONFLICT DO NOTHING;

-- Insert sample admin users with location assignments
INSERT INTO users (email, password_hash, role, username, password, location_id, is_active) VALUES
('admin1@m3shop.com', '$2a$10$dummy.hash.for.testing', 'admin', 'admin1', '1', (SELECT id FROM locations WHERE locationname = 'Cabang 1' LIMIT 1), true),
('admin2@m3shop.com', '$2a$10$dummy.hash.for.testing', 'admin', 'admin2', '1', (SELECT id FROM locations WHERE locationname = 'Cabang 2' LIMIT 1), true),
('admin3@m3shop.com', '$2a$10$dummy.hash.for.testing', 'admin', 'admin3', '1', (SELECT id FROM locations WHERE locationname = 'Cabang 3' LIMIT 1), true)
ON CONFLICT DO NOTHING;

-- Add extra financial categories for testing
INSERT INTO financial_categories (name, color, icon, is_primary) VALUES
('Dompet Harian', '#3B82F6', 'wallet', false),
('Rekening BCA', '#10B981', 'bank', false),
('e-Wallet DANA', '#06B6D4', 'digital', false)
ON CONFLICT DO NOTHING;

-- Comprehensive test data for locations (10 locations)
INSERT INTO locations (locationname, address) VALUES
('Cabang 1', 'Jl. Sudirman No. 123, Jakarta Pusat'),
('Cabang 2', 'Jl. Thamrin No. 456, Jakarta Pusat'),
('Cabang 3', 'Jl. Gatot Subroto No. 789, Jakarta Selatan'),
('Cabang 4', 'Jl. Hayam Wuruk No. 321, Jakarta Barat'),
('Cabang 5', 'Jl. Mangga Dua No. 654, Jakarta Utara'),
('Cabang 6', 'Jl. Industri No. 987, Tangerang'),
('Cabang 7', 'Jl. Raya Bekasi No. 147, Bekasi'),
('Cabang 8', 'Jl. Raya Depok No. 258, Depok'),
('Cabang 9', 'Jl. Raya Bogor No. 369, Bogor'),
('Cabang 10', 'Jl. Raya Serang No. 741, Serang')
ON CONFLICT DO NOTHING;

-- Comprehensive test data for categories (10 categories)
INSERT INTO categories (categoryname) VALUES
('Makanan'),
('Minuman'),
('Snack'),
('Rokok'),
('Pulsa'),
('Lainnya'),
('Kesehatan'),
('Kebersihan'),
('Elektronik'),
('Pakaian')
ON CONFLICT DO NOTHING;

-- Comprehensive test data for goods (50 items)
INSERT INTO goods (idcategory, code, name, price, damaged_stock) VALUES
-- Makanan (8 items)
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-001', 'Indomie Goreng', 3500, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-002', 'Indomie Kuah', 3000, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-003', 'Beras Ramos 5kg', 72000, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-004', 'Beras Ramos 10kg', 140000, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-005', 'Gulaku Gula Pasir 1kg', 16000, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-006', 'Bimoli Minyak Goreng 2L', 35000, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-007', 'Kecap Bango 600ml', 18000, 0),
((SELECT id FROM categories WHERE categoryname = 'Makanan' LIMIT 1), 'SKU-008', 'Saus Sambal ABC 340ml', 12000, 0),

-- Minuman (8 items)
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-009', 'Aqua Air Mineral 600ml', 3000, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-010', 'Aqua Air Mineral 1.5L', 5000, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-011', 'Teh Botol Sosro 350ml', 4500, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-012', 'Coca-Cola 390ml', 6000, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-013', 'Pepsi 390ml', 6000, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-014', 'Ultra Milk Cokelat 250ml', 7000, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-015', 'Yakult 5 Botol', 12000, 0),
((SELECT id FROM categories WHERE categoryname = 'Minuman' LIMIT 1), 'SKU-016', 'Pocari Sweat 500ml', 9000, 0),

-- Snack (8 items)
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-017', 'Chitato Sapi Panggang 68g', 9000, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-018', 'Qtela Singkong Original 60g', 8000, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-019', 'Roma Biskuit Marie 300g', 12000, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-020', 'SilverQueen Almond 65g', 17000, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-021', 'Taro Net Seaweed 68g', 9000, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-022', 'Cheetos Puff 85g', 8500, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-023', 'Pringles Original 110g', 25000, 0),
((SELECT id FROM categories WHERE categoryname = 'Snack' LIMIT 1), 'SKU-024', 'Ooreo Original 137g', 15000, 0),

-- Rokok (5 items)
((SELECT id FROM categories WHERE categoryname = 'Rokok' LIMIT 1), 'SKU-025', 'Gudang Garam Surya 12', 29000, 0),
((SELECT id FROM categories WHERE categoryname = 'Rokok' LIMIT 1), 'SKU-026', 'Djarum Super 12', 27000, 0),
((SELECT id FROM categories WHERE categoryname = 'Rokok' LIMIT 1), 'SKU-027', 'Sampoerna Mild 16', 36000, 0),
((SELECT id FROM categories WHERE categoryname = 'Rokok' LIMIT 1), 'SKU-028', 'Marlboro Red 20', 45000, 0),
((SELECT id FROM categories WHERE categoryname = 'Rokok' LIMIT 1), 'SKU-029', 'Lucky Strike 20', 42000, 0),

-- Pulsa (5 items)
((SELECT id FROM categories WHERE categoryname = 'Pulsa' LIMIT 1), 'SKU-030', 'Pulsa Telkomsel 25k', 25000, 0),
((SELECT id FROM categories WHERE categoryname = 'Pulsa' LIMIT 1), 'SKU-031', 'Pulsa Telkomsel 50k', 50000, 0),
((SELECT id FROM categories WHERE categoryname = 'Pulsa' LIMIT 1), 'SKU-032', 'Pulsa XL 25k', 25000, 0),
((SELECT id FROM categories WHERE categoryname = 'Pulsa' LIMIT 1), 'SKU-033', 'Pulsa Indosat 25k', 25000, 0),
((SELECT id FROM categories WHERE categoryname = 'Pulsa' LIMIT 1), 'SKU-034', 'Pulsa Tri 25k', 25000, 0),

-- Kesehatan (5 items)
((SELECT id FROM categories WHERE categoryname = 'Kesehatan' LIMIT 1), 'SKU-035', 'Paracetamol 500mg', 5000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kesehatan' LIMIT 1), 'SKU-036', 'Vitamin C 1000mg', 15000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kesehatan' LIMIT 1), 'SKU-037', 'Minyak Kayu Putih 60ml', 8000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kesehatan' LIMIT 1), 'SKU-038', 'Betadine 60ml', 12000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kesehatan' LIMIT 1), 'SKU-039', 'Obat Flu 10 tablet', 10000, 0),

-- Kebersihan (5 items)
((SELECT id FROM categories WHERE categoryname = 'Kebersihan' LIMIT 1), 'SKU-040', 'Sabun Mandi Lifebuoy 85g', 8000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kebersihan' LIMIT 1), 'SKU-041', 'Shampo Pantene 170ml', 25000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kebersihan' LIMIT 1), 'SKU-042', 'Pasta Gigi Pepsodent 190g', 12000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kebersihan' LIMIT 1), 'SKU-043', 'Tissue Paseo 200 sheets', 5000, 0),
((SELECT id FROM categories WHERE categoryname = 'Kebersihan' LIMIT 1), 'SKU-044', 'Sapu Ijuk', 15000, 0),

-- Elektronik (3 items)
((SELECT id FROM categories WHERE categoryname = 'Elektronik' LIMIT 1), 'SKU-045', 'Baterai AA 4 pcs', 8000, 0),
((SELECT id FROM categories WHERE categoryname = 'Elektronik' LIMIT 1), 'SKU-046', 'Kabel USB Type C', 15000, 0),
((SELECT id FROM categories WHERE categoryname = 'Elektronik' LIMIT 1), 'SKU-047', 'Charger HP Universal', 25000, 0),

-- Pakaian (3 items)
((SELECT id FROM categories WHERE categoryname = 'Pakaian' LIMIT 1), 'SKU-048', 'Kaos Polos L', 35000, 0),
((SELECT id FROM categories WHERE categoryname = 'Pakaian' LIMIT 1), 'SKU-049', 'Celana Jeans M', 120000, 0),
((SELECT id FROM categories WHERE categoryname = 'Pakaian' LIMIT 1), 'SKU-050', 'Topi Baseball', 25000, 0)
ON CONFLICT DO NOTHING;

-- Comprehensive location_stocks data (hundreds of records)
-- Distribute goods across multiple locations with varying stock levels
INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 200 + 100) -- Gudang has more stock
    ELSE floor(random() * 50 + 10) -- Regular locations have less stock
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-001', 'SKU-002', 'SKU-003', 'SKU-004', 'SKU-005', 'SKU-006', 'SKU-007', 'SKU-008') -- Makanan
  AND l.locationname IN ('Cabang 1', 'Cabang 2', 'Cabang 3', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 300 + 150)
    ELSE floor(random() * 80 + 20)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-009', 'SKU-010', 'SKU-011', 'SKU-012', 'SKU-013', 'SKU-014', 'SKU-015', 'SKU-016') -- Minuman
  AND l.locationname IN ('Cabang 1', 'Cabang 2', 'Cabang 4', 'Cabang 5', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 150 + 75)
    ELSE floor(random() * 40 + 15)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-017', 'SKU-018', 'SKU-019', 'SKU-020', 'SKU-021', 'SKU-022', 'SKU-023', 'SKU-024') -- Snack
  AND l.locationname IN ('Cabang 1', 'Cabang 3', 'Cabang 4', 'Cabang 6', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 100 + 50)
    ELSE floor(random() * 30 + 10)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-025', 'SKU-026', 'SKU-027', 'SKU-028', 'SKU-029') -- Rokok
  AND l.locationname IN ('Cabang 1', 'Cabang 2', 'Cabang 5', 'Cabang 7', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 200 + 100)
    ELSE floor(random() * 50 + 20)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-030', 'SKU-031', 'SKU-032', 'SKU-033', 'SKU-034') -- Pulsa
  AND l.locationname IN ('Cabang 1', 'Cabang 2', 'Cabang 3', 'Cabang 4', 'Cabang 5', 'Cabang 6', 'Cabang 7', 'Cabang 8', 'Cabang 9', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 100 + 50)
    ELSE floor(random() * 25 + 10)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-035', 'SKU-036', 'SKU-037', 'SKU-038', 'SKU-039') -- Kesehatan
  AND l.locationname IN ('Cabang 1', 'Cabang 3', 'Cabang 6', 'Cabang 8', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 80 + 40)
    ELSE floor(random() * 20 + 8)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-040', 'SKU-041', 'SKU-042', 'SKU-043', 'SKU-044') -- Kebersihan
  AND l.locationname IN ('Cabang 2', 'Cabang 4', 'Cabang 7', 'Cabang 9', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 60 + 30)
    ELSE floor(random() * 15 + 5)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-045', 'SKU-046', 'SKU-047') -- Elektronik
  AND l.locationname IN ('Cabang 1', 'Cabang 5', 'Cabang 8', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO location_stocks (idgood, idlocation, stock)
SELECT g.id, l.id, 
  CASE 
    WHEN l.locationname LIKE 'Gudang%' THEN floor(random() * 40 + 20)
    ELSE floor(random() * 10 + 3)
  END
FROM goods g, locations l
WHERE g.code IN ('SKU-048', 'SKU-049', 'SKU-050') -- Pakaian
  AND l.locationname IN ('Cabang 3', 'Cabang 6', 'Cabang 9', 'Gudang Utama')
ON CONFLICT DO NOTHING;

-- Comprehensive goods_history data (hundreds of records)
-- Generate realistic stock movement history
INSERT INTO goods_history (idgood, idlocation, stock, type, payment_type, price, description, note, created_at)
SELECT 
  ls.idgood,
  ls.idlocation,
  CASE 
    WHEN random() > 0.6 THEN floor(random() * 20 + 5) -- 40% chance of small quantity
    ELSE floor(random() * 50 + 10) -- 60% chance of larger quantity
  END,
  CASE 
    WHEN random() > 0.5 THEN 'in'
    ELSE 'out'
  END,
  (SELECT id FROM financial_categories WHERE name = CASE 
    WHEN random() > 0.7 THEN 'Uang Tunai'
    WHEN random() > 0.5 THEN 'Uang Digital'
    WHEN random() > 0.3 THEN 'Setoran'
    ELSE 'Omset'
  END LIMIT 1),
  g.price,
  CASE 
    WHEN random() > 0.5 THEN 'Pembelian supplier'
    WHEN random() > 0.3 THEN 'Restok'
    WHEN random() > 0.1 THEN 'Penjualan'
    ELSE 'Transfer antar lokasi'
  END,
  CASE 
    WHEN random() > 0.8 THEN 'Catatan tambahan'
    ELSE NULL
  END,
  NOW() - (random() * INTERVAL '30 days')
FROM location_stocks ls
JOIN goods g ON g.id = ls.idgood
WHERE random() > 0.3 -- 70% of location_stocks get history
LIMIT 200;

-- Additional specific history records for variety
INSERT INTO goods_history (idgood, idlocation, stock, type, payment_type, price, description, note, created_at)
SELECT 
  g.id,
  l.id,
  floor(random() * 30 + 10),
  'in',
  (SELECT id FROM financial_categories WHERE name = 'Uang Tunai' LIMIT 1),
  g.price,
  'Pembelian awal stok',
  'Stok awal saat pembukaan toko',
  NOW() - INTERVAL '45 days'
FROM goods g, locations l
WHERE g.code IN ('SKU-001', 'SKU-009', 'SKU-017', 'SKU-025', 'SKU-030')
  AND l.locationname IN ('Cabang 1', 'Cabang 2', 'Gudang Utama')
ON CONFLICT DO NOTHING;

INSERT INTO goods_history (idgood, idlocation, stock, type, payment_type, price, description, note, created_at)
SELECT 
  g.id,
  l.id,
  floor(random() * 15 + 5),
  'out',
  (SELECT id FROM financial_categories WHERE name = 'Omset' LIMIT 1),
  g.price,
  'Penjualan harian',
  'Penjualan rutin harian',
  NOW() - INTERVAL '1 day'
FROM goods g, locations l
WHERE g.code IN ('SKU-001', 'SKU-009', 'SKU-017', 'SKU-025', 'SKU-030')
  AND l.locationname IN ('Cabang 1', 'Cabang 2', 'Cabang 3')
ON CONFLICT DO NOTHING;

-- Manual financial transactions (curated)
INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 150000, td.id, 'Penjualan eceran harian', fc.id, NOW() - INTERVAL '10 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Penjualan' AND fc.name='Omset' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 800000, td.id, 'Pembelian barang supplier', fc.id, NOW() - INTERVAL '9 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Pembelian' AND fc.name='Uang Tunai' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 250000, td.id, 'Biaya listrik toko', fc.id, NOW() - INTERVAL '8 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Biaya Operasional' AND fc.name='Uang Digital' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 2000000, td.id, 'Setoran modal pemilik', fc.id, NOW() - INTERVAL '7 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Setoran Modal' AND fc.name='Setoran' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 175000, td.id, 'Penjualan harian', fc.id, NOW() - INTERVAL '6 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Penjualan' AND fc.name='Omset' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 1200000, td.id, 'Pembelian restok', fc.id, NOW() - INTERVAL '5 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Pembelian' AND fc.name='Uang Tunai' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 195000, td.id, 'Penjualan harian', fc.id, NOW() - INTERVAL '4 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Penjualan' AND fc.name='Omset' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 300000, td.id, 'Biaya internet', fc.id, NOW() - INTERVAL '3 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Biaya Operasional' AND fc.name='Uang Digital' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 210000, td.id, 'Penjualan harian', fc.id, NOW() - INTERVAL '2 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Penjualan' AND fc.name='Omset' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 950000, td.id, 'Pembelian barang', fc.id, NOW() - INTERVAL '1 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Pembelian' AND fc.name='Uang Tunai' LIMIT 1;

-- Additional manual transactions
INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 220000, td.id, 'Penjualan eceran', fc.id, NOW() - INTERVAL '11 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Penjualan' AND fc.name='Omset' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 180000, td.id, 'Biaya kebersihan', fc.id, NOW() - INTERVAL '13 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Biaya Operasional' AND fc.name='Uang Digital' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'in', 500000, td.id, 'Pendapatan lainnya', fc.id, NOW() - INTERVAL '16 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Pendapatan Lainnya' AND fc.name='Omset' LIMIT 1;

INSERT INTO transactions (type, total, id_description, note, payment_type, created_at)
SELECT 'out', 400000, td.id, 'Penarikan kas', fc.id, NOW() - INTERVAL '18 days'
FROM transaction_descriptions td, financial_categories fc
WHERE td.descriptionname='Penarikan Modal' AND fc.name='Uang Tunai' LIMIT 1;

-- Adjust cash_balances roughly according to transactions per wallet
DELETE FROM cash_balances;
INSERT INTO cash_balances (id_category, amount)
SELECT fc.id, COALESCE(
  (SELECT SUM(CASE WHEN t.type='in' THEN t.total ELSE -t.total END) FROM transactions t WHERE t.payment_type = fc.id), 0
)
FROM financial_categories fc;

-- Damaged goods examples
INSERT INTO damaged_goods (idgood, stock, reason, reported_by, created_at)
SELECT g.id, 2, 'Kemasan rusak', 'owner', NOW() - INTERVAL '3 days' FROM goods g WHERE g.code='SKU-006';

INSERT INTO damaged_goods (idgood, stock, reason, reported_by, created_at)
SELECT g.id, 1, 'Tumpah', 'owner', NOW() - INTERVAL '2 days' FROM goods g WHERE g.code='SKU-003';

INSERT INTO damaged_goods (idgood, stock, reason, reported_by, created_at)
SELECT g.id, 3, 'Kedaluwarsa', 'owner', NOW() - INTERVAL '1 days' FROM goods g WHERE g.code='SKU-011';

-- Informations entries
INSERT INTO informations (informationname, created_at) VALUES
('Jam operasional: 08:00 - 22:00', NOW() - INTERVAL '10 days'),
('Kontak toko: 0812-3456-7890', NOW() - INTERVAL '9 days'),
('Promo minggu ini: Diskon 10% snack', NOW() - INTERVAL '7 days');

-- Add some transaction descriptions for testing (if not already inserted above)
INSERT INTO transaction_descriptions (descriptionname, type, is_active) VALUES
('Penjualan Eceran', 'in', true),
('Penjualan', 'in', true),
('Pembelian Barang', 'out', true),
('Pembelian', 'out', true),
('Biaya Listrik', 'out', true)
ON CONFLICT DO NOTHING;

-- Update transactions dengan goods_history untuk menampilkan detail barang
UPDATE transactions 
SET id_goods_history = gh.id
FROM goods_history gh
WHERE DATE(transactions.created_at) = DATE(gh.created_at) 
    AND transactions.payment_type = gh.payment_type
    AND transactions.type = gh.type
    AND transactions.id_goods_history IS NULL
    AND random() > 0.4;

-- Create indexes for better performance
CREATE INDEX idx_goods_category ON goods(idcategory);
CREATE INDEX idx_goods_code ON goods(code);
CREATE INDEX idx_location_stocks_good ON location_stocks(idgood);
CREATE INDEX idx_location_stocks_location ON location_stocks(idlocation);
CREATE INDEX idx_location_stocks_good_location ON location_stocks(idgood, idlocation);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_payment_type ON transactions(payment_type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_goods_history_good ON goods_history(idgood);
CREATE INDEX idx_goods_history_location ON goods_history(idlocation);
CREATE INDEX idx_goods_history_type ON goods_history(type);
CREATE INDEX idx_goods_history_created_at ON goods_history(created_at);
CREATE INDEX idx_transactions_goods_history ON transactions(id_goods_history);
CREATE INDEX idx_damaged_goods_good ON damaged_goods(idgood);
CREATE INDEX idx_damaged_goods_created_at ON damaged_goods(created_at);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_updated_at BEFORE UPDATE ON goods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_categories_updated_at BEFORE UPDATE ON financial_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cash_balances_updated_at BEFORE UPDATE ON cash_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate available stock across all locations
CREATE OR REPLACE FUNCTION calculate_available_stock(good_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_stock INTEGER;
    damaged_stock_var INTEGER;
BEGIN
    SELECT COALESCE(SUM(ls.stock), 0), g.damaged_stock INTO total_stock, damaged_stock_var
    FROM goods g
    LEFT JOIN location_stocks ls ON g.id = ls.idgood
    WHERE g.id = good_id
    GROUP BY g.damaged_stock;
    
    RETURN COALESCE(total_stock, 0) - COALESCE(damaged_stock_var, 0);
END;
$$ LANGUAGE plpgsql;

-- View for goods with details
CREATE OR REPLACE VIEW goods_with_details AS
SELECT 
    g.id,
    g.idcategory,
    g.code,
    g.name,
    g.price,
    g.damaged_stock,
    g.created_at,
    g.updated_at,
    c.categoryname,
    calculate_available_stock(g.id) as available_stock,
    calculate_available_stock(g.id) as stock
FROM goods g
LEFT JOIN categories c ON g.idcategory = c.id;

-- Grant permissions to anon and authenticated roles (NO RLS) if roles exist
DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'anon';
  IF FOUND THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon';
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon';
  END IF;

  PERFORM 1 FROM pg_roles WHERE rolname = 'authenticated';
  IF FOUND THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated';
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated';
  END IF;
END$$;

-- Grant permissions to postgres
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- DISABLE ROW LEVEL SECURITY FOR ALL TABLES
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE goods DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_descriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE goods_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE damaged_goods DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE informations DISABLE ROW LEVEL SECURITY;

-- Migration: Add transaction_id column to goods_history table for bulk transaction linking
-- This migration adds a foreign key reference to transactions table
ALTER TABLE goods_history ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Add index for better performance on transaction_id queries
CREATE INDEX IF NOT EXISTS idx_goods_history_transaction_id ON goods_history(transaction_id);

-- Clean up duplicate transaction descriptions
-- Delete duplicates and keep only the first one for each descriptionname
WITH duplicates AS (
  SELECT id, descriptionname, created_at,
         ROW_NUMBER() OVER (PARTITION BY descriptionname ORDER BY created_at ASC) as rn
  FROM transaction_descriptions
)
DELETE FROM transaction_descriptions 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Update existing goods_history records to link with transactions where possible
-- This is a best-effort update for existing data
UPDATE goods_history 
SET transaction_id = (
  SELECT t.id 
  FROM transactions t 
  WHERE t.payment_type = goods_history.payment_type 
  AND t.created_at::date = goods_history.created_at::date
  LIMIT 1
)
WHERE transaction_id IS NULL 
AND payment_type IS NOT NULL;