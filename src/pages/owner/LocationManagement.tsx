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
  locationOutline
} from 'ionicons/icons';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import CurrencyInput from '../../components/CurrencyInput';

import { LocationService } from '../../services/locationService';
import { InventoryService } from '../../services/inventoryService';
import { Location, Good, Category, supabase } from '../../lib/supabase';
import { formatCurrencyInput } from '../../lib/utils';

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [locationGoods, setLocationGoods] = useState<Array<{ idgood: string; good_code: string; good_name: string; categoryname: string; total_stock: number }>>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [allGoods, setAllGoods] = useState<Good[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [showEditGoodModal, setShowEditGoodModal] = useState(false);
  const [selectedGoodId, setSelectedGoodId] = useState<string | null>(null);
  const [addExistingForm, setAddExistingForm] = useState<{ idgood: string; stock: number }>({ idgood: '', stock: 0 });
  const [newGoodForm, setNewGoodForm] = useState<{ code: string; name: string; idcategory: string; price: number; stock: number }>({ code: '', name: '', idcategory: '', price: 0, stock: 0 });
  const [editGoodForm, setEditGoodForm] = useState<{ code: string; name: string; idcategory: string; price: number }>({ code: '', name: '', idcategory: '', price: 0 });

  const [newGoodPriceText, setNewGoodPriceText] = useState<string>('0');
  const [newGoodStockText, setNewGoodStockText] = useState<string>('0');

  const [editGoodPriceText, setEditGoodPriceText] = useState<string>('0');
  const [formData, setFormData] = useState({
    locationname: '',
    locationaddress: ''
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await LocationService.getAllLocations();
      setLocations(data);
      setFilteredLocations(data);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data lokasi. Periksa koneksi database.');
      console.error('Location loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilteredLocations(locations);
  };

  const openModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        locationname: location.locationname,
        locationaddress: (location as any).address || ''
      });
    } else {
      setEditingLocation(null);
      setFormData({
        locationname: '',
        locationaddress: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData({
      locationname: '',
      locationaddress: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingLocation) {
        await LocationService.updateLocation(editingLocation.id, formData);
        setToastMessage('Lokasi berhasil diperbarui!');
      } else {
        await LocationService.createLocation(formData);
        setToastMessage('Lokasi berhasil ditambahkan!');
      }

      setShowToast(true);
      closeModal();
      loadLocations();
    } catch (err) {
      setToastMessage('Gagal menyimpan lokasi. Coba lagi.');
      setShowToast(true);
      console.error('Location save error:', err);
    }
  };

  const openActionSheet = (location: Location) => {
    setSelectedLocation(location);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;

    try {
      await LocationService.deleteLocation(selectedLocation.id);
      setToastMessage('Lokasi berhasil dihapus!');
      setShowToast(true);
      loadLocations();
    } catch (err) {
      setToastMessage('Gagal menghapus lokasi. Coba lagi.');
      setShowToast(true);
      console.error('Location delete error:', err);
    }
    setShowActionSheet(false);
  };

  // Table columns configuration with enhanced filtering
  const tableColumns = [
    {
      key: 'locationname',
      label: 'Nama Lokasi',
      width: '35%',
      filterable: true,
      filterConfig: { type: 'text' as const, placeholder: 'Cari nama lokasi...' }
    },
    {
      key: 'address',
      label: 'Alamat',
      width: '40%',
      filterable: true,
      filterConfig: { type: 'text' as const, placeholder: 'Cari alamat...' },
      render: (v: string, row: Location) => (row as any).address || '-'
    },
    {
      key: 'created_at',
      label: 'Dibuat',
      width: '25%',
      filterable: true,
      filterConfig: { type: 'date' as const },
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

  const handleDetail = async (location: Location) => {
    try {
      setSelectedLocation(location);
      const [items, goods, cats] = await Promise.all([
        LocationService.getGoodsAtLocation(location.id),
        InventoryService.getAllGoods(),
        InventoryService.getAllCategories()
      ]);

      setLocationGoods(items);
      setAllGoods(goods);
      setCategories(cats);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Open detail error:', err);
      setToastMessage('Gagal membuka detail lokasi');
      setShowToast(true);
    }
  };

  const reloadLocationGoods = async () => {
    if (!selectedLocation) return;
    const items = await LocationService.getGoodsAtLocation(selectedLocation.id);
    setLocationGoods(items);
  };

  const submitAddExisting = async () => {
    if (!selectedLocation || !addExistingForm.idgood) return;
    try {
      // Create location_stocks record with 0 stock
      const { data, error } = await supabase
        .from('location_stocks')
        .insert([{
          idgood: addExistingForm.idgood,
          idlocation: selectedLocation.id,
          stock: 0
        }]);

      if (error) {
        console.error('Add existing to location error:', error);
        setToastMessage('Gagal menambahkan barang ke lokasi');
        setShowToast(true);
        return;
      }

      setToastMessage('Barang ditambahkan ke lokasi');
      setToastType('success');
      setShowToast(true);
      setShowAddExistingModal(false);
      setAddExistingForm({ idgood: '', stock: 0 });
      await reloadLocationGoods();
    } catch (err) {
      console.error('Add existing to location error:', err);
      setToastMessage('Gagal menambahkan barang ke lokasi');
      setToastType('error');
      setShowToast(true);
    }
  };

  const submitAddNew = async () => {
    if (!selectedLocation || !newGoodForm.code || !newGoodForm.name || !newGoodForm.idcategory) return;
    try {
      // Create the good first
      const { data: goodData, error: goodError } = await supabase
        .from('goods')
        .insert([{
          code: newGoodForm.code,
          name: newGoodForm.name,
          idcategory: newGoodForm.idcategory,
          price: newGoodForm.price,
          damaged_stock: 0
        }])
        .select()
        .single();

      if (goodError) {
        console.error('Create good error:', goodError);
        setToastMessage('Gagal membuat barang baru');
        setToastType('error');
        setShowToast(true);
        return;
      }

      // Create location_stocks record with 0 stock
      const { error: stockError } = await supabase
        .from('location_stocks')
        .insert([{
          idgood: goodData.id,
          idlocation: selectedLocation.id,
          stock: 0
        }]);

      if (stockError) {
        console.error('Create location stock error:', stockError);
        setToastMessage('Gagal menambahkan barang ke lokasi');
        setToastType('error');
        setShowToast(true);
        return;
      }

      setToastMessage('Barang baru dibuat dan ditambahkan');
      setToastType('success');
      setShowToast(true);
      setShowAddNewModal(false);
      setNewGoodForm({ code: '', name: '', idcategory: '', price: 0, stock: 0 });
      const goods = await InventoryService.getAllGoods();
      setAllGoods(goods);
      await reloadLocationGoods();
    } catch (err) {
      console.error('Create new good at location error:', err);
      setToastMessage('Gagal membuat barang baru');
      setToastType('error');
      setShowToast(true);
    }
  };

  const openEditGood = async (row: { idgood: string; good_code: string; good_name: string; categoryname: string; total_stock: number }) => {
    try {
      setSelectedGoodId(row.idgood);
      let existing = allGoods.find(g => g.id === row.idgood);
      if (!existing) {
        const goods = await InventoryService.getAllGoods();
        setAllGoods(goods);
        existing = goods.find(g => g.id === row.idgood) || null as any;
      }
      if (existing) {
        setEditGoodForm({ code: existing.code, name: existing.name, idcategory: existing.idcategory, price: existing.price });
        setEditGoodPriceText(existing.price.toString());
      } else {
        setEditGoodForm({ code: row.good_code, name: row.good_name, idcategory: '', price: 0 });
        setEditGoodPriceText('0');
      }
      if (categories.length === 0) {
        const cats = await InventoryService.getAllCategories();
        setCategories(cats);
      }
      setShowEditGoodModal(true);
    } catch (err) {
      console.error('Open edit good error:', err);
    }
  };

  const submitEditGood = async () => {
    if (!selectedGoodId) return;
    try {
      await InventoryService.updateGood(selectedGoodId, {
        code: editGoodForm.code,
        name: editGoodForm.name,
        idcategory: editGoodForm.idcategory,
        price: editGoodForm.price
      } as any);
      setToastMessage('Barang berhasil diperbarui');
      setToastType('success');
      setShowToast(true);
      setShowEditGoodModal(false);
      const goods = await InventoryService.getAllGoods();
      setAllGoods(goods);
      await reloadLocationGoods();
    } catch (err) {
      console.error('Edit good error:', err);
      setToastMessage('Gagal memperbarui barang');
      setToastType('error');
      setShowToast(true);
    }
  };

  const removeGoodFromLocation = async (row: { idgood: string; total_stock: number }) => {
    if (!selectedLocation) return;
    try {
      // Delete the location_stocks record directly
      const { error } = await supabase
        .from('location_stocks')
        .delete()
        .eq('idgood', row.idgood)
        .eq('idlocation', selectedLocation.id);

      if (error) {
        throw error;
      }

      setToastMessage('Barang dihapus dari lokasi');
      setToastType('success');
      setShowToast(true);
      await reloadLocationGoods();
    } catch (err) {
      console.error('Remove good from location error:', err);
      setToastMessage('Gagal menghapus barang dari lokasi');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <Layout title="Kelola Lokasi" showMenu>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat lokasi...</p>
          </div>
        </Layout>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <Layout title="Kelola Lokasi">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button
              onClick={loadLocations}
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
        <Layout title="Kelola Lokasi" showMenu onRefresh={loadLocations}>
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Kelola Lokasi
                </h2>
              </div>
            </div>

            {/* Search Bar - Direct input without container */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari lokasi atau alamat..."
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
                Tambah Lokasi
              </button>
            </div>

            <div className="section">
              {filteredLocations.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Lokasi</h3>
                  <p className="empty-state-description">
                    Tambahkan lokasi toko pertama Anda untuk memulai.
                  </p>
                  <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Lokasi
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredLocations}
                  globalSearchTerm={searchTerm}
                  onEdit={openModal}
                  onDelete={openActionSheet}
                  onDetail={handleDetail}
                  emptyMessage="Tidak ada lokasi"
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Location */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lokasi</label>
                    <input
                      value={formData.locationname}
                      onChange={(e) => setFormData({ ...formData, locationname: e.target.value })}
                      placeholder="Contoh: Main Shop, Branch 1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                    <textarea
                      value={formData.locationaddress}
                      onChange={(e) => setFormData({ ...formData, locationaddress: e.target.value })}
                      placeholder="Alamat lengkap lokasi"
                      rows={3}
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  >
                    {editingLocation ? 'Perbarui' : 'Simpan'}
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
                  onClick={async () => {
                    if (selectedLocation) {
                      const items = await LocationService.getGoodsAtLocation(selectedLocation.id);
                      setLocationGoods(items);
                      setShowDetailModal(true);
                      setShowActionSheet(false);
                    }
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-700 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Detail
                </button>
                <button
                  onClick={() => {
                    if (selectedLocation) {
                      openModal(selectedLocation);
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

        {/* Detail Modal */}
        {showDetailModal && selectedLocation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Detail Barang di {selectedLocation.locationname}</h2>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={async () => {
                      setAddExistingForm({ idgood: '', stock: 0 });
                      if (allGoods.length === 0) {
                        const goods = await InventoryService.getAllGoods();
                        setAllGoods(goods);
                      }
                      setShowAddExistingModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Tambah Barang ke Lokasi
                  </button>
                  <button
                    onClick={async () => {
                      setNewGoodPriceText('0');
                      setNewGoodStockText('0');
                      setNewGoodForm({ code: '', name: '', idcategory: '', price: 0, stock: 0 });
                      if (categories.length === 0) {
                        const cats = await InventoryService.getAllCategories();
                        setCategories(cats);
                      }
                      setShowAddNewModal(true);
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Barang Baru
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {locationGoods.map((item) => (
                          <tr key={item.idgood}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.good_code}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.good_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.categoryname}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.total_stock}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditGood(item)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit Barang"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => removeGoodFromLocation(item)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                                  title="Hapus dari Lokasi"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {locationGoods.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Tidak ada barang di lokasi ini</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Existing Good Modal */}
        {showAddExistingModal && selectedLocation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Tambah Barang ke {selectedLocation.locationname}</h2>
                  <button onClick={() => setShowAddExistingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Barang</label>
                    <select
                      value={addExistingForm.idgood}
                      onChange={(e) => setAddExistingForm({ ...addExistingForm, idgood: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Pilih barang</option>
                      {allGoods
                        .filter(g => !locationGoods.some(lg => lg.idgood === g.id))
                        .map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                        ))}
                    </select>
                  </div>

                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddExistingModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">Batal</button>
                  <button onClick={submitAddExisting} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50" disabled={!addExistingForm.idgood}>Simpan</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add New Good Modal */}
        {showAddNewModal && selectedLocation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Barang Baru di {selectedLocation.locationname}</h2>
                  <button onClick={() => setShowAddNewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kode</label>
                    <input value={newGoodForm.code} onChange={(e) => setNewGoodForm({ ...newGoodForm, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                    <input value={newGoodForm.name} onChange={(e) => setNewGoodForm({ ...newGoodForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                    <select value={newGoodForm.idcategory} onChange={(e) => setNewGoodForm({ ...newGoodForm, idcategory: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900">
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.categoryname}</option>
                      ))}
                    </select>
                  </div>
                  <CurrencyInput
                    label="Harga"
                    value={newGoodForm.price}
                    onChange={(value) => setNewGoodForm({ ...newGoodForm, price: value })}
                    placeholder="Masukkan harga"
                    required
                  />

                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddNewModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">Batal</button>
                  <button onClick={submitAddNew} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50" disabled={!newGoodForm.code || !newGoodForm.name || !newGoodForm.idcategory}>Simpan</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Good Modal */}
        {showEditGoodModal && selectedGoodId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Edit Barang</h2>
                  <button onClick={() => setShowEditGoodModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kode</label>
                    <input value={editGoodForm.code} onChange={(e) => setEditGoodForm({ ...editGoodForm, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                    <input value={editGoodForm.name} onChange={(e) => setEditGoodForm({ ...editGoodForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                    <select value={editGoodForm.idcategory} onChange={(e) => setEditGoodForm({ ...editGoodForm, idcategory: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900">
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.categoryname}</option>
                      ))}
                    </select>
                  </div>
                  <CurrencyInput
                    label="Harga"
                    value={editGoodForm.price}
                    onChange={(value) => setEditGoodForm({ ...editGoodForm, price: value })}
                    placeholder="Masukkan harga"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowEditGoodModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">Batal</button>
                  <button onClick={submitEditGood} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">Simpan</button>
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
      </IonContent>
    </IonPage>
  );
};

export default LocationManagement;

