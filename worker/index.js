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

    // LABORATÓRIO INTERNO DO CÉREBRO
    // Perfis sintéticos usam IDs próprios (lab:*) e nunca leem/escrevem o cadastro de um cliente real.
    // A rota é deliberadamente inacessível sem LAB_TEST_KEY configurada no Worker.
    if (url.pathname === "/api/lab/seed" && request.method === "POST") {
      try {
        const supplied=request.headers.get("x-destrave-lab-key")||"";
        if(!env.LAB_TEST_KEY || supplied!==env.LAB_TEST_KEY) return json({ok:false,error:"Rota não encontrada"},{status:404});
        await ensureStateTable(env);
        const body=await request.json();
        const profileKey=String(body?.profileKey||"").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40);
        const runKey=String(body?.runKey||"default").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40);
        const business=body?.business&&typeof body.business==="object"?body.business:null;
        const contents=Array.isArray(body?.contents)?body.contents:[];
        if(!profileKey||!business?.name||!(business.activity||business.service)||!business.objective){
          return json({ok:false,error:"Perfil de laboratório incompleto"},{status:400});
        }
        const clientId="lab:"+profileKey+":"+runKey;
        await env.DB.prepare(`
          INSERT INTO client_state (client_id, business_json, contents_json, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(client_id) DO UPDATE SET
            business_json=excluded.business_json,
            contents_json=excluded.contents_json,
            updated_at=CURRENT_TIMESTAMP
        `).bind(clientId,JSON.stringify({...business,isLabProfile:true}),JSON.stringify(contents)).run();
        return json({ok:true,clientId,historyCount:contents.length});
      } catch(error) {
        return json({ok:false,error:"Falha ao preparar perfil de laboratório",message:error.message},{status:500});
      }
    }

    if (url.pathname === "/api/lab/state" && request.method === "GET") {
      try {
        const supplied=request.headers.get("x-destrave-lab-key")||"";
        if(!env.LAB_TEST_KEY || supplied!==env.LAB_TEST_KEY) return json({ok:false,error:"Rota não encontrada"},{status:404});
        const clientId=String(url.searchParams.get("clientId")||"");
        if(!clientId.startsWith("lab:")) return json({ok:false,error:"Perfil de laboratório inválido"},{status:400});
        await ensureStateTable(env);
        const row=await env.DB.prepare("SELECT business_json, contents_json FROM client_state WHERE client_id = ?").bind(clientId).first();
        return json({ok:true,clientId,business:row?JSON.parse(row.business_json||"{}"):{},contents:row?JSON.parse(row.contents_json||"[]"):[]});
      } catch(error) {
        return json({ok:false,error:"Falha ao ler laboratório",message:error.message},{status:500});
      }
    }

    // Painel interno do laboratório: nunca é servido sem a chave secreta na própria URL.
    // A chave fica somente na sessão do navegador e não é gravada no app nem no GitHub.
    if (url.pathname === "/__destrave_lab") {
      const supplied=url.searchParams.get("key")||"";
      if(!env.LAB_TEST_KEY || supplied!==env.LAB_TEST_KEY) return new Response("Not found",{status:404});
      const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Destrave Lab</title><style>
      body{font-family:system-ui;background:#17120f;color:#f7f1e8;margin:0;padding:24px}main{max-width:760px;margin:auto}.card{background:#241b16;border:1px solid #6d533e;border-radius:18px;padding:20px;margin:16px 0}h1{color:#d6b27a}label{display:block;margin:12px 0 5px}input,textarea,select,button{box-sizing:border-box;width:100%;padding:12px;border-radius:10px;border:1px solid #765d48;background:#fffaf2;color:#241b16}textarea{min-height:90px}button{margin-top:14px;background:#d6b27a;font-weight:700;cursor:pointer}.muted{opacity:.72;font-size:13px}pre{white-space:pre-wrap;word-break:break-word;background:#0f0c0a;padding:14px;border-radius:12px;max-height:55vh;overflow:auto}</style></head><body><main>
      <h1>Destrave · Laboratório do cérebro</h1><p class="muted">Ambiente isolado. IDs lab:* não entram no cadastro normal dos clientes.</p>
      <div class="card"><label>Perfil</label><select id="profile"><option value="manicure">Manicure — serviço + curso</option><option value="cantora">Cantora — começando do zero</option><option value="confeiteira">Confeiteira — encomendas</option><option value="loja">Loja de cosméticos</option><option value="autonomo">Autônomo — serviço</option></select>
      <label>Rodada isolada</label><input id="run" value="teste-1"><button id="seed">Preparar perfil</button><div id="seedStatus" class="muted"></div></div>
      <div class="card"><label>Objetivo de hoje</label><select id="goal"><option>Movimentar</option><option>Vender</option><option>Autoridade</option><option>Conexão</option></select><label>Foco de hoje (opcional)</label><input id="focus" placeholder="Ex.: serviço de manicure"><button id="generate">Gerar conteúdo do dia</button><div id="genStatus" class="muted"></div></div>
      <div class="card"><strong>Resultado real do cérebro</strong><pre id="out">Nenhum teste executado ainda.</pre></div>
      <script>
      const key=new URLSearchParams(location.search).get("key");let clientId="";
      const profiles={
       manicure:{name:"Marina",activity:"Nail designer com atendimento individual e também curso de manicure",offer:"Alongamento e manutenção de unhas; curso de manicure",objective:"Divulgar meu trabalho e gerar vendas",audience:"Mulheres que valorizam unhas naturais, bonitas e resistentes; iniciantes interessadas em aprender manicure",difference:"Atendimento exclusivo, uma cliente por vez, ambiente acolhedor, foco em durabilidade, naturalidade e resistência",digitalStage:"Já divulga nas redes sociais",voice:["natural","simples","elegante"],workContextId:"manicure-servico-curso"},
       cantora:{name:"Lia",activity:"Cantora começando a construir presença na internet",offer:"Meu trabalho como cantora",objective:"Começar a aparecer e construir público",audience:"Pessoas que podem se identificar com minha música",difference:"",digitalStage:"Nunca publicou conteúdo profissionalmente",voice:["natural","emocional"],workContextId:"cantora-inicio"},
       confeiteira:{name:"Clara",activity:"Confeiteira",offer:"Bolos e doces por encomenda",objective:"Divulgar meu trabalho e gerar pedidos",audience:"Pessoas procurando doces e bolos para comemorações",difference:"Produção artesanal",digitalStage:"Já posta às vezes",voice:["natural","simples"],workContextId:"confeitaria"},
       loja:{name:"Bella Cosméticos",activity:"Loja de cosméticos",offer:"Cosméticos e produtos de beleza",objective:"Divulgar produtos e aumentar vendas",audience:"Pessoas interessadas em beleza e autocuidado",difference:"Variedade de produtos",digitalStage:"Já vende e divulga online",voice:["simples","descontraído"],workContextId:"loja-cosmeticos"},
       autonomo:{name:"Carlos",activity:"Prestador de serviços autônomo",offer:"Serviço profissional sob contratação",objective:"Conseguir mais clientes",audience:"Pessoas que precisam do serviço",difference:"Atendimento direto com o próprio profissional",digitalStage:"Posta pouco",voice:["simples","firme"],workContextId:"autonomo"}
      };
      async function api(path,opts={}){opts.headers={...(opts.headers||{}),"x-destrave-lab-key":key};const r=await fetch(path,opts);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.message||("HTTP "+r.status));return d}
      seed.onclick=async()=>{try{seedStatus.textContent="Preparando...";const p=profile.value;const d=await api("/api/lab/seed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({profileKey:p,runKey:run.value,business:profiles[p],contents:[]})});clientId=d.clientId;seedStatus.textContent="Pronto: "+clientId}catch(e){seedStatus.textContent="Erro: "+e.message}}
      generate.onclick=async()=>{try{if(!clientId)throw new Error("Prepare o perfil primeiro.");genStatus.textContent="Gerando com as IAs reais...";out.textContent="Aguarde...";const d=await api("/api/generate",{method:"POST",headers:{"content-type":"application/json","x-destrave-client":clientId},body:JSON.stringify({goal:goal.value,focus:focus.value,requestedFormat:"Livre"})});out.textContent=JSON.stringify(d.plan||d,null,2);genStatus.textContent="Geração concluída · "+(d.model||"modelo não informado")}catch(e){genStatus.textContent="Erro: "+e.message;out.textContent=e.stack||e.message}}
      </script></main></body></html>`;
      return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","referrer-policy":"no-referrer"}});
    }

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
        if (clientId.startsWith("lab:")) {
          const supplied=request.headers.get("x-destrave-lab-key")||"";
          if(!env.LAB_TEST_KEY || supplied!==env.LAB_TEST_KEY) return json({ok:false,error:"Cliente não identificado"},{status:400});
        }
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
          name:business.name||"", focus:selectedFocus, goal,
          audience:business.audience||"", digitalStage:business.digitalStage||"",
          voice:Array.isArray(business.voice)?business.voice.join(", "):(business.voice||""),
          objections:business.objections||"",
          focusFacts:focusIsDifferential
            ? {difference:business.difference||"",evidence:business.freeContext||""}
            : {offer:selectedFocus,details:business.offerDetails||""}
        };
        const motherPrompt = `Você é o cérebro estratégico do Destrave. Pense antes de escrever.

REGRA-MÃE DO DESTRAVE
Você é um estrategista de conteúdo independente de segmento. Nunca presuma que o negócio pertence a um nicho específico. Primeiro compreenda a oferta, o público, o contexto e o objetivo. Depois escolha a estratégia de comunicação adequada.
Não aplique uma fórmula fixa. Utilize uma arquitetura modular, selecionando apenas os elementos necessários para conduzir a pessoa da situação atual à percepção, emoção ou ação desejada.
Traduza características em benefícios e benefícios em impacto percebido na vida do público somente quando essa relação fizer sentido para a oferta.
Não invente dores, desejos, resultados, provas, números, características ou benefícios não fornecidos ou razoavelmente sustentados pelo contexto. Conhecimento geral do segmento pode apoiar o raciocínio e a execução, sem ser apresentado como fato particular daquele negócio.
Depois de definir a estratégia, adapte-a ao comportamento específico do canal escolhido: Reels, Stories, Feed, Carrossel, Studio ou WhatsApp.
O objetivo não é produzir conteúdo sobre o produto, serviço ou projeto. É produzir a comunicação necessária para provocar a percepção, emoção ou ação definida pela estratégia.
Esta REGRA-MÃE tem precedência sobre exemplos, arquiteturas por objetivo e sugestões de canal abaixo. Essas estruturas são possibilidades modulares, nunca fórmulas obrigatórias.

ENTRADA
${JSON.stringify(cleanContext)}
HISTÓRICO (somente para progressão e não repetição)
${JSON.stringify(recent.slice(0,4))}

PIPELINE OBRIGATÓRIO — faça silenciosamente nesta ordem

1. DIAGNÓSTICO ESTRATÉGICO
Entenda quem receberá a mensagem, o que essa pessoa quer, o que a incomoda, o que precisa perceber e qual ângulo é mais adequado ao objetivo de hoje.
A pergunta central é: "O que essa pessoa precisa pensar, sentir ou fazer depois deste conteúdo?"
Não comece pelo procedimento, produto ou formato quando a cabeça do público oferece uma entrada mais humana.

2. ARQUITETURA DA CONVERSA
Escolha SOMENTE as etapas necessárias entre: PESSOA, PROBLEMA, DESEJO, NOVA PERCEPÇÃO, SOLUÇÃO, VALOR, PROVA, OBJEÇÃO e DECISÃO.
Não transforme isso em checklist visível. Construa progressão: tensão → percepção → desejo → ação.
A solução entra depois de existir contexto suficiente para ela ter valor.
REGRA-MÃE: NÃO VENDA O PROCEDIMENTO. COMUNIQUE O QUE O PROCEDIMENTO, PRODUTO, SERVIÇO OU APRENDIZADO PERMITE QUE A PESSOA VIVA.
Traduza característica → benefício → impacto percebido na vida/rotina, sem fabricar promessas.

3. CONTROLE DE EVIDÊNCIA
Use fatos do cadastro + conhecimento profissional geral seguro do segmento.
Conhecimento geral pode orientar etapas usuais, ferramentas comuns e explicações normais da profissão.
Ele NÃO pode virar fato particular inventado: técnica exclusiva, preço, prazo, duração numérica, certificação, cliente, depoimento, promoção, garantia ou resultado específico exigem confirmação.
Objeções cadastradas são temas legítimos. Podem ser explicadas; não viram automaticamente promessa.
Se prova real não existe no contexto, use demonstração/evidência disponível ou omita prova. Nunca invente.
Se faltar UM fato indispensável para produzir algo realmente valioso, needsInput=true e faça uma pergunta factual curta.

4. ADAPTAÇÃO AO CANAL
A estratégia vem antes do canal. Os canais compartilham a direção do dia, mas NÃO são cópias:
REELS: ganhar atenção rapidamente; gancho → tensão → entrega/virada → ação.
STORIES: conduzir uma conversa; identificação → aprofundamento → percepção → solução → valor/prova/objeção/desejo conforme necessário → fechamento/ação.
FEED/CARROSSEL: escolha a função mais adequada (atração, autoridade, desejo, prova, objeção ou conversão). Se carrossel: capa → progressão que dá motivo para deslizar → conclusão → ação.
WHATSAPP: conversa mais próxima; contexto/conexão → ponto central → apresentação quando necessária → objeção quando relevante → convite. Nunca copie a legenda do Instagram.
Cada canal deve cumprir uma função narrativa adequada a ele.

STORIES — REGRA UNIVERSAL
Quando a sequência sustentar o assunto ao longo do dia, use 7 a 10 Stories. Cada Story tem função própria e prepara o seguinte.
Nunca crie Stories isolados ou uma sequência de informações independentes.
Uma enquete, caixa, quiz ou slider NUNCA encerra. Interação é ponte para aprofundar a conversa.
Se um Story puder ser removido/trocado de posição sem prejudicar o raciocínio, reforce a narrativa.
O último Story fecha a conversa e conduz à ação coerente.
Para venda de serviço, considere: dor/rotina → percepção → serviço → benefício → evidência/prova → objeção → desejo → CTA.
Para curso: problema → erro → consequência → nova forma → método apenas se conhecido → evidência/prova → objeção → transformação → CTA.
Para produto: desejo → problema → produto → diferencial → uso → benefício → evidência/prova → objeção → CTA.
Para autoridade/percepção: situação → pergunta/percepção → erro → explicação → nova percepção → exemplo/evidência → conclusão → interação/ação.
São arquiteturas de decisão, não fórmulas obrigatórias.

5. EXECUÇÃO
A pessoa que usa o Destrave não é uma equipe. Fale com UMA pessoa, diretamente e no singular: "Grava...", "Mostra...", "Depois fala...".
A estratégia fica invisível. Não escreva relatório de agência nem ensine marketing.
Scripts, textos de tela e legendas devem soar como a própria pessoa falando com o público, respeitando voice.
Diga exatamente o que mostrar/gravar, o que falar, o que escrever e qual CTA usar. Nada de ordens abstratas como "mostre autoridade" ou "fale dos benefícios".
Não use "nós" salvo se o cadastro confirmar equipe. Não use "swipe up".
Não fale de outra frente além de "${selectedFocus}".

QUALIDADE FINAL
Antes de responder, confira silenciosamente:
- Comecei pela cabeça do público ou pulei direto para o procedimento?
- Existe progressão real de percepção/desejo, não apenas informação?
- Características foram traduzidas em benefício e impacto humano?
- Cada canal foi adaptado ao seu comportamento?
- Stories têm começo, desenvolvimento e fechamento e nenhuma interação ficou como desfecho?
- A voz parece uma pessoa sendo guiada, e não uma agência?
- Fatos particulares têm suporte e conhecimento geral não foi apresentado como fato exclusivo?
- Uma iniciante consegue executar sem perguntar "tá, mas como eu faço isso?"
- A direção usa algo específico DESTA pessoa/oferta/público ou serviria quase igual para qualquer profissional do segmento?
- Existe emoção/identificação/desejo sustentado pelos fatos, sem dramatizar nem inventar dor?
- Usei os diferenciais confirmados somente quando eles fortalecem esta direção, traduzindo-os em valor percebido em vez de apenas citá-los?
- O histórico representa progressão real ou estou repetindo o mesmo ângulo com palavras diferentes?
- Cada frase de execução já está pronta para usar, sem "fale sobre", "mostre seu diferencial", "explique os benefícios" ou outra tarefa que devolva a criação à pessoa?
Se qualquer resposta indicar conteúdo genérico, frio, repetitivo, vago ou pouco executável, reescreva silenciosamente ANTES de devolver o JSON. A primeira geração deve sair pronta para publicar; não conte com o botão Refazer para corrigir qualidade.

RETORNE SOMENTE JSON VÁLIDO:
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

Audite e corrija o JSON sem mudar o schema. Sua função não é apenas fiscalizar fatos: é impedir que uma resposta "quase boa" chegue ao usuário.
Exija: uma direção central específica; Reels, Stories, Feed e WhatsApp coerentes com a mesma direção e utilizáveis separadamente; execução realmente pronta; quickVersion simples; motivation obrigatória e específica.
Faça o TESTE DA PRIMEIRA GERAÇÃO: pergunte silenciosamente "Se eu fosse esta pessoa, com este negócio, este público, este momento digital, este objetivo e este histórico, eu conseguiria publicar exatamente isto sem pedir outra geração?" Se não, corrija agora.
Reprove conteúdo genérico, marketinguês, decisões estratégicas devolvidas à pessoa, operação óbvia de celular, invenções, promessas de resultado, CTAs empilhados e formatos desconectados.
Reprove também conteúdo tecnicamente correto porém frio, sem identificação, tensão, percepção, desejo ou humanidade quando o contexto permitir emoção verdadeira. Emoção deve nascer dos fatos e da situação do público; nunca invente trauma, dor, urgência ou desejo.
TESTE DE ESPECIFICIDADE: se a direção pudesse ser entregue quase igual a outra pessoa da mesma profissão trocando apenas o nome, reescreva usando os fatos realmente úteis deste cadastro. Diferenciais confirmados devem virar benefício/impacto percebido quando houver relação legítima, não uma lista de características.
TESTE DE PROGRESSÃO: compare com o histórico relevante. Não aceite o mesmo ângulo, gancho, raciocínio ou CTA apenas parafraseado. O próximo conteúdo deve avançar a comunicação, salvo quando executionFeedback indicar que algo não foi executado e repetir/adaptar for estrategicamente justificável.
TESTE DE COESÃO: Stories devem formar uma conversa em sequência; se um Story puder ser removido ou trocado de posição sem quebrar o raciocínio, fortaleça a progressão. Reels, Feed e WhatsApp compartilham a direção, mas cada um deve parecer nativo do canal, não cópia.
A resposta final deve parecer escrita para esta pessoa hoje, e não saída de um gerador de conteúdo.
TESTE DO DESTRAVAMENTO: reprove qualquer instrução que ainda exija que a pessoa descubra o que mostrar, falar ou escrever. "Apresente seu diferencial", "mostre sua experiência", "fale dos benefícios", "conte sua história", "mostre o processo" e equivalentes são insuficientes sem execução literal. Para cada trecho, deixe claro o que mostrar, a fala/texto utilizável e a ação seguinte, sem transformar a resposta em tutorial óbvio de celular.
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
        if (clientId.startsWith("lab:")) {
          const supplied=request.headers.get("x-destrave-lab-key")||"";
          if(!env.LAB_TEST_KEY || supplied!==env.LAB_TEST_KEY) return json({ok:false,error:"Cliente não identificado"},{status:400});
        }

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
