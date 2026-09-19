const screens = {
  login: { asset: 1 }, home: { asset: 2 }, daily: { asset: 3 },
  contents: { asset: 5 }, work: { asset: 6 }, profile: { asset: 7 }, alpha: { asset: 8 }
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let current = localStorage.getItem('destrave-session') ? 'home' : 'login';
const isConfigured=()=>Boolean(business.name&&business.activity&&((Array.isArray(business.mainGoal)&&business.mainGoal.length)||business.objective));
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

function showGenerating(){
  const old=document.querySelector('.destrave-generating');if(old)old.remove();
  const overlay=document.createElement('div');overlay.className='destrave-generating';
  overlay.innerHTML='<div class="generating-card"><div class="generating-mark">✦</div><strong>Criando seu conteúdo...</strong><p>O Destrave está preparando seu próximo movimento.</p><div class="generating-progress"><i></i></div></div>';
  document.body.appendChild(overlay);
  return ()=>overlay.remove();
}

function button(top,left,width,height,onClick,label=''){
  const b=document.createElement('button'); b.className='hotspot'; b.type='button';
  Object.assign(b.style,{top,left,width,height}); b.setAttribute('aria-label',label);
  b.addEventListener('click',onClick); return b;
}

function navigate(name,fromHistory=false){
  if(name!=='work'&&name!=='login'&&localStorage.getItem('destrave-session')&&!isConfigured()) name='work';
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

function addSidebar(root){
  // Rebuilt navigation: logo at the top, menu below it.
  const nav=document.createElement('nav');nav.className='sidebar-real';nav.setAttribute('aria-label','Navegação principal');
  const brand=document.createElement('div');brand.className='sidebar-brand';
  const brandLogo=document.createElement('div');brandLogo.className='sidebar-brand-original';brandLogo.setAttribute('aria-label','Destrave by Angladi');
  brand.appendChild(brandLogo);nav.appendChild(brand);
  const items=[
    ['⌂','Início','home'],
    ['▣','Conteúdo','contents'],
    ['◇','Meu trabalho','work'],
    ['♙','Perfil','profile'],
    ['✦','Alpha','alpha']
  ];
  items.forEach(([icon,label,target])=>{
    const b=document.createElement('button');b.type='button';b.className='sidebar-real-item'+(current===target?' active':'');
    b.innerHTML='<span class="sidebar-real-icon" aria-hidden="true"></span><span class="sidebar-real-label"></span>';
    b.querySelector('.sidebar-real-icon').textContent=icon;b.querySelector('.sidebar-real-label').textContent=label;
    b.setAttribute('aria-label',label);b.onclick=()=>navigate(target);nav.appendChild(b);
  });
  root.appendChild(nav);
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
    "Hoje, faça o próximo movimento antes que a dúvida tente decidir por você.",
    "Seu trabalho ganha força quando deixa de ficar escondido.",
    "Uma ação simples publicada hoje vale mais do que um plano perfeito adiado.",
    "Quando você sabe o que quer comunicar, criar fica mais leve.",
    "Recomeçar também é movimento. Hoje, volte com o que você tem.",
    "Constância não é fazer muito. É não abandonar o movimento.",
    "Coragem digital também é publicar mesmo sem sentir que está perfeito.",
    "Fale com uma pessoa de verdade, não com uma multidão imaginária.",
    "Confiança se constrói quando as pessoas entendem o que você faz.",
    "Antes de vender, deixe claro o valor que você entrega.",
    "Pouco tempo ainda pode produzir um movimento importante.",
    "Criatividade aparece mais fácil quando você começa a executar.",
    "Ensinar algo útil sobre o que você faz também mostra sua autoridade.",
    "Quem não conhece seu trabalho ainda precisa de uma chance de encontrá-lo.",
    "Você não precisa de cem ideias. Precisa da próxima ideia certa.",
    "Transforme uma intenção em algo que possa ser visto hoje. Uma presença forte é construída em movimentos reais.",
    "Transforme uma intenção em algo que possa ser visto hoje. Continue construindo um dia de cada vez.",
    "Transforme uma intenção em algo que possa ser visto hoje. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Transforme uma intenção em algo que possa ser visto hoje. A internet só consegue responder ao que você coloca em movimento.",
    "Transforme uma intenção em algo que possa ser visto hoje. Movimento gera material para o próximo movimento.",
    "Transforme uma intenção em algo que possa ser visto hoje. Você não precisa acelerar; precisa continuar.",
    "Transforme uma intenção em algo que possa ser visto hoje. Seu trabalho merece ocupar espaço com clareza.",
    "Transforme uma intenção em algo que possa ser visto hoje. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Transforme uma intenção em algo que possa ser visto hoje. Faça do jeito possível, mas faça com intenção.",
    "Transforme uma intenção em algo que possa ser visto hoje. É assim que presença começa a virar construção.",
    "Transforme uma intenção em algo que possa ser visto hoje. Clareza e ação são uma combinação poderosa.",
    "Transforme uma intenção em algo que possa ser visto hoje. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Transforme uma intenção em algo que possa ser visto hoje. Uma presença forte é construída em movimentos reais. ✦ Dia 28",
    "Transforme uma intenção em algo que possa ser visto hoje. Continue construindo um dia de cada vez. ✦ Dia 29",
    "Transforme uma intenção em algo que possa ser visto hoje. Seu próximo passo pode ser pequeno e ainda assim contar. ✦ Dia 30",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Clareza e ação são uma combinação poderosa.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Uma presença forte é construída em movimentos reais.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Continue construindo um dia de cada vez.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. A internet só consegue responder ao que você coloca em movimento.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Movimento gera material para o próximo movimento.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Você não precisa acelerar; precisa continuar.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Seu trabalho merece ocupar espaço com clareza.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Faça do jeito possível, mas faça com intenção.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. É assim que presença começa a virar construção.",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Clareza e ação são uma combinação poderosa. ✦ Dia 43",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Hoje, o objetivo é sair do pensamento e entrar em ação. ✦ Dia 44",
    "Mostre um detalhe que ajude alguém a entender melhor seu trabalho. Uma presença forte é construída em movimentos reais. ✦ Dia 45",
    "Faça simples o suficiente para conseguir publicar. Faça do jeito possível, mas faça com intenção.",
    "Faça simples o suficiente para conseguir publicar. É assim que presença começa a virar construção.",
    "Faça simples o suficiente para conseguir publicar. Clareza e ação são uma combinação poderosa.",
    "Faça simples o suficiente para conseguir publicar. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Faça simples o suficiente para conseguir publicar. Uma presença forte é construída em movimentos reais.",
    "Faça simples o suficiente para conseguir publicar. Continue construindo um dia de cada vez.",
    "Faça simples o suficiente para conseguir publicar. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Faça simples o suficiente para conseguir publicar. A internet só consegue responder ao que você coloca em movimento.",
    "Faça simples o suficiente para conseguir publicar. Movimento gera material para o próximo movimento.",
    "Faça simples o suficiente para conseguir publicar. Você não precisa acelerar; precisa continuar.",
    "Faça simples o suficiente para conseguir publicar. Seu trabalho merece ocupar espaço com clareza.",
    "Faça simples o suficiente para conseguir publicar. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Faça simples o suficiente para conseguir publicar. Faça do jeito possível, mas faça com intenção. ✦ Dia 58",
    "Faça simples o suficiente para conseguir publicar. É assim que presença começa a virar construção. ✦ Dia 59",
    "Faça simples o suficiente para conseguir publicar. Clareza e ação são uma combinação poderosa. ✦ Dia 60",
    "Use o que você já tem e coloque sua presença em movimento. Seu trabalho merece ocupar espaço com clareza.",
    "Use o que você já tem e coloque sua presença em movimento. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Use o que você já tem e coloque sua presença em movimento. Faça do jeito possível, mas faça com intenção.",
    "Use o que você já tem e coloque sua presença em movimento. É assim que presença começa a virar construção.",
    "Use o que você já tem e coloque sua presença em movimento. Clareza e ação são uma combinação poderosa.",
    "Use o que você já tem e coloque sua presença em movimento. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Use o que você já tem e coloque sua presença em movimento. Uma presença forte é construída em movimentos reais.",
    "Use o que você já tem e coloque sua presença em movimento. Continue construindo um dia de cada vez.",
    "Use o que você já tem e coloque sua presença em movimento. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Use o que você já tem e coloque sua presença em movimento. A internet só consegue responder ao que você coloca em movimento.",
    "Use o que você já tem e coloque sua presença em movimento. Movimento gera material para o próximo movimento.",
    "Use o que você já tem e coloque sua presença em movimento. Você não precisa acelerar; precisa continuar.",
    "Use o que você já tem e coloque sua presença em movimento. Seu trabalho merece ocupar espaço com clareza. ✦ Dia 73",
    "Use o que você já tem e coloque sua presença em movimento. O conteúdo de hoje é parte do caminho, não uma prova de perfeição. ✦ Dia 74",
    "Use o que você já tem e coloque sua presença em movimento. Faça do jeito possível, mas faça com intenção. ✦ Dia 75",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Movimento gera material para o próximo movimento.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Você não precisa acelerar; precisa continuar.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Seu trabalho merece ocupar espaço com clareza.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Faça do jeito possível, mas faça com intenção.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. É assim que presença começa a virar construção.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Clareza e ação são uma combinação poderosa.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Uma presença forte é construída em movimentos reais.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Continue construindo um dia de cada vez.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. A internet só consegue responder ao que você coloca em movimento.",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Movimento gera material para o próximo movimento. ✦ Dia 88",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Você não precisa acelerar; precisa continuar. ✦ Dia 89",
    "Não tente resolver o mês inteiro; resolva o conteúdo de hoje. Seu trabalho merece ocupar espaço com clareza. ✦ Dia 90",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. A internet só consegue responder ao que você coloca em movimento.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Movimento gera material para o próximo movimento.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Você não precisa acelerar; precisa continuar.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Seu trabalho merece ocupar espaço com clareza.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Faça do jeito possível, mas faça com intenção.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. É assim que presença começa a virar construção.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Clareza e ação são uma combinação poderosa.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Uma presença forte é construída em movimentos reais.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Continue construindo um dia de cada vez.",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Seu próximo passo pode ser pequeno e ainda assim contar. ✦ Dia 103",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. A internet só consegue responder ao que você coloca em movimento. ✦ Dia 104",
    "Deixe a mensagem mais clara antes de tentar deixá-la mais bonita. Movimento gera material para o próximo movimento. ✦ Dia 105",
    "Crie pensando no que a outra pessoa precisa perceber. Uma presença forte é construída em movimentos reais.",
    "Crie pensando no que a outra pessoa precisa perceber. Continue construindo um dia de cada vez.",
    "Crie pensando no que a outra pessoa precisa perceber. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Crie pensando no que a outra pessoa precisa perceber. A internet só consegue responder ao que você coloca em movimento.",
    "Crie pensando no que a outra pessoa precisa perceber. Movimento gera material para o próximo movimento.",
    "Crie pensando no que a outra pessoa precisa perceber. Você não precisa acelerar; precisa continuar.",
    "Crie pensando no que a outra pessoa precisa perceber. Seu trabalho merece ocupar espaço com clareza.",
    "Crie pensando no que a outra pessoa precisa perceber. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Crie pensando no que a outra pessoa precisa perceber. Faça do jeito possível, mas faça com intenção.",
    "Crie pensando no que a outra pessoa precisa perceber. É assim que presença começa a virar construção.",
    "Crie pensando no que a outra pessoa precisa perceber. Clareza e ação são uma combinação poderosa.",
    "Crie pensando no que a outra pessoa precisa perceber. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Crie pensando no que a outra pessoa precisa perceber. Uma presença forte é construída em movimentos reais. ✦ Dia 118",
    "Crie pensando no que a outra pessoa precisa perceber. Continue construindo um dia de cada vez. ✦ Dia 119",
    "Crie pensando no que a outra pessoa precisa perceber. Seu próximo passo pode ser pequeno e ainda assim contar. ✦ Dia 120",
    "Mostre processo, benefício ou transformação com verdade. Clareza e ação são uma combinação poderosa.",
    "Mostre processo, benefício ou transformação com verdade. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Mostre processo, benefício ou transformação com verdade. Uma presença forte é construída em movimentos reais.",
    "Mostre processo, benefício ou transformação com verdade. Continue construindo um dia de cada vez.",
    "Mostre processo, benefício ou transformação com verdade. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Mostre processo, benefício ou transformação com verdade. A internet só consegue responder ao que você coloca em movimento.",
    "Mostre processo, benefício ou transformação com verdade. Movimento gera material para o próximo movimento.",
    "Mostre processo, benefício ou transformação com verdade. Você não precisa acelerar; precisa continuar.",
    "Mostre processo, benefício ou transformação com verdade. Seu trabalho merece ocupar espaço com clareza.",
    "Mostre processo, benefício ou transformação com verdade. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Mostre processo, benefício ou transformação com verdade. Faça do jeito possível, mas faça com intenção.",
    "Mostre processo, benefício ou transformação com verdade. É assim que presença começa a virar construção.",
    "Mostre processo, benefício ou transformação com verdade. Clareza e ação são uma combinação poderosa. ✦ Dia 133",
    "Mostre processo, benefício ou transformação com verdade. Hoje, o objetivo é sair do pensamento e entrar em ação. ✦ Dia 134",
    "Mostre processo, benefício ou transformação com verdade. Uma presença forte é construída em movimentos reais. ✦ Dia 135",
    "Termine o que começou antes de procurar uma nova ideia. Faça do jeito possível, mas faça com intenção.",
    "Termine o que começou antes de procurar uma nova ideia. É assim que presença começa a virar construção.",
    "Termine o que começou antes de procurar uma nova ideia. Clareza e ação são uma combinação poderosa.",
    "Termine o que começou antes de procurar uma nova ideia. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Termine o que começou antes de procurar uma nova ideia. Uma presença forte é construída em movimentos reais.",
    "Termine o que começou antes de procurar uma nova ideia. Continue construindo um dia de cada vez.",
    "Termine o que começou antes de procurar uma nova ideia. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Termine o que começou antes de procurar uma nova ideia. A internet só consegue responder ao que você coloca em movimento.",
    "Termine o que começou antes de procurar uma nova ideia. Movimento gera material para o próximo movimento.",
    "Termine o que começou antes de procurar uma nova ideia. Você não precisa acelerar; precisa continuar.",
    "Termine o que começou antes de procurar uma nova ideia. Seu trabalho merece ocupar espaço com clareza.",
    "Termine o que começou antes de procurar uma nova ideia. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Termine o que começou antes de procurar uma nova ideia. Faça do jeito possível, mas faça com intenção. ✦ Dia 148",
    "Termine o que começou antes de procurar uma nova ideia. É assim que presença começa a virar construção. ✦ Dia 149",
    "Termine o que começou antes de procurar uma nova ideia. Clareza e ação são uma combinação poderosa. ✦ Dia 150",
    "Faça caber na sua rotina sem desaparecer da internet. Seu trabalho merece ocupar espaço com clareza.",
    "Faça caber na sua rotina sem desaparecer da internet. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Faça caber na sua rotina sem desaparecer da internet. Faça do jeito possível, mas faça com intenção.",
    "Faça caber na sua rotina sem desaparecer da internet. É assim que presença começa a virar construção.",
    "Faça caber na sua rotina sem desaparecer da internet. Clareza e ação são uma combinação poderosa.",
    "Faça caber na sua rotina sem desaparecer da internet. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Faça caber na sua rotina sem desaparecer da internet. Uma presença forte é construída em movimentos reais.",
    "Faça caber na sua rotina sem desaparecer da internet. Continue construindo um dia de cada vez.",
    "Faça caber na sua rotina sem desaparecer da internet. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Faça caber na sua rotina sem desaparecer da internet. A internet só consegue responder ao que você coloca em movimento.",
    "Faça caber na sua rotina sem desaparecer da internet. Movimento gera material para o próximo movimento.",
    "Faça caber na sua rotina sem desaparecer da internet. Você não precisa acelerar; precisa continuar.",
    "Faça caber na sua rotina sem desaparecer da internet. Seu trabalho merece ocupar espaço com clareza. ✦ Dia 163",
    "Faça caber na sua rotina sem desaparecer da internet. O conteúdo de hoje é parte do caminho, não uma prova de perfeição. ✦ Dia 164",
    "Faça caber na sua rotina sem desaparecer da internet. Faça do jeito possível, mas faça com intenção. ✦ Dia 165",
    "Troque excesso de planejamento por uma execução possível. Movimento gera material para o próximo movimento.",
    "Troque excesso de planejamento por uma execução possível. Você não precisa acelerar; precisa continuar.",
    "Troque excesso de planejamento por uma execução possível. Seu trabalho merece ocupar espaço com clareza.",
    "Troque excesso de planejamento por uma execução possível. O conteúdo de hoje é parte do caminho, não uma prova de perfeição.",
    "Troque excesso de planejamento por uma execução possível. Faça do jeito possível, mas faça com intenção.",
    "Troque excesso de planejamento por uma execução possível. É assim que presença começa a virar construção.",
    "Troque excesso de planejamento por uma execução possível. Clareza e ação são uma combinação poderosa.",
    "Troque excesso de planejamento por uma execução possível. Hoje, o objetivo é sair do pensamento e entrar em ação.",
    "Troque excesso de planejamento por uma execução possível. Uma presença forte é construída em movimentos reais.",
    "Troque excesso de planejamento por uma execução possível. Continue construindo um dia de cada vez.",
    "Troque excesso de planejamento por uma execução possível. Seu próximo passo pode ser pequeno e ainda assim contar.",
    "Troque excesso de planejamento por uma execução possível. A internet só consegue responder ao que você coloca em movimento.",
    "Troque excesso de planejamento por uma execução possível. Movimento gera material para o próximo movimento. ✦ Dia 178",
    "Troque excesso de planejamento por uma execução possível. Você não precisa acelerar; precisa continuar. ✦ Dia 179",
    "Troque excesso de planejamento por uma execução possível. Seu trabalho merece ocupar espaço com clareza. ✦ Dia 180"
];
  const now=new Date();
  const dayKey=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/86400000);
  const message=dailyMessages[((dayKey%dailyMessages.length)+dailyMessages.length)%dailyMessages.length];

  const greeting=document.createElement('header');greeting.className='home-live-greeting';
  const firstName=(business.name||'').trim().split(/\s+/)[0]||'você';
  greeting.innerHTML='<div><h1></h1><p>Vamos criar o seu conteúdo de hoje.</p></div><button type="button" aria-label="Abrir perfil">●</button>';
  greeting.querySelector('h1').textContent='Oi, '+firstName+' ✦';
  greeting.querySelector('button').onclick=()=>navigate('profile');root.appendChild(greeting);

  // Keep the approved top hero image. Everything white below it is real UI.
  root.appendChild(button('20.6%','17%','80%','31.5%',()=>navigate('daily'),'Criar meu conteúdo do dia'));
  const belowHero=document.createElement('section');belowHero.className='home-below-hero';
  belowHero.innerHTML='<button type="button"><b>∞</b><span><small>Feito para você</small><strong>Entende o que você faz</strong></span></button><button type="button"><b>◎</b><span><small>Execução completa</small><strong>Pronto para gravar e publicar</strong></span></button>';
  belowHero.querySelectorAll('button').forEach(b=>b.onclick=()=>navigate('daily'));root.appendChild(belowHero);

  const middle=document.createElement('section');middle.className='home-real-middle';
  middle.innerHTML=`
    <div class="home-last-head"><h2>Últimos conteúdos</h2><button type="button">Ver todos ›</button></div>
    <div class="home-latest-real"></div>
    <div class="home-daily-message real"><small>✦ MENSAGEM DE HOJE</small><strong></strong></div>
    <button type="button" class="home-alpha-inline"><span class="alpha-mark">✦</span><span><strong>Comunidade Alpha</strong><small>Comunidade dos Imparáveis &nbsp; • &nbsp; Em breve</small></span><i>›</i></button>
  `;
  middle.querySelector('.home-last-head button').onclick=()=>navigate('contents');
  middle.querySelector('.home-daily-message strong').textContent=message;
  const latest=middle.querySelector('.home-latest-real');
  if(contents.length){
    const item=contents[0],card=document.createElement('button');card.type='button';card.className='home-latest-card';
    card.innerHTML='<div class="latest-thumb">▶</div><span><strong></strong><small></small><em>Pronto para usar</em></span><i>⋮</i>';
    card.querySelector('span strong').textContent=item.title||'Seu conteúdo mais recente';
    card.querySelector('span small').textContent=item.format||'Movimento do dia';
    card.onclick=()=>showResult(item);latest.appendChild(card);
  }else{
    const empty=document.createElement('button');empty.type='button';empty.className='home-latest-card empty';empty.innerHTML='<span><strong>Nenhum conteúdo criado ainda</strong><small>Crie o primeiro conteúdo do seu dia.</small></span>';empty.onclick=()=>navigate('daily');latest.appendChild(empty);
  }
  root.appendChild(middle);

  const alphaInline=middle.querySelector('.home-alpha-inline');if(alphaInline) alphaInline.onclick=()=>navigate('alpha');
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
      <h2>2. O que você quer conseguir com esse conteúdo hoje?</h2>
      <p>Conte do seu jeito. Quanto mais detalhes você der, mais personalizado fica.</p>
      <div class="daily-topic-wrap"><input class="daily-real-topic" placeholder="Ex.: Sou cantor e quero apresentações em casamentos. Quero mostrar meu repertório romântico."></div>
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
    const stopGenerating=showGenerating();
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal,topic:subject,requestedFormat})});
      const data=await r.json();if(!data.ok)throw new Error('generation_failed');
      const generated={id:Date.now(),title:`${goal}: ${subject}`,format:data.format||'Movimento do dia',requestedFormat,status:'salvo',created:new Date().toLocaleDateString('pt-BR'),text:data.text,plan:data.plan||null,model:data.model||'gemini'};
      contents.unshift(generated);await syncToCloud();stopGenerating();showResult(generated);
    }catch(e){stopGenerating();showToast('Não consegui concluir agora. Tente novamente em alguns instantes. ✦')}
  };
  const go=primary('✦ CRIAR MEU CONTEÚDO DO DIA  ›',generate);go.classList.add('daily-generate');
  panel.appendChild(go);root.appendChild(panel);
}
function addContents(root){
  const panel=document.createElement('main');panel.className='rebuilt-page rebuilt-contents';
  panel.innerHTML=`
    <header class="rebuilt-head"><div><h1>Meus conteúdos</h1><p>Tudo o que já foi criado para você.</p></div><button class="round-profile contents-profile" type="button" aria-label="Abrir perfil">●</button></header>
    <button class="contents-create" type="button">✦ &nbsp; + CRIAR CONTEÚDO DO DIA <span>›</span></button>
    <div class="contents-search"><span>⌕</span><input type="search" placeholder="Buscar pelo assunto"></div>
    <div class="contents-tabs"><button class="active" data-filter="all">Todos</button><button data-filter="saved">Salvos</button><button data-filter="published">Publicados</button></div>
    <section class="rebuilt-card contents-real-list"><h2>Seus conteúdos</h2><div class="contents-items"></div></section>`;
  panel.querySelector('.contents-profile').onclick=()=>navigate('profile');
  panel.querySelector('.contents-create').onclick=()=>navigate('daily');
  const input=panel.querySelector('.contents-search input'), items=panel.querySelector('.contents-items');
  let filter='all';
  const draw=()=>{
    const q=input.value.trim().toLowerCase();items.replaceChildren();
    const visible=contents.filter(item=>{
      const matches=!q||((item.title||'')+' '+(item.format||'')).toLowerCase().includes(q);
      const state=String(item.status||'').toLowerCase();
      const byFilter=filter==='all'||(filter==='saved'&&(state==='salvo'||state==='saved'))||(filter==='published'&&(state==='publicado'||state==='published'));
      return matches&&byFilter;
    });
    if(!visible.length){const empty=document.createElement('div');empty.className='contents-empty';empty.innerHTML='<strong>Nenhum conteúdo encontrado.</strong><span>Crie um conteúdo ou tente outra busca.</span>';items.appendChild(empty);return}
    visible.forEach(item=>{const card=document.createElement('button');card.type='button';card.className='content-card real';card.innerHTML='<strong></strong><span></span><small></small>';card.querySelector('strong').textContent=item.title||'Conteúdo';card.querySelector('span').textContent=(item.format||'Movimento do dia')+' • '+(item.created||'');card.querySelector('small').textContent='Pronto para usar';card.onclick=()=>showResult(item);items.appendChild(card)});
  };
  input.oninput=draw;
  panel.querySelectorAll('.contents-tabs button').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;panel.querySelectorAll('.contents-tabs button').forEach(x=>x.classList.toggle('active',x===b));draw()});
  draw();root.appendChild(panel);
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
  const panel=document.createElement('main');panel.className='rebuilt-page rebuilt-work';
  panel.innerHTML=`
    <header class="rebuilt-head"><div><h1>Meu trabalho</h1><p>Conte uma vez. O Destrave lembra para você.</p></div><button class="round-profile" type="button" aria-label="Abrir perfil">●</button></header>
    <section class="memory-hero"><small>MEMÓRIA DO DESTRAVE</small><h2>Quanto mais ele conhece você, mais certeiro fica.</h2><p>Uso estas informações para criar conteúdos com a sua realidade, sem repetir perguntas.</p><span>✦ Memória ativa</span></section>
    <section class="rebuilt-card work-form"><h2>${first?'Primeiro, quero conhecer você ✦':'Meu trabalho'}</h2><p>${first?'É rapidinho. Assim o Destrave entende o que faz sentido para você.':'Se alguma coisa mudar, atualize aqui.'}</p></section>`;
  panel.querySelector('.round-profile').onclick=()=>navigate('profile');
  const form=panel.querySelector('.work-form');

  const activity=field('2. O que você faz ou o que faz parte da sua vida hoje?','activity','Ex.: sou manicure, sou mãe, trabalho de Uber, estou criando um projeto...');
  const activityHint=document.createElement('small');activityHint.className='choice-hint';activityHint.textContent='Pode ser seu trabalho, profissão, negócio, projeto, rotina ou algo importante da sua vida.';activity.appendChild(activityHint);

  form.append(
    field('1. Como você se chama?','name','Seu nome'),
    activity,
    multiChoiceField('3. O que você quer conseguir na internet?','mainGoal',['Vender','Conseguir clientes','Mostrar o que faço','Ser mais conhecida(o)','Criar conexão','Crescer na internet','Começar a aparecer','Ainda estou descobrindo']),
    choiceField('4. Como está sua vida na internet hoje?','digitalStage',['Estou começando do zero','Já comecei, mas parei','Apareço/posto de vez em quando','Já tenho uma presença ativa']),
    choiceField('5. Como você se sente em aparecer?','appearance',['Gosto de aparecer','Quero aparecer, mas ainda tenho vergonha','Prefiro não aparecer','Tanto faz para mim'])
  );

  const free=document.createElement('label');free.className='form-field work-free-field';
  free.innerHTML='<span>6. Agora me conta do seu jeito ✦</span><strong style="display:block;margin-top:6px">O que você gostaria de fazer na internet?</strong><small class="choice-hint" style="display:block;margin:8px 0 10px">Pode me contar o que você pensa em mostrar, compartilhar, divulgar ou construir. Não precisa explicar bonito nem ter tudo decidido. Escreva do seu jeito.</small>';
  const area=document.createElement('textarea');area.rows=6;area.placeholder='Escreva livremente aqui...';area.value=business.freeContext||'';
  area.addEventListener('input',()=>{business.freeContext=area.value});
  free.appendChild(area);
  const optional=document.createElement('small');optional.className='choice-hint';optional.textContent='Se ainda não souber direito, tudo bem. Conte apenas o que você já sabe. Este campo é opcional.';free.appendChild(optional);
  form.appendChild(free);

  form.appendChild(primary(first?'SALVAR E DESTRAVAR ✦':'SALVAR MINHAS INFORMAÇÕES',async()=>{
    const goals=Array.isArray(business.mainGoal)?business.mainGoal:[];
    if(!business.name||!business.activity||!goals.length){showToast('Só falta seu nome, o que faz parte da sua vida e o que você quer conseguir na internet.');return}
    business.objective=goals.join(', ');
    business.service=business.activity;business.business=business.business||business.activity;
    await syncToCloud();showToast(first?'Agora eu conheço você. Vamos destravar ✦':'Informações atualizadas ✨');navigate('home');
  }));
  root.appendChild(panel);
}
function cleanText(v){return String(v||'').replace(/\\*\\*/g,'').replace(/^#+\\s*/gm,'').trim()}
function copyBtn(label,text){const b=document.createElement('button');b.className='plan-copy';b.textContent='▣ '+label;b.onclick=async(e)=>{e.stopPropagation();try{await navigator.clipboard.writeText(text);showToast('Copiado!')}catch{showToast('Selecione o texto para copiar')}};return b}
function storyCard(story){const d=document.createElement('div');d.className='story-card';d.innerHTML=`<b>${cleanText(story.title)}</b>${story.show?`<p>📷 <strong>O que mostrar:</strong><br>${cleanText(story.show)}</p>`:''}${story.say?`<p>💬 <strong>O que falar:</strong><br>${cleanText(story.say)}</p>`:''}${story.screenText?`<p>Ｔ <strong>Texto na tela:</strong><br>${cleanText(story.screenText)}</p>`:''}${story.interaction?`<p>↗ <strong>Interação:</strong><br>${cleanText(story.interaction)}</p>`:''}`;return d}
function accordion(num,icon,title,badge,content,open=false){const box=document.createElement('section');box.className='plan-accordion'+(open?' open':'');const head=document.createElement('button');head.className='plan-accordion-head';head.innerHTML=`<span class="plan-num">${num}</span><span class="plan-aicon">${icon}</span><span class="plan-atitle">${title}</span><small>${badge||''}</small><span class="chev">⌄</span>`;const inside=document.createElement('div');inside.className='plan-accordion-body';inside.append(content);head.onclick=()=>box.classList.toggle('open');box.append(head,inside);return box}
function parsePlan(item){if(item.plan)return item.plan;try{return JSON.parse(item.text)}catch{return null}}
function showResult(item){
  const p=parsePlan(item);if(!p){showLegacyResult(item);return}
  const page=document.createElement('div');page.className='plan-page movement-page';
  const top=document.createElement('header');top.className='plan-top';top.innerHTML='<button class="plan-back">‹</button><div><h1>Seu movimento de hoje está pronto.</h1><p>É só seguir. O Destrave já pensou por você.</p></div>';top.querySelector('button').onclick=()=>render();page.append(top);

  if(p.needsInput){
    const ask=document.createElement('section');ask.className='plan-hero movement-question';
    ask.innerHTML='<small>SÓ PRECISO DE UMA COISA</small><h2></h2><p>Responda isso e o Destrave termina seu movimento sem devolver a estratégia para você.</p>';
    ask.querySelector('h2').textContent=cleanText(p.question||'Conte esse detalhe para continuar.');
    page.append(ask);
    const actions=document.createElement('div');actions.className='plan-actions';
    const redo=primary('↻ VOLTAR E RESPONDER',()=>navigate('daily'));actions.append(redo);page.append(actions);
    app.replaceChildren(page);window.scrollTo(0,0);return;
  }

  const hero=document.createElement('section');hero.className='plan-hero';
  hero.innerHTML='<small>SEU MOVIMENTO DE HOJE ✦</small><h2></h2><p></p><button type="button">▶ COMEÇAR</button>';
  hero.querySelector('h2').textContent=cleanText(p.movementTitle||'Seu próximo movimento');
  hero.querySelector('p').textContent=cleanText(p.why||'');
  page.append(hero);

  const body=document.createElement('main');body.className='plan-main movement-main';
  body.innerHTML='<h2>Faça assim</h2>';
  const steps=document.createElement('section');steps.className='movement-steps';
  (p.steps||[]).forEach((x,i)=>{
    const card=document.createElement('div');card.className='plan-detail movement-step';
    card.innerHTML='<b class="movement-step-num"></b><h3></h3><p></p>';
    card.querySelector('b').textContent=String(i+1);
    card.querySelector('h3').textContent=cleanText(x.title||('Passo '+(i+1)));
    card.querySelector('p').textContent=cleanText(x.instruction||'');
    steps.append(card);
  });
  body.append(steps);

  if((p.readyToUse||[]).length){
    const ready=document.createElement('section');ready.className='plan-check movement-ready';
    ready.innerHTML='<h3>✦ Pronto para usar</h3>';
    (p.readyToUse||[]).forEach(x=>{
      const d=document.createElement('div');d.className='plan-detail movement-ready-item';
      d.innerHTML='<strong></strong><p></p>';d.querySelector('strong').textContent=cleanText(x.label||'Texto');d.querySelector('p').textContent=cleanText(x.text||'');ready.append(d);
    });
    if(p.copyText) ready.append(copyBtn('COPIAR TEXTO',p.copyText));
    body.append(ready);
  }

  if((p.where||[]).length){
    const where=document.createElement('section');where.className='plan-check movement-where';
    where.innerHTML='<h3>Onde isso pode entrar</h3><p></p>';
    where.querySelector('p').textContent=p.where.map(cleanText).join(' • ');
    body.append(where);
  }

  if((p.extra||[]).length){
    const extra=document.createElement('section');extra.className='plan-check movement-extra';
    extra.innerHTML='<h3>Se quiser se movimentar um pouco mais</h3>';
    p.extra.slice(0,2).forEach(x=>{const pEl=document.createElement('p');pEl.textContent=cleanText(x);extra.append(pEl)});
    body.append(extra);
  }

  const done=document.createElement('section');done.className='plan-check movement-done';
  done.innerHTML='<h3>☑ Antes de terminar</h3><label><input type="checkbox"> Fiz o movimento de hoje</label>';
  body.append(done);

  const actions=document.createElement('div');actions.className='plan-actions';
  const save=primary('✦ SALVAR MEU MOVIMENTO',async()=>{await syncToCloud();showToast('Movimento salvo ✦')});
  const redo=primary('↻ CRIAR OUTRA VERSÃO',()=>regenerate(item));actions.append(save,redo);body.append(actions);
  page.append(body);app.replaceChildren(page);window.scrollTo(0,0);
  const startBtn=hero.querySelector('button');startBtn.onclick=()=>body.scrollIntoView({behavior:'smooth',block:'start'});
}
function showLegacyResult(item){const page=document.createElement('div');page.className='result-page';page.innerHTML='<div class="result-header"><button class="result-back">‹</button><div><strong>Conteúdo anterior</strong><span>Gerado antes do novo formato.</span></div></div><div class="result-body"><div class="result-full-text"></div></div>';page.querySelector('.result-full-text').textContent=cleanText(item.text);page.querySelector('.result-back').onclick=()=>render();app.replaceChildren(page)}
async function regenerate(item){const stopGenerating=showGenerating();try{const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-destrave-client':clientId},body:JSON.stringify({goal:(item.title||'').split(':')[0]||'Movimentar',topic:(item.title||'').split(':').slice(1).join(':').trim()||business.objective,requestedFormat:item.requestedFormat||'Livre',redo:true})});const data=await r.json();if(!data.ok)throw new Error('generation_failed');const fresh={...item,id:Date.now(),created:new Date().toLocaleDateString('pt-BR'),text:data.text,plan:data.plan||null,model:data.model||'gemini'};contents.unshift(fresh);await syncToCloud();stopGenerating();showResult(fresh)}catch(e){stopGenerating();showToast('Não consegui criar outra versão agora. Tente novamente em alguns instantes. ✦')}}

function addProfile(root){
  const panel=document.createElement('main');panel.className='rebuilt-page rebuilt-profile';
  const name=business.name||'Seu nome', initial=(name.trim()[0]||'D').toUpperCase();
  panel.innerHTML=`
    <header class="rebuilt-head"><div><h1>Perfil</h1><p>Seus dados, acesso e preferências.</p></div></header>
    <section class="profile-hero"><div class="avatar">${initial}</div><div class="profile-ident"><h2></h2><p class="profile-email">Dados da sua conta</p><span>✦ Acesso ativo</span></div><button class="edit-work" type="button">✎ Editar dados</button></section>
    <section class="rebuilt-card"><h2>Meu acesso</h2><button class="setting-row plan-row" type="button"><b>♔</b><span><strong>Plano</strong><small>Destrave</small></span><em>Ativo</em></button><div class="setting-row static"><b>▣</b><span><strong>Acesso</strong><small>Seus conteúdos e memória ficam vinculados ao seu perfil.</small></span></div></section>
    <section class="rebuilt-card"><h2>Preferências</h2><label class="setting-row"><b>♧</b><span><strong>Lembrete diário</strong><small>Receber um impulso para executar</small></span><input class="pref-toggle" data-key="dailyReminder" type="checkbox"></label><label class="setting-row"><b>✉</b><span><strong>Novidades do Destrave</strong><small>Atualizações e novos recursos</small></span><input class="pref-toggle" data-key="news" type="checkbox"></label></section>
    <section class="rebuilt-card"><h2>Segurança e ajuda</h2><button class="setting-row action-password" type="button"><b>♙</b><span><strong>Alterar minha senha</strong><small>Atualize sua senha de acesso</small></span><i>›</i></button><button class="setting-row action-forgot" type="button"><b>?</b><span><strong>Esqueci minha senha</strong><small>Recupere seu acesso</small></span><i>›</i></button><button class="setting-row action-support" type="button"><b>◯</b><span><strong>Falar com o suporte</strong><small>Atendimento e ajuda</small></span><i>›</i></button></section>
    <button class="profile-logout" type="button">SAIR DA MINHA CONTA</button>`;
  panel.querySelector('.profile-ident h2').textContent=name;
  panel.querySelector('.edit-work').onclick=()=>navigate('work');
  const prefs=readJSON('destrave-preferences',{dailyReminder:true,news:true});
  panel.querySelectorAll('.pref-toggle').forEach(t=>{t.checked=prefs[t.dataset.key]!==false;t.onchange=()=>{prefs[t.dataset.key]=t.checked;writeJSON('destrave-preferences',prefs);showToast('Preferência atualizada ✦')}});
  panel.querySelector('.plan-row').onclick=()=>showToast('Seu acesso ao Destrave está ativo ✦');
  panel.querySelector('.action-password').onclick=()=>showToast('Alteração de senha será conectada ao acesso da conta.');
  panel.querySelector('.action-forgot').onclick=()=>showToast('Recuperação de senha será conectada ao acesso da conta.');
  panel.querySelector('.action-support').onclick=()=>{window.location.href='https://wa.me/5573982083851?text='+encodeURIComponent('Olá! Preciso de ajuda com o Destrave.');};
  panel.querySelector('.profile-logout').onclick=()=>{localStorage.removeItem('destrave-session');navigate('login')};
  root.appendChild(panel);
}
function addAlpha(root){
  const header=document.createElement('div');
  header.className='alpha-clean-header';
  header.innerHTML='<strong>Alpha</strong><span>A comunidade dos Imparáveis.</span>';
  root.appendChild(header);
  root.appendChild(button('63%','20%','74%','6%',()=>showToast('Você será avisada assim que a Comunidade Alpha abrir ✨'),'Quero ser avisado'));
}

function render(){
  const data=screens[current]||screens.home;
  const root=document.createElement('section'); root.className='screen';
  const image=document.createElement('img'); image.className='screen-image'; image.alt=data.asset===1?'Login Destrave':`Tela ${current}`;
  image.src=`/assets/reference/asset_${data.asset}.jpg`;
  root.appendChild(image);
  if(current==='login') { addLogin(root); } else {
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

history.replaceState({destraveScreen:current},'',location.href);
render();
if(localStorage.getItem('destrave-session')) syncFromCloud().then(ok=>{if(ok){current=isConfigured()?'home':'work';render()}});
