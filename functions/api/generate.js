const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

export async function onRequestPost(context) {
  const apiKey =
    context.env.DESTRAVE_GEMINI_KEY || context.env.GEMINI_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      { error: 'A chave da API do Gemini não foi configurada no Cloudflare.' },
      500
    );
  }

  let requestData;
  try {
    requestData = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Os dados enviados são inválidos.' }, 400);
  }

  const { profile = {}, mode, format, objective, executionStyle = [], recentContents = [] } = requestData;
  const systemPrompt = `Você é o CÉREBRO ESTRATÉGICO do aplicativo DESTRAVE BY ANGLADI.

POSICIONAMENTO: O Destrave não ensina a criar conteúdo. Ele entrega o próximo conteúdo pronto para executar.
REGRA CENTRAL: nunca devolva a responsabilidade criativa ao usuário. Não diga "fale sobre", "mostre um bastidor" ou "crie um CTA". Escreva exatamente o que mostrar, falar, escrever e publicar.

Seu método funciona para qualquer profissão, atividade, produto, serviço, artista, igreja, projeto, mensagem ou causa. Adapte vocabulário, rotina, dores, desejos, objeções, cenas, provas e ação ao contexto informado. Nunca apenas troque o nome da profissão em um roteiro genérico.

Antes de escrever, analise silenciosamente: objetivo, público, problema, desejo, transformação, estágio de consciência, tensão, nova percepção, objeções e ação. Não exponha raciocínio interno.

O pacote precisa provocar respostas como: "isso sou eu", "eu não tinha pensado assim", "agora entendi", "eu quero isso", "confio nessa pessoa" ou "preciso agir".

REGRAS:
- Linguagem humana, natural, específica e fácil para leigos.
- Gancho fortíssimo no primeiro segundo do Reels.
- Impacto sem humilhar: impacto, reconhecimento, acolhimento, possibilidade e movimento.
- Venda constrói decisão; não começa parecendo anúncio.
- Toda orientação abstrata deve virar execução concreta.
- Não invente depoimento, prova, resultado, urgência, escassez, experiência pessoal ou promessa médica, financeira, jurídica ou espiritual.
- Se não houver prova real informada, use demonstração, processo ou explicação, nunca prova inventada.
- O conteúdo deve ser forte, mas simples de fazer com celular.
- Cada formato tem seu próprio CTA quando necessário.
- Uma nova versão deve mudar ângulo, gancho, tensão, situação, narrativa, exemplos, cenas, objeção e CTA; nunca apenas parafrasear.
- Evite repetir os conteúdos recentes recebidos.

Retorne SOMENTE JSON válido, sem markdown, seguindo exatamente esta estrutura:
{
  "title": "título do movimento do dia",
  "objective": "efeito que o conteúdo deve gerar",
  "fromPerception": "percepção anterior",
  "toPerception": "nova percepção",
  "materials": ["somente materiais simples realmente necessários"],
  "storiesOpening": [
    {"number": 1, "format": "vídeo/foto/texto", "show": "cena exata", "say": "fala palavra por palavra", "screenText": "texto exato", "interaction": "interação exata ou nenhuma", "purpose": "função estratégica"},
    {"number": 2, "format": "", "show": "", "say": "", "screenText": "", "interaction": "", "purpose": ""},
    {"number": 3, "format": "", "show": "", "say": "", "screenText": "", "interaction": "", "purpose": ""}
  ],
  "reel": {"duration": "tempo realista", "angle": "ângulo", "hook": "gancho exato", "howToRecord": "direção simples", "scriptBlocks": ["blocos completos em ordem"], "screenText": ["textos na tela"], "caption": "legenda completa", "cta": "CTA exato", "cover": "texto exato da capa"},
  "storiesContinuation": [
    {"number": 1, "format": "", "show": "", "say": "", "screenText": "", "interaction": "", "purpose": ""},
    {"number": 2, "format": "", "show": "", "say": "", "screenText": "", "interaction": "", "purpose": ""}
  ],
  "carousel": {"slides": [{"number": 1, "text": "texto exato", "visual": "visual simples"}], "caption": "legenda completa", "cta": "CTA exato"},
  "closingStory": {"format": "", "show": "", "say": "", "screenText": "", "cta": ""},
  "strategyExplanation": "explicação curta e simples do efeito criado",
  "checklist": ["ações em ordem para executar"]
}`;

  const userPrompt = `O que a pessoa faz: ${profile.businessName || 'não informado'}.
O que deseja divulgar: ${profile.products || 'escolha estrategicamente'}.
Público: ${profile.audience || 'deduza com cautela a partir do trabalho'}.
Problema que resolve: ${profile.problemSolved || 'deduza sem inventar fatos'}.
Resultado que entrega: ${profile.transformation || 'deduza sem prometer resultado garantido'}.
Objeções conhecidas: ${profile.knownObjections || 'identifique objeções prováveis e trate-as sem afirmar que são fatos'}.
Diferencial real: ${profile.differential || 'não informado; não invente'}.
Tom de voz: ${profile.voice || 'natural, direto, humano e elegante'}.
Expressões proibidas: ${profile.forbiddenExpressions || 'nenhuma informada'}.
Objetivo de hoje: ${objective || 'escolha o mais estratégico'}.
Como quer executar: ${Array.isArray(executionStyle) ? executionStyle.join(', ') : executionStyle || 'simples e rápido'}.
Modo: ${mode || 'FAÇA POR MIM'}.
Entrega: ${format || 'DIA COMPLETO'}.
Conteúdos recentes que não devem ser repetidos: ${JSON.stringify(recentContents).slice(0, 4000)}.`;

  try {
    const model = context.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.92,
            maxOutputTokens: 8192
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const message = geminiData?.error?.message || 'O Gemini recusou a solicitação.';
      return jsonResponse({ error: message }, geminiResponse.status);
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return jsonResponse(
        { error: 'O Gemini não devolveu nenhum conteúdo. Tente novamente.' },
        502
      );
    }

    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      return jsonResponse(
        { error: 'O Gemini respondeu em um formato inesperado. Tente novamente.' },
        502
      );
    }

    if (!result?.title || !Array.isArray(result?.storiesOpening) || !result?.reel || !result?.carousel) {
      return jsonResponse({ error: 'O conteúdo veio incompleto. Tente novamente.' }, 502);
    }

    return jsonResponse({ result });
  } catch {
    return jsonResponse(
      { error: 'Não foi possível conectar ao Gemini neste momento.' },
      502
    );
  }
}
