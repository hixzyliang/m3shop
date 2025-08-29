import React, { useState, useEffect } from 'react';
import { 
  IonPage, 
  IonToast, 
  IonSpinner,
  IonContent
} from '@ionic/react';
import { 
  downloadOutline, 
  calendarOutline, 
  locationOutline,
  trendingUpOutline,
  trendingDownOutline,
  walletOutline,
  documentTextOutline,
  gridOutline
} from 'ionicons/icons';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import DashboardStats from '../../components/DashboardStats';
import { FinancialService } from '../../services/financialService';
import { LocationService } from '../../services/locationService';
import { InventoryService } from '../../services/inventoryService';
import { Transaction, Location } from '../../lib/supabase';

const SalesReport: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [filteredStockHistory, setFilteredStockHistory] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, []);

  // Update filtered data when filters change
  useEffect(() => {
    if (transactions.length > 0) {
      const filtered = getFilteredTransactions();
      setFilteredTransactions(filtered);
    }
    if (stockHistory.length > 0) {
      const filteredStock = getFilteredStockHistory();
      setFilteredStockHistory(filteredStock);
    }
  }, [selectedLocation, selectedMonth, selectedYear, transactions, stockHistory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transactionsData, locationsData, stockData] = await Promise.all([
        FinancialService.getAllTransactions(),
        LocationService.getAllLocations(),
        InventoryService.getAllGoodsHistory()
      ]);
      
      setTransactions(transactionsData);
      const initialFiltered = transactionsData.filter(t => t.type === 'in');
      setFilteredTransactions(initialFiltered);
      setLocations(locationsData);
      setStockHistory(stockData || []);
      setFilteredStockHistory(stockData || []);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data laporan. Periksa koneksi database.');
      console.error('Report loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const baseFiltered = getFilteredTransactions();
    if (!value.trim()) {
      setFilteredTransactions(baseFiltered);
    } else {
      const filtered = baseFiltered.filter(transaction => 
        transaction.type.toLowerCase().includes(value.toLowerCase()) ||
        transaction.total.toString().includes(value)
      );
      setFilteredTransactions(filtered);
    }
  };

  const getFilteredTransactions = () => {
    let filtered = transactions.filter(t => t.type === 'in');
    
    if (selectedLocation) {
      // Placeholder: filter by location if available in data
    }
    
    if (selectedMonth) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate.getMonth() === parseInt(selectedMonth);
      });
    }
    
    if (selectedYear) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate.getFullYear() === parseInt(selectedYear);
      });
    }
    
    return filtered;
  };

  const getFilteredStockHistory = () => {
    let filtered = stockHistory;
    
    if (selectedLocation) {
      filtered = filtered.filter(s => s.idlocation === selectedLocation);
    }
    
    if (selectedMonth) {
      filtered = filtered.filter(s => {
        const stockDate = new Date(s.created_at);
        return stockDate.getMonth() === parseInt(selectedMonth);
      });
    }
    
    if (selectedYear) {
      filtered = filtered.filter(s => {
        const stockDate = new Date(s.created_at);
        return stockDate.getFullYear() === parseInt(selectedYear);
      });
    }
    
    return filtered;
  };

  const getSalesSummary = () => {
    const totalSales = filteredTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const totalTransactions = filteredTransactions.length;
    const averageTransaction = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;
    
    return [
      {
        icon: trendingUpOutline,
        value: `Rp ${totalSales.toLocaleString('id-ID')}`,
        label: 'Total Penjualan',
        badge: {
          value: `${totalTransactions} transaksi`,
          color: 'success' as const
        }
      },
      {
        icon: trendingDownOutline,
        value: `Rp ${averageTransaction.toLocaleString('id-ID')}`,
        label: 'Rata-rata Transaksi',
        badge: {
          value: 'per transaksi',
          color: 'primary' as const
        }
      },
      {
        icon: walletOutline,
        value: `${totalTransactions}`,
        label: 'Jumlah Transaksi',
        badge: {
          value: 'transaksi',
          color: 'warning' as const
        }
      }
    ];
  };

  // Table columns configuration
  const tableColumns = [
    { 
      key: 'created_at', 
      label: 'Tanggal', 
      width: '25%',
      render: (value: string) => {
        try {
          return new Date(value).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return value;
        }
      }
    },
    { 
      key: 'type', 
      label: 'Tipe', 
      width: '15%',
      render: (value: string) => value === 'in' ? 'Penjualan' : 'Lainnya'
    },
    { 
      key: 'category_name', 
      label: 'Metode Pembayaran', 
      width: '25%',
      render: (value: any, row: any) => row.category_name || 'Tunai'
    },
    { 
      key: 'total', 
      label: 'Jumlah', 
      width: '25%',
      render: (value: number) => value ? `Rp ${value.toLocaleString('id-ID')}` : 'Rp 0'
    },
    { 
      key: 'note', 
      label: 'Catatan', 
      width: '10%',
      render: (value: string) => value || '-'
    }
  ];

  // Stock table columns configuration
  const stockTableColumns = [
    { 
      key: 'created_at', 
      label: 'Tanggal', 
      width: '18%',
      render: (value: string) => {
        try {
          return new Date(value).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
          });
        } catch {
          return value;
        }
      }
    },
    { 
      key: 'good.code', 
      label: 'Kode', 
      width: '12%', 
      render: (_: any, row: any) => row.good?.code || '-' 
    },
    { 
      key: 'good', 
      label: 'Nama Barang', 
      width: '22%', 
      render: (v: any) => v?.name || '-' 
    },
    { 
      key: 'location', 
      label: 'Lokasi', 
      width: '18%', 
      render: (v: any) => v?.locationname || '-' 
    },
    { 
      key: 'type', 
      label: 'Tipe', 
      width: '10%', 
      render: (v: string) => v === 'in' ? 'Masuk' : (v === 'out' ? 'Keluar' : v) 
    },
    { 
      key: 'stock', 
      label: 'Jumlah', 
      width: '10%' 
    },
    { 
      key: 'price', 
      label: 'Harga', 
      width: '10%', 
      render: (v: number) => `Rp ${Number(v||0).toLocaleString('id-ID')}` 
    }
  ];

  const exportToPDF = () => {
    try {
      // Create HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <title>Laporan Penjualan</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .summary { margin: 20px 0; padding: 15px; background-color: #f9f9f9; }
              .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
            </style>
          </head>
          <body>
            <h1>Laporan Penjualan</h1>
            <div class="summary">
              <p><strong>Total Penjualan:</strong> Rp ${filteredTransactions.reduce((sum, t) => sum + (t.total || 0), 0).toLocaleString('id-ID')}</p>
              <p><strong>Jumlah Transaksi:</strong> ${filteredTransactions.length}</p>
              <p><strong>Periode:</strong> ${selectedMonth ? `Bulan ${parseInt(selectedMonth) + 1} ` : 'Semua Bulan '}${selectedYear}</p>
            </div>
            
            <div class="section-title">Transaksi Penjualan</div>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Metode Pembayaran</th>
                  <th>Jumlah</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTransactions.map(t => `
                  <tr>
                    <td>${new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                    <td>${t.type === 'in' ? 'Penjualan' : 'Lainnya'}</td>
                    <td>${(t as any).category_name || 'Tunai'}</td>
                    <td>Rp ${(t.total || 0).toLocaleString('id-ID')}</td>
                    <td>${t.note || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="section-title">Pergerakan Stok</div>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kode</th>
                  <th>Nama Barang</th>
                  <th>Lokasi</th>
                  <th>Tipe</th>
                  <th>Jumlah</th>
                  <th>Harga</th>
                </tr>
              </thead>
              <tbody>
                ${filteredStockHistory.map(s => `
                  <tr>
                    <td>${new Date(s.created_at).toLocaleDateString('id-ID')}</td>
                    <td>${s.good?.code || '-'}</td>
                    <td>${s.good?.name || '-'}</td>
                    <td>${s.location?.locationname || '-'}</td>
                    <td>${s.type === 'in' ? 'Masuk' : (s.type === 'out' ? 'Keluar' : s.type)}</td>
                    <td>${s.stock || 0}</td>
                    <td>Rp ${(s.price || 0).toLocaleString('id-ID')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-penjualan-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToastMessage('Laporan PDF berhasil diunduh!');
      setShowToast(true);
    } catch (error) {
      console.error('Export PDF error:', error);
      setToastMessage('Gagal mengunduh laporan PDF');
      setShowToast(true);
    }
  };

  const exportToExcel = () => {
    try {
      // Create CSV content
      const transactionHeaders = ['Tanggal', 'Tipe', 'Metode Pembayaran', 'Jumlah', 'Catatan'];
      const transactionRows = filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString('id-ID'),
        t.type === 'in' ? 'Penjualan' : 'Lainnya',
        (t as any).category_name || 'Tunai',
        (t.total || 0),
        t.note || '-'
      ]);

      const stockHeaders = ['Tanggal', 'Kode', 'Nama Barang', 'Lokasi', 'Tipe', 'Jumlah', 'Harga'];
      const stockRows = filteredStockHistory.map(s => [
        new Date(s.created_at).toLocaleDateString('id-ID'),
        s.good?.code || '-',
        s.good?.name || '-',
        s.location?.locationname || '-',
        s.type === 'in' ? 'Masuk' : (s.type === 'out' ? 'Keluar' : s.type),
        s.stock || 0,
        s.price || 0
      ]);

      // Combine data
      const csvContent = [
        ['LAPORAN PENJUALAN'],
        [''],
        ['Total Penjualan:', `Rp ${filteredTransactions.reduce((sum, t) => sum + (t.total || 0), 0).toLocaleString('id-ID')}`],
        ['Jumlah Transaksi:', filteredTransactions.length],
        ['Periode:', `${selectedMonth ? `Bulan ${parseInt(selectedMonth) + 1} ` : 'Semua Bulan '}${selectedYear}`],
        [''],
        ['TRANSAKSI PENJUALAN'],
        transactionHeaders,
        ...transactionRows,
        [''],
        ['PERGERAKAN STOK'],
        stockHeaders,
        ...stockRows
      ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-penjualan-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToastMessage('Laporan Excel berhasil diunduh!');
      setShowToast(true);
    } catch (error) {
      console.error('Export Excel error:', error);
      setToastMessage('Gagal mengunduh laporan Excel');
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat laporan...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button 
              onClick={loadData} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const salesSummary = getSalesSummary();

  return (
    <IonPage>
      <IonContent>
        <Layout title="Laporan Penjualan">
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Laporan Penjualan
              </h2>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 mb-6">
              <button 
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export PDF
              </button>
              <button 
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export Excel
              </button>
            </div>

            {/* Dashboard Stats */}
            <DashboardStats stats={salesSummary} />

            {/* Search Bar - Direct input without container */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Semua Lokasi</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.locationname}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bulan</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Semua Bulan</option>
                    <option value="0">Januari</option>
                    <option value="1">Februari</option>
                    <option value="2">Maret</option>
                    <option value="3">April</option>
                    <option value="4">Mei</option>
                    <option value="5">Juni</option>
                    <option value="6">Juli</option>
                    <option value="7">Agustus</option>
                    <option value="8">September</option>
                    <option value="9">Oktober</option>
                    <option value="10">November</option>
                    <option value="11">Desember</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tahun</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transaksi Penjualan Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center mb-4">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Transaksi Penjualan</h3>
              </div>
              
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  <h3 className="empty-state-title">Tidak Ada Data Penjualan</h3>
                  <p className="empty-state-description">
                    Tidak ada transaksi penjualan yang ditemukan untuk filter yang dipilih.
                  </p>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredTransactions}
                  globalSearchTerm={searchTerm}
                  emptyMessage="Tidak ada data penjualan yang ditemukan"
                  showActions={false}
                />
              )}
            </div>

            {/* Pergerakan Stok Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center mb-4">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Pergerakan Stok</h3>
              </div>
              
              {filteredStockHistory.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="empty-state-title">Tidak Ada Data Stok</h3>
                  <p className="empty-state-description">
                    Tidak ada pergerakan stok yang ditemukan untuk filter yang dipilih.
                  </p>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={stockTableColumns}
                  data={filteredStockHistory}
                  globalSearchTerm={searchTerm}
                  emptyMessage="Tidak ada data pergerakan stok yang ditemukan"
                  showActions={false}
                />
              )}
            </div>
          </div>
        </Layout>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default SalesReport;

