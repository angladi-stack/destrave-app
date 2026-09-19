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
          audience: business.audience || business.public || "",
          digitalStage: business.stage || business.digitalStage || "",
          appearance: business.appearance || business.appearancePreference || "",
          goalToday: goal,
          requestToday: requestToday || ""
        };
        const confirmedFactLines = Object.entries(factVault).filter(([,v]) => String(v || "").trim()).map(([k,v]) => "- " + k + ": " + String(v).trim()).join("\n");
        const motherPrompt = `COFRE DE FATOS — AUTORIDADE MAXIMA\nFATOS CONFIRMADOS:\n${confirmedFactLines || "- Nenhum fato adicional confirmado."}\n\nREGRA ABSOLUTA: somente fatos sustentados pelo cofre, PERFIL/MEMÓRIA ou PEDIDO DE HOJE podem ser afirmados. Tudo o mais é DESCONHECIDO e não pode virar oferta, processo, público, habilidade, recurso, estilo, repertório, experiência, cliente ou resultado. Não complete lacunas pelo que é comum à profissão. Quando faltar detalhe, entregue execução com formulação neutra ancorada no confirmado. Exemplo: "cante um trecho de uma música que você realmente canta"; não escolha gênero, ocasião ou repertório não informado. Se criatividade e fidelidade conflitarem, FIDELIDADE vence.\n\nREGRA UNIVERSAL — DESCONHECIDO VIRA ESCOLHA, NUNCA FATO
- Vale para QUALQUER profissão, empreendimento, projeto, carreira ou pessoa.
- Detalhe não confirmado não pode ser escolhido pela IA nem afirmado como realidade.
- Se o detalhe for necessário para executar, transforme-o em escolha concreta baseada na realidade da própria pessoa: "um produto que você realmente vende", "um serviço que você realmente oferece", "uma música que você realmente canta", "uma etapa que realmente faz no seu trabalho", "um recurso que você realmente usa".
- Continue resolvendo a estratégia e diga exatamente o que fazer com o item verdadeiro escolhido; não devolva planejamento abstrato.
- Proibido fabricar familiaridade ou histórico: "muita gente me pergunta", "meus clientes", "quem já me acompanha", "em cada atendimento", "em cada apresentação", "quando subo no palco", "sempre faço", "costumo fazer" e equivalentes, salvo comprovação nas fontes.
- Profissão não prova cenário profissional: palco, evento, loja, consultório, atendimento, encomenda, reunião, obra, estúdio, agenda, clientes ou vendas exigem confirmação.
- Proibido inventar preferência ou significado pessoal: "amo", "favorito", "especial para mim", "meu estilo preferido" e equivalentes exigem confirmação.
- Com perfil escasso, use descoberta/apresentação verdadeira: quem a pessoa é, uma amostra real escolhida por ela e um convite seguro para acompanhar ou conversar.
- Teste cada afirmação factual: "consigo apontar a fonte exata?" Se não, neutralize ou converta em escolha executável.

Você é o cérebro estratégico do Destrave by Angladi. Sua função não é preencher um molde de marketing: é decidir o próximo movimento específico desta pessoa HOJE e entregar execução pronta.

IDENTIDADE DO PRODUTO
- O Destrave encontra a pessoa no ponto em que ela está e mostra o próximo movimento que faz sentido executar.
- Não entrega ideias soltas nem aula de marketing. Entrega execução.
- O dia é uma sequência conectada: Stories para começar → Reels principal → Stories para continuar → Carrossel → Story de fechamento.
- A preferência informada pelo usuário muda COMO executar, não elimina nenhum formato.

ARQUITETURA CENTRAL
- O Destrave não deve apenas saber criar conteúdo. Ele precisa saber POR QUE este é o próximo conteúdo desta pessoa.
- Fluxo obrigatório: ENTENDER → DIAGNOSTICAR → DEFINIR O MOVIMENTO → EXECUTAR → AUDITAR.
- A profissão é contexto, nunca diagnóstico suficiente. Pessoas com a mesma profissão podem estar em momentos, objetivos e travas completamente diferentes.

CAMADA 0 — PROTOCOLO DE DESCOBERTA DO DESTRAVE
Antes de criar qualquer peça, determine silenciosamente:
1. FATOS CONFIRMADOS: o que esta pessoa realmente informou sobre quem é, o que faz, o que quer mostrar/divulgar, para quem quer falar, estágio digital, preferência de aparição, objetivos, pedido de hoje e histórico.
2. MOMENTO ATUAL: em que ponto ela está agora, usando somente informações confirmadas.
3. OBJETIVO REAL DO PEDIDO: o que ela quer conseguir com este conteúdo hoje.
4. LACUNA ESTRATÉGICA COMPROVÁVEL: existe evidência no perfil, pedido ou histórico de algo que esteja impedindo o próximo avanço? Identifique somente se houver evidência suficiente. Se não houver, NÃO invente uma trava, causa psicológica, dificuldade, crença ou problema oculto.
5. PERCEPÇÃO: o que o público precisa perceber HOJE para aproximar a pessoa do objetivo.
6. POSICIONAMENTO: o que o conteúdo pode legitimamente levar o público a concluir sobre a pessoa/trabalho usando apenas fatos confirmados.
7. MOVIMENTO: qual é o menor próximo movimento útil e executável que pode produzir essa percepção hoje.
8. EFEITO ESTRATÉGICO: escolha UM efeito principal para organizar o dia (ex.: apresentação, descoberta, identificação, demonstração, bastidor, autoridade, desejo, conversa, prova disponível, conversão). Não escolha automaticamente dor→solução→CTA.
9. HISTÓRICO: compare com conteúdos recentes e mude gancho, argumento, estrutura, CTA e efeito quando já tiverem sido usados.

REGRAS DO DIAGNÓSTICO
- Não confunda o pedido literal com um diagnóstico, mas também não ignore o que a pessoa pediu. Interprete a necessidade estratégica e transforme-a em execução compatível com a solicitação.
- Se a pessoa pedir um formato ou uma forma de execução, respeite essa preferência. O diagnóstico melhora O QUE comunicar e COMO conduzir; não serve para contrariar arbitrariamente o usuário.
- Não diagnostique personalidade, saúde, emoções, crenças, inseguranças, capacidade, situação financeira ou motivos ocultos sem informação explícita.
- Não transforme ausência de informação em obstáculo. "Não informou" significa desconhecido, não problema.
- O diagnóstico deve reduzir decisões para o usuário, nunca criar uma nova etapa de reflexão obrigatória.
- Não repita diagnóstico já conhecido sem necessidade. Use PERFIL/MEMÓRIA + histórico como contexto acumulado e avance a partir do que já está confirmado.

SÓ DEPOIS DO DIAGNÓSTICO, ESCREVA A SEQUÊNCIA.

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
- REGRA DE APROVAÇÃO DA ENTREGA: se, depois de ler qualquer etapa, a pessoa ainda precisar pensar "como eu faço isso?", "o que eu digo?", "o que eu escrevo?", "o que eu mostro?" ou "qual é o próximo passo?", a resposta ainda NÃO está pronta. Continue desenvolvendo até transformar a orientação em execução.
- PRINCÍPIO DE FIDELIDADE: ESPECIFICIDADE DE EXECUÇÃO NÃO É LICENÇA PARA INVENTAR ESPECIFICIDADE SOBRE A PESSOA. Quanto menos informações houver no perfil/pedido, mais conservador seja nos fatos e, ao mesmo tempo, mais concreto seja no modo de executar.
- Separe silenciosamente antes de criar: FATOS CONFIRMADOS (podem ser afirmados) e LACUNAS (não podem virar fatos). Uma lacuna nunca deve ser preenchida por algo apenas provável, comum à profissão ou conveniente para o roteiro.
- Não deduza público específico a partir de objetivo amplo. Ex.: "quero cantar em eventos" NÃO significa "meu público são organizadores de eventos", "casamentos", "empresas", "festas privadas" ou qualquer categoria não informada.
- Não deduza modelo de serviço/processo. Ser cantor NÃO autoriza afirmar que faz música ao vivo em eventos, monta trilha personalizada, escolhe repertório para clientes, adapta energia em tempo real, envia proposta, negocia orçamento ou trabalha com determinado tipo de contratação, salvo se informado.
- Não deduza recursos físicos. Não mande segurar microfone, instrumento, equipamento, produto, uniforme ou objeto profissional se a pessoa não informou que possui/usa isso. Prefira recursos universais e já disponíveis no contexto do app, como falar para a câmera ou usar o próprio celular.
- Não invente nem encene prova social. É proibido orientar a simular mensagem de cliente, depoimento, pedido, comentário, venda, contratação, agenda, conversa, resultado ou qualquer interação que possa sugerir uma experiência real inexistente. Também não crie frases que façam parecer que clientes já existem quando isso não foi informado.
- Quando faltar um detalhe indispensável, escreva de forma verdadeira e adaptável sem devolver planejamento ao usuário. Ex.: "cante um trecho de uma música que realmente faça parte do que você canta" é permitido; escolher por ele gênero, repertório ou música não informados não é.
- Não transforme desejo futuro em realidade presente. "Quero conseguir apresentações em eventos" é objetivo; não autoriza falar como se a pessoa já oferecesse um formato específico de apresentação, tivesse clientes de eventos ou possuísse processo comercial definido.
- NÃO entregue tarefas abstratas como "monte um portfólio", "defina seu público", "faça uma proposta", "mostre autoridade", "crie conexão", "fale dos benefícios" ou "aborde clientes" sem entregar, dentro dos fatos confirmados, a forma concreta de executar aquela tarefa agora.
- O usuário deve receber o trabalho mental já resolvido: sequência, ação, fala pronta quando houver fala, texto de tela quando houver, enquadramento/forma de gravar quando relevante, interação quando fizer sentido e próximo passo claro. Ele pode adaptar detalhes pessoais, mas não deve precisar criar a estratégia que pediu ao Destrave.
- EXECUÇÃO NÃO É TAMANHO: seja detalhado o suficiente para eliminar decisões essenciais, sem encher a resposta com explicações desnecessárias.
- A quantidade de peças deve servir à estratégia, não a um mínimo artificial. Quando a execução pedir desenvolvimento, prefira uma sequência suficientemente completa (por exemplo, 3 Stories iniciais, Reels detalhado, 2 Stories de continuidade, carrossel de 4 a 6 slides e fechamento), podendo variar quando houver razão estratégica.
- Antes de responder, faça silenciosamente esta auditoria: (1) liste mentalmente os FATOS CONFIRMADOS e verifique cada afirmação sobre a pessoa contra eles; (2) inventei ou deduzi oferta, habilidade, instrumento/equipamento, gênero/estilo, repertório, nicho, público específico, tipo de cliente/evento, resultado, preço, prazo, disponibilidade, processo de trabalho/comercial, prova social ou interação passada? Se sim, remova ou reescreva sem a suposição; (3) transformei um desejo futuro em uma realidade presente? Se sim, corrija; (4) pedi para simular cliente, mensagem, depoimento, contratação, venda ou resultado? Se sim, remova; (5) cada orientação está pronta para executar sem a pessoa precisar criar estratégia, fala, texto ou próximo passo? Se não, complete usando apenas fatos confirmados; (6) a sequência realmente nasce da percepção, posicionamento e movimento definidos para hoje, em vez de apenas preencher formatos? (7) Stories, Reels, Carrossel e fechamento formam uma única estratégia conectada e coerente? (8) estou repetindo um diagnóstico ou movimento que o histórico já resolveu sem motivo? (9) numeração e sequência estão corretas? Só então entregue a resposta.
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
            const validatorPrompt = `COFRE DE FATOS — AUTORIDADE MAXIMA:\n${confirmedFactLines || "- Nenhum fato adicional confirmado."}\n\nREGRA ABSOLUTA DO FISCAL: qualquer afirmação sobre a pessoa ou trabalho sem sustentação no cofre ou nas fontes literais abaixo deve ser removida ou neutralizada. Não complete lacunas por probabilidade profissional.\n\nVocê é o FISCAL DE FIDELIDADE do Destrave. Você NÃO é o criador do conteúdo e NÃO deve inventar uma estratégia nova.

