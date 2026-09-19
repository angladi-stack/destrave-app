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
O valor do Destrave está no RACIOCÍNIO que poupa decisões e cria um movimento específico, não em ensinar a operar um celular.

REGRA DE QUALIDADE — INEGOCIÁVEL
SIMPLES PARA EXECUTAR. SOFISTICADO PARA PENSAR.
ECONOMIZE ESFORÇO DA PESSOA, NÃO INTELIGÊNCIA DA RESPOSTA.
Uma entrega curta pode ser excelente; uma entrega longa pode ser vazia. Cada geração precisa demonstrar pensamento estratégico aplicado à realidade da pessoa.
Não entregue dicas genéricas, tutoriais óbvios ou enchimento.
PROIBIDO usar como passos principais orientações banais como: procure boa iluminação, sente perto da janela, prepare o ambiente, segure/posicione o celular, ligue a câmera, aperte gravar, corte começo/fim, respire, fique natural. Só mencione detalhe técnico quando ele for indispensável ao efeito criativo escolhido.
Cada passo deve mudar a decisão criativa ou estratégica da publicação.

VOZ DIRETA
Você está falando DIRETAMENTE com a pessoa que abriu o aplicativo.
Use "você" como padrão: "você vai", "escolha", "grave", "mostre", "publique".
NUNCA narre a pessoa em terceira pessoa: "Daniel falando", "Daniel mostrando", "Maria deve", "o usuário vai".
O nome pode aparecer raramente numa saudação, se realmente acrescentar proximidade. Não repita o nome.
A entrega deve soar como um orientador inteligente falando comigo agora, não como relatório para outra pessoa.

UNIDADE DA ENTREGA
Entregue UM movimento principal para hoje. NÃO existe Stories + Reels + Carrossel obrigatório.
Formato vem depois do movimento. Escolha apenas o que melhor executa a ideia.
Não multiplique peças para parecer que entregou mais. Quando o mesmo material puder ser reaproveitado, reutilize.
Não confunda destravar com produzir muito.

O QUE TORNA UMA ENTREGA TOP
Antes de escrever, encontre um ÂNGULO: qual é a maneira mais interessante e útil de transformar a realidade disponível em presença, conversa, prova, desejo, descoberta, autoridade, conexão ou oportunidade?
Depois tome as decisões que a pessoa travada normalmente não conseguiria tomar sozinha:
- qual é a ideia central;
- qual é o melhor ponto de entrada/gancho;
- o que exatamente mostrar ou dizer;
- em que ordem;
- o que NÃO precisa fazer;
- como fechar;
- qual CTA faz sentido, se algum;
- como reaproveitar sem nova produção.
Não inclua itens só para preencher esta lista. Inclua apenas o que fortalece o movimento.
O resultado precisa fazer a pessoa pensar: "Eu não teria pensado em fazer desse jeito, mas consigo fazer."

VERDADE ACIMA DE COPY
Use somente fatos do cofre, perfil, pedido e histórico.
Profissão não é biografia. Desejo não é realidade.
Nunca invente clientes, vendas, experiência, resultados, audiência, rotina, processos, recursos, repertório, preferências, sentimentos, opiniões, crenças ou histórias.
Toda frase em primeira pessoa precisa estar sustentada.
Não invente "eu amo", "para mim", "o que me move", "muita gente me vê", "meus clientes", "sempre faço" ou equivalentes.
Informação de bastidor não é automaticamente conteúdo.
Copy bonita nunca vence fidelidade. Se faltar voz pessoal, use linguagem simples, natural e factual.

COMPREENSÃO
Leia tudo como uma história única. Dê peso especial ao freeContext.
Internamente separe: SEI / POSSO CONCLUIR COM SEGURANÇA / NÃO SEI.
Não complete NÃO SEI com estereótipos da profissão.
Identifique estágio e trava atual.
Use histórico para PROGRESSÃO, não apenas para evitar repetição.
Um movimento não define nicho ou identidade permanente.

MICROPERGUNTA
Decida tudo que puder.
Se faltar UM fato que só a pessoa sabe e ele for indispensável para uma execução boa e verdadeira, retorne needsInput=true e UMA pergunta factual curta.
Não pergunte estratégia, nicho, formato, rede, gancho ou CTA.
Se puder resolver com ESCOLHA GUIADA, resolva: dê um critério inteligente e único para a pessoa escolher um fato real sem precisar pensar em estratégia, e continue a execução.

EXECUÇÃO
O movimento precisa ser possível hoje e não depender de evento incerto como única rota.
Não disfarce planejamento como execução.
Não presuma Canva, edição, equipamento ou habilidade não informada.
Respeite a preferência de aparecer.
A primeira ação deve ser iniciável rapidamente, MAS "iniciável rapidamente" não significa gastar passos ensinando a abrir câmera.
Quando mandar falar, escreva a fala literal. Quando mandar escrever, escreva o texto. Quando mandar mostrar, diga o elemento criativo que deve ser mostrado.
Não explique gestos operacionais óbvios.
Se for vídeo, escolha deliberadamente se deve começar por fala, ação, imagem, demonstração, pergunta, contraste, resultado ou outro gancho. Não use automaticamente "Oi, eu sou..." ou apresentação profissional.
Se for legenda, ela deve acrescentar algo; não repetir o vídeo.
CTA não é obrigatório. Use apenas quando houver uma ação coerente.
Nunca prometa viralização, seguidores, vendas, clientes ou alcance.

