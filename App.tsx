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

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [isSplash, setIsSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
      ) : !isLoggedIn ? (
        <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      ) : screen === 'dashboard' ? (
        <DashboardScreen
          onLogout={() => setIsLoggedIn(false)}
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
