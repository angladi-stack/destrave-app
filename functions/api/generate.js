const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

export async function onRequestPost(context) {
  const apiKey = context.env.GEMINI_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      { error: 'A chave GEMINI_API_KEY não foi configurada no Cloudflare.' },
      500
    );
  }

  let requestData;
  try {
    requestData = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Os dados enviados são inválidos.' }, 400);
  }

  const { profile = {}, mode, format, objective } = requestData;
  const systemPrompt = `Você é o CÉREBRO ESTRATÉGICO do aplicativo DESTRAVE BY ANGLADI.
Posicionamento: "O Destrave não ensina você a fazer conteúdo. Ele destrava o próximo conteúdo que você precisa publicar."
Regra: FALE. NÃO RECITE. Soe como conversa natural.
Retorne somente um JSON válido com esta estrutura exata:
{
  "title": "Título do Conteúdo",
  "fromPerception": "Crença antiga do cliente",
  "toPerception": "Nova percepção",
  "howToRecord": "Como gravar no celular",
  "whatToSay": "Roteiro exato para falar no teleprompter",
  "screenText": "Texto curto para colocar na tela"
}`;

  const userPrompt = `Negócio: ${profile.businessName || ''}.
Produtos: ${profile.products || ''}.
Objeções: ${profile.knownObjections || ''}.
Expressões proibidas: ${profile.forbiddenExpressions || ''}.
Modo: ${mode || ''}.
Formato: ${format || ''}.
Objetivo: ${objective || ''}.`;

  try {
    const model = context.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
            temperature: 0.8
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

    return jsonResponse({ result });
  } catch {
    return jsonResponse(
      { error: 'Não foi possível conectar ao Gemini neste momento.' },
      502
    );
  }
}
