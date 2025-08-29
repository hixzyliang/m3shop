import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonSpinner, IonToast } from '@ionic/react';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import { FinancialService } from '../../services/financialService';
import { TransactionDescription } from '../../lib/supabase';

const TransactionDescriptionManagement: React.FC = () => {
  const [items, setItems] = useState<TransactionDescription[]>([]);
  const [filtered, setFiltered] = useState<TransactionDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TransactionDescription | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selected, setSelected] = useState<TransactionDescription | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ descriptionname: '', type: 'in' as 'in' | 'out', is_active: true });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await FinancialService.getAllTransactionDescriptions();
      setItems(data);
      setFiltered(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat keterangan transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (v: string) => {
    setSearchTerm(v);
    setFiltered(items);
  };

  const openModal = (item?: TransactionDescription) => {
    if (item) {
      setEditing(item);
      setFormData({ descriptionname: item.descriptionname, type: item.type, is_active: item.is_active });
    } else {
      setEditing(null);
      setFormData({ descriptionname: '', type: 'in', is_active: true });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormData({ descriptionname: '', type: 'in', is_active: true });
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await FinancialService.updateTransactionDescription(editing.id, formData as any);
        setToastMessage('Keterangan diperbarui');
      } else {
        await FinancialService.createTransactionDescription({ descriptionname: formData.descriptionname, type: formData.type });
        setToastMessage('Keterangan dibuat');
      }
      setShowToast(true);
      closeModal();
      load();
    } catch (err) {
      console.error(err);
      setToastMessage('Gagal menyimpan');
      setShowToast(true);
    }
  };

  const openSheet = (item: TransactionDescription) => { setSelected(item); setShowActionSheet(true); };
  const handleDelete = async () => {
    if (!selected) return;
    try {
      await FinancialService.deleteTransactionDescription(selected.id);
      setToastMessage('Keterangan dihapus');
      setShowToast(true);
      load();
    } catch (err) {
      console.error(err);
      setToastMessage('Gagal menghapus');
      setShowToast(true);
    }
    setShowActionSheet(false);
  };

  const columns = [
    { key: 'descriptionname', label: 'Nama', width: '50%' },
    { key: 'type', label: 'Tipe', width: '20%', render: (v: string) => v === 'in' ? 'Pemasukan' : 'Pengeluaran' },
    { key: 'is_active', label: 'Aktif', width: '20%', render: (v: boolean) => (v ? 'Ya' : 'Tidak') }
  ];

  if (loading) {
    return (
      <IonPage>
        <Layout title="Keterangan Transaksi" showMenu>
          <div className="loading-container"><IonSpinner name="crescent" /><p>Memuat...</p></div>
        </Layout>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <Layout title="Keterangan Transaksi" showMenu>
          <div className="error-container"><p className="error-message">{error}</p><button onClick={load} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Coba Lagi</button></div>
        </Layout>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <Layout title="Keterangan Transaksi" showMenu>
          <div className="page-container">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-gray-900">Keterangan Transaksi</h2></div></div>
            <div className="mb-4"><input type="text" value={searchTerm} onChange={(e) => handleSearch(e.target.value)} placeholder="Cari keterangan..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" /></div>
            <div className="flex gap-2 mb-4"><button onClick={() => openModal()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">Tambah</button></div>
            <div className="section"><AdvancedDataTable columns={columns} data={filtered} globalSearchTerm={searchTerm} onEdit={openModal} onDelete={openSheet} emptyMessage="Tidak ada data" /></div>
          </div>
        </Layout>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full"><div className="p-6">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit' : 'Tambah'} Keterangan</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                  <input value={formData.descriptionname} onChange={(e) => setFormData({ ...formData, descriptionname: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'in' | 'out' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="in">Pemasukan</option>
                    <option value="out">Pengeluaran</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="desc-active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="desc-active" className="text-sm text-gray-700">Aktif</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">Batal</button><button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">Simpan</button></div>
            </div></div>
          </div>
        )}

        {showActionSheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"><div className="bg-white rounded-t-lg w-full max-w-sm"><div className="p-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Pilih Aksi</h3></div><div className="p-2"><button onClick={() => { if (selected) openModal(selected); }} className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">Edit</button><button onClick={handleDelete} className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors text-red-600">Hapus</button><button onClick={() => setShowActionSheet(false)} className="w-full text-center px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Batal</button></div></div></div>
        )}

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default TransactionDescriptionManagement;

