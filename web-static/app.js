const screens = {
  login:{asset:1}, home:{asset:2}, daily:{asset:3}, contents:{asset:5},
  direction:{asset:4}, saved:{asset:4}, work:{asset:6}, profile:{asset:7}, alpha:{asset:8}
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let current = localStorage.getItem('destrave-session') ? 'home' : 'login';
const isConfigured=()=>Boolean(business.name&&business.offer&&business.audience&&business.digitalStage&&((Array.isArray(business.mainGoal)&&business.mainGoal.length)||business.objective));
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
let business=readJSON('destrave-business',{});
let contents=readJSON('destrave-contents',[]);
let clientId=localStorage.getItem('destrave-client-id');
if(!clientId){clientId=crypto.randomUUID();localStorage.setItem('destrave-client-id',clientId)}

async function syncFromCloud(){
  try{
    const r=await fetch('/api/state',{headers:{'x-destrave-client':clientId}});
    const data=await r.json();
    if(data.ok){
      business=data.business||{};
      contents=Array.isArray(data.contents)?data.contents:[];
      // One-time migration: old test/onboarding data must not masquerade as the new Premium profile.
      const premiumVersion=localStorage.getItem('destrave-premium-profile-version');
      if(!premiumVersion){
        const isLegacy=business && Object.keys(business).length && (!business.offer || !business.audience || !business.digitalStage || !business.mainGoal);
        if(isLegacy){
          business={};
          localStorage.removeItem('destrave-daily');
          localStorage.setItem('destrave-premium-profile-version','2');
          writeJSON('destrave-business',business);
          await fetch('/api/state',{method:'PUT',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({business,contents})});
        }else{
          localStorage.setItem('destrave-premium-profile-version','2');
        }
      }
      writeJSON('destrave-business',business);writeJSON('destrave-contents',contents);
      return true;
    }
  }catch{}
  return false;
}
async function syncToCloud(){
  writeJSON('destrave-business',business);writeJSON('destrave-contents',contents);
  try{
    await fetch('/api/state',{method:'PUT',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({business,contents})});
  }catch{}
}

function showToast(text){
  toast.textContent=text; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200);
}

function showGenerating(){
  const old=document.querySelector('.destrave-generating');if(old)old.remove();
  const overlay=document.createElement('div');overlay.className='destrave-generating';
  overlay.setAttribute('role','status');
  overlay.setAttribute('aria-live','polite');
  overlay.setAttribute('aria-label','Criando seu conteúdo');
  overlay.innerHTML='<div class="generating-card"><div class="generating-mark">✦</div><strong>Criando seu conteúdo...</strong><p>O Destrave está preparando seu próximo movimento.</p><div class="generating-progress"><i></i></div></div>';
  // Inline critical positioning makes the wait state reliable even if an older
  // stylesheet is briefly cached by the installed PWA/mobile browser.
  Object.assign(overlay.style,{position:'fixed',top:'0',right:'0',bottom:'0',left:'0',zIndex:'2147483647',display:'flex',alignItems:'center',justifyContent:'center',visibility:'visible',opacity:'1',pointerEvents:'auto'});
  document.body.appendChild(overlay);
  // Force layout now and yield one paint before the network request begins.
  void overlay.offsetHeight;
  return ()=>{if(overlay.isConnected)overlay.remove()};
}

function button(top,left,width,height,onClick,label=''){
  const b=document.createElement('button'); b.className='hotspot'; b.type='button';
  Object.assign(b.style,{top,left,width,height}); b.setAttribute('aria-label',label);
  b.addEventListener('click',onClick); return b;
}

function navigate(name,fromHistory=false){
  // Premium onboarding is progressive: missing profile fields never block navigation.
  if(!fromHistory && name!==current) history.pushState({destraveScreen:name},'',location.href);
  current=name; window.scrollTo(0,0); render();
}
window.addEventListener('popstate',e=>{
  const target=e.state&&e.state.destraveScreen;
  if(target){navigate(target,true);return}
  if(localStorage.getItem('destrave-session')){navigate('home',true)}
});

function field(label,key,placeholder='Nenhum dado cadastrado'){
  const wrap=document.createElement('label'); wrap.className='form-field';
  wrap.innerHTML=`<span>${label}</span>`;
  const input=document.createElement('input'); input.value=business[key]||''; input.placeholder=placeholder;
  input.addEventListener('input',()=>{business[key]=input.value}); wrap.appendChild(input); return wrap;
}

function primary(text,onClick){const b=document.createElement('button');b.className='primary';b.type='button';b.textContent=text;b.addEventListener('click',onClick);return b}

