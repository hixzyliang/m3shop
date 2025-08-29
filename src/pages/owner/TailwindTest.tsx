import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Layout from '../../components/Layout';

const TailwindTest: React.FC = () => {
  return (
    <IonPage>
      <IonContent>
        <Layout title="Tailwind Test">
          <div className="page-container">
            {/* Test Tailwind Classes */}
            <div className="bg-blue-500 text-white p-6 rounded-lg mb-4">
              <h1 className="text-2xl font-bold">Tailwind CSS Test</h1>
              <p className="text-blue-100">Jika Anda melihat styling ini, Tailwind CSS berfungsi!</p>
            </div>

            {/* Grid Test */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-500 text-white p-4 rounded-lg">
                <h3 className="font-semibold">Card 1</h3>
                <p>Grid responsive</p>
              </div>
              <div className="bg-purple-500 text-white p-4 rounded-lg">
                <h3 className="font-semibold">Card 2</h3>
                <p>Hover effects</p>
              </div>
              <div className="bg-red-500 text-white p-4 rounded-lg">
                <h3 className="font-semibold">Card 3</h3>
                <p>Tailwind utilities</p>
              </div>
            </div>

            {/* Button Test */}
            <div className="space-x-4 mb-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Primary Button
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                Secondary Button
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                Success Button
              </button>
            </div>

            {/* Form Test */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Test</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="Enter your password"
                  />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                  Submit
                </button>
              </div>
            </div>
          </div>
        </Layout>
      </IonContent>
    </IonPage>
  );
};

export default TailwindTest;

