#!/bin/bash

# Database Setup Script for M3 SHOP Inventory Management System

echo "🚀 Setting up M3 SHOP Database..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) is not installed or not in PATH"
    echo "Please install PostgreSQL client tools first"
    exit 1
fi

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="m3shop"
DB_USER="postgres"

echo "📋 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Prompt for password only if PGPASSWORD/DB_PASSWORD not provided
if [ -z "$PGPASSWORD" ] && [ -z "$DB_PASSWORD" ]; then
    read -s -p "Enter PostgreSQL password for $DB_USER: " DB_PASSWORD
    echo ""
fi
DB_PASSWORD="${DB_PASSWORD:-$PGPASSWORD}"

# Test connection
echo "🔍 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to database"
    echo "Please check your database credentials and ensure PostgreSQL is running"
    exit 1
fi

echo "✅ Database connection successful"

# Run the database schema
echo "📊 Creating database schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

# Verify tables were created
echo "🔍 Verifying tables..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
"

echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "📋 Created tables:"
echo "  - users"
echo "  - locations"
echo "  - categories"
echo "  - financial_categories"
echo "  - goods"
echo "  - transaction_descriptions"
echo "  - transactions"
echo "  - goods_history"
echo "  - damaged_goods"
echo "  - cash_balances"
echo "  - informations"
echo ""
echo "🔧 Next steps:"
echo "  1. Start the development server: npm run dev"
echo "  2. Access the application at: http://localhost:8100"
echo "  3. Login with default credentials (if any)"
echo ""
echo "📚 For more information, check the documentation in IMPLEMENTED_FEATURES.md"