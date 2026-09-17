// Conteúdo local: não consome IA, tokens ou chamadas externas.
const movements = [
  'publique antes que a dúvida tente negociar com você',
  'mostre uma parte do seu trabalho que normalmente passa despercebida',
  'fale com uma pessoa real, não com uma multidão imaginária',
  'transforme o que você já sabe em uma conversa simples',
  'comece pelo conteúdo que cabe no tempo que você tem',
  'deixe seu trabalho ser visto por quem precisa dele',
  'faça o próximo movimento, mesmo que ele pareça pequeno',
  'troque a espera pela primeira ação possível',
  'grave como quem explica algo para alguém próximo',
  'mostre o resultado antes de explicar o processo',
  'conte o que muda na vida de quem escolhe você',
  'use o que está diante de você e comece',
  'saia do rascunho e coloque sua mensagem em movimento',
  'mostre um detalhe que prova o seu cuidado',
  'responda hoje a uma dúvida que sempre chega até você'
];

const openings = [
  'Hoje,',
  'Seu movimento de hoje é simples:',
  'Você não precisa complicar:',
  'Antes de pensar demais,',
  'Para destravar o seu dia,',
  'O conteúdo de hoje começa quando você decide',
  'Não espere sentir tudo pronto para',
  'A confiança cresce quando você escolhe',
  'O que você faz merece espaço. Então,',
  'Constância começa assim:',
  'Se o dia está corrido,',
  'Para ser lembrado, primeiro é preciso'
];

export const impulses = openings.flatMap((opening, group) =>
  movements.map((movement, index) => {
    const sentence = `${opening} ${movement}.`;
    const finishes = [
      ' Feito é o que começa a gerar resultado.',
      ' O próximo passo só aparece depois do primeiro.',
      ' Movimento cria clareza.',
      ' Sua mensagem não pode trabalhar escondida.',
      ' O simples publicado vale mais que o perfeito guardado.'
    ];
    return sentence + finishes[(group + index) % finishes.length];
  })
);

// Biblioteca fixa para escolher símbolos por atividade sem gerar imagens.
export const iconLibrary = {
  geral: '✦', comercio: '▣', servico: '◆', beleza: '♢', manicure: '♢',
  cabelo: '✂', maquiagem: '✧', saude: '♡', dentista: '◉', fitness: '↗',
  comida: '◫', lanchonete: '◫', restaurante: '◫', confeitaria: '○',
  carro: '◇', lavaJato: '◇', motorista: '⌁', uber: '⌁',
  musica: '♪', cantora: '♪', cantor: '♪', banda: '♫', igreja: '✦',
  tarot: '☾', mistico: '☾', educacao: '▤', curso: '▤', mentoria: '◎',
  construcao: '△', pedreiro: '△', carpinteiro: '⌂', costura: '⌁', roupa: '♧',
  fotografia: '▣', evento: '☆', mensagem: '◯', projeto: '⬡', loja: '▦',
  stories: '▯', reels: '▰', carrossel: '▧', whatsapp: '◯', agenda: '▣'
};

export function dailyImpulse(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return impulses[(day - 1 + impulses.length) % impulses.length];
}

export function activityIcon(value = '') {
  const normalized = value.toLowerCase();
  const key = Object.keys(iconLibrary).find(item => normalized.includes(item.toLowerCase()));
  return iconLibrary[key] || iconLibrary.geral;
}
