import React, { useState } from 'react';
import { useHistory } from 'react-router';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
  onRefresh?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = "M3 SHOP", 
  showMenu = false,
  onMenuClick,
  onRefresh
}) => {
  const history = useHistory();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    try {
      localStorage.clear();
      sessionStorage && sessionStorage.clear();
    } catch {}
    window.location.replace('/login');
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Custom Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center">
              {showMenu && (
                <button
                  onClick={() => {
                    if (onMenuClick) {
                      onMenuClick();
                    } else {
                      setIsSidebarOpen((prev) => !prev);
                    }
                  }}
                  className="p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="ml-4">
                <h1 className="text-xl font-semibold">{title}</h1>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-colors"
                title="Refresh"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-colors"
                title="Logout"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Konfirmasi Logout</h3>
                  <p className="text-sm text-gray-500">Apakah Anda yakin ingin keluar?</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar overlay */}
      {showMenu && (
        <>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-40" aria-hidden="true">
              <div className="absolute inset-0 bg-black opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
            </div>
          )}
          <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-16 bg-blue-600 text-white flex items-center justify-between px-4">
              <span className="font-semibold">Menu Owner</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded hover:bg-blue-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-3 space-y-1">
              <button
                onClick={() => { setIsSidebarOpen(false); history.push('/owner-admins'); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
              >
                Kelola Admin
              </button>
              <button
                onClick={() => { setIsSidebarOpen(false); history.push('/transaction-descriptions'); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
              >
                Kelola Keterangan
              </button>
              <button
                onClick={() => { setIsSidebarOpen(false); history.push('/financial-categories'); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
              >
                Kelola Dompet
              </button>
              <button
                onClick={() => { setIsSidebarOpen(false); history.push('/damaged-goods'); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
              >
                Kelola Barang Rusak
              </button>
            </nav>
          </aside>
        </>
      )}
    </>
  );
};

export default Layout;