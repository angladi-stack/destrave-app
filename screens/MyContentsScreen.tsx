import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SidebarHotspots } from '../components/SidebarHotspots';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface MyContentsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

interface ContentDetail {
  date: string;
  title: string;
  category: string;
  status: 'Publicado' | 'Salvo' | 'Pronto';
  stories: string;
  reels: string;
  carousel: string;
}

const PAST_CONTENTS: ContentDetail[] = [
  {
    date: '15 SET',
    title: 'Mostre o sabor antes de falar do preço.',
    category: 'Trailer de lanche',
    status: 'Publicado',
    stories: 'Story 1: Close na chapa quente estalando o bacon.\nStory 2: Molho artesanal escorrendo no pão tostado.\nStory 3: Enquete: Qual você pediria agora?',
    reels: 'Roteiro de 30s mostrando a montagem do sanduíche especial em câmera lenta com áudio envolvente.',
    carousel: '6 slides com fotos de clientes, opções do cardápio e combo do fim de semana com promoção no WhatsApp.',
  },
  {
    date: '14 SET',
    title: 'Sua voz também conta uma história.',
    category: 'Cantora',
    status: 'Salvo',
    stories: 'Story 1: Afinador e aquecimento vocal no estúdio.\nStory 2: Trecho acústico do novo single.\nStory 3: Link do Spotify na caixinha de música.',
    reels: 'Vídeo intimista contando o momento em que a letra da música nasceu na madrugada.',
    carousel: 'Carrossel com as estrofes mais marcantes da canção e fotos de bastidores da gravação.',
  },
  {
    date: '13 SET',
    title: 'O detalhe que faz a cliente voltar.',
    category: 'Manicure',
    status: 'Pronto',
    stories: 'Story 1: Cutícula perfeita e acabamento sem manchas.\nStory 2: Esmaltação em gel que dura 20 dias.\nStory 3: Botão de agendamento de quinta a sábado.',
    reels: 'Transformação de unha roída em alongamento natural impecável.',
    carousel: 'Paleta de cores tendências para a primavera e cuidados para manter as unhas fortes.',
  },
];

