import React, { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import CustomToast from '../../components/CustomToast';
import { 
  addOutline, 
  createOutline, 
  trashOutline, 
  warningOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import { DamagedGoodsService } from '../../services/damagedGoodsService';
import { InventoryService } from '../../services/inventoryService';
import { DamagedGood } from '../../services/inventoryService';
import { GoodWithDetails } from '../../lib/supabase';

const DamagedGoodsManagement: React.FC = () => {
  const history = useHistory();
  const [damagedGoods, setDamagedGoods] = useState<DamagedGood[]>([]);
  const [filteredDamagedGoods, setFilteredDamagedGoods] = useState<DamagedGood[]>([]);
  const [goods, setGoods] = useState<GoodWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDamagedGood, setEditingDamagedGood] = useState<DamagedGood | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedDamagedGood, setSelectedDamagedGood] = useState<DamagedGood | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({
    totalDamagedItems: 0,
    totalDamagedStock: 0,
    totalValue: 0
  });

  const [formData, setFormData] = useState({
    idgood: '',
    stock: 0,
    reason: ''
  });
  const [stockText, setStockText] = useState<string>('0');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [damagedData, goodsData, summaryData] = await Promise.all([
        DamagedGoodsService.getAllDamagedGoods(),
        InventoryService.getAllGoodsWithDetails(),
        DamagedGoodsService.getDamagedGoodsSummary()
      ]);

      setDamagedGoods(damagedData);
      setFilteredDamagedGoods(damagedData);
      setGoods(goodsData);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data barang rusak. Periksa koneksi database.');
      console.error('Damaged goods loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilteredDamagedGoods(damagedGoods);
  };

  const openModal = (damagedGood?: DamagedGood) => {
    if (damagedGood) {
      setEditingDamagedGood(damagedGood);
      setFormData({
        idgood: damagedGood.idgood,
        stock: damagedGood.stock,
        reason: damagedGood.reason
      });
      setStockText(String(damagedGood.stock));
    } else {
      setEditingDamagedGood(null);
      setFormData({
        idgood: '',
        stock: 0,
        reason: ''
      });
      setStockText('0');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDamagedGood(null);
    setFormData({
      idgood: '',
      stock: 0,
      reason: ''
    });
    setStockText('0');
  };

  const handleSubmit = async () => {
    if (!formData.idgood || !formData.reason.trim()) {
      setToastMessage('Semua field harus diisi!');
      setShowToast(true);
      return;
    }

    try {
      if (editingDamagedGood) {
        const result = await DamagedGoodsService.updateDamagedGood(editingDamagedGood.id, {
          stock: formData.stock,
          reason: formData.reason
        });
        if (result) {
          setToastMessage('Barang rusak berhasil diperbarui!');
          setToastType('success');
          setShowToast(true);
          closeModal();
          loadData();
        } else {
          setToastMessage('Gagal memperbarui barang rusak. Coba lagi.');
          setToastType('error');
          setShowToast(true);
        }
      } else {
        const result = await DamagedGoodsService.createDamagedGood({
          idgood: formData.idgood,
          stock: formData.stock,
          reason: formData.reason
        });
        if (result) {
          setToastMessage('Barang rusak berhasil ditambahkan!');
          setToastType('success');
          setShowToast(true);
          closeModal();
          loadData();
        } else {
          setToastMessage('Gagal menambahkan barang rusak. Coba lagi.');
          setToastType('error');
          setShowToast(true);
        }
      }
    } catch (err) {
      setToastMessage('Terjadi kesalahan. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Submit error:', err);
    }
  };

  const openActionSheet = (damagedGood: DamagedGood) => {
    setSelectedDamagedGood(damagedGood);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedDamagedGood) return;

    try {
      const success = await DamagedGoodsService.deleteDamagedGood(selectedDamagedGood.id);
      if (success) {
        setToastMessage('Barang rusak berhasil dihapus!');
        setToastType('success');
        setShowToast(true);
        loadData();
      } else {
        setToastMessage('Gagal menghapus barang rusak. Coba lagi.');
        setToastType('error');
        setShowToast(true);
      }
    } catch (err) {
      setToastMessage('Terjadi kesalahan. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Delete error:', err);
    }
    setShowActionSheet(false);
    setSelectedDamagedGood(null);
  };

  // Table columns configuration
  const tableColumns = [
    { 
      key: 'good.name', 
      label: 'Nama Barang', 
      width: '25%',
      sortable: true,
      render: (value: any, row: DamagedGood) => (
        <div>
          <div className="font-medium">{row.good?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{row.good?.code || 'N/A'}</div>
        </div>
      )
    },
    { 
      key: 'stock', 
      label: 'Jumlah Rusak', 
      width: '15%',
      sortable: true,
      render: (value: number) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          {value}
        </span>
      )
    },
    { 
      key: 'reason', 
      label: 'Alasan', 
      width: '30%',
      sortable: true,
      render: (value: string) => value || '-'
    },
    { 
      key: 'created_at', 
      label: 'Tanggal', 
      width: '15%',
      sortable: true,
      render: (value: string) => {
        const date = new Date(value);
        return date.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      width: '15%',
      render: (value: any, row: DamagedGood) => (
        <div className="flex gap-1">
          <button
            onClick={() => openModal(row)}
            className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => openActionSheet(row)}
            className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <Layout title="Kelola Barang Rusak" showMenu onRefresh={loadData}>
            <div className="page-container">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Memuat Data Barang Rusak</h3>
                    <p className="text-gray-600">Mengambil data terbaru dari database...</p>
                  </div>
                </div>
              </div>
            </div>
          </Layout>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonContent>
          <Layout title="Kelola Barang Rusak" showMenu onRefresh={loadData}>
            <div className="page-container">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center py-12">
                  <div className="text-red-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Terjadi Kesalahan</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button 
                    onClick={loadData}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
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
        <Layout title="Kelola Barang Rusak" showMenu onRefresh={loadData}>
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Kelola Barang Rusak
                </h2>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Item Rusak</p>
                    <p className="text-2xl font-bold text-red-600">{summary.totalDamagedItems}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Stok Rusak</p>
                    <p className="text-2xl font-bold text-orange-600">{summary.totalDamagedStock}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Nilai Rusak</p>
                    <p className="text-2xl font-bold text-yellow-600">Rp {summary.totalValue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari barang rusak..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            {/* Action Button - only show when list is not empty to avoid duplicate with empty state */}
            {filteredDamagedGoods.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => openModal()}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Tambah Barang Rusak
                </button>
              </div>
            )}

            <div className="section">
              {filteredDamagedGoods.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Barang Rusak</h3>
                  <p className="empty-state-description">
                    Tambahkan barang rusak pertama Anda untuk memulai.
                  </p>
                  <button 
                    onClick={() => openModal()} 
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Barang Rusak
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredDamagedGoods}
                  globalSearchTerm={searchTerm}
                  onEdit={openModal}
                  onDelete={openActionSheet}
                  emptyMessage="Tidak ada barang rusak"
                  showNumbering={true}
                  itemsPerPage={10}
                  showActions={false}
                />
              )}
            </div>
          </div>
        {/* HTML Modal - Add/Edit Damaged Good */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingDamagedGood ? 'Edit Barang Rusak' : 'Tambah Barang Rusak'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barang *</label>
                    <select
                      value={formData.idgood}
                      onChange={(e) => setFormData({...formData, idgood: e.target.value})}
                      disabled={!!editingDamagedGood}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100"
                    >
                      <option value="">Pilih barang</option>
                      {goods.map((good) => (
                        <option key={good.id} value={good.id}>
                          {good.name} ({good.code}) - Stok: {good.available_stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Rusak *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stockText}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) {
                          setStockText(v);
                          setFormData({...formData, stock: v === '' ? 0 : Number(v)});
                        }
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alasan *</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      placeholder="Jelaskan alasan barang rusak..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
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
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                  >
                    {editingDamagedGood ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <CustomToast
          isOpen={showToast}
          onClose={() => setShowToast(false)}
          message={toastMessage}
          type={toastType}
          duration={3000}
        />

        {showActionSheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
            <div className="bg-white rounded-t-lg w-full max-w-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Pilih Aksi</h3>
              </div>
              <div className="p-2">
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
        </Layout>
      </IonContent>
    </IonPage>
  );
};

export default DamagedGoodsManagement;