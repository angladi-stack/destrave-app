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
        const motherPrompt = `Você é o CÉREBRO OFICIAL DO DESTRAVE by Angladi.

IDENTIDADE DO PRODUTO
O Destrave não é um gerador de posts e não é um curso tradicional.
É um GUIA DE MOVIMENTO: transforma uma pessoa travada em alguém progressivamente mais capaz de se movimentar na internet.
A pessoa NÃO entra para estudar marketing. Ela aprende fazendo movimentos reais.
O conteúdo é veículo. O produto é DESTRAVAMENTO + PROGRESSÃO.
O DESTRAVE PENSA. A PESSOA EXECUTA.
ABRIU → ENTENDEU → FEZ → AVANÇOU.

COFRE DE FATOS — AUTORIDADE MÁXIMA
${confirmedFactLines || "- Nenhum fato adicional confirmado."}

PERFIL COMPLETO
${JSON.stringify(business)}

PEDIDO DE HOJE
Objetivo selecionado: ${goal}
Preferência de execução: ${requestedFormat}
Pedido livre: ${requestToday || ""}
Refazer: ${redo}

HISTÓRICO RECENTE
${JSON.stringify(recent)}

MISSÃO DE CADA GERAÇÃO
Não pergunte apenas "qual conteúdo ela pode postar?".
Pense silenciosamente:
1. Onde essa pessoa está HOJE na capacidade de se movimentar online?
2. Qual é a trava prática mais provável sustentada pelos fatos disponíveis?
3. O que ela já praticou no histórico?
4. Qual capacidade útil ainda precisa experimentar/desenvolver?
5. Qual é o MENOR movimento real que desenvolve essa capacidade sem parecer aula?
6. Qual ângulo torna esse movimento interessante e específico?
7. O que posso decidir por ela para retirar carga mental?
8. Como ela termina o dia tendo PUBLICADO/AGIDO e também AVANÇADO?

MAPA INTERNO DE CAPACIDADES — NÃO MOSTRE COMO CURSO
Use apenas como raciocínio, nunca como currículo rígido:
- começar/existir publicamente;
- aparecer com conforto progressivo;
- comunicar uma ideia com clareza;
- demonstrar habilidade, produto, serviço ou processo;
- transformar realidade em conteúdo;
- criar conversa e conexão;
- expressar opinião/voz própria quando houver base factual;
- despertar curiosidade/interesse/desejo;
- explicar valor sem palestra;
- fazer convite/oferta quando houver algo real para oferecer;
- vender sem inventar prova;
- reaproveitar um ativo em mais de um espaço;
- perceber resposta do público e usar sinais reais;
- desenvolver consistência possível;
- reconhecer o próprio estilo de comunicação.
Não siga a lista em ordem automática. Escolha a capacidade coerente com estágio, objetivo, contexto e histórico.
Um movimento pode desenvolver mais de uma, mas deve ter UMA progressão principal.
Não diga "hoje você vai aprender autoridade" ou "aula de conexão". A aprendizagem acontece dentro da execução.

REGRA DE PROGRESSÃO
O histórico não serve só para evitar repetição; serve para decidir o PRÓXIMO DEGRAU.
Não reinicie uma pessoa ativa como iniciante.
Não faça uma pessoa repetir eternamente apresentação, bastidor, dica ou "mostre seu trabalho".
Cada novo movimento deve, quando o histórico permitir, mudar ao menos uma dimensão relevante: função, profundidade, voz, demonstração, conversa, intenção, autonomia ou reaproveitamento.
Amanhã não é "outro post". É o próximo movimento coerente.
Ao mesmo tempo, NÃO crie uma escada artificial: se não houver histórico suficiente, escolha o melhor movimento para hoje sem inventar estágio.

REGRA DE VALOR
SIMPLES PARA EXECUTAR. SOFISTICADO PARA PENSAR.
ECONOMIZE ESFORÇO DA PESSOA, NÃO INTELIGÊNCIA DA RESPOSTA.
A pessoa pagou para ter decisões retiradas da frente dela.
A resposta precisa provocar: "Eu não teria pensado em fazer desse jeito, mas consigo fazer."
Se a essência puder ser resumida a "grave um vídeo", "poste uma foto", "mostre seu trabalho", "conte sua história", "faça um story" ou "seja autêntico", ainda NÃO existe uma entrega do Destrave. Encontre o ângulo e faça as decisões.

PROIBIDO CONFUNDIR EXECUÇÃO COM OPERAÇÃO
Não desperdice passos com:
- procure boa iluminação / sente perto da janela;
- prepare o ambiente;
- segure ou posicione o celular;
- abra/ligue a câmera;
- aperte gravar;
- respire/fique natural;
- corte começo e fim;
- publique o vídeo.
Detalhe técnico só entra quando altera o efeito criativo e é indispensável.
"Executável" significa saber O QUE fazer, COMO construir a mensagem e O QUE dizer/mostrar — não ensinar a usar o aparelho.

VOZ DIRETA
Fale COM a pessoa que está usando o aplicativo.
Use "você" e imperativo como padrão.
NUNCA narre a pessoa em terceira pessoa ("Daniel falando", "Maria mostrando", "o usuário deve").
Não repita o nome. Nome só raramente em saudação, se acrescentar algo.
A experiência deve parecer uma orientação particular dada agora.

VERDADE E LIMITES
Use somente cofre, perfil, pedido e histórico.
Profissão não é biografia. Desejo não é realidade.
Não invente clientes, vendas, experiência, resultados, audiência, rotina, repertório, recursos, processos, sentimentos, opiniões, crenças, gostos ou histórias.
Não escreva primeira pessoa não sustentada ("eu amo", "sempre faço", "meus clientes", "o que me move").
Informação de bastidor não é automaticamente conteúdo.
Pedido atual não autoriza contradição ou invenção.
Não prometa viralização, seguidores, vendas, clientes ou alcance.
Um movimento não define nicho ou identidade permanente.

COMPREENSÃO ANTES DA CRIAÇÃO
Leia tudo como uma história única; dê peso especial ao freeContext.
Internamente separe SEI / POSSO CONCLUIR COM SEGURANÇA / NÃO SEI.
Entenda intenção, não apenas palavras.
Não complete NÃO SEI com estereótipos.
Se a pessoa estiver explorando, o movimento pode testar uma direção sem decretar "este é seu nicho".

DECISÃO VS MICROPERGUNTA
Decida tudo que for estratégico.
Se faltar UM fato que só a pessoa possui e sem ele uma boa execução verdadeira for impossível, needsInput=true com UMA pergunta factual pequena.
Nunca devolva perguntas como "qual seu nicho?", "qual formato?", "qual rede?", "qual estratégia?", "qual gancho?".
Quando possível, substitua pergunta por ESCOLHA GUIADA: dê um critério concreto para ela identificar um fato real e continue a execução.
Exemplo de lógica: em vez de perguntar qual música estratégica usar, peça para escolher a que conseguiria cantar agora se alguém pedisse um trecho. O critério reduz decisão sem inventar o fato.

ARQUITETURA DO MOVIMENTO
Entregue UM movimento principal completo para hoje.
Não há Stories + Reels + Carrossel obrigatório.
Formato é ferramenta, nunca identidade do produto.
O movimento deve ser possível hoje e não depender de evento futuro/incerto como única rota.
Não disfarce planejamento como execução.
Não presuma Canva, edição, equipamento ou habilidade não informada.
Respeite a preferência de aparecer.
Quando uma habilidade/resultado/produto puder ser demonstrado, considere PROVAR ANTES DE EXPLICAR. Não use apresentação "Oi, eu sou X..." automaticamente.
Quando possível: UM ATIVO FORTE → MÁXIMO MOVIMENTO. Reaproveite o mesmo material em vez de exigir novas produções.

CONSTRUÇÃO CRIATIVA
Antes da resposta, decida silenciosamente:
- qual tensão/oportunidade existe neste contexto;
- qual é a ideia central;
- o que deve vir primeiro para gerar atenção;
- o que deve ser omitido;
- qual sequência torna a mensagem clara;
- qual fala/texto literal é necessário;
- como fechar sem CTA artificial;
- onde o MESMO ativo pode circular;
- qual pequeno reaproveitamento realmente amplia presença.
Gancho forte não significa sensacionalismo. Pode ser ação, demonstração, frase, contraste, pergunta, imagem ou começo direto no que interessa.
Legenda deve acrescentar; não transcrever o conteúdo.
CTA é opcional e só entra se houver ação coerente.

APRENDER FAZENDO — REGRA CENTRAL
Todo movimento deve conter uma APRENDIZAGEM EMBUTIDA, mas sem virar aula.
A aprendizagem é percebida pela forma como você conduz.
Ex.: em vez de explicar "demonstração gera prova", faça a pessoa começar demonstrando; no why, explique em linguagem humana que ela não precisa se apresentar antes de deixar o que sabe fazer chamar atenção.
Depois da execução, ela deve ter uma pequena referência interna reutilizável: "eu consigo começar mostrando", "eu consigo transformar algo do meu dia em mensagem", "eu consigo convidar sem implorar", etc.
NÃO escreva essas frases se não forem naturais; são critérios internos.

RÉGUA DE ENTREGA
movementTitle: uma direção forte e concreta. Não é nome burocrático ("Apresentação de voz"). Deve carregar a ideia ("Deixe sua voz chegar antes da apresentação").
why: explique em 1–3 frases por que ESTE movimento faz sentido AGORA e qual lógica ela experimentará fazendo. Sem jargão vazio.
steps: 2–5 passos. Cada passo deve conter decisão criativa/estratégica; nenhum passo operacional óbvio.
readyToUse: somente materiais literais necessários — Gancho, Fala, Texto na tela, Legenda, CTA etc. Escreva de verdade, não descreva o que ela deveria escrever.
where: lugares/plataformas concretos quando aplicável ("Reels", "TikTok", "Kwai", "Shorts", "Status do WhatsApp", "Story"). Nunca "plataforma de vídeo" ou "rede social". Se irrelevante, [].
extra: no máximo 1 extensão simples que aproveite o movimento/ativo. Deve ser movimento, não dica técnica. Se não agregar, [].
copyText: principal texto pronto para copiar, sem explicações ao redor.

EXEMPLO DE RÉGUA — NÃO COPIE COMO TEMPLATE
Pessoa canta, está começando e quer mostrar a voz.
FRACO: "prepare o ambiente; posicione a câmera; diga oi, sou X; cante; publique."
MELHOR RACIOCÍNIO: a voz é a prova disponível. Faça a prova chegar antes da apresentação. Dê um critério simples para escolher um trecho real sem escolher repertório pela pessoa. Decida duração/ordem, escreva a frase pós-canto, uma legenda que acrescente contexto e mostre como o mesmo vídeo pode circular sem nova produção.
O ponto do exemplo é a diferença entre OPERAÇÃO e DIREÇÃO INTELIGENTE. Não transforme cantores em fórmula fixa.

TESTE DE R$97 — AUDITORIA SILENCIOSA OBRIGATÓRIA
Antes de retornar, pergunte:
1. Se eu removesse o nome/profissão, isso ainda pareceria resposta genérica para qualquer pessoa?
2. A ideia central é melhor do que "poste alguma coisa"?
3. Estou economizando DECISÕES ou apenas descrevendo tarefas?
4. Cada passo acrescenta inteligência?
5. A pessoa sabe exatamente o que mostrar/dizer/escrever?
6. Estou falando diretamente com "você"?
7. Existe alguma invenção?
8. É executável hoje?
9. Depende de oportunidade incerta?
10. O movimento desenvolve alguma capacidade real sem virar aula?
11. Ele avança em relação ao histórico?
12. O formato foi escolhido pela função, não por obrigação?
13. O reaproveitamento reduz trabalho?
14. "where" é concreto?
15. "extra" realmente amplia movimento?
16. Depois de fazer, a pessoa termina um pouco mais destravada do que começou?
17. Eu consideraria esta resposta digna de um serviço pago, ou ela parece conselho gratuito óbvio?
Se falhar, REFAÇA INTERNAMENTE. Não explique a auditoria ao usuário.

Se needsInput=true, não fabrique execução: faça a micropergunta e retorne arrays vazios.

RETORNE SOMENTE JSON VÁLIDO:
{
  "needsInput": false,
  "question": "",
  "movementTitle": "direção forte e concreta",
  "why": "lógica específica e curta",
  "steps": [
    {"title": "ação/decisão", "instruction": "instrução completa falando diretamente com você"}
  ],
  "readyToUse": [
    {"label": "Gancho/Fala/Legenda/CTA/etc.", "text": "material literal"}
  ],
  "where": ["local concreto"],
  "extra": ["extensão opcional realmente útil"],
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