function addBottomNav(root){
  const nav=document.createElement('nav');nav.className='premium-bottom-nav';nav.setAttribute('aria-label','Navegação principal');
  const items=[['⌂','Início','home'],['▣','Conteúdo','contents'],['◇','Direção','direction'],['♡','Salvos','saved'],['◎','Meu trabalho','work']];
  items.forEach(([icon,label,target])=>{const b=document.createElement('button');b.type='button';b.className=current===target?'active':'';b.innerHTML='<span>'+icon+'</span><small>'+label+'</small>';b.onclick=()=>navigate(target);nav.appendChild(b)});
  root.appendChild(nav);
}
function premiumHeader(root){
  const h=document.createElement('header');h.className='premium-top';
  h.innerHTML='<div class="premium-wordmark"><b>DESTRAVE</b><small>BY ANGLADI</small><i></i></div><button class="premium-profile" aria-label="Abrir perfil">●</button>';
  h.querySelector('.premium-profile').onclick=()=>navigate('profile');root.appendChild(h);
}
function addLogin(root){
  const email=document.createElement('input'); email.className='login-field'; email.type='email'; email.autocomplete='email'; email.placeholder='E-mail';
  Object.assign(email.style,{top:'48.8%',left:'23%',width:'65%',height:'5.8%'});
  const pass=document.createElement('input'); pass.className='login-field'; pass.type='password'; pass.autocomplete='current-password'; pass.placeholder='Senha';
  Object.assign(pass.style,{top:'56.1%',left:'23%',width:'65%',height:'5.8%'});
  root.append(email,pass);
  root.appendChild(button('68.4%','9.5%','81%','5.9%',()=>{localStorage.setItem('destrave-session','1');syncFromCloud().finally(()=>navigate(isConfigured()?'home':'work'))},'Entrar'));
  root.appendChild(button('80.3%','9.5%','81%','5.9%',()=>showToast('Em breve: conheça o Destrave ✨'),'Conhecer o Destrave'));
}

