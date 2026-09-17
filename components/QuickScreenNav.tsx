import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenName } from '../types';

interface QuickScreenNavProps {
  currentScreen: ScreenName;
  onSelectScreen: (screen: ScreenName) => void;
}

const SCREENS: { id: ScreenName; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'login', label: '1. Login', icon: 'log-in-outline' },
  { id: 'home', label: '2. Início', icon: 'home-outline' },
  { id: 'daily_content', label: '3. Conteúdo do dia', icon: 'sparkles-outline' },
  { id: 'stories', label: '4. Stories', icon: 'play-outline' },
  { id: 'my_contents', label: '5. Meus conteúdos', icon: 'file-tray-full-outline' },
];

export const QuickScreenNav: React.FC<QuickScreenNavProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      {expanded ? (
        <View style={styles.expandedMenu}>
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="layers" size={16} color="#d4af37" />
              <Text style={styles.menuTitle}>Navegar pelas 5 Telas</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setExpanded(false)}
            >
              <Ionicons name="close" size={16} color="#f0dfcf" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.buttonsRow}
          >
            {SCREENS.map((sc) => {
              const isActive = currentScreen === sc.id;
              return (
                <TouchableOpacity
                  key={sc.id}
                  style={[styles.screenBtn, isActive && styles.screenBtnActive]}
                  onPress={() => {
                    onSelectScreen(sc.id);
                    setExpanded(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={sc.icon}
                    size={15}
                    color={isActive ? '#14100d' : '#e0c9a6'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.screenBtnText, isActive && styles.screenBtnTextActive]}
                  >
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => setExpanded(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="phone-portrait-outline" size={14} color="#d4af37" />
          <Text style={styles.pillText}>Alternar Telas (5)</Text>
          <Ionicons name="chevron-up" size={12} color="#d4af37" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 18, 14, 0.92)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  pillText: {
    color: '#e8d2b0',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 5,
  },
  expandedMenu: {
    backgroundColor: 'rgba(20, 14, 10, 0.97)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d4af37',
    padding: 10,
    width: '92%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTitle: {
    color: '#e8d2b0',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 3,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  screenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 33, 25, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  screenBtnActive: {
    backgroundColor: '#d4af37',
    borderColor: '#ffd700',
  },
  screenBtnText: {
    color: '#dfcfbe',
    fontSize: 12,
    fontWeight: '500',
  },
  screenBtnTextActive: {
    color: '#14100d',
    fontWeight: '700',
  },
});
