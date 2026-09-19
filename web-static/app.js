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
  const items=[
    ['14.7%','7.2%','home','Início'],
    ['23.5%','7.2%','contents','Conteúdo'],
    ['32.4%','8.0%','work','Meu trabalho'],
    ['41.5%','7.5%','profile','Perfil'],
    ['50.2%','8.0%','alpha','Alpha']
  ];
  items.forEach(([top,height,target,label])=>{
    const b=button(top,'1.4%','11.2%',height,()=>navigate(target),label);
    b.classList.add('sidebar-hit');
    if(current===target)b.classList.add('sidebar-active');
    root.appendChild(b);
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
  const state={goal:'',topic:'',ways:[]};
  const selectGoal=(v,label)=>{state.goal=v;showToast(label+' selecionado')};
  [
    ['31.5%','18%','22%','4.8%','Vender','Vender'],
    ['31.5%','42%','27%','4.8%','Alcançar pessoas','Alcançar pessoas'],
    ['31.5%','70%','26%','4.8%','Passar confiança','Passar confiança'],
    ['36.2%','18%','22%','4.8%','Ensinar','Ensinar'],
    ['36.2%','42%','27%','4.8%','Criar conexão','Criar conexão'],
    ['36.2%','70%','26%','4.8%','Escolha por mim','Escolha por mim']
  ].forEach(([top,left,width,height,v,label])=>{
    const b=button(top,left,width,height,()=>{state.goal=v;root.querySelectorAll('.daily-goal-hit').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');showToast(label+' selecionado')},label);
    b.classList.add('daily-select-hit','daily-goal-hit');root.appendChild(b);
  });

  const topic=document.createElement('textarea');topic.className='daily-topic-input';
  topic.placeholder='';
  topic.addEventListener('input',()=>state.topic=topic.value);
  root.appendChild(topic);

  root.appendChild(button('49.0%','18%','58%','3.8%',()=>{state.topic='';topic.value='';showToast('Eu escolho o assunto por você ✦')},'Não sei. Escolha por mim'));

  const toggleWay=(v,label)=>{const i=state.ways.indexOf(v);if(i>=0)state.ways.splice(i,1);else if(state.ways.length<2)state.ways.push(v);else{state.ways.shift();state.ways.push(v)}showToast(label+' selecionado')};
  [
    ['58.0%','18%','78%','4.5%','Posso aparecer e falar','Posso aparecer e falar'],
    ['62.5%','18%','78%','4.5%','Posso mostrar sem falar','Posso mostrar sem falar'],
    ['67.0%','18%','78%','4.5%','Não quero aparecer','Não quero aparecer'],
    ['71.5%','18%','78%','4.5%','Tenho pouco tempo','Tenho pouco tempo']
  ].forEach(([top,left,width,height,v,label])=>{
    const b=button(top,left,width,height,()=>{
      const i=state.ways.indexOf(v);
      if(i>=0){state.ways.splice(i,1);b.classList.remove('selected')}
      else{
        if(state.ways.length>=2){const old=state.ways.shift();root.querySelectorAll('.daily-way-hit').forEach(x=>{if(x.dataset.value===old)x.classList.remove('selected')})}
        state.ways.push(v);b.classList.add('selected')
      }
      showToast(label+' selecionado')
    },label);
    b.dataset.value=v;b.classList.add('daily-select-hit','daily-way-hit');root.appendChild(b);
  });

  const generate=async()=>{
    if(!isConfigured()){showToast('Primeiro preciso conhecer você.');navigate('work');return}
    const subject=state.topic.trim()||business.objective||business.activity||business.service||'meu trabalho';
    const goal=state.goal||'Escolha por mim';
    const requestedFormat=state.ways.length?state.ways.join(' + '):'Escolha por mim';
    showToast('✦ Destravando seu dia...');
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal,topic:subject,requestedFormat})});
      const data=await r.json();if(!data.ok)throw new Error(data.error+(data.details?' — '+data.details:''));
      const generated={id:Date.now(),title:`${goal}: ${subject}`,format:data.format||'Stories + Reels + Carrossel',requestedFormat,status:'salvo',created:new Date().toLocaleDateString('pt-BR'),text:data.text,model:data.model||'gemini'};
      contents.unshift(generated);await syncToCloud();showResult(generated);
    }catch(e){showToast(e.message||'Não foi possível gerar agora.')}
  };
  root.appendChild(button('77.8%','16%','81%','5.6%',generate,'Criar meu conteúdo do dia'));
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

