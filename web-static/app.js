const screens = {
  login: { asset: 1 }, home: { asset: 2 }, daily: { asset: 4 },
  contents: { asset: 5 }, work: { asset: 6 }, profile: { asset: 7 }, alpha: { asset: 8 }
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let current = localStorage.getItem('destrave-session') ? 'home' : 'login';

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

function addSidebar(root){
  const items=[
    ['1.5%','7.5%','home','Destrave'],['10.5%','7.5%','home','Início'],
    ['18.5%','7.5%','contents','Conteúdo'],['26%','7.5%','work','Meu trabalho'],
    ['33%','7.5%','profile','Perfil'],['40%','7.5%','alpha','Alpha']
  ];
  items.forEach(([top,height,target,label])=>root.appendChild(button(top,'0%','15%',height,()=>navigate(target),label)));
}

function addLogin(root){
  const email=document.createElement('input'); email.className='login-field'; email.type='email'; email.autocomplete='email'; email.placeholder='E-mail';
  Object.assign(email.style,{top:'43.1%',left:'9.5%',width:'81%',height:'6.2%'});
  const pass=document.createElement('input'); pass.className='login-field'; pass.type='password'; pass.autocomplete='current-password'; pass.placeholder='Senha';
  Object.assign(pass.style,{top:'51.2%',left:'9.5%',width:'81%',height:'6.2%'});
  root.append(email,pass);
  root.appendChild(button('62.3%','9.5%','81%','5.7%',()=>{localStorage.setItem('destrave-session','1');navigate('home')},'Entrar'));
  root.appendChild(button('72.8%','9.5%','81%','5.8%',()=>showToast('Em breve: conheça o Destrave ✨'),'Conhecer o Destrave'));
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
  root.appendChild(button('2%','84%','12%','4%',()=>navigate('profile'),'Perfil'));
  root.appendChild(button('18%','18%','37%','6%',()=>showToast('Objetivo selecionado'),'Vender'));
  root.appendChild(button('18%','58%','37%','6%',()=>showToast('Objetivo selecionado'),'Atrair pessoas'));
  root.appendChild(button('70%','18%','78%','7%',()=>showToast('Conteúdo criado com sucesso ✨'),'Criar conteúdo'));
}

function addContents(root){
  root.appendChild(button('8.4%','17%','80%','5%',()=>navigate('daily'),'Criar conteúdo do dia'));
  root.appendChild(button('17%','17%','80%','5%',()=>showToast('Busca pronta para usar'),'Buscar'));
  root.appendChild(button('23%','17%','25%','4%',()=>showToast('Todos os conteúdos'),'Todos'));
  root.appendChild(button('23%','45%','25%','4%',()=>showToast('Conteúdos salvos'),'Salvos'));
  root.appendChild(button('23%','73%','24%','4%',()=>showToast('Conteúdos publicados'),'Publicados'));
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
    if(current==='profile') addProfile(root);
    if(current==='alpha') addAlpha(root);
  }
  app.replaceChildren(root);
}

render();
