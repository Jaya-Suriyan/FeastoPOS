/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LiveOrdersScreen from './src/screens/LiveOrdersScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [isSplash, setIsSplash] = useState(true);
  const { isAuthenticated, logout } = useAuth();
  const [screen, setScreen] = useState<'dashboard' | 'liveOrders'>('dashboard');

  useEffect(() => {
    const t = setTimeout(() => setIsSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
        },
      ]}
    >
      {isSplash ? (
        <SplashScreen />
      ) : !isAuthenticated ? (
        <LoginScreen onLogin={() => { /* handled inside context */ }} />
      ) : screen === 'dashboard' ? (
        <DashboardScreen
          onLogout={() => logout()}
          onLiveOrders={() => setScreen('liveOrders')}
        />
      ) : (
        <LiveOrdersScreen onBack={() => setScreen('dashboard')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
