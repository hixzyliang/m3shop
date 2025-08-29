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
  gridOutline,
  closeOutline,
  checkmarkOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import Layout from '../../components/Layout';

interface StockHistoryType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const StockHistoryTypes: React.FC = () => {
  const history = useHistory();
  const [types, setTypes] = useState<StockHistoryType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<StockHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<StockHistoryType | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedType, setSelectedType] = useState<StockHistoryType | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockTypes: StockHistoryType[] = [
        {
          id: '1',
          name: 'Pembelian',
          description: 'Stok masuk dari pembelian barang',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Penjualan',
          description: 'Stok keluar karena penjualan',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '3',
          name: 'Retur',
          description: 'Stok masuk dari retur barang',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '4',
          name: 'Hilang/Rusak',
          description: 'Stok keluar karena hilang atau rusak',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];
      
      setTypes(mockTypes);
      setFilteredTypes(mockTypes);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data tipe stok.');
      console.error('Stock history types loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredTypes(types);
    } else {
      const filtered = types.filter(type => 
        type.name.toLowerCase().includes(value.toLowerCase()) ||
        type.description.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTypes(filtered);
    }
  };

  const openModal = (type?: StockHistoryType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description,
        is_active: type.is_active
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingType) {
        // Update existing type
        const updatedTypes = types.map(type => 
          type.id === editingType.id ? { ...type, ...formData } : type
        );
        setTypes(updatedTypes);
        setFilteredTypes(updatedTypes);
        setToastMessage('Tipe stok berhasil diperbarui!');
      } else {
        // Add new type
        const newType: StockHistoryType = {
          id: Date.now().toString(),
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setTypes([newType, ...types]);
        setFilteredTypes([newType, ...filteredTypes]);
        setToastMessage('Tipe stok berhasil ditambahkan!');
      }
      
      setShowToast(true);
      closeModal();
    } catch (err) {
      setToastMessage('Gagal menyimpan tipe stok. Coba lagi.');
      setShowToast(true);
      console.error('Stock history type save error:', err);
    }
  };

  const openActionSheet = (type: StockHistoryType) => {
    setSelectedType(type);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedType) return;
    
    try {
      const updatedTypes = types.filter(type => type.id !== selectedType.id);
      setTypes(updatedTypes);
      setFilteredTypes(updatedTypes);
      setToastMessage('Tipe stok berhasil dihapus!');
      setShowToast(true);
    } catch (err) {
      setToastMessage('Gagal menghapus tipe stok. Coba lagi.');
      setShowToast(true);
      console.error('Stock history type delete error:', err);
    }
    setShowActionSheet(false);
  };

  // Table columns configuration
  const tableColumns = [
    { key: 'name', label: 'Nama Tipe', width: '30%' },
    { key: 'description', label: 'Deskripsi', width: '50%' },
    { key: 'is_active', label: 'Status', width: '20%',
      render: (value: boolean) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value ? 'Aktif' : 'Tidak Aktif'}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <Layout title="Tipe Riwayat Stok">
            <div className="page-container">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Memuat Tipe Stok</h3>
                    <p className="text-gray-600">Mengambil data terbaru...</p>
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
          <Layout title="Tipe Riwayat Stok">
            <div className="page-container">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal Memuat Data</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                      onClick={loadData} 
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center mx-auto"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Coba Lagi
                    </button>
                  </div>
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
        <Layout title="Tipe Riwayat Stok">
          <div className="page-container">
            {/* Header Section with Back Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => history.push('/stock')}
                    className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Kembali ke Stok"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Tipe Riwayat Stok
                  </h2>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari tipe stok..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => openModal()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Tipe
              </button>
            </div>

            <div className="section">
              {filteredTypes.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Tipe Stok</h3>
                  <p className="empty-state-description">
                    Tambahkan tipe stok pertama untuk mengelompokkan transaksi.
                  </p>
                  <button 
                    onClick={() => openModal()} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Tipe
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredTypes}
                  globalSearchTerm={searchTerm}
                  onEdit={openModal}
                  onDelete={openActionSheet}
                  emptyMessage="Tidak ada data tipe stok"
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Stock History Type */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingType ? 'Edit Tipe Stok' : 'Tambah Tipe Stok'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Tipe</label>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Penjualan, Retur, Hilang"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Penjelasan singkat"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="isActive" type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                    disabled={!formData.name.trim()}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HTML Action Sheet */}
        {showActionSheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
            <div className="bg-white rounded-t-lg w-full max-w-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Pilih Aksi</h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    if (selectedType) {
                      openModal(selectedType);
                      setShowActionSheet(false);
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

export default StockHistoryTypes;

