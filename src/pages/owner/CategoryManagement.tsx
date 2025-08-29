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
  checkmarkOutline
} from 'ionicons/icons';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';

import { InventoryService } from '../../services/inventoryService';
import { Category } from '../../lib/supabase';

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    categoryname: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await InventoryService.getAllCategories();
      setCategories(data);
      setFilteredCategories(data);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data kategori. Periksa koneksi database.');
      console.error('Category loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilteredCategories(categories);
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        categoryname: category.categoryname
      });
    } else {
      setEditingCategory(null);
      setFormData({
        categoryname: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      categoryname: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await InventoryService.updateCategory(editingCategory.id, formData);
        setToastMessage('Kategori berhasil diperbarui!');
      } else {
        await InventoryService.createCategory(formData);
        setToastMessage('Kategori berhasil ditambahkan!');
      }
      
      setShowToast(true);
      closeModal();
      loadCategories();
    } catch (err) {
      setToastMessage('Gagal menyimpan kategori. Coba lagi.');
      setShowToast(true);
      console.error('Category save error:', err);
    }
  };

  const openActionSheet = (category: Category) => {
    setSelectedCategory(category);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      await InventoryService.deleteCategory(selectedCategory.id);
      setToastMessage('Kategori berhasil dihapus!');
      setShowToast(true);
      loadCategories();
    } catch (err) {
      setToastMessage('Gagal menghapus kategori. Coba lagi.');
      setShowToast(true);
      console.error('Category delete error:', err);
    }
    setShowActionSheet(false);
  };

  // Table columns configuration
  const tableColumns = [
    { key: 'categoryname', label: 'Nama Kategori', width: '60%' },
    { key: 'created_at', label: 'Dibuat', width: '40%' }
  ];

  if (loading) {
    return (
      <IonPage>
        <Layout title="Kelola Kategori" showMenu>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat kategori...</p>
          </div>
        </Layout>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <Layout title="Kelola Kategori">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button 
              onClick={loadCategories} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </Layout>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <Layout title="Kelola Kategori">
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Kelola Kategori
                </h2>
              </div>
            </div>

            {/* Search Bar - Direct input without container */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari kategori..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            {/* Action Buttons - Above Table */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => openModal()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Kategori
              </button>
            </div>

            <div className="section">
              {filteredCategories.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Kategori</h3>
                  <p className="empty-state-description">
                    Tambahkan kategori pertama untuk mengelompokkan produk.
                  </p>
                  <button 
                    onClick={() => openModal()} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Kategori
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredCategories}
                  globalSearchTerm={searchTerm}
                  onEdit={openModal}
                  onDelete={openActionSheet}
                  emptyMessage="Tidak ada kategori"
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Category */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w/full">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                      value={formData.categoryname}
                      onChange={(e) => setFormData({...formData, categoryname: e.target.value})}
                      placeholder="Contoh: Snacks, Drinks, Electronics"
                      required
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
                    disabled={!formData.categoryname.trim()}
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
                      openModal(selectedCategory);
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

export default CategoryManagement;

