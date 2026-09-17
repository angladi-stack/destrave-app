import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SidebarHotspots } from '../components/SidebarHotspots';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onLogout,
  onNavigate,
  onShowToast,
}) => {
  const [dailyReminder, setDailyReminder] = useState(true);
  const [newsletters, setNewsletters] = useState(true);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const handleChangePassword = () => {
    setPasswordModalVisible(false);
    onShowToast('Senha alterada com sucesso! 🔒');
    setCurrentPass('');
    setNewPass('');
  };

  return (
    <ScreenWrapper asset={ASSETS.asset7}>
      <SidebarHotspots
        currentScreen="profile"
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Button "Editar dados" on profile card */}
      <TouchableOpacity
        style={styles.editarDadosBtn}
        activeOpacity={0.7}
        onPress={() => onShowToast('Edição rápida de nome e e-mail aberta!')}
      />

      {/* Toggle 1: Lembrete diário */}
      <TouchableOpacity
        style={[styles.switchRow, { top: '52.5%' }]}
        activeOpacity={0.7}
        onPress={() => {
          const nextVal = !dailyReminder;
          setDailyReminder(nextVal);
          onShowToast(nextVal ? 'Lembretes diários ativados 🔔' : 'Lembretes silenciados 🔕');
        }}
      />

      {/* Toggle 2: Novidades do Destrave */}
      <TouchableOpacity
        style={[styles.switchRow, { top: '59.5%' }]}
        activeOpacity={0.7}
        onPress={() => {
          const nextVal = !newsletters;
          setNewsletters(nextVal);
          onShowToast(nextVal ? 'Notificações de novidades ativadas ✨' : 'Notificações silenciadas');
        }}
      />

      {/* "Alterar minha senha" */}
      <TouchableOpacity
        style={[styles.securityRow, { top: '71.5%' }]}
        activeOpacity={0.7}
        onPress={() => setPasswordModalVisible(true)}
      />

      {/* "Esqueci minha senha" */}
      <TouchableOpacity
        style={[styles.securityRow, { top: '77.5%' }]}
        activeOpacity={0.7}
        onPress={() => onShowToast('Instruções de redefinição enviadas para angladi@email.com')}
      />

      {/* "Falar com o suporte" */}
      <TouchableOpacity
        style={[styles.securityRow, { top: '83.5%' }]}
        activeOpacity={0.7}
        onPress={() => setSupportModalVisible(true)}
      />

      {/* Button: "SAIR DA CONTA" */}
      <TouchableOpacity
        style={styles.logoutBtn}
        activeOpacity={0.7}
        onPress={() => {
          onShowToast('Sessão encerrada com sucesso.');
          onLogout();
        }}
      />

      {/* Modal: Alterar Senha */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPasswordModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Alterar Senha</Text>
                  <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Senha atual"
                  placeholderTextColor="#998d80"
                  secureTextEntry
                  value={currentPass}
                  onChangeText={setCurrentPass}
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Nova senha"
                  placeholderTextColor="#998d80"
                  secureTextEntry
                  value={newPass}
                  onChangeText={setNewPass}
                />

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={handleChangePassword}
                >
                  <Text style={styles.modalPrimaryBtnText}>SALVAR NOVA SENHA</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Suporte */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSupportModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Suporte Destrave</Text>
                  <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDesc}>
                  Nosso time de atendimento está pronto para te ajudar com dúvidas técnicas ou estratégicas.
                </Text>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => {
                    setSupportModalVisible(false);
                    onShowToast('Abrindo atendimento WhatsApp Destrave...');
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalPrimaryBtnText, { color: '#ffffff' }]}>INICIAR NO WHATSAPP</Text>
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
  editarDadosBtn: {
    position: 'absolute',
    top: '19.0%',
    left: '68.0%',
    width: '26.0%',
    height: '3.5%',
    borderRadius: 20,
  },
  switchRow: {
    position: 'absolute',
    left: '17.0%',
    width: '79.0%',
    height: '5.5%',
  },
  securityRow: {
    position: 'absolute',
    left: '17.0%',
    width: '79.0%',
    height: '5.5%',
  },
  logoutBtn: {
    position: 'absolute',
    top: '89.5%',
    left: '17.0%',
    width: '79.0%',
    height: '4.8%',
    borderRadius: 25,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#faf7f2',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#e8dcce',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2a1f18',
  },
  modalDesc: {
    fontSize: 14,
    color: '#554638',
    lineHeight: 20,
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8c8b4',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#2a1f18',
    marginBottom: 12,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#caa054',
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalPrimaryBtnText: {
    color: '#161008',
    fontWeight: '700',
    fontSize: 13,
  },
});
