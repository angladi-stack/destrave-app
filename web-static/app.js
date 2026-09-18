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
  const panel=document.createElement('div'); panel.className='data-panel generator-panel';
  panel.innerHTML='<h2>Crie seu conteúdo do dia</h2><p>Preencha o que deseja divulgar. O Destrave entrega um roteiro pronto.</p>';
  const goal=document.createElement('select'); goal.innerHTML='<option>Vender</option><option>Atrair pessoas</option><option>Passar confiança</option><option>Ensinar</option><option>Criar conexão</option>';
  const topic=document.createElement('textarea'); topic.placeholder='O que você quer divulgar hoje?';
  const format=document.createElement('select'); format.innerHTML='<option>Reels aparecendo e falando</option><option>Reels sem aparecer</option><option>Stories</option><option>Carrossel</option>';
  panel.append(goal,topic,format,primary('✦ CRIAR MEU CONTEÚDO',async()=>{
    if(!isConfigured()){showToast('Primeiro preciso conhecer você.');navigate('work');return}
    const subject=topic.value.trim()||business.objective||business.activity||'seu trabalho';
    const btn=panel.querySelector('.primary'); const old=btn.textContent; btn.disabled=true; btn.textContent='✦ DESTRAVANDO SEU DIA...';
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal:goal.value,topic:subject,requestedFormat:format.value})});
      const data=await r.json();
      if(!data.ok) throw new Error(data.error+(data.details?' — '+data.details:''));
      const generated={id:Date.now(),title:`${goal.value}: ${subject}`,format:data.format||'Stories + Reels + Carrossel',requestedFormat:format.value,status:'salvo',created:new Date().toLocaleDateString('pt-BR'),text:data.text,model:data.model||'gemini'};
      contents.unshift(generated); await syncToCloud(); showResult(generated);
    }catch(e){showToast(e.message||'Não foi possível gerar agora.')}
    finally{btn.disabled=false;btn.textContent=old}
  })); root.appendChild(panel);
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
