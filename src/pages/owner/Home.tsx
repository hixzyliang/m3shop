import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonToast, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router';
import {
  locationOutline,
  cubeOutline,
  walletOutline,
  addOutline,
  removeOutline,
  warningOutline,
  trendingUpOutline,
  gridOutline,
  documentTextOutline,
  trendingDownOutline
} from 'ionicons/icons';
import Layout from '../../components/Layout';
import DashboardStats from '../../components/DashboardStats';
import { LocationService } from '../../services/locationService';
import { InventoryService } from '../../services/inventoryService';
import { FinancialService } from '../../services/financialService';
import { Location, GoodWithDetails, Transaction } from '../../lib/supabase';

const Home: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [goods, setGoods] = useState<GoodWithDetails[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGoods, setFilteredGoods] = useState<GoodWithDetails[]>([]);
  const history = useHistory();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    // Filter goods based on search term
    if (!searchTerm.trim()) {
      setFilteredGoods(goods);
    } else {
      const filtered = goods.filter(good =>
        good.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        good.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        good.categoryname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGoods(filtered);
    }
  }, [searchTerm, goods]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');

      const [locationsData, goodsData, transactionsData] = await Promise.all([
        LocationService.getAllLocations(),
        InventoryService.getAllGoodsWithDetails(),
        FinancialService.getAllTransactions()
      ]);

      console.log('Dashboard data loaded:', {
        locations: locationsData.length,
        goods: goodsData.length,
        transactions: transactionsData.length
      });

      setLocations(locationsData);
      setGoods(goodsData);
      setTransactions(transactionsData);
    } catch (err) {
      console.error('Dashboard loading error:', err);
      setError('Gagal memuat data dashboard. Periksa koneksi database dan pastikan semua tabel sudah dibuat.');
    } finally {
      setLoading(false);
    }
  };

  // Removed handleLogout as it's now handled in Layout component

  const getLowStockGoods = () => {
    return filteredGoods.filter(good => good.available_stock <= 10);
  };

  const getFinancialSummary = () => {
    const income = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.total, 0);

    const expenses = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.total, 0);

    const balance = income - expenses;

    return [
      {
        icon: trendingUpOutline,
        value: `Rp ${income.toLocaleString()}`,
        label: 'Total Pemasukan',
        badge: {
          value: `${transactions.filter(t => t.type === 'in').length} transaksi`,
          color: 'success' as const
        }
      },
      {
        icon: trendingDownOutline,
        value: `Rp ${expenses.toLocaleString()}`,
        label: 'Total Pengeluaran',
        badge: {
          value: `${transactions.filter(t => t.type === 'out').length} transaksi`,
          color: 'danger' as const
        }
      },
      {
        icon: walletOutline,
        value: `Rp ${balance.toLocaleString()}`,
        label: 'Saldo',
        badge: {
          value: balance >= 0 ? 'Positif' : 'Negatif',
          color: (balance >= 0 ? 'success' : 'danger') as 'success' | 'danger'
        }
      }
    ];
  };

  const getInventorySummary = () => {
    const totalGoods = goods.length;
    const totalStock = goods.reduce((sum, good) => sum + (good.available_stock || 0), 0);
    const lowStockCount = getLowStockGoods().length;

    return [
      {
        icon: cubeOutline,
        value: totalGoods.toString(),
        label: 'Total Barang',
        badge: {
          value: `${locations.length} lokasi`,
          color: 'primary' as const
        }
      },
      {
        icon: locationOutline,
        value: totalStock.toString(),
        label: 'Total Stok',
        badge: {
          value: 'unit',
          color: 'warning' as const
        }
      },
      {
        icon: warningOutline,
        value: lowStockCount.toString(),
        label: 'Stok Menipis',
        badge: {
          value: 'perlu restock',
          color: (lowStockCount > 0 ? 'danger' : 'success') as 'success' | 'danger'
        }
      }
    ];
  };

  const recentOmset = (transactions || []).filter((t: any) => (t.category_name || '').toLowerCase() === 'omset').slice(0, 10);
  const [recentGoodsOut, setRecentGoodsOut] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const history = await InventoryService.getAllGoodsHistory();
        setRecentGoodsOut((history || []).filter((h: any) => h.type === 'out').slice(0, 10));
      } catch {}
    })();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat dashboard...</p>
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
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const lowStockGoods = getLowStockGoods();

  return (
    <IonPage>
      <IonContent>
        <Layout title="Dashboard" showMenu onRefresh={loadDashboardData}>
          <div className="page-container">
            {/* Financial Summary */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Ringkasan Keuangan
              </h2>
              <DashboardStats stats={getFinancialSummary()} />
            </div>

            {/* Inventory Summary */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Ringkasan Barang
              </h2>
              <DashboardStats stats={getInventorySummary()} />
            </div>

            {/* Low Stock Alerts */}
            {lowStockGoods.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Peringatan Stok Menipis ({lowStockGoods.length})
                  </h2>
                  <button
                    onClick={() => history.push('/barang')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    Lihat Semua
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {lowStockGoods.slice(0, 5).map((good) => (
                    <div key={good.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{good.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{good.categoryname}</span>
                          <span>•</span>
                          <span className="font-medium text-blue-600">{good.locationname || 'Lokasi Utama'}</span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Stok: {good.available_stock}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Kode: {good.code}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Goods Out */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Riwayat Barang Keluar (Terbaru)</h2>
                  <button
                    onClick={() => history.push('/barang')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    Lihat Semua
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {recentGoodsOut.map((h) => (
                    <div key={h.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-900">{h.good?.code} - {h.good?.name}</div>
                        <div className="text-xs text-gray-600">{new Date(h.created_at).toLocaleString('id-ID')} • {h.location?.locationname}</div>
                      </div>
                      <div className="text-sm text-gray-900">-{h.stock}</div>
                    </div>
                  ))}
                  {recentGoodsOut.length === 0 && <div className="text-sm text-gray-500">Belum ada data</div>}
                </div>
              </div>

              {/* Recent Omset Transactions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Transaksi Masuk (Dompet Omset)</h2>
                  <button
                    onClick={() => history.push('/financial')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    Lihat Semua
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {recentOmset.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-900">Rp {Number(t.total || 0).toLocaleString('id-ID')}</div>
                        <div className="text-xs text-gray-600">{new Date(t.created_at).toLocaleString('id-ID')}</div>
                      </div>
                      <div className="text-xs text-gray-500">{t.note || '-'}</div>
                    </div>
                  ))}
                  {recentOmset.length === 0 && <div className="text-sm text-gray-500">Belum ada data</div>}
                </div>
              </div>
            </div>
          </div>

          <IonToast
            isOpen={showToast}
            onDidDismiss={() => setShowToast(false)}
            message={toastMessage}
            duration={3000}
            position="top"
          />
        </Layout>
      </IonContent>
    </IonPage>
  );
};

export default Home;