function addHome(root){
  premiumHeader(root);
  const day=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000);
  const messages=[
    'Você não precisa resolver tudo hoje. Precisa colocar uma coisa importante em movimento.',
    'Seu trabalho não precisa aparecer perfeito. Precisa aparecer com clareza.',
    'O próximo movimento certo vale mais do que dez ideias guardadas.',
    'Hoje, faça o que cabe no seu dia sem abandonar o que você quer construir.',
    'Recomeçar também conta. O importante é não deixar seu trabalho desaparecer.',
    'Você não precisa saber o caminho inteiro. Só precisa saber qual é o próximo movimento.',
    'A internet só consegue responder ao que você coloca em movimento.'
  ];
  const first=(business.name||'Imparável').trim().split(/\s+/)[0];
  const daily=readJSON('destrave-daily',{});
  const panel=document.createElement('main');panel.className='premium-page premium-home';
  panel.innerHTML=`
    <section class="home-intro"><p>Olá, <strong>${first}</strong>.</p><h1>Você não precisa saber o caminho inteiro. Só precisa saber qual é o próximo movimento.</h1></section>
    <section class="glass-card daily-message"><small>MENSAGEM DE HOJE</small><p>${messages[day%messages.length]}</p></section>
    <section class="next-movement"><small>SEU PRÓXIMO MOVIMENTO</small><h2>Como está seu dia hoje?</h2><p>Escolha o que cabe no seu dia. Você não precisa fazer tudo.</p>
      <div class="daily-label">TEMPO</div><div class="premium-choice-grid">
        <button data-group="time" data-value="Sem tempo"><b>◷</b><span>Sem tempo<small>Quero algo direto</small></span></button>
        <button data-group="time" data-value="Tenho tempo"><b>✦</b><span>Tenho tempo<small>Posso fazer com calma</small></span></button>
      </div>
      <div class="daily-label">APARECER</div><div class="premium-choice-grid">
        <button data-group="appearance" data-value="Posso aparecer"><b>◎</b><span>Posso aparecer<small>Estou disponível hoje</small></span></button>
        <button data-group="appearance" data-value="Prefiro não aparecer"><b>◇</b><span>Prefiro não aparecer<small>Quero outra forma</small></span></button>
      </div>
      <button class="premium-primary home-generate">VER MEU CONTEÚDO DO DIA →</button>
    </section>`;
  panel.querySelectorAll('[data-group]').forEach(b=>{
    if(daily[b.dataset.group]===b.dataset.value)b.classList.add('selected');
    b.onclick=()=>{
      daily[b.dataset.group]=b.dataset.value;
      writeJSON('destrave-daily',daily);
      panel.querySelectorAll('[data-group="'+b.dataset.group+'"]').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');
    };
  });
  panel.querySelector('.home-generate').onclick=()=>{
    // Re-read the current selections from the buttons immediately before
    // opening the summary. This prevents stale/default values from appearing.
    const latest={};
    panel.querySelectorAll('[data-group].selected').forEach(b=>{latest[b.dataset.group]=b.dataset.value;});
    if(latest.time) daily.time=latest.time;
    if(latest.appearance) daily.appearance=latest.appearance;
    writeJSON('destrave-daily',daily);
    navigate('daily');
  };
  root.appendChild(panel);
}
function normalizeWorkValue(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
function currentWorkContextId(){return normalizeWorkValue(business.workContextId||'')}
function pendingExecution(){
  const contextId=currentWorkContextId();
  return contents.find(x=>x&&x.plan&&!x.plan.needsInput&&!x.executionFeedback&&(!contextId||normalizeWorkValue(x.workContextId)===contextId))
}
async function saveExecutionFeedback(item,value){
  const target=contents.find(x=>String(x.id)===String(item.id))||item;
  target.executionFeedback=value;
  target.executionFeedbackAt=new Date().toISOString();
  // Persist locally first so the gate can never trap the person if cloud sync is slow/fails.
  writeJSON('destrave-contents',contents);
  showToast('Resposta registrada ✦');
  syncToCloud().catch(()=>{});
}
function executionGate(item,onDone){const page=document.createElement('div');page.className='plan-page movement-page';const top=document.createElement('header');top.className='plan-top';top.innerHTML='<button class="plan-back">‹</button><div><h1>Antes de continuar…</h1><p>O Destrave precisa saber o que aconteceu com seu último movimento.</p></div>';top.querySelector('button').onclick=()=>navigate('home');page.append(top);const body=document.createElement('main');body.className='plan-main movement-main';const card=document.createElement('section');card.className='plan-hero';card.innerHTML='<small>SEU ÚLTIMO MOVIMENTO</small><h2></h2><p>Como foi com esse conteúdo?</p>';card.querySelector('h2').textContent=cleanText(item.title||'Seu conteúdo anterior');body.append(card);[['Fiz','Fiz'],['Fiz uma parte','Fiz uma parte'],['Hoje não consegui','Hoje não consegui']].forEach(([label,value])=>{const b=document.createElement('button');b.type='button';b.className='premium-primary execution-feedback-btn';b.textContent=label;b.onclick=()=>{saveExecutionFeedback(item,value);onDone()};body.append(b)});page.append(body);return page}
function addDaily(root){
  const pending=pendingExecution();if(pending){root.appendChild(executionGate(pending,()=>navigate('daily')));return}
  premiumHeader(root);
  const daily=readJSON('destrave-daily',{});
  const panel=document.createElement('main');panel.className='premium-page premium-daily';
  panel.innerHTML=`<section class="page-title"><small>CONTEÚDO DO DIA</small><h1>Seu próximo movimento.</h1><p>Uma direção central. Várias possibilidades de execução.</p></section>
  <section class="glass-card"><h2>Hoje eu vou considerar</h2><div class="context-pill">◷ ${daily.time||'Seu tempo de hoje'}</div><div class="context-pill">◎ ${daily.appearance||'Como prefere aparecer'}</div><p class="soft">O Destrave usa seu trabalho, seu momento digital e seu histórico para decidir o que faz sentido agora.</p></section>
  <button class="premium-primary generate-now">✦ CRIAR MEU CONTEÚDO DO DIA →</button>`;
  panel.querySelector('.generate-now').onclick=async()=>{
    if(!isConfigured()){showToast('Primeiro preciso conhecer melhor seu trabalho.');navigate('work');return}
    const stop=showGenerating();
    try{
      const goal=(Array.isArray(business.mainGoal)?business.mainGoal.join(', '):business.mainGoal)||business.objective||'Escolha por mim';
      const subject=business.offer||business.activity||business.service||'meu trabalho';
      const requestedFormat=[daily.time,daily.appearance].filter(Boolean).join(' + ')||'Escolha por mim';
      const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal,topic:subject,requestedFormat})});
      const data=await r.json();if(!data.ok)throw new Error('generation_failed');
      const generated={id:Date.now(),workContextId:currentWorkContextId(),title:(data.plan&&data.plan.directionTitle)||'Conteúdo do dia',format:data.format||'Conteúdo do dia',requestedFormat,status:'salvo',executionFeedback:null,created:new Date().toLocaleDateString('pt-BR'),text:data.text,plan:data.plan||null,model:data.model||'ai'};
      contents.unshift(generated);await syncToCloud();stop();showResult(generated);
    }catch(e){stop();showToast('Não consegui concluir agora. Tente novamente em alguns instantes. ✦')}
  };
  root.appendChild(panel);
}
function addContents(root){
  premiumHeader(root);
  const panel=document.createElement('main');panel.className='premium-page premium-contents';
  panel.innerHTML='<section class="page-title"><small>EXECUÇÃO</small><h1>Conteúdo.</h1><p>Escolha o que cabe no seu dia. Você não precisa fazer tudo.</p></section><button class="premium-primary create-content">+ CRIAR CONTEÚDO DO DIA →</button><section class="content-list"></section>';
  panel.querySelector('.create-content').onclick=()=>navigate('daily');
  const list=panel.querySelector('.content-list');
  if(!contents.length)list.innerHTML='<div class="glass-card empty-state"><b>Seu primeiro movimento começa aqui.</b><p>Quando o Destrave criar seu conteúdo, ele ficará guardado aqui.</p></div>';
  contents.forEach(item=>{const b=document.createElement('button');b.className='editorial-card';b.innerHTML='<small>'+cleanText(item.format||'CONTEÚDO DO DIA')+'</small><strong>'+cleanText(item.title||'Seu conteúdo')+'</strong><span>'+cleanText(item.created||'')+' →</span>';b.onclick=()=>showResult(item);list.appendChild(b)});
  root.appendChild(panel);
}
function addDirection(root){
  premiumHeader(root);
  const panel=document.createElement('main');panel.className='premium-page premium-direction';
  const stage=business.digitalStage||'Seu momento ainda será definido';
  const goal=Array.isArray(business.mainGoal)?business.mainGoal.join(' · '):(business.mainGoal||business.objective||'Sua prioridade será definida');
  panel.innerHTML=`<section class="page-title"><small>INTELIGÊNCIA DO DESTRAVE</small><h1>Direção.</h1><p>O raciocínio por trás do seu próximo movimento, sem aula e sem complicação.</p></section>
  <section class="direction-stack"><article class="glass-card"><small>SEU MOMENTO</small><h2>${stage}</h2></article><article class="glass-card"><small>SUA PRIORIDADE</small><h2>${goal}</h2></article><article class="glass-card featured"><small>PRÓXIMO MOVIMENTO</small><h2>O Destrave cruza seu trabalho, seu dia e o que você já executou antes de criar a próxima direção.</h2></article></section>`;
  root.appendChild(panel);
}
function addSaved(root){
  premiumHeader(root);
  const saved=contents.filter(x=>String(x.status||'').toLowerCase()==='salvo'||String(x.status||'').toLowerCase()==='saved');
  const panel=document.createElement('main');panel.className='premium-page premium-saved';
  panel.innerHTML='<section class="page-title"><small>SUA BIBLIOTECA</small><h1>Salvos.</h1><p>O que vale guardar continua com contexto.</p></section><section class="content-list"></section>';
  const list=panel.querySelector('.content-list');
  if(!saved.length)list.innerHTML='<div class="glass-card empty-state"><b>Ainda não há nada salvo.</b><p>Quando algo for importante para usar de novo, ele aparece aqui.</p></div>';
  saved.forEach(item=>{const b=document.createElement('button');b.className='editorial-card';b.innerHTML='<small>SALVO</small><strong>'+cleanText(item.title||'Conteúdo')+'</strong><span>'+cleanText(item.created||'')+' →</span>';b.onclick=()=>showResult(item);list.appendChild(b)});
  root.appendChild(panel);
}

