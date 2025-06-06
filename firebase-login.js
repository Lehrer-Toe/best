import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginSystem() {
  // Zustände für Login-Prozess
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Formular-Daten
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // App-Initialisierung - Login wird ZUERST geladen
  useEffect(() => {
    // Simuliere App-Initialisierung
    const initApp = async () => {
      try {
        // Kurze Verzögerung für realistisches Laden
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsAppReady(true);
      } catch (error) {
        console.error('App-Initialisierung fehlgeschlagen:', error);
        setLoginError('App konnte nicht geladen werden. Bitte Seite neu laden.');
      }
    };
    
    initApp();
  }, []);

  // Login-Funktion mit robuster Fehlerbehandlung
  const handleLogin = async () => {
    // Validierung
    if (!formData.username || !formData.password) {
      setLoginError('Bitte alle Felder ausfüllen');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');
    setLoginSuccess(false);

    try {
      // Simuliere API-Call mit Timeout
      const loginPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simuliere erfolgreiche Anmeldung
          if (formData.username === 'admin' && formData.password === 'admin') {
            resolve({ success: true, user: formData.username });
          } else {
            reject(new Error('Ungültige Anmeldedaten'));
          }
        }, 1500);
      });

      // Timeout nach 10 Sekunden
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Zeitüberschreitung bei der Anmeldung')), 10000);
      });

      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      // Erfolgreiche Anmeldung
      setLoginSuccess(true);
      setTimeout(() => {
        setIsLoggedIn(true);
      }, 1000);
      
    } catch (error) {
      setLoginError(error.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout-Funktion
  const handleLogout = () => {
    setIsLoggedIn(false);
    setFormData({ username: '', password: '' });
    setLoginSuccess(false);
  };

  // Input-Handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setLoginError(''); // Clear error when user types
  };

  // Enter-Taste Handler
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoggingIn) {
      handleLogin();
    }
  };

  // Zeige Ladebildschirm während App-Initialisierung
  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">App wird geladen...</p>
        </div>
      </div>
    );
  }

  // Hauptinhalt nach erfolgreicher Anmeldung
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Willkommen, {formData.username}!
            </h1>
            <p className="text-gray-600 mb-6">Sie sind erfolgreich angemeldet.</p>
            <button
              onClick={handleLogout}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login-Formular
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Anmeldung
        </h1>

        {/* Erfolgs-Nachricht */}
        {loginSuccess && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Anmeldung erfolgreich! Einen Moment...
          </div>
        )}

        {/* Fehler-Nachricht */}
        {loginError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {loginError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoggingIn}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Benutzername eingeben"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoggingIn}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Passwort eingeben"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Anmeldung läuft...
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Test-Anmeldedaten:</p>
          <p className="font-mono">Benutzer: admin | Passwort: admin</p>
        </div>
      </div>
    </div>
  );
}
