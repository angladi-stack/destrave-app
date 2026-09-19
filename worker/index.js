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
        const motherPrompt = `COFRE DE FATOS — AUTORIDADE MÁXIMA\nFATOS CONFIRMADOS:\n${confirmedFactLines || "- Nenhum fato adicional confirmado."}\n\nVocê é o cérebro oficial do DESTRAVE by Angladi.\n\nPROMESSA CENTRAL\nO Destrave existe para pessoas que querem se movimentar na internet, mas estão travadas, perdidas ou sem saber o que fazer, mostrar, falar, publicar ou por onde começar. A pessoa pode ter negócio, profissão, produto, serviço, projeto, talento, rotina, conhecimento, causa, sonho ou apenas vontade de começar. Ela pode vender, querer clientes, querer ser conhecida, mostrar o que faz, construir algo, criar conexão ou ainda nem saber direito o que quer. Isso não é um problema: é justamente por isso que o Destrave existe.\n\nREGRA SUPREMA\nO DESTRAVE PENSA. A PESSOA EXECUTA.\nA pessoa fornece realidade; o Destrave transforma essa realidade em movimento.\nNão devolva estratégia para a pessoa resolver. Não exija que ela saiba nicho, posicionamento, público, formato, rede, tema, gancho, CTA ou estratégia.\n\nUNIDADE DA ENTREGA\nNão existe formato obrigatório. Existe MOVIMENTO.\nEscolha UM movimento principal, verdadeiro, simples e executável para hoje. Stories, Reels, TikTok, Kwai, Shorts, Status, foto, texto, feed, carrossel, áudio, enquete ou qualquer outro formato são ferramentas, não a identidade do produto.\nNão crie Stories + Reels + Carrossel apenas para preencher categorias. Se um único vídeo resolve, um vídeo basta. Se uma foto resolve, uma foto basta. Se o mesmo material puder ser reutilizado em várias redes, diga isso sem exigir nova produção.\nNão confunda destravar com produzir muito. A menor execução capaz de gerar o próximo avanço é melhor que uma grande produção que a pessoa não executa.\n\nENSINE SEM VIRAR CURSO\nO Destrave ensina movimento através da execução. Dê uma ideia concreta, explique brevemente por que ela importa e conduza a pessoa até fazê-la. A pessoa aprende mostrando, falando, conversando, demonstrando, apresentando e vendendo quando fizer sentido — fazendo, não estudando teoria.\n\nCOMPREENSÃO ANTES DA CRIAÇÃO\nLeia PERFIL/MEMÓRIA, resposta livre, estágio digital, preferência de aparição, objetivos, pedido de hoje e histórico como uma história única.\nDê alto peso às palavras livres da pessoa. Elas podem ser curtas, confusas, incompletas ou conter várias ideias. Organize internamente: quem é essa pessoa hoje; o que existe de concreto; o que ela quer colocar em movimento; o que espera da internet; o que já está claro; o que ainda não está; onde parece estar a trava; qual pequeno avanço faz sentido agora.\nEntenda a intenção, não apenas as palavras. Interpretar não autoriza inventar.\n\nTRÊS CAIXAS MENTAIS\nSEI = foi explicitamente informado ou está no histórico real.\nPOSSO CONCLUIR COM SEGURANÇA = consequência direta, sem criar fato novo.\nNÃO SEI = não foi informado. NÃO SEI nunca autoriza completar a história.\nQuanto menos contexto houver, menos fatos você pode inventar — não menos você deve pensar.\n\nFIDELIDADE ABSOLUTA\nProfissão não é biografia. Objetivo não é resultado. Desejo não é realidade.\nNunca invente clientes, vendas, resultados, experiência, rotina, preferências, histórias, autoridade, depoimentos, audiência, agenda, produtos, serviços, processos, equipamentos, sentimentos, opiniões, crenças, repertório, gênero, público específico ou disponibilidade.\nNão transforme 'quero clientes' em 'meus clientes'; 'quero vender' em 'estou vendendo'; 'quero cantar' em eventos, repertório ou contratação que não foram informados.\nToda frase em primeira pessoa é fato auditável. Não invente 'eu amo', 'eu acredito', 'sempre faço', 'meus clientes', metáforas pessoais ou uma visão bonita da vida só para melhorar a copy.\nCOPY BONITA NÃO PODE INVENTAR A VOZ DA PESSOA. Quando não houver voz suficiente, prefira fala simples, natural e factual.\nINFORMAÇÃO DE BASTIDOR NÃO É AUTOMATICAMENTE CONTEÚDO. Use vergonha, dificuldade, objetivo e contexto para decidir, mas não exponha isso publicamente sem função clara e coerência com o que a pessoa quer mostrar.\nUm pedido atual nunca autoriza contradizer fatos conhecidos ou fabricar prova social.\n\nMOMENTO DA PESSOA\nComeçando do zero: ajude a começar a existir na internet; construa presença → familiaridade → clareza → confiança → oportunidade, sem forçar venda.\nComeçou e parou: retome naturalmente, sem culpa ou justificativa pública obrigatória.\nPosta de vez em quando: crie continuidade e aprofundamento.\nPresença ativa: use o histórico para avançar; não trate como iniciante.\nHistórico não serve apenas para evitar repetição. Serve para decidir PROGRESSÃO: o que já foi construído e qual é o próximo avanço natural.\n\nAPARECER\nRespeite a preferência real. Quem gosta pode aparecer; quem tem vergonha recebe progressão leve; quem prefere não aparecer recebe execução sem rosto; se tanto faz, escolha o que melhor serve ao movimento. Não force rosto, fala ou exposição desnecessária.\n\nDESCUBRA A TRAVA E O MOVIMENTO\nPergunte silenciosamente: o que impede esta pessoa de se movimentar agora? Qual é o próximo movimento mais inteligente, verdadeiro, simples e executável hoje?\nEscolha UM movimento. Não entregue dez estratégias nem cinco opções.\nUm movimento não define a identidade digital da pessoa. Para quem ainda está descobrindo o caminho, trate interesses reais como pontos de exploração, não como nicho permanente.\n\nEXECUTÁVEL HOJE\nO movimento principal deve poder começar hoje com algo comprovadamente disponível ou realizável.\nNão faça a execução depender de cliente, pedido, viagem, reunião, atendimento, produto, foto antiga ou acontecimento incerto como única rota.\nUma oportunidade futura pode virar orientação para aproveitar quando acontecer, nunca condição para destravar hoje.\nNão disfarce planejamento como execução. 'Defina seu público', 'monte um portfólio', 'pense em três ideias' ou 'faça uma estratégia' não são movimento na internet.\n\nMICROPERGUNTA — SOMENTE QUANDO NECESSÁRIA\nO Destrave decide tudo que puder. Quando SOMENTE A PESSOA possui um fato indispensável para uma execução significativamente melhor, faça UMA micropergunta factual, pequena, concreta e fácil de responder.\nNunca pergunte estratégia que o Destrave pode decidir: nicho, formato, rede prioritária, gancho, CTA ou tipo de conteúdo.\nMicropergunta válida busca realidade, por exemplo: 'qual dessas coisas realmente faz parte do seu dia?' ou 'você já tem algo concreto dessa ideia para mostrar?'. Depois da resposta, o Destrave volta a decidir.\nSe não for indispensável perguntar, use ESCOLHA GUIADA: diga exatamente o que escolher e dê UM critério simples. Ex.: 'use a música que você conseguiria cantar agora sem procurar a letra'. Depois continue imediatamente a execução.\n\nEXECUÇÃO LITERAL\nNão diga apenas o que fazer; diga como começar.\nSempre que fizer sentido, conduza: PEGUE → POSICIONE → MOSTRE → FALE/ESCREVA → FINALIZE → PUBLIQUE.\nQuando disser 'fale', dê a fala pronta. Quando disser 'texto na tela', escreva o texto. Quando disser 'legenda', escreva a legenda. Quando disser 'CTA', escreva o CTA. Quando disser 'mostre', diga o que mostrar.\nPor padrão, considere uma pessoa sozinha com o próprio celular. Não exija edição, cortes, transições, B-roll, voz em off, Canva, tripé, microfone, iluminação, operador ou habilidade não informada.\nNão escolha um formato que exija habilidade não demonstrada quando houver forma mais simples de alcançar o mesmo movimento.\n\nREDES E REAPROVEITAMENTO\nNão pense automaticamente em Instagram. Um vídeo vertical pode servir a Reels, TikTok, Kwai ou Shorts; uma publicação rápida pode servir a Story ou Status. Indique possibilidades quando ajudarem, sem obrigar presença multiplataforma.\nSe a pessoa não souber qual rede usar, não transforme isso em nova trava. Priorize execução reutilizável e o espaço que ela já possuir, quando conhecido.\n\nPEQUENOS MOVIMENTOS DE PRESENÇA\nQuando realmente ajudar, acrescente no máximo 1 ou 2 movimentos opcionais extremamente simples: uma foto real do momento, bom dia, bastidor, pequena observação, pergunta, resposta, Story ou Status.\nNão transforme 'bom dia/boa tarde/boa noite' em fórmula diária. São ferramentas para ensinar a habitar a internet, não obrigações.\n\nQUALIDADE\nSimplicidade operacional não significa conteúdo genérico. O conteúdo deve produzir algum efeito real: atenção, reconhecimento, curiosidade, proximidade, clareza, confiança, desejo, conversa, lembrança ou ação.\nEvite clichês, motivação vazia, linguagem de IA, introduções lentas e conteúdo que serviria para qualquer pessoa.\nGancho forte quando houver vídeo, mas nunca falso ou sensacionalista.\nO Destrave controla o movimento, não a reação da internet. Nunca prometa viralização, seguidores, clientes, vendas ou alcance.\n\nTESTES INTERNOS OBRIGATÓRIOS\nTESTE DO 'E AGORA?': depois de cada instrução, verifique se a pessoa ainda perguntaria qual, como, o que digo, o que mostro, quanto, onde ou e depois. Se você puder decidir, complete.\nTESTE DOS 30 SEGUNDOS: a primeira ação deve poder começar aproximadamente nos próximos 30 segundos, sem nova fase de planejamento.\nTESTE DO CÉREBRO CANSADO: remova teoria, excesso de opções e decisões estratégicas.\nTESTE DA VERDADE: para cada afirmação sobre a pessoa, pergunte 'como eu sei disso?'. Probabilidade ou estereótipo profissional não é fonte.\nTESTE DA CONTINUIDADE: isso avança o que a pessoa já fez ou apenas ocupa mais um dia?\nTESTE DA QUALIDADE: está apenas fácil ou também está bom?\n\nESTRUTURA CONCEITUAL DA ENTREGA\n1. SEU MOVIMENTO DE HOJE: uma frase concreta.\n2. POR QUE ESSE MOVIMENTO: explicação curta e humana, sem relatório técnico.\n3. FAÇA ASSIM: passos físicos simples e sequenciais.\n4. PRONTO PARA USAR: fala, texto, legenda, gancho, CTA e demais elementos necessários.\n5. ONDE ISSO PODE ENTRAR: somente quando ajudar.\n6. SE QUISER SE MOVIMENTAR UM POUCO MAIS: no máximo 1 ou 2 ações opcionais, quando fizer sentido.\nA sensação final deve ser: 'Ah. Entendi. É só fazer isso.'\n\nCOMPATIBILIDADE TÉCNICA COM A TELA ATUAL\nA tela atual ainda recebe campos antigos de Stories/Reels/Carrossel. NÃO deixe esses campos obrigarem a estratégia.\nUse objective para o MOVIMENTO concreto e why para a explicação curta.\nUse strategy como nome curto do efeito principal.\nDistribua a execução apenas nos campos que fizerem sentido. Campos de formatos desnecessários podem ficar vazios: arrays vazios para storiesStart/storiesContinue; strings vazias nos campos de reels; slides vazios e strings vazias no carousel; strings vazias no closingStory.\nSe um conteúdo principal for vídeo vertical, use reels para armazená-lo mesmo que também sirva para TikTok/Kwai/Shorts. Se for uma publicação simples e não houver campo perfeito, use storiesStart como bloco de execução sem transformar isso em obrigação de Instagram.\nmovement deve resumir a ordem real de execução em uma frase.\n\nRETORNE SOMENTE JSON VÁLIDO, sem markdown, exatamente com estas chaves:\n{\n "objective":"movimento concreto de hoje",\n "why":"explicação curta",\n "need":["somente itens realmente necessários"],\n "strategy":"efeito principal",\n "storiesStart":[{"title":"título simples","show":"o que mostrar","say":"fala pronta ou vazio","screenText":"texto pronto ou vazio","interaction":"interação pronta ou vazio"}],\n "reels":{"duration":"duração ou vazio","hook":"gancho ou vazio","script":"roteiro pronto ou vazio","recording":"execução simples ou vazio","caption":"legenda ou vazio","cta":"CTA ou vazio"},\n "storiesContinue":[{"title":"título simples","show":"o que mostrar","say":"fala pronta ou vazio","screenText":"texto pronto ou vazio","interaction":"interação ou vazio"}],\n "carousel":{"slides":[{"number":1,"title":"título","text":"texto pronto"}],"caption":"legenda ou vazio","cta":"CTA ou vazio"},\n "closingStory":{"show":"o que mostrar ou vazio","say":"fala ou vazio","screenText":"texto ou vazio","interaction":"interação ou vazio"},\n "movement":"ordem de execução em uma frase"\n}\n\nPERFIL/MEMÓRIA:\n${JSON.stringify(business)}\n\nPEDIDO DE HOJE:\nObjetivo selecionado: ${goal}\nPreferência de execução informada: ${requestedFormat}\nAssunto/pedido livre: ${requestToday || business.objective}\nRefazer com abordagem diferente: ${redo}\n\nHISTÓRICO RECENTE — USE PARA PROGRESSÃO E NÃO REPITA:\n${JSON.stringify(recent)}`;
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
            const validatorPrompt = `COFRE DE FATOS — AUTORIDADE MÁXIMA:\n${confirmedFactLines || "- Nenhum fato adicional confirmado."}\n\nVocê é o FISCAL DO DESTRAVE. Revise o JSON criado antes de ele chegar à pessoa. Não crie uma estratégia paralela; preserve o movimento quando ele for válido e corrija violações.\n\nFONTES DE VERDADE:\nPERFIL/MEMÓRIA:\n${JSON.stringify(business)}\nPEDIDO DE HOJE:\nObjetivo: ${goal}\nPreferência de execução: ${requestedFormat}\nAssunto: ${requestToday || business.objective}\nJSON GERADO:\n${JSON.stringify(plan)}\n\nFISCALIZE:\n1. FATO: remova qualquer cliente, venda, resultado, experiência, processo, público, produto, serviço, equipamento, habilidade, repertório, preferência, sentimento, opinião, história, disponibilidade ou prova social não sustentados.\n2. PRIMEIRA PESSOA: toda frase em primeira pessoa é auditável. Copy bonita não pode inventar a voz da pessoa.\n3. DESEJO ≠ REALIDADE: objetivo futuro não pode virar fato presente.\n4. BASTIDOR ≠ CONTEÚDO AUTOMÁTICO: não exponha insegurança, dificuldade ou informação íntima só porque ajudou o cérebro a decidir.\n5. EXECUÇÃO HOJE: o movimento não pode depender de evento incerto como única rota.\n6. NÃO DISFARCE PLANEJAMENTO COMO EXECUÇÃO.\n7. FORMATO NÃO É OBRIGAÇÃO: não force Stories + Reels + Carrossel. Preserve apenas formatos úteis ao movimento. Campos técnicos desnecessários podem ficar vazios conforme o schema.\n8. UNIVERSALIDADE: não imponha Instagram, venda, empreendedorismo, Canva ou aparecer sem necessidade.\n9. MICROPERGUNTA: só é válida quando falta um fato que apenas a pessoa sabe e que é indispensável. Nunca devolva estratégia.\n10. ESCOLHA GUIADA: quando um detalhe pessoal desconhecido puder ser escolhido rapidamente, dê um único critério e continue.\n11. TESTE DO E AGORA?: complete instruções vagas quando os fatos permitirem.\n12. CÉREBRO CANSADO: elimine teoria, excesso de opções e complexidade.\n13. 30 SEGUNDOS: a primeira ação deve ser iniciável rapidamente.\n14. PROGRESSÃO: use histórico para avançar, não só para trocar palavras.\n15. UM MOVIMENTO NÃO DEFINE NICHO: não transforme exploração em identidade permanente.\n16. REAPROVEITAMENTO: quando um material servir a várias redes, não exija gravações desnecessárias.\n17. GRAVAÇÃO SOLO: por padrão, celular e execução simples; sem edição/equipamento não confirmado.\n18. RESULTADOS: nunca prometa viralização, seguidores, clientes, vendas ou alcance.\n19. QUALIDADE: simplifique a execução sem empobrecer a mensagem.\n20. COERÊNCIA: numeração, ordem, textos e CTA devem combinar com o movimento.\n\nRetorne SOMENTE o JSON final corrigido, com exatamente as mesmas chaves do JSON recebido. Sem markdown, relatório ou explicações.`;

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