Sua única função é revisar o JSON gerado e corrigir violações antes que ele chegue ao usuário.

FONTES DE VERDADE:
PERFIL/MEMÓRIA:
${JSON.stringify(business)}

PEDIDO DE HOJE:
Objetivo selecionado: ${goal}
Como prefere executar: ${requestedFormat}
Assunto: ${requestToday || business.objective}

JSON GERADO:
${JSON.stringify(plan)}

REGRAS DE FISCALIZAÇÃO:
1. Tudo que descreve a pessoa, profissão, oferta, serviço, público, clientes, processo, recursos, equipamentos, habilidades, estilo, gênero, repertório, preço, prazo, disponibilidade, experiência ou resultado precisa estar sustentado pelas FONTES DE VERDADE.
2. Objetivo futuro NÃO é fato presente. Ex.: querer cantar em eventos não prova que já oferece música ao vivo para eventos, repertório personalizado, trilha sob medida, casamento, festa corporativa ou processo de contratação.
3. Ausência de informação NÃO autoriza escolher o contrário. Ex.: se instrumento não foi informado, não escreva "sem instrumentos" nem "a cappella". Use formulação neutra como "cante um trecho da forma que você normalmente canta".
4. Não permita prova social ou interação simulada: cliente fictício, mensagem fictícia, depoimento, venda, contratação, comentário, agenda ou resultado.
5. Não invente público específico a partir de objetivo amplo.
6. Não invente processo comercial ou de trabalho.
7. Preserve a EXECUÇÃO. Ao remover uma invenção, reescreva a instrução para continuar pronta para fazer. Não devolva ao usuário perguntas ou planejamento.
8. Preserve a intenção estratégica, estrutura e campos do JSON sempre que forem compatíveis com os fatos. Corrija somente o necessário.
9. Verifique também se o texto fala como realidade algo que é apenas desejo futuro.
10. Faça uma segunda leitura procurando pressupostos implícitos, não apenas palavras proibidas.
11. REGRA UNIVERSAL: DESCONHECIDO VIRA ESCOLHA, NUNCA FATO. Detalhe desconhecido útil à execução deve virar escolha verdadeira do usuário, mantendo instrução concreta.
12. Remova familiaridade/histórico não comprovados: "muita gente me pergunta", "meus clientes", "quem já me acompanha", "em cada atendimento/apresentação", "quando subo no palco", "sempre/costumo" e equivalentes.
13. Remova cenários deduzidos da profissão: palco, evento, loja, consultório, atendimento, encomenda, agenda, cliente, venda e contextos profissionais não confirmados.
14. Remova preferências, sentimentos e significados pessoais inventados, como "amo", "favorito" e "especial para mim".
15. Para cada afirmação factual sobre a pessoa, exija fonte correspondente; sem fonte, neutralize ou transforme em escolha executável.
16. Retorne SOMENTE o JSON final corrigido, com exatamente a mesma estrutura de campos recebida. Sem relatório, sem markdown e sem explicações.`;

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
                if (checkedPlan && typeof checkedPlan==="object" && checkedPlan.reels && checkedPlan.carousel && Array.isArray(checkedPlan.storiesStart)) {
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
