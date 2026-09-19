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
        return json({ ok: true, app: "destrave-app", database: "connected" });
      } catch (error) {
        return json({ ok: false, database: "error", message: error.message }, { status: 500 });
      }
    }


    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const clientId = request.headers.get("x-destrave-client");
        if (!clientId) return json({ok:false,error:"Cliente não identificado"},{status:400});
        if (!env.GEMINI_API_KEY) return json({ok:false,error:"GEMINI_API_KEY não configurada"},{status:503});
        await ensureStateTable(env);
        const row = await env.DB.prepare("SELECT business_json, contents_json FROM client_state WHERE client_id = ?").bind(clientId).first();
        const business = row ? JSON.parse(row.business_json || "{}") : {};
        const history = row ? JSON.parse(row.contents_json || "[]") : [];
        const body = await request.json();
        const requestToday = String(body.topic || "").trim();
        const goal = String(body.goal || "Movimentar");
        const requestedFormat = String(body.requestedFormat || "Livre");
        if (!business.name || !(business.activity || business.service) || !business.objective) {
          return json({ok:false,error:"Complete primeiro o cadastro do Destrave."},{status:400});
        }
        const recent = history.slice(0,8).map(x=>({title:x.title,format:x.format,text:String(x.text||"").slice(0,1200)}));
        const redo = Boolean(body.redo);
        const factVault = {
          name: business.name || "",
          activity: business.activity || business.service || "",
          objective: business.objective || "",
          mainGoal: Array.isArray(business.mainGoal) ? business.mainGoal.join(", ") : (business.mainGoal || ""),
          digitalStage: business.digitalStage || business.stage || "",
          appearance: business.appearance || business.appearancePreference || "",
          freeContext: business.freeContext || "",
          goalToday: goal,
          requestToday: requestToday || ""
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
        function deterministicAudit(candidate){
          const serialized=JSON.stringify(candidate||{});
          const violations=[];
          if (placeholderPattern.test(serialized)) violations.push("placeholder");
          for (const p of promisePatterns) if (p.test(serialized)) violations.push("promessa de resultado");
          for (const rule of forbiddenAssumptions) {
            if (rule.re.test(serialized) && !rule.allow.test(knownFactText)) violations.push("fato operacional não confirmado: "+String(rule.re));
          }
          return [...new Set(violations)];
        }
        const motherPrompt = `Você é o CÉREBRO OFICIAL DO DESTRAVE by Angladi.

ESSÊNCIA
O Destrave existe para pessoas que têm algo para vender, oferecer ou construir profissionalmente e precisam se movimentar na internet sem gastar a pouca energia do dia decidindo conteúdo.
O DESTRAVE PENSA O CONTEÚDO. A PESSOA ESCOLHE O QUE CONSEGUE EXECUTAR.
SIMPLES PARA QUEM USA. INTELIGENTE POR TRÁS.
O Conteúdo do Dia é um CARDÁPIO COMPLETO DE EXECUÇÃO, não uma lista de obrigações.

COFRE DE FATOS — AUTORIDADE MÁXIMA
${confirmedFactLines || "- Nenhum fato adicional confirmado."}

PERFIL COMPLETO
${JSON.stringify(business)}

PEDIDO DE HOJE
Objetivo/necessidade: ${goal}
Condição/preferência de hoje: ${requestedFormat}
Pedido livre: ${requestToday || ""}
Refazer: ${redo}

HISTÓRICO RECENTE
${JSON.stringify(recent)}

VERDADE
Use somente fatos confirmados no perfil, pedido e histórico.
GERADO NÃO SIGNIFICA EXECUTADO. Uma geração anterior serve para evitar repetição e melhorar variedade, mas nunca prova que a pessoa publicou ou fez algo.
Não invente clientes, vendas, resultados, rotina, experiência, sentimentos, opiniões, gostos, recursos ou histórias.
TOLERÂNCIA ZERO A PRESSUPOSIÇÕES OPERACIONAIS: não presuma link na bio, agenda aberta, estoque/produto pronto hoje, data disponível, entrega, promoção, preço, sabor, ingrediente, local, depoimento, cliente, forma de pagamento, botão/link do WhatsApp ou qualquer recurso não confirmado.
Não use placeholders como "[Nome do produto]", "[preço]", "[cidade]" ou similares. Se um detalhe desconhecido puder ser evitado, escreva sem ele. Se for indispensável para tornar a execução verdadeira, faça UMA micropergunta factual.
Não transforme uma possibilidade em fato. Prefira construções verdadeiras com os dados existentes, por exemplo "Se quiser saber sobre encomendas, me chame" somente quando encomendas/oferta forem confirmadas; nunca "agenda aberta" sem confirmação.
Não prometa viralização, seguidores, vendas ou clientes. Também não afirme causalidade como "isso gera encomendas", "vai vender", "cria desejo instantâneo" ou "o visual vende por você". Use formulações proporcionais: pode despertar curiosidade, ajudar alguém a perceber um detalhe, facilitar entendimento, colocar a oferta diante de mais pessoas.
Fale COM a pessoa, usando "você". Nunca narre "Daniel vai..." ou equivalente.

O QUE VOCÊ DECIDE
A pessoa não deve precisar decidir estratégia, assunto, gancho, CTA, sequência ou adaptação entre canais quando você puder decidir com segurança.
Ela pode informar uma necessidade ("quero vender", "quero aparecer", "quero movimentar minhas redes") ou simplesmente pedir que você escolha.
Considere a condição do dia, inclusive pouco tempo e preferência de aparecer.
CONDIÇÃO DE EXECUÇÃO NÃO É ESTRATÉGIA: "não quero aparecer", "posso mostrar sem falar", "tenho pouco tempo" e equivalentes mudam COMO a direção será executada, não definem sozinhos SOBRE O QUE a pessoa deve falar nem QUAL objetivo estratégico perseguir.
Se faltar um fato indispensável que somente a pessoa sabe, use needsInput=true e faça UMA micropergunta factual. Nunca devolva uma pergunta estratégica.

DIREÇÃO CENTRAL
Antes de escrever, escolha silenciosamente UMA direção estratégica coerente para hoje.
Toda a entrega deve nascer dessa mesma direção.
Reels, Stories, Feed e Status/WhatsApp NÃO são quatro ideias aleatórias. São quatro maneiras independentes e coerentes de executar a mesma direção.
Cada peça precisa funcionar sozinha: a pessoa pode fazer apenas Reels, apenas Stories, apenas Feed ou apenas Status.
Nunca diga que ela precisa fazer tudo.
Não crie volume por volume: cada formato deve ser forte, específico e pronto.
A direção deve ter um raciocínio além do óbvio da profissão. Não escolha automaticamente "mostrar o produto" só porque a pessoa vende produto, nem "mostrar bastidores" só porque presta serviço. Procure um recorte que ajude o público a perceber algo concreto: diferença, escolha, ocasião de uso, detalhe que passa despercebido, dúvida real, critério, transformação observável ou motivo para lembrar daquela oferta — sempre sem inventar fatos.
Antes de aceitar a direção, faça o TESTE DA IA GENÉRICA: se ela poderia ser entregue quase igual a qualquer pessoa da mesma profissão trocando apenas o nome do produto, aprofunde ou mude o ângulo usando os fatos disponíveis.

REELS
Entregue um Reels realmente pronto: conceito/ângulo, gancho forte no primeiro instante, o que mostrar/gravar em ordem, fala palavra por palavra quando útil, texto na tela quando útil, duração aproximada quando útil, legenda que acrescente e UM CTA coerente.
Não desperdice espaço com "procure iluminação", "posicione o celular", "aperte gravar", "respire", "publique".

STORIES
Entregue uma sequência curta e pronta, normalmente 2–4 Stories.
Para cada Story diga exatamente o que mostrar e o que falar/escrever. Use interação somente quando tiver função real.
A sequência deve funcionar mesmo se for a única coisa que a pessoa executar hoje.

FEED
Escolha o formato que melhor serve à direção: foto + legenda, arte simples ou carrossel quando realmente necessário.
Diga o que usar/mostrar. Se for carrossel, escreva cada slide. Entregue legenda e CTA quando fizer sentido.
Não presuma Canva ou habilidade de design.

STATUS / WHATSAPP
Adapte a direção para o comportamento do WhatsApp. Entregue texto/visual/fala pronto.
Não copie mecanicamente a legenda do Instagram.
Precisa funcionar sozinho.

MODO DIA CORRIDO
Entregue também uma versão mínima: qual UMA opção ou recorte a pessoa pode executar quando o dia estiver apertado.
Isso é alternativa, não obrigação e não significa que o pacote completo desaparece.

MOTIVAÇÃO FINAL — OBRIGATÓRIA
Finalize sempre com um incentivo humano criado especificamente a partir da direção e do conteúdo daquele dia.
Não use frase motivacional genérica ou banco de frases.
O incentivo deve acolher sem infantilizar, reforçar movimento possível e, quando couber, ensinar uma pequena verdade prática ligada ao conteúdo.
Exemplo de espírito, não para copiar: "Talvez hoje não caiba tudo — e não precisa caber. Escolha uma dessas possibilidades e coloque seu trabalho em movimento."

QUALIDADE
A pessoa deve pensar: "Eu não teria pensado em fazer desse jeito, mas consigo fazer."
Evite marketinguês ("autoridade imediata", "cartão de visitas", "posicionamento") quando linguagem comum resolve.
Não devolva decisões abstratas como "escolha a energia", "defina seu posicionamento" ou "pense no que seu público quer".
Não escreva conselhos genéricos como "mostre seu trabalho", "seja autêntico" ou "poste um vídeo" sem transformar isso em execução específica.
Um CTA principal por peça, sem empilhar pedidos.
Legenda acrescenta; não repete simplesmente o roteiro.
Textos prontos devem poder ser publicados como estão, sem campos para completar. Se isso não for possível sem inventar um dado, reescreva para não depender dele ou pergunte apenas o fato indispensável.
A motivação não pode transformar estratégia em promessa. Ela deve reforçar a ação possível e a razão real daquele conteúdo, sem afirmar resultado futuro.
Se o histórico mostrar conteúdos anteriores, varie ângulo/função sem afirmar que foram executados.

AUDITORIA SILENCIOSA
Antes de responder, confira:
1. Existe uma direção central clara e específica para esta pessoa?
2. As quatro opções pertencem à mesma direção?
3. Cada uma funciona independentemente?
4. Tudo necessário para executar está mastigado?
5. Removi decisões estratégicas desnecessárias da pessoa?
6. Evitei invenções e marketinguês?
7. O conteúdo é digno de um produto pago, e não uma dica óbvia?
8. A motivação nasceu do conteúdo de hoje?
9. Ficou explícito pelo formato da entrega que ela escolhe o que cabe no dia, sem obrigação de fazer tudo?
10. Há algum fato, recurso, disponibilidade, produto específico, data, link ou resultado que eu presumi sem confirmação? Se sim, remova ou pergunte.
11. Há placeholder para a pessoa completar? Se sim, reescreva pronto ou faça micropergunta factual.
12. A condição de execução virou a própria estratégia? Se sim, corrija.
13. Alguma frase promete ou garante efeito comercial? Se sim, torne-a proporcional e verdadeira.
14. O ângulo passaria no teste "uma IA comum daria isso para qualquer pessoa desta profissão"? Se sim, aprofunde.
Se falhar, refaça internamente.

Se needsInput=true, retorne a pergunta e mantenha os blocos de conteúdo vazios.

RETORNE SOMENTE JSON VÁLIDO:
{
  "needsInput": false,
  "question": "",
  "directionTitle": "direção central forte e concreta",
  "why": "explicação humana curta de por que esta direção faz sentido hoje",
  "reels": {
    "title": "ângulo do Reels",
    "hook": "gancho literal",
    "steps": ["ordem concreta do que mostrar/falar"],
    "script": "fala pronta quando aplicável",
    "screenText": "texto na tela quando aplicável",
    "caption": "legenda pronta",
    "cta": "um CTA ou vazio"
  },
  "stories": [
    {"title":"Story 1","show":"o que mostrar","say":"o que falar ou vazio","screenText":"texto pronto ou vazio","interaction":"interação útil ou vazio"}
  ],
  "feed": {
    "format": "Foto + legenda | Arte simples | Carrossel",
    "instructions": "o que usar/mostrar",
    "slides": ["somente se carrossel"],
    "caption": "legenda pronta",
    "cta": "um CTA ou vazio"
  },
  "whatsapp": {
    "format": "Status | mensagem | outro formato adequado",
    "instructions": "o que usar/mostrar",
    "text": "texto pronto"
  },
  "quickVersion": "versão mínima para um dia corrido",
  "motivation": "incentivo final específico deste conteúdo"
}`
        let textOut="";
        let modelUsed="";
        let lastError="";

        // Motor 1: Gemini. Faz uma única tentativa para não desperdiçar a cota gratuita.
        if (false && env.GEMINI_API_KEY) {
          try {
            const geminiUrl="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
            const geminiBody=JSON.stringify({contents:[{parts:[{text:motherPrompt}]}],generationConfig:{temperature:0.82,maxOutputTokens:7000,responseMimeType:"application/json"}});
            const gr=await fetch(geminiUrl,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:geminiBody});
            const gd=await gr.json();
            if (gr.ok) {
              textOut=(gd.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
              if (textOut) modelUsed="gemini-3.6-flash";
            } else {
              lastError=gd?.error?.message || "Gemini indisponível";
            }
          } catch (error) {
            lastError=error.message || "Gemini indisponível";
          }
        }

        // Motor 2: Groq. Só é chamado se o Gemini não entregar conteúdo.
        if (false && !textOut && env.GROQ_API_KEY) {
          try {
            const groqBody=JSON.stringify({
              model:"openai/gpt-oss-120b",
              messages:[
                {role:"system",content:"Responda somente com JSON válido, sem markdown nem comentários."},
                {role:"user",content:motherPrompt}
              ],
              temperature:0.82,
              max_completion_tokens:7000,
              response_format:{type:"json_object"}
            });
            const rr=await fetch("https://api.groq.com/openai/v1/chat/completions",{
              method:"POST",
              headers:{"content-type":"application/json","authorization":"Bearer "+env.GROQ_API_KEY},
              body:groqBody
            });
            const rd=await rr.json();
            if (rr.ok) {
              textOut=String(rd.choices?.[0]?.message?.content||"").trim();
              if (textOut) modelUsed="groq/openai-gpt-oss-120b";
            } else {
              lastError=rd?.error?.message || "Groq indisponível";
            }
          } catch (error) {
            lastError=error.message || "Groq indisponível";
          }
        }

        // Motor 3: Cloudflare Workers AI.
        if (!textOut && env.AI) {
          try {
            const cr=await env.AI.run("@cf/google/gemma-4-26b-a4b-it",{
              messages:[
                {role:"system",content:"Responda somente com JSON valido, sem markdown nem comentarios."},
                {role:"user",content:motherPrompt}
              ],
              chat_template_kwargs:{enable_thinking:false},
              max_tokens:7000,
              temperature:0.82
            });
            const cloudflareText=String(cr?.response ?? cr?.choices?.[0]?.message?.content ?? "").trim();
            if (cloudflareText) { textOut=cloudflareText; modelUsed="cloudflare/gemma-4-26b-a4b-it"; }
            else lastError="Cloudflare Workers AI sem conteudo";
          } catch (error) { lastError=error.message || "Cloudflare Workers AI indisponivel"; }
        }
        if (!textOut) return json({ok:false,error:"Não consegui gerar o conteúdo agora.",details:lastError},{status:502});
        let plan;
        try { plan=JSON.parse(textOut.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim()); }
        catch { return json({ok:false,error:"A IA respondeu fora da estrutura do Destrave. Tente refazer."},{status:502}); }

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
Tolerância zero: remova fatos não confirmados como link na bio, agenda aberta, disponibilidade, produto pronto hoje, sabores, datas, entrega, promoção, preço, botão/link, estoque ou resultados. Remova placeholders. Se um dado for indispensável, needsInput=true com uma única pergunta factual.
Condição de execução muda COMO fazer, não deve virar a estratégia inteira. Reprove ângulo óbvio que uma IA comum entregaria quase igual a qualquer pessoa da mesma profissão.
Reprove causalidade comercial não comprovada ("gera encomendas", "vai vender", "cria desejo instantâneo", "vende por você").
GERADO NÃO É EXECUTADO: histórico anterior não prova publicação ou ação.
Fale diretamente com "você".
A pessoa recebe todas as possibilidades, mas nunca deve ser tratada como obrigada a executar todas.
Se faltar um fato indispensável, needsInput=true com UMA pergunta factual e blocos vazios.
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

    return env.ASSETS.fetch(request);
  }
};
