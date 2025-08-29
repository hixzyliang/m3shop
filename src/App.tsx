import React, { useEffect, useState } from 'react';
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { 
  homeOutline, 
  locationOutline, 
  cubeOutline, 
  walletOutline,
  gridOutline,
  documentTextOutline,
  layersOutline
} from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';
import './index.css';

// Pages (role-based)
import Login from './pages/owner/Login';
import Home from './pages/owner/Home';
import LocationManagement from './pages/owner/LocationManagement';
import InventoryManagement from './pages/owner/InventoryManagement';
import StockManagement from './pages/owner/StockManagement';
import StockHistoryTypes from './pages/owner/StockHistoryTypes';
import FinancialBookkeeping from './pages/owner/FinancialBookkeeping';
import CategoryManagement from './pages/owner/CategoryManagement';
import SalesReport from './pages/owner/SalesReport';
import DatabaseTest from './pages/owner/DatabaseTest';
import TailwindTest from './pages/owner/TailwindTest';
import AdminHome from './pages/admin/Home';
import AdminHistory from './pages/admin/History';
import AdminManagement from './pages/owner/AdminManagement';
import TransactionDescriptionManagement from './pages/owner/TransactionDescriptionManagement';
import FinancialCategoryManagement from './pages/owner/FinancialCategoryManagement';
import DamagedGoodsManagement from './pages/owner/DamagedGoodsManagement';

setupIonicReact({ 
  mode: 'ios',
  animated: true
});

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      setIsAuthenticated(isLoggedIn);
      const u = localStorage.getItem('user');
      setRole(u ? (JSON.parse(u).role || null) : null);
    };

    checkAuth();
    
    // Listen for storage changes
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <IonApp>
        <div className="loading-container">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800 mb-2">M3 SHOP</div>
            <div className="text-sm text-gray-600">Memuat aplikasi...</div>
          </div>
        </div>
      </IonApp>
    );
  }

  // If not authenticated, show login
  if (!isAuthenticated) {
    return (
      <IonApp>
        <IonReactRouter>
          <Route exact path="/login" component={Login} />
          <Route exact path="/">
            <Redirect to="/login" />
          </Route>
          <Route path="*">
            <Redirect to="/login" />
          </Route>
        </IonReactRouter>
      </IonApp>
    );
  }

  // If authenticated, show main app
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home" component={Home} />
            <Route exact path="/admin" component={AdminHome} />
            <Route exact path="/admin-history" component={AdminHistory} />
            <Route exact path="/locations" component={LocationManagement} />
            <Route exact path="/barang" component={InventoryManagement} />
            <Route exact path="/stock" component={StockManagement} />
            <Route exact path="/stock-history-types" component={StockHistoryTypes} />
            <Route exact path="/financial" component={FinancialBookkeeping} />
            <Route exact path="/categories" component={CategoryManagement} />
            <Route exact path="/sales-report" component={SalesReport} />
            <Route exact path="/owner-admins" component={AdminManagement} />
            <Route exact path="/transaction-descriptions" component={TransactionDescriptionManagement} />
            <Route exact path="/financial-categories" component={FinancialCategoryManagement} />
            <Route exact path="/damaged-goods" component={DamagedGoodsManagement} />
            <Route exact path="/database-test" component={DatabaseTest} />
            <Route exact path="/tailwind-test" component={TailwindTest} />
            <Route exact path="/">
              <Redirect to={role === 'admin' ? '/admin' : '/home'} />
            </Route>
          </IonRouterOutlet>

          {role === 'owner' && (
            <IonTabBar slot="bottom" className="ion-tab-bar">
              <IonTabButton tab="home" href="/home" className="ion-tab-button">
                <IonIcon icon={homeOutline} />
                <IonLabel>Beranda</IonLabel>
              </IonTabButton>

              <IonTabButton tab="locations" href="/locations" className="ion-tab-button">
                <IonIcon icon={locationOutline} />
                <IonLabel>Lokasi</IonLabel>
              </IonTabButton>

              <IonTabButton tab="barang" href="/barang" className="ion-tab-button">
                <IonIcon icon={cubeOutline} />
                <IonLabel>Barang</IonLabel>
              </IonTabButton>

              <IonTabButton tab="stock" href="/stock" className="ion-tab-button stock-tab">
                <IonIcon icon={layersOutline} />
                <IonLabel>Stok</IonLabel>
              </IonTabButton>

              <IonTabButton tab="financial" href="/financial" className="ion-tab-button">
                <IonIcon icon={walletOutline} />
                <IonLabel>Keuangan</IonLabel>
              </IonTabButton>

              <IonTabButton tab="categories" href="/categories" className="ion-tab-button">
                <IonIcon icon={gridOutline} />
                <IonLabel>Kategori</IonLabel>
              </IonTabButton>

              <IonTabButton tab="sales-report" href="/sales-report" className="ion-tab-button">
                <IonIcon icon={documentTextOutline} />
                <IonLabel>Laporan</IonLabel>
              </IonTabButton>
            </IonTabBar>
          )}
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
