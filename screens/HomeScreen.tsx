import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SidebarHotspots } from '../components/SidebarHotspots';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [featureModal, setFeatureModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
  }>({ visible: false, title: '', description: '' });

  const [postOptionsVisible, setPostOptionsVisible] = useState(false);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);

  return (
    <ScreenWrapper asset={ASSETS.asset2}>
      {/* Left Sidebar Navigation */}
      <SidebarHotspots
        currentScreen="home"
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Header Profile Avatar Hotspot (top right) */}
      <TouchableOpacity
        style={styles.avatarButton}
        activeOpacity={0.6}
        onPress={() => onNavigate('profile')}
      />

      {/* Big Hero Button: "CRIAR MEU CONTEÚDO DO DIA >" */}
      <TouchableOpacity
        style={styles.heroButton}
        activeOpacity={0.7}
        onPress={() => {
          onShowToast('Abrindo gerador de conteúdo do dia ✨');
          onNavigate('daily_content');
        }}
      />

      {/* Mini Card 1: "Feito para você" */}
      <TouchableOpacity
        style={styles.miniCard1}
        activeOpacity={0.6}
        onPress={() => {
          setFeatureModal({
            visible: true,
            title: 'Feito para Você',
            description:
              'O algoritmo do Destrave armazena o nicho, o tom de voz e as metas do seu negócio para criar conteúdos personalizados sem você precisar repetir nada.',
          });
        }}
      />

      {/* Mini Card 2: "Execução completa" */}
      <TouchableOpacity
        style={styles.miniCard2}
        activeOpacity={0.6}
        onPress={() => {
          setFeatureModal({
            visible: true,
            title: 'Execução Completa',
            description:
              'Você recebe o roteiro exato: o que gravar, o que falar diante da câmera, o que colocar na tela e a chamada para ação (CTA) para fechar vendas.',
          });
        }}
      />

      {/* Section "Últimos conteúdos" - Button "Ver todos >" */}
      <TouchableOpacity
        style={styles.verTodosButton}
        activeOpacity={0.6}
        onPress={() => onNavigate('my_contents')}
      />

      {/* Card "Bastidores que geram conexão" */}
      <TouchableOpacity
        style={styles.recentCard}
        activeOpacity={0.7}
        onPress={() => onNavigate('daily_content')}
      />

      {/* Play button on the thumbnail */}
      <TouchableOpacity
        style={styles.playButton}
        activeOpacity={0.6}
        onPress={() => onNavigate('stories')}
      />

      {/* Three dots menu on recent card */}
      <TouchableOpacity
        style={styles.threeDotsButton}
        activeOpacity={0.6}
        onPress={() => setPostOptionsVisible(true)}
      />

      {/* Card "IMPULSO DO DIA" */}
      <TouchableOpacity
        style={styles.impulsoCard}
        activeOpacity={0.7}
        onPress={() => setQuoteModalVisible(true)}
      />

      {/* Banner "Comunidade Alpha" */}
      <TouchableOpacity
        style={styles.alphaBanner}
        activeOpacity={0.7}
        onPress={() => onNavigate('alpha')}
      />

      {/* Modal: Info sobre Feature */}
      <Modal
        visible={featureModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeatureModal({ ...featureModal, visible: false })}
      >
        <TouchableWithoutFeedback
          onPress={() => setFeatureModal({ ...featureModal, visible: false })}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="sparkles" size={18} color="#d4af37" />
                    <Text style={styles.modalTitle}>{featureModal.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setFeatureModal({ ...featureModal, visible: false })}
                  >
                    <Ionicons name="close" size={20} color="#665b50" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>{featureModal.description}</Text>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => setFeatureModal({ ...featureModal, visible: false })}
                >
                  <Text style={styles.modalBtnText}>ENTENDI</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Opções do Conteúdo Recente */}
      <Modal
        visible={postOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPostOptionsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPostOptionsVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Bastidores que geram conexão</Text>
                <Text style={styles.modalSubtitle}>Opções para este conteúdo</Text>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setPostOptionsVisible(false);
                    onNavigate('stories');
                  }}
                >
                  <Ionicons name="play-outline" size={20} color="#d4af37" />
                  <Text style={styles.optionText}>Assistir Roteiro em Stories</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setPostOptionsVisible(false);
                    onShowToast('Roteiro copiado para a área de transferência!');
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color="#d4af37" />
                  <Text style={styles.optionText}>Copiar Roteiro Completo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setPostOptionsVisible(false);
                    onShowToast('Conteúdo salvo nos favoritos!');
                  }}
                >
                  <Ionicons name="bookmark-outline" size={20} color="#d4af37" />
                  <Text style={styles.optionText}>Salvar nos Favoritos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { marginTop: 12 }]}
                  onPress={() => setPostOptionsVisible(false)}
                >
                  <Text style={styles.modalBtnText}>FECHAR</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Impulso do Dia */}
      <Modal
        visible={quoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuoteModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setQuoteModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalCard, styles.darkQuoteCard]}>
                <View style={styles.quoteHeader}>
                  <Ionicons name="sparkles" size={18} color="#d4af37" />
                  <Text style={styles.quoteTitle}>IMPULSO DO DIA</Text>
                  <Ionicons name="sparkles" size={18} color="#d4af37" />
                </View>

                <Text style={styles.quoteBody}>
                  "Você não precisa dar conta de tudo hoje. Precisa executar o próximo movimento."
                </Text>

                <Text style={styles.quoteAuthor}>— Destrave by Angladi</Text>

                <TouchableOpacity
                  style={styles.quoteActionBtn}
                  onPress={() => {
                    setQuoteModalVisible(false);
                    onShowToast('Frase inspiradora copiada com sucesso!');
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color="#14100d" />
                  <Text style={styles.quoteActionBtnText}>COPIAR FRASE</Text>
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
    top: '1.6%',
    left: '84.0%',
    width: '12.0%',
    height: '4.4%',
    borderRadius: 25,
  },
  heroButton: {
    position: 'absolute',
    top: '34.0%',
    left: '19.0%',
    width: '78.5%',
    height: '2.8%',
    borderRadius: 25,
  },
  miniCard1: {
    position: 'absolute',
    top: '43.2%',
    left: '17.0%',
    width: '39.0%',
    height: '7.5%',
    borderRadius: 12,
  },
  miniCard2: {
    position: 'absolute',
    top: '43.2%',
    left: '58.0%',
    width: '39.0%',
    height: '7.5%',
    borderRadius: 12,
  },
  verTodosButton: {
    position: 'absolute',
    top: '54.0%',
    left: '74.0%',
    width: '23.0%',
    height: '2.8%',
    borderRadius: 20,
  },
  recentCard: {
    position: 'absolute',
    top: '57.8%',
    left: '17.0%',
    width: '79.0%',
    height: '7.8%',
    borderRadius: 12,
  },
  playButton: {
    position: 'absolute',
    top: '62.0%',
    left: '38.0%',
    width: '7.0%',
    height: '3.0%',
    borderRadius: 15,
  },
  threeDotsButton: {
    position: 'absolute',
    top: '59.5%',
    left: '89.0%',
    width: '7.0%',
    height: '4.5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  impulsoCard: {
    position: 'absolute',
    top: '68.0%',
    left: '17.0%',
    width: '80.0%',
    height: '11.8%',
    borderRadius: 16,
  },
  alphaBanner: {
    position: 'absolute',
    top: '82.5%',
    left: '17.0%',
    width: '80.0%',
    height: '8.5%',
    borderRadius: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fcfaf6',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#e8dcce',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2a1f18',
    marginLeft: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#7b6c5e',
    marginBottom: 14,
  },
  modalDesc: {
    fontSize: 14,
    color: '#4e4236',
    lineHeight: 20,
    marginBottom: 18,
  },
  modalBtn: {
    backgroundColor: '#caa054',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#161008',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ede3d5',
  },
  optionText: {
    fontSize: 14,
    color: '#2d231b',
    fontWeight: '600',
    marginLeft: 12,
  },
  darkQuoteCard: {
    backgroundColor: '#201812',
    borderColor: '#caa054',
    alignItems: 'center',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  quoteTitle: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: 8,
  },
  quoteBody: {
    color: '#faede0',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 14,
  },
  quoteAuthor: {
    color: '#bfa98d',
    fontSize: 12,
    marginBottom: 20,
  },
  quoteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#caa054',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  quoteActionBtnText: {
    color: '#14100d',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
});