function choiceField(label,key,options){
  const wrap=document.createElement('div');wrap.className='choice-field';
  const title=document.createElement('span');title.className='choice-title';title.textContent=label;wrap.appendChild(title);
  const group=document.createElement('div');group.className='choice-group';
  options.forEach(option=>{const b=document.createElement('button');b.type='button';b.className='choice'+(business[key]===option?' selected':'');b.textContent=option;b.setAttribute('aria-pressed',business[key]===option?'true':'false');const select=()=>{business[key]=option;group.querySelectorAll('.choice').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});b.classList.add('selected');b.setAttribute('aria-pressed','true');writeJSON('destrave-business',business)};b.addEventListener('click',select);b.addEventListener('touchend',e=>{e.preventDefault();select()},{passive:false});group.appendChild(b)});
  wrap.appendChild(group);return wrap;
}

function multiChoiceField(label,key,options){
  const wrap=document.createElement('div');wrap.className='choice-field';
  const title=document.createElement('span');title.className='choice-title';title.textContent=label;wrap.appendChild(title);
  const hint=document.createElement('small');hint.className='choice-hint';hint.textContent='Pode marcar mais de uma opção.';wrap.appendChild(hint);
  const group=document.createElement('div');group.className='choice-group';
  const selected=Array.isArray(business[key])?business[key]:business[key]?[business[key]]:[];
  business[key]=selected;
  options.forEach(option=>{const b=document.createElement('button');b.type='button';b.className='choice'+(selected.includes(option)?' selected':'');b.innerHTML='<span class="choice-dot" aria-hidden="true"></span><span class="choice-text"></span>';b.querySelector('.choice-text').textContent=option;b.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();const values=Array.isArray(business[key])?[...business[key]]:[];const pos=values.indexOf(option);if(pos>=0){values.splice(pos,1);b.classList.remove('selected')}else{values.push(option);b.classList.add('selected')}business[key]=values;writeJSON('destrave-business',business)});group.appendChild(b)});
  wrap.appendChild(group);return wrap;
}

