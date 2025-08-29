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
  walletOutline,
  checkmarkOutline,
  closeOutline,
  trendingUpOutline,
  trendingDownOutline
} from 'ionicons/icons';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import CurrencyInput from '../../components/CurrencyInput';

import { FinancialService, FinancialCategory, EnhancedTransaction } from '../../services/financialService';
import { Transaction, TransactionDescription } from '../../lib/supabase';
import { formatCurrencyInput, parseFormattedCurrency } from '../../lib/utils';

const FinancialBookkeeping: React.FC = () => {
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<EnhancedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EnhancedTransaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<EnhancedTransaction | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [descriptions, setDescriptions] = useState<TransactionDescription[]>([]);
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
  const [showDescModal, setShowDescModal] = useState(false);
  const [descForm, setDescForm] = useState<{ descriptionname: string; type: 'in' | 'out' }>({ descriptionname: '', type: 'in' });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<EnhancedTransaction | null>(null);
  const [transactionGoods, setTransactionGoods] = useState<Array<{
    idgood: string;
    good_code: string;
    good_name: string;
    category_name: string;
    location_name: string;
    stock: number;
    price: number;
    total_price: number;
    type: string;
    description: string;
    note?: string;
  }>>([]);
  const [loadingGoods, setLoadingGoods] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [formData, setFormData] = useState({
    type: 'in' as 'in' | 'out',
    total: 0,
    id_description: '' as string | null,
    note: '',
    payment_type: '' // Will store financial category ID
  });
  const [totalText, setTotalText] = useState<string>('0');
  const [financialSummary, setFinancialSummary] = useState<Record<string, number>>({});
  const [cashBalance, setCashBalance] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const init = async () => {
      await loadTransactions();
      const [desc, categories] = await Promise.all([
        FinancialService.getAllTransactionDescriptions(),
        FinancialService.getAllFinancialCategories()
      ]);
      setDescriptions(desc);
      setFinancialCategories(categories);
    };
    init();
  }, []);

  useIonViewWillEnter(() => {
    loadTransactions();
  });

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const [data, summary] = await Promise.all([
        FinancialService.getAllTransactions(),
        FinancialService.getFinancialSummary()
      ]);
      
      setTransactions(data);
      setFilteredTransactions(data);
      setFinancialSummary(summary);
      
      // Load cash balances for all categories
      const balancePromises = financialCategories.map(category => 
        FinancialService.getCashBalance(category.id)
      );
      const balances = await Promise.all(balancePromises);
      const balanceMap: Record<string, number> = {};
      financialCategories.forEach((category, index) => {
        balanceMap[category.id] = balances[index];
      });
      setCashBalance(balanceMap);
      
      setError('');
    } catch (err) {
      setError('Gagal memuat data keuangan. Periksa koneksi database.');
      console.error('Financial loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilteredTransactions(transactions);
  };

  const handleEdit = (transaction: EnhancedTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      total: transaction.total,
      id_description: transaction.id_description || '',
      note: transaction.note || '',
      payment_type: transaction.payment_type || 'tunai'
    });
    setTotalText(String(transaction.total ?? 0));
    setShowModal(true);
  };

  const openModal = () => {
    setEditingTransaction(null);
    setFormData({
      type: 'in',
      total: 0,
      id_description: '',
      note: '',
      payment_type: 'tunai'
    });
    setTotalText('0');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      type: 'in',
      total: 0,
      id_description: '',
      note: '',
      payment_type: 'tunai'
    });
    setTotalText('0');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (formData.total <= 0) {
      newErrors.total = 'Nominal harus lebih dari 0';
    }
    
    if (!formData.payment_type || formData.payment_type.trim() === '') {
      newErrors.payment_type = 'Dompet harus dipilih';
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
      // Sanitize and prepare payload
      const payload = {
        ...formData,
        id_description: formData.id_description && formData.id_description.trim() !== '' ? formData.id_description : null,
        note: (formData.note || '').trim() === '' ? null : formData.note,
        payment_type: formData.payment_type && formData.payment_type.trim() !== '' ? formData.payment_type : null
      } as any;
      
      if (editingTransaction) {
        await FinancialService.updateTransaction(editingTransaction.id, payload);
        setToastMessage('Transaksi berhasil diperbarui!');
        setToastType('success');
      } else {
        await FinancialService.createTransaction(payload);
        setToastMessage('Transaksi berhasil ditambahkan!');
        setToastType('success');
      }
      
      setShowToast(true);
      closeModal();
      loadTransactions();
    } catch (err) {
      setToastMessage('Gagal menyimpan transaksi. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Transaction save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionSheet = (transaction: EnhancedTransaction) => {
    setSelectedTransaction(transaction);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    
    try {
      await FinancialService.deleteTransaction(selectedTransaction.id);
      setToastMessage('Transaksi berhasil dihapus!');
      setToastType('success');
      setShowToast(true);
      loadTransactions();
    } catch (err) {
      setToastMessage('Gagal menghapus transaksi. Coba lagi.');
      setToastType('error');
      setShowToast(true);
      console.error('Transaction delete error:', err);
    }
    setShowActionSheet(false);
  };

  // Calculate summary
  const totalIncome = transactions
    .filter(t => t.type === 'in')
    .reduce((sum, t) => sum + t.total, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'out')
    .reduce((sum, t) => sum + t.total, 0);
  
  const balance = totalIncome - totalExpense;

  // Table columns configuration
  const tableColumns = [
    { 
      key: 'created_at', 
      label: 'Tanggal', 
      width: '15%',
      sortable: true
    },
    { 
      key: 'description_name', 
      label: 'Keterangan', 
      width: '20%',
      sortable: true,
      render: (value: string) => {
        if (!value) return '-';
        if (value.length > 40) {
          return (
            <div className="max-w-xs">
              <span className="truncate block" title={value}>
                {value.substring(0, 40)}...
              </span>
            </div>
          );
        }
        return value;
      }
    },
    { 
      key: 'total', 
      label: 'Nominal', 
      width: '15%',
      sortable: true,
      render: (value: number) => `Rp ${value.toLocaleString()}`
    },
    { 
      key: 'category_name', 
      label: 'Dompet', 
      width: '15%',
      sortable: true,
      render: (value: string, row: any) => {
        const category = financialCategories.find(c => c.id === row.payment_type);
        if (!category) return '-';
        
        return (
          <div className="flex items-center max-w-xs">
            <div 
              className="w-6 h-6 rounded-full mr-2 flex items-center justify-center text-white text-xs flex-shrink-0"
              style={{ backgroundColor: category.color }}
            >
              {getIconForCategory(category.icon)}
            </div>
            <span className="text-sm truncate" title={category.name}>
              {category.name}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'type', 
      label: 'Jenis', 
      width: '10%',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${value === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value === 'in' ? 'Pemasukan' : 'Pengeluaran'}
        </span>
      )
    },
    {
      key: 'note',
      label: 'Catatan',
      width: '15%',
      sortable: true,
      render: (value: string) => {
        if (!value) return '-';
        if (value.length > 50) {
          return (
            <div className="max-w-xs">
              <span className="truncate block" title={value}>
                {value.substring(0, 50)}...
              </span>
            </div>
          );
        }
        return value;
      }
    }
  ];

  // Helper function to get icon for category
  const getIconForCategory = (iconType: string) => {
    const iconMap: Record<string, string> = {
      'wallet': '💳',
      'cash': '💰',
      'bank': '🏦',
      'digital': '📱',
      'savings': '🏠',
      'investment': '📈',
      'gift': '🎁',
      'business': '💼'
    };
    return iconMap[iconType] || '💰';
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat data keuangan...</p>
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
              onClick={loadTransactions} 
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
        <Layout title="Pencatatan Keuangan" showMenu onRefresh={loadTransactions}>
          <div className="page-container">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Kelola Keuangan
                </h2>
              </div>
            </div>

            {/* Financial Summary Badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Total Pemasukan */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pemasukan</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {totalIncome.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                </div>
              </div>

              {/* Total Pengeluaran */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                    <p className="text-2xl font-bold text-red-600">
                      Rp {totalExpense.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📉</span>
                  </div>
                </div>
              </div>

              {financialCategories.map((category) => (
                <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{category.name}</p>
                      <p 
                        className="text-2xl font-bold"
                        style={{ color: category.color }}
                      >
                        Rp {(financialSummary[category.id] || 0).toLocaleString()}
                      </p>
                    </div>
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <span className="text-2xl">{getIconForCategory(category.icon)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search Bar - Direct input without container */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari transaksi..."
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
                Tambah Transaksi
              </button>
              <button
                onClick={() => setShowDescModal(true)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Tambah Keterangan
              </button>
            </div>

            <div className="section">
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <h3 className="empty-state-title">Belum Ada Transaksi</h3>
                  <p className="empty-state-description">
                    Tambahkan transaksi pertama untuk memulai pencatatan keuangan.
                  </p>
                  <button 
                    onClick={() => openModal()} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Transaksi
                  </button>
                </div>
              ) : (
                <AdvancedDataTable
                  columns={tableColumns}
                  data={filteredTransactions}
                  globalSearchTerm={searchTerm}
                  onEdit={handleEdit}
                  onDelete={openActionSheet}
                  onDetail={async (transaction) => {
                    try {
                      console.log('Loading details for transaction:', transaction.id);
                      setSelectedTransactionForDetail(transaction);
                      setLoadingGoods(true);
                      setShowDetailModal(true);
                      
                      // Load goods details for this transaction
                      const goods = await FinancialService.getTransactionGoodsDetails(transaction.id);
                      console.log('Loaded goods:', goods);
                      setTransactionGoods(goods || []);
                    } catch (err) {
                      console.error('Failed to load transaction goods:', err);
                      setTransactionGoods([]);
                      setToastMessage('Gagal memuat detail barang');
                      setToastType('error');
                      setShowToast(true);
                    } finally {
                      setLoadingGoods(false);
                    }
                  }}
                  emptyMessage="Tidak ada transaksi yang ditemukan"
                  showNumbering={true}
                  itemsPerPage={10}
                />
              )}
            </div>
          </div>
        </Layout>

        {/* HTML Modal - Add/Edit Transaction */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                    <select
                      value={formData.id_description || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const selected = descriptions.find(d => d.id === id);
                        setFormData({
                          ...formData,
                          id_description: id,
                          type: selected ? selected.type : formData.type
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Pilih keterangan</option>
                      {descriptions.map(d => (
                        <option key={d.id} value={d.id}>{d.descriptionname} ({d.type === 'in' ? 'Pemasukan' : 'Pengeluaran'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Transaksi</label>
                    <select
                      value={formData.type}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    >
                      <option value="in">Pemasukan</option>
                      <option value="out">Pengeluaran</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori Uang</label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        errors.payment_type 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Pilih kategori uang</option>
                      {financialCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.payment_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.payment_type}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totalText === '' ? '' : `Rp ${formatCurrencyInput(totalText)}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        const digits = v.replace(/\D/g, '');
                        if (digits === '' || /^\d+$/.test(digits)) {
                          setTotalText(digits);
                          setFormData({ ...formData, total: digits === '' ? 0 : Number(digits) });
                        }
                      }}
                      placeholder="0"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                        errors.total 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.total && (
                      <p className="mt-1 text-sm text-red-600">{errors.total}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                    <input
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      placeholder="Opsional: catatan transaksi"
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
                      <>
                        <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingTransaction ? 'Perbarui' : 'Simpan'}
                      </>
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
                    if (selectedTransaction) {
                      handleEdit(selectedTransaction);
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

        {/* Inline Modal: Tambah Keterangan */}
        {showDescModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Tambah Keterangan</h2>
                  <button onClick={() => setShowDescModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Keterangan</label>
                    <input value={descForm.descriptionname} onChange={(e) => setDescForm({ ...descForm, descriptionname: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                    <select value={descForm.type} onChange={(e) => setDescForm({ ...descForm, type: e.target.value as 'in' | 'out' })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900">
                      <option value="in">Pemasukan</option>
                      <option value="out">Pengeluaran</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowDescModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">Batal</button>
                  <button
                    onClick={async () => {
                      try {
                        const created = await FinancialService.createTransactionDescription(descForm);
                        if (created) {
                          const updated = await FinancialService.getAllTransactionDescriptions();
                          setDescriptions(updated);
                          setToastMessage('Keterangan dibuat');
                          setShowToast(true);
                          setShowDescModal(false);
                          setDescForm({ descriptionname: '', type: 'in' });
                        }
                      } catch (err) {
                        console.error(err);
                        setToastMessage('Gagal membuat keterangan');
                        setShowToast(true);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                    disabled={!descForm.descriptionname}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedTransactionForDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Detail Transaksi</h2>
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      setTransactionGoods([]);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Transaction Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                    <p className="text-gray-900">
                      {formatDate(selectedTransactionForDetail.created_at)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                    <p className="text-gray-900">
                      {selectedTransactionForDetail.description_name || '-'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal</label>
                    <p className="text-gray-900 font-semibold text-lg">
                      Rp {selectedTransactionForDetail.total.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Uang</label>
                    <div className="flex items-center">
                      {(() => {
                        const category = financialCategories.find(c => c.id === selectedTransactionForDetail.payment_type);
                        if (!category) return <span className="text-gray-500">-</span>;
                        
                        return (
                          <>
                            <div 
                              className="w-6 h-6 rounded-full mr-2 flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: category.color }}
                            >
                              {getIconForCategory(category.icon)}
                            </div>
                            <span className="text-gray-900">{category.name}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedTransactionForDetail.type === 'in' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedTransactionForDetail.type === 'in' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </div>
                  
                  {selectedTransactionForDetail.note && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                      <p className="text-gray-900">{selectedTransactionForDetail.note}</p>
                    </div>
                  )}
                </div>

                {/* Goods Details */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Detail Barang
                  </h3>
                  
                  {loadingGoods ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Memuat detail barang...</span>
                      </div>
                    </div>
                  ) : transactionGoods.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barang</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {transactionGoods.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.good_code}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{item.good_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{item.category_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{item.location_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{item.stock}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">Rp {item.price.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">Rp {item.total_price.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    item.type === 'in' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {item.type === 'in' ? 'Masuk' : 'Keluar'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={6} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total Keseluruhan:</td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                Rp {transactionGoods.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p>Tidak ada detail barang untuk transaksi ini</p>
                      <p className="text-sm">Mungkin ini adalah transaksi keuangan non-barang</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      setTransactionGoods([]);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Tutup
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

export default FinancialBookkeeping;

