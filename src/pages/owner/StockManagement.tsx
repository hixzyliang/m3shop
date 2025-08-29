import React, { useState, useEffect } from 'react';
import { 
  IonPage, 
  IonToast, 
  IonSpinner,
  IonContent
} from '@ionic/react';
import { 
  addOutline, 
  createOutline, 
  trashOutline, 
  cubeOutline,
  closeOutline,
  checkmarkOutline,
  settingsOutline,
  layersOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';

import { InventoryService, GoodsHistory } from '../../services/inventoryService';
import { LocationService } from '../../services/locationService';
import { Stock, Good, Location } from '../../lib/supabase';
import { formatCurrencyInput } from '../../lib/utils';

const StockManagement: React.FC = () => {
  const history = useHistory();
  const [stocks, setStocks] = useState<GoodsHistory[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<GoodsHistory[]>([]);
  const [goods, setGoods] = useState<Good[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStock, setEditingStock] = useState<GoodsHistory | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedStock, setSelectedStock] = useState<GoodsHistory | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<{
    idgood: string;
    idlocation: string;
    stock: number;
    type: 'in' | 'out';
    payment_type: string;
    price: number;
  }>({
    idgood: '',
    idlocation: '',
    stock: 0,
    type: 'in',
    payment_type: 'tunai',
    price: 0
  });
  const [stockText, setStockText] = useState<string>('0');
  const [priceText, setPriceText] = useState<string>('0');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stocksData, goodsData, locationsData] = await Promise.all([
        InventoryService.getAllGoodsHistory(),
        InventoryService.getAllGoods(),
        LocationService.getAllLocations()
      ]);
      setStocks(stocksData);
      setFilteredStocks(stocksData);
      setGoods(goodsData);
      setLocations(locationsData);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data stok. Periksa koneksi database.');
      console.error('Stock loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilteredStocks(stocks);
  };

  const openModal = (stock?: GoodsHistory) => {
    if (stock) {
      setEditingStock(stock);
      setFormData({
        idgood: stock.idgood,
        idlocation: stock.idlocation,
        stock: stock.stock,
        type: stock.type === 'out' ? 'out' : 'in',
        payment_type: stock.payment_type || 'tunai',
        price: stock.price || 0
      });
      setStockText(String(stock.stock ?? 0));
      setPriceText(String(stock.price ?? 0));
    } else {
      setEditingStock(null);
      setFormData({
        idgood: '',
        idlocation: '',
        stock: 0,
        type: 'in',
        payment_type: 'tunai',
        price: 0
      });
      setStockText('0');
      setPriceText('0');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStock(null);
    setFormData({
      idgood: '',
      idlocation: '',
      stock: 0,
      type: 'in',
      payment_type: 'tunai',
      price: 0
    });
    setStockText('0');
    setPriceText('0');
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.idgood.trim()) {
        setToastMessage('Barang harus dipilih!');
        setShowToast(true);
        return;
      }

      if (!formData.idlocation.trim()) {
        setToastMessage('Lokasi harus dipilih!');
        setShowToast(true);
        return;
      }

      if (formData.stock <= 0) {
        setToastMessage('Jumlah stok harus lebih dari 0!');
        setShowToast(true);
        return;
      }
      
      if (editingStock) {
        await InventoryService.updateStock(editingStock.id, formData);
        setToastMessage('Stok berhasil diperbarui!');
      } else {
        await InventoryService.createStock(formData);
        setToastMessage('Stok berhasil ditambahkan!');
        
        // If stock is going out (sales), create financial transaction
        if (formData.type === 'out' && formData.price && formData.price > 0) {
          try {
            const { FinancialService } = await import('../../services/financialService');
            const totalAmount = formData.stock * formData.price;
            await FinancialService.createSalesTransaction(totalAmount, formData.payment_type);
            console.log('Financial transaction created for stock out:', totalAmount);
          } catch (financialError) {
            console.error('Failed to create financial transaction:', financialError);
            // Don't show error to user as stock was saved successfully
          }
        }
      }
      
      setShowToast(true);
      closeModal();
      loadData();
    } catch (err) {
      setToastMessage('Gagal menyimpan stok. Coba lagi.');
      setShowToast(true);
      console.error('Stock save error:', err);
    }
  };

  const openActionSheet = (stock: GoodsHistory) => {
    setSelectedStock(stock);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedStock) return;
    
    try {
      await InventoryService.deleteStock(selectedStock.id);
      setToastMessage('Stok berhasil dihapus!');
      setShowToast(true);
      loadData();
    } catch (err) {
      setToastMessage('Gagal menghapus stok. Coba lagi.');
      setShowToast(true);
      console.error('Stock delete error:', err);
    }
    setShowActionSheet(false);
  };

  // Table columns configuration
  const tableColumns = [
    {
      key: 'good.code',
      label: 'Kode',
      width: '12%',
      render: (_: any, row: any) => row.good?.code || '-'
    },
    { 
      key: 'good', 
      label: 'Nama Barang', 
      width: '25%',
      render: (value: any) => value?.name || '-'
    },
    { 
      key: 'location', 
      label: 'Lokasi', 
      width: '20%',
      render: (value: any) => value?.locationname || '-'
    },
    { 
      key: 'stock', 
      label: 'Jumlah', 
      width: '15%',
      render: (value: number) => value.toString()
    },
    {
      key: 'price',
      label: 'Harga',
      width: '15%',
      render: (value: number) => `Rp ${Number(value || 0).toLocaleString()}`
    },
    {
      key: 'total',
      label: 'Total',
      width: '15%',
      render: (_: any, row: any) => `Rp ${Number((row.stock || 0) * (row.price || 0)).toLocaleString()}`
    },
    { 
      key: 'type', 
      label: 'Tipe', 
      width: '15%',
      render: (value: string) => (
        <span className={`status-badge ${value === 'in' ? 'success' : 'danger'}`}>
          {value === 'in' ? 'Masuk' : 'Keluar'}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Tanggal', 
      width: '25%'
    }
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat stok...</p>
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

  return (
    <IonPage>
      <IonContent>
        <Layout title="Kelola Stok" showMenu onRefresh={loadData}>
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Kelola Stok
                </h2>
              </div>
            </div>

            {/* Search Bar - Direct input without container */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari stok, barang, atau lokasi..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            {/* Action Buttons - Above Table */}
            <div className="flex gap-2 mb-4">
              {/* Removed buttons - functionality moved to barang page */}
            </div>

            <div className="section">
              {filteredStocks.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Data Stok</h3>
                  <p className="empty-state-description">Riwayat stok akan muncul di sini.</p>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredStocks}
                  globalSearchTerm={searchTerm}
                  onEdit={openModal}
                  onDelete={openActionSheet}
                  emptyMessage="Tidak ada data stok"
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Stock */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingStock ? 'Edit Stok' : 'Tambah Stok Baru'}
                  </h2>
                  <button 
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barang</label>
                    <select
                      value={formData.idgood}
                      onChange={(e) => setFormData({...formData, idgood: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Pilih barang</option>
                      {goods.map((good) => (
                        <option key={good.id} value={good.id}>
                          {good.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
                    <select
                      value={formData.idlocation}
                      onChange={(e) => setFormData({...formData, idlocation: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Pilih lokasi</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.locationname}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stockText}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) {
                          setStockText(v);
                          setFormData({ ...formData, stock: v === '' ? 0 : Number(v) });
                        }
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as 'in' | 'out'})}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="in">Stok Masuk</option>
                      <option value="out">Stok Keluar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Harga</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceText === '' ? '' : `Rp ${formatCurrencyInput(priceText)}`}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, '');
                        setPriceText(digits);
                        setFormData({ ...formData, price: digits === '' ? 0 : Number(digits) });
                      }}
                      placeholder="Rp 0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!formData.idgood || !formData.idlocation || formData.stock <= 0}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingStock ? 'Perbarui' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button for Stock History (disabled per request)
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={() => history.push('/stock-history-types')}
            className="w-14 h-14 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
            title="Lihat Riwayat Stok"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm1-13V7a1 1 0 10-2 0v2H9a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2z" />
            </svg>
          </button>
        </div>
        */}

        {/* HTML Action Sheet */}
        {showActionSheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify.center z-50">
            <div className="bg-white rounded-t-lg w-full max-w-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Pilih Aksi</h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    if (selectedStock) {
                      openModal(selectedStock);
                    }
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center text-red-600"
                >
                  <svg className="w-5 h-5 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus
                </button>
                <button
                  onClick={() => setShowActionSheet(false)}
                  className="w-full text-center px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

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

export default StockManagement;

