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
        const generationStartedAt=Date.now();
        const generationBudgetExceeded=()=>Date.now()-generationStartedAt>105000;
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
          problem:"A pessoa quer se movimentar na internet, mas trava porque não sabe qual conteúdo fazer agora nem como executar.",
          input:"A pessoa informa seu contexto, objetivo do dia e, quando quiser, o foco exato do que deseja movimentar.",
          decision:"O Destrave usa esse contexto para escolher UMA direção estratégica de comunicação para aquele momento.",
          output:"Entrega o conteúdo pronto para executar, com Reels, Stories, Feed/Carrossel e Status do WhatsApp adaptados à mesma direção.",
          promise:"Tirar a pessoa do 'não sei o que fazer agora' e entregar o próximo conteúdo que ela consegue executar.",
          coreRule:"Não entrega apenas ideias; entrega execução.",
          focusRule:"O foco escolhido hoje é soberano. Se a pessoa disser que hoje só quer falar de uma coisa, todo o conteúdo gira exclusivamente em torno dela.",
          notThis:[
            "lista de tarefas ou missões diárias",
            "curso de marketing",
            "calendário de conteúdo",
            "construtor de página de vendas",
            "gerador ou painel de leads",
            "CRM",
            "checkout",
            "ferramenta de tráfego pago",
            "publicação automática",
            "aplicativo que faz tudo pela pessoa"
          ],
          access:"O acesso/venda é conduzido por conversa no WhatsApp. Não afirmar download, App Store/Play Store, teste grátis, experimentar grátis ou checkout se isso não estiver confirmado no contexto.",
          evidence:"Experiências pessoais registradas no cadastro/histórico podem ser usadas exatamente dentro do que foi confirmado. Não completar uma experiência verdadeira com sentimento, consequência, tempo, ação posterior ou resultado não informado. Não inventar comentários, DMs, interação, clientes, vendas, engajamento ou qualquer prova usando o Destrave.",
          interpretation:"Fatos do cadastro são matéria-prima e contexto, não uma ordem para transformá-los literalmente no assunto do conteúdo. Antes de usar um fato, decida se ele fortalece a estratégia de hoje. Um fato verdadeiro pode ser omitido quando não for o melhor ângulo.",
          language:"Ao falar do Destrave, prefira 'conteúdo do dia', 'direção do conteúdo', 'próximo conteúdo' e 'execução pronta'. Evite chamar isso de tarefa, missão ou checklist.",
          outcomeBoundary:"O Destrave entrega direção e execução de comunicação; não promete venda, cliente, lead, crescimento ou resultado comercial. Não atribuir velocidade como em segundos/em minutos sem fato confirmado."
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
          {re:/\b(?:link na bio|link abaixo|acesse o link|clique no link|toque no link)\b/i, allow:/\b(?:link na bio|link abaixo|acesse o link|clique no link|toque no link)\b/i},
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
          const reelScript=String(candidate?.reels?.script||"").trim();
          const reelWordCount=reelScript ? reelScript.split(/\s+/).filter(Boolean).length : 0;
          if(reelWordCount<90) violations.push("reels curto/incompleto");
          if(reelWordCount>190) violations.push("reels longo demais");
          const stories=Array.isArray(candidate?.stories)?candidate.stories:[];
          if(stories.length<7 || stories.some(s=>!String(s?.say||"").trim())) violations.push("stories incompletos");
          const waFormat=String(candidate?.whatsapp?.format||"").toLowerCase();
          const waInstructions=String(candidate?.whatsapp?.instructions||"").toLowerCase();
          const waText=String(candidate?.whatsapp?.text||"").toLowerCase();
          if(!waFormat.includes("status") || /mensagem direta|envie para|mande para|contatos? próximos?|lista de transmissão/.test(waInstructions+" "+waText)){
            violations.push("whatsapp deve ser status");
          }
          if(isDestraveProduct){
            const destraveInventions=[
              {re:/\b(?:tarefa|miss[aã]o)\s+(?:do dia|di[aá]ria|di[aá]rio|clara)\b/i,label:"Destrave reduzido a tarefa/missão"},
              {re:/\b(?:baixe|baixar|download)\b/i,label:"forma de acesso não confirmada"},
              {re:/\b(?:experimente|teste)\s+gr[aá]tis\b|\bgr[aá]tis\b/i,label:"gratuidade não confirmada"},
              {re:/\b(?:gera|gerar|ver|receber|chegar(?:am|ando)?)\s+leads?\b|\bleads?\s+(?:na tela|chegando)\b/i,label:"leads inventados"},
              {re:/\b(?:j[aá]\s+)?(?:recebi|recebeu|apareceu|surgiu|vieram?)\s+(?:os?\s+)?(?:primeiros?\s+)?(?:coment[aá]rios?|intera[cç][aã]o|feedbacks?)\b/i,label:"resultado/prova inventado"},
              {re:/\bprimeira\s+intera[cç][aã]o\b|\bfeedback\s+real\b/i,label:"resultado/prova inventado"},
              {re:/\beu\s+tamb[eé]m\b|\beu\s+sei\s+como\s+[eé]\b|\beu\s+(?:j[aá]\s+)?(?:passei|vivi|sofri|estive)\s+(?:por\s+)?isso\b/i,allow:/\beu\s+tamb[eé]m\b|\beu\s+sei\s+como\s+[eé]\b|\beu\s+(?:j[aá]\s+)?(?:passei|vivi|sofri|estive)\s+(?:por\s+)?isso\b/i,label:"experiência pessoal não confirmada"},
              {re:/\bvisualiza[cç][oõ]es?\s+(?:subindo|aumentando|crescendo)\b|\b(?:a[cç][aã]o\s+imediata|isso)\s+traz\s+engajamento\b|\bcliente\s+satisfeit[oa]\b|\bantes\s+e\s+depois\b/i,label:"resultado/prova inventado"},
              {re:/\b(?:primeiras?\s+)?dms?\b[^\n.!?]*(?:receb|cheg)|\b(?:recebi|recebeu|recebe)\b[^\n.!?]*\bdms?\b|\bpublica(?:r|que)?\b[^\n.!?]*\brecebe(?:r)?\s+mensagens?\b/i,label:"resultado/prova inventado"},
              {re:/\b(?:destrave|app|ele)\b[^\n.!?]{0,80}\b(?:em\s+(?:poucos?\s+)?segundos?|em\s+(?:menos\s+de\s+)?\d+\s*minutos?)\b|\b(?:postei|gravei|publiquei|transform(?:ei|ar)|pront[oa])\b[^\n.!?]{0,80}\b(?:em\s+(?:menos\s+de\s+)?\d+\s*minutos?)\b/i,label:"velocidade não confirmada"},
              {re:/\bsugest[aã]o\s+de\s+m[uú]sica\b|\blegenda\s+curta\s*\+\s*cta\s+para\s+dm\b|\bcaptura\s+de\s+tela\s+simulada\b/i,label:"demonstração/funcionalidade não confirmada"},
              {re:/\bdire[cç][aã]o(?:\s+de\s+conte[uú]do)?\s+perfeita\b/i,label:"superlativo não sustentado"},
              {re:/\bo\s+app\s+faz\s+tudo\b/i,label:"função exagerada do Destrave"},
              {re:/\bp[aá]gina\s+de\s+vendas\b|\bcrm\b|\bcheckout\b|\bpublica(?:r)?\s+automaticamente\b/i,label:"funcionalidade inventada do Destrave"}
            ];
            for(const x of destraveInventions) {
              if(!x.re.test(serialized)) continue;
              // Regras factuais com "allow" só bloqueiam quando a mesma afirmação
              // não existe no cofre de fatos. Assim, uma experiência REAL do cadastro
              // pode ser usada sem o guard tratá-la automaticamente como invenção.
              if(x.allow && x.allow.test(knownFactText)) continue;
              violations.push(x.label);
            }
          }
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
        const motherPrompt = `Você é o ESTRATEGISTA DIGITAL DO DESTRAVE.

IDENTIDADE
Você atua como um estrategista digital e social media sênior, humano, criativo e adaptável. Seu trabalho é entender a pessoa, o negócio, o momento e o objetivo e decidir qual comunicação faz mais sentido HOJE para gerar movimento real no digital.
Você domina estratégia de conteúdo, Instagram, posicionamento, storytelling, comportamento de público, retenção, relacionamento, autoridade e comunicação para vendas. Use esse conhecimento para RACIOCINAR — não para inventar fatos.

PRINCÍPIO-MÃE
CRIATIVIDADE É LIVRE. FATOS NÃO SÃO.
Você pode criar ângulos, ganchos, narrativas, analogias, estruturas e formas de apresentar uma mensagem. Mas qualquer afirmação sobre esta pessoa, este negócio, este produto, clientes, resultados, números, experiências, processos, preços, disponibilidade, provas ou funcionalidades precisa vir do CONTEXTO REAL, do COFRE DO PRODUTO ou do HISTÓRICO RELEVANTE.
Uma experiência pessoal registrada no contexto É fato disponível e pode ser usada quando for estrategicamente útil. Ela não precisa aparecer só porque existe. Nunca complete essa experiência com sentimentos, consequências, resultados, duração, ações posteriores ou detalhes que não foram informados.

CONTEXTO REAL
${JSON.stringify(cleanContext)}
COFRE DO PRODUTO (quando aplicável)
${JSON.stringify(destraveProductVault)}
HISTÓRICO RELEVANTE
${JSON.stringify(recent.slice(0,4))}

COMO UM ESTRATEGISTA PENSA
Antes de escrever, pense em silêncio:
- O que esta pessoa está movimentando hoje?
- Para quem ela precisa falar?
- Qual é o objetivo de hoje?
- O que o público precisa perceber, sentir, entender ou desejar para avançar?
- Qual ângulo tem mais força neste momento?
- Qual seria a forma mais humana, interessante e executável de comunicar isso?
- O histórico mostra algo que deve ser continuado, evitado ou variado?\n- Quais fatos são apenas CONTEXTO e quais realmente merecem virar mensagem hoje? Não transforme automaticamente todo fato verdadeiro em assunto.\n- Antes de demonstrar uma função do produto, ela está literalmente confirmada no cofre/contexto? Se não, não a encene.

Não siga uma fórmula fixa. Escolha o melhor caminho para ESTE caso. Você pode começar por desejo, cena, contraste, pergunta, demonstração, curiosidade, objeção, opinião, oportunidade, bastidor verdadeiro, erro comum, nova percepção, história verdadeira ou outro ângulo estratégico. Varie naturalmente. Não transforme "você abre o Instagram e trava" ou qualquer outra construção em molde repetitivo.

VERDADE E FOCO
- O foco escolhido hoje é soberano. Se a pessoa escolheu UMA frente, todos os canais permanecem nela.
- Use livremente fatos pessoais e histórias que estejam realmente registrados no contexto/histórico. Não trate primeira pessoa como proibida quando houver base factual.
- Não invente prova, cliente, depoimento, antes/depois, resultado, número, prazo, sentimento pessoal, experiência, método próprio, material/técnica particular, preço, promoção, disponibilidade, garantia, link, arquivo ou funcionalidade.
- Conhecimento geral seguro do segmento pode enriquecer o raciocínio, mas não pode ser apresentado como fato particular do negócio.
- Não prometa crescimento, vendas, clientes, leads ou engajamento como resultado garantido.
- Se faltar um fato indispensável, needsInput=true e faça UMA pergunta curta. Se não for indispensável, crie com os fatos disponíveis.

QUANDO O FOCO FOR O DESTRAVE
O COFRE DO PRODUTO é a fonte de verdade. Apresente o Destrave pelo que ele realmente faz: recebe contexto/objetivo/foco, decide uma direção estratégica e entrega conteúdo pronto por canal para a pessoa executar.
Não transforme o Destrave em tarefa/missão/checklist, não invente download, gratuidade, leads, resultados, publicação automática ou funcionalidades. Não invente telas, botões, campos, sugestões específicas, música, DM, legenda ou etapas do app para fazer uma demonstração parecer concreta. Se precisar demonstrar, use somente a operação confirmada no cofre.
Não reduza a promessa a "dar uma ideia". A essência é direção estratégica + execução pronta.
Quando o acesso não estiver confirmado de outra forma, o CTA pode convidar a pessoa a chamar no WhatsApp.

QUALIDADE
Pense como alguém responsável pela presença digital daquela pessoa, não como um gerador de templates.
O conteúdo precisa ter intenção, personalidade, especificidade e motivo para prender atenção.
Emoção deve nascer do que é verdadeiro ou de uma situação plausível do público — nunca de uma autobiografia fabricada.
Não force dor. Nem todo conteúdo precisa começar por problema.
Evite marketinguês, frases genéricas de agência e conselhos que serviriam para qualquer negócio.
Faça a linguagem soar falada, natural e humana.
Use características confirmadas para chegar a benefícios e impacto percebido quando isso fizer sentido.
Não explique estratégia para o público; entregue comunicação.

ENTREGA
Crie UMA direção estratégica para o dia e traduza essa mesma direção para todos os canais, respeitando a linguagem de cada um.

REELS
Roteiro completo, normalmente 45–60 segundos (aprox. 95–160 palavras). Precisa soar natural em voz alta, ter desenvolvimento e chegar a uma ação. Não use estrutura fixa se outro caminho for melhor. Entregue cenas executáveis, fala, texto de tela, legenda e CTA.

STORIES
Entregue 7–10 Stories quando o assunto sustentar. A sequência deve parecer uma conversa que progride, não sete frases soltas. Pode usar identificação, aprofundamento, demonstração, percepção, desejo, objeção, prova REAL, interação como ponte e fechamento. A interação nunca é o desfecho.

FEED/CARROSSEL
Entregue a copy real de cada slide, pronta. Nada de rótulos como "Problema", "Desejo", "Slide 1" ou instruções vagas.

STATUS DO WHATSAPP
É conteúdo para postar no Status, salvo pedido explícito de mensagem privada. Entregue texto pronto.

QUICKVERSION
Alternativa curta e realmente executável no mesmo dia, sem mudar a direção estratégica.

MOTIVATION
Orientação curta, humana e específica para ajudar a pessoa a executar.

AUTOCHECAGEM SILENCIOSA
Antes de responder, confirme:
1. Eu agi como estrategista ou apenas preenchi um template?
2. O ângulo é adequado a esta pessoa, objetivo e momento?
3. Todos os canais respeitam exatamente o foco escolhido?
4. Cada afirmação particular tem base nos fatos disponíveis?
5. Eu acrescentei algo a uma história verdadeira que não estava confirmado?
6. O conteúdo tem humanidade sem fabricar autobiografia ou prova?
7. O Reels está completo e falável?
8. Stories, Feed e Status estão prontos para executar?
9. A resposta ficou diferente do que eu daria genericamente a qualquer negócio?\n10. Eu transformei um fato verdadeiro do cadastro em assunto só porque ele estava disponível? Se sim, reavalie o ângulo.\n11. Eu encenei uma tela, sugestão, resultado ou etapa do produto que não está confirmada? Se sim, retire.
Se algo falhar, corrija antes de responder.

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
              signal:AbortSignal.timeout(18000)
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
                signal:AbortSignal.timeout(18000)
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
              new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout após 18s")),18000))
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

        if(generationBudgetExceeded()){
          console.error("DESTRAVE_GENERATION_BUDGET_EXCEEDED",{stage:"before_fiscal",model:modelUsed});
          return json({ok:false,error:"A geração demorou além do esperado. Tente novamente.",code:"GENERATION_TIMEOUT",model:modelUsed},{status:504});
        }

        // FISCAL DO DESTRAVE: segunda etapa independente da criação.
        // Não cria uma nova estratégia. Audita a resposta pronta contra os fatos confirmados
        // e devolve o MESMO JSON corrigido quando encontrar invenções ou decisões não autorizadas.
        if (env.GROQ_API_KEY) {
          try {
            const validatorPrompt = `Você é o FISCAL do Destrave. Você NÃO é coautor e NÃO cria uma nova estratégia.

