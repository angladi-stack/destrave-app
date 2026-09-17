import { GeneratedContent, GenerationRequest } from '../types';

const API_ENDPOINT = '/api/generate';

function localContent(input: GenerationRequest): GeneratedContent {
  const topic = input.topic.trim() || 'o seu principal produto ou serviço';
  const goal = input.goal || 'Atrair pessoas';
  return {
    id: `local-${Date.now()}`,
    title: `Mostre por que ${topic} merece atenção hoje.`,
    objective: `Conteúdo preparado para ${goal.toLowerCase()}, respeitando o tempo e o formato escolhidos.`,
    stories: [
      { title: 'O problema', whatToShow: `Mostre uma situação real relacionada a ${topic}.`, whatToSay: 'Tem um detalhe aqui que muita gente só percebe depois.', onScreenText: 'Você já percebeu isso?' },
      { title: 'O processo', whatToShow: 'Mostre uma parte simples do processo ou bastidor.', whatToSay: 'É aqui que o cuidado começa a mudar o resultado.' },
      { title: 'O resultado', whatToShow: 'Mostre o benefício final com clareza.', whatToSay: 'É esse resultado que eu quero entregar para cada cliente.', onScreenText: 'Quer saber como funciona?' },
    ],
    reel: {
      hook: `Você pode estar olhando para ${topic} do jeito errado.`,
      script: `Antes de escolher apenas pelo preço, observe o resultado que ${topic} pode gerar. Mostre o processo, explique o cuidado e ajude a pessoa a entender o benefício real.`,
      cta: 'Fale comigo para saber como funciona.',
    },
    carousel: [
      `O que você precisa saber sobre ${topic}`,
      'O problema que quase ninguém percebe',
      'Por que isso acontece',
      'O cuidado que muda o resultado',
      'O benefício para o cliente',
      'Próximo passo: fale comigo',
    ],
    createdAt: new Date().toISOString(),
    source: 'local',
  };
}

export async function generateContent(input: GenerationRequest): Promise<GeneratedContent> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.includes('application/json')) throw new Error('API indisponível');
    const data = await response.json();
    if (!data?.result) throw new Error('Resposta inválida');
    return { ...data.result, id: data.result.id || `gemini-${Date.now()}`, createdAt: data.result.createdAt || new Date().toISOString(), source: 'gemini' };
  } catch {
    return localContent(input);
  }
}
