import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenName, ToastMessage } from './types';
import { Toast } from './components/Toast';
import { clearSession, loadSession, saveSession } from './services/storage';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DailyContentScreen } from './screens/DailyContentScreen';
import { StoriesScreen } from './screens/StoriesScreen';
import { MyContentsScreen } from './screens/MyContentsScreen';
import { WorkProfileScreen } from './screens/WorkProfileScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AlphaScreen } from './screens/AlphaScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenName>('login');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [storyIndex, setStoryIndex] = useState<number>(0);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    loadSession()
      .then((session) => {
        if (session?.active) setCurrentScreen('home');
      })
      .finally(() => setSessionReady(true));
  }, []);

  const showToast = useCallback((text: string) => {
    setToast({
      id: Date.now().toString(),
      text,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  if (!fontsLoaded || !sessionReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#d4af37" />
      </View>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={() => {
              void saveSession('usuario@destrave.app');
              setCurrentScreen('home');
            }}
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      case 'home':
        return (
          <HomeScreen
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      case 'daily_content':
        return (
          <DailyContentScreen
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
            onOpenStoryAt={(idx) => {
              setStoryIndex(idx);
              setCurrentScreen('stories');
            }}
          />
        );
      case 'stories':
        return (
          <StoriesScreen
            initialStoryIndex={storyIndex}
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      case 'my_contents':
        return (
          <MyContentsScreen
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      case 'work_profile':
        return (
          <WorkProfileScreen
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onLogout={() => {
              void clearSession();
              setCurrentScreen('login');
            }}
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      case 'alpha':
        return (
          <AlphaScreen
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
      default:
        return (
          <LoginScreen
            onLoginSuccess={() => {
              void saveSession('usuario@destrave.app');
              setCurrentScreen('home');
            }}
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {renderScreen()}

      {/* Global Toast */}
      <Toast toast={toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#120f0d',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#120f0d',
  },
});
