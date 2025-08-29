import React, { useEffect, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import { FinancialService } from '../../services/financialService';
import { InventoryService } from '../../services/inventoryService';
import { AuthService } from '../../services/authService';
import { UserWithLocation } from '../../lib/supabase';

const AdminHistory: React.FC = () => {
  const [adminId, setAdminId] = useState<string>('');
  const [adminLocationId, setAdminLocationId] = useState<string>('');
  const [adminLocationName, setAdminLocationName] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stockOut, setStockOut] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const userData = JSON.parse(u);
      setAdminId(userData.id);
      loadAdminData(userData.id);
    }
  }, []);

  const loadAdminData = async (userId: string) => {
    try {
      setLoading(true);
      const user = await AuthService.getUserById(userId) as UserWithLocation;
      if (user && user.location_id) {
        setAdminLocationId(user.location_id);
        setAdminLocationName(user.location?.locationname || '');
        await loadDataByLocation(user.location_id);
      } else {
        // If admin has no location assigned, show all data
        await loadAllData();
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      await loadAllData();
    } finally {
      setLoading(false);
    }
  };

  const loadDataByLocation = async (locationId: string) => {
    const [tx, gh] = await Promise.all([
      FinancialService.getTransactionsByLocation(locationId),
      InventoryService.getGoodsHistoryByLocation(locationId)
    ]);
    
    // Filter transactions and goods history for this admin
    const filteredTx = (tx || []).filter((t: any) => (t.note || '').includes('admin:'));
    const filteredGh = (gh || []).filter((g: any) => 
      g.type === 'out' && 
      (g.note || '').includes('admin:')
    );
    
    setTransactions(filteredTx);
    setStockOut(filteredGh);
  };

  const loadAllData = async () => {
    const [tx, gh] = await Promise.all([
      FinancialService.getAllTransactions(),
      InventoryService.getAllGoodsHistory()
    ]);
    setTransactions((tx || []).filter((t: any) => (t.note || '').includes('admin:')));
    setStockOut((gh || []).filter((g: any) => g.type === 'out' && (g.note || '').includes('admin:')));
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <Layout title="Admin - Riwayat Input Saya">
            <div className="loading-container">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800 mb-2">Memuat data...</div>
              </div>
            </div>
          </Layout>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <Layout title="Admin - Riwayat Input Saya">
          <div className="page-container">
            {/* Location Info */}
            {adminLocationName && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Lokasi Anda</div>
                    <div className="text-lg font-semibold text-blue-900">{adminLocationName}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Transaksi (Omset) oleh Anda</h2>
              <AdvancedDataTable
                columns={[
                  { key: 'created_at', label: 'Tanggal', width: '20%', render: (v: string) => new Date(v).toLocaleDateString('id-ID') },
                  { key: 'total', label: 'Nominal', width: '20%', render: (v: number) => `Rp ${Number(v||0).toLocaleString('id-ID')}` },
                  { key: 'note', label: 'Catatan', width: '60%' }
                ]}
                data={transactions}
                showActions={false}
                emptyMessage="Belum ada transaksi oleh Anda"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Barang Keluar oleh Anda</h2>
              <AdvancedDataTable
                columns={[
                  { key: 'created_at', label: 'Tanggal', width: '18%', render: (v: string) => new Date(v).toLocaleDateString('id-ID') },
                  { key: 'good.code', label: 'Kode', width: '12%', render: (_: any, row: any) => row.good?.code || '-' },
                  { key: 'good', label: 'Nama Barang', width: '22%', render: (v: any) => v?.name || '-' },
                  { key: 'location', label: 'Lokasi', width: '18%', render: (v: any) => v?.locationname || '-' },
                  { key: 'stock', label: 'Jumlah', width: '10%' },
                  { key: 'price', label: 'Harga', width: '10%', render: (v: number) => `Rp ${Number(v||0).toLocaleString('id-ID')}` },
                  { key: 'type', label: 'Tipe', width: '10%' }
                ]}
                data={stockOut}
                showActions={false}
                emptyMessage="Belum ada barang keluar oleh Anda"
              />
            </div>
          </div>
        </Layout>
      </IonContent>
    </IonPage>
  );
};

export default AdminHistory;

