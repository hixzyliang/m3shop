import React, { useState, useEffect } from 'react';
import { 
  IonContent, 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButton, 
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonToast
} from '@ionic/react';
import { 
  statsChartOutline,
  downloadOutline,
  calendarOutline,
  trendingUpOutline,
  trendingDownOutline
} from 'ionicons/icons';
import { FinancialService } from '../services/financialService';
import { InventoryService } from '../services/inventoryService';
import { Transaction, GoodWithDetails } from '../lib/supabase';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goods, setGoods] = useState<GoodWithDetails[]>([]);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [transactionsData, goodsData] = await Promise.all([
        FinancialService.getAllTransactions(),
        InventoryService.getAllGoodsWithDetails()
      ]);

      setTransactions(transactionsData);
      setGoods(goodsData);
    } catch (err) {
      console.error('Reports loading error:', err);
      setError('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const getSalesReport = () => {
    const salesTransactions = transactions.filter(t => t.type === 'in');
    const totalSales = salesTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalOrders = salesTransactions.length;
    
    return {
      totalSales,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
    };
  };

  const getExpenseReport = () => {
    const expenseTransactions = transactions.filter(t => t.type === 'out');
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.total, 0);
    
    return {
      totalExpenses,
      transactionCount: expenseTransactions.length
    };
  };

  const getInventoryReport = () => {
    const totalItems = goods.length;
    const lowStockItems = goods.filter(g => g.available_stock <= 10).length;
    const outOfStockItems = goods.filter(g => g.available_stock === 0).length;
    const totalStockValue = goods.reduce((sum, g) => sum + (g.available_stock * 35000), 0); // Assuming average price
    
    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalStockValue
    };
  };

  const salesReport = getSalesReport();
  const expenseReport = getExpenseReport();
  const inventoryReport = getInventoryReport();
  const profit = salesReport.totalSales - expenseReport.totalExpenses;

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar className="bg-blue-600 text-white">
            <IonTitle>Laporan</IonTitle>
          </IonToolbar>
        </IonHeader>
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
        <IonHeader>
          <IonToolbar className="bg-blue-600 text-white">
            <IonTitle>Laporan</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <IonButton onClick={loadReportsData} fill="outline">
              Coba Lagi
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="bg-blue-600 text-white">
          <IonTitle>Laporan</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="page-container">
          {/* Sales Report */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={trendingUpOutline} />
                Laporan Penjualan
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="report-stats">
                <div className="report-stat-item">
                  <h3 className="stat-number">Rp {salesReport.totalSales.toLocaleString()}</h3>
                  <p className="stat-label">Total Penjualan</p>
                </div>
                <div className="report-stat-item">
                  <h3 className="stat-number">{salesReport.totalOrders}</h3>
                  <p className="stat-label">Total Pesanan</p>
                </div>
                <div className="report-stat-item">
                  <h3 className="stat-number">Rp {Math.round(salesReport.averageOrderValue).toLocaleString()}</h3>
                  <p className="stat-label">Rata-rata per Pesanan</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Expense Report */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={trendingDownOutline} />
                Laporan Pengeluaran
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="report-stats">
                <div className="report-stat-item">
                  <h3 className="stat-number">Rp {expenseReport.totalExpenses.toLocaleString()}</h3>
                  <p className="stat-label">Total Pengeluaran</p>
                </div>
                <div className="report-stat-item">
                  <h3 className="stat-number">{expenseReport.transactionCount}</h3>
                  <p className="stat-label">Total Transaksi</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Profit/Loss Report */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={statsChartOutline} />
                Laba/Rugi
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="report-stats">
                <div className="report-stat-item">
                  <h3 className={`stat-number ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {Math.abs(profit).toLocaleString()}
                  </h3>
                  <p className="stat-label">{profit >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Inventory Report */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={statsChartOutline} />
                Laporan Barang
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="report-stats">
                <div className="report-stat-item">
                  <h3 className="stat-number">{inventoryReport.totalItems}</h3>
                  <p className="stat-label">Total Item</p>
                </div>
                <div className="report-stat-item">
                  <h3 className="stat-number">{inventoryReport.lowStockItems}</h3>
                  <p className="stat-label">Stok Menipis</p>
                </div>
                <div className="report-stat-item">
                  <h3 className="stat-number">{inventoryReport.outOfStockItems}</h3>
                  <p className="stat-label">Stok Habis</p>
                </div>
                <div className="report-stat-item">
                  <h3 className="stat-number">Rp {inventoryReport.totalStockValue.toLocaleString()}</h3>
                  <p className="stat-label">Nilai Stok</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Export Options */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={downloadOutline} />
                Export Laporan
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="export-options">
                <IonButton 
                  expand="block" 
                  fill="outline" 
                  className="mb-2"
                  onClick={() => {
                    setToastMessage('Fitur export akan segera tersedia');
                    setShowToast(true);
                  }}
                >
                  <IonIcon icon={downloadOutline} slot="start" />
                  Export PDF
                </IonButton>
                <IonButton 
                  expand="block" 
                  fill="outline"
                  onClick={() => {
                    setToastMessage('Fitur export akan segera tersedia');
                    setShowToast(true);
                  }}
                >
                  <IonIcon icon={downloadOutline} slot="start" />
                  Export Excel
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

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

export default Reports;