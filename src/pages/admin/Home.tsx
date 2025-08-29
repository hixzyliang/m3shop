import React, { useEffect, useMemo, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Layout from '../../components/Layout';
import CustomToast from '../../components/CustomToast';
import { FinancialService } from '../../services/financialService';
import { InventoryService } from '../../services/inventoryService';
import { AuthService } from '../../services/authService';
import { UserWithLocation } from '../../lib/supabase';
import { formatCurrencyInput, parseFormattedCurrency } from '../../lib/utils';

import { TransactionDescription } from '../../lib/supabase';

const AdminHome: React.FC = () => {
  const [cart, setCart] = useState<Array<{ idgood: string; idlocation: string; code: string; name: string; price: number; quantity: number; stock: number }>>([]);
  const [goods, setGoods] = useState<any[]>([]);
  const [filteredGoods, setFilteredGoods] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cashReceivedText, setCashReceivedText] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [adminId, setAdminId] = useState<string>('');
  const [adminLocationId, setAdminLocationId] = useState<string>('');
  const [adminLocationName, setAdminLocationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{ idgood: string; idlocation: string; code: string; name: string; price: number; quantity: number; currentStock: number }>>([]);
  const [bulkCashReceivedText, setBulkCashReceivedText] = useState<string>('0');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [bulkNote, setBulkNote] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setAdminId(userData.id);
      loadAdminData(userData.id);
    }
  }, []);

  // Filter goods based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGoods(goods);
    } else {
      const filtered = goods.filter(g => 
        g.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGoods(filtered);
    }
  }, [searchTerm, goods]);

  // Define cartTotal and bulkTotal before using them in useEffect
  const cartTotal = useMemo(() => cart.reduce((s, it) => s + (it.price * it.quantity), 0), [cart]);
  const bulkTotal = useMemo(() => 
    bulkItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), 
    [bulkItems]
  );

  // Update cash received for digital payment when cart total changes
  useEffect(() => {
    if (paymentMethod === 'digital') {
      setCashReceivedText(cartTotal.toString());
    }
  }, [cartTotal, paymentMethod]);

  // Update bulk cash received for digital payment when bulk total changes
  useEffect(() => {
    if (bulkPaymentMethod === 'digital') {
      setBulkCashReceivedText(bulkTotal.toString());
    }
  }, [bulkTotal, bulkPaymentMethod]);

  const loadAdminData = async (userId: string) => {
    try {
      setLoading(true);
      const user = await AuthService.getUserById(userId) as UserWithLocation;
      if (user && user.location_id) {
        setAdminLocationId(user.location_id);
        setAdminLocationName(user.location?.locationname || '');
        await loadGoodsByLocation(user.location_id);
      } else {
        // If admin has no location assigned, show all goods
        await loadAllGoods();
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      await loadAllGoods();
    } finally {
      setLoading(false);
    }
  };

  const loadGoodsByLocation = async (locationId: string) => {
    const list = await InventoryService.getGoodsByLocation(locationId);
    setGoods(list);
    setFilteredGoods(list);
  };

  const loadAllGoods = async () => {
    const list = await InventoryService.getAllGoodsWithDetails();
    setGoods(list);
    setFilteredGoods(list);
  };

  const cashReceived = useMemo(() => Number((cashReceivedText || '0').replace(/[^0-9]/g, '')) || 0, [cashReceivedText]);
  const change = useMemo(() => {
    if (paymentMethod === 'digital') {
      return 0; // No change for digital payment
    }
    return Math.max(0, cashReceived - cartTotal);
  }, [cashReceived, cartTotal, paymentMethod]);
  
  const addToCart = (g: any) => {
    setCart((prev) => {
      const idx = prev.findIndex(p => p.idgood === g.goodsId);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], quantity: clone[idx].quantity + 1 };
        return clone;
      }
      return [...prev, { 
        idgood: g.goodsId, 
        idlocation: g.idlocation, 
        code: g.code, 
        name: g.name, 
        price: g.price || 0, 
        quantity: 1,
        stock: g.stock || 0
      }];
    });
  };
  
  const updateQty = (idgood: string, qty: number) => {
    setCart((prev) => prev.map(it => {
      if (it.idgood === idgood) {
        // Validate stock
        if (qty > it.stock) {
          setToastMessage(`Jumlah barang tidak bisa lebih dari stok (${it.stock})`);
          setToastType('error');
          setShowToast(true);
          return it; // Keep current quantity
        }
        return { ...it, quantity: Math.max(0, qty) };
      }
      return it;
    }));
  };

  const openBulkModal = () => {
    const bulkData = goods.map(g => ({
      idgood: g.goodsId,
      idlocation: g.idlocation,
      code: g.code,
      name: g.name,
      price: g.price || 0,
      quantity: 0,
      currentStock: g.stock || 0
    }));
    setBulkItems(bulkData);
    setShowBulkModal(true);
  };

  const updateBulkQuantity = (idgood: string, quantity: number) => {
    setBulkItems(prev => prev.map(item => {
      if (item.idgood === idgood) {
        // Validate stock
        if (quantity > item.currentStock) {
          setToastMessage(`Jumlah barang tidak bisa lebih dari stok (${item.currentStock})`);
          setToastType('error');
          setShowToast(true);
          return item; // Keep current quantity
        }
        return { ...item, quantity: Math.max(0, quantity) };
      }
      return item;
    }));
  };

  const bulkCashReceived = useMemo(() => 
    Number((bulkCashReceivedText || '0').replace(/[^0-9]/g, '')) || 0, 
    [bulkCashReceivedText]
  );

  const bulkChange = useMemo(() => {
    if (bulkPaymentMethod === 'digital') {
      return 0; // No change for digital payment
    }
    return Math.max(0, bulkCashReceived - bulkTotal);
  }, [bulkCashReceived, bulkTotal, bulkPaymentMethod]);

  const handleBulkSubmit = async () => {
    const itemsToProcess = bulkItems.filter(item => item.quantity > 0);
    
    if (itemsToProcess.length === 0) {
      setToastMessage('Pilih minimal satu barang dengan jumlah lebih dari 0');
      setToastType('error');
      setShowToast(true);
      return;
    }

    // Validate stock
    const invalidItems = itemsToProcess.filter(item => item.quantity > item.currentStock);
    if (invalidItems.length > 0) {
      const itemNames = invalidItems.map(item => `${item.name} (stok: ${item.currentStock})`).join(', ');
      setToastMessage(`Jumlah barang melebihi stok: ${itemNames}`);
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (bulkPaymentMethod === 'cash' && bulkCashReceived < bulkTotal) {
      setToastMessage('Uang yang diterima kurang dari total pembayaran');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setBulkSubmitting(true);
    
    try {
      const result = await FinancialService.processAdminSale({
        adminId,
        items: itemsToProcess.map(item => ({
          idgood: item.idgood,
          idlocation: item.idlocation,
          quantity: item.quantity,
          price: item.price
        })),
        cashReceived: bulkPaymentMethod === 'digital' ? bulkTotal : bulkCashReceived,
        paymentMethod: bulkPaymentMethod,
        note: bulkNote
      });
      
      if (result.success) {
        setToastMessage(`Berhasil memproses ${itemsToProcess.length} barang dalam satu transaksi`);
        setToastType('success');
        setShowToast(true);
        setShowBulkModal(false);
        setBulkItems([]);
        setBulkCashReceivedText('0');
        // Reload goods to update stock
        if (adminLocationId) {
          await loadGoodsByLocation(adminLocationId);
        } else {
          await loadAllGoods();
        }
      } else {
        setToastMessage(result.message || 'Gagal memproses bulk transaksi');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Terjadi kesalahan saat memproses bulk transaksi';
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      setBulkSubmitting(false);
    }
  };
  
  const removeItem = (idgood: string) => setCart((prev) => prev.filter(it => it.idgood !== idgood));
  const clearCart = () => setCart([]);

  const submitSale = async () => {
    try {
      if (!adminId || cart.length === 0) return;
      
      // Validate stock
      const invalidItems = cart.filter(item => item.quantity > item.stock);
      if (invalidItems.length > 0) {
        const itemNames = invalidItems.map(item => `${item.name} (stok: ${item.stock})`).join(', ');
        setToastMessage(`Jumlah barang melebihi stok: ${itemNames}`);
        setToastType('error');
        setShowToast(true);
        return;
      }
      
      setSubmitting(true);
      
      const res = await FinancialService.processAdminSale({
        adminId,
        items: cart.map(it => ({ idgood: it.idgood, idlocation: it.idlocation, quantity: it.quantity, price: it.price })),
        cashReceived: paymentMethod === 'digital' ? cartTotal : cashReceived,
        paymentMethod,
        note
      });
      
      if (res.success) {
        clearCart();
        setCashReceivedText('0');
        if (adminLocationId) {
          await loadGoodsByLocation(adminLocationId);
        } else {
          await loadAllGoods();
        }
        setToastMessage('Transaksi berhasil');
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage(res.message || 'Gagal memproses transaksi');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Terjadi kesalahan saat memproses transaksi';
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <Layout title="Admin - Pembelian">
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
        <Layout title="Admin - Pembelian">
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
              {/* Bulk Action Button */}
              <div className="mb-4">
                <button
                  onClick={openBulkModal}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Bulk Penjualan
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Cari & Tambah Barang</label>
                  
                  {/* Search Input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari barang berdasarkan kode atau nama..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
                    />
                  </div>
                  
                  <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
                    {filteredGoods.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {searchTerm ? 'Tidak ada barang yang cocok dengan pencarian' : 'Tidak ada barang tersedia'}
                      </div>
                    ) : (
                      filteredGoods.map((g) => (
                        <div key={g.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{g.code} - {g.name}</div>
                            <div className="text-xs text-gray-500">
                              Stok: {g.stock} | Harga: Rp {Number(g.price || 0).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <button 
                            onClick={() => addToCart(g)} 
                            className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            disabled={g.stock <= 0}
                          >
                            {g.stock > 0 ? 'Tambah' : 'Habis'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Keranjang</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs text-gray-500">
                            <th className="px-3 py-2 whitespace-nowrap">Kode</th>
                            <th className="px-3 py-2 whitespace-nowrap">Nama</th>
                            <th className="px-3 py-2 whitespace-nowrap">Harga</th>
                            <th className="px-3 py-2 whitespace-nowrap">Qty</th>
                            <th className="px-3 py-2 whitespace-nowrap">Total</th>
                            <th className="px-3 py-2 whitespace-nowrap">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((it) => (
                            <tr key={it.idgood} className="text-sm border-b border-gray-100 last:border-b-0">
                              <td className="px-3 py-2 font-medium whitespace-nowrap">{it.code}</td>
                              <td className="py-2 max-w-xs">
                                <span className="truncate block" title={it.name}>
                                  {it.name}
                                </span>
                              </td>
                              <td className="py-2 whitespace-nowrap">Rp {Number(it.price).toLocaleString('id-ID')}</td>
                              <td className="py-2 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => updateQty(it.idgood, Math.max(0, it.quantity - 10))}
                                    className="w-8 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold transition-colors"
                                    disabled={it.quantity <= 0}
                                    title="-10"
                                  >
                                    -10
                                  </button>
                                  <button
                                    onClick={() => updateQty(it.idgood, Math.max(0, it.quantity - 1))}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded flex items-center justify-center text-xs font-bold transition-colors"
                                    disabled={it.quantity <= 0}
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number" 
                                    min={0} 
                                    className="w-12 px-1 py-1 border border-gray-300 rounded text-center bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" 
                                    value={it.quantity === 0 ? '' : it.quantity} 
                                    onChange={(e) => updateQty(it.idgood, Math.max(0, Number(e.target.value) || 0))} 
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() => updateQty(it.idgood, it.quantity + 1)}
                                    className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold transition-colors"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => updateQty(it.idgood, it.quantity + 10)}
                                    className="w-8 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-bold transition-colors"
                                    title="+10"
                                  >
                                    +10
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 font-medium whitespace-nowrap">Rp {(it.price * it.quantity).toLocaleString('id-ID')}</td>
                              <td className="py-2 whitespace-nowrap">
                                <button 
                                  onClick={() => removeItem(it.idgood)} 
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                          {cart.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                Keranjang kosong
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Pembayaran</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Belanja</label>
                      <div className="text-2xl font-bold text-blue-600">
                        Rp {cartTotal.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="cash"
                            checked={paymentMethod === 'cash'}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value as 'cash' | 'digital');
                              if (e.target.value === 'cash') {
                                setCashReceivedText('0');
                              }
                            }}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Tunai</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="digital"
                            checked={paymentMethod === 'digital'}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value as 'cash' | 'digital');
                              if (e.target.value === 'digital') {
                                setCashReceivedText(cartTotal.toString());
                              }
                            }}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Digital</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label>
                      <input 
                        type="text"
                        value={cashReceivedText === '0' ? '' : `Rp ${formatCurrencyInput(cashReceivedText)}`}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          setCashReceivedText(digits);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-lg font-medium"
                        placeholder="Rp 0"
                        disabled={paymentMethod === 'digital'}
                      />
                      {paymentMethod === 'digital' && (
                        <p className="text-xs text-gray-500 mt-1">Pembayaran digital selalu pas dengan total belanja</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kembalian</label>
                      <div className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Rp {change.toLocaleString('id-ID')}
                      </div>
                      {paymentMethod === 'cash' && change > 0 && (
                        <p className="text-xs text-gray-500 mt-1">Kembalian akan diambil dari uang receh</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                      <input 
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                        placeholder="Opsional: catatan transaksi"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Action Section */}
                <div className="flex flex-col justify-end">
                  <div className="text-sm text-gray-600 mb-4">
                    {cart.length} item dalam keranjang
                  </div>
                  <button 
                    disabled={submitting || cart.length === 0 || (paymentMethod === 'cash' && cashReceived < cartTotal)} 
                    onClick={submitSale} 
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors text-lg"
                  >
                    {submitting ? 'Memproses...' : 'Simpan Transaksi'}
                  </button>
                  {paymentMethod === 'cash' && cashReceived < cartTotal && cart.length > 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      Uang diterima kurang dari total belanja
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Modal */}
            {showBulkModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-800">Bulk Penjualan</h2>
                      <button 
                        onClick={() => setShowBulkModal(false)} 
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                        <div className="flex space-x-4 mb-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="cash"
                              checked={bulkPaymentMethod === 'cash'}
                              onChange={(e) => {
                                setBulkPaymentMethod(e.target.value as 'cash' | 'digital');
                                if (e.target.value === 'cash') {
                                  setBulkCashReceivedText('0');
                                }
                              }}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Tunai</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="digital"
                              checked={bulkPaymentMethod === 'digital'}
                              onChange={(e) => {
                                setBulkPaymentMethod(e.target.value as 'cash' | 'digital');
                                if (e.target.value === 'digital') {
                                  setBulkCashReceivedText(bulkTotal.toString());
                                }
                              }}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Digital</span>
                          </label>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label>
                        <input 
                          type="text"
                          value={bulkCashReceivedText === '0' ? '' : `Rp ${formatCurrencyInput(bulkCashReceivedText)}`}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            setBulkCashReceivedText(digits);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-lg font-medium"
                          placeholder="Rp 0"
                          disabled={bulkPaymentMethod === 'digital'}
                        />
                        {bulkPaymentMethod === 'digital' && (
                          <p className="text-xs text-gray-500 mt-1">Pembayaran digital selalu pas dengan total belanja</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total & Kembalian</label>
                        <div className="space-y-2">
                          <div className="text-lg font-semibold text-blue-600">
                            Total: Rp {bulkTotal.toLocaleString('id-ID')}
                          </div>
                          <div className={`text-lg font-semibold ${bulkChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Kembalian: Rp {bulkChange.toLocaleString('id-ID')}
                          </div>
                          {bulkPaymentMethod === 'cash' && bulkChange > 0 && (
                            <p className="text-xs text-gray-500">Kembalian akan diambil dari uang receh</p>
                          )}
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                          <input 
                            type="text"
                            value={bulkNote}
                            onChange={(e) => setBulkNote(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                            placeholder="Opsional: catatan transaksi"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Daftar Barang ({bulkItems.filter(item => item.quantity > 0).length} dipilih)
                      </h3>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-white border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkItems.map((item) => (
                              <tr key={item.idgood} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.code}</td>
                                <td className="px-3 py-2 max-w-xs">
                                  <span className="truncate block text-sm text-gray-800" title={item.name}>
                                    {item.name}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">{item.currentStock}</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => updateBulkQuantity(item.idgood, Math.max(0, item.quantity - 10))}
                                      className="w-8 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold transition-colors"
                                      disabled={item.quantity <= 0}
                                      title="-10"
                                    >
                                      -10
                                    </button>
                                    <button
                                      onClick={() => updateBulkQuantity(item.idgood, Math.max(0, item.quantity - 1))}
                                      className="w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded flex items-center justify-center text-xs font-bold transition-colors"
                                      disabled={item.quantity <= 0}
                                    >
                                      -
                                    </button>
                                    <input 
                                      type="number" 
                                      min="0"
                                      max={item.currentStock}
                                      value={item.quantity === 0 ? '' : item.quantity} 
                                      onChange={(e) => updateBulkQuantity(item.idgood, Math.max(0, Number(e.target.value) || 0))} 
                                      className="w-16 px-1 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" 
                                      placeholder="0"
                                    />
                                    <button
                                      onClick={() => updateBulkQuantity(item.idgood, Math.min(item.currentStock, item.quantity + 1))}
                                      className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold transition-colors"
                                      disabled={item.quantity >= item.currentStock}
                                    >
                                      +
                                    </button>
                                    <button
                                      onClick={() => updateBulkQuantity(item.idgood, Math.min(item.currentStock, item.quantity + 10))}
                                      className="w-8 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-bold transition-colors"
                                      disabled={item.quantity >= item.currentStock}
                                      title="+10"
                                    >
                                      +10
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  Rp {Number(item.price).toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                  Rp {(item.price * item.quantity).toLocaleString('id-ID')}
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
                        onClick={() => setShowBulkModal(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={handleBulkSubmit}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        disabled={bulkSubmitting || bulkItems.filter(item => item.quantity > 0).length === 0 || (bulkPaymentMethod === 'cash' && bulkCashReceived < bulkTotal)}
                      >
                        {bulkSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Memproses...
                          </>
                        ) : (
                          'Simpan Transaksi'
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
          </div>
        </Layout>
      </IonContent>
    </IonPage>
  );
};

export default AdminHome;

