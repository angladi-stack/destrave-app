import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SidebarHotspots } from '../components/SidebarHotspots';
import { ASSETS } from '../constants/assets';
import { ScreenName } from '../types';

interface DailyContentScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onShowToast: (msg: string) => void;
  onOpenStoryAt?: (index: number) => void;
}

export const DailyContentScreen: React.FC<DailyContentScreenProps> = ({
  onNavigate,
  onShowToast,
  onOpenStoryAt,
}) => {
  // Mode: ready content (Asset 4) vs wizard generator (Asset 3)
  const [viewMode, setViewMode] = useState<'ready' | 'wizard'>('ready');

  // Checklist state
  const [checks, setChecks] = useState({
    storiesPublished: false,
    reelsPublished: false,
    carouselPublished: false,
    respondedDMs: false,
  });

  // Selected tone
  const [selectedTone, setSelectedTone] = useState<string>('Mais natural');

  // Modals
  const [reelsModalVisible, setReelsModalVisible] = useState(false);
  const [teleprompterModalVisible, setTeleprompterModalVisible] = useState(false);
  const [stepDetailModal, setStepDetailModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({ visible: false, title: '', content: '' });
  const [whyModalVisible, setWhyModalVisible] = useState(false);

  // Wizard state (Asset 3)
  const [wizardGoal, setWizardGoal] = useState('Escolha por mim');
  const [wizardTopic, setWizardTopic] = useState('');
  const [wizardFormat, setWizardFormat] = useState<string[]>([
    'Posso aparecer e falar',
    'Tenho pouco tempo',
  ]);

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks((prev) => {
      const nextVal = !prev[key];
      if (nextVal) {
        onShowToast('Etapa concluída! ✅');
      }
      return { ...prev, [key]: nextVal };
    });
  };

  const handleCopyStories = () => {
    onShowToast('✨ Roteiro dos 3 stories copiado com sucesso!');
  };

  const handleSave = () => {
    onShowToast('✨ Conteúdo salvo com sucesso em Meus Conteúdos!');
  };

  const handleNewVersion = () => {
    onShowToast('🔄 Nova versão gerada: "Do visual à sensação de carro novo"');
  };

  // IF WIZARD MODE (Asset 3)
  if (viewMode === 'wizard') {
    return (
      <ScreenWrapper asset={ASSETS.asset3}>
        <SidebarHotspots
          currentScreen="daily_content"
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />

        {/* Back button (< Faça por mim) */}
        <TouchableOpacity
          style={styles.wizardBackBtn}
          activeOpacity={0.6}
          onPress={() => setViewMode('ready')}
        />

        {/* Goal options */}
        {/* Row 1: Vender, Alcançar pessoas, Passar confiança */}
        <TouchableOpacity
          style={[styles.wizardGoalBtn, { top: '32.5%', left: '17.5%', width: '25.0%' }]}
          onPress={() => {
            setWizardGoal('Vender');
            onShowToast('Objetivo: Vender');
          }}
        />
        <TouchableOpacity
          style={[styles.wizardGoalBtn, { top: '32.5%', left: '44.0%', width: '25.0%' }]}
          onPress={() => {
            setWizardGoal('Alcançar pessoas');
            onShowToast('Objetivo: Alcançar pessoas');
          }}
        />
        <TouchableOpacity
          style={[styles.wizardGoalBtn, { top: '32.5%', left: '70.5%', width: '26.0%' }]}
          onPress={() => {
            setWizardGoal('Passar confiança');
            onShowToast('Objetivo: Passar confiança');
          }}
        />

        {/* Row 2: Ensinar, Criar conexão, Escolha por mim */}
        <TouchableOpacity
          style={[styles.wizardGoalBtn, { top: '37.2%', left: '17.5%', width: '25.0%' }]}
          onPress={() => {
            setWizardGoal('Ensinar');
            onShowToast('Objetivo: Ensinar');
          }}
        />
        <TouchableOpacity
          style={[styles.wizardGoalBtn, { top: '37.2%', left: '44.0%', width: '25.0%' }]}
          onPress={() => {
            setWizardGoal('Criar conexão');
            onShowToast('Objetivo: Criar conexão');
          }}
        />
        <TouchableOpacity
          style={[styles.wizardGoalBtn, { top: '37.2%', left: '70.5%', width: '26.0%' }]}
          onPress={() => {
            setWizardGoal('Escolha por mim');
            onShowToast('Objetivo automático ✨');
          }}
        />

        {/* Divulgar Input */}
        <View style={styles.wizardInputContainer}>
          <TextInput
            style={styles.wizardInput}
            placeholder="Ex.: serviço, produto, música, evento ou mensagem"
            placeholderTextColor="rgba(80, 70, 60, 0.45)"
            value={wizardTopic}
            onChangeText={setWizardTopic}
          />
        </View>

        {/* Mic button */}
        <TouchableOpacity
          style={styles.wizardMicBtn}
          onPress={() => onShowToast('Gravação por voz ativada... Fale o que quer divulgar!')}
        />

        {/* Checkbox "Não sei. Escolha por mim." */}
        <TouchableOpacity
          style={styles.wizardAutoCheckbox}
          onPress={() => {
            setWizardTopic('');
            onShowToast('O Destrave escolherá o melhor tópico baseado no seu perfil.');
          }}
        />

        {/* Format Options */}
        <TouchableOpacity
          style={[styles.wizardFormatRow, { top: '67.0%' }]}
          onPress={() => onShowToast('Opção: Posso aparecer e falar')}
        />
        <TouchableOpacity
          style={[styles.wizardFormatRow, { top: '71.5%' }]}
          onPress={() => onShowToast('Opção: Posso mostrar sem falar')}
        />
        <TouchableOpacity
          style={[styles.wizardFormatRow, { top: '76.0%' }]}
          onPress={() => onShowToast('Opção: Não quero aparecer')}
        />
        <TouchableOpacity
          style={[styles.wizardFormatRow, { top: '80.5%' }]}
          onPress={() => onShowToast('Opção: Tenho pouco tempo')}
        />

        {/* Bottom Button: CRIAR MEU CONTEÚDO DO DIA */}
        <TouchableOpacity
          style={styles.wizardSubmitBtn}
          activeOpacity={0.7}
          onPress={() => {
            onShowToast('Gerando estratégia completa com IA... ✨');
            setTimeout(() => {
              setViewMode('ready');
              onShowToast('Conteúdo do dia pronto para execução!');
            }, 600);
          }}
        />
      </ScreenWrapper>
    );
  }

  // READY CONTENT MODE (Asset 4)
  return (
    <ScreenWrapper asset={ASSETS.asset4}>
      {/* Left Sidebar Navigation */}
      <SidebarHotspots
        currentScreen="daily_content"
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Button: "▶ COMEÇAR PELO PASSO 1" */}
      <TouchableOpacity
        style={styles.comecarPasso1Btn}
        activeOpacity={0.7}
        onPress={() => {
          onShowToast('Iniciando Passo 1: Stories ✨');
          onNavigate('stories');
        }}
      />

      {/* Step 1: Story 1 Card */}
      <TouchableOpacity
        style={styles.storyCard1}
        activeOpacity={0.7}
        onPress={() => {
          onOpenStoryAt?.(0);
          onNavigate('stories');
        }}
      />

      {/* Step 1: Story 2 Card */}
      <TouchableOpacity
        style={styles.storyCard2}
        activeOpacity={0.7}
        onPress={() => {
          onOpenStoryAt?.(1);
          onNavigate('stories');
        }}
      />

      {/* Step 1: Story 3 Card */}
      <TouchableOpacity
        style={styles.storyCard3}
        activeOpacity={0.7}
        onPress={() => {
          onOpenStoryAt?.(2);
          onNavigate('stories');
        }}
      />

      {/* Poll buttons on Story 3: "Sim" */}
      <TouchableOpacity
        style={styles.pollBtnSim}
        activeOpacity={0.6}
        onPress={() => onShowToast('Voto computado: "Sim" (28% dos votos)')}
      />

      {/* Poll buttons on Story 3: "Faz tempo" */}
      <TouchableOpacity
        style={styles.pollBtnFazTempo}
        activeOpacity={0.6}
        onPress={() => onShowToast('Voto computado: "Faz tempo" (72% dos votos)')}
      />

      {/* Button "COPIAR STORIES" */}
      <TouchableOpacity
        style={styles.copiarStoriesBtn}
        activeOpacity={0.7}
        onPress={handleCopyStories}
      />

      {/* Step 2 (Reels): "VER ROTEIRO COMPLETO" */}
      <TouchableOpacity
        style={styles.verRoteiroReelsBtn}
        activeOpacity={0.7}
        onPress={() => setReelsModalVisible(true)}
      />

      {/* Step 2 (Reels): "GRAVAR EM BLOCOS" */}
      <TouchableOpacity
        style={styles.gravarEmBlocosBtn}
        activeOpacity={0.7}
        onPress={() => setTeleprompterModalVisible(true)}
      />

      {/* Step 3: Stories para continuar */}
      <TouchableOpacity
        style={styles.step3Row}
        activeOpacity={0.7}
        onPress={() =>
          setStepDetailModal({
            visible: true,
            title: 'Passo 3: Stories para Continuar',
            content:
              'Story 4: Mostre o resultado final antes e depois do banco limpo.\n\nStory 5: CTA direta com link do WhatsApp: "Mande uma mensagem agora para garantir seu horário de sábado com desconto especial."',
          })
        }
      />

      {/* Step 4: Carrossel */}
      <TouchableOpacity
        style={styles.step4Row}
        activeOpacity={0.7}
        onPress={() =>
          setStepDetailModal({
            visible: true,
            title: 'Passo 4: Carrossel Estratégico (6 slides)',
            content:
              'Slide 1: O perigo que ninguém vê dentro do seu carro.\nSlide 2: Poeira, ácaros e o ar que sua família respira.\nSlide 3: Limpeza caseira vs. higienização profissional.\nSlide 4: O processo detalhado passo a passo.\nSlide 5: Depoimento de cliente satisfeito.\nSlide 6: Salve este post e agende sua limpeza pelo link na bio!',
          })
        }
      />

      {/* Step 5: Story de fechamento */}
      <TouchableOpacity
        style={styles.step5Row}
        activeOpacity={0.7}
        onPress={() =>
          setStepDetailModal({
            visible: true,
            title: 'Passo 5: Story de Fechamento',
            content:
              'Foto de um carro brilhando ao pôr do sol com caixa de perguntas: "Qual o maior desafio para manter o seu carro limpo?" e link direto para conversa no WhatsApp.',
          })
        }
      />

      {/* Checklist Checkboxes with interactive visual check overlay */}
      {/* 1. Stories publicados */}
      <TouchableOpacity
        style={styles.check1}
        activeOpacity={0.7}
        onPress={() => toggleCheck('storiesPublished')}
      >
        {checks.storiesPublished && (
          <View style={styles.checkIconBox}>
            <Ionicons name="checkmark" size={13} color="#caa054" />
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Reels publicado */}
      <TouchableOpacity
        style={styles.check2}
        activeOpacity={0.7}
        onPress={() => toggleCheck('reelsPublished')}
      >
        {checks.reelsPublished && (
          <View style={styles.checkIconBox}>
            <Ionicons name="checkmark" size={13} color="#caa054" />
          </View>
        )}
      </TouchableOpacity>

      {/* 3. Carrossel publicado ou salvo */}
      <TouchableOpacity
        style={styles.check3}
        activeOpacity={0.7}
        onPress={() => toggleCheck('carouselPublished')}
      >
        {checks.carouselPublished && (
          <View style={styles.checkIconBox}>
            <Ionicons name="checkmark" size={13} color="#caa054" />
          </View>
        )}
      </TouchableOpacity>

      {/* 4. Respondi quem chamou */}
      <TouchableOpacity
        style={styles.check4}
        activeOpacity={0.7}
        onPress={() => toggleCheck('respondedDMs')}
      >
        {checks.respondedDMs && (
          <View style={styles.checkIconBox}>
            <Ionicons name="checkmark" size={13} color="#caa054" />
          </View>
        )}
      </TouchableOpacity>

      {/* Accordion: "Por que foi criado assim?" */}
      <TouchableOpacity
        style={styles.whyAccordion}
        activeOpacity={0.7}
        onPress={() => setWhyModalVisible(true)}
      />

      {/* Tone Style Pills */}
      <TouchableOpacity
        style={[styles.tonePill, { left: '16.0%', width: '15.5%' }]}
        onPress={() => {
          setSelectedTone('Mais natural');
          onShowToast('Tom ajustado: Mais natural 🌿');
        }}
      />
      <TouchableOpacity
        style={[styles.tonePill, { left: '32.5%', width: '15.5%' }]}
        onPress={() => {
          setSelectedTone('Mais simples');
          onShowToast('Tom ajustado: Mais simples ⚡');
        }}
      />
      <TouchableOpacity
        style={[styles.tonePill, { left: '49.0%', width: '14.5%' }]}
        onPress={() => {
          setSelectedTone('Mais firme');
          onShowToast('Tom ajustado: Mais firme 🎯');
        }}
      />
      <TouchableOpacity
        style={[styles.tonePill, { left: '64.5%', width: '17.5%' }]}
        onPress={() => {
          setSelectedTone('Mais emocional');
          onShowToast('Tom ajustado: Mais emocional ❤️');
        }}
      />
      <TouchableOpacity
        style={[styles.tonePill, { left: '83.0%', width: '14.5%' }]}
        onPress={() => {
          setSelectedTone('Mais elegante');
          onShowToast('Tom ajustado: Mais elegante 👑');
        }}
      />

      {/* Button: "SALVAR MEU CONTEÚDO" */}
      <TouchableOpacity
        style={styles.salvarBtn}
        activeOpacity={0.7}
        onPress={handleSave}
      />

      {/* Button: "CRIAR OUTRA VERSÃO" */}
      <TouchableOpacity
        style={styles.criarOutraBtn}
        activeOpacity={0.7}
        onPress={handleNewVersion}
      />

      {/* Floating button to switch to Wizard generator */}
      <TouchableOpacity
        style={styles.wizardSwitchPill}
        activeOpacity={0.8}
        onPress={() => setViewMode('wizard')}
      >
        <Ionicons name="create-outline" size={13} color="#14100d" />
        <Text style={styles.wizardSwitchText}>Personalizar Pedido</Text>
      </TouchableOpacity>

      {/* Modal: Roteiro Reels Completo */}
      <Modal
        visible={reelsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReelsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReelsModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="videocam" size={18} color="#d4af37" />
                    <Text style={styles.modalTitle}>Roteiro Reels Completo (40s)</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReelsModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.scriptScroll}>
                  <View style={styles.scriptBlock}>
                    <Text style={styles.scriptLabel}>GANCHO (0 - 3s)</Text>
                    <Text style={styles.scriptText}>
                      "Você lava o carro todo mês e acha que ele está limpo? Dá uma olhada no que acabou de sair desse estofado..."
                    </Text>
                  </View>

                  <View style={styles.scriptBlock}>
                    <Text style={styles.scriptLabel}>DESENVOLVIMENTO (3 - 25s)</Text>
                    <Text style={styles.scriptText}>
                      [Mostra extratora puxando água preta do banco]. "Não é sobre estética. É sobre o ácaro e o pó que acumulou durante 6 meses e você respira todo dia no trânsito."
                    </Text>
                  </View>

                  <View style={styles.scriptBlock}>
                    <Text style={styles.scriptLabel}>SOLUÇÃO & CTA (25 - 40s)</Text>
                    <Text style={styles.scriptText}>
                      "A gente não faz só lavagem. Fazemos restauração de conforto. Se você quer o cheiro de carro zero de volta, comente CARRO ou mande uma mensagem no direct."
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setReelsModalVisible(false);
                    onShowToast('Roteiro do Reels copiado!');
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>COPIAR ROTEIRO DO REELS</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Gravar em Blocos Teleprompter */}
      <Modal
        visible={teleprompterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTeleprompterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setTeleprompterModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Gravação em Blocos</Text>
                <Text style={styles.modalSubtitle}>Grave um bloco de cada vez, sem errar</Text>

                <View style={styles.blockRow}>
                  <Text style={styles.blockNum}>1</Text>
                  <Text style={styles.blockBody}>Bloco 1 (5s): Frase de impacto inicial</Text>
                </View>
                <View style={styles.blockRow}>
                  <Text style={styles.blockNum}>2</Text>
                  <Text style={styles.blockBody}>Bloco 2 (15s): Mostrando o produto ou serviço</Text>
                </View>
                <View style={styles.blockRow}>
                  <Text style={styles.blockNum}>3</Text>
                  <Text style={styles.blockBody}>Bloco 3 (10s): Chamada para ação final</Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { marginTop: 16 }]}
                  onPress={() => {
                    setTeleprompterModalVisible(false);
                    onNavigate('stories');
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>ABRIR MODO TELEPROMPTER</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Detalhes do Passo */}
      <Modal
        visible={stepDetailModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setStepDetailModal({ ...stepDetailModal, visible: false })}
      >
        <TouchableWithoutFeedback
          onPress={() => setStepDetailModal({ ...stepDetailModal, visible: false })}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{stepDetailModal.title}</Text>
                  <TouchableOpacity
                    onPress={() => setStepDetailModal({ ...stepDetailModal, visible: false })}
                  >
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.stepDetailContent}>{stepDetailModal.content}</Text>

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setStepDetailModal({ ...stepDetailModal, visible: false });
                    onShowToast('Copiado para a área de transferência!');
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>COPIAR TEXTO</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Por que foi criado assim? */}
      <Modal
        visible={whyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWhyModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setWhyModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="bulb-outline" size={18} color="#d4af37" />
                    <Text style={styles.modalTitle}>Por que foi criado assim?</Text>
                  </View>
                  <TouchableOpacity onPress={() => setWhyModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#776c60" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDesc}>
                  <Text style={{ fontWeight: '700' }}>1. Quebra de objeção:</Text> Muitas pessoas acham que lavagem interna é luxo desnecessário. Ao focar em saúde e bem-estar, eliminamos a barreira do preço.
                </Text>
                <Text style={styles.modalDesc}>
                  <Text style={{ fontWeight: '700' }}>2. Conexão sensorial:</Text> O contraste visual de antes/depois ativa o desejo imediato de ver o próprio carro no mesmo estado.
                </Text>
                <Text style={styles.modalDesc}>
                  <Text style={{ fontWeight: '700' }}>3. Baixo atrito de ação:</Text> A enquete "Sim" ou "Faz tempo" gera engajamento com 1 único toque e abre brecha para conversa no direct.
                </Text>

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => setWhyModalVisible(false)}
                >
                  <Text style={styles.modalPrimaryBtnText}>FECHAR</Text>
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
  comecarPasso1Btn: {
    position: 'absolute',
    top: '18.6%',
    left: '16.0%',
    width: '80.0%',
    height: '3.4%',
    borderRadius: 20,
  },
  storyCard1: {
    position: 'absolute',
    top: '30.5%',
    left: '16.5%',
    width: '26.0%',
    height: '19.5%',
    borderRadius: 10,
  },
  storyCard2: {
    position: 'absolute',
    top: '30.5%',
    left: '43.5%',
    width: '26.0%',
    height: '19.5%',
    borderRadius: 10,
  },
  storyCard3: {
    position: 'absolute',
    top: '30.5%',
    left: '70.5%',
    width: '26.0%',
    height: '19.5%',
    borderRadius: 10,
  },
  pollBtnSim: {
    position: 'absolute',
    top: '44.5%',
    left: '76.0%',
    width: '9.0%',
    height: '3.0%',
    borderRadius: 6,
  },
  pollBtnFazTempo: {
    position: 'absolute',
    top: '44.5%',
    left: '85.5%',
    width: '10.5%',
    height: '3.0%',
    borderRadius: 6,
  },
  copiarStoriesBtn: {
    position: 'absolute',
    top: '50.7%',
    left: '16.0%',
    width: '80.0%',
    height: '2.5%',
    borderRadius: 20,
  },
  verRoteiroReelsBtn: {
    position: 'absolute',
    top: '58.5%',
    left: '34.0%',
    width: '30.0%',
    height: '2.5%',
    borderRadius: 15,
  },
  gravarEmBlocosBtn: {
    position: 'absolute',
    top: '58.5%',
    left: '65.0%',
    width: '31.0%',
    height: '2.5%',
    borderRadius: 15,
  },
  step3Row: {
    position: 'absolute',
    top: '61.6%',
    left: '16.0%',
    width: '80.0%',
    height: '3.8%',
  },
  step4Row: {
    position: 'absolute',
    top: '66.2%',
    left: '16.0%',
    width: '80.0%',
    height: '3.8%',
  },
  step5Row: {
    position: 'absolute',
    top: '70.7%',
    left: '16.0%',
    width: '80.0%',
    height: '3.8%',
  },
  check1: {
    position: 'absolute',
    top: '76.8%',
    left: '25.5%',
    width: '3.0%',
    height: '1.5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  check2: {
    position: 'absolute',
    top: '78.8%',
    left: '25.5%',
    width: '3.0%',
    height: '1.5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  check3: {
    position: 'absolute',
    top: '76.8%',
    left: '58.5%',
    width: '3.0%',
    height: '1.5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  check4: {
    position: 'absolute',
    top: '78.8%',
    left: '58.5%',
    width: '3.0%',
    height: '1.5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconBox: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whyAccordion: {
    position: 'absolute',
    top: '81.6%',
    left: '16.0%',
    width: '80.0%',
    height: '3.8%',
  },
  tonePill: {
    position: 'absolute',
    top: '87.5%',
    height: '2.4%',
    borderRadius: 15,
  },
  salvarBtn: {
    position: 'absolute',
    top: '90.7%',
    left: '14.0%',
    width: '82.0%',
    height: '2.8%',
    borderRadius: 20,
  },
  criarOutraBtn: {
    position: 'absolute',
    top: '94.2%',
    left: '14.0%',
    width: '82.0%',
    height: '2.8%',
    borderRadius: 20,
  },
  wizardSwitchPill: {
    position: 'absolute',
    top: '1.8%',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#caa054',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 20,
  },
  wizardSwitchText: {
    color: '#14100d',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  wizardBackBtn: {
    position: 'absolute',
    top: '3.0%',
    left: '17.0%',
    width: '35.0%',
    height: '4.5%',
  },
  wizardGoalBtn: {
    position: 'absolute',
    height: '4.2%',
    borderRadius: 15,
  },
  wizardInputContainer: {
    position: 'absolute',
    top: '49.0%',
    left: '20.0%',
    width: '66.0%',
    height: '4.5%',
    justifyContent: 'center',
  },
  wizardInput: {
    width: '100%',
    height: '100%',
    color: '#2b2118',
    fontSize: 13,
  },
  wizardMicBtn: {
    position: 'absolute',
    top: '48.5%',
    left: '86.0%',
    width: '8.0%',
    height: '5.0%',
  },
  wizardAutoCheckbox: {
    position: 'absolute',
    top: '55.0%',
    left: '18.0%',
    width: '40.0%',
    height: '3.0%',
  },
  wizardFormatRow: {
    position: 'absolute',
    left: '18.0%',
    width: '78.0%',
    height: '4.0%',
  },
  wizardSubmitBtn: {
    position: 'absolute',
    top: '84.0%',
    left: '16.0%',
    width: '81.0%',
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
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#e8dcce',
    maxHeight: '85%',
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
    fontSize: 16,
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
    fontSize: 13,
    color: '#4e4236',
    lineHeight: 19,
    marginBottom: 12,
  },
  scriptScroll: {
    maxHeight: 280,
    marginVertical: 10,
  },
  scriptBlock: {
    backgroundColor: '#f1ece3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#caa054',
  },
  scriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#caa054',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  scriptText: {
    fontSize: 13,
    color: '#2a1f18',
    lineHeight: 19,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f3ede4',
    padding: 10,
    borderRadius: 10,
  },
  blockNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#caa054',
    color: '#14100d',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 10,
    fontSize: 12,
  },
  blockBody: {
    fontSize: 13,
    color: '#2a1f18',
    fontWeight: '500',
    flex: 1,
  },
  stepDetailContent: {
    fontSize: 14,
    color: '#3d3126',
    lineHeight: 22,
    marginVertical: 14,
  },
  modalPrimaryBtn: {
    backgroundColor: '#caa054',
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalPrimaryBtnText: {
    color: '#161008',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
