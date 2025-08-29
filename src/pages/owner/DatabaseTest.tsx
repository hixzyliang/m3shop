import React, { useState } from 'react';
import { IonPage, IonContent, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonToast } from '@ionic/react';
import { testSupabaseConnection, testDatabaseTables } from '../../lib/supabase';

const DatabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Not tested');
  const [tableResults, setTableResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await testSupabaseConnection();
      setConnectionStatus(result ? 'Connected' : 'Failed');
      setToastMessage(result ? 'Connection successful!' : 'Connection failed!');
      setShowToast(true);
    } catch (error) {
      setConnectionStatus('Error');
      setToastMessage('Connection test error!');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const testTables = async () => {
    setLoading(true);
    try {
      const results = await testDatabaseTables();
      setTableResults(results);
      setToastMessage('Table test completed!');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Table test error!');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <h1>Database Connection Test</h1>
        
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Connection Test</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>Status: {connectionStatus}</p>
            <IonButton onClick={testConnection} disabled={loading}>
              {loading ? <IonSpinner name="crescent" /> : 'Test Connection'}
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Table Test</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonButton onClick={testTables} disabled={loading}>
              {loading ? <IonSpinner name="crescent" /> : 'Test All Tables'}
            </IonButton>
            
            {tableResults && (
              <div style={{ marginTop: '20px' }}>
                <h3>Results:</h3>
                {Object.entries(tableResults).map(([tableName, result]: [string, any]) => (
                  <div key={tableName} style={{ 
                    padding: '10px', 
                    margin: '5px 0', 
                    border: '1px solid #ccc',
                    backgroundColor: result.success ? '#d4edda' : '#f8d7da'
                  }}>
                    <strong>{tableName}:</strong> {result.success ? 'OK' : 'ERROR'}
                    {result.error && (
                      <div style={{ fontSize: '12px', color: '#721c24' }}>
                        Error: {JSON.stringify(result.error, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
        />
      </IonContent>
    </IonPage>
  );
};

export default DatabaseTest;