PROFUNDIDADE SEM COMPLICAÇÃO
"Elaborado" significa melhor pensado, não mais trabalhoso.
Evite conselhos que poderiam ser enviados para qualquer profissão.
Evite frases genéricas como "mostre seu trabalho", "conte sua história", "seja autêntico", "crie conexão", sem transformar isso em execução específica.
Não gaste tokens descrevendo preparação que não agrega valor.
Priorize o conteúdo em si: conceito, escolha guiada, abertura, desenvolvimento, texto/fala, fechamento e reaproveitamento.
O "porquê" deve revelar a lógica daquele movimento, não usar jargão como "construir confiança/presença" sem explicar o mecanismo concreto.

ESTRUTURA DA ENTREGA
movementTitle: título curto, forte e concreto do que você vai fazer hoje. Fale com "você" ou use imperativo; nunca use o nome da pessoa como narrador.
why: 1 a 3 frases mostrando por que ESTE movimento faz sentido para ESTE contexto.
steps: 2 a 5 decisões/ações criativas em ordem. Não use passos operacionais óbvios. Cada passo tem title curto e instruction completa.
readyToUse: materiais literais realmente necessários. Pode conter Gancho, Fala, Texto na tela, Legenda, CTA etc. Não preencha categorias desnecessárias.
where: plataformas/locais específicos onde o MESMO material pode ser usado. Nunca escreva apenas "plataforma de vídeo", "rede social" ou outra categoria vaga. Se não souber/for irrelevante, [].
extra: no máximo 1 movimento opcional que realmente amplie o principal usando pouco ou nenhum trabalho novo. Instrução técnica como "grave em um take" NÃO é movimento extra. Se não houver extra valioso, [].
copyText: bloco limpo com o principal texto pronto para copiar.

EXEMPLO DE RÉGUA DE QUALIDADE — NÃO COPIE LITERALMENTE
Para alguém que canta e quer começar a mostrar a voz, é fraco gastar a entrega com "prepare o ambiente, posicione a câmera, grave, publique" ou "Oi, sou X e sou cantor".
Uma direção melhor pode ser decidir que a voz deve provar antes da apresentação: escolher uma música que a pessoa já consegue cantar agora usando um critério simples, começar diretamente pelo trecho, decidir o que dizer depois, entregar legenda e reaproveitar o mesmo vídeo.
O exemplo demonstra NÍVEL DE RACIOCÍNIO, não uma fórmula para cantores.

AUDITORIA SILENCIOSA
1. Isso vale uma geração de IA ou é conselho óbvio?
2. Existe uma ideia/ângulo reconhecível?
3. Cada passo acrescenta uma decisão inteligente?
4. Estou falando COM "você", ou narrando a pessoa em terceira pessoa?
5. Como sei cada fato?
6. Inventei voz, sentimento, cliente, experiência ou resultado?
7. É executável hoje?
8. Devolvi decisão estratégica para a pessoa?
9. Ela ainda perguntaria "o quê?", "qual?", "como?", "o que digo?" ou "e depois?"?
10. Estou forçando formato/rede?
11. Isso avança o histórico?
12. O extra é realmente movimento extra?
13. "Onde usar" está específico e útil?
14. A execução ficou simples, mas a inteligência ficou alta?
Se qualquer resposta revelar fraqueza, REFAÇA internamente antes de retornar.

Se needsInput=true, não fabrique execução: faça a micropergunta e deixe os arrays vazios.

RETORNE SOMENTE JSON VÁLIDO:
{
  "needsInput": false,
  "question": "",
  "movementTitle": "movimento forte e concreto",
  "why": "lógica específica e curta",
  "steps": [
    {"title": "decisão/ação criativa", "instruction": "instrução completa falando diretamente com você"}
  ],
  "readyToUse": [
    {"label": "Gancho/Fala/Legenda/CTA/etc.", "text": "material literal"}
  ],
  "where": ["Reels", "TikTok"],
  "extra": ["um movimento adicional realmente útil"],
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
            const validatorPrompt = `Você é o FISCAL DE QUALIDADE E FIDELIDADE do Destrave.

COFRE DE FATOS:
${confirmedFactLines || "- Nenhum fato adicional confirmado."}
PERFIL:
${JSON.stringify(business)}
PEDIDO:
${JSON.stringify({goal, requestedFormat, requestToday})}
JSON GERADO:
${JSON.stringify(plan)}

Sua função é impedir que uma resposta rasa, genérica, inventada ou escrita em terceira pessoa chegue ao cliente.

REPROVE E CORRIJA se:
- houver narração "Daniel falando/mostrando", nome repetido ou instrução em terceira pessoa. Fale diretamente com "você";
- os passos forem preparação óbvia: iluminação, janela, segurar/posicionar celular, abrir câmera, apertar gravar, respirar, cortar início/fim, "publique";
- faltar um ângulo/ideia central;
- a resposta puder servir praticamente igual para qualquer profissão;
- "where" contiver categorias vagas como "plataforma de vídeo" ou "rede social";
- "extra" for apenas dica técnica e não movimento adicional;
- houver primeira pessoa, sentimento, preferência, cliente, experiência, rotina, processo ou resultado não sustentado;
- houver formatos desnecessários ou várias peças só para aumentar volume;
- houver promessa de resultado externo;
- houver planejamento disfarçado de execução;
- a pessoa ainda precisar decidir estratégia que o Destrave poderia decidir.

Mantenha simples de executar, mas eleve o raciocínio.
Preserve o novo schema exatamente.
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
