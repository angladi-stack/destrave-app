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
    ['1.5%','7%','home','Destrave'],['18%','7%','home','Início'],
    ['31%','7%','contents','Conteúdo'],['43%','8%','work','Meu trabalho'],
    ['56%','7%','profile','Perfil'],['68%','8%','alpha','Alpha']
  ];
  items.forEach(([top,height,target,label])=>root.appendChild(button(top,'0%','15%',height,()=>navigate(target),label)));
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
  const greeting=document.createElement('div');greeting.className='home-greeting';greeting.textContent=business.name?`Oi, ${business.name} ✦`:'Olá ✦';root.appendChild(greeting);
  const recent=document.createElement('div');recent.className='home-recent';
  recent.innerHTML='<h3>Últimos conteúdos</h3>';
  if(!contents.length){recent.innerHTML+='<div class="home-empty"><strong>Nenhum conteúdo criado ainda.</strong><span>Quando você destravar seu primeiro conteúdo, ele aparece aqui.</span></div>'}
  else contents.slice(0,2).forEach(item=>{const card=document.createElement('button');card.type='button';card.className='home-real-card';card.innerHTML=`<strong>${item.title}</strong><span>${item.format} • ${item.created}</span><small>Pronto para usar</small>`;card.onclick=()=>showResult(item);recent.appendChild(card)});
  root.appendChild(recent);
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
  const state={goal:'Vender',topic:'',format:'Reels aparecendo e falando'};
  const selected=document.createElement('div');selected.className='daily-live-fields';
  const topic=document.createElement('textarea');topic.placeholder='O que você quer divulgar hoje?';topic.addEventListener('input',()=>state.topic=topic.value);
  selected.appendChild(topic);root.appendChild(selected);

  const goals=[['Vender','Vender'],['Atrair pessoas','Alcançar pessoas'],['Passar confiança','Passar confiança'],['Ensinar','Ensinar'],['Criar conexão','Criar conexão']];
  goals.forEach(([value,label],idx)=>root.appendChild(button(idx<3?'29.1%':'34.3%',idx<3?(`${17+idx*27}%`):(`${17+(idx-3)*27}%`),'25%','4.4%',()=>{state.goal=value;showToast(label+' selecionado')},label)));

  const formats=[['Reels aparecendo e falando','Reels aparecendo'],['Reels sem aparecer','Reels sem aparecer'],['Stories','Stories'],['Carrossel','Carrossel']];
  formats.forEach(([value,label],idx)=>root.appendChild(button(idx<2?'52.2%':'57.2%',idx%2===0?'17%':'57%','37%','4.2%',()=>{state.format=value;showToast(label+' selecionado')},label)));

  const generate=async()=>{
    if(!isConfigured()){showToast('Primeiro preciso conhecer você.');navigate('work');return}
    const subject=state.topic.trim()||business.objective||business.activity||'seu trabalho';
    showToast('✦ Destravando seu dia...');
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal:state.goal,topic:subject,requestedFormat:state.format})});
      const data=await r.json();if(!data.ok) throw new Error(data.error+(data.details?' — '+data.details:''));
      const generated={id:Date.now(),title:`${state.goal}: ${subject}`,format:data.format||'Stories + Reels + Carrossel',requestedFormat:state.format,status:'salvo',created:new Date().toLocaleDateString('pt-BR'),text:data.text,model:data.model||'gemini'};
      contents.unshift(generated);await syncToCloud();showResult(generated);
    }catch(e){showToast(e.message||'Não foi possível gerar agora.')}
  };
  root.appendChild(button('65.8%','17%','80%','5.6%',generate,'Criar meu conteúdo do dia'));
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

function showResult(item){
  const modal=document.createElement('div');modal.className='modal';
  modal.innerHTML=`<div class="modal-card"><button class="close" aria-label="Fechar">×</button><h2>${item.title}</h2><p class="result-text"></p><div class="modal-actions"><button class="secondary">COPIAR</button><button class="primary">VER EM CONTEÚDOS</button></div></div>`;
  modal.querySelector('.result-text').textContent=item.text;modal.querySelector('.close').onclick=()=>modal.remove();
  modal.querySelector('.secondary').onclick=async()=>{try{await navigator.clipboard.writeText(item.text);showToast('Conteúdo copiado!')}catch{showToast('Selecione o texto para copiar')}};
  modal.querySelector('.primary').onclick=()=>{modal.remove();navigate('contents')};document.body.appendChild(modal);
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
