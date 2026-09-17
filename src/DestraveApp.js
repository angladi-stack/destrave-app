import React, { useEffect, useState } from 'react';
import './destrave.css';
import { activityIcon, dailyImpulse, iconLibrary } from './contentLibrary';
import { auth, db } from './firebase';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';

const nav = [['inicio','⌂','Início'],['conteudo','▤','Conteúdo'],['trabalho','▣','Meu trabalho'],['perfil','♙','Perfil'],['alpha','✦','Alpha']];
const Button=({children,onClick,kind=''})=><button onClick={onClick} className={'btn '+kind}>{children}</button>;
const Title=({children,sub})=><header className="title"><div><h1>{children}</h1><p>{sub}</p></div><i>A</i></header>;
const Card=({children,className=''})=><section className={'card '+className}>{children}</section>;

function Sidebar({page,setPage}){return <aside><div className="logo"><span>D</span><i>▥</i><sup>✦</sup></div><nav>{nav.map(([id,icon,label])=><button key={id} className={page===id?'on':''} onClick={()=>setPage(id)}><b>{icon}</b><span>{label}</span></button>)}</nav></aside>}

function Inicio({go,name,lastContent}){return <><Title sub="Vamos criar o seu conteúdo de hoje.">Oi, {name||'Imparável'} ✦</Title><Card className="hero"><small>SEU CONTEÚDO DE HOJE</small><h2>Uma geração.<br/>Seu dia completo.</h2><p>Eu crio a estratégia e entrego tudo pronto para você executar.</p><div className="format-pill">Stories　•　Reels　•　Carrossel</div><Button onClick={()=>go('criar')}>✦　CRIAR MEU CONTEÚDO DO DIA　›</Button><span>Um movimento completo e conectado.</span></Card><div className="feature-grid"><Card><b>∞</b><p>Feito para você<strong>Entende o que você faz</strong></p></Card><Card><b>◎</b><p>Execução completa<strong>Pronto para gravar e publicar</strong></p></Card></div><div className="section-head"><h2>Últimos conteúdos</h2><button onClick={()=>go('conteudo')}>Ver todos　›</button></div><Card className="last-content"><div className="last-thumb">▶</div><div><h3>{lastContent?.title||'Bastidores que geram conexão'}</h3><p>Conteúdo completo • Conexão</p><span>Pronto para postar</span></div><b>⋮</b></Card><Card className="impulso"><div><small>✦　IMPULSO DO DIA　✦</small><h3>{dailyImpulse()}</h3></div></Card><Card className="alpha-banner" onClick={()=>go('alpha')}><b>♙</b><div><h3>Comunidade Alpha</h3><p>Comunidade dos Imparáveis • <span>Em breve</span></p></div><strong>›</strong></Card></>}

