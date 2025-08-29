# 🏪 M3 SHOP - Inventory Management System

A comprehensive inventory and financial management system built with React, TypeScript, Ionic, and Supabase.

## ✨ Features

### 📦 Inventory Management
- **CRUD Operations**: Add, edit, delete, and view inventory items
- **Stock Tracking**: Real-time stock level monitoring
- **Stock In/Out**: Track inventory movements with detailed descriptions
- **Search & Filter**: Advanced search functionality with multiple filters
- **Barcode Support**: Generate and manage product codes
- **Location Management**: Organize items by locations
- **Category Management**: Categorize items for better organization

### 💰 Financial Management
- **Dynamic Categories**: Create custom financial categories with colors and icons
- **Transaction Tracking**: Record all financial transactions
- **Cash Balance**: Monitor cash balances across different categories
- **Financial Reports**: Generate comprehensive financial summaries
- **DataTables Features**: Sorting, pagination, and advanced filtering
- **Date Formatting**: Indonesian date format with day names

### 🛠️ Damaged Goods Management
- **Damage Tracking**: Record and track damaged inventory items
- **Reason Documentation**: Document reasons for damage
- **Stock Integration**: Automatic stock adjustment for damaged items
- **Value Calculation**: Calculate total value of damaged goods
- **Reporting**: Generate damaged goods reports

### 🔄 Real-time Updates
- **Manual Refresh**: Refresh data manually with dedicated buttons
- **Auto-sync**: Automatic data synchronization
- **Error Handling**: Comprehensive error handling and user feedback

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Tailwind CSS**: Modern styling with Tailwind CSS
- **Ionic Components**: Native mobile-like components
- **Dark/Light Mode**: Support for different themes
- **Loading States**: Smooth loading animations
- **Confirmation Dialogs**: User-friendly confirmation prompts

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd m3-shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Setup database**
   
   **Option A: Using Supabase Dashboard**
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Copy and paste content from `database.sql`
   - Click "Run"

   **Option B: Using Supabase CLI**
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_ID
   supabase db push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:8100
   - Login with default credentials:
     - Email: `admin@m3shop.com`
     - Password: `admin123`

## 📁 Project Structure

```
m3-shop/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Layout.tsx       # Main layout with sidebar
│   │   ├── DataTable.tsx    # Advanced data table component
│   │   └── DashboardStats.tsx
│   ├── pages/               # Application pages
│   │   └── owner/           # Owner/admin pages
│   │       ├── InventoryManagement.tsx
│   │       ├── FinancialBookkeeping.tsx
│   │       └── DamagedGoodsManagement.tsx
│   ├── services/            # API and business logic
│   │   ├── inventoryService.ts
│   │   ├── financialService.ts
│   │   ├── damagedGoodsService.ts
│   │   └── locationService.ts
│   ├── lib/                 # Utilities and configurations
│   │   └── supabase.ts      # Supabase client configuration
│   └── App.tsx              # Main application component
├── database.sql             # Complete database schema
├── setup-database.sh        # Database setup script
├── package.json
└── README.md
```

## 🗄️ Database Schema

### Core Tables
- **users**: User authentication and management
- **goods**: Inventory items with stock tracking
- **categories**: Product categories
- **locations**: Storage locations
- **financial_categories**: Dynamic financial categories
- **transactions**: Financial transactions
- **goods_history**: Inventory movement history
- **damaged_goods**: Damaged items tracking
- **cash_balances**: Cash balance per category

### Features
- **Row Level Security (RLS)**: Secure data access
- **Foreign Key Constraints**: Data integrity
- **Indexes**: Optimized query performance
- **Triggers**: Automatic timestamp updates
- **Views**: Simplified data access

## 🔧 Configuration

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Setup
1. Create a new Supabase project
2. Get your project URL and anon key
3. Update environment variables
4. Run database schema

## 📱 Available Pages

### Dashboard
- **URL**: `/`
- **Features**: Overview of inventory and financial status

### Inventory Management
- **URL**: `/barang`
- **Features**: 
  - View all inventory items
  - Add/edit/delete items
  - Stock in/out operations
  - Search and filter
  - Detail view

### Financial Bookkeeping
- **URL**: `/financial`
- **Features**:
  - Financial transactions
  - Dynamic categories
  - Cash balance tracking
  - Financial reports
  - DataTables features

### Damaged Goods
- **URL**: `/damaged-goods`
- **Features**:
  - Track damaged items
  - Record damage reasons
  - Calculate damage value
  - Generate reports

### Stock Management
- **URL**: `/stock`
- **Features**: Stock level monitoring and alerts

## 🎯 Key Features Explained

### Dynamic Financial Categories
- Create custom financial categories
- Assign custom colors and icons
- Flexible categorization system
- Real-time balance tracking

### Advanced DataTable
- Sorting on multiple columns
- Pagination with configurable page size
- Search and filter functionality
- Custom cell rendering
- Indonesian date formatting

### Stock Integration
- Automatic financial transaction creation
- Real-time stock updates
- Detailed movement history
- Category-based financial tracking

### Error Handling
- Comprehensive error messages
- User-friendly notifications
- Graceful fallbacks
- Loading states

## 🧪 Testing

### Manual Testing Checklist
- [ ] User authentication
- [ ] Inventory CRUD operations
- [ ] Stock in/out functionality
- [ ] Financial transactions
- [ ] Damaged goods management
- [ ] Search and filter features
- [ ] DataTable sorting and pagination
- [ ] Error handling
- [ ] Responsive design

### Automated Testing (Future)
- Unit tests for services
- Component testing
- Integration tests
- E2E testing

## 🚨 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Verify Supabase project is active
# Check network connectivity
```

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

**Runtime Errors**
- Check browser console for JavaScript errors
- Verify database schema is correct
- Check Supabase logs for API errors

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📈 Performance

### Optimizations
- Efficient database queries with proper indexes
- Lazy loading of components
- Optimized re-renders with React.memo
- Proper error boundaries
- Minimal bundle size

### Monitoring
- Supabase dashboard for database performance
- Browser dev tools for frontend performance
- Network tab for API call monitoring

## 🔒 Security

### Database Security
- Row Level Security (RLS) enabled
- Proper authentication
- Input validation
- SQL injection prevention

### Frontend Security
- Environment variable protection
- Input sanitization
- XSS prevention
- Secure API calls

## 📚 Documentation

### Additional Documentation
- [IMPLEMENTED_FEATURES.md](./IMPLEMENTED_FEATURES.md) - Detailed feature documentation
- [FIXES_AND_IMPROVEMENTS.md](./FIXES_AND_IMPROVEMENTS.md) - Bug fixes and improvements
- [DATABASE_SETUP_MANUAL.md](./DATABASE_SETUP_MANUAL.md) - Manual database setup

### API Documentation
- Service layer documentation in code comments
- TypeScript interfaces for type safety
- Error handling patterns

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Add proper error handling
- Include JSDoc comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
1. Check the documentation files
2. Review troubleshooting section
3. Check GitHub issues
4. Contact the development team

### Reporting Issues
- Use GitHub issues
- Include error messages
- Provide steps to reproduce
- Include environment details

---

**Version**: 2.0.0  
**Last Updated**: December 2024  
**Status**: ✅ Production Ready