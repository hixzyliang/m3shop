import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonSpinner, IonToast } from '@ionic/react';
import Layout from '../../components/Layout';
import AdvancedDataTable from '../../components/AdvancedDataTable';
import { User } from '../../lib/supabase';
import { AuthService } from '../../services/authService';
import { LocationService } from '../../services/locationService';

interface Location {
  id: string;
  locationname: string;
  address: string;
  is_active: boolean;
}

const AdminManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    location_id: '' 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, locationsData] = await Promise.all([
        AuthService.getAllUsers(),
        LocationService.getAllLocations()
      ]);
      
      // Filter only admin users
      const adminUsers = usersData.filter(user => user.role === 'admin');
      setUsers(adminUsers);
      setFilteredUsers(adminUsers);
      setLocations(locationsData);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = users.filter(user => 
      (user.username || user.email || '').toLowerCase().includes(value.toLowerCase()) ||
      (user.location?.locationname || '').toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        username: user.username || user.email || '', 
        password: '', 
        location_id: user.location_id || '' 
      });
    } else {
      setEditingUser(null);
      setFormData({ username: '', password: '', location_id: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', location_id: '' });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.username || (!editingUser && !formData.password)) {
        setToastMessage('Username dan password harus diisi');
        setShowToast(true);
        return;
      }

      if (editingUser) {
        const updates: any = { 
          username: formData.username,
          location_id: formData.location_id || null
        };
        if (formData.password) updates.password = formData.password;
        
        const updatedUser = await AuthService.updateUser(editingUser.id, updates);
        if (updatedUser) {
          setToastMessage('Admin berhasil diperbarui');
          setShowToast(true);
          closeModal();
          loadData();
        } else {
          setToastMessage('Gagal memperbarui admin');
          setShowToast(true);
        }
      } else {
        const newUser = await AuthService.createUser({
          username: formData.username,
          password: formData.password,
          role: 'admin',
          location_id: formData.location_id || undefined
        });
        
        if (newUser) {
          setToastMessage('Admin berhasil ditambahkan');
          setShowToast(true);
          closeModal();
          loadData();
        } else {
          setToastMessage('Gagal menambahkan admin');
          setShowToast(true);
        }
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Terjadi kesalahan saat menyimpan admin');
      setShowToast(true);
    }
  };

  const openActionSheet = (user: User) => {
    setSelectedUser(user);
    setShowActionSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      const success = await AuthService.deleteUser(selectedUser.id);
      if (success) {
        setToastMessage('Admin berhasil dihapus');
        setShowToast(true);
        loadData();
      } else {
        setToastMessage('Gagal menghapus admin');
        setShowToast(true);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Terjadi kesalahan saat menghapus admin');
      setShowToast(true);
    }

    setShowActionSheet(false);
    setSelectedUser(null);
  };

  const tableColumns = [
    { 
      key: 'username', 
      label: 'Username', 
      width: '30%', 
      render: (v: string, row: User) => row.username || row.email || '-' 
    },
    { 
      key: 'location', 
      label: 'Lokasi', 
      width: '30%', 
      render: (v: any, row: User) => row.location?.locationname || 'Tidak ada lokasi' 
    },
    { 
      key: 'role', 
      label: 'Role', 
      width: '15%' 
    },
    { 
      key: 'created_at', 
      label: 'Dibuat', 
      width: '15%',
      render: (v: string) => new Date(v).toLocaleDateString('id-ID')
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      width: '10%' 
    }
  ];

  if (loading) {
    return (
      <IonPage>
        <Layout title="Kelola Admin" showMenu>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Memuat admin...</p>
          </div>
        </Layout>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <Layout title="Kelola Admin" showMenu>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={loadData} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Coba Lagi</button>
          </div>
        </Layout>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <Layout title="Kelola Admin" showMenu>
          <div className="page-container">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Kelola Admin</h2>
                <button 
                  onClick={() => openModal()} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tambah Admin
                </button>
              </div>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Cari admin berdasarkan username atau lokasi..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="section">
              <AdvancedDataTable 
                columns={tableColumns} 
                data={filteredUsers} 
                globalSearchTerm={searchTerm} 
                onEdit={openModal} 
                onDelete={openActionSheet} 
                emptyMessage="Tidak ada admin" 
              />
            </div>
          </div>
        </Layout>

        {/* Modal for Add/Edit Admin */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingUser ? 'Edit Admin' : 'Tambah Admin'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input 
                      value={formData.username} 
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" 
                      placeholder="Masukkan username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password {editingUser && <span className="text-gray-400">(kosongkan jika tidak diubah)</span>}
                      {!editingUser && <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="password" 
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900" 
                      placeholder="Masukkan password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi <span className="text-gray-400">(opsional)</span>
                    </label>
                    <select 
                      value={formData.location_id} 
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Pilih lokasi</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.locationname}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Admin hanya akan dapat mengakses barang di lokasi yang dipilih
                    </p>
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
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Sheet for Delete */}
        {showActionSheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
            <div className="bg-white rounded-t-lg w-full max-w-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Pilih Aksi</h3>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => { 
                    if (selectedUser) openModal(selectedUser); 
                    setShowActionSheet(false);
                  }} 
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={handleDelete} 
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
                >
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

export default AdminManagement;

