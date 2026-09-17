const MODEL = 'gemini-2.5-flash';

export default async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405 });
  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) return Response.json({ error: 'Gemini ainda não configurado.' }, { status: 503 });

  try {
    const input = await request.json();
    const prompt = `Você é o cérebro estratégico do aplicativo Destrave by Angladi. Crie conteúdo em português do Brasil, direto, natural, executável e sem inventar resultados. Objetivo: ${input.goal}. Assunto: ${input.topic || 'escolha estratégica'}. Formatos possíveis: ${(input.formats || []).join(', ')}. Responda SOMENTE JSON válido com esta estrutura: {"title":"", "objective":"", "stories":[{"title":"","whatToShow":"","whatToSay":"","onScreenText":""}], "reel":{"hook":"","script":"","cta":""}, "carousel":["slide 1","slide 2","slide 3","slide 4","slide 5","slide 6"]}. Gere exatamente 3 stories e 6 slides. O gancho do Reels deve ser forte no primeiro segundo.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.85 } }),
    });
    const payload = await response.json();
    if (!response.ok) return Response.json({ error: 'Não foi possível gerar agora.' }, { status: 502 });
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(text);
    return Response.json({ result: { ...result, id: `gemini-${Date.now()}`, createdAt: new Date().toISOString(), source: 'gemini' } });
  } catch {
    return Response.json({ error: 'Resposta inválida do gerador.' }, { status: 500 });
  }
};
