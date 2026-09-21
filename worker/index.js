async function ensureStateTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS client_state (
      client_id TEXT PRIMARY KEY,
      business_json TEXT NOT NULL DEFAULT '{}',
      contents_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

function json(data, init={}) {
  return Response.json(data, { headers: { "Cache-Control": "no-store", ...(init.headers||{}) }, ...init });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, app: "destrave-app", database: "connected", providers: { gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY), cloudflareAI: Boolean(env.AI) } });
      } catch (error) {
        return json({ ok: false, database: "error", message: error.message }, { status: 500 });
      }
    }


    if (url.pathname === "/api/ai-check") {
      const results={};
      if(env.GEMINI_API_KEY){try{const x=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:"Responda apenas OK"}]}],generationConfig:{maxOutputTokens:20}}),signal:AbortSignal.timeout(12000)});const raw=await x.text();let d={};try{d=JSON.parse(raw)}catch{}results.gemini={ok:x.ok,status:x.status,error:d?.error?.message||null,hasContent:Boolean(d?.candidates?.[0]?.content?.parts?.[0]?.text)}}catch(e){results.gemini={ok:false,error:String(e?.message||e)}}}else results.gemini={ok:false,error:"chave ausente"};
      if(env.GROQ_API_KEY){try{const x=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},body:JSON.stringify({model:"openai/gpt-oss-20b",messages:[{role:"user",content:"Responda apenas OK"}],max_completion_tokens:40,reasoning_effort:"low"}),signal:AbortSignal.timeout(12000)});const raw=await x.text();let d={};try{d=JSON.parse(raw)}catch{}results.groq={ok:x.ok,status:x.status,error:d?.error?.message||null,hasContent:Boolean(d?.choices?.[0]?.message?.content)}}catch(e){results.groq={ok:false,error:String(e?.message||e)}}}else results.groq={ok:false,error:"chave ausente"};
      if(env.AI){try{const x=await Promise.race([env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast",{messages:[{role:"user",content:"Responda apenas OK"}],max_tokens:40}),new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout após 12s")),12000))]);const content=String(x?.response??x?.choices?.[0]?.message?.content??"").trim();results.cloudflareAI={ok:Boolean(content),error:content?null:"resposta vazia",shape:x&&typeof x==="object"?Object.keys(x):[]};}catch(e){results.cloudflareAI={ok:false,error:String(e?.message||e)}}}else results.cloudflareAI={ok:false,error:"binding ausente"};
      return json({ok:Object.values(results).some(x=>x.ok),providers:results});
    }

    if (url.pathname === "/api/generate-check") {
      try {
        const clientId=request.headers.get("x-destrave-client");
        if(!clientId) return json({ok:false,stage:"client",error:"Cliente não identificado"},{status:400});
        await ensureStateTable(env);
        const row=await env.DB.prepare("SELECT business_json, contents_json FROM client_state WHERE client_id = ?").bind(clientId).first();
        const business=row ? JSON.parse(row.business_json||"{}") : {};
        const history=row ? JSON.parse(row.contents_json||"[]") : [];
        return json({
          ok:true,
          stage:"preflight",
          client:true,
          profile:{
            hasName:Boolean(business.name),
            hasActivity:Boolean(business.activity||business.service),
            hasObjective:Boolean(business.objective),
            keys:Object.keys(business)
          },
          historyCount:history.length,
          providers:{gemini:Boolean(env.GEMINI_API_KEY),groq:Boolean(env.GROQ_API_KEY),cloudflareAI:Boolean(env.AI)}
        });
      } catch(e) {
        return json({ok:false,stage:"preflight",error:String(e?.message||e)},{status:500});
      }
    }

    if (url.pathname === "/api/focus-options" && request.method === "POST") {
      try {
        const body=await request.json(), business=body?.business||{};
        const offer=String(business.offer||business.activity||business.service||"").trim();
        if(!offer) return json({fronts:[]});
        const prompt=`CADASTRO: ${JSON.stringify({offer,difference:business.difference||"",freeContext:business.freeContext||""})}
Separe SOMENTE os assuntos que a pessoa poderia escolher divulgar hoje.
1) Separe ofertas diferentes mesmo na mesma frase (ex.: serviço de manicure + curso VIP = dois botões).
2) Se difference estiver preenchido, inclua "Meus diferenciais".
3) Água, café, cappuccino, drinks, ambiente, mimo, ferramenta, horário e detalhes NÃO são botões.
4) Não copie a frase inteira do cadastro como botão se ela contém mais de uma oferta.
5) Não invente.
Rótulos curtos, linguagem comum, máximo 5.
JSON obrigatório: {"fronts":[{"label":"...","kind":"offer|differential"}]}`;
        let textOut="";
        const parse=(t)=>{try{return JSON.parse(String(t||"").replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim())}catch{return {}}};
        if(env.GEMINI_API_KEY){try{const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:700,responseMimeType:"application/json",thinkingConfig:{thinkingLevel:"medium"}}}),signal:AbortSignal.timeout(25000)});const d=await r.json();if(r.ok)textOut=(d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("")}catch(_){}}
        if(!textOut&&env.GROQ_API_KEY){try{const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},body:JSON.stringify({model:"openai/gpt-oss-120b",messages:[{role:"system",content:"Separe ofertas por significado. Somente JSON."},{role:"user",content:prompt}],temperature:0,max_completion_tokens:700,response_format:{type:"json_object"}}),signal:AbortSignal.timeout(25000)});const d=await r.json();if(r.ok)textOut=String(d.choices?.[0]?.message?.content||"")}catch(_){}}
        let fronts=Array.isArray(parse(textOut).fronts)?parse(textOut).fronts.filter(x=>x&&String(x.label||"").trim()).slice(0,5):[];
        // Falha segura: nunca devolva a frase inteira misturando várias ofertas.
        if(!fronts.length){
          fronts=[];
          if(/curso|mentoria|aula|treinamento/i.test(offer)){const m=offer.match(/(?:curso|mentoria|aula|treinamento)[^,;.]*$/i);if(m)fronts.push({label:m[0].trim(),kind:"offer"})}
          const service=offer.replace(/\s+e\s+(?:curso|mentoria|aula|treinamento).*$/i,"").replace(/^ofere[cç]o\s+/i,"").trim();
          if(service&&service!==offer)fronts.unshift({label:service,kind:"offer"});
          if(!fronts.length)fronts=[{label:"Meu trabalho",kind:"offer"}];
          if(String(business.difference||"").trim())fronts.push({label:"Meus diferenciais",kind:"differential"});
        }
        return json({fronts});
      } catch(e){return json({fronts:[{label:"Meu trabalho",kind:"offer"}],error:String(e?.message||e)});}
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const clientId = request.headers.get("x-destrave-client");
        if (!clientId) return json({ok:false,error:"Cliente não identificado"},{status:400});
        if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY && !env.AI) return json({ok:false,error:"Nenhum motor de IA está configurado."},{status:503});
        await ensureStateTable(env);
        const row = await env.DB.prepare("SELECT business_json, contents_json FROM client_state WHERE client_id = ?").bind(clientId).first();
        const business = row ? JSON.parse(row.business_json || "{}") : {};
        const history = row ? JSON.parse(row.contents_json || "[]") : [];
        const body = await request.json();
        const requestToday = String(body.topic || "").trim();
        const selectedFocus = String(body.focus || body.topic || "").trim();
        const goal = String(body.goal || "Movimentar");
        const requestedFormat = String(body.requestedFormat || "Livre");
        if (!business.name || !(business.activity || business.service) || !business.objective) {
          return json({ok:false,error:"Complete primeiro o cadastro do Destrave."},{status:400});
        }
        const activeWorkContext = String(business.workContextId || business.offer || business.activity || business.service || "").trim().toLowerCase().replace(/\s+/g," ");
        const relevantHistory = activeWorkContext
          ? history.filter(x => String(x?.workContextId || "").trim().toLowerCase().replace(/\s+/g," ") === activeWorkContext)
          : [];
        const recent = relevantHistory.slice(0,8).map(x=>({title:x.title,format:x.format,executionFeedback:x.executionFeedback||"Não informado",executionFeedbackAt:x.executionFeedbackAt||"",text:String(x.text||"").slice(0,1200)}));
        const redo = Boolean(body.redo);
        const focusNorm = selectedFocus.toLowerCase().replace(/\s+/g," ").trim();
        const factVault = {
          name: business.name || "",
          activity: business.activity || business.service || "",
          objective: business.objective || "",
          mainGoal: Array.isArray(business.mainGoal) ? business.mainGoal.join(", ") : (business.mainGoal || ""),
          digitalStage: business.digitalStage || business.stage || "",
          audience: business.audience || "",
          difference: business.difference || "",
          objections: business.objections || "",
          voice: Array.isArray(business.voice) ? business.voice.join(", ") : (business.voice || ""),
          appearance: business.appearance || business.appearancePreference || "",
          freeContext: business.freeContext || "",
          goalToday: goal,
          requestToday: requestToday || "",
          selectedFocus: selectedFocus || ""
        };
        const confirmedFactLines = Object.entries(factVault).filter(([,v]) => String(v || "").trim()).map(([k,v]) => "- " + k + ": " + String(v).trim()).join("\n");
        const knownFactText = Object.values(factVault).filter(v=>String(v||"").trim()).join(" ").toLowerCase();
        const forbiddenAssumptions = [
          {re:/\blink(?: na bio| abaixo)?\b/i, allow:/\blink\b/i},
          {re:/\bagenda aberta\b/i, allow:/\bagenda aberta\b/i},
          {re:/\bpront[oa] para entrega\b/i, allow:/\bpront[oa] para entrega\b/i},
          {re:/\brec[eé]m[- ]?feito\b/i, allow:/\brec[eé]m[- ]?feito\b/i},
          {re:/\bembalagem personalizada\b/i, allow:/\bembalagem personalizada\b/i},
          {re:/\bpromo[cç][aã]o\b/i, allow:/\bpromo[cç][aã]o\b/i},
          {re:/\bdesconto\b/i, allow:/\bdesconto\b/i},
          {re:/\bestoque\b/i, allow:/\bestoque\b/i},
          {re:/\bdepoimento\b/i, allow:/\bdepoimento\b/i},
          {re:/\bcliente(?:s)? (?:disse|falou|amou|adorou)\b/i, allow:/\bcliente(?:s)?\b/i}
        ];
        const promisePatterns = [
          /\bgera(?:r)? encomendas\b/i,/\bgera(?:r)? vendas\b/i,/\bvai vender\b/i,
          /\bvende por voc[eê]\b/i,/\bcria desejo instant[aâ]neo\b/i,/\bgarante (?:vendas|clientes|encomendas)\b/i
        ];
        const placeholderPattern = /\[[^\]]+\]|\{\{[^}]+\}\}/;
        function collectTextLeaves(value,out=[]){
          if(Array.isArray(value)){ for(const item of value) collectTextLeaves(item,out); return out; }
          if(value && typeof value==="object"){ for(const item of Object.values(value)) collectTextLeaves(item,out); return out; }
          if(typeof value==="string") out.push(value);
          return out;
        }
        function deterministicAudit(candidate){
          const textLeaves=collectTextLeaves(candidate);
          const serialized=textLeaves.join("\n");
          const violations=[];
          // IMPORTANT: audit only actual text values. JSON.stringify(candidate) contains structural
          // [ ... ] for arrays (e.g. stories), which was falsely detected as a placeholder.
          if (textLeaves.some(text=>placeholderPattern.test(text))) violations.push("placeholder");
          for (const p of promisePatterns) if (p.test(serialized)) violations.push("promessa de resultado");
          for (const rule of forbiddenAssumptions) {
            if (rule.re.test(serialized) && !rule.allow.test(knownFactText)) violations.push("fato operacional não confirmado: "+String(rule.re));
          }
          // Isolamento semântico: nomes explícitos de outras frentes do cadastro não podem vazar.
          const possibleOther=[business.offer,business.activity,business.service]
            .flatMap(v=>Array.isArray(v)?v:[v])
            .filter(Boolean)
            .map(v=>String(v).trim())
            .filter(v=>v && normalizeComparable(v)!==normalizeComparable(selectedFocus));
          for(const other of possibleOther){
            if(other.length>=4 && serialized.toLowerCase().includes(other.toLowerCase())) violations.push("mistura de foco: "+other);
          }
          return [...new Set(violations)];
        }
        function normalizeComparable(v){return String(v||"").toLowerCase().replace(/[^a-z0-9áàâãéèêíïóôõöúçñ ]/gi," ").replace(/\s+/g," ").trim()}
        const focusIsDifferential=/diferencia/i.test(selectedFocus);
        const cleanContext={
          name:business.name||"",
          focus:selectedFocus,
          goal,
          audience:business.audience||"",
          digitalStage:business.digitalStage||"",
          voice:Array.isArray(business.voice)?business.voice.join(", "):(business.voice||""),
          objections:business.objections||"",
          focusFacts: focusIsDifferential
            ? {difference:business.difference||"", evidence:business.freeContext||""}
            : {offer:selectedFocus, details:business.offerDetails||""}
        };
        const motherPrompt = `Você cria o Conteúdo do Dia do Destrave.

CONTEXTO PERMITIDO:
${JSON.stringify(cleanContext)}
HISTÓRICO PARA EVITAR REPETIÇÃO:
${JSON.stringify(recent.slice(0,4))}

MISSÃO
Crie UM pacote sobre o foco "${selectedFocus}". Não fale de nenhuma outra frente do cadastro.
A pessoa pode não entender marketing: entregue execução literal, não conselho.

REGRAS INEGOCIÁVEIS
- Use somente fatos do CONTEXTO PERMITIDO. Não invente técnica, estilo, preço, duração, resultado, cliente, depoimento, agenda, link, promoção, característica ou cena específica não confirmada.
- Se o foco é curso, fale do curso. Não use cenas/detalhes do atendimento profissional só porque aparecem em outro lugar do cadastro.
- Se o foco é "Meus diferenciais", comunique primeiro a IDEIA CENTRAL de difference. evidence serve apenas para ilustrar essa ideia quando fizer sentido; não transforme água/café/drinks/mimos em assunto principal.
- Nada de "mostre seu diferencial", "fale dos benefícios" ou outra ordem abstrata. Diga exatamente o que gravar/mostrar e escreva a fala/texto pronto.
- Não use "swipe up". Para contato, use linguagem simples como "me chama no direct" somente quando apropriado.
- Reels, Stories, Feed e WhatsApp compartilham a mesma direção, mas cada um funciona sozinho.
- STORIES NUNCA é uma tela solta. Quando a entrega escolhida for uma sequência para sustentar o assunto ao longo do dia, entregue de 7 a 10 Stories. Para uma execução curta, use apenas a quantidade necessária, mas preserve começo, desenvolvimento e fechamento.
- A sequência deve conduzir IDENTIFICAÇÃO → APROFUNDAMENTO → NOVA PERCEPÇÃO → SOLUÇÃO → VALOR NA VIDA → PROVA → OBJEÇÃO → DESEJO → CTA, adaptando e combinando etapas quando o objetivo pedir.
- NUNCA encerre uma sequência em enquete, caixa de pergunta ou outra interação. Interação é ponte: use a resposta/pergunta para aumentar tensão, percepção ou desejo e continue até uma conclusão e ação.
- Se o objetivo for VENDER SERVIÇO, raciocine por: dor → rotina/situação → percepção → serviço → benefício → prova → objeção → desejo → CTA.
- Se o objetivo for VENDER CURSO, raciocine por: problema → erro → consequência → nova forma de fazer → método/forma ensinada SOMENTE se estiver confirmada → prova → objeção → transformação → CTA.
- Se o objetivo for DIVULGAR PRODUTO, raciocine por: desejo → problema → produto → diferencial → uso → benefício → prova → objeção → CTA.
- Se o objetivo for gerar AUTORIDADE/PERCEPÇÃO, raciocine por: realidade/situação → percepção → pergunta → erro → explicação → nova percepção → exemplo → prova → conclusão → CTA de interação.
- "Prova" nunca autoriza invenção: use apenas prova real presente no contexto. Se não houver prova confirmada, substitua essa função por demonstração, explicação ou evidência factual disponível.
- Resultado, benefício, transformação e método também obedecem ao cofre de fatos: não invente promessa, resultado de cliente, técnica ou método que a pessoa não informou.
- Os Stories devem parecer uma conversa contínua. Cada tela nasce da anterior e cria tensão, percepção, desejo e ação; não entregue tópicos independentes empilhados.
- Se faltam detalhes sobre a oferta, NÃO invente. Se ainda for possível criar algo específico e valioso, faça. Se a falta impedir um conteúdo digno de produto pago, use needsInput=true e faça UMA pergunta factual curta que aumente muito a qualidade (por exemplo, o que a pessoa aprende/recebe nessa oferta). Não faça pergunta de marketing nem pergunte algo que já está no contexto.
- A entrega precisa ser específica o bastante para valer um produto pago e simples o bastante para uma iniciante executar sem pensar "tá, mas como eu faço isso?".

RETORNE SOMENTE JSON:
{"needsInput":false,"question":"","directionTitle":"","why":"","reels":{"title":"","hook":"","steps":[],"script":"","screenText":"","caption":"","cta":""},"stories":[{"title":"Story 1","show":"","say":"","screenText":"","interaction":""},{"title":"Story 2","show":"","say":"","screenText":"","interaction":""},{"title":"Story 3","show":"","say":"","screenText":"","interaction":""},{"title":"Story 4","show":"","say":"","screenText":"","interaction":""},{"title":"Story 5","show":"","say":"","screenText":"","interaction":""},{"title":"Story 6","show":"","say":"","screenText":"","interaction":""},{"title":"Story 7","show":"","say":"","screenText":"","interaction":""}],"feed":{"format":"","instructions":"","slides":[],"caption":"","cta":""},"whatsapp":{"format":"","instructions":"","text":""},"quickVersion":"","motivation":""}`
        let textOut="";
        let modelUsed="";
        let lastError="";

        // Cadeia de geração: cada motor falha de forma independente e o próximo assume.
        // Os detalhes ficam somente no backend/JSON técnico; a interface continua mostrando mensagem amigável.
        const providerErrors=[];
        const rememberError=(provider,error)=>providerErrors.push(provider+": "+String(error?.message||error||"erro desconhecido").slice(0,500));

        // Motor 1: Gemini.
        if (env.GEMINI_API_KEY) {
          try {
            const geminiUrl="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
            const gr=await fetch(geminiUrl,{
              method:"POST",
              headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
              body:JSON.stringify({
                contents:[{parts:[{text:motherPrompt}]}],
                generationConfig:{maxOutputTokens:7000,responseMimeType:"application/json",thinkingConfig:{thinkingLevel:"low"}}
              }),
              signal:AbortSignal.timeout(55000)
            });
            const raw=await gr.text();
            let gd={}; try{gd=JSON.parse(raw)}catch{}
            if(gr.ok){
              textOut=(gd.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
              if(textOut) modelUsed="gemini-3.6-flash";
              else rememberError("gemini","resposta vazia");
            }else rememberError("gemini",gd?.error?.message||("HTTP "+gr.status));
          }catch(error){rememberError("gemini",error)}
        } else rememberError("gemini","chave ausente");

        // Motor 2: Groq. Se o modelo principal falhar, tenta o modelo menor antes de abandonar o provedor.
        if (!textOut && env.GROQ_API_KEY) {
          for (const groqModel of ["openai/gpt-oss-120b","openai/gpt-oss-20b"]) {
            if(textOut) break;
            try {
              const rr=await fetch("https://api.groq.com/openai/v1/chat/completions",{
                method:"POST",
                headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},
                body:JSON.stringify({
                  model:groqModel,
                  messages:[
                    {role:"system",content:"Responda somente com JSON válido, sem markdown nem comentários."},
                    {role:"user",content:motherPrompt}
                  ],
                  temperature:0.82,
                  max_completion_tokens:7000,
                  reasoning_effort:"low",
                  response_format:{type:"json_object"}
                }),
                signal:AbortSignal.timeout(55000)
              });
              const raw=await rr.text();
              let rd={}; try{rd=JSON.parse(raw)}catch{}
              if(rr.ok){
                textOut=String(rd.choices?.[0]?.message?.content||"").trim();
                if(textOut) modelUsed="groq/"+groqModel;
                else rememberError("groq/"+groqModel,"resposta vazia");
              }else rememberError("groq/"+groqModel,rd?.error?.message||("HTTP "+rr.status));
            }catch(error){rememberError("groq/"+groqModel,error)}
          }
        } else if(!textOut) rememberError("groq","chave ausente");

        // Motor 3: Cloudflare Workers AI. Continua disponível inclusive no plano Workers Free.
        if (!textOut && env.AI) {
          try {
            const cr=await Promise.race([
              env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast",{
                messages:[
                  {role:"system",content:"Responda somente com JSON valido, sem markdown nem comentarios."},
                  {role:"user",content:motherPrompt}
                ],
                max_tokens:7000,
                temperature:0.82
              }),
              new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout após 55s")),55000))
            ]);
            const cloudflareText=String(cr?.response ?? cr?.choices?.[0]?.message?.content ?? "").trim();
            if(cloudflareText){textOut=cloudflareText;modelUsed="cloudflare/llama-3.3-70b-instruct-fp8-fast"}
            else rememberError("cloudflare","resposta vazia");
          }catch(error){rememberError("cloudflare",error)}
        } else if(!textOut) rememberError("cloudflare","binding AI ausente");

        if (!textOut) {
          console.error("DESTRAVE_AI_CHAIN_FAILED",providerErrors);
          return json({ok:false,error:"Não consegui gerar o conteúdo agora.",code:"AI_CHAIN_FAILED",details:providerErrors},{status:502});
        }
        let plan;
        try { plan=JSON.parse(textOut.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim()); }
        catch(error) {
          console.error("DESTRAVE_AI_INVALID_JSON",{model:modelUsed,error:String(error),preview:textOut.slice(0,500)});
          return json({ok:false,error:"A IA respondeu fora da estrutura do Destrave. Tente refazer.",code:"INVALID_AI_JSON",model:modelUsed},{status:502});
        }

        // FISCAL DO DESTRAVE: segunda etapa independente da criação.
        // Não cria uma nova estratégia. Audita a resposta pronta contra os fatos confirmados
        // e devolve o MESMO JSON corrigido quando encontrar invenções ou decisões não autorizadas.
        if (env.GROQ_API_KEY) {
          try {
            const validatorPrompt = `Você é o FISCAL do Destrave.
COFRE DE FATOS:
${confirmedFactLines || "- Nenhum fato adicional confirmado."}
PERFIL:
${JSON.stringify(business)}
PEDIDO:
${JSON.stringify({goal, requestedFormat, requestToday})}
JSON GERADO:
${JSON.stringify(plan)}

Audite e corrija o JSON sem mudar o schema.
Exija: uma direção central específica; Reels, Stories, Feed e WhatsApp coerentes com a mesma direção e utilizáveis separadamente; execução realmente pronta; quickVersion simples; motivation obrigatória e específica.
Reprove conteúdo genérico, marketinguês, decisões estratégicas devolvidas à pessoa, operação óbvia de celular, invenções, promessas de resultado, CTAs empilhados e formatos desconectados.
TESTE DO DESTRAVAMENTO: reprove qualquer instrução que ainda exija que a pessoa descubra o que mostrar, falar ou escrever. "Apresente seu diferencial", "mostre sua experiência" e "fale dos benefícios" são insuficientes sem execução literal.
Não permita que detalhes, comodidades, recursos ou diferenciais do cadastro virem uma frente ou substituam o foco escolhido. Eles só podem aparecer como evidência contextual quando forem diretamente úteis ao foco.
O foco selecionado é fronteira rígida: se for curso, audite como conteúdo de curso; não permita migração para o serviço relacionado.
Tolerância zero: remova fatos não confirmados como link na bio, agenda aberta, disponibilidade, produto pronto hoje, sabores, datas, entrega, promoção, preço, botão/link, estoque ou resultados. Remova placeholders. Se um dado for indispensável, needsInput=true com uma única pergunta factual.
Condição de execução muda COMO fazer, não deve virar a estratégia inteira. Reprove ângulo óbvio que uma IA comum entregaria quase igual a qualquer pessoa da mesma profissão.
Reprove causalidade comercial não comprovada ("gera encomendas", "vai vender", "cria desejo instantâneo", "vende por você").
GERADO NÃO É EXECUTADO: histórico anterior não prova publicação ou ação. Use executionFeedback como fonte explícita: Fiz=executado; Fiz uma parte=parcial; Hoje não consegui=não executado; Não informado=desconhecido.\nA direção deve nascer de pessoa + oferta + público + momento digital + objetivo + histórico de execução + condição atual. Profissão é contexto, não estratégia automática. Preserve a direção contínua: autonomia não significa deixar a pessoa sem próximo movimento.
Fale diretamente com "você".
A pessoa recebe todas as possibilidades, mas nunca deve ser tratada como obrigada a executar todas.
needsInput=true é EXCEÇÃO ABSOLUTA. Só use quando faltar um fato sem o qual seja literalmente impossível produzir qualquer conteúdo verdadeiro e executável. Nunca use needsInput para disponibilidade, lançamento/download, preço, estoque, agenda, entrega, promoção, link, botão, data ou detalhes que possam ser omitidos. Se houver qualquer caminho verdadeiro com os fatos existentes, needsInput=false e entregue o conteúdo completo.
Retorne somente JSON válido.`

            const vb=JSON.stringify({
              model:"openai/gpt-oss-120b",
              messages:[
                {role:"system",content:"Audite com rigor factual. Retorne somente JSON válido."},
                {role:"user",content:validatorPrompt}
              ],
              temperature:0.15,
              max_completion_tokens:7000,
              response_format:{type:"json_object"}
            });
            const vr=await fetch("https://api.groq.com/openai/v1/chat/completions",{
              method:"POST",
              headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},
              body:vb
            });
            const vd=await vr.json();
            if (vr.ok) {
              const checked=String(vd.choices?.[0]?.message?.content||"").trim();
              if (checked) {
                const checkedPlan=JSON.parse(checked.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim());
                if (checkedPlan && typeof checkedPlan==="object" && typeof checkedPlan.needsInput==="boolean" && (checkedPlan.needsInput || (checkedPlan.reels && Array.isArray(checkedPlan.stories) && checkedPlan.feed && checkedPlan.whatsapp))) {
                  plan=checkedPlan;
                  modelUsed += "+fiscal";
                }
              }
            }
          } catch (_) {
            // Se o fiscal estiver temporariamente indisponível, preserva a geração válida
            // em vez de derrubar toda a experiência do usuário.
          }
        }

        // GUARDA FINAL DETERMINÍSTICA: o modelo fiscal não tem a palavra final sobre fatos básicos.
        // Se ainda restar placeholder, promessa forte ou pressuposição operacional detectável,
        // uma última correção é solicitada. Se ela não puder ser validada, a resposta é bloqueada.
        let hardViolations=deterministicAudit(plan);
        if (hardViolations.length && env.GROQ_API_KEY) {
          try {
            const repairPrompt=`Corrija SOMENTE as violações factuais abaixo no JSON do Conteúdo do Dia.
VIOLAÇÕES: ${hardViolations.join("; ")}
FATOS CONFIRMADOS:
${confirmedFactLines || "- nenhum"}
JSON:
${JSON.stringify(plan)}
Regras: não invente substitutos; não use placeholders; se o dado for dispensável, reescreva sem ele; se for indispensável, needsInput=true e faça uma única pergunta factual. Preserve o schema e a direção quando possível. Retorne somente JSON válido.`;
            const rb=JSON.stringify({
              model:"openai/gpt-oss-120b",
              messages:[{role:"system",content:"Correção factual estrita. Somente JSON válido."},{role:"user",content:repairPrompt}],
              temperature:0.05,max_completion_tokens:7000,response_format:{type:"json_object"}
            });
            const rr=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},body:rb});
            const rd=await rr.json();
            if(rr.ok){
              const repaired=JSON.parse(String(rd.choices?.[0]?.message?.content||"").replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim());
              if(repaired && typeof repaired==="object") plan=repaired;
            }
          } catch(_){}
          hardViolations=deterministicAudit(plan);
        }
        if(hardViolations.length){
          // A guarda factual não deve derrubar todo o Conteúdo do Dia por detalhes dispensáveis.
          // Faz uma última limpeza determinística dos dois casos seguros de remover: placeholders
          // e instruções que presumem "link". O restante continua protegido.
          const cleanStrings=(value)=>{
            if(Array.isArray(value)) return value.map(cleanStrings);
            if(value && typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cleanStrings(v)]));
            if(typeof value!=="string") return value;
            return value
              .replace(/\[[^\]]+\]|\{\{[^}]+\}\}/g,"")
              .replace(/(?:acesse|clique|toque|confira|veja|saiba mais)(?:\s+(?:no|pelo|atrav[eé]s do))?\s+link(?:\s+na bio|\s+abaixo)?/gi,"me chame")
              .replace(/\blink(?:\s+na bio|\s+abaixo)\b/gi,"")
              .replace(/\s{2,}/g," ").trim();
          };
          plan=cleanStrings(plan);
          hardViolations=deterministicAudit(plan);
          // Um placeholder remanescente pode vir de sintaxe editorial inocente produzida pelo modelo.
          // Nunca derrube a geração inteira só por isso: remova-o uma segunda vez de forma recursiva.
          if(hardViolations.length===1 && hardViolations[0]==="placeholder"){
            plan=cleanStrings(plan);
            const scrubPlaceholders=(value)=>{
              if(Array.isArray(value)) return value.map(scrubPlaceholders);
              if(value && typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,scrubPlaceholders(v)]));
              if(typeof value!=="string") return value;
              return value.replace(/\[[^\]]*\]|\{\{[^}]*\}\}/g,"").replace(/\s{2,}/g," ").trim();
            };
            plan=scrubPlaceholders(plan);
            hardViolations=deterministicAudit(plan);
          }
        }
        if(hardViolations.length){
          return json({ok:false,error:"O Destrave bloqueou uma resposta que usava informação não confirmada. Tente criar outra versão.",code:"FACT_GUARD",details:hardViolations},{status:422});
        }

        return json({ok:true,plan,text:JSON.stringify(plan),format:"Conteúdo do dia",model:modelUsed});
      } catch(error) {
        return json({ok:false,error:"Falha ao gerar conteúdo",message:error.message},{status:500});
      }
    }

    if (url.pathname === "/api/state") {
      try {
        await ensureStateTable(env);
        const clientId = request.headers.get("x-destrave-client");
        if (!clientId) return json({ ok:false, error:"Cliente não identificado" }, { status:400 });

        if (request.method === "GET") {
          const row = await env.DB.prepare(
            "SELECT business_json, contents_json FROM client_state WHERE client_id = ?"
          ).bind(clientId).first();
          return json({
            ok:true,
            business: row ? JSON.parse(row.business_json || "{}") : {},
            contents: row ? JSON.parse(row.contents_json || "[]") : []
          });
        }

        if (request.method === "PUT") {
          const body = await request.json();
          const business = body.business && typeof body.business === "object" ? body.business : {};
          const contents = Array.isArray(body.contents) ? body.contents : [];
          await env.DB.prepare(`
            INSERT INTO client_state (client_id, business_json, contents_json, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(client_id) DO UPDATE SET
              business_json=excluded.business_json,
              contents_json=excluded.contents_json,
              updated_at=CURRENT_TIMESTAMP
          `).bind(clientId, JSON.stringify(business), JSON.stringify(contents)).run();
          return json({ok:true});
        }

        return json({ok:false,error:"Método não permitido"},{status:405});
      } catch (error) {
        return json({ok:false,error:"Falha ao salvar dados",message:error.message},{status:500});
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "Rota não encontrada" }, { status: 404 });
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === "function") return env.ASSETS.fetch(request);
    return json({ok:false,error:"Assets indisponíveis neste ambiente.",code:"ASSETS_BINDING_MISSING"},{status:503});
  }
};