function addWork(root){
  premiumHeader(root);
  const first=!isConfigured();
  const panel=document.createElement('main');panel.className='premium-page premium-work';
  panel.innerHTML=`<section class="page-title"><small>O QUE O DESTRAVE SABE SOBRE VOCÊ</small><h1>Meu trabalho.</h1><p>Preencha aos poucos. Quanto melhor eu conheço seu trabalho, mais precisa fica sua direção.</p></section><section class="work-progress glass-card"><b>Seu contexto</b><span></span><i><em></em></i></section><section class="work-fields"></section><button class="premium-primary save-work">SALVAR E VOLTAR AO INÍCIO →</button>`;
  const fields=[
    ['name','Seu nome','Como devo chamar você?','text'],
    ['offer','O que você oferece ou está construindo?','Produto, serviço, trabalho ou projeto.','text'],
    ['audience','Para quem?','Quem você quer alcançar.','text'],
    ['digitalStage','Seu momento no digital','Onde você está agora.','stage'],
    ['mainGoal','O que quer fazer acontecer agora?','Sua prioridade atual.','goal'],
    ['difference','O que diferencia seu trabalho?','O que torna sua oferta particular.','text'],
    ['objections','Dúvidas e objeções','O que costuma fazer seu cliente hesitar.','text'],
    ['voice','Seu jeito de falar','Como o conteúdo deve soar.','voice'],
    ['freeContext','Algo mais que eu preciso saber?','Espaço livre para contexto importante.','text']
  ];
  const options={
    stage:['Ainda não comecei','Estou começando agora','Já publico, mas sem constância','Parei e quero voltar','Já publico e quero melhorar os resultados'],
    goal:['Vender mais','Conseguir clientes','Divulgar meu trabalho','Construir autoridade','Voltar a aparecer','Criar constância','Lançar ou divulgar uma oferta'],
    voice:['Natural e simples','Firme','Emocional','Elegante','Descontraída','Direta']
  };
  const wrap=panel.querySelector('.work-fields');
  fields.forEach(([key,title,hint,type],idx)=>{
    const box=document.createElement('details');box.className='work-field';
    const val=business[key];const summary=Array.isArray(val)?val.join(' · '):(val||hint);
    box.innerHTML='<summary><span class="field-number">'+String(idx+1).padStart(2,'0')+'</span><span><b>'+title+'</b><small>'+summary+'</small></span><i>›</i></summary><div class="field-editor"></div>';
    const editor=box.querySelector('.field-editor');
    if(type==='text'){const area=document.createElement('textarea');area.rows=key==='freeContext'?5:3;area.placeholder=hint;area.value=val||'';area.oninput=()=>{business[key]=area.value;writeJSON('destrave-business',business)};editor.appendChild(area)}
    else{const multi=type!=='stage';const selected=Array.isArray(val)?val:(val?[val]:[]);options[type].forEach(o=>{const b=document.createElement('button');b.type='button';b.className='field-option'+(selected.includes(o)?' selected':'');b.textContent=o;b.onclick=()=>{if(multi){let a=Array.isArray(business[key])?[...business[key]]:[];a.includes(o)?a=a.filter(x=>x!==o):a.push(o);business[key]=a;b.classList.toggle('selected',a.includes(o))}else{business[key]=o;editor.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')}writeJSON('destrave-business',business)};editor.appendChild(b)})}
    wrap.appendChild(box);
  });
  const refresh=()=>{const done=fields.filter(([k])=>{const v=business[k];return Array.isArray(v)?v.length:String(v||'').trim()}).length;panel.querySelector('.work-progress span').textContent=done+' de '+fields.length+' preenchidos';panel.querySelector('.work-progress em').style.width=(done/fields.length*100)+'%'};
  panel.querySelectorAll('textarea,.field-option').forEach(x=>x.addEventListener('input',refresh));panel.querySelectorAll('.field-option').forEach(x=>x.addEventListener('click',refresh));refresh();
  panel.querySelector('.save-work').onclick=async()=>{
    const previousContext=currentWorkContextId();
    const newContext=normalizeWorkValue(business.offer||business.activity||business.service);
    business.activity=business.offer||business.activity;
    business.service=business.offer||business.service;
    business.objective=Array.isArray(business.mainGoal)?business.mainGoal.join(', '):(business.mainGoal||business.objective);
    if(newContext && newContext!==previousContext){
      business.workContextId=newContext;
      // Conteúdos antigos continuam guardados, mas pertencem ao contexto anterior.
      // Eles não podem bloquear nem orientar a nova atividade.
    }else if(newContext && !business.workContextId){
      business.workContextId=newContext;
    }
    await syncToCloud();showToast(first?'Agora eu conheço melhor você ✦':(newContext!==previousContext?'Novo trabalho reconhecido. Começamos um histórico novo ✦':'Informações atualizadas ✦'));navigate('home')
  };
  root.appendChild(panel);
}
function cleanText(v){return String(v||'').replace(/\\*\\*/g,'').replace(/^#+\\s*/gm,'').trim()}
function copyBtn(label,text){const b=document.createElement('button');b.className='plan-copy';b.textContent='▣ '+label;b.onclick=async(e)=>{e.stopPropagation();try{await navigator.clipboard.writeText(text);showToast('Copiado!')}catch{showToast('Selecione o texto para copiar')}};return b}
function storyCard(story){const d=document.createElement('div');d.className='story-card';d.innerHTML=`<b>${cleanText(story.title)}</b>${story.show?`<p>📷 <strong>O que mostrar:</strong><br>${cleanText(story.show)}</p>`:''}${story.say?`<p>💬 <strong>O que falar:</strong><br>${cleanText(story.say)}</p>`:''}${story.screenText?`<p>Ｔ <strong>Texto na tela:</strong><br>${cleanText(story.screenText)}</p>`:''}${story.interaction?`<p>↗ <strong>Interação:</strong><br>${cleanText(story.interaction)}</p>`:''}`;return d}
function accordion(num,icon,title,badge,content,open=false){const box=document.createElement('section');box.className='plan-accordion'+(open?' open':'');const head=document.createElement('button');head.className='plan-accordion-head';head.innerHTML=`<span class="plan-num">${num}</span><span class="plan-aicon">${icon}</span><span class="plan-atitle">${title}</span><small>${badge||''}</small><span class="chev">⌄</span>`;const inside=document.createElement('div');inside.className='plan-accordion-body';inside.append(content);head.onclick=()=>box.classList.toggle('open');box.append(head,inside);return box}
function parsePlan(item){if(item.plan)return item.plan;try{return JSON.parse(item.text)}catch{return null}}
function showResult(item){
  const p=parsePlan(item);if(!p){showLegacyResult(item);return}
  // Compatibilidade: conteúdos antigos continuam abrindo no layout anterior.
  if(!p.directionTitle && p.movementTitle){showMovementResult(item,p);return}
  const page=document.createElement('div');page.className='plan-page movement-page';
  const top=document.createElement('header');top.className='plan-top';
  top.innerHTML='<button class="plan-back">‹</button><div><h1>Seu conteúdo de hoje está pronto.</h1><p>Você tem todas as possibilidades. Escolha o que cabe no seu dia.</p></div>';
  top.querySelector('button').onclick=()=>render();page.append(top);

  if(p.needsInput){
    const ask=document.createElement('section');ask.className='plan-hero movement-question';
    ask.innerHTML='<small>SÓ PRECISO DE UMA COISA</small><h2></h2><p>Responda isso e o Destrave termina seu conteúdo por você.</p>';
    ask.querySelector('h2').textContent=cleanText(p.question||'Conte esse detalhe para continuar.');
    page.append(ask);
    const actions=document.createElement('div');actions.className='plan-actions';
    actions.append(primary('↻ VOLTAR E RESPONDER',()=>navigate('daily')));page.append(actions);
    app.replaceChildren(page);window.scrollTo(0,0);return;
  }

  const hero=document.createElement('section');hero.className='plan-hero';
  hero.innerHTML='<small>SEU CONTEÚDO DO DIA ✦</small><h2></h2><p></p><div class="plan-choice-note">Você não precisa fazer tudo. Escolha a opção que fizer sentido para o seu dia.</div><button type="button">VER MINHAS OPÇÕES ↓</button>';
  hero.querySelector('h2').textContent=cleanText(p.directionTitle||'Sua direção de hoje');
  hero.querySelector('p').textContent=cleanText(p.why||'');
  page.append(hero);

  const body=document.createElement('main');body.className='plan-main movement-main';
  body.innerHTML='<h2>Escolha como você quer se movimentar hoje</h2><p class="plan-intro">Reels, Stories, Feed ou WhatsApp: cada opção funciona sozinha e já está pronta para você executar.</p>';

  const reels=document.createElement('div');reels.className='plan-format-content';
  if(p.reels){
    const add=(label,value)=>{if(!value)return;const d=document.createElement('div');d.className='plan-detail';d.innerHTML='<strong></strong><p></p>';d.querySelector('strong').textContent=label;d.querySelector('p').textContent=cleanText(value);reels.append(d)};
    add('Ideia',p.reels.title);add('Gancho',p.reels.hook);
    if((p.reels.steps||[]).length){const d=document.createElement('div');d.className='plan-detail';d.innerHTML='<strong>Faça assim</strong>';(p.reels.steps||[]).forEach((x,i)=>{const q=document.createElement('p');q.textContent=(i+1)+'. '+cleanText(x);d.append(q)});reels.append(d)}
    add('Fala pronta',p.reels.script);add('Texto na tela',p.reels.screenText);add('Legenda',p.reels.caption);add('CTA',p.reels.cta);
    if(p.reels.caption) reels.append(copyBtn('COPIAR LEGENDA',p.reels.caption));
  }
  body.append(accordion('1','▶','Reels','PRONTO PARA GRAVAR',reels,true));

  const stories=document.createElement('div');stories.className='plan-format-content';
  (p.stories||[]).forEach(x=>stories.append(storyCard(x)));
  body.append(accordion('2','▯','Stories','SEQUÊNCIA PRONTA',stories));

  const feed=document.createElement('div');feed.className='plan-format-content';
  if(p.feed){
    const info=document.createElement('div');info.className='plan-detail';info.innerHTML='<strong></strong><p></p>';info.querySelector('strong').textContent=cleanText(p.feed.format||'Feed');info.querySelector('p').textContent=cleanText(p.feed.instructions||'');feed.append(info);
    if((p.feed.slides||[]).length){const slides=document.createElement('div');slides.className='plan-detail';slides.innerHTML='<strong>Conteúdo</strong>';p.feed.slides.forEach((x,i)=>{const q=document.createElement('p');q.textContent='Slide '+(i+1)+': '+cleanText(x);slides.append(q)});feed.append(slides)}
    if(p.feed.caption){const d=document.createElement('div');d.className='plan-detail';d.innerHTML='<strong>Legenda</strong><p></p>';d.querySelector('p').textContent=cleanText(p.feed.caption);feed.append(d);feed.append(copyBtn('COPIAR LEGENDA',p.feed.caption))}
    if(p.feed.cta){const d=document.createElement('div');d.className='plan-detail';d.innerHTML='<strong>CTA</strong><p></p>';d.querySelector('p').textContent=cleanText(p.feed.cta);feed.append(d)}
  }
  body.append(accordion('3','▣','Feed','PRONTO PARA POSTAR',feed));

  const wa=document.createElement('div');wa.className='plan-format-content';
  if(p.whatsapp){
    const d=document.createElement('div');d.className='plan-detail';d.innerHTML='<strong></strong><p></p>';d.querySelector('strong').textContent=cleanText(p.whatsapp.format||'WhatsApp');d.querySelector('p').textContent=cleanText(p.whatsapp.instructions||'');wa.append(d);
    if(p.whatsapp.text){const t=document.createElement('div');t.className='plan-detail';t.innerHTML='<strong>Texto pronto</strong><p></p>';t.querySelector('p').textContent=cleanText(p.whatsapp.text);wa.append(t);wa.append(copyBtn('COPIAR TEXTO',p.whatsapp.text))}
  }
  body.append(accordion('4','◉','Status / WhatsApp','PRONTO PARA USAR',wa));

  if(p.quickVersion){const quick=document.createElement('section');quick.className='plan-check movement-extra';quick.innerHTML='<h3>✦ Se hoje estiver corrido</h3><p></p>';quick.querySelector('p').textContent=cleanText(p.quickVersion);body.append(quick)}
  if(p.motivation){const motivation=document.createElement('section');motivation.className='plan-check movement-ready';motivation.innerHTML='<h3>✦ Antes de ir</h3><p></p>';motivation.querySelector('p').textContent=cleanText(p.motivation);body.append(motivation)}

  const feedback=document.createElement('section');feedback.className='plan-check movement-ready';feedback.innerHTML='<h3>✦ Registrar como foi hoje</h3><p>Marque quando souber como foi. Isso ajuda o Destrave a decidir seu próximo movimento.</p><div class="execution-feedback"></div>';const feedbackBox=feedback.querySelector('.execution-feedback');[['Fiz','Fiz'],['Fiz uma parte','Fiz uma parte'],['Hoje não consegui','Hoje não consegui']].forEach(([label,value])=>{const b=document.createElement('button');b.type='button';b.className='plan-copy'+(item.executionFeedback===value?' selected':'');b.textContent=label;b.onclick=async()=>{await saveExecutionFeedback(item,value);feedbackBox.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')};feedbackBox.append(b)});body.append(feedback);
  const actions=document.createElement('div');actions.className='plan-actions';
  actions.append(primary('✦ SALVAR MEU CONTEÚDO',async()=>{await syncToCloud();showToast('Conteúdo salvo ✦')}),primary('↻ CRIAR OUTRA VERSÃO',()=>regenerate(item)));
  body.append(actions);page.append(body);app.replaceChildren(page);window.scrollTo(0,0);
  hero.querySelector('button').onclick=()=>body.scrollIntoView({behavior:'smooth',block:'start'});
}
function showMovementResult(item,p){
  const page=document.createElement('div');page.className='plan-page movement-page';
  const top=document.createElement('header');top.className='plan-top';top.innerHTML='<button class="plan-back">‹</button><div><h1>Seu movimento de hoje está pronto.</h1><p>É só seguir. O Destrave já pensou por você.</p></div>';top.querySelector('button').onclick=()=>render();page.append(top);
  const hero=document.createElement('section');hero.className='plan-hero';hero.innerHTML='<small>SEU MOVIMENTO DE HOJE ✦</small><h2></h2><p></p>';hero.querySelector('h2').textContent=cleanText(p.movementTitle||'Seu próximo movimento');hero.querySelector('p').textContent=cleanText(p.why||'');page.append(hero);
  const body=document.createElement('main');body.className='plan-main movement-main';body.innerHTML='<h2>Faça assim</h2>';
  (p.steps||[]).forEach((x,i)=>{const d=document.createElement('div');d.className='plan-detail movement-step';d.innerHTML='<b class="movement-step-num"></b><h3></h3><p></p>';d.querySelector('b').textContent=String(i+1);d.querySelector('h3').textContent=cleanText(x.title||'Passo '+(i+1));d.querySelector('p').textContent=cleanText(x.instruction||'');body.append(d)});
  (p.readyToUse||[]).forEach(x=>{const d=document.createElement('div');d.className='plan-detail';d.innerHTML='<strong></strong><p></p>';d.querySelector('strong').textContent=cleanText(x.label||'Texto');d.querySelector('p').textContent=cleanText(x.text||'');body.append(d)});
  page.append(body);app.replaceChildren(page);window.scrollTo(0,0);
}
function showLegacyResult(item){const page=document.createElement('div');page.className='result-page';page.innerHTML='<div class="result-header"><button class="result-back">‹</button><div><strong>Conteúdo anterior</strong><span>Gerado antes do novo formato.</span></div></div><div class="result-body"><div class="result-full-text"></div></div>';page.querySelector('.result-full-text').textContent=cleanText(item.text);page.querySelector('.result-back').onclick=()=>render();app.replaceChildren(page)}
async function regenerate(item){const stopGenerating=showGenerating();try{const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal:(item.title||'').split(':')[0]||'Movimentar',topic:(item.title||'').split(':').slice(1).join(':').trim()||business.objective,requestedFormat:item.requestedFormat||'Livre',redo:true})});const data=await r.json();if(!data.ok)throw new Error('generation_failed');const fresh={...item,id:Date.now(),workContextId:currentWorkContextId(),executionFeedback:null,executionFeedbackAt:null,created:new Date().toLocaleDateString('pt-BR'),text:data.text,plan:data.plan||null,model:data.model||'ai'};contents.unshift(fresh);await syncToCloud();stopGenerating();showResult(fresh)}catch(e){stopGenerating();showToast('Não consegui criar outra versão agora. Tente novamente em alguns instantes. ✦')}}

function addProfile(root){
  premiumHeader(root);
  const panel=document.createElement('main');panel.className='premium-page premium-profile-page';
  const name=business.name||'Imparável';
  panel.innerHTML=`<section class="page-title"><small>SUA EXPERIÊNCIA</small><h1>Perfil.</h1><p>Conta, preferências, ajuda e segurança.</p></section><section class="profile-card glass-card"><div class="profile-avatar">${(name[0]||'D').toUpperCase()}</div><div><h2>${name}</h2><p>Acesso Destrave</p></div></section><section class="settings-list"><button onclick="void(0)" class="setting-premium edit-work">◎ <span><b>Meu trabalho</b><small>Atualizar o que o Destrave sabe sobre você</small></span>›</button><button class="setting-premium support">? <span><b>Ajuda e suporte</b><small>Falar com o suporte</small></span>›</button><button class="setting-premium alpha-link">✦ <span><b>Alpha</b><small>Comunidade dos Imparáveis · Em breve</small></span>›</button></section><button class="logout-premium">SAIR DA MINHA CONTA</button>`;
  panel.querySelector('.edit-work').onclick=()=>navigate('work');panel.querySelector('.alpha-link').onclick=()=>navigate('alpha');panel.querySelector('.support').onclick=()=>window.location.href='https://wa.me/5573982083851?text='+encodeURIComponent('Olá! Preciso de ajuda com o Destrave.');panel.querySelector('.logout-premium').onclick=()=>{localStorage.removeItem('destrave-session');navigate('login')};root.appendChild(panel);
}
function addAlpha(root){
  premiumHeader(root);
  const panel=document.createElement('main');
  panel.className='premium-page premium-alpha';
  panel.innerHTML='<section class="page-title"><small>EM BREVE</small><h1>Alpha.</h1><p>A comunidade dos Imparáveis.</p></section><section class="glass-card alpha-card"><b>Este espaço está sendo preparado.</b><p>A Alpha está chegando para ser um ponto de encontro de pessoas que decidiram continuar em movimento.</p><i></i><p>Em breve, você verá tudo o que estamos preparando aqui dentro.</p></section><section class="alpha-signature"><b>ALPHA <span>•</span> BY ANGLADI</b><i></i><p>Um novo espaço para quem decidiu continuar em movimento.</p></section>';
  root.appendChild(panel);
}

function render(){
  const data=screens[current]||screens.home;
  const root=document.createElement('section');root.className='screen'+(current==='login'?'':' premium-screen premium-bg-'+current);
  if(current==='login'){
    const image=document.createElement('img');image.className='screen-image';image.alt='Login Destrave';image.src='/assets/reference/asset_1.jpg';root.appendChild(image);addLogin(root);
  }else{
    if(current==='home')addHome(root);
    if(current==='daily')addDaily(root);
    if(current==='contents')addContents(root);
    if(current==='direction')addDirection(root);
    if(current==='saved')addSaved(root);
    if(current==='work')addWork(root);
    if(current==='profile')addProfile(root);
    if(current==='alpha')addAlpha(root);
    addBottomNav(root);
  }
  app.replaceChildren(root);window.scrollTo(0,0);
}

history.replaceState({destraveScreen:current},'',location.href);
render();
if(localStorage.getItem('destrave-session')) syncFromCloud().then(ok=>{if(ok){current=isConfigured()?'home':'work';render()}});
