import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigate,
  onShowToast,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Modals
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const handleLogin = () => {
    Keyboard.dismiss();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      onShowToast('Bem-vindo de volta ao Destrave ✨');
      onLoginSuccess();
    }, 550);
  };

  const handleSendRecovery = () => {
    setForgotModalVisible(false);
    onShowToast('Link de recuperação enviado com sucesso!');
    setRecoveryEmail('');
  };

  return (
    <ScreenWrapper asset={ASSETS.asset1} scrollEnabled={false}>
      {/* Real Email Input Hotspot */}
      <View style={styles.emailContainer}>
        <TextInput
          style={[
            styles.textInput,
            email.length > 0 && styles.textInputFilled,
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor="rgba(80, 70, 60, 0.45)"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
      </View>

      {/* Real Password Input Hotspot */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.textInput,
            password.length > 0 && styles.textInputFilled,
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor="rgba(80, 70, 60, 0.45)"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
      </View>

      {/* Eye icon toggle for password */}
      <TouchableOpacity
        style={styles.eyeButton}
        activeOpacity={0.6}
        onPress={() => setShowPassword(!showPassword)}
      >
        <View style={styles.eyeInner}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#5a4d41"
          />
        </View>
      </TouchableOpacity>

      {/* Checkbox "Lembrar de mim" */}
      <TouchableOpacity
        style={styles.rememberRow}
        activeOpacity={0.7}
        onPress={() => setRememberMe(!rememberMe)}
      >
        <View style={styles.checkboxBox}>
          {rememberMe && (
            <Ionicons name="checkmark" size={16} color="#c89332" />
          )}
        </View>
      </TouchableOpacity>

      {/* Link "Esqueci minha senha" */}
      <TouchableOpacity
        style={styles.forgotLink}
        activeOpacity={0.6}
        onPress={() => {
          setRecoveryEmail(email || 'angladi@email.com');
          setForgotModalVisible(true);
        }}
      />

      {/* Button "ENTRAR >" */}
      <TouchableOpacity
        style={styles.entrarButton}
        activeOpacity={0.75}
        onPress={handleLogin}
      >
        {loading && (
          <View style={styles.spinnerOverlay}>
            <ActivityIndicator size="small" color="#4a2e05" />
          </View>
        )}
      </TouchableOpacity>

      {/* Button "QUERO CONHECER O DESTRAVE" */}
      <TouchableOpacity
        style={styles.conhecerButton}
        activeOpacity={0.7}
        onPress={() => setInfoModalVisible(true)}
      />

      {/* Modal: Esqueci Minha Senha */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setForgotModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="key-outline" size={20} color="#d4af37" />
                    <Text style={styles.modalTitle}>Recuperar Senha</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setForgotModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  Informe seu e-mail cadastrado para receber as instruções de recuperação de acesso.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Seu e-mail"
                  placeholderTextColor="#998d80"
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.8}
                  onPress={handleSendRecovery}
                >
                  <Text style={styles.modalPrimaryBtnText}>ENVIAR INSTRUÇÕES</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Quero Conhecer o Destrave */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setInfoModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="sparkles" size={20} color="#d4af37" />
                    <Text style={styles.modalTitle}>Destrave by Angladi</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setInfoModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  O Destrave é a plataforma de geração diária de conteúdos estratégicos que entende o seu negócio e entrega Stories, Reels e Carrosséis prontos para execução.
                </Text>

                <View style={styles.featureItem}>
                  <Ionicons name="flash-outline" size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Estratégia completa gerada em segundos</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="videocam-outline" size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Roteiros de Stories e Reels prontos para falar</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up-outline" size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Foco em atração e conversão de clientes</Text>
                </View>

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setInfoModalVisible(false);
                    onLoginSuccess();
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>ENTRAR EM MODO DEMO</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  emailContainer: {
    position: 'absolute',
    top: '48.8%',
    left: '22.0%',
    width: '63.0%',
    height: '5.6%',
    justifyContent: 'center',
  },
  passwordContainer: {
    position: 'absolute',
    top: '56.0%',
    left: '22.0%',
    width: '56.0%',
    height: '5.6%',
    justifyContent: 'center',
  },
  textInput: {
    width: '100%',
    height: '100%',
    color: '#2a1f18',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  textInputFilled: {
    backgroundColor: '#ffffff',
  },
  eyeButton: {
    position: 'absolute',
    top: '56.0%',
    left: '78.5%',
    width: '9.0%',
    height: '5.6%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  eyeInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  rememberRow: {
    position: 'absolute',
    top: '62.7%',
    left: '12.2%',
    width: '38.0%',
    height: '4.2%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotLink: {
    position: 'absolute',
    top: '62.7%',
    left: '60.0%',
    width: '30.0%',
    height: '4.2%',
  },
  entrarButton: {
    position: 'absolute',
    top: '68.5%',
    left: '12.5%',
    width: '75.0%',
    height: '5.9%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 235, 180, 0.4)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conhecerButton: {
    position: 'absolute',
    top: '80.3%',
    left: '12.5%',
    width: '75.0%',
    height: '5.9%',
    borderRadius: 30,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fbf8f4',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#e8d5b8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2a1f18',
    marginLeft: 8,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6e5e50',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8c8b4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2a1f18',
    marginBottom: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: '#caa054',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#caa054',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalPrimaryBtnText: {
    color: '#1a1209',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#43372c',
    marginLeft: 8,
    fontWeight: '500',
  },
});