function Criar({go,generate,loading}){const [goal,setGoal]=useState('Atrair pessoas');const [subject,setSubject]=useState('');const [way,setWay]=useState('Tenho pouco tempo');return <><button className="back" onClick={()=>go('inicio')}>‹ Voltar</button><Title sub="Você responde o mínimo. Eu preparo tudo.">Faça por mim</Title><Card className="dark create-hero"><h2>Seu conteúdo do dia,<br/>todo pronto.</h2><p>Stories + Reels + Carrossel, prontos para você usar.</p></Card><Card className="form"><Question n="1" text="O que você quer conseguir hoje?"/><div className="choices">{['Vender','Atrair pessoas','Passar confiança','Ensinar','Criar conexão','Escolha por mim'].map(x=><button className={goal===x?'selected':''} onClick={()=>setGoal(x)}>{x}</button>)}</div><Question n="2" text="O que você quer divulgar hoje?"/><textarea value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Serviço, produto, música, evento ou mensagem..."/><button className="link" onClick={()=>setSubject('Escolha por mim')}>✦ Não sei. Escolha por mim.</button><Question n="3" text="Como você quer fazer hoje?"/><div className="choices">{['Aparecer e falar','Mostrar sem falar','Não quero aparecer','Tenho pouco tempo'].map(x=><button className={way===x?'selected':''} onClick={()=>setWay(x)}>{x}</button>)}</div><Button onClick={()=>generate({goal,subject,way})}>{loading?'CRIANDO...':'CRIAR MEU CONTEÚDO DO DIA　›'}</Button></Card></>}
function Question({n,text}){return <div className="question"><b>{n}</b><div><h3>{text}</h3><p>Escolha a opção que combina com hoje.</p></div></div>}

function Resultado({data,go}){let fallback='Seu carro pode parecer limpo por fora e ainda esconder sujeira onde você menos percebe. Uma limpeza bem-feita não é luxo: é cuidado e conforto.';let opening=data?.storiesOpening?.length?data.storiesOpening:[{show:'Mostre um detalhe antes de começar.',say:fallback},{show:'Mostre o trabalho acontecendo.',say:'É nos detalhes que o resultado começa a aparecer.'},{show:'Mostre o resultado pronto.',say:'Há quanto tempo você não cuida disso?'}];return <><Title sub="Siga os passos. Está tudo preparado.">Seu conteúdo do dia está pronto.</Title><Card className="dark result-hero"><small>OBJETIVO DE HOJE</small><h2>{data?.title||'Mostrar que carro limpo é cuidado, não luxo.'}</h2><p>{data?.objective||'Você só vai precisar de celular, do que deseja mostrar e luz do dia.'}</p></Card><h2>Faça nesta ordem</h2><Card><div className="step-title"><b>1</b><div><h3>Stories para começar</h3><p>Grave primeiro estes três.</p></div></div><div className="stories">{opening.slice(0,3).map((item,i)=><article key={i}><em>STORY {i+1}</em><strong>O que mostrar:</strong><p>{item.show}</p><strong>O que falar:</strong><p>“{item.say}”</p>{item.screenText&&<><strong>Texto na tela:</strong><p>{item.screenText}</p></>}</article>)}</div><Button>▣ COPIAR STORIES</Button></Card>{[['2','Reels principal',`${data?.reel?.duration||'40 segundos'} • CTA incluído`],['3','Stories para continuar',`${data?.storiesContinuation?.length||2} Stories • Continuação`],['4','Carrossel',`${data?.carousel?.slides?.length||6} slides • Legenda pronta`],['5','Story de fechamento','CTA para o próximo passo']].map(x=><Card className="step" key={x[0]}><b>{x[0]}</b><h3>{x[1]}</h3><span>{x[2]}</span><i>⌄</i></Card>)}<Card><h3>Antes de terminar</h3><div className="checks"><label><input type="checkbox"/> Stories publicados</label><label><input type="checkbox"/> Reels publicado</label><label><input type="checkbox"/> Carrossel salvo</label><label><input type="checkbox"/> Respondi quem chamou</label></div></Card><Button>✦ SALVAR MEU CONTEÚDO</Button><Button kind="outline" onClick={()=>go('criar')}>↻ CRIAR OUTRA VERSÃO</Button></>}

function Conteudo({go}){let items=[['15 SET','Mostre o sabor antes de falar do preço.','Trailer de lanche','Publicado'],['14 SET','Sua voz também conta uma história.','Cantora','Salvo'],['13 SET','O detalhe que faz a cliente voltar.','Manicure','Pronto']];return <><Title sub="Tudo o que já foi criado para você.">Meus conteúdos</Title><Button onClick={()=>go('criar')}>✦ + CRIAR CONTEÚDO DO DIA　›</Button><input className="search" placeholder="⌕  Buscar pelo assunto"/><div className="tabs"><button>Todos</button><button>Salvos</button><button>Publicados</button></div><h2>Conteúdo de hoje</h2><Card className="dark row content-feature"><div><h3>{activityIcon('lava jato')} CARRO LIMPO É CUIDADO</h3><p>Lava-jato • Atrair pessoas</p><small>{iconLibrary.stories} Stories • {iconLibrary.reels} Reels • {iconLibrary.carrossel} Carrossel</small></div><Button onClick={()=>go('resultado')}>ABRIR ›</Button></Card><h2>Outros conteúdos</h2>{items.map(x=><Card className="history"><time>{x[0]}</time><div><h3>{activityIcon(x[2])} {x[1]}</h3><p>{x[2]} • {iconLibrary.stories} Stories • {iconLibrary.reels} Reels • {iconLibrary.carrossel} Carrossel</p></div><span>{x[3]}</span><b>›</b></Card>)}<Card className="note">✦ Seu histórico ajuda o Destrave a criar algo novo, sem repetir ideias.</Card></>}

function Trabalho(){return <><Title sub="Conte uma vez. O Destrave lembra para você.">Meu trabalho</Title><Card className="dark memory-card"><small>MEMÓRIA DO DESTRAVE</small><h2>Quanto mais ele conhece você, mais certeiro fica.</h2><p>Uso estas informações para criar conteúdos com a sua realidade, sem repetir perguntas.</p></Card><Heading t="O que eu já sei"/><Card>{[['O que você faz','Lavagem e higienização de veículos'],['Para quem','Pessoas que querem cuidar bem do carro'],['Problema que resolve','Carro sujo, com manchas ou mau cheiro'],['Resultado que entrega','Um carro limpo, cuidado e agradável']].map(x=><Data a={x[0]} b={x[1]}/>)}</Card><Heading t="Seu jeito de falar"/><Card><Data a="Tom de voz" b="Natural • Direto • Confiável"/><Data a="Seu diferencial" b="Cuidado nos detalhes e atendimento rápido"/></Card><Heading t="O que você divulga"/><Card><Data a="Lavagem completa" b="Principal"/><Data a="Higienização interna" b=""/></Card><button className="add">＋ Adicionar outro</button><Card className="note"><b>O Destrave aprende com você</b><p>O que você salva e publica ajuda a criar conteúdos cada vez mais com a sua cara.</p></Card><Button>ATUALIZAR MINHAS INFORMAÇÕES ›</Button></>}
const Heading=({t})=><h2 className="heading">{t}</h2>;const Data=({a,b})=><div className="data"><i>✦</i><div><b>{a}</b><p>{b}</p></div><button>✎</button></div>;

function Perfil({user,access,onLogout,onReset}){const expires=formatExpiry(access?.expiresAt);return <><Title sub="Seus dados, acesso e preferências.">Perfil</Title><Card className="dark profile profile-card"><i>{(user?.displayName||user?.email||'A')[0].toUpperCase()}</i><div><h2>{user?.displayName||'Membro Destrave'}</h2><p>{user?.email}</p><span>Acesso ativo</span></div></Card><Heading t="Meu acesso"/><Card><Data a="Plano" b={access?.plan||'Destrave • Ativo'}/><Data a="Válido até" b={expires||'Conforme seu acesso'}/></Card><Heading t="Preferências"/><Card><Data a="Lembrete diário" b="Receber um impulso para executar"/><Data a="Novidades do Destrave" b="Atualizações e novos recursos"/></Card><Heading t="Segurança e ajuda"/><Card><button className="profile-action" onClick={onReset}>✦ Enviar link para alterar minha senha</button><a className="profile-action" href="https://wa.me/" target="_blank" rel="noreferrer">✦ Falar com o suporte pelo WhatsApp</a></Card><Button kind="outline" onClick={onLogout}>⇥ SAIR DA CONTA</Button></>}

function Alpha(){return <><Title sub="A comunidade dos Imparáveis.">Alpha</Title><Card className="alpha"><small>EM BREVE</small><h2>O próximo nível não precisa ser solitário.</h2><p>Um espaço está sendo preparado para pessoas que decidiram não abandonar o que nasceram para construir.</p></Card><Card className="dark center"><h2>Você já faz parte do começo.</h2><p>Quando a Comunidade Alpha estiver pronta, você será uma das primeiras pessoas a saber.</p><Button>✦ QUERO SER AVISADO ›</Button><small>Avisaremos você pelo contato cadastrado no seu perfil.</small></Card><Card className="quote"><h2>Imparáveis não são os que nunca travam. São os que sempre voltam a se mover.</h2></Card></>}

const MEMORY_KEY='destrave_memory_v1';
const defaultProfile={businessName:'Lavagem e higienização',products:'Lavagem completa e higienização interna',audience:'Pessoas que querem cuidar bem do carro',problemSolved:'Carro sujo, manchado ou com mau cheiro',transformation:'Carro limpo, cuidado e agradável',knownObjections:'Falta de tempo e achar que limpeza é luxo',differential:'Cuidado nos detalhes e atendimento rápido',voice:'Natural, direto e confiável',forbiddenExpressions:'oportunidade imperdível'};
function readMemory(){try{const saved=JSON.parse(localStorage.getItem(MEMORY_KEY));return saved?{profile:saved.profile||defaultProfile,contents:saved.contents||[],fingerprints:saved.fingerprints||[]}:{profile:defaultProfile,contents:[],fingerprints:[]}}catch{return {profile:defaultProfile,contents:[],fingerprints:[]}}}
function writeMemory(memory){try{localStorage.setItem(MEMORY_KEY,JSON.stringify(memory))}catch{}}
function summarize(result){return {date:new Date().toISOString(),title:result.title,objective:result.objective,fromPerception:result.fromPerception,toPerception:result.toPerception,reelHook:result.reel?.hook,cta:result.reel?.cta,carouselTitle:result.carousel?.slides?.[0]?.text}}

function formatExpiry(value){
  if(!value)return '';
  const date=value?.toDate?value.toDate():new Date(value);
  return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
}
function accessIsActive(access){
  if(!access||access.active!==true)return false;
  if(!access.expiresAt)return true;
  const expiry=access.expiresAt?.toDate?access.expiresAt.toDate():new Date(access.expiresAt);
  return expiry.getTime()>=Date.now();
}

function Login(){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const enter=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await signInWithEmailAndPassword(auth,email.trim(),password)}catch{setMessage('E-mail ou senha incorretos. Confira e tente novamente.')}finally{setBusy(false)}};
  const reset=async()=>{if(!email.trim()){setMessage('Digite seu e-mail primeiro.');return}setBusy(true);try{await sendPasswordResetEmail(auth,email.trim());setMessage('Enviamos o link para redefinir sua senha. Confira seu e-mail.')}catch{setMessage('Não encontramos esse acesso. Fale com o suporte.')}finally{setBusy(false)}};
  return <div className="login-page"><div className="login-brand"><div className="login-logo"><span>D</span><i>▥</i><sup>✦</sup></div><h1>DESTRAVE</h1><p>by Angladi</p></div><form className="login-box" onSubmit={enter}><h2>Bem-vindo ao Destrave</h2><p>Seu próximo movimento começa aqui.</p><label className="login-field"><b>✉</b><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" required/></label><label className="login-field"><b>♙</b><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" required/><span>◉</span></label><div className="login-options"><label><input type="checkbox"/> Lembrar de mim</label><button type="button" className="forgot" onClick={reset}>Esqueci minha senha</button></div>{message&&<div className="login-message">{message}</div>}<Button>{busy?'ENTRANDO...':'ENTRAR　›'}</Button><div className="login-divider"><span>Ainda não tenho acesso</span></div><a className="whatsapp" href="https://wa.me/" target="_blank" rel="noreferrer">☵　QUERO CONHECER O DESTRAVE</a><small>Seu acesso. Seu negócio em movimento.</small></form></div>
}
function AccessBlocked({user,onLogout}){return <div className="access-page"><Card className="access-box"><div className="login-logo">D<sup>✦</sup></div><small>ACESSO DESTRAVE</small><h2>Seu cadastro foi encontrado.</h2><p>O acesso ao conteúdo ainda precisa ser liberado ou renovado. Fale com o suporte para ativarmos para você.</p><p className="account-email">{user?.email}</p><a className="btn access-link" href="https://wa.me/" target="_blank" rel="noreferrer">FALAR NO WHATSAPP ›</a><button className="forgot" onClick={onLogout}>Entrar com outro e-mail</button></Card></div>}

