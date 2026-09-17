import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { ScreenName } from '../types';

interface SidebarHotspotsProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  onShowToast?: (msg: string) => void;
}

export const SidebarHotspots: React.FC<SidebarHotspotsProps> = ({
  currentScreen,
  onNavigate,
  onShowToast,
}) => {
  return (
    <>
      {/* Logo Destrave top left */}
      <TouchableOpacity
        style={[styles.hotspot, styles.logoSpot]}
        activeOpacity={0.6}
        onPress={() => {
          onShowToast?.('Destrave by Angladi ✨');
          if (currentScreen !== 'home') onNavigate('home');
        }}
      />

      {/* Início item */}
      <TouchableOpacity
        style={[styles.hotspot, styles.inicioSpot]}
        activeOpacity={0.6}
        onPress={() => onNavigate('home')}
      />

      {/* Conteúdo item (navigates to Meus Conteúdos) */}
      <TouchableOpacity
        style={[styles.hotspot, styles.conteudoSpot]}
        activeOpacity={0.6}
        onPress={() => onNavigate('my_contents')}
      />

      {/* Meu trabalho item */}
      <TouchableOpacity
        style={[styles.hotspot, styles.meuTrabalhoSpot]}
        activeOpacity={0.6}
        onPress={() => onNavigate('work_profile')}
      />

      {/* Perfil item */}
      <TouchableOpacity
        style={[styles.hotspot, styles.perfilSpot]}
        activeOpacity={0.6}
        onPress={() => onNavigate('profile')}
      />

      {/* Alpha item */}
      <TouchableOpacity
        style={[styles.hotspot, styles.alphaSpot]}
        activeOpacity={0.6}
        onPress={() => onNavigate('alpha')}
      />
    </>
  );
};

const styles = StyleSheet.create({
  hotspot: {
    position: 'absolute',
    left: '0%',
    width: '15%',
    zIndex: 10,
    // subtle touch feedback
  },
  logoSpot: {
    top: '1.5%',
    height: '7.5%',
  },
  inicioSpot: {
    top: '10.5%',
    height: '7.5%',
  },
  conteudoSpot: {
    top: '18.5%',
    height: '7.5%',
  },
  meuTrabalhoSpot: {
    top: '26.0%',
    height: '7.5%',
  },
  perfilSpot: {
    top: '33.0%',
    height: '7.5%',
  },
  alphaSpot: {
    top: '40.0%',
    height: '7.5%',
  },
});
