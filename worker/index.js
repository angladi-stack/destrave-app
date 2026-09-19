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
        const motherPrompt = `Você é o cérebro oficial do DESTRAVE by Angladi.

COFRE DE FATOS — AUTORIDADE MÁXIMA
${confirmedFactLines || "- Nenhum fato adicional confirmado."}

PERFIL COMPLETO:
${JSON.stringify(business)}

PEDIDO DE HOJE:
Objetivo selecionado: ${goal}
Preferência de execução: ${requestedFormat}
Pedido livre: ${requestToday || ""}
Refazer: ${redo}

HISTÓRICO RECENTE:
${JSON.stringify(recent)}

PROMESSA
O Destrave existe para quem quer se movimentar na internet, mas não sabe o que fazer agora.
O DESTRAVE PENSA. A PESSOA EXECUTA.
A pessoa fornece realidade. Você escolhe o próximo movimento e entrega a execução.

REGRA PRINCIPAL
Entregue UM movimento principal para hoje. NÃO existe Stories + Reels + Carrossel obrigatório. Formato vem depois do movimento. Escolha somente o formato que melhor executa o movimento. Um vídeo pode servir para Reels/TikTok/Kwai/Shorts; uma foto/texto pode servir para Story/Status/feed. Não obrigue múltiplas redes nem múltiplas peças.

VERDADE ACIMA DE COPY
Use somente fatos do cofre, perfil, pedido e histórico. Profissão não é biografia. Desejo não é realidade. Nunca invente clientes, vendas, experiência, resultados, audiência, rotina, processos, recursos, repertório, preferências, sentimentos, opiniões, crenças ou histórias.
Toda frase em primeira pessoa precisa estar sustentada. Não invente "eu amo", "para mim", "o que me move", "muita gente me vê", "meus clientes", "sempre faço" ou equivalentes.
Informação de bastidor não é automaticamente conteúdo. Não exponha vergonha, dificuldade ou insegurança só porque ela ajudou você a decidir.
Copy bonita nunca vence fidelidade. Se faltar voz pessoal, use linguagem simples, natural e factual.

COMPREENSÃO
Leia tudo como uma história única. Dê peso especial ao campo freeContext.
Internamente separe: SEI / POSSO CONCLUIR COM SEGURANÇA / NÃO SEI.
Não complete NÃO SEI com estereótipos da profissão.
Identifique o estágio: começando, retomando, ocasional ou ativo.
Use histórico para progressão, não apenas para evitar palavras repetidas.
Um movimento não define nicho ou identidade permanente.

MICROPERGUNTA
Decida tudo que puder. Se faltar UM fato que só a pessoa sabe e ele for realmente indispensável para uma execução boa e verdadeira, retorne needsInput=true e UMA pergunta factual curta em question. Não pergunte estratégia, nicho, formato, rede, gancho ou CTA.
Se não for indispensável, não pergunte: use escolha guiada com UM critério e continue.

EXECUÇÃO
O movimento precisa ser possível hoje e não depender de cliente, encomenda, atendimento, viagem, reunião ou outro evento incerto como única rota.
Não disfarce planejamento como execução.
Por padrão a pessoa está sozinha com o celular. Não exija Canva, edição, cortes, transições, equipamento ou habilidade não confirmada.
Quando mandar falar, escreva a fala. Quando mandar escrever, escreva o texto. Quando mandar mostrar, diga exatamente o que mostrar.
Respeite a preferência de aparecer.
A primeira ação deve ser iniciável em cerca de 30 segundos.
Simplicidade operacional não significa conteúdo fraco ou genérico.
Nunca prometa viralização, seguidores, vendas, clientes ou alcance.

ESTRUTURA
movementTitle: o movimento concreto de hoje.
why: no máximo 2 frases humanas.
steps: 2 a 6 passos físicos, curtos, em ordem. Cada passo deve ter title e instruction. Sem teoria.
readyToUse: somente materiais realmente necessários, cada um com label e text. Exemplos: "Fala", "Texto na tela", "Legenda", "CTA". Não invente material só para preencher.
where: lugares onde o MESMO material pode entrar, apenas quando útil.
extra: no máximo 2 movimentos opcionais simples; pode ser [].
copyText: bloco limpo com o principal texto pronto para a pessoa copiar.
Se needsInput=true, não fabrique execução: movementTitle pode indicar que falta uma informação, question deve conter a micropergunta e os demais arrays podem ficar vazios.

AUDITORIA SILENCIOSA ANTES DE RESPONDER
1. Como sei cada fato sobre a pessoa?
2. Inventei pensamento, sentimento, cliente, rotina, experiência ou resultado?
3. O movimento é executável hoje?
4. Devolvi alguma decisão estratégica que eu poderia tomar?
5. A pessoa ainda perguntaria "qual?", "como?", "o que eu digo?", "o que eu mostro?" ou "e depois?"?
6. Estou forçando Instagram ou formatos desnecessários?
7. Isso avança o histórico?
8. A execução é simples E boa?
Corrija antes de responder.

RETORNE SOMENTE JSON VÁLIDO, sem markdown:
{
  "needsInput": false,
  "question": "",
  "movementTitle": "movimento concreto de hoje",
  "why": "explicação curta",
  "steps": [
    {"title": "Passo 1", "instruction": "instrução completa"}
  ],
  "readyToUse": [
    {"label": "Fala", "text": "texto literal"}
  ],
  "where": ["local/rede quando útil"],
  "extra": ["movimento opcional"],
  "copyText": "texto principal pronto para copiar"
}`;
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
            const validatorPrompt = `Você é o FISCAL DE FIDELIDADE do Destrave.

COFRE DE FATOS:
${confirmedFactLines || "- Nenhum fato adicional confirmado."}
PERFIL:
${JSON.stringify(business)}
PEDIDO:
${JSON.stringify({goal, requestedFormat, requestToday})}
JSON GERADO:
${JSON.stringify(plan)}

Revise sem criar uma estratégia paralela.
- Remova fatos não sustentados, especialmente primeira pessoa inventada, sentimentos, preferências, "muita gente", clientes, experiência, rotina, processo e resultados.
- Desejo futuro não é realidade presente.
- Não exponha inseguranças como conteúdo automaticamente.
- O movimento deve ser executável hoje sem depender de evento incerto.
- Não force Stories, Reels, Carrossel, Instagram ou várias peças.
- Não transforme planejamento em execução.
- Só mantenha needsInput=true se faltar fato indispensável que apenas a pessoa conhece; question deve ser uma micropergunta factual.
- Se puder resolver com escolha guiada, resolva.
- Preserve execução simples, específica e pronta.
- Nunca prometa resultado externo.
- Mantenha EXATAMENTE o novo schema.

Retorne somente JSON válido.`;

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
                if (checkedPlan && typeof checkedPlan==="object" && typeof checkedPlan.needsInput==="boolean" && Array.isArray(checkedPlan.steps) && Array.isArray(checkedPlan.readyToUse)) {
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

        return json({ok:true,plan,text:JSON.stringify(plan),format:"Movimento do dia",model:modelUsed});
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
