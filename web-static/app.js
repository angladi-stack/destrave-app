const screens = {
  login: { asset: 1 }, home: { asset: 2 }, daily: { asset: 3 },
  contents: { asset: 5 }, work: { asset: 6 }, profile: { asset: 7 }, alpha: { asset: 8 }
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let current = localStorage.getItem('destrave-session') ? 'home' : 'login';
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
let business=readJSON('destrave-business',{});
let contents=readJSON('destrave-contents',[]);

function showToast(text){
  toast.textContent=text; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200);
}

function button(top,left,width,height,onClick,label=''){
  const b=document.createElement('button'); b.className='hotspot'; b.type='button';
  Object.assign(b.style,{top,left,width,height}); b.setAttribute('aria-label',label);
  b.addEventListener('click',onClick); return b;
}

function navigate(name){ current=name; window.scrollTo(0,0); render(); }

function field(label,key,placeholder='Nenhum dado cadastrado'){
  const wrap=document.createElement('label'); wrap.className='form-field';
  wrap.innerHTML=`<span>${label}</span>`;
  const input=document.createElement('input'); input.value=business[key]||''; input.placeholder=placeholder;
  input.addEventListener('input',()=>{business[key]=input.value}); wrap.appendChild(input); return wrap;
}

function primary(text,onClick){const b=document.createElement('button');b.className='primary';b.type='button';b.textContent=text;b.addEventListener('click',onClick);return b}

function addSidebar(root){
  const items=[
    ['1.5%','7%','home','Destrave'],['10%','8%','home','Início'],
    ['20%','8%','contents','Conteúdo'],['30%','8%','work','Meu trabalho'],
    ['40%','8%','profile','Perfil'],['50%','9%','alpha','Alpha']
  ];
  items.forEach(([top,height,target,label])=>root.appendChild(button(top,'0%','15%',height,()=>navigate(target),label)));
}

function addLogin(root){
  const email=document.createElement('input'); email.className='login-field'; email.type='email'; email.autocomplete='email'; email.placeholder='E-mail';
  Object.assign(email.style,{top:'48.8%',left:'23%',width:'65%',height:'5.8%'});
  const pass=document.createElement('input'); pass.className='login-field'; pass.type='password'; pass.autocomplete='current-password'; pass.placeholder='Senha';
  Object.assign(pass.style,{top:'56.1%',left:'23%',width:'65%',height:'5.8%'});
  root.append(email,pass);
  root.appendChild(button('68.4%','9.5%','81%','5.9%',()=>{localStorage.setItem('destrave-session','1');navigate('home')},'Entrar'));
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
  panel.append(goal,topic,format,primary('✦ CRIAR MEU CONTEÚDO',()=>{
    const subject=topic.value.trim()||business.service||business.business||'seu trabalho';
    const name=business.name||'você';
    const generated={id:Date.now(),title:`${goal.value}: ${subject}`,format:format.value,status:'salvo',created:new Date().toLocaleDateString('pt-BR'),text:`GANCHO: Se as pessoas ainda não entenderam o valor de ${subject}, preste atenção.\n\nROTEIRO: ${name}, mostre o problema que isso resolve, explique de forma simples como funciona e apresente o resultado que a pessoa pode alcançar. Fale com naturalidade e use um exemplo real do seu dia a dia.\n\nCTA: Quer saber como ${subject} pode ajudar você? Me chama para conversar.`};
    contents.unshift(generated);writeJSON('destrave-contents',contents);showResult(generated);
  })); root.appendChild(panel);
}

function addContents(root){
  root.appendChild(button('8.4%','17%','80%','5%',()=>navigate('daily'),'Criar conteúdo do dia'));
  const panel=document.createElement('div');panel.className='data-panel contents-panel';panel.innerHTML='<h2>Seus conteúdos</h2>';
  if(!contents.length){panel.innerHTML+='<div class="empty"><strong>Nenhum conteúdo criado ainda.</strong><span>Crie seu primeiro conteúdo para ele aparecer aqui.</span></div>';panel.appendChild(primary('+ CRIAR PRIMEIRO CONTEÚDO',()=>navigate('daily')))}
  else contents.forEach(item=>{const card=document.createElement('button');card.className='content-card';card.innerHTML=`<strong>${item.title}</strong><span>${item.format} • ${item.created}</span><small>Pronto para usar</small>`;card.onclick=()=>showResult(item);panel.appendChild(card)});
  root.appendChild(panel);
}

function addWork(root){
  const panel=document.createElement('div');panel.className='data-panel work-panel';
  panel.innerHTML='<h2>Meu trabalho</h2><p>Essas informações personalizam todos os conteúdos.</p>';
  panel.append(field('Seu nome','name'),field('Nome do negócio','business'),field('O que você faz','service'),field('Para quem','audience'),field('Problema que resolve','problem'),field('Resultado que entrega','result'),field('Seu diferencial','difference'));
  panel.appendChild(primary('SALVAR MINHAS INFORMAÇÕES',()=>{writeJSON('destrave-business',business);showToast('Informações salvas no Destrave ✨');render()}));root.appendChild(panel);
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
  image.src=`/assets/reference/asset_${data.asset}.webp`;
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
