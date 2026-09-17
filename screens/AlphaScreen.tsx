import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SidebarHotspots } from '../components/SidebarHotspots';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface AlphaScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

export const AlphaScreen: React.FC<AlphaScreenProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [registered, setRegistered] = useState(false);

  const handleRegister = () => {
    setRegistered(true);
    onShowToast('✨ Você está na lista VIP da Comunidade Alpha!');
  };

  return (
    <ScreenWrapper asset={ASSETS.asset8}>
      <SidebarHotspots
        currentScreen="alpha"
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Header Profile Avatar */}
      <TouchableOpacity
        style={styles.avatarButton}
        activeOpacity={0.6}
        onPress={() => onNavigate('profile')}
      />

      {/* Hero card click */}
      <TouchableOpacity
        style={styles.heroCard}
        activeOpacity={0.8}
        onPress={() => onShowToast('A Comunidade Alpha reunirá os maiores criadores e líderes do Destrave.')}
      />

      {/* Button: "QUERO SER AVISADO >" */}
      <TouchableOpacity
        style={styles.avisadoBtn}
        activeOpacity={0.7}
        onPress={handleRegister}
      />

      {/* Bottom Quote card */}
      <TouchableOpacity
        style={styles.quoteCard}
        activeOpacity={0.8}
        onPress={() => onShowToast('✨ "Imparáveis não são os que nunca travam. São os que sempre voltam a se mover."')}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  avatarButton: {
    position: 'absolute',
    top: '1.5%',
    left: '84.0%',
    width: '12.0%',
    height: '4.4%',
    borderRadius: 25,
  },
  heroCard: {
    position: 'absolute',
    top: '10.0%',
    left: '17.0%',
    width: '79.0%',
    height: '35.5%',
    borderRadius: 18,
  },
  avisadoBtn: {
    position: 'absolute',
    top: '60.5%',
    left: '20.0%',
    width: '73.0%',
    height: '4.5%',
    borderRadius: 25,
  },
  quoteCard: {
    position: 'absolute',
    top: '71.5%',
    left: '17.0%',
    width: '79.0%',
    height: '15.5%',
    borderRadius: 18,
  },
});
