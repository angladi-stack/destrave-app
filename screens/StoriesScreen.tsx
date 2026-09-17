import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ASSETS } from '../constants/assets';
import { ScreenName, StorySlide } from '../types';

interface StoriesScreenProps {
  initialStoryIndex?: number;
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
}

const STORIES_DATA: StorySlide[] = [
  {
    id: 1,
    title: 'Gancho e Quebra de Padrão',
    tag: 'Story 1 de 3',
    whatToShow: 'Aproxime a câmera de um tapete ou banco sujo do carro.',
    whatToSay: 'Seu carro pode parecer limpo por fora e ainda esconder isso aqui.',
    onScreenText: 'Olha onde a sujeira se esconde.',
  },
  {
    id: 2,
    title: 'Processo e Sensação de Cuidado',
    tag: 'Story 2 de 3',
    whatToShow: 'Comece a limpeza com o aspirador ou produto em ação.',
    whatToSay: 'É por isso que uma limpeza bem-feita muda até a sensação de entrar no carro.',
    onScreenText: 'O cuidado que você não vê, mas sente.',
  },
  {
    id: 3,
    title: 'Interação e Chamada para Ação',
    tag: 'Story 3 de 3',
    whatToShow: 'Mostre um detalhe do acabamento já perfeitamente limpo.',
    whatToSay: 'Quem cuida do carro sabe o prazer que dá ver tudo impecável.',
    interactionQuestion: 'Você lembra da última limpeza interna?',
    interactionType: 'poll',
    pollOptions: ['Sim', 'Faz tempo'],
    pollVotes: [28, 72],
  },
];