COFRE DE FATOS:
${confirmedFactLines || "- Nenhum fato adicional confirmado."}
COFRE DO PRODUTO (quando aplicável):
${JSON.stringify(destraveProductVault)}
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
2. FOCO SOBERANO: se selectedFocus aponta uma coisa específica, nenhuma outra frente pode aparecer como assunto, oferta, solução, benefício, prova, CTA, hashtag, legenda ou exemplo.
3. VERDADE DO PRODUTO: quando houver COFRE DO PRODUTO, não aceite função, forma de acesso, prova, resultado ou promessa que esteja fora dele. Para o Destrave, rejeite "tarefa/missão diária", download, teste grátis, leads, comentários/resultados fictícios e qualquer narrativa pessoal não confirmada. Preserve a verdade operacional: contexto/objetivo/foco → direção estratégica → conteúdo pronto por canal → execução pela pessoa.
4. REELS INCOMPLETO: reels.script deve ser fala completa, normalmente entre 95 e 160 palavras, com gancho, situação/tensão, nova percepção, solução e ação. Mini roteiro curto é erro.
5. CANAL ERRADO: o campo whatsapp deve ser STATUS DO WHATSAPP por padrão. Não transforme em mensagem privada, lista de transmissão ou prospecção, salvo pedido explícito.
6. EXECUÇÃO INCOMPLETA: Feed com slides vazios/rótulos, Stories quebrados, campo essencial sem conteúdo, instrução abstrata que devolve criação à pessoa.
7. PROMESSA FACTUAL NÃO SUSTENTADA: resultado comercial ou técnico apresentado como certeza sem base no PERFIL/COFRE.
8. EXPERIÊNCIA/PROVA DISFARÇADA: experiência pessoal é permitida quando estiver realmente no PERFIL/HISTÓRICO, mas preserve SOMENTE o que foi confirmado. Não acrescente sentimento, duração, ação posterior ou resultado. Remova cenas/falas que pressuponham visualizações subindo, DMs, comentários, interação, feedback, cliente satisfeito, antes/depois ou qualquer resultado não confirmado.
9. SUPERLATIVO/VELOCIDADE NÃO SUSTENTADOS: não chame a direção de "perfeita", nem trate efeito/resultado como garantido. Para o Destrave, remova "em segundos", "em minutos", "5 minutos", "resultado em minutos" e equivalentes quando o tempo não estiver confirmado.\n10. DEMONSTRAÇÃO INVENTADA DO PRODUTO: não aceite tela simulada, sugestão de música, CTA para DM, legenda específica, botão, campo, etapa ou sugestão que o COFRE não confirme. Uma demonstração deve usar apenas a operação real confirmada.\n11. QUICKVERSION: deve ser uma única opção mínima executável, não exigir todos os canais nem inventar tempo de execução.
12. FORMATO/SCHEMA: mantenha exatamente o schema esperado.

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
            for (const fiscalModel of ["openai/gpt-oss-20b"]) {
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
                  signal:AbortSignal.timeout(25000)
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
            if(!fiscalApplied && env.AI){
              try{
                const cfFiscal=await Promise.race([
                  env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast",{
                    messages:[
                      {role:"system",content:"Audite com rigor factual e retorne somente JSON válido."},
                      {role:"user",content:validatorPrompt}
                    ],
                    max_tokens:7000,
                    temperature:0.1
                  }),
                  new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout após 25s")),25000))
                ]);
                const checked=String(cfFiscal?.response ?? cfFiscal?.choices?.[0]?.message?.content ?? "").trim();
                if(checked){
                  const checkedPlan=JSON.parse(checked.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim());
                  if(checkedPlan && typeof checkedPlan==="object" && typeof checkedPlan.needsInput==="boolean" && (checkedPlan.needsInput || (checkedPlan.reels && Array.isArray(checkedPlan.stories) && checkedPlan.feed && checkedPlan.whatsapp))){
                    plan=checkedPlan;
                    modelUsed += "+fiscal";
                    fiscalApplied=true;
                    console.error("DESTRAVE_FISCAL_CF_FALLBACK_APPLIED",{creator:modelUsed});
                  }
                }
              }catch(error){
                fiscalLastError="cloudflare fiscal "+String(error);
                console.error("DESTRAVE_FISCAL_CF_FALLBACK_ERROR",{creator:modelUsed,error:String(error)});
              }
            }
            if(!fiscalApplied && env.GEMINI_API_KEY){
              try{
                const gr=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",{
                  method:"POST",
                  headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
                  body:JSON.stringify({
                    contents:[{parts:[{text:validatorPrompt}]}],
                    generationConfig:{maxOutputTokens:7000,responseMimeType:"application/json",thinkingConfig:{thinkingLevel:"low"}}
                  }),
                  signal:AbortSignal.timeout(25000)
                });
                const raw=await gr.text();
                let gd={}; try{gd=JSON.parse(raw)}catch{}
                if(gr.ok){
                  const checked=(gd.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
                  if(checked){
                    const checkedPlan=JSON.parse(checked.replace(/^```(?:json)?\s*/i,"").replace(/```$/,"").trim());
                    if(checkedPlan && typeof checkedPlan==="object" && typeof checkedPlan.needsInput==="boolean" && (checkedPlan.needsInput || (checkedPlan.reels && Array.isArray(checkedPlan.stories) && checkedPlan.feed && checkedPlan.whatsapp))){
                      plan=checkedPlan;
                      modelUsed += "+fiscal";
                      fiscalApplied=true;
                      console.error("DESTRAVE_FISCAL_GEMINI_FALLBACK_APPLIED",{creator:modelUsed});
                    }
                  }
                }else{
                  fiscalLastError="gemini fiscal HTTP "+gr.status+": "+String(gd?.error?.message||"");
                }
              }catch(error){
                fiscalLastError="gemini fiscal "+String(error);
                console.error("DESTRAVE_FISCAL_GEMINI_FALLBACK_ERROR",{creator:modelUsed,error:String(error)});
              }
            }
            if(!fiscalApplied){
              // O Criador já concluiu. Uma indisponibilidade do revisor não deve apagar
              // uma geração inteira. A guarda determinística abaixo continua obrigatória.
              console.error("DESTRAVE_FISCAL_SKIPPED",{creator:modelUsed,error:fiscalLastError});
              modelUsed += "+guard";
            }
          } catch (error) {
            console.error("DESTRAVE_FISCAL_FATAL",{creator:modelUsed,error:String(error)});
            modelUsed += "+guard";
          }
        }

        // GUARDA FINAL DETERMINÍSTICA: o modelo fiscal não tem a palavra final sobre fatos básicos.
        // Se ainda restar placeholder, promessa forte ou pressuposição operacional detectável,
        // uma última correção é solicitada. Se ela não puder ser validada, a resposta é bloqueada.
        let hardViolations=deterministicAudit(plan);
        if(hardViolations.length && generationBudgetExceeded()){
          console.error("DESTRAVE_GENERATION_BUDGET_EXCEEDED",{stage:"before_repair",model:modelUsed,violations:hardViolations});
          return json({ok:false,error:"A geração demorou além do esperado. Tente novamente.",code:"GENERATION_TIMEOUT",model:modelUsed},{status:504});
        }
        if (hardViolations.length && (env.GROQ_API_KEY || env.AI)) {
          console.error("DESTRAVE_FACT_GUARD_INITIAL",{creator:modelUsed,violations:hardViolations});
          const repairPrompt=`Corrija SOMENTE as violações objetivas abaixo no JSON do Conteúdo do Dia.
VIOLAÇÕES: ${hardViolations.join("; ")}
FATOS CONFIRMADOS:
${confirmedFactLines || "- nenhum"}
JSON:
${JSON.stringify(plan)}
Regras: preserve foco, direção e voz; corrija apenas o necessário. Não invente substitutos. Se a violação for Reels curto, expanda o mesmo raciocínio para 45–60 segundos com emoção concreta. Se for Status, converta para conteúdo postável no Status do WhatsApp. Se for bloco incompleto, complete-o sem mudar a estratégia. Se um dado factual for dispensável, remova-o; se for indispensável, needsInput=true com uma única pergunta factual. Preserve o schema. Retorne somente JSON válido.`;
          let repairedOk=false;
          for(const repairModel of ["openai/gpt-oss-120b"]){
            if(repairedOk) break;
            try{
              const rb=JSON.stringify({
                model:repairModel,
                messages:[{role:"system",content:"Correção factual estrita. Somente JSON válido."},{role:"user",content:repairPrompt}],
                temperature:0.05,max_completion_tokens:7000,response_format:{type:"json_object"}
              });
              const rr=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},body:rb,signal:AbortSignal.timeout(18000)});
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
          if(hardViolations.length && env.AI){
            try{
              const cfRepairPrompt=`Corrija SOMENTE estas violações objetivas no JSON do Conteúdo do Dia: ${hardViolations.join("; ")}.
FATOS CONFIRMADOS:
${confirmedFactLines || "- nenhum"}
COFRE DO PRODUTO:
${JSON.stringify(destraveProductVault)}
JSON:
${JSON.stringify(plan)}
Preserve foco, direção e voz. Se o Reels estiver curto, expanda o mesmo raciocínio para 45–60 segundos. Se WhatsApp estiver errado, converta para Status do WhatsApp. Complete blocos incompletos sem inventar fatos. Retorne somente JSON válido.`;
              const cfRepair=await Promise.race([
                env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast",{
                  messages:[
                    {role:"system",content:"Faça apenas correções objetivas. Retorne somente JSON válido."},
                    {role:"user",content:cfRepairPrompt}
                  ],
                  max_tokens:7000,
                  temperature:0.05
                }),
                new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout após 18s")),18000))
              ]);
              const repairedText=String(cfRepair?.response ?? cfRepair?.choices?.[0]?.message?.content ?? "").trim();
              if(repairedText){
                const repaired=JSON.parse(repairedText.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim());
                if(repaired && typeof repaired==="object"){
                  const after=deterministicAudit(repaired);
                  if(after.length < hardViolations.length){
                    plan=repaired;
                    hardViolations=after;
                    console.error("DESTRAVE_FACT_REPAIR_CF_RESULT",{remaining:after});
                  }
                }
              }
            }catch(error){
              console.error("DESTRAVE_FACT_REPAIR_CF_ERROR",{error:String(error)});
            }
          }
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
              .replace(/\blink\s+na bio\b|\blink\s+abaixo\b/gi,"me chame")
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
          // Falhas factuais dispensáveis não devem destruir uma geração inteira.
          // Para experiências pessoais não confirmadas, removemos a alegação em primeira pessoa
          // e preservamos a situação humana, a emoção e a direção estratégica.
          if(hardViolations.every(v=>v==="experiência pessoal inventada")){
            const removeInventedPersonalExperience=(value)=>{
              if(Array.isArray(value)) return value.map(removeInventedPersonalExperience);
              if(value && typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,removeInventedPersonalExperience(v)]));
              if(typeof value!=="string") return value;
              return value
                .replace(/\b[eE]u\s+tamb[eé]m\s+passei\s+por\s+isso[,.!?;:]*/gi,"")
                .replace(/\b[eE]u\s+tamb[eé]m\b[,.!?;:]*/gi,"")
                .replace(/\b[eE]u\s+sei\s+como\s+[eé][^.!?]*(?:[.!?]|$)/gi,"")
                .replace(/\b[eE]u\s+(?:j[aá]\s+)?(?:passei|vivi|sofri|estive)\s+(?:por\s+)?isso[^.!?]*(?:[.!?]|$)/gi,"")
                .replace(/\\s{2,}/g," ")
                .replace(/\\s+([,.!?;:])/g,"$1")
                .trim();
            };
            plan=removeInventedPersonalExperience(plan);
            hardViolations=deterministicAudit(plan);
            if(!hardViolations.length){
              modelUsed += "+safe-repair";
              console.error("DESTRAVE_FACT_GUARD_SAFE_REPAIR",{type:"personal_experience"});
            }
          }
        }
        if(hardViolations.length){
          console.error("DESTRAVE_FACT_GUARD_BLOCKED",{model:modelUsed,violations:hardViolations});\n          return json({ok:false,error:"Não consegui concluir esse conteúdo com segurança. Tente refazer.",code:"FACT_GUARD"},{status:422});
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
