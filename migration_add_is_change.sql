-- Migration: Add is_change field to financial_categories table
-- This migration adds the is_change field and sets up constraints for change wallet management

-- Add is_change column to existing financial_categories table
ALTER TABLE financial_categories ADD COLUMN IF NOT EXISTS is_change BOOLEAN DEFAULT FALSE;

-- Add constraint to ensure only one change wallet
ALTER TABLE financial_categories ADD CONSTRAINT IF NOT EXISTS unique_change_wallet UNIQUE (is_change) WHERE is_change = TRUE;

-- Add constraint to prevent a wallet from being both primary and change
ALTER TABLE financial_categories ADD CONSTRAINT IF NOT EXISTS no_primary_and_change CHECK (NOT (is_primary = TRUE AND is_change = TRUE));

-- Set 'Saldo Receh' as the default change wallet if it exists
UPDATE financial_categories SET is_change = TRUE WHERE name = 'Saldo Receh' AND is_change = FALSE;

-- Create index for better performance on is_change queries
CREATE INDEX IF NOT EXISTS idx_financial_categories_is_change ON financial_categories(is_change) WHERE is_change = TRUE;