export const StoriesScreen: React.FC<StoriesScreenProps> = ({
  initialStoryIndex = 0,
  onNavigate,
  onShowToast,
}) => {
  const [currentIdx, setCurrentIdx] = useState(initialStoryIndex);
  const [votedOption, setVotedOption] = useState<number | null>(null);
  const [recordedStories, setRecordedStories] = useState<boolean[]>([false, false, false]);

  // Teleprompter Recording Mode
  const [teleprompterActive, setTeleprompterActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const activeStory = STORIES_DATA[currentIdx];

  // Story progress animation bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 8000,
      useNativeDriver: false,
    }).start();
  }, [currentIdx]);

  const handleNext = () => {
    if (currentIdx < STORIES_DATA.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onShowToast('🎉 Você completou todos os 3 stories de hoje!');
      onNavigate('daily_content');
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleVote = (optionIndex: number) => {
    if (votedOption === null) {
      setVotedOption(optionIndex);
      onShowToast(`Voto registrado em "${activeStory.pollOptions?.[optionIndex]}"!`);
    }
  };

  const handleCopyScript = () => {
    const text = `STORY ${activeStory.id}:\nO que mostrar: ${activeStory.whatToShow}\nO que falar: "${activeStory.whatToSay}"\nTexto na tela: "${activeStory.onScreenText || ''}"`;
    onShowToast(`📋 Roteiro do Story ${activeStory.id} copiado!`);
  };

  const handleMarkAsRecorded = () => {
    const updated = [...recordedStories];
    updated[currentIdx] = !updated[currentIdx];
    setRecordedStories(updated);
    if (updated[currentIdx]) {
      onShowToast(`✅ Story ${activeStory.id} gravado com sucesso!`);
    }
  };

  const startTeleprompter = () => {
    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countInterval);
          setTeleprompterActive(true);
          setRecordingSeconds(0);
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  useEffect(() => {
    let timer: any;
    if (teleprompterActive) {
      timer = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teleprompterActive]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Visual Background: sunrise mountains from Destrave branding */}
        <Image
          source={ASSETS.asset1.local}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkGradientOverlay} />

        {/* Top Story Segmented Progress Bars */}
        <View style={styles.progressRow}>
          {STORIES_DATA.map((_, i) => {
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;

            return (
              <View key={i} style={styles.progressBarTrack}>
                {isCompleted && <View style={[styles.progressBarFill, { width: '100%' }]} />}
                {isCurrent && (
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Top Bar Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerProfile}>
            <View style={styles.goldBadge}>
              <Ionicons name="sparkles" size={14} color="#14100d" />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Destrave Stories</Text>
              <Text style={styles.headerSubtitle}>{activeStory.tag} • Lava-Jato</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => onNavigate('daily_content')}
            >
              <Ionicons name="close" size={24} color="#fdfbf7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Left / Right touch zones for previous/next story */}
        <TouchableOpacity
          style={styles.touchZoneLeft}
          onPress={handlePrev}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={styles.touchZoneRight}
          onPress={handleNext}
          activeOpacity={1}
        />

        {/* Center Story Content Card (Glassmorphism) */}
        <View style={styles.storyCardContainer} pointerEvents="box-none">
          <View style={styles.glassCard}>
            <View style={styles.badgeRow}>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>PASSO {activeStory.id}</Text>
              </View>
              <Text style={styles.cardHeaderTitle}>{activeStory.title}</Text>
            </View>

            {/* Instruction: O QUE MOSTRAR */}
            <View style={styles.instructionBlock}>
              <View style={styles.instructionHeader}>
                <Ionicons name="camera-outline" size={16} color="#d4af37" />
                <Text style={styles.instructionTitle}>O QUE MOSTRAR NA CÂMERA</Text>
              </View>
              <Text style={styles.instructionBody}>{activeStory.whatToShow}</Text>
            </View>

            {/* Instruction: O QUE FALAR */}
            <View style={[styles.instructionBlock, styles.quoteHighlight]}>
              <View style={styles.instructionHeader}>
                <Ionicons name="mic-outline" size={16} color="#caa054" />
                <Text style={styles.instructionTitle}>O QUE FALAR</Text>
              </View>
              <Text style={styles.speechQuote}>"{activeStory.whatToSay}"</Text>
            </View>

            {/* Instruction: TEXTO NA TELA */}
            {activeStory.onScreenText && (
              <View style={styles.instructionBlock}>
                <View style={styles.instructionHeader}>
                  <Ionicons name="text-outline" size={16} color="#d4af37" />
                  <Text style={styles.instructionTitle}>TEXTO PARA DIGITAR NA TELA</Text>
                </View>
                <View style={styles.onScreenPill}>
                  <Text style={styles.onScreenText}>"{activeStory.onScreenText}"</Text>
                </View>
              </View>
            )}

            {/* Interactive Poll Sticker for Story 3 */}
            {activeStory.interactionType === 'poll' && (
              <View style={styles.pollStickerContainer}>
                <View style={styles.pollSticker}>
                  <Text style={styles.pollQuestion}>
                    {activeStory.interactionQuestion}
                  </Text>
                  <View style={styles.pollOptionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.pollOptionBtn,
                        votedOption === 0 && styles.pollOptionVoted,
                      ]}
                      onPress={() => handleVote(0)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pollOptionText}>
                        {activeStory.pollOptions?.[0]}
                      </Text>
                      {votedOption !== null && (
                        <Text style={styles.pollPercentage}>
                          {activeStory.pollVotes?.[0]}%
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.pollOptionBtn,
                        votedOption === 1 && styles.pollOptionVoted,
                      ]}
                      onPress={() => handleVote(1)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pollOptionText}>
                        {activeStory.pollOptions?.[1]}
                      </Text>
                      {votedOption !== null && (
                        <Text style={styles.pollPercentage}>
                          {activeStory.pollVotes?.[1]}%
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {votedOption !== null && (
                    <Text style={styles.pollThanksText}>
                      ✓ Enquete ativa para engajamento dos seus seguidores!
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Stories Switcher Navigation */}
        <View style={styles.bottomDock} pointerEvents="box-none">
          {/* Quick jump between Story 1, 2, 3 */}
          <View style={styles.storyPillsRow}>
            {STORIES_DATA.map((st, i) => {
              const isActive = i === currentIdx;
              const isDone = recordedStories[i];
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.bottomStoryPill,
                    isActive && styles.bottomStoryPillActive,
                  ]}
                  onPress={() => setCurrentIdx(i)}
                >
                  <Text
                    style={[
                      styles.bottomStoryPillText,
                      isActive && styles.bottomStoryPillTextActive,
                    ]}
                  >
                    Story {st.id} {isDone ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={handleCopyScript}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={17} color="#d4af37" />
              <Text style={styles.actionBtnSecondaryText}>Copiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={startTeleprompter}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={18} color="#14100d" />
              <Text style={styles.actionBtnPrimaryText}>Gravar c/ Teleprompter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtnSecondary,
                recordedStories[currentIdx] && styles.actionBtnDone,
              ]}
              onPress={handleMarkAsRecorded}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  recordedStories[currentIdx]
                    ? 'checkmark-circle'
                    : 'checkmark-circle-outline'
                }
                size={18}
                color={recordedStories[currentIdx] ? '#4cd964' : '#d4af37'}
              />
              <Text
                style={[
                  styles.actionBtnSecondaryText,
                  recordedStories[currentIdx] && { color: '#4cd964' },
                ]}
              >
                {recordedStories[currentIdx] ? 'Gravado' : 'Feito'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Countdown Overlay (3..2..1) */}
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownSub}>Prepare-se para falar...</Text>
          </View>
        )}

        {/* Fullscreen Teleprompter Modal */}
        <Modal
          visible={teleprompterActive}
          transparent
          animationType="slide"
          onRequestClose={() => setTeleprompterActive(false)}
        >
          <View style={styles.teleprompterContainer}>
            {/* Top Recording Bar */}
            <View style={styles.teleTopBar}>
              <View style={styles.recordingBadge}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>
                  00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </Text>
              </View>

              <Text style={styles.teleTitle}>Teleprompter • Story {activeStory.id}</Text>

              <TouchableOpacity
                style={styles.teleCloseBtn}
                onPress={() => setTeleprompterActive(false)}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Camera Frame Simulation */}
            <View style={styles.cameraFrame}>
              <View style={styles.cameraCornerTL} />
              <View style={styles.cameraCornerTR} />
              <View style={styles.cameraCornerBL} />
              <View style={styles.cameraCornerBR} />
              <Text style={styles.cameraHint}>Olhe para a câmera do celular</Text>
            </View>

            {/* Giant Teleprompter Script */}
            <ScrollView
              style={styles.teleScroll}
              contentContainerStyle={styles.teleScrollContent}
            >
              <Text style={styles.teleDirection}>
                [AÇÃO]: {activeStory.whatToShow}
              </Text>
              <Text style={styles.teleTextBig}>
                "{activeStory.whatToSay}"
              </Text>
              {activeStory.onScreenText && (
                <Text style={styles.teleOnScreen}>
                  [TEXTO NA TELA]: {activeStory.onScreenText}
                </Text>
              )}
            </ScrollView>

            {/* Bottom Controls */}
            <View style={styles.teleBottomBar}>
              <TouchableOpacity
                style={styles.finishRecordingBtn}
                onPress={() => {
                  setTeleprompterActive(false);
                  handleMarkAsRecorded();
                  onShowToast(`🎉 Story ${activeStory.id} gravado com sucesso!`);
                  handleNext();
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#14100d" />
                <Text style={styles.finishRecordingText}>Concluir e Avançar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c0908',
  },
  container: {
    flex: 1,
    position: 'relative',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
  },
  darkGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 10, 8, 0.65)',
  },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 20,
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    marginHorizontal: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#caa054',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 20,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#caa054',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextCol: {},
  headerTitle: {
    color: '#fdfbf7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#e0c9a6',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 6,
    marginLeft: 6,
  },
  touchZoneLeft: {
    position: 'absolute',
    top: 60,
    left: 0,
    width: '30%',
    bottom: 140,
    zIndex: 5,
  },
  touchZoneRight: {
    position: 'absolute',
    top: 60,
    right: 0,
    width: '30%',
    bottom: 140,
    zIndex: 5,
  },
  storyCardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  glassCard: {
    backgroundColor: 'rgba(24, 18, 14, 0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(202, 160, 84, 0.4)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepPill: {
    backgroundColor: '#caa054',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  stepPillText: {
    color: '#14100d',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cardHeaderTitle: {
    color: '#fdfbf7',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  instructionBlock: {
    marginBottom: 14,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructionTitle: {
    color: '#caa054',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  instructionBody: {
    color: '#eae3d8',
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 22,
  },
  quoteHighlight: {
    backgroundColor: 'rgba(202, 160, 84, 0.12)',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#caa054',
  },
  speechQuote: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  onScreenPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(202, 160, 84, 0.3)',
  },
  onScreenText: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: '700',
  },
  pollStickerContainer: {
    marginTop: 10,
  },
  pollSticker: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  pollQuestion: {
    color: '#1a1209',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  pollOptionsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  pollOptionBtn: {
    flex: 1,
    backgroundColor: '#f4ede4',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2d3c1',
  },
  pollOptionVoted: {
    backgroundColor: '#caa054',
    borderColor: '#caa054',
  },
  pollOptionText: {
    color: '#251b14',
    fontSize: 14,
    fontWeight: '700',
  },
  pollPercentage: {
    color: '#14100d',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  pollThanksText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '600',
    marginTop: 8,
  },
  bottomDock: {
    paddingHorizontal: 16,
    paddingBottom: 58,
    zIndex: 20,
  },
  storyPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bottomStoryPill: {
    backgroundColor: 'rgba(38, 28, 22, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(202, 160, 84, 0.3)',
  },
  bottomStoryPillActive: {
    backgroundColor: '#caa054',
    borderColor: '#e0c9a6',
  },
  bottomStoryPillText: {
    color: '#dfcfbe',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomStoryPillTextActive: {
    color: '#14100d',
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 28, 22, 0.9)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(202, 160, 84, 0.4)',
  },
  actionBtnSecondaryText: {
    color: '#e8d2b0',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#caa054',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 22,
    marginHorizontal: 8,
  },
  actionBtnPrimaryText: {
    color: '#14100d',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  actionBtnDone: {
    borderColor: '#4cd964',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  countdownText: {
    fontSize: 84,
    fontWeight: '900',
    color: '#caa054',
  },
  countdownSub: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 10,
    fontWeight: '500',
  },
  teleprompterContainer: {
    flex: 1,
    backgroundColor: '#100c0a',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  teleTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    marginRight: 6,
  },
  recordingTime: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '700',
  },
  teleTitle: {
    color: '#e0c9a6',
    fontSize: 13,
    fontWeight: '600',
  },
  teleCloseBtn: {
    padding: 6,
  },
  cameraFrame: {
    height: 120,
    borderWidth: 1,
    borderColor: 'rgba(202, 160, 84, 0.3)',
    borderRadius: 16,
    marginVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cameraCornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#caa054',
  },
  cameraCornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#caa054',
  },
  cameraCornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#caa054',
  },
  cameraCornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#caa054',
  },
  cameraHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  teleScroll: {
    flex: 1,
    marginVertical: 10,
  },
  teleScrollContent: {
    paddingVertical: 10,
  },
  teleDirection: {
    color: '#caa054',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  teleTextBig: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 20,
  },
  teleOnScreen: {
    color: '#ffd700',
    fontSize: 15,
    fontWeight: '600',
  },
  teleBottomBar: {
    paddingTop: 14,
  },
  finishRecordingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#caa054',
    paddingVertical: 14,
    borderRadius: 25,
  },
  finishRecordingText: {
    color: '#14100d',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
});
