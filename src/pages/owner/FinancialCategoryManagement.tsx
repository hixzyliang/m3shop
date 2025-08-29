import React, { useState, useEffect } from 'react';
import { 
  IonPage, 
  IonSpinner,
  IonContent
} from '@ionic/react';
import CustomToast from '../../components/CustomToast';
import { 
  addOutline, 
  createOutline, 
  trashOutline, 
  walletOutline,
  checkmarkOutline,
  closeOutline
} from 'ionicons/icons';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import { FinancialService, FinancialCategory } from '../../services/financialService';

const FinancialCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FinancialCategory | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryBalances, setCategoryBalances] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: 'wallet',
    is_primary: false,
    is_change: false
  });

  // Predefined icons for selection
  const availableIcons = [
    { value: 'wallet', label: 'Wallet', icon: '💳' },
    { value: 'cash', label: 'Cash', icon: '💰' },
    { value: 'bank', label: 'Bank', icon: '🏦' },
    { value: 'digital', label: 'Digital', icon: '📱' },
    { value: 'savings', label: 'Savings', icon: '🏠' },
    { value: 'investment', label: 'Investment', icon: '📈' },
    { value: 'gift', label: 'Gift', icon: '🎁' },
    { value: 'business', label: 'Business', icon: '💼' }
  ];

  // Predefined colors for selection
  const availableColors = [
    { value: '#3B82F6', label: 'Blue', bg: 'bg-blue-500' },
    { value: '#10B981', label: 'Green', bg: 'bg-green-500' },
    { value: '#F59E0B', label: 'Yellow', bg: 'bg-yellow-500' },
    { value: '#EF4444', label: 'Red', bg: 'bg-red-500' },
    { value: '#8B5CF6', label: 'Purple', bg: 'bg-purple-500' },
    { value: '#F97316', label: 'Orange', bg: 'bg-orange-500' },
    { value: '#06B6D4', label: 'Cyan', bg: 'bg-cyan-500' },
    { value: '#84CC16', label: 'Lime', bg: 'bg-lime-500' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await FinancialService.getAllFinancialCategories();
      setCategories(data);
      
      // Load balances for each category
      const balances: Record<string, number> = {};
      for (const category of data) {
        const balance = await FinancialService.getCashBalance(category.id);
        balances[category.id] = balance;
      }
      setCategoryBalances(balances);
      
      setError('');
    } catch (err) {
      setError('Gagal memuat kategori keuangan. Periksa koneksi database.');
      console.error('Financial categories loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      color: '#3B82F6',
      icon: 'wallet',
      is_primary: false,
      is_change: false
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      color: '#3B82F6',
      icon: 'wallet',
      is_primary: false,
      is_change: false
    });
  };

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon,
      is_primary: !!(category as any).is_primary,
      is_change: !!(category as any).is_change
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await FinancialService.updateFinancialCategory(editingCategory.id, formData as any);
        setToastMessage('Kategori berhasil diperbarui!');
        setToastType('success');
      } else {
        await FinancialService.createFinancialCategory(formData as any);
        setToastMessage('Kategori berhasil ditambahkan!');
        setToastType('success');
      }
      
      setShowToast(true);
      closeModal();
      loadCategories();
    } catch (err) {
      setToastMessage('Gagal menyimpan kategori. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Category save error:', err);
    }
  };

  const openActionSheet = (category: FinancialCategory) => {
    setSelectedCategory(category);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      await FinancialService.deleteFinancialCategory(selectedCategory.id);
      setToastMessage('Kategori berhasil dihapus!');
      setToastType('success');
      setShowToast(true);
      loadCategories();
    } catch (err) {
      setToastMessage('Gagal menghapus kategori. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Category delete error:', err);
    }
    setShowActionSheet(false);
  };

  // Table columns configuration
  const tableColumns = [
    { 
      key: 'name', 
      label: 'Nama Kategori', 
      width: '25%',
      render: (value: string, row: FinancialCategory) => (
        <div className="flex items-center">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white text-sm font-medium"
            style={{ backgroundColor: row.color }}
          >
            {availableIcons.find(icon => icon.value === row.icon)?.icon || '💰'}
          </div>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'balance',
      label: 'Total Duit',
      width: '20%',
      render: (value: any, row: FinancialCategory) => {
        const balance = categoryBalances[row.id] || 0;
        const isPositive = balance >= 0;
        return (
          <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            Rp {Math.abs(balance).toLocaleString()}
            {!isPositive && ' (-)'}
          </span>
        );
      }
    },
    { 
      key: 'color', 
      label: 'Warna', 
      width: '15%',
      render: (value: string) => (
        <div className="flex items-center">
          <div 
            className="w-6 h-6 rounded-full mr-2 border border-gray-300"
            style={{ backgroundColor: value }}
          ></div>
          <span className="text-sm text-gray-600">{value}</span>
        </div>
      )
    },
    { 
      key: 'icon', 
      label: 'Ikon', 
      width: '15%',
      render: (value: string) => (
        <div className="flex items-center">
          <span className="text-2xl mr-2">
            {availableIcons.find(icon => icon.value === value)?.icon || '💰'}
          </span>
          <span className="text-sm text-gray-600">
            {availableIcons.find(icon => icon.value === value)?.label || value}
          </span>
        </div>
      )
    },
    {
      key: 'is_primary',
      label: 'Utama',
      width: '10%',
      render: (value: boolean) => (
        value ? (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Ya
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      key: 'is_change',
      label: 'Kembalian',
      width: '10%',
      render: (value: boolean) => (
        value ? (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Ya
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    { 
      key: 'created_at', 
      label: 'Dibuat', 
      width: '15%',
      render: (value: string) => {
        const date = new Date(value);
        return date.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    }
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat dompet...</p>
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
              onClick={loadCategories} 
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
        <Layout title="Dompet" showMenu onRefresh={loadCategories}>
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Dompet
                </h2>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari dompet..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={openModal}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Dompet
              </button>
            </div>

            <div className="section">
              {categories.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Kategori</h3>
                  <p className="empty-state-description">
                    Tambahkan dompet pertama untuk mengelola tipe uang yang berbeda.
                  </p>
                  <button 
                    onClick={openModal} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Dompet
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={categories}
                  globalSearchTerm={searchTerm}
                  onEdit={handleEdit}
                  onDelete={openActionSheet}
                  emptyMessage="Tidak ada kategori yang ditemukan"
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Category */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kategori</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Contoh: Uang Tunai, Digital, Tabungan"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warna</label>
                    <div className="grid grid-cols-4 gap-2">
                      {availableColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({...formData, color: color.value})}
                          className={`w-12 h-12 rounded-lg border-2 transition-all ${
                            formData.color === color.value 
                              ? 'border-gray-900 scale-110' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ikon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {availableIcons.map((icon) => (
                        <button
                          key={icon.value}
                          type="button"
                          onClick={() => setFormData({...formData, icon: icon.value})}
                          className={`w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center text-xl ${
                            formData.icon === icon.value 
                              ? 'border-blue-500 bg-blue-50 scale-110' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          title={icon.label}
                        >
                          {icon.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isPrimary"
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrimary" className="text-sm text-gray-700">Jadikan dompet utama</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isChange"
                    type="checkbox"
                    checked={formData.is_change}
                    onChange={(e) => setFormData({ ...formData, is_change: e.target.checked })}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isChange" className="text-sm text-gray-700">Jadikan dompet kembalian</label>
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
                    disabled={!formData.name.trim()}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingCategory ? 'Perbarui' : 'Simpan'}
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
                    if (selectedCategory) {
                      handleEdit(selectedCategory);
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

        <CustomToast
          isOpen={showToast}
          onClose={() => setShowToast(false)}
          message={toastMessage}
          type={toastType}
          duration={3000}
        />
      </IonContent>
    </IonPage>
  );
};

export default FinancialCategoryManagement;