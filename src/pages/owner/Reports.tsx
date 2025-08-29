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
import { FinancialService } from '../../services/financialService';
import { InventoryService } from '../../services/inventoryService';
import { Transaction } from '../../lib/supabase';
import AdvancedDataTable from '../../components/AdvancedDataTable';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [goods, setGoods] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadReportsData();
  }, [selectedMonth]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [startDate, endDate] = getMonthDateRange(selectedMonth);
      const [transactionsData, stockData, goodsData] = await Promise.all([
        FinancialService.getTransactionsByDateRange(startDate, endDate),
        InventoryService.getAllGoodsHistory(),
        InventoryService.getAllGoodsWithDetails()
      ]);

      setTransactions(transactionsData || []);
      setGoods(goodsData || []);
      const filteredStock = (stockData || []).filter((s: any) => {
        const d = new Date(s.created_at);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });
      setStockHistory(filteredStock);
    } catch (err) {
      console.error('Reports loading error:', err);
      setError('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const getMonthDateRange = (ym: string): [string, string] => {
    // ym format: YYYY-MM
    const [y, m] = ym.split('-').map((v) => parseInt(v, 10));
    const start = new Date(y, m - 1, 1, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59);
    return [start.toISOString(), end.toISOString()];
  };

  const monthLabel = (() => {
    try {
      const [y, m] = selectedMonth.split('-').map((v) => parseInt(v, 10));
      return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
    } catch { return selectedMonth; }
  })();

  const exportTransactionsCSV = () => {
    const headers = ['Tanggal', 'Tipe', 'Keterangan', 'Nominal', 'Dompet'];
    const rows = transactions.map((t: any) => [
      new Date(t.created_at).toLocaleString('id-ID'),
      t.type,
      t.description_name || '',
      t.total,
      t.category_name || ''
    ]);
    downloadCSV([headers, ...rows], `transaksi_${selectedMonth}.csv`);
  };

  const exportStockCSV = () => {
    const headers = ['Tanggal', 'Kode', 'Nama Barang', 'Lokasi', 'Tipe', 'Jumlah', 'Harga'];
    const rows = stockHistory.map((s: any) => [
      new Date(s.created_at).toLocaleString('id-ID'),
      s.good?.code || '',
      s.good?.name || '',
      s.location?.locationname || '',
      s.type,
      s.stock,
      s.price || 0
    ]);
    downloadCSV([headers, ...rows], `stok_${selectedMonth}.csv`);
  };

  const downloadCSV = (rows: any[][], filename: string) => {
    const csvContent = rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const newWin = window.open('', '_blank');
    if (!newWin) return;
    const style = `
      <style>
        body { font-family: Arial, sans-serif; color: #111827; }
        h2 { margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f9fafb; }
      </style>`;
    const txRows = transactions.map((t: any) => `
      <tr>
        <td>${new Date(t.created_at).toLocaleString('id-ID')}</td>
        <td>${t.type}</td>
        <td>${t.description_name || ''}</td>
        <td>${t.total?.toLocaleString('id-ID')}</td>
        <td>${t.category_name || ''}</td>
      </tr>`).join('');
    const stRows = stockHistory.map((s: any) => `
      <tr>
        <td>${new Date(s.created_at).toLocaleString('id-ID')}</td>
        <td>${s.good?.code || ''}</td>
        <td>${s.good?.name || ''}</td>
        <td>${s.location?.locationname || ''}</td>
        <td>${s.type}</td>
        <td>${s.stock}</td>
        <td>${(s.price || 0).toLocaleString('id-ID')}</td>
      </tr>`).join('');
    newWin.document.write(`
      <html><head><title>Laporan ${monthLabel}</title>${style}</head><body>
      <h2>Laporan Transaksi - ${monthLabel}</h2>
      <table><thead><tr><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th>Nominal</th><th>Dompet</th></tr></thead><tbody>${txRows}</tbody></table>
      <h2>Laporan Pergerakan Stok - ${monthLabel}</h2>
      <table><thead><tr><th>Tanggal</th><th>Kode</th><th>Nama Barang</th><th>Lokasi</th><th>Tipe</th><th>Jumlah</th><th>Harga</th></tr></thead><tbody>${stRows}</tbody></table>
      </body></html>`);
    newWin.document.close();
    newWin.focus();
    newWin.print();
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
    const lowStockItems = goods.filter((g: any) => (g.available_stock || 0) <= 10).length;
    const outOfStockItems = goods.filter((g: any) => (g.available_stock || 0) === 0).length;
    const totalStockValue = goods.reduce((sum: number, g: any) => sum + ((g.available_stock || 0) * (g.price || 35000)), 0);
    
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
          {/* Controls row: month picker + export buttons (moved to top) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Pilih Bulan</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <IonButton fill="outline" onClick={exportPDF}>
                <IonIcon icon={downloadOutline} slot="start" />
                Export PDF
              </IonButton>
              <IonButton fill="outline" onClick={() => { exportTransactionsCSV(); exportStockCSV(); }}>
                <IonIcon icon={downloadOutline} slot="start" />
                Export Excel
              </IonButton>
            </div>
          </div>

          {/* Tables */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={trendingUpOutline} />
                Daftar Transaksi - {monthLabel}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <AdvancedDataTable
                columns={[
                  { key: 'created_at', label: 'Tanggal', width: '20%' },
                  { key: 'type', label: 'Tipe', width: '12%' },
                  { key: 'description_name', label: 'Keterangan', width: '28%' },
                  { key: 'category_name', label: 'Dompet', width: '20%' },
                  { key: 'total', label: 'Nominal', width: '20%', render: (v: number) => `Rp ${Number(v||0).toLocaleString('id-ID')}` }
                ]}
                data={transactions}
                showActions={false}
                emptyMessage="Tidak ada transaksi untuk bulan ini"
              />
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="flex items-center gap-2">
                <IonIcon icon={statsChartOutline} />
                Pergerakan Stok - {monthLabel}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <AdvancedDataTable
                columns={[
                  { key: 'created_at', label: 'Tanggal', width: '18%' },
                  { key: 'good.code', label: 'Kode', width: '12%', render: (_: any, row: any) => row.good?.code || '-' },
                  { key: 'good', label: 'Nama Barang', width: '22%', render: (v: any) => v?.name || '-' },
                  { key: 'location', label: 'Lokasi', width: '18%', render: (v: any) => v?.locationname || '-' },
                  { key: 'type', label: 'Tipe', width: '10%', render: (v: string) => v === 'in' ? 'Masuk' : (v === 'out' ? 'Keluar' : v) },
                  { key: 'stock', label: 'Jumlah', width: '10%' },
                  { key: 'price', label: 'Harga', width: '10%', render: (v: number) => `Rp ${Number(v||0).toLocaleString('id-ID')}` }
                ]}
                data={stockHistory}
                showActions={false}
                emptyMessage="Tidak ada pergerakan stok untuk bulan ini"
              />
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

