const screens = {
  login: { asset: 1 }, home: { asset: 2 }, daily: { asset: 3 },
  contents: { asset: 5 }, work: { asset: 6 }, profile: { asset: 7 }, alpha: { asset: 8 }
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let current = localStorage.getItem('destrave-session') ? 'home' : 'login';
const isConfigured=()=>Boolean(business.name&&business.activity&&business.objective);
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

function button(top,left,width,height,onClick,label=''){
  const b=document.createElement('button'); b.className='hotspot'; b.type='button';
  Object.assign(b.style,{top,left,width,height}); b.setAttribute('aria-label',label);
  b.addEventListener('click',onClick); return b;
}

function navigate(name){ if(name!=='work'&&name!=='login'&&localStorage.getItem('destrave-session')&&!isConfigured()) name='work'; current=name; window.scrollTo(0,0); render(); }

function field(label,key,placeholder='Nenhum dado cadastrado'){
  const wrap=document.createElement('label'); wrap.className='form-field';
  wrap.innerHTML=`<span>${label}</span>`;
  const input=document.createElement('input'); input.value=business[key]||''; input.placeholder=placeholder;
  input.addEventListener('input',()=>{business[key]=input.value}); wrap.appendChild(input); return wrap;
}

function primary(text,onClick){const b=document.createElement('button');b.className='primary';b.type='button';b.textContent=text;b.addEventListener('click',onClick);return b}

function addSidebar(root){
  // Exact clickable bands over the five items painted in the brown sidebar.
  const items=[
    ['13.0%','7.5%','home','Início'],
    ['22.3%','7.8%','contents','Conteúdo'],
    ['32.0%','8.2%','work','Meu trabalho'],
    ['41.4%','7.8%','profile','Perfil'],
    ['49.8%','8.0%','alpha','Alpha']
  ];
  items.forEach(([top,height,target,label])=>{
    const b=button(top,'0%','14.2%',height,()=>navigate(target),label);
    b.classList.add('sidebar-hit');root.appendChild(b);
  });
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
  const dailyMessages=[
    'Hoje você não precisa fazer tudo. Precisa fazer o próximo movimento.',
    'Seu trabalho merece ser visto. Hoje, mostre um pouco dele.',
    'Não espere a ideia perfeita. Execute a próxima ideia certa.',
    'Um conteúdo publicado vale mais do que dez ideias guardadas.',
    'A presença que você quer construir começa no movimento de hoje.',
    'Você não precisa estar pronta para tudo. Só para o próximo passo.',
    'Hoje, faça sua presença digital sair da intenção e virar ação.',
    'O seu ritmo pode ser leve. O importante é continuar em movimento.',
    'Quem precisa do que você faz só pode escolher você se conseguir te encontrar.',
    'Não complique o conteúdo de hoje. Clareza, verdade e movimento.',
    'Seu próximo conteúdo não precisa impressionar. Precisa comunicar.',
    'A constância começa quando você para de esperar o dia perfeito.',
    'Mostre o que você faz de um jeito que as pessoas consigam entender.',
    'Hoje é um bom dia para deixar seu trabalho falar por você.'
  ];
  const now=new Date();
  const dayKey=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/86400000);
  const message=dailyMessages[((dayKey%dailyMessages.length)+dailyMessages.length)%dailyMessages.length];
  const dailyMessage=document.createElement('div');
  dailyMessage.className='home-daily-message';
  dailyMessage.innerHTML='<small>✦ MENSAGEM DE HOJE</small><strong></strong>';
  dailyMessage.querySelector('strong').textContent=message;
  root.appendChild(dailyMessage);
  root.appendChild(button('1.6%','84%','12%','4.4%',()=>navigate('profile'),'Perfil'));
  root.appendChild(button('34%','19%','78.5%','4%',()=>navigate('daily'),'Criar meu conteúdo do dia'));
  root.appendChild(button('43.2%','17%','39%','7.5%',()=>showToast('Conteúdo feito para você ✨'),'Feito para você'));
  root.appendChild(button('43.2%','58%','39%','7.5%',()=>showToast('Execução completa e pronta para publicar'),'Execução completa'));
  root.appendChild(button('54%','74%','23%','3.5%',()=>navigate('contents'),'Ver todos'));
  root.appendChild(button('57.8%','17%','79%','8%',()=>navigate('daily'),'Conteúdo recente'));
  root.appendChild(button('68%','17%','80%','12%',()=>showToast('Você só precisa executar o próximo movimento.'),'Impulso do dia'));
  root.appendChild(button('82.5%','17%','80%','9%',()=>navigate('alpha'),'Comunidade Alpha'));
}
function addDaily(root){
  // From section 1 down this is real HTML. The approved header/hero image above stays untouched.
  const state={goal:'',topic:'',ways:[]};
  const panel=document.createElement('section');panel.className='daily-real-panel';
  panel.innerHTML=`
    <div class="daily-box">
      <h2>1. O que você quer conseguir hoje?</h2><p>Escolha 1 objetivo.</p>
      <div class="daily-goals"></div>
    </div>
    <div class="daily-box">
      <h2>2. O que você quer divulgar hoje?</h2>
      <div class="daily-topic-wrap"><input class="daily-real-topic" placeholder="Ex.: serviço, produto, música, evento ou mensagem"></div>
      <label class="daily-auto"><input type="checkbox"> Não sei. Escolha por mim.</label>
    </div>
    <div class="daily-box">
      <h2>3. Como você quer fazer hoje?</h2><p>Escolha até 2 opções.</p>
      <div class="daily-ways"></div>
    </div>
    <p class="daily-ready">Uma vez só. Tudo pronto.</p>
  `;
  const goals=['Vender','Alcançar pessoas','Passar confiança','Ensinar','Criar conexão','Escolha por mim'];
  const goalsWrap=panel.querySelector('.daily-goals');
  goals.forEach(v=>{const b=document.createElement('button');b.type='button';b.className='daily-real-choice';b.textContent=v;b.onclick=()=>{state.goal=v;goalsWrap.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')};goalsWrap.appendChild(b)});
  const topic=panel.querySelector('.daily-real-topic');topic.oninput=()=>state.topic=topic.value;
  panel.querySelector('.daily-auto input').onchange=e=>{if(e.target.checked){state.topic='';topic.value='';topic.disabled=true}else topic.disabled=false};
  const ways=['Posso aparecer e falar','Posso mostrar sem falar','Não quero aparecer','Tenho pouco tempo'];
  const waysWrap=panel.querySelector('.daily-ways');
  ways.forEach(v=>{const b=document.createElement('button');b.type='button';b.className='daily-real-choice wide';b.textContent=v;b.onclick=()=>{const i=state.ways.indexOf(v);if(i>=0){state.ways.splice(i,1);b.classList.remove('selected')}else{if(state.ways.length>=2){const old=state.ways.shift();[...waysWrap.children].find(x=>x.textContent===old)?.classList.remove('selected')}state.ways.push(v);b.classList.add('selected')}};waysWrap.appendChild(b)});
  const generate=async()=>{
    if(!isConfigured()){showToast('Primeiro preciso conhecer você.');navigate('work');return}
    const subject=state.topic.trim()||business.objective||business.activity||business.service||'meu trabalho';
    const goal=state.goal||'Escolha por mim';
    const requestedFormat=state.ways.length?state.ways.join(' + '):'Escolha por mim';
    showToast('✦ Destravando seu dia...');
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal,topic:subject,requestedFormat})});
      const data=await r.json();if(!data.ok)throw new Error(data.error+(data.details?' — '+data.details:''));
      const generated={id:Date.now(),title:`${goal}: ${subject}`,format:data.format||'Stories + Reels + Carrossel',requestedFormat,status:'salvo',created:new Date().toLocaleDateString('pt-BR'),text:data.text,plan:data.plan||null,model:data.model||'gemini'};
      contents.unshift(generated);await syncToCloud();showResult(generated);
    }catch(e){showToast(e.message||'Não foi possível gerar agora.')}
  };
  const go=primary('✦ CRIAR MEU CONTEÚDO DO DIA  ›',generate);go.classList.add('daily-generate');
  panel.appendChild(go);root.appendChild(panel);
}
function addContents(root){
  root.appendChild(button('8.4%','17%','80%','5%',()=>navigate('daily'),'Criar conteúdo do dia'));
  const panel=document.createElement('div');panel.className='data-panel contents-panel';panel.innerHTML='<h2>Seus conteúdos</h2>';
  if(!contents.length){panel.innerHTML+='<div class="empty"><strong>Nenhum conteúdo criado ainda.</strong><span>Crie seu primeiro conteúdo para ele aparecer aqui.</span></div>';panel.appendChild(primary('+ CRIAR PRIMEIRO CONTEÚDO',()=>navigate('daily')))}
  else contents.forEach(item=>{const card=document.createElement('button');card.className='content-card';card.innerHTML=`<strong>${item.title}</strong><span>${item.format} • ${item.created}</span><small>Pronto para usar</small>`;card.onclick=()=>showResult(item);panel.appendChild(card)});
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
  const first=!isConfigured();
  const panel=document.createElement('div');panel.className='data-panel work-panel';
  panel.innerHTML=first?'<h2>Primeiro, quero conhecer você ✦</h2><p>É rapidinho. Assim o Destrave entende o que faz sentido para você.</p>':'<h2>Meu trabalho</h2><p>Se alguma coisa mudar, atualize aqui.</p>';
  panel.append(
    field('Como você se chama?','name','Seu nome'),
    field('O que você faz?','activity','Ex.: vendo roupas, sou cantora, faço unhas...'),
    field('O que você quer mostrar ou divulgar na internet?','objective','Conte com suas palavras'),
    field('Pra quem você quer falar?','audience','Ex.: mães, mulheres, pessoas da minha cidade...'),
    choiceField('Como está sua vida na internet hoje?','digitalStage',['Tô começando do zero','Já postei, mas parei','Posto de vez em quando','Já posto bastante']),
    choiceField('Você gosta de aparecer nos vídeos?','appearance',['Sim','Ainda tenho vergonha','Prefiro não aparecer','Tanto faz']),
    multiChoiceField('O que você quer conseguir na internet?','mainGoal',['Vender mais','Conseguir clientes','Ficar mais conhecida','Mostrar meu trabalho','Criar conexão','Crescer na internet','Outro'])
  );
  panel.appendChild(primary(first?'SALVAR E DESTRAVAR ✦':'SALVAR MINHAS INFORMAÇÕES',async()=>{
    if(!business.name||!business.activity||!business.objective){showToast('Só falta dizer seu nome, o que você faz e o que quer divulgar.');return}
    business.service=business.activity; business.business=business.business||business.activity;
    await syncToCloud();showToast(first?'Agora eu conheço você. Vamos destravar ✦':'Informações atualizadas ✨');navigate('home');
  }));root.appendChild(panel);
}