function splitResult(text){
  const raw=String(text||'');
  const marks=[['stories','STORIES'],['reels','REELS'],['carousel','CARROSSEL'],['movement','MOVIMENTO']];
  const found=[];
  marks.forEach(([key,label])=>{const re=new RegExp('(?:^|\\n)#{0,3}\\s*(?:📱|🎬|▦|✦)?\\s*'+label+'[^\\n]*','i');const m=re.exec(raw);if(m)found.push({key,index:m.index+(m[0].startsWith('\n')?1:0),head:m[0].trim()})});
  found.sort((a,b)=>a.index-b.index);
  const out={};
  found.forEach((f,i)=>{const from=f.index+f.head.length;const to=i+1<found.length?found[i+1].index:raw.length;out[f.key]=raw.slice(from,to).trim()});
  if(!found.length) out.all=raw.trim();
  return out;
}
function resultSection(icon,title,text){
  const section=document.createElement('section');section.className='result-section';
  section.innerHTML=`<div class="result-section-title"><span class="result-icon">${icon}</span><h2>${title}</h2></div><div class="result-section-text"></div>`;
  section.querySelector('.result-section-text').textContent=text||'';
  const copy=document.createElement('button');copy.type='button';copy.className='section-copy';copy.textContent='COPIAR '+title.toUpperCase();
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(text||'');showToast(title+' copiado!')}catch{showToast('Selecione o texto para copiar')}};
  section.appendChild(copy);return section;
}
function showResult(item){
  const page=document.createElement('div');page.className='result-page';
  const header=document.createElement('div');header.className='result-header';
  const back=document.createElement('button');back.type='button';back.className='result-back';back.textContent='‹';
  const title=document.createElement('div');title.innerHTML='<strong>Seu conteúdo do dia</strong><span>Seu movimento completo, organizado para executar.</span>';
  header.append(back,title);
  const body=document.createElement('div');body.className='result-body';
  const h=document.createElement('h1');h.textContent=item.title;
  const parts=splitResult(item.text);
  if(parts.stories) body.appendChild(resultSection('📱','Stories',parts.stories));
  if(parts.reels) body.appendChild(resultSection('🎬','Reels',parts.reels));
  if(parts.carousel) body.appendChild(resultSection('▦','Carrossel',parts.carousel));
  if(parts.movement) body.appendChild(resultSection('✦','Seu movimento de hoje',parts.movement));
  if(parts.all || (!parts.stories&&!parts.reels&&!parts.carousel)){body.appendChild(resultSection('✦','Plano do dia',parts.all||item.text))}
  const actions=document.createElement('div');actions.className='result-actions';
  const copy=primary('COPIAR TUDO',async()=>{try{await navigator.clipboard.writeText(item.text);showToast('Conteúdo copiado!')}catch{showToast('Selecione o texto para copiar')}});
  const redo=primary('↻ REFAZER',()=>regenerate(item));actions.append(copy,redo);body.append(actions);page.append(header,body);
  back.onclick=()=>render();app.replaceChildren(page);window.scrollTo(0,0);
}
async function regenerate(item){
  showToast('✦ Refazendo sem repetir...');
  try{
    const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal:(item.title||'').split(':')[0]||'Movimentar',topic:(item.title||'').split(':').slice(1).join(':').trim()||business.objective,requestedFormat:item.requestedFormat||'Livre',redo:true})});
    const data=await r.json();if(!data.ok) throw new Error(data.error+(data.details?' — '+data.details:''));
    const fresh={...item,id:Date.now(),created:new Date().toLocaleDateString('pt-BR'),text:data.text,model:data.model||'gemini'};
    contents.unshift(fresh);await syncToCloud();showResult(fresh);
  }catch(e){showToast(e.message||'Não foi possível refazer agora.')}
}
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
