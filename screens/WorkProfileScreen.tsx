import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SidebarHotspots } from '../components/SidebarHotspots';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface WorkProfileScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

export const WorkProfileScreen: React.FC<WorkProfileScreenProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState({ title: '', value: '' });

  const handleOpenEdit = (title: string, value: string) => {
    setEditField({ title, value });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    setEditModalVisible(false);
    onShowToast(`Campo "${editField.title}" atualizado na memória do Destrave ✨`);
  };

  return (
    <ScreenWrapper asset={ASSETS.asset6}>
      <SidebarHotspots
        currentScreen="work_profile"
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Header Profile Avatar */}
      <TouchableOpacity
        style={styles.avatarButton}
        activeOpacity={0.6}
        onPress={() => onNavigate('profile')}
      />

      {/* Button "Editar tudo" */}
      <TouchableOpacity
        style={styles.editarTudoBtn}
        activeOpacity={0.7}
        onPress={() => handleOpenEdit('Perfil Completo', 'Lavagem e higienização de veículos')}
      />

      {/* Item 1: O que você faz */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '30.0%' }]}
        onPress={() => handleOpenEdit('O que você faz', 'Lavagem e higienização de veículos')}
      />

      {/* Item 2: Para quem */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '35.5%' }]}
        onPress={() => handleOpenEdit('Para quem', 'Pessoas que querem cuidar bem do carro')}
      />

      {/* Item 3: Problema que resolve */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '41.5%' }]}
        onPress={() => handleOpenEdit('Problema que resolve', 'Carro sujo, com manchas ou mau cheiro')}
      />

      {/* Item 4: Resultado que entrega */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '47.5%' }]}
        onPress={() => handleOpenEdit('Resultado que entrega', 'Um carro limpo, cuidado e agradável')}
      />

      {/* Tom de voz */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '56.5%' }]}
        onPress={() => handleOpenEdit('Tom de voz', 'Natural, Direto, Confiável')}
      />

      {/* Seu diferencial */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '62.5%' }]}
        onPress={() => handleOpenEdit('Seu diferencial', 'Cuidado nos detalhes e atendimento rápido')}
      />

      {/* Produto 1: Lavagem completa */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '72.0%' }]}
        onPress={() => handleOpenEdit('Serviço Principal', 'Lavagem completa automotiva')}
      />

      {/* Produto 2: Higienização interna */}
      <TouchableOpacity
        style={[styles.fieldRow, { top: '76.8%' }]}
        onPress={() => handleOpenEdit('Serviço Secundário', 'Higienização interna e estofados')}
      />

      {/* "+ Adicionar outro" */}
      <TouchableOpacity
        style={styles.addOutroBtn}
        activeOpacity={0.7}
        onPress={() => handleOpenEdit('Novo Serviço', '')}
      />

      {/* Button: "ATUALIZAR MINHAS INFORMAÇÕES >" */}
      <TouchableOpacity
        style={styles.atualizarBtn}
        activeOpacity={0.7}
        onPress={() => onShowToast('✨ Informações sincronizadas com o Destrave IA!')}
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Editar {editField.title}</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.editInput}
                  value={editField.value}
                  onChangeText={(val) => setEditField({ ...editField, value: val })}
                  multiline
                  placeholder="Digite aqui..."
                  placeholderTextColor="#998d80"
                />

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.modalPrimaryBtnText}>SALVAR ALTERAÇÃO</Text>
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
  avatarButton: {
    position: 'absolute',
    top: '1.5%',
    left: '84.0%',
    width: '12.0%',
    height: '4.4%',
    borderRadius: 25,
  },
  editarTudoBtn: {
    position: 'absolute',
    top: '25.8%',
    left: '75.0%',
    width: '21.0%',
    height: '2.5%',
    borderRadius: 15,
  },
  fieldRow: {
    position: 'absolute',
    left: '17.0%',
    width: '79.0%',
    height: '5.2%',
  },
  addOutroBtn: {
    position: 'absolute',
    top: '81.5%',
    left: '17.0%',
    width: '79.0%',
    height: '3.5%',
    borderRadius: 12,
  },
  atualizarBtn: {
    position: 'absolute',
    top: '92.2%',
    left: '17.0%',
    width: '79.0%',
    height: '4.2%',
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2a1f18',
  },
  editInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8c8b4',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#2a1f18',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: '#caa054',
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#161008',
    fontWeight: '700',
    fontSize: 13,
  },
});
