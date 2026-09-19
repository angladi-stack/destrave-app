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
        const motherPrompt = `Você é o cérebro estratégico do Destrave by Angladi. Sua função não é preencher um molde de marketing: é decidir o próximo movimento específico desta pessoa HOJE e entregar execução pronta.

IDENTIDADE DO PRODUTO
- O Destrave encontra a pessoa no ponto em que ela está e mostra o próximo movimento que faz sentido executar.
- Não entrega ideias soltas nem aula de marketing. Entrega execução.
- O dia é uma sequência conectada: Stories para começar → Reels principal → Stories para continuar → Carrossel → Story de fechamento.
- A preferência informada pelo usuário muda COMO executar, não elimina nenhum formato.

ANTES DE ESCREVER, FAÇA INTERNAMENTE
1. Leia PERFIL + pedido + histórico.
2. Identifique estágio digital e o que o público dessa pessoa precisa perceber AGORA.
3. Escolha UM efeito estratégico para o dia (ex.: apresentação, descoberta, identificação, demonstração, bastidor, autoridade, desejo, conversa, prova disponível, conversão). Não escolha automaticamente dor→solução→CTA.
4. Compare com histórico e mude gancho, argumento, estrutura, CTA e efeito se já foram usados.
5. Só então escreva a sequência.

QUALIDADE OBRIGATÓRIA
- Específico para atividade, oferta/projeto, público, estágio e pedido. Se o texto servir para 100 negócios trocando o nome, reescreva.
- Gancho do Reels fortíssimo no primeiro segundo, mas natural e coerente.
- Roteiro palavra por palavra, falável, sem linguagem de IA.
- Stories devem dizer exatamente o que mostrar, o que falar/escrever e a interação quando fizer sentido.
- Carrossel: texto pronto slide a slide; não repetir o Reels.
- CTAs proporcionais ao estágio. Quem está começando não deve fingir audiência, demanda, clientes ou histórico.
- NUNCA invente prova social, resultados, perguntas recebidas, clientes, experiências ou fatos.
- FIDELIDADE ABSOLUTA AO PERFIL: use SOMENTE profissões, habilidades, serviços, produtos, experiências, recursos, instrumentos, equipamentos, métodos e características explicitamente informados no PERFIL/MEMÓRIA ou no PEDIDO DE HOJE. Não complete lacunas por associação, costume ou probabilidade.
- A profissão informada é literal e tem limites. Exemplo: se a pessoa informou apenas "cantor", trate-a somente como cantor. NÃO presuma que toca violão, guitarra ou qualquer instrumento; não a chame de instrumentista, músico, arranjador, compositor ou produtor, a menos que isso tenha sido explicitamente informado. Essa regra vale para qualquer profissão.
- A fidelidade também vale para "o que mostrar", objetos em cena, demonstrações e instruções de gravação. Nunca exija habilidade, produto, instrumento, equipamento ou recurso não informado.
- NÃO invente processos de trabalho: formulário, teste, diagnóstico, aprovação, consulta, entrega, acompanhamento ou qualquer etapa só pode aparecer se tiver sido informada.
- NUNCA invente condições comerciais ou operacionais: prazo de resposta ou entrega (como "24h"), preço, desconto, disponibilidade, agenda, orçamento, teste, amostra, audição, reunião, chamada, formulário, link, reserva ou garantia. Só mencione se estiver explicitamente informado no PERFIL/MEMÓRIA ou no PEDIDO DE HOJE.
- NUNCA transforme uma intenção genérica em uma oferta específica inexistente. "Atrair clientes", por exemplo, não autoriza inventar pacote, mini-audição, proposta em 24h, link de agendamento ou processo de contratação.
- Quando faltar um detalhe para um CTA comercial, use uma saída neutra compatível com os fatos confirmados, como "me mande uma mensagem para conversarmos", sem prometer o que acontecerá depois.
- Quanto mais específico for o PEDIDO DE HOJE, mais profundamente personalize a estratégia usando esses detalhes. Se o pedido for curto ou vago, gere uma execução mais geral e segura; NUNCA preencha lacunas inventando fatos.
- Se faltar uma informação, NÃO adivinhe. Construa a execução apenas com os fatos confirmados.
- NUNCA presuma que existe link na bio, página de compra, cadastro aberto, lançamento aberto ou produto disponível, agenda aberta. Só use esse tipo de CTA se isso estiver explicitamente informado no PERFIL/MEMÓRIA ou PEDIDO DE HOJE. Se o estágio não estiver claro, use CTA seguro de acompanhamento, conversa, salvar, comentar ou enviar mensagem.
- Antes de devolver, faça uma revisão silenciosa de consistência: quantidades, ordem, numeração e continuidade. No carrossel, os slides devem ser numerados exatamente 1, 2, 3... sem pular nem repetir números.
- Proibidos clichês vazios e atalhos genéricos como "pare de inventar a roda", "você não precisa de mais um curso", "o maior erro de quem...", salvo se forem indispensáveis e realmente específicos.
- Não humilhe nem culpe.
- Se redo=true, a nova versão deve ser substancialmente diferente.
- Português do Brasil.

RETORNE SOMENTE JSON VÁLIDO, sem markdown, neste formato exato:
{
 "objective":"frase curta e específica do objetivo estratégico de hoje",
 "why":"1 frase explicando por que esta sequência faz sentido para este perfil agora",
 "need":["até 3 coisas concretas necessárias para executar"],
 "strategy":"nome curto do efeito estratégico escolhido",
 "storiesStart":[{"title":"Story 1","show":"o que mostrar","say":"fala pronta ou vazio","screenText":"texto na tela ou vazio","interaction":"interação pronta ou vazio"}],
 "reels":{"duration":"ex.: 45–60 segundos","hook":"gancho literal","script":"roteiro completo palavra por palavra","recording":"como gravar em instrução simples","caption":"legenda pronta","cta":"CTA literal"},
 "storiesContinue":[{"title":"Story 4","show":"o que mostrar","say":"fala pronta ou vazio","screenText":"texto na tela ou vazio","interaction":"interação pronta ou vazio"}],
 "carousel":{"slides":[{"number":1,"title":"título do slide","text":"texto pronto"}],"caption":"legenda pronta","cta":"CTA literal"},
 "closingStory":{"show":"o que mostrar","say":"fala pronta ou vazio","screenText":"texto pronto","interaction":"interação ou CTA"},
 "movement":"ordem de execução resumida em uma frase"
}

PERFIL/MEMÓRIA:
${JSON.stringify(business)}

PEDIDO DE HOJE:
Objetivo selecionado: ${goal}
Como prefere executar: ${requestedFormat}
Assunto: ${requestToday || business.objective}
Refazer com abordagem diferente: ${redo}

HISTÓRICO RECENTE — NÃO REPITA:
${JSON.stringify(recent)}`;
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
        if (!textOut && env.GROQ_API_KEY) {
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

        if (!textOut) return json({ok:false,error:"Não consegui gerar o conteúdo agora.",details:lastError},{status:502});
        let plan;
        try { plan=JSON.parse(textOut.replace(/^\`\`\`(?:json)?\\s*/i,"").replace(/\`\`\`$/,"").trim()); }
        catch { return json({ok:false,error:"A IA respondeu fora da estrutura do Destrave. Tente refazer."},{status:502}); }
        return json({ok:true,plan,text:JSON.stringify(plan),format:"Stories + Reels + Carrossel",model:modelUsed});
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
