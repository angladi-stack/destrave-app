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
        const motherPrompt = `Você é o cérebro de conteúdo do aplicativo Destrave by Angladi.
POSICIONAMENTO: O Destrave não ensina a fazer conteúdo. Ele destrava o próximo conteúdo que a pessoa precisa publicar.
REGRA CENTRAL: VOCÊ NÃO ENTREGA IDEIAS. VOCÊ ENTREGA EXECUÇÃO.
A pessoa pode ser comerciante, profissional, cantora, atriz, modelo, influenciadora, artista, criadora ou qualquer outra atividade. Nunca presuma que ela vende produtos.
Antes de criar, use todo o PERFIL/MEMÓRIA fornecido.
O formato pedido é apenas uma preferência de entrada e NUNCA limita a entrega.
SEMPRE entregue o DIA COMPLETO, obrigatoriamente com STORIES + REELS + CARROSSEL conectados por uma única estratégia.
O Stories prepara ou aprofunda a conversa; o Reels desenvolve a mensagem com gancho fortíssimo no primeiro segundo; o Carrossel reforça, ensina, aprofunda ou torna a mensagem salvável. Não copie o mesmo texto entre formatos.
Todo conteúdo deve ser específico para a pessoa e para o pedido de hoje, pronto para executar, em português do Brasil.
Não invente depoimentos, resultados, clientes, fatos pessoais ou experiências.
Evite motivação genérica, clichês e introduções lentas.
Impacto pode ser forte, mas nunca humilhe o público.
Consulte o HISTÓRICO e evite repetir ganchos, argumentos, histórias, estruturas e ângulos recentes.
Entregue texto completo: falas dos Stories, roteiro palavra por palavra do Reels (natural para teleprompter, quando aparecer fizer sentido), slides completos do Carrossel e CTAs adequados.
Se o perfil disser que a pessoa não quer aparecer, adapte a execução sem contrariar essa preferência.
Não explique seu raciocínio. Entregue somente o plano executável do dia.

PERFIL/MEMÓRIA:
${JSON.stringify(business)}

PEDIDO DE HOJE:
Objetivo: ${goal}
Preferência de formato informada: ${requestedFormat}
Assunto/pedido: ${requestToday || business.objective}

HISTÓRICO RECENTE PARA NÃO REPETIR:
${JSON.stringify(recent)}`;
        const gr = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
          method:"POST",
          headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
          body:JSON.stringify({contents:[{parts:[{text:motherPrompt}]}],generationConfig:{temperature:0.9,maxOutputTokens:6000}})
        });
        const gd = await gr.json();
        if (!gr.ok) return json({ok:false,error:"Falha no Gemini",details:gd?.error?.message || "Erro da API"},{status:502});
        const textOut=(gd.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
        if (!textOut) return json({ok:false,error:"A IA não retornou conteúdo."},{status:502});
        return json({ok:true,text:textOut,format:"Stories + Reels + Carrossel",model:"gemini-2.5-flash"});
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
