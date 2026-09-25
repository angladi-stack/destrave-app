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
        if(!(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"]) || supplied!==(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"])) return json({ok:false,error:"Rota não encontrada"},{status:404});
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
        if(!(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"]) || supplied!==(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"])) return json({ok:false,error:"Rota não encontrada"},{status:404});
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
    if (url.pathname === "/api/lab/panel") {
      const supplied=url.searchParams.get("key")||"";
      if(!(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"]) || supplied!==(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"])) return new Response("Not found",{status:404});
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
      generate.onclick=async()=>{try{if(!clientId)throw new Error("Prepare o perfil primeiro.");genStatus.textContent="Gerando com as IAs reais...";out.textContent="Aguarde...";const d=await api("/api/generate",{method:"POST",headers:{"content-type":"application/json","x-destrave-client":clientId},body:JSON.stringify({goal:goal.value,focus:focus.value,requestedFormat:"Livre"})});const result=(d&&d.plan&&Object.keys(d.plan).length)?d.plan:d;out.textContent=JSON.stringify(result,null,2);genStatus.textContent=(d&&d.plan&&Object.keys(d.plan).length)?"Geração concluída · "+(d.model||"modelo não informado"):"Resposta recebida sem conteúdo utilizável — veja o diagnóstico abaixo."}catch(e){genStatus.textContent="Erro: "+e.message;out.textContent=e.stack||e.message}}
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
          if(!(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"]) || supplied!==(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"])) return json({ok:false,error:"Cliente não identificado"},{status:400});
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
        const productIdentityText=[business.name,business.offer,business.activity,business.service,selectedFocus].filter(Boolean).join(" ");
        const isDestraveProduct=/\bdestrave\b/i.test(productIdentityText);
        const destraveProductVault=isDestraveProduct ? {
          product:"Destrave by Angladi",
          promise:"Entender contexto, objetivo e foco e entregar o próximo conteúdo pronto para executar.",
          rule:"Não entrega apenas ideias; entrega execução.",
          delivery:"Direção do dia adaptada para Reels, Stories, Feed/Carrossel e Status do WhatsApp.",
          focus:"O foco escolhido hoje é soberano.",
          positioning:"Não é curso de marketing, calendário de conteúdo nem ferramenta de publicação automática.",
          outcome:"Ajuda a sair do 'não sei o que fazer agora' para uma execução clara de comunicação, sem garantir resultado comercial."
        } : null;
        const factVault = {
          name: business.name || "",
          offer: business.offer || "",
          offerDetails: business.offerDetails || "",
          activity: business.activity || business.service || "",
          service: business.service || "",
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
          selectedFocus: selectedFocus || "",
          productVault: destraveProductVault || ""
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
          /\bvende por voc[eê]\b/i,/\bcria desejo instant[aâ]neo\b/i,/\bgarante (?:vendas|clientes|encomendas)\b/i,
          /\bos clientes aparecem\b/i,/\bcome[cç]a a ter resultados reais\b/i,
          /\bclareza total\b/i,/\batrair os clientes certos\b/i
        ];
        const placeholderPattern = /\[[^\]]+\]|\{\{[^}]+\}\}/;
        const alwaysForbiddenPatterns = [
          {re:/\bswipe up\b/i,label:"swipe up"},
          {re:/\b[\w-]+\.(?:mp4|mov|avi|jpg|jpeg|png|webp)\b/i,label:"arquivo de mídia inventado"}
        ];
        const numericEvidencePatterns = [
          /\b(?:h[aá]|por|duram?|dura|at[eé])\s+\d+\s*(?:dias?|semanas?|meses?)\b/i,
          /\b\d+\s*(?:dias?|semanas?|meses?)\b/i,
          /\bsem\s+(?:lascar|descasc(?:ar|a)|quebrar)\b/i
        ];
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
          for (const rule of alwaysForbiddenPatterns) if(rule.re.test(serialized)) violations.push(rule.label);
          for (const p of numericEvidencePatterns) if(p.test(serialized) && !p.test(knownFactText)) violations.push("prova/duração numérica não confirmada");
          for (const p of promisePatterns) if (p.test(serialized)) violations.push("promessa de resultado");
          const feedSlides=Array.isArray(candidate?.feed?.slides)?candidate.feed.slides:[];
          if(feedSlides.length){
            const emptyFeed=feedSlides.some((s,idx)=>{
              const t=typeof s==="string"?s:JSON.stringify(s||"");
              const n=normalizeComparable(t);
              return !n || new RegExp("^slide\\s*"+(idx+1)+"$","i").test(n) || /^(capa|problema|desejo|solu[cç][aã]o|cta|conclus[aã]o)$/i.test(n);
            });
            if(emptyFeed) violations.push("feed incompleto");
          }
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
          // Fronteiras explícitas para frentes comerciais comuns: se o perfil contém outra frente
          // mas o foco do dia não a contém, ela não pode reaparecer como oferta/CTA/hashtag.
          const profileCommercialText=[business.offer,business.activity,business.service].filter(Boolean).join(" ").toLowerCase();
          const focusText=String(selectedFocus||"").toLowerCase();
          const crossFrontTerms=[
            {term:"curso",re:/\bcurso(?:s)?\b|#curso\w*/i},
            {term:"mentoria",re:/\bmentoria(?:s)?\b|#mentoria\w*/i},
            {term:"aula",re:/\baula(?:s)?\b|#aula\w*/i},
            {term:"treinamento",re:/\btreinamento(?:s)?\b|#treinamento\w*/i}
          ];
          for(const x of crossFrontTerms){
            if(profileCommercialText.includes(x.term) && !focusText.includes(x.term) && x.re.test(serialized)){
              violations.push("mistura de foco: "+x.term);
            }
          }
          return [...new Set(violations)];
        }
        function normalizeComparable(v){return String(v||"").toLowerCase().replace(/[^a-z0-9áàâãéèêíïóôõöúçñ ]/gi," ").replace(/\s+/g," ").trim()}
        const focusIsDifferential=/diferencia/i.test(selectedFocus);
        const cleanContext={
          name:business.name||"",
          focus:selectedFocus || business.offer || business.activity || business.service || "",
          goalToday:goal,
          businessObjective:business.objective||"",
          mainGoal:Array.isArray(business.mainGoal)?business.mainGoal.join(", "):(business.mainGoal||""),
          offer:business.offer||business.activity||business.service||"",
          offerDetails:business.offerDetails||"",
          audience:business.audience||"",
          difference:business.difference||"",
          objections:business.objections||"",
          digitalStage:business.digitalStage||"",
          voice:Array.isArray(business.voice)?business.voice.join(", "):(business.voice||""),
          appearance:business.appearance||business.appearancePreference||"",
          freeContext:business.freeContext||"",
          requestToday:requestToday||"",
          focusFacts:focusIsDifferential
            ? {difference:business.difference||"",evidence:business.freeContext||""}
            : {selectedFocus:selectedFocus||"",details:business.offerDetails||""}
        };
        const motherPrompt = `Você é o cérebro estratégico do Destrave.

SUA FUNÇÃO
Você não é um gerador de ideias. Você decide o próximo movimento de comunicação e entrega a execução pronta.
A pessoa não deve terminar pensando "entendi a estratégia"; deve terminar sabendo exatamente o que publicar.

CONTEXTO REAL
${JSON.stringify(cleanContext)}
HISTÓRICO RELEVANTE
${JSON.stringify(recent.slice(0,4))}

PENSE NESTA ORDEM, EM SILÊNCIO
1. PESSOA: quem precisa receber esta mensagem e em que situação ela está?
2. SOLUÇÃO: o que a oferta escolhida realmente resolve, permite, facilita ou muda para essa pessoa? Não confunda solução com técnica, procedimento ou recurso.
3. PERCEPÇÃO: qual UMA coisa essa pessoa precisa perceber hoje para avançar?
4. MOVIMENTO: depois do conteúdo, o que ela deve estar mais disposta a pensar, sentir ou fazer?
5. EXECUÇÃO: só então transforme essa direção em Reels, Stories, Feed e Status do WhatsApp.

REGRAS CENTRAIS
- O foco escolhido é a fronteira do conteúdo. Outras frentes do cadastro são apenas contexto e não podem virar oferta, CTA, prova ou assunto do dia.
- Não reduza uma oferta específica a conselho genérico de marketing. "Poste simples", "tenha constância", "construa autoridade", "não precisa de estúdio" e frases parecidas só entram se forem realmente o ponto estratégico desta pessoa hoje.
- Pessoas compram solução, não técnica. Técnica/processo só aparece quando ajuda a compreender ou acreditar na solução.
- Emoção vem de reconhecimento: situação cotidiana, pensamento, tensão ou desejo plausível. Não dramatize e não invente dor.
- Use linguagem humana e concreta. Evite marketinguês e abstrações quando puder mostrar a experiência real da pessoa.
- Conhecimento geral seguro do segmento pode ajudar no raciocínio, mas nunca vire fato particular deste negócio.
- Não invente cliente, depoimento, antes/depois, número, prazo, resultado, técnica/material usado pela pessoa, método próprio, preço, promoção, disponibilidade, garantia, arquivo, link ou experiência pessoal não confirmada.
- Se "durabilidade", "naturalidade", "resistência" ou outro benefício qualitativo estiver confirmado, mantenha-o qualitativo; não invente causa técnica, prazo ou garantia.
- Se faltar um fato realmente indispensável, needsInput=true com UMA pergunta curta. Se for possível criar algo verdadeiro sem o dado, entregue.

CANAIS
REELS: gancho humano + desenvolvimento + virada/solução + ação. Entregue fala pronta e cenas executáveis.
STORIES: 7 a 10 quando a sequência sustentar o assunto. Faça uma conversa com começo, aprofundamento, percepção, solução/desejo e fechamento. Interação é ponte, nunca desfecho.
FEED/CARROSSEL: entregue a copy REAL de cada slide. Nunca devolva "Slide 1", "Problema", "Desejo", "Capa" ou rótulos vazios.
STATUS DO WHATSAPP: por padrão é conteúdo para POSTAR NO STATUS, não mensagem privada. Pode ser um Status único ou uma pequena sequência. Só crie mensagem individual se o pedido de hoje solicitar explicitamente conversa direta/prospecção.
QUICKVERSION: uma alternativa realmente rápida e pronta para executar no mesmo dia.
MOTIVATION: uma orientação curta, humana e específica; não relatório de estratégia.

EXECUÇÃO
- Fale com uma pessoa, no singular.
- Diga exatamente o que mostrar, falar e escrever.
- Não devolva decisões criativas para a usuária com "fale sobre", "mostre seu diferencial" ou "explique os benefícios".
- O campo why aparece na tela: fale diretamente com a pessoa. Nunca escreva "precisamos mostrar", "essa estratégia", "essa direção demonstra".
- Se o foco for serviço, o conteúdo conduz à percepção/desejo/conversa sobre o serviço; não transforme a profissional em professora de DIY.
- Se o foco for curso/aula/mentoria, ensinar/aprender pode fazer parte da direção.
- A primeira geração precisa estar pronta para publicar.

ANTES DE RESPONDER, VERIFIQUE
A direção nasceu da pessoa + solução + percepção + movimento?
O conteúdo está vendendo a solução percebida, e não explicando técnica?
A emoção está concreta e verdadeira?
Cada canal está completo e pronto?
O Feed tem textos reais?
O Status do WhatsApp é realmente um Status?
Existe algum fato particular inventado?
Existe alguma frase que serviria quase igual para qualquer negócio? Se sim, torne-a específica com fatos disponíveis.

RETORNE SOMENTE JSON VÁLIDO:
{"needsInput":false,"question":"","directionTitle":"","why":"","reels":{"title":"","hook":"","steps":[],"script":"","screenText":"","caption":"","cta":""},"stories":[{"title":"Story 1","show":"","say":"","screenText":"","interaction":""},{"title":"Story 2","show":"","say":"","screenText":"","interaction":""},{"title":"Story 3","show":"","say":"","screenText":"","interaction":""},{"title":"Story 4","show":"","say":"","screenText":"","interaction":""},{"title":"Story 5","show":"","say":"","screenText":"","interaction":""},{"title":"Story 6","show":"","say":"","screenText":"","interaction":""},{"title":"Story 7","show":"","say":"","screenText":"","interaction":""}],"feed":{"format":"","instructions":"","slides":[],"caption":"","cta":""},"whatsapp":{"format":"Status do WhatsApp","instructions":"","text":""},"quickVersion":"","motivation":""}`
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
            const validatorPrompt = `Você é o FISCAL do Destrave. Você NÃO é coautor e NÃO cria uma nova estratégia.

COFRE DE FATOS:
${confirmedFactLines || "- Nenhum fato adicional confirmado."}
PERFIL:
${JSON.stringify(business)}
PEDIDO:
${JSON.stringify({goal, requestedFormat, requestToday, selectedFocus})}
JSON DO CRIADOR:
${JSON.stringify(plan)}

MISSÃO
Preserve a direção, a voz e o texto do Criador sempre que estiverem válidos. Corrija SOMENTE trechos com erro objetivo. Se não houver erro, devolva o mesmo JSON.

AUDITE APENAS:
1. FATO INVENTADO: cliente/prova/depoimento, antes/depois, números, prazo, resultado, técnica/material/método particular não confirmado, preço, promoção, disponibilidade, garantia, arquivo/link, experiência pessoal não confirmada.
2. MISTURA DE FOCO: outra oferta/frente entrou no conteúdo, CTA, hashtag ou solução.
3. CANAL ERRADO: o campo whatsapp deve ser STATUS DO WHATSAPP por padrão. Não transforme em mensagem privada, lista de transmissão ou prospecção, salvo pedido explícito.
4. EXECUÇÃO INCOMPLETA: Feed com slides vazios/rótulos, Stories quebrados, campo essencial sem conteúdo, instrução abstrata que devolve criação à pessoa.
5. PROMESSA FACTUAL NÃO SUSTENTADA: resultado comercial ou técnico apresentado como certeza sem base no PERFIL/COFRE.
6. FORMATO/SCHEMA: mantenha exatamente o schema esperado.

COMO CORRIGIR
- Faça a menor mudança possível.
- Não melhore estilo, emoção, gancho ou estratégia por iniciativa própria.
- Não troque uma invenção por outra.
- Se um detalhe inventado for dispensável, remova ou reescreva só aquele trecho de forma verdadeira.
- Conhecimento geral seguro pode permanecer, desde que não seja apresentado como prática particular do negócio.
- Se faltar prova real, retire a prova; não fabrique substituto.
- Se houver Status do WhatsApp, use format "Status do WhatsApp" e texto pronto para postagem.
- needsInput=true é exceção: use apenas se for literalmente impossível entregar algo verdadeiro sem uma informação.

Retorne SOMENTE o JSON completo, preservando tudo o que não precisou ser corrigido.`
            let fiscalApplied=false;
            let fiscalLastError="";
            for (const fiscalModel of ["openai/gpt-oss-120b","openai/gpt-oss-20b"]) {
              if(fiscalApplied) break;
              try {
                const vb=JSON.stringify({
                  model:fiscalModel,
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
                  body:vb,
                  signal:AbortSignal.timeout(55000)
                });
                const raw=await vr.text();
                if(!vr.ok){
                  fiscalLastError=fiscalModel+" HTTP "+vr.status+": "+raw.slice(0,300);
                  console.error("DESTRAVE_FISCAL_ATTEMPT_FAILED",{creator:modelUsed,fiscalModel,status:vr.status,preview:raw.slice(0,300)});
                  continue;
                }
                let vd;
                try { vd=JSON.parse(raw); }
                catch(error){
                  fiscalLastError=fiscalModel+" envelope inválido: "+String(error);
                  console.error("DESTRAVE_FISCAL_ENVELOPE_INVALID",{creator:modelUsed,fiscalModel,error:String(error),preview:raw.slice(0,300)});
                  continue;
                }
                const checked=String(vd.choices?.[0]?.message?.content||"").trim();
                if(!checked){
                  fiscalLastError=fiscalModel+" resposta vazia";
                  console.error("DESTRAVE_FISCAL_EMPTY",{creator:modelUsed,fiscalModel});
                  continue;
                }
                let checkedPlan;
                try { checkedPlan=JSON.parse(checked.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim()); }
                catch(error){
                  fiscalLastError=fiscalModel+" JSON inválido: "+String(error);
                  console.error("DESTRAVE_FISCAL_JSON_INVALID",{creator:modelUsed,fiscalModel,error:String(error),preview:checked.slice(0,500)});
                  continue;
                }
                if (checkedPlan && typeof checkedPlan==="object" && typeof checkedPlan.needsInput==="boolean" && (checkedPlan.needsInput || (checkedPlan.reels && Array.isArray(checkedPlan.stories) && checkedPlan.feed && checkedPlan.whatsapp))) {
                  plan=checkedPlan;
                  modelUsed += "+fiscal";
                  fiscalApplied=true;
                } else {
                  fiscalLastError=fiscalModel+" estrutura incompleta";
                  console.error("DESTRAVE_FISCAL_SHAPE_INVALID",{creator:modelUsed,fiscalModel});
                }
              } catch (error) {
                fiscalLastError=fiscalModel+" "+String(error);
                console.error("DESTRAVE_FISCAL_ATTEMPT_ERROR",{creator:modelUsed,fiscalModel,error:String(error)});
              }
            }
            if(!fiscalApplied){
              console.error("DESTRAVE_FISCAL_FAILED",{creator:modelUsed,error:fiscalLastError});
              return json({ok:false,error:"A revisão final do conteúdo não foi concluída. Tente novamente.",code:"FISCAL_FAILED",model:modelUsed},{status:502});
            }
          } catch (error) {
            console.error("DESTRAVE_FISCAL_FATAL",{creator:modelUsed,error:String(error)});
            return json({ok:false,error:"A revisão final do conteúdo não foi concluída. Tente novamente.",code:"FISCAL_FAILED",model:modelUsed},{status:502});
          }
        }

        // GUARDA FINAL DETERMINÍSTICA: o modelo fiscal não tem a palavra final sobre fatos básicos.
        // Se ainda restar placeholder, promessa forte ou pressuposição operacional detectável,
        // uma última correção é solicitada. Se ela não puder ser validada, a resposta é bloqueada.
        let hardViolations=deterministicAudit(plan);
        if (hardViolations.length && env.GROQ_API_KEY) {
          console.error("DESTRAVE_FACT_GUARD_INITIAL",{creator:modelUsed,violations:hardViolations});
          const repairPrompt=`Corrija SOMENTE as violações factuais abaixo no JSON do Conteúdo do Dia.
VIOLAÇÕES: ${hardViolations.join("; ")}
FATOS CONFIRMADOS:
${confirmedFactLines || "- nenhum"}
JSON:
${JSON.stringify(plan)}
Regras: não invente substitutos; não use placeholders; se o dado for dispensável, reescreva sem ele; se for indispensável, needsInput=true e faça uma única pergunta factual. Preserve o schema e a direção quando possível. Retorne somente JSON válido.`;
          let repairedOk=false;
          for(const repairModel of ["openai/gpt-oss-120b","openai/gpt-oss-20b"]){
            if(repairedOk) break;
            try{
              const rb=JSON.stringify({
                model:repairModel,
                messages:[{role:"system",content:"Correção factual estrita. Somente JSON válido."},{role:"user",content:repairPrompt}],
                temperature:0.05,max_completion_tokens:7000,response_format:{type:"json_object"}
              });
              const rr=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},body:rb,signal:AbortSignal.timeout(55000)});
              const raw=await rr.text();
              if(!rr.ok){
                console.error("DESTRAVE_FACT_REPAIR_FAILED",{repairModel,status:rr.status,preview:raw.slice(0,300)});
                continue;
              }
              const rd=JSON.parse(raw);
              const repaired=JSON.parse(String(rd.choices?.[0]?.message?.content||"").replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim());
              if(repaired && typeof repaired==="object"){
                const after=deterministicAudit(repaired);
                if(after.length < hardViolations.length){
                  plan=repaired;
                  hardViolations=after;
                  repairedOk=after.length===0;
                  console.error("DESTRAVE_FACT_REPAIR_RESULT",{repairModel,remaining:after});
                } else {
                  console.error("DESTRAVE_FACT_REPAIR_NO_IMPROVEMENT",{repairModel,before:hardViolations,after});
                }
              }
            }catch(error){
              console.error("DESTRAVE_FACT_REPAIR_ERROR",{repairModel,error:String(error)});
            }
          }
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
          if(!(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"]) || supplied!==(env.LAB_TEST_KEY||env["CHAVE_DE_TESTES_DE_LABORATÓRIO"]||env["CHAVE_DE_TESTES_DE_LABORATORIO"])) return json({ok:false,error:"Cliente não identificado"},{status:400});
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