export const MyContentsScreen: React.FC<MyContentsScreenProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [filter, setFilter] = useState<'Todos' | 'Salvos' | 'Publicados'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<ContentDetail | null>(null);
  const [optionsModalContent, setOptionsModalContent] = useState<ContentDetail | null>(null);

  const handleOpenDetail = (item: ContentDetail) => {
    setSelectedDetail(item);
  };

  return (
    <ScreenWrapper asset={ASSETS.asset5}>
      {/* Left Sidebar Navigation */}
      <SidebarHotspots
        currentScreen="my_contents"
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Header Profile Avatar */}
      <TouchableOpacity
        style={styles.avatarButton}
        activeOpacity={0.6}
        onPress={() => onNavigate('profile')}
      />

      {/* Button: "+ CRIAR CONTEÚDO DO DIA >" */}
      <TouchableOpacity
        style={styles.criarConteudoBtn}
        activeOpacity={0.7}
        onPress={() => {
          onShowToast('Abrindo gerador de conteúdo ✨');
          onNavigate('daily_content');
        }}
      />

      {/* Real Working Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pelo assunto..."
          placeholderTextColor="rgba(90, 80, 70, 0.45)"
          value={searchQuery}
          onChangeText={(txt) => {
            setSearchQuery(txt);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchClearBtn}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={16} color="#776c60" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      {/* "Todos" */}
      <TouchableOpacity
        style={[styles.filterPill, { left: '17.0%', width: '24.0%' }]}
        activeOpacity={0.6}
        onPress={() => {
          setFilter('Todos');
          onShowToast('Exibindo todos os conteúdos');
        }}
      />
      {/* "Salvos" */}
      <TouchableOpacity
        style={[styles.filterPill, { left: '43.0%', width: '25.0%' }]}
        activeOpacity={0.6}
        onPress={() => {
          setFilter('Salvos');
          onShowToast('Filtrado por: Salvos');
        }}
      />
      {/* "Publicados" */}
      <TouchableOpacity
        style={[styles.filterPill, { left: '70.0%', width: '26.0%' }]}
        activeOpacity={0.6}
        onPress={() => {
          setFilter('Publicados');
          onShowToast('Filtrado por: Publicados');
        }}
      />

      {/* Conteúdo de Hoje Card: "CARRO LIMPO É CUIDADO" */}
      <TouchableOpacity
        style={styles.todayCard}
        activeOpacity={0.7}
        onPress={() => onNavigate('daily_content')}
      />

      {/* Button: "ABRIR CONTEÚDO >" */}
      <TouchableOpacity
        style={styles.abrirConteudoBtn}
        activeOpacity={0.7}
        onPress={() => {
          onShowToast('Abrindo conteúdo de hoje ✨');
          onNavigate('daily_content');
        }}
      />

      {/* Past Content Card 1: 15 SET */}
      <TouchableOpacity
        style={styles.pastCard1}
        activeOpacity={0.7}
        onPress={() => handleOpenDetail(PAST_CONTENTS[0])}
      />
      {/* 3-dots on Card 1 */}
      <TouchableOpacity
        style={[styles.threeDotsBtn, { top: '58.5%' }]}
        onPress={() => setOptionsModalContent(PAST_CONTENTS[0])}
      />

      {/* Past Content Card 2: 14 SET */}
      <TouchableOpacity
        style={styles.pastCard2}
        activeOpacity={0.7}
        onPress={() => handleOpenDetail(PAST_CONTENTS[1])}
      />
      {/* 3-dots on Card 2 */}
      <TouchableOpacity
        style={[styles.threeDotsBtn, { top: '69.0%' }]}
        onPress={() => setOptionsModalContent(PAST_CONTENTS[1])}
      />

      {/* Past Content Card 3: 13 SET */}
      <TouchableOpacity
        style={styles.pastCard3}
        activeOpacity={0.7}
        onPress={() => handleOpenDetail(PAST_CONTENTS[2])}
      />
      {/* 3-dots on Card 3 */}
      <TouchableOpacity
        style={[styles.threeDotsBtn, { top: '79.5%' }]}
        onPress={() => setOptionsModalContent(PAST_CONTENTS[2])}
      />

      {/* Modal: Detalhes do Conteúdo Selecionado */}
      <Modal
        visible={selectedDetail !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDetail(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedDetail(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.detailDate}>{selectedDetail?.date} • {selectedDetail?.category}</Text>
                    <Text style={styles.detailTitle}>{selectedDetail?.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDetail(null)}>
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailScroll}>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>📱 STORIES</Text>
                    <Text style={styles.sectionBody}>{selectedDetail?.stories}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>🎬 REELS</Text>
                    <Text style={styles.sectionBody}>{selectedDetail?.reels}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>🖼️ CARROSSEL</Text>
                    <Text style={styles.sectionBody}>{selectedDetail?.carousel}</Text>
                  </View>
                </ScrollView>

                <View style={styles.detailBtnRow}>
                  <TouchableOpacity
                    style={styles.detailActionBtn}
                    onPress={() => {
                      setSelectedDetail(null);
                      onShowToast('Roteiro copiado com sucesso!');
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color="#14100d" />
                    <Text style={styles.detailActionBtnText}>Copiar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionGold]}
                    onPress={() => {
                      setSelectedDetail(null);
                      onNavigate('stories');
                    }}
                  >
                    <Ionicons name="play" size={16} color="#14100d" />
                    <Text style={styles.detailActionBtnText}>Gravar Stories</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Opções do Conteúdo */}
      <Modal
        visible={optionsModalContent !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalContent(null)}
      >
        <TouchableWithoutFeedback onPress={() => setOptionsModalContent(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <Text style={styles.detailTitle}>{optionsModalContent?.title}</Text>
                <Text style={styles.detailDate}>{optionsModalContent?.category} • {optionsModalContent?.status}</Text>

                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    const item = optionsModalContent;
                    setOptionsModalContent(null);
                    if (item) setSelectedDetail(item);
                  }}
                >
                  <Ionicons name="eye-outline" size={18} color="#caa054" />
                  <Text style={styles.actionRowText}>Visualizar Roteiro Completo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    setOptionsModalContent(null);
                    onShowToast('✨ Conteúdo duplicado para hoje!');
                    onNavigate('daily_content');
                  }}
                >
                  <Ionicons name="duplicate-outline" size={18} color="#caa054" />
                  <Text style={styles.actionRowText}>Usar Como Base Hoje</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    setOptionsModalContent(null);
                    onShowToast('Conteúdo copiado!');
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color="#caa054" />
                  <Text style={styles.actionRowText}>Copiar Texto e Legenda</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.detailActionBtn, { width: '100%', marginTop: 12 }]}
                  onPress={() => setOptionsModalContent(null)}
                >
                  <Text style={styles.detailActionBtnText}>Fechar</Text>
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
  criarConteudoBtn: {
    position: 'absolute',
    top: '10.2%',
    left: '17.0%',
    width: '79.0%',
    height: '3.3%',
    borderRadius: 20,
  },
  searchContainer: {
    position: 'absolute',
    top: '16.8%',
    left: '21.0%',
    width: '74.0%',
    height: '3.0%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#2a1f18',
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  searchClearBtn: {
    padding: 4,
  },
  filterPill: {
    position: 'absolute',
    top: '22.6%',
    height: '2.5%',
    borderRadius: 20,
  },
  todayCard: {
    position: 'absolute',
    top: '31.8%',
    left: '16.5%',
    width: '80.0%',
    height: '16.5%',
    borderRadius: 18,
  },
  abrirConteudoBtn: {
    position: 'absolute',
    top: '45.4%',
    left: '60.5%',
    width: '32.5%',
    height: '2.5%',
    borderRadius: 18,
  },
  pastCard1: {
    position: 'absolute',
    top: '56.8%',
    left: '16.5%',
    width: '70.0%',
    height: '8.2%',
    borderRadius: 14,
  },
  pastCard2: {
    position: 'absolute',
    top: '67.2%',
    left: '16.5%',
    width: '70.0%',
    height: '8.2%',
    borderRadius: 14,
  },
  pastCard3: {
    position: 'absolute',
    top: '77.7%',
    left: '16.5%',
    width: '70.0%',
    height: '8.2%',
    borderRadius: 14,
  },
  threeDotsBtn: {
    position: 'absolute',
    left: '84.0%',
    width: '10.0%',
    height: '4.5%',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#e8dcce',
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailDate: {
    fontSize: 12,
    color: '#8b7a6a',
    fontWeight: '600',
    marginBottom: 2,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2a1f18',
    flexShrink: 1,
  },
  detailScroll: {
    maxHeight: 280,
    marginVertical: 10,
  },
  detailSection: {
    backgroundColor: '#f1ede5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#caa054',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#caa054',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: 13,
    color: '#2c221a',
    lineHeight: 18,
  },
  detailBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e7ddce',
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  detailActionGold: {
    backgroundColor: '#caa054',
  },
  detailActionBtnText: {
    color: '#14100d',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ede3d5',
  },
  actionRowText: {
    fontSize: 14,
    color: '#2a1f18',
    fontWeight: '600',
    marginLeft: 10,
  },
});