export default function DestraveApp(){
  const initial=readMemory();
  const [memory,setMemory]=useState(initial);
  const [user,setUser]=useState(null);
  const [access,setAccess]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [page,setPage]=useState('inicio');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(initial.contents?.[0]?.full||null);
  const visualPreview=process.env.NODE_ENV==='development'&&new URLSearchParams(window.location.search).has('preview');
  useEffect(()=>onAuthStateChanged(auth,async current=>{
    setUser(current);setAccess(null);
    if(current){
      try{
        const [accessSnap,userSnap,contentsSnap]=await Promise.all([
          getDoc(doc(db,'access',current.uid)),
          getDoc(doc(db,'users',current.uid)),
          getDocs(query(collection(db,'users',current.uid,'contents'),orderBy('createdAt','desc'),limit(30)))
        ]);
        if(accessSnap.exists())setAccess(accessSnap.data());
        const cloudUser=userSnap.exists()?userSnap.data():{};
        const cloudContents=contentsSnap.docs.map(x=>x.data()).filter(x=>x.full);
        const merged={profile:{...defaultProfile,...initial.profile,...(cloudUser.profile||{})},fingerprints:cloudUser.fingerprints||initial.fingerprints||[],contents:cloudContents.length?cloudContents:initial.contents||[]};
        setMemory(merged);writeMemory(merged);if(merged.contents[0]?.full)setResult(merged.contents[0].full);
      }catch(e){console.error('Não foi possível sincronizar agora.',e)}
    }
    setAuthReady(true);
  }),[]);
  const go=p=>{setPage(p);window.scrollTo(0,0)};
  const remember=async full=>{const summary=summarize(full);const item={...summary,full};const next={...memory,contents:[item,...(memory.contents||[])].slice(0,30),fingerprints:[summary,...(memory.fingerprints||[])].slice(0,180)};setMemory(next);writeMemory(next);if(user){const id=new Date().toISOString().replace(/[:.]/g,'-');try{await Promise.all([setDoc(doc(db,'users',user.uid),{email:user.email,profile:next.profile,fingerprints:next.fingerprints,updatedAt:serverTimestamp()},{merge:true}),setDoc(doc(db,'users',user.uid,'contents',id),{...item,createdAt:serverTimestamp()})])}catch(e){console.error('Conteúdo salvo apenas neste aparelho.',e)}}};
  const generate=async form=>{
    setLoading(true);
    try{
      const recentContents=(memory.fingerprints||[]).slice(0,24);
      let r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{...memory.profile,products:form.subject||memory.profile.products},mode:'FACA_POR_MIM',format:'DIA_COMPLETO',objective:form.goal,executionStyle:[form.way],recentContents})});
      let d=await r.json();
      if(!r.ok)throw new Error(d.error||'Não foi possível gerar o conteúdo.');
      setResult(d.result);await remember(d.result);
    }catch(e){alert(e.message)}
    finally{setLoading(false);go('resultado')}
  };
  if(visualPreview){const view=page==='inicio'?<Inicio go={go} name="Angladi" lastContent={memory.contents?.[0]}/>:page==='criar'?<Criar go={go} generate={generate} loading={loading}/>:page==='resultado'?<Resultado data={result} go={go}/>:page==='conteudo'?<Conteudo go={go}/>:page==='trabalho'?<Trabalho/>:page==='perfil'?<Perfil user={{email:'angladi@email.com',displayName:'Angladi'}} access={{active:true,plan:'Destrave'}} onLogout={()=>{}} onReset={()=>{}}/>:<Alpha/>;return <div className="app"><Sidebar page={page==='criar'||page==='resultado'?'conteudo':page} setPage={go}/><main>{view}</main></div>}
  if(!authReady)return <div className="app-loading"><div className="login-logo">D<sup>✦</sup></div><p>Preparando seu Destrave...</p></div>;
  if(!user)return <Login/>;
  if(!accessIsActive(access))return <AccessBlocked user={user} onLogout={()=>signOut(auth)}/>;
  const resetPassword=async()=>{try{await sendPasswordResetEmail(auth,user.email);alert('Link enviado para '+user.email)}catch{alert('Não foi possível enviar agora. Tente novamente.')}};
  let view=page==='inicio'?<Inicio go={go} name={user.displayName||memory.profile?.name||user.email?.split('@')[0]} lastContent={memory.contents?.[0]}/>:page==='criar'?<Criar go={go} generate={generate} loading={loading}/>:page==='resultado'?<Resultado data={result} go={go}/>:page==='conteudo'?<Conteudo go={go}/>:page==='trabalho'?<Trabalho/>:page==='perfil'?<Perfil user={user} access={access} onLogout={()=>signOut(auth)} onReset={resetPassword}/>:<Alpha/>;
  return <div className="app"><Sidebar page={page==='criar'||page==='resultado'?'conteudo':page} setPage={go}/><main>{view}</main></div>
}