function cleanText(v){return String(v||'').replace(/\\*\\*/g,'').replace(/^#+\\s*/gm,'').trim()}
function copyBtn(label,text){const b=document.createElement('button');b.className='plan-copy';b.textContent='▣ '+label;b.onclick=async(e)=>{e.stopPropagation();try{await navigator.clipboard.writeText(text);showToast('Copiado!')}catch{showToast('Selecione o texto para copiar')}};return b}
function storyCard(story){const d=document.createElement('div');d.className='story-card';d.innerHTML=`<b>${cleanText(story.title)}</b>${story.show?`<p>📷 <strong>O que mostrar:</strong><br>${cleanText(story.show)}</p>`:''}${story.say?`<p>💬 <strong>O que falar:</strong><br>${cleanText(story.say)}</p>`:''}${story.screenText?`<p>Ｔ <strong>Texto na tela:</strong><br>${cleanText(story.screenText)}</p>`:''}${story.interaction?`<p>↗ <strong>Interação:</strong><br>${cleanText(story.interaction)}</p>`:''}`;return d}
function accordion(num,icon,title,badge,content,open=false){const box=document.createElement('section');box.className='plan-accordion'+(open?' open':'');const head=document.createElement('button');head.className='plan-accordion-head';head.innerHTML=`<span class="plan-num">${num}</span><span class="plan-aicon">${icon}</span><span class="plan-atitle">${title}</span><small>${badge||''}</small><span class="chev">⌄</span>`;const inside=document.createElement('div');inside.className='plan-accordion-body';inside.append(content);head.onclick=()=>box.classList.toggle('open');box.append(head,inside);return box}
function parsePlan(item){if(item.plan)return item.plan;try{return JSON.parse(item.text)}catch{return null}}
function showResult(item){
  const p=parsePlan(item);if(!p){showLegacyResult(item);return}
  const page=document.createElement('div');page.className='plan-page';
  const top=document.createElement('header');top.className='plan-top';top.innerHTML='<button class="plan-back">‹</button><div><h1>Seu conteúdo do dia está pronto.</h1><p>Siga os passos. Está tudo preparado.</p></div>';top.querySelector('button').onclick=()=>render();page.append(top);
  const hero=document.createElement('section');hero.className='plan-hero';hero.innerHTML=`<small>OBJETIVO DE HOJE</small><h2>${cleanText(p.objective)}</h2><p>${cleanText(p.why)}</p><div class="plan-need">▣ Você só vai precisar: ${(p.need||[]).map(cleanText).join(', ')}</div><button>▶ COMEÇAR PELO PASSO 1</button>`;page.append(hero);
  const body=document.createElement('main');body.className='plan-main';body.innerHTML='<h2>Faça nesta ordem</h2>';
  const s1=document.createElement('div');s1.className='story-grid';(p.storiesStart||[]).forEach(x=>s1.append(storyCard(x)));s1.append(copyBtn('COPIAR STORIES',(p.storiesStart||[]).map(x=>JSON.stringify(x)).join('\n')));
  body.append(accordion(1,'▣','Stories para começar',(p.storiesStart||[]).length+' Stories',s1,true));
  const r=document.createElement('div');r.className='plan-detail';r.innerHTML=`<p><strong>⚡ Gancho:</strong><br>${cleanText(p.reels?.hook)}</p><p><strong>🎥 Como gravar:</strong><br>${cleanText(p.reels?.recording)}</p><p><strong>📝 Roteiro completo:</strong><br>${cleanText(p.reels?.script)}</p><p><strong>Legenda:</strong><br>${cleanText(p.reels?.caption)}</p><p><strong>CTA:</strong><br>${cleanText(p.reels?.cta)}</p>`;r.append(copyBtn('COPIAR REELS',[p.reels?.hook,p.reels?.script,p.reels?.caption,p.reels?.cta].join('\n\n')));body.append(accordion(2,'🎬','Reels principal',cleanText(p.reels?.duration),r));
  const sc=document.createElement('div');sc.className='story-grid';(p.storiesContinue||[]).forEach(x=>sc.append(storyCard(x)));sc.append(copyBtn('COPIAR STORIES',(p.storiesContinue||[]).map(x=>JSON.stringify(x)).join('\n')));body.append(accordion(3,'▣','Stories para continuar',(p.storiesContinue||[]).length+' Stories',sc));
  const car=document.createElement('div');car.className='plan-detail';(p.carousel?.slides||[]).forEach(x=>{const d=document.createElement('div');d.className='slide-card';d.innerHTML=`<b>SLIDE ${x.number}</b><h3>${cleanText(x.title)}</h3><p>${cleanText(x.text)}</p>`;car.append(d)});car.insertAdjacentHTML('beforeend',`<p><strong>Legenda:</strong><br>${cleanText(p.carousel?.caption)}</p><p><strong>CTA:</strong><br>${cleanText(p.carousel?.cta)}</p>`);car.append(copyBtn('COPIAR CARROSSEL',JSON.stringify(p.carousel)));body.append(accordion(4,'▦','Carrossel',(p.carousel?.slides||[]).length+' slides',car));
  const close=document.createElement('div');close.className='story-grid';close.append(storyCard({title:'Fechamento',...(p.closingStory||{})}));body.append(accordion(5,'➤','Story de fechamento','CTA final',close));
  const check=document.createElement('section');check.className='plan-check';check.innerHTML='<h3>☑ Antes de terminar</h3><label><input type="checkbox"> Stories publicados</label><label><input type="checkbox"> Reels publicado</label><label><input type="checkbox"> Carrossel publicado ou salvo</label><label><input type="checkbox"> Respondi quem chamou</label>';body.append(check);
  const why=document.createElement('details');why.className='plan-why';why.innerHTML=`<summary>💡 Por que foi criado assim?</summary><p><strong>${cleanText(p.strategy)}</strong><br>${cleanText(p.why)}</p><p>${cleanText(p.movement)}</p>`;body.append(why);
  const actions=document.createElement('div');actions.className='plan-actions';const save=primary('✦ SALVAR MEU CONTEÚDO',async()=>{await syncToCloud();showToast('Conteúdo salvo ✦')});const redo=primary('↻ CRIAR OUTRA VERSÃO',()=>regenerate(item));actions.append(save,redo);body.append(actions);page.append(body);app.replaceChildren(page);window.scrollTo(0,0);
}
function showLegacyResult(item){const page=document.createElement('div');page.className='result-page';page.innerHTML='<div class="result-header"><button class="result-back">‹</button><div><strong>Conteúdo anterior</strong><span>Gerado antes do novo formato.</span></div></div><div class="result-body"><div class="result-full-text"></div></div>';page.querySelector('.result-full-text').textContent=cleanText(item.text);page.querySelector('.result-back').onclick=()=>render();app.replaceChildren(page)}
async function regenerate(item){showToast('✦ Criando outra versão...');try{const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal:(item.title||'').split(':')[0]||'Movimentar',topic:(item.title||'').split(':').slice(1).join(':').trim()||business.objective,requestedFormat:item.requestedFormat||'Livre',redo:true})});const data=await r.json();if(!data.ok)throw new Error(data.error+(data.details?' — '+data.details:''));const fresh={...item,id:Date.now(),created:new Date().toLocaleDateString('pt-BR'),text:data.text,plan:data.plan||null,model:data.model||'gemini'};contents.unshift(fresh);await syncToCloud();showResult(fresh)}catch(e){showToast(e.message||'Não foi possível criar outra versão agora.')}}

function addProfile(root){
  root.appendChild(button('91%','18%','78%','6%',()=>{localStorage.removeItem('destrave-session');navigate('login')},'Sair'));
}

function addAlpha(root){
  root.appendChild(button('63%','20%','74%','6%',()=>showToast('Você será avisada assim que a Comunidade Alpha abrir ✨'),'Quero ser avisado'));
}

function render(){
  const data=screens[current]||screens.home;
  const root=document.createElement('section'); root.className='screen';
  const image=document.createElement('img'); image.className='screen-image'; image.alt=data.asset===1?'Login Destrave':`Tela ${current}`;
  image.src=`/assets/reference/asset_${data.asset}.jpg`;
  root.appendChild(image);
  if(current==='login') addLogin(root); else {
    addSidebar(root);
    if(current==='home') addHome(root);
    if(current==='daily') addDaily(root);
    if(current==='contents') addContents(root);
    if(current==='work') addWork(root);
    if(current==='profile') addProfile(root);
    if(current==='alpha') addAlpha(root);
  }
  app.replaceChildren(root);
}

render();
if(localStorage.getItem('destrave-session')) syncFromCloud().then(ok=>{if(ok){current=isConfigured()?'home':'work';render()}});
