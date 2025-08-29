import React, { useState, useEffect } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
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
  cubeOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';

import { InventoryService, GoodsHistory } from '../../services/inventoryService';
import { LocationService } from '../../services/locationService';
import { FinancialService, FinancialCategory } from '../../services/financialService';
import { GoodWithDetails, Location, Category } from '../../lib/supabase';
import { formatCurrencyInput, parseFormattedCurrency } from '../../lib/utils';

const InventoryManagement: React.FC = () => {
  const history = useHistory();
  const [goods, setGoods] = useState<GoodWithDetails[]>([]);
  const [filteredGoods, setFilteredGoods] = useState<GoodWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGood, setEditingGood] = useState<GoodWithDetails | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedGood, setSelectedGood] = useState<GoodWithDetails | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGoodForDetail, setSelectedGoodForDetail] = useState<GoodWithDetails | null>(null);
  const [goodHistory, setGoodHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showBulkStockInModal, setShowBulkStockInModal] = useState(false);
  const [showBulkStockOutModal, setShowBulkStockOutModal] = useState(false);
  const [selectedGoodForStock, setSelectedGoodForStock] = useState<GoodWithDetails | null>(null);
  const [bulkStockData, setBulkStockData] = useState<Array<{
    id: string;
    goodsId: string;
    code: string;
    name: string;
    currentStock: number;
    quantity: number;
    price: number;
    locationId: string;
    locationName: string;
  }>>([]);
  const [bulkStockType, setBulkStockType] = useState<'in' | 'out'>('in');
  const [bulkPaymentType, setBulkPaymentType] = useState<string>('');
  const [bulkNote, setBulkNote] = useState<string>('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [stockFormData, setStockFormData] = useState({
    stock: 0,
    type: 'in' as 'in' | 'out',
    payment_type: '', // Financial category ID
    price: 0,
    description: '',
    note: ''
  });
  const [stockText, setStockText] = useState<string>('0');
  const [priceText, setPriceText] = useState<string>('0');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    idcategory: '',
    price: 0,
    stock: 0,
    locationId: ''
  });
  const [originalPriceText, setOriginalPriceText] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [stockErrors, setStockErrors] = useState<{[key: string]: string}>({});


  useEffect(() => {
    loadData();
  }, []);

  useIonViewWillEnter(() => {
    loadData();
  });



  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading inventory data...');
      const [goodsData, locationsData, categoriesData, financialCategoriesData] = await Promise.all([
        InventoryService.getAllGoodsWithDetails(),
        LocationService.getAllLocations(),
        InventoryService.getAllCategories(),
        FinancialService.getAllFinancialCategories()
      ]);
      
      console.log('Inventory data loaded:', goodsData.length, 'items');
      setGoods(goodsData);
      setFilteredGoods(goodsData);
      setLocations(locationsData);
      setCategories(categoriesData);
      setFinancialCategories(financialCategoriesData);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data barang. Periksa koneksi database.');
      console.error('Inventory loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredGoods(goods);
    } else {
      const searchLower = value.toLowerCase();
      const filtered = goods.filter(good => {
        // Search by code
        if (good.code?.toLowerCase().includes(searchLower)) return true;
        
        // Search by name
        if (good.name?.toLowerCase().includes(searchLower)) return true;
        
        // Search by category
        if (good.categoryname?.toLowerCase().includes(searchLower)) return true;
        
        // Search by location
        if (good.locationname?.toLowerCase().includes(searchLower)) return true;
        
        // Search by stock (exact number or "stok" keyword)
        if (searchLower.includes('stok') || searchLower.includes('stock')) {
          if (good.stock > 0) return true;
        }
        if (good.stock?.toString().includes(searchLower)) return true;
        
        // Search by price (exact number or "harga" keyword)
        if (searchLower.includes('harga') || searchLower.includes('price')) {
          if (good.price > 0) return true;
        }
        if (good.price?.toString().includes(searchLower)) return true;
        
        // Search by price range (e.g., ">1000", "<5000")
        if (searchLower.startsWith('>') || searchLower.startsWith('<')) {
          const priceStr = searchLower.substring(1);
          const priceNum = parseInt(priceStr.replace(/\D/g, ''));
          if (!isNaN(priceNum)) {
            if (searchLower.startsWith('>') && good.price > priceNum) return true;
            if (searchLower.startsWith('<') && good.price < priceNum) return true;
          }
        }
        
        // Search by stock range (e.g., "stok>10", "stok<50")
        if (searchLower.includes('stok>') || searchLower.includes('stok<')) {
          const stockStr = searchLower.replace('stok', '').replace('>', '').replace('<', '');
          const stockNum = parseInt(stockStr.replace(/\D/g, ''));
          if (!isNaN(stockNum)) {
            if (searchLower.includes('stok>') && good.stock > stockNum) return true;
            if (searchLower.includes('stok<') && good.stock < stockNum) return true;
          }
        }
        
        return false;
      });
      setFilteredGoods(filtered);
    }
  };

  const openModal = (good?: GoodWithDetails) => {
    if (good) {
      setEditingGood(good);
      setFormData({
        code: good.code,
        name: good.name,
        idcategory: good.idcategory,
        price: good.price,
        stock: good.stock,
        locationId: good.idlocation || ''
      });
      setOriginalPriceText(String(good.price ?? 0));
    } else {
      setEditingGood(null);
      setFormData({
        code: '',
        name: '',
        idcategory: '',
        price: 0,
        stock: 0,
        locationId: ''
      });
      setOriginalPriceText('0');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGood(null);
    setFormData({
      code: '',
      name: '',
      idcategory: '',
      price: 0,
      stock: 0,
      locationId: ''
    });
    setOriginalPriceText('0');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Kode barang tidak boleh kosong';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nama barang tidak boleh kosong';
    }
    
    if (!formData.idcategory.trim()) {
      newErrors.idcategory = 'Kategori harus dipilih';
    }
    
    if (!formData.locationId.trim()) {
      newErrors.locationId = 'Lokasi harus dipilih';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setToastMessage('Mohon perbaiki kesalahan pada form');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGood) {
        // For editing, we need to update both goods and location_stocks
        const locationStockId = editingGood.id; // This is location_stocks ID
        const goodsId = (editingGood as any).goodsId; // This is the actual goods ID
        
        // Update the goods table
        await InventoryService.updateGood(goodsId, {
          code: formData.code,
          name: formData.name,
          idcategory: formData.idcategory,
          price: formData.price
        });
        
        // Update the location_stocks table
        await InventoryService.updateLocationStock(locationStockId, {
          stock: formData.stock
        });
        
        setToastMessage('Barang berhasil diperbarui!');
        setToastType('success');
      } else {
        // Set stock to 0 for new goods
        const newGoodData = { ...formData, stock: 0 };
        await InventoryService.createGoodWithInitialStock(newGoodData);
        setToastMessage('Barang berhasil ditambahkan!');
        setToastType('success');
      }
      
      setShowToast(true);
      closeModal();
      loadData();
    } catch (err) {
      setToastMessage('Gagal menyimpan barang. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Good save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionSheet = (good: GoodWithDetails) => {
    setSelectedGood(good);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedGood) return;
    
    try {
      // Delete the location_stocks record (removes the good from this location)
      await InventoryService.deleteLocationStock(selectedGood.id);
      setToastMessage('Barang berhasil dihapus dari lokasi!');
      setToastType('success');
      setShowToast(true);
      loadData();
    } catch (err: any) {
      // Check if it's a foreign key constraint error
      if (err.code === 'FOREIGN_KEY_CONSTRAINT' || err.message === 'Gagal dihapus karena data terpakai') {
        setToastMessage('Gagal dihapus karena data terpakai');
        setToastType('error');
      } else {
        setToastMessage('Gagal menghapus barang dari lokasi. Coba lagi.');
        setToastType('error');
      }
      setShowToast(true);
      console.error('Good delete error:', err);
    }
    setShowActionSheet(false);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { text: 'Habis', color: 'danger' };
    } else if (stock <= 10) {
      return { text: 'Hampir Habis', color: 'warning' };
    } else {
      return { text: 'Tersedia', color: 'success' };
    }
  };

  // Small UX improvement: row click to quick edit
  const handleRowEdit = (good: GoodWithDetails) => {
    openModal(good);
  };

  // Table columns configuration
  const tableColumns = [
    { 
      key: 'code', 
      label: 'Kode', 
      width: '12%'
    },
    { 
      key: 'name', 
      label: 'Nama Barang', 
      width: '20%',
      render: (value: string) => {
        if (!value) return '-';
        if (value.length > 30) {
          return (
            <div className="max-w-xs">
              <span className="truncate block" title={value}>
                {value.substring(0, 30)}...
              </span>
            </div>
          );
        }
        return value;
      }
    },
    { 
      key: 'categoryname', 
      label: 'Kategori', 
      width: '15%',
      render: (value: string) => {
        if (!value) return '-';
        if (value.length > 20) {
          return (
            <div className="max-w-xs">
              <span className="truncate block" title={value}>
                {value.substring(0, 20)}...
              </span>
            </div>
          );
        }
        return value;
      }
    },
    { 
      key: 'locationname', 
      label: 'Lokasi', 
      width: '15%',
      render: (value: string) => {
        if (!value) return 'Tidak ada lokasi';
        if (value.length > 20) {
          return (
            <div className="max-w-xs">
              <span className="truncate block" title={value}>
                {value.substring(0, 20)}...
              </span>
            </div>
          );
        }
        return value;
      }
    },
    { 
      key: 'stock', 
      label: 'Stok di Lokasi', 
      width: '12%',
      render: (value: number) => value.toString()
    },
    { 
      key: 'price', 
      label: 'Harga', 
      width: '15%',
      render: (value: number) => `Rp ${value.toLocaleString()}`
    },
    {
      key: 'created_at',
      label: 'Dibuat',
      width: '13%'
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      width: '15%',
      render: (value: any, row: GoodWithDetails) => (
        <div className="flex gap-1">
          <button
            onClick={() => openStockInModal(row)}
            className="p-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
            title="Barang Masuk"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={() => openStockOutModal(row)}
            className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            title="Barang Keluar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => openDetailModal(row)}
            className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            title="Lihat Detail"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  const openDetailModal = async (good: GoodWithDetails) => {
    setSelectedGoodForDetail(good);
    setShowDetailModal(true);
    setLoadingHistory(true);
    
    try {
      const history = await InventoryService.getGoodsHistoryByGood(good.id);
      setGoodHistory(history);
    } catch (error) {
      console.error('Failed to load good history:', error);
      setGoodHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGoodForDetail(null);
    setGoodHistory([]);
  };

  const openStockInModal = (good: GoodWithDetails) => {
    setSelectedGoodForStock(good);
    setStockFormData({
      stock: 0,
      type: 'in',
      payment_type: '',
      price: good.price,
      description: '',
      note: ''
    });
    setStockText('0');
    setPriceText(String(good.price));
    setShowStockInModal(true);
  };

  const openStockOutModal = (good: GoodWithDetails) => {
    setSelectedGoodForStock(good);
    setStockFormData({
      stock: 0,
      type: 'out',
      payment_type: '',
      price: good.price,
      description: '',
      note: ''
    });
    setStockText('0');
    setPriceText(String(good.price));
    setShowStockOutModal(true);
  };

  const closeStockModal = () => {
    setShowStockInModal(false);
    setShowStockOutModal(false);
    setSelectedGoodForStock(null);
    setStockFormData({
      stock: 0,
      type: 'in',
      payment_type: '',
      price: 0,
      description: '',
      note: ''
    });
    setStockText('0');
    setPriceText('0');
    setStockErrors({});
  };

  const openBulkStockModal = (type: 'in' | 'out') => {
    setBulkStockType(type);
    setBulkPaymentType('');
    setBulkNote('');
    setIsBulkSubmitting(false);
    
    // Prepare bulk data from current goods with unique keys
    const bulkData = goods.map((good, index) => ({
      id: `${good.goodsId}-${good.idlocation}-${index}`, // Unique key combining goodsId, locationId, and index
      goodsId: good.goodsId, // Keep original goodsId for processing
      code: good.code,
      name: good.name,
      currentStock: good.stock,
      quantity: 0,
      price: good.price || 0,
      locationId: good.idlocation,
      locationName: good.locationname
    }));
    
    setBulkStockData(bulkData);
    
    if (type === 'in') {
      setShowBulkStockInModal(true);
    } else {
      setShowBulkStockOutModal(true);
    }
  };

  const closeBulkStockModal = () => {
    setShowBulkStockInModal(false);
    setShowBulkStockOutModal(false);
    setBulkStockData([]);
    setBulkPaymentType('');
    setBulkNote('');
    setIsBulkSubmitting(false);
  };

  const updateBulkQuantity = (id: string, quantity: number) => {
    setBulkStockData(prev => prev.map(item => {
      if (item.id === id) {
        // Validate stock for stock out
        if (bulkStockType === 'out' && quantity > item.currentStock) {
          setToastMessage(`Jumlah barang keluar tidak bisa lebih dari stok (${item.currentStock})`);
          setToastType('error');
          setShowToast(true);
          return item; // Keep current quantity
        }
        return { ...item, quantity: Math.max(0, quantity) };
      }
      return item;
    }));
  };

  const handleBulkStockSubmit = async () => {
    if (bulkStockData.length === 0) return;
    
    // Filter items with quantity > 0
    const itemsToProcess = bulkStockData.filter(item => item.quantity > 0);
    
    if (itemsToProcess.length === 0) {
      setToastMessage('Pilih minimal satu barang dengan jumlah lebih dari 0');
      setToastType('error');
      setShowToast(true);
      return;
    }

    // Validate stock for stock out
    if (bulkStockType === 'out') {
      const invalidItems = itemsToProcess.filter(item => item.quantity > item.currentStock);
      if (invalidItems.length > 0) {
        const itemNames = invalidItems.map(item => `${item.name} (stok: ${item.currentStock})`).join(', ');
        setToastMessage(`Jumlah barang keluar melebihi stok: ${itemNames}`);
        setToastType('error');
        setShowToast(true);
        return;
      }
    }

    if (!bulkPaymentType) {
      setToastMessage('Pilih metode pembayaran');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsBulkSubmitting(true);
    
    try {
      const result = await FinancialService.processBulkStockTransaction({
        items: itemsToProcess.map(item => ({
          idgood: item.goodsId,
          idlocation: item.locationId,
          quantity: item.quantity,
          price: item.price,
          goodName: item.name
        })),
        type: bulkStockType,
        payment_type: bulkPaymentType,
        note: bulkNote
      });
      
      if (result.success) {
        setToastMessage(`Berhasil memproses ${itemsToProcess.length} barang dalam satu transaksi`);
        setToastType('success');
        setShowToast(true);
        closeBulkStockModal();
        loadData(); // Reload data
      } else {
        setToastMessage(result.message || 'Gagal memproses bulk transaksi');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Terjadi kesalahan saat memproses bulk stock';
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const validateStockForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (stockFormData.stock <= 0) {
      newErrors.stock = 'Jumlah stok harus lebih dari 0';
    }
    
    if (stockFormData.price <= 0) {
      newErrors.price = 'Harga harus lebih dari 0';
    }

    // Validate stock for stock out
    if (stockFormData.type === 'out' && selectedGoodForStock) {
      const currentStock = selectedGoodForStock.stock || 0;
      if (stockFormData.stock > currentStock) {
        newErrors.stock = `Jumlah barang keluar tidak bisa lebih dari stok (${currentStock})`;
      }
    }
    
    setStockErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStockSubmit = async () => {
    if (!selectedGoodForStock) return;
    
    if (!validateStockForm()) {
      setToastMessage('Mohon perbaiki kesalahan pada form');
      setToastType('error');
      setShowToast(true);
      return;
    }

    // Validate primary wallet exists
    try {
      const { FinancialService } = await import('../../services/financialService');
      const primaryId = await FinancialService.getPrimaryWalletId();
      if (!primaryId) {
        setToastMessage('Tidak dapat melanjutkan: dompet utama belum dipilih. Setel dompet utama di halaman Dompet.');
        setToastType('error');
        setShowToast(true);
        return;
      }
    } catch {}
    
    setIsStockSubmitting(true);
    try {
      const success = await InventoryService.createStockTransaction({
        idgood: (selectedGoodForStock as any).goodsId || selectedGoodForStock.id,
        idlocation: selectedGoodForStock.idlocation || locations[0]?.id,
        stock: stockFormData.stock,
        type: stockFormData.type,
        payment_type: stockFormData.payment_type,
        price: stockFormData.price,
        description: stockFormData.type === 'in' ? 'Barang Masuk' : 'Barang Keluar',
        note: stockFormData.note
      });

      if (success) {
        setToastMessage(`Stok ${stockFormData.type === 'in' ? 'masuk' : 'keluar'} berhasil ditambahkan!`);
        setToastType('success');
        setShowToast(true);
        setShowStockInModal(false);
        setShowStockOutModal(false);
        setSelectedGoodForStock(null);
        setStockFormData({
          stock: 0,
          type: 'in',
          payment_type: '',
          price: 0,
          description: '',
          note: ''
        });
        setStockText('0');
        setPriceText('0');
        loadData(); // Refresh the data to show updated stock
      } else {
        setToastMessage('Gagal menambahkan stok. Periksa data dan coba lagi.');
        setToastType('error');
        setShowToast(true);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Gagal menyimpan stok. Coba lagi.';
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
      console.error('Stock save error:', err);
    } finally {
      setIsStockSubmitting(false);
    }
  };



  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <Layout title="Kelola Barang" showMenu onRefresh={loadData}>
            <div className="page-container">
              {/* Header Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Kelola Barang
                  </h2>
                </div>
              </div>

              {/* Loading State */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Memuat Data Barang</h3>
                    <p className="text-gray-600">Mengambil data terbaru dari database...</p>
                  </div>
                </div>
                
                {/* Skeleton Loading */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                      </div>
                    </div>
                  ))}
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
          <Layout title="Kelola Barang" showMenu>
            <div className="page-container">
              {/* Header Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Kelola Barang
                  </h2>
                </div>
              </div>

              {/* Error State */}
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
        <Layout title="Kelola Barang" showMenu onRefresh={loadData}>
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Kelola Barang
                </h2>
              </div>
            </div>

            {/* Search Bar - Direct input without container */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari kode, nama, kategori, lokasi, stok per lokasi, harga (contoh: >1000, stok>10)..."
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
                Tambah Barang
              </button>
              <button
                onClick={() => history.push('/stock-history-types')}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Keterangan Stok
              </button>
            </div>

            <div className="section">
              {filteredGoods.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Barang</h3>
                  <p className="empty-state-description">
                    Tambahkan barang pertama Anda untuk memulai.
                  </p>
                  <button 
                    onClick={() => openModal()} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Barang
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredGoods}
                  globalSearchTerm={searchTerm}
                  onEdit={openModal}
                  onDelete={openActionSheet}
                  emptyMessage="Tidak ada barang"
                  showNumbering={true}
                  itemsPerPage={10}
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Good */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingGood ? 'Edit Barang' : 'Tambah Barang Baru'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kode Barang</label>
                    <input
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      placeholder="Kode unik barang"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        errors.code 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.code && (
                      <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Barang</label>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nama barang"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        errors.name 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                    <select
                      value={formData.idcategory}
                      onChange={(e) => setFormData({...formData, idcategory: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        errors.idcategory 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.categoryname}
                        </option>
                      ))}
                    </select>
                    {errors.idcategory && (
                      <p className="mt-1 text-sm text-red-600">{errors.idcategory}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
                    <select
                      value={formData.locationId}
                      onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        errors.locationId 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Pilih lokasi</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.locationname}
                        </option>
                      ))}
                    </select>
                    {errors.locationId && (
                      <p className="mt-1 text-sm text-red-600">{errors.locationId}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Harga (Rp)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={originalPriceText === '' ? '' : `Rp ${formatCurrencyInput(originalPriceText)}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        const digits = v.replace(/\D/g, '');
                        if (digits === '' || /^\d+$/.test(digits)) {
                          setOriginalPriceText(digits);
                          setFormData({ ...formData, price: digits === '' ? 0 : Number(digits) });
                        }
                      }}
                      placeholder="0"
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      editingGood ? 'Perbarui' : 'Simpan'
                    )}
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
                    if (selectedGood) {
                      openModal(selectedGood);
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

        {/* HTML Detail Modal */}
        {showDetailModal && selectedGoodForDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Detail Barang: {selectedGoodForDetail.name}
                  </h2>
                  <button 
                    onClick={closeDetailModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode Barang</label>
                    <input value={selectedGoodForDetail.code} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
                    <input value={selectedGoodForDetail.name} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                    <input value={selectedGoodForDetail.categoryname || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                    <input value={selectedGoodForDetail.locationname || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                    <input value={`Rp ${selectedGoodForDetail.price.toLocaleString('id-ID')}`} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stok Tersedia</label>
                    <input value={String(selectedGoodForDetail.stock)} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-4">Riwayat Stok</h3>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <IonSpinner name="crescent" />
                  </div>
                ) : goodHistory.length === 0 ? (
                  <p className="text-gray-600">Tidak ada riwayat stok untuk barang ini.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tanggal
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipe
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lokasi
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {goodHistory.map((history, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(history.created_at).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                history.type === 'in' || history.type === 'initial' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {history.type === 'in' ? 'Masuk' : 
                                 history.type === 'out' ? 'Keluar' : 
                                 history.type === 'initial' ? 'Awal' : 'Penyesuaian'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {history.location?.locationname || 'Tidak ada lokasi'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {history.stock}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HTML Stock In Modal */}
        {showStockInModal && selectedGoodForStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Barang Masuk: {selectedGoodForStock.name}
                  </h2>
                  <button 
                    onClick={closeStockModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Stock Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Informasi Stok</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">{selectedGoodForStock.locationname || 'Lokasi Utama'}:</span>
                        <span className="font-medium text-blue-800">{selectedGoodForStock.stock || 0} unit</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Barang Masuk</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stockText === '0' ? '' : stockText}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) {
                          setStockText(v);
                          setStockFormData({ ...stockFormData, stock: v === '' ? 0 : Number(v) });
                        }
                      }}
                      placeholder="0"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        stockErrors.stock 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {stockErrors.stock && (
                      <p className="mt-1 text-sm text-red-600">{stockErrors.stock}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Harga (Rp)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceText === '' ? '' : `Rp ${formatCurrencyInput(priceText)}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        const digits = v.replace(/\D/g, '');
                        if (digits === '' || /^\d+$/.test(digits)) {
                          setPriceText(digits);
                          setStockFormData({ ...stockFormData, price: digits === '' ? 0 : Number(digits) });
                        }
                      }}
                      placeholder="0"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        stockErrors.price 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {stockErrors.price && (
                      <p className="mt-1 text-sm text-red-600">{stockErrors.price}</p>
                    )}
                  </div>

                  {/* Removed wallet selection; will use primary wallet automatically */}

                  {/* Removed description input; will auto-use 'Barang Masuk' */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Tambahan</label>
                    <input
                      type="text"
                      value={stockFormData.note}
                      onChange={(e) => setStockFormData({ ...stockFormData, note: e.target.value })}
                      placeholder="Opsional: catatan tambahan"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={closeStockModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleStockSubmit}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={isStockSubmitting}
                  >
                    {isStockSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HTML Stock Out Modal */}
        {showStockOutModal && selectedGoodForStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Barang Keluar: {selectedGoodForStock.name}
                  </h2>
                  <button 
                    onClick={closeStockModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Stock Info */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-orange-800 mb-2">Informasi Stok</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">{selectedGoodForStock.locationname || 'Lokasi Utama'}:</span>
                        <span className={`font-medium ${(selectedGoodForStock.stock || 0) <= 10 ? 'text-red-600' : 'text-orange-800'}`}>
                          {selectedGoodForStock.stock || 0} unit
                          {(selectedGoodForStock.stock || 0) <= 10 && <span className="ml-1 text-xs">(Stok menipis!)</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Barang Keluar</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stockText === '0' ? '' : stockText}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) {
                          setStockText(v);
                          setStockFormData({ ...stockFormData, stock: v === '' ? 0 : Number(v) });
                        }
                      }}
                      placeholder="0"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        stockErrors.stock 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {stockErrors.stock && (
                      <p className="mt-1 text-sm text-red-600">{stockErrors.stock}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Harga (Rp)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceText === '' ? '' : `Rp ${formatCurrencyInput(priceText)}`}
                      readOnly
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                    />
                  </div>

                  {/* Removed wallet selection; will use primary wallet automatically */}

                  {false && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan *</label>
                      <input
                        type="text"
                        value={stockFormData.description}
                        onChange={(e) => setStockFormData({ ...stockFormData, description: e.target.value })}
                        placeholder="Contoh: Penjualan, Pengeluaran, dll"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Tambahan</label>
                    <input
                      type="text"
                      value={stockFormData.note}
                      onChange={(e) => setStockFormData({ ...stockFormData, note: e.target.value })}
                      placeholder="Opsional: catatan tambahan"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={closeStockModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleStockSubmit}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={isStockSubmitting}
                  >
                    {isStockSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          {/* Bulk Stock In Button */}
          <button
            onClick={() => openBulkStockModal('in')}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            title="Bulk Barang Masuk"
          >
            <span className="text-xs">Masuk</span>
          </button>
          
          {/* Bulk Stock Out Button */}
          <button
            onClick={() => openBulkStockModal('out')}
            className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            title="Bulk Barang Keluar"
          >
            <span className="text-xs">Keluar</span>
          </button>
        </div>

        {/* Bulk Stock Modal */}
        {(showBulkStockInModal || showBulkStockOutModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">
                    Bulk Barang {bulkStockType === 'in' ? 'Masuk' : 'Keluar'}
                  </h2>
                  <button 
                    onClick={closeBulkStockModal} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metode Pembayaran
                    </label>
                    <select 
                      value={bulkPaymentType} 
                      onChange={(e) => setBulkPaymentType(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Pilih metode pembayaran</option>
                      {financialCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan (Opsional)
                    </label>
                    <input 
                      type="text" 
                      value={bulkNote} 
                      onChange={(e) => setBulkNote(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" 
                      placeholder="Catatan untuk semua barang"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Daftar Barang ({bulkStockData.filter(item => item.quantity > 0).length} dipilih)
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-white border-b border-gray-200">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stok Saat Ini</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah {bulkStockType === 'in' ? 'Masuk' : 'Keluar'}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkStockData.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.code}</td>
                            <td className="px-3 py-2 max-w-xs">
                              <span className="truncate block text-sm text-gray-800" title={item.name}>
                                {item.name}
                              </span>
                            </td>
                            <td className="px-3 py-2 max-w-xs">
                              <span className="truncate block text-sm text-gray-600" title={item.locationName}>
                                {item.locationName}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">{item.currentStock}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => updateBulkQuantity(item.id, Math.max(0, item.quantity - 10))}
                                  className="w-8 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold transition-colors"
                                  disabled={item.quantity <= 0}
                                  title="-10"
                                >
                                  -10
                                </button>
                                <button
                                  onClick={() => updateBulkQuantity(item.id, Math.max(0, item.quantity - 1))}
                                  className="w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded flex items-center justify-center text-xs font-bold transition-colors"
                                  disabled={item.quantity <= 0}
                                >
                                  -
                                </button>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={item.quantity === 0 ? '' : item.quantity} 
                                  onChange={(e) => updateBulkQuantity(item.id, Math.max(0, Number(e.target.value) || 0))} 
                                  className="w-16 px-1 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" 
                                  placeholder="0"
                                />
                                <button
                                  onClick={() => updateBulkQuantity(item.id, item.quantity + 1)}
                                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold transition-colors"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => updateBulkQuantity(item.id, item.quantity + 10)}
                                  className="w-8 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-bold transition-colors"
                                  title="+10"
                                >
                                  +10
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              Rp {Number(item.price).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={closeBulkStockModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleBulkStockSubmit}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={isBulkSubmitting || bulkStockData.filter(item => item.quantity > 0).length === 0}
                  >
                    {isBulkSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      `Simpan ${bulkStockType === 'in' ? 'Masuk' : 'Keluar'}`
                    )}
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
      </IonContent>
    </IonPage>
  );
};

export default InventoryManagement;

