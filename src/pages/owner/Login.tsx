import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import { useHistory } from 'react-router';
import { AuthService } from '../../services/authService';
import { testSupabaseConnection, testDatabaseTables } from '../../lib/supabase';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [tableStatus, setTableStatus] = useState<any>({});
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const history = useHistory();

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Starting database connection test...');

        // Test basic connection
        const isConnected = await testSupabaseConnection();
        setConnectionStatus(isConnected ? 'connected' : 'error');

        if (isConnected) {
          // Test individual tables
          const tableResults = await testDatabaseTables();
          setTableStatus(tableResults);

          // Check if all required tables exist
          const requiredTables = ['users', 'locations', 'categories', 'goods'];
          const missingTables = requiredTables.filter(table => !tableResults[table]?.success);

          if (missingTables.length > 0) {
            setToastMessage(`Database terhubung tapi tabel ${missingTables.join(', ')} tidak ditemukan. Jalankan script SQL terlebih dahulu.`);
            setShowToast(true);
          }
        } else {
          setToastMessage('Gagal terhubung ke database. Periksa koneksi internet dan URL Supabase.');
          setShowToast(true);
        }
      } catch (error) {
        setConnectionStatus('error');
        setToastMessage('Error koneksi database: ' + (error as Error).message);
        setShowToast(true);
      }
    };

    testConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (connectionStatus !== 'connected') {
      setToastMessage('Database belum terhubung. Coba lagi.');
      setShowToast(true);
      return;
    }

    setIsLoading(true);

    try {
      const user = await AuthService.login(username, password);

      if (user) {
        // Store user data in localStorage (remove password for security)
        const userData = {
          id: user.id,
          username: user.username || user.email || '',
          role: user.role
        };

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');

        setToastMessage('Login berhasil!');
        setShowToast(true);

        // Force reload and redirect based on role
        setTimeout(() => {
          const target = user.role === 'admin' ? '/admin' : '/home';
          window.location.href = target;
        }, 500);
      } else {
        setToastMessage('Username atau password salah!');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('Terjadi kesalahan saat login. Coba lagi.');
      setShowToast(true);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="login-container">
          <div className="login-card">
            <div className="login-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="login-logo">
                <img src="./assets/logo.png" width={100} alt="M3 Shop Logo" />
              </div>
              <p className="login-subtitle">Aplikasi Manajemen Toko</p>
            </div>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={isLoading || connectionStatus !== 'connected'}
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={5000}
          position="top"
          color={toastMessage.includes('berhasil') ? 'success' : 'danger'}
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;

