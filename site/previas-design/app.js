'use strict';
// Protótipos isolados. Não há integração com autenticação, produção ou envio de dados.
const $ = selector => document.querySelector(selector);
const icons = {
  house:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12l9 3 9-3M12 12v5"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',
  crown:'<path d="m3 6 4.5 4L12 3l4.5 7L21 6l-2 13H5L3 6Z"/><path d="M6 16h12"/>',
  chat:'<path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.8-5a9 9 0 1 1 16.2-5Z"/><path d="M8 10h8M8 14h5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  spark:'<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/>',
  clean:'<path d="m15 3 6 6M18 6 8 16M6 14l4 4-6 4-2-2 4-6Z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  brush:'<path d="M4 3h13v7H4zM17 6h4v7H10v8"/>',
  tool:'<path d="M14 4a6 6 0 0 0-7 7L2 16a3 3 0 0 0 4 4l6-6a6 6 0 0 0 8-7l-4 4-3-3 4-4Z"/>',
  leaf:'<path d="M21 3C8 2 2 8 5 16c8 5 16-1 16-13ZM4 21 16 8"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
  heart:'<path d="M12 21 3.5 12.5A6 6 0 0 1 12 4a6 6 0 0 1 8.5 8.5L12 21Z"/>'
};
const icon = (name,cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.house}</svg>`;
const google = '<svg class="google-g" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10c.8-2.3 3-4.1 5.6-4.1Z"/></svg>';
const themes = {
  patio:{number:'01',name:'Pátio',tag:'Gente daqui. Ajuda de perto.',headline:'Sua casa precisa.<br><em>Alguém daqui resolve.</em>',intro:'Encontre quem cuida da sua casa ou uma oportunidade para trabalhar em Petrolina.',search:'De que ajuda você precisa?',sub:'A conexão que começa na vizinhança.'},
  conexao:{number:'02',name:'Conexão',tag:'Petrolina mais conectada',headline:'O próximo serviço.<br><em>A próxima oportunidade.</em>',intro:'Conecte sua necessidade com quem pode resolver. Simples, perto e direto ao ponto.',search:'Encontre seu próximo contato',sub:'Do que você precisa hoje?'},
  editorial:{number:'03',name:'Casa Editorial',tag:'Feito para quem faz a casa acontecer',headline:'Toda casa tem<br>uma <em>boa conexão.</em>',intro:'Talentos locais, serviços do dia a dia e novas oportunidades. Encontre o seu próximo encontro.',search:'Vamos encontrar sua ajuda?',sub:'Encontros que fazem a diferença.'}
};
const theme = themes[document.body.dataset.theme] || themes.patio;
const navItems=[['inicio','house','Início'],['servicos','search','Encontrar profissionais'],['oportunidades','briefcase','Procurando serviço'],['agenciadores','people','Para agenciadores'],['como-funciona','info','Como funciona']];
const profiles = [
  {id:'p1',name:'Marina Costa',service:'Limpeza e organização',type:'pro',region:'Centro · Petrolina',note:'Cuidado em cada detalhe da sua casa.',letter:'MC',art:'clean',color:'rose'},
  {id:'p2',name:'Rafael Lima',service:'Elétrica residencial',type:'pro',region:'Areia Branca · Petrolina',note:'Instalações, reparos e manutenção.',letter:'RL',art:'bolt',color:'blue'},
  {id:'p3',name:'Ana do Lar',service:'Limpeza e organização',type:'pro',region:'Vila Eduardo · Petrolina',note:'Uma rotina mais leve para o seu lar.',letter:'AL',art:'clean',color:'rose'},
  {id:'p4',name:'Pedro Alves',service:'Pintura e acabamentos',type:'pro',region:'Gercino Coelho · Petrolina',note:'Novas cores e um acabamento cuidadoso.',letter:'PA',art:'brush',color:'sand'},
  {id:'p5',name:'Conecta Lar',service:'Agenciamento doméstico',type:'agency',region:'Petrolina e região',note:'Aproximando famílias e profissionais.',letter:'CL',art:'people',color:'violet'},
  {id:'p6',name:'Ponte de Talentos',service:'Agenciamento doméstico',type:'agency',region:'Petrolina e região',note:'Apoio para encontrar o perfil que procura.',letter:'PT',art:'people',color:'violet'},
  {id:'p7',name:'João Pereira',service:'Reparos e montagem',type:'free',region:'José e Maria · Petrolina',note:'Pequenos consertos que fazem a diferença.',letter:'JP',art:'tool',color:'sage'},
  {id:'p8',name:'Luiza Santos',service:'Jardinagem residencial',type:'free',region:'Jardim Amazonas · Petrolina',note:'Mais vida para o seu jardim.',letter:'LS',art:'leaf',color:'sage'}
];
const requests = [
  {id:'v1',title:'Diarista para residência',name:'Família Oliveira',type:'pro',region:'Vila Eduardo',note:'Limpeza residencial · 2 vezes por semana',label:'Casa',art:'clean',color:'rose'},
  {id:'v2',title:'Pintor para área interna',name:'Residência no Centro',type:'pro',region:'Centro',note:'Pintura de dois cômodos · A combinar',label:'Casa',art:'brush',color:'sand'},
  {id:'v3',title:'Manutenção elétrica',name:'Residência no São José',type:'pro',region:'São José',note:'Revisão de tomadas · A combinar',label:'Casa',art:'bolt',color:'blue'},
  {id:'v4',title:'Limpeza após mudança',name:'Família Almeida',type:'pro',region:'Areia Branca',note:'Serviço pontual · A combinar',label:'Casa',art:'clean',color:'rose'},
  {id:'v5',title:'Auxiliar de serviços gerais',name:'Conecta Lar',type:'agency',region:'Petrolina',note:'Oportunidade intermediada · Diurno',label:'Agenciador',art:'people',color:'violet'},
  {id:'v6',title:'Cuidador para residência',name:'Ponte de Talentos',type:'agency',region:'Petrolina',note:'Oportunidade intermediada · A combinar',label:'Agenciador',art:'people',color:'violet'},
  {id:'v7',title:'Montagem de armário',name:'Morador em Petrolina',type:'free',region:'Gercino Coelho',note:'Serviço pontual · A combinar',label:'Casa',art:'tool',color:'sage'},
  {id:'v8',title:'Cuidado com jardim',name:'Residência no Centro',type:'free',region:'Centro',note:'Manutenção mensal · A combinar',label:'Casa',art:'leaf',color:'sage'}
];
let demoUser = null, pageName='inicio';
const shuffled=items=>{
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const random=new Uint32Array(1);crypto.getRandomValues(random);const j=Math.floor((random[0]/4294967296)*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
};
const previousGroups=new Map();
function takeGroup(items,count,key){
  let previous=previousGroups.get(key)||[];
  try {previous=JSON.parse(sessionStorage.getItem('aec-design-'+key)||'[]');}catch{/* A prévia funciona com armazenamento bloqueado. */}
  const first=shuffled(items.filter(item=>!previous.includes(item.id))),remaining=shuffled(items.filter(item=>previous.includes(item.id)));
  const chosen=[...first,...remaining].slice(0,count);previousGroups.set(key,chosen.map(item=>item.id));
  try{sessionStorage.setItem('aec-design-'+key,JSON.stringify(chosen.map(item=>item.id)));}catch{/* Sem persistência, a alternância funciona em memória. */}
  return chosen;
}
let featuredProfiles=[],featuredRequests=[];
const selectFour=(items,key)=>[
  ...takeGroup(items.filter(x=>x.type==='pro'),2,key+'-pro'),
  ...takeGroup(items.filter(x=>x.type==='agency'),1,key+'-agency'),
  ...takeGroup(items.filter(x=>x.type==='free'),1,key+'-free')
];
function refreshSelection(){featuredProfiles=selectFour(profiles,'services');featuredRequests=selectFour(requests,'requests');}
refreshSelection();
const badge = item => item.type==='pro'?`<span class="badge badge-pro">${icon('crown')} PRO</span>`:item.type==='agency'?'<span class="badge badge-agency">Agenciador</span>':'<span class="badge badge-basic">Básico</span>';
const navMarkup=()=>navItems.map(([id,symbol,label])=>`<a href="#${id}" data-route="${id}"${id===pageName?' aria-current="page"':''}>${icon(symbol)}<span>${label}</span>${icon('chevron','nav-chevron')}</a>`).join('');
const brand=`<a class="brand" href="#inicio" data-route="inicio"><span class="brand-mark">${icon('house')}</span><span>Ajuda em Casa<small>PETROLINA · PE</small></span></a>`;
$('#app').innerHTML=`
  <a class="skip" href="#conteudo">Pular para o conteúdo</a>
  <div class="preview-bar"><a href="index.html">${icon('arrow')} Voltar às 3 opções</a><span>PRÉVIA ${theme.number} · ${theme.name}</span><span class="preview-status">Dados fictícios · Não é o app real</span></div>
  <header class="top-header"><div class="top-header-inner"><button class="menu-toggle icon-btn" aria-label="Abrir menu" aria-controls="menu" aria-expanded="false">${icon('menu')}</button>${brand}<span class="header-location">${icon('pin')} Petrolina, PE</span><button class="login-button" data-route="conta">${google}<span>Entrar com Google</span></button></div></header>
  <div class="workspace"><button class="menu-backdrop" aria-label="Fechar menu" hidden></button><aside id="menu" class="sidebar"><div class="sidebar-brand">${brand}</div><div class="sidebar-caption">SEU DIA MAIS FÁCIL<button class="menu-close icon-btn" aria-label="Fechar menu">${icon('close')}</button></div><nav aria-label="Menu principal">${navMarkup()}</nav><div class="sidebar-bottom"><div class="local-note">${icon('heart')}<p>Uma rede de gente<br><strong>que faz acontecer.</strong></p></div><button class="account-link" data-route="conta">${icon('user')}<span>Meu perfil</span>${icon('chevron')}</button><a class="proposal-link" href="index.html">Comparar propostas ${icon('arrow')}</a></div></aside><main id="conteudo" tabindex="-1"></main></div>
  <footer class="footer"><span>Ajuda em Casa · Petrolina, PE</span><span>Prévia de design · Todos os perfis são fictícios</span><a href="index.html">Ver as 3 opções</a></footer>
  <dialog id="detail-dialog" aria-labelledby="detail-title"><button class="dialog-close icon-btn" aria-label="Fechar detalhes">${icon('close')}</button><div id="detail-content"></div></dialog><div id="toast" role="status" hidden></div>`;

const searchMarkup=(compact=false)=>`<form class="search-form ${compact?'compact-search':''}" role="search"><label for="busca">${theme.search}</label><div class="search-input-row">${icon('search')}<input id="busca" type="search" name="q" placeholder="Busque por serviço ou nome" autocomplete="off"><button type="submit" class="btn primary">Buscar ${icon('arrow')}</button></div></form>`;
const categories=()=>`<div class="category-row" aria-label="Buscas rápidas">${[['clean','Limpeza'],['bolt','Elétrica'],['brush','Pintura'],['tool','Reparos'],['leaf','Jardinagem']].map(([symbol,label])=>`<button data-category="${label}">${icon(symbol)}${label}</button>`).join('')}</div>`;
function hero(){
  const illustration=`<div class="hero-illustration" aria-hidden="true"><svg viewBox="0 0 320 250" fill="none"><circle cx="164" cy="126" r="110" fill="currentColor" opacity=".08"/><path d="m64 129 96-83 95 83v98H64Z" fill="var(--hero-house)"/><path d="m51 130 109-94 109 94" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M139 227v-77h45v77" fill="var(--hero-door)"/><rect x="87" y="141" width="30" height="31" rx="7" fill="var(--hero-door)"/><rect x="204" y="141" width="30" height="31" rx="7" fill="var(--hero-door)"/><path d="M41 225h241" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M260 225v-45m0 22c-17 0-24-17-21-27 17 0 24 15 21 27Zm0-14c17 0 24-17 21-27-17 0-24 15-21 27Z" fill="var(--hero-leaf)"/><circle cx="248" cy="53" r="20" fill="var(--hero-sun)"/></svg><span class="hero-art-label">${icon('pin')} Aqui em Petrolina</span></div>`;
  return `<section class="hero"><div class="hero-text"><span class="eyebrow"><span class="status-dot"></span>${theme.tag}</span><h1>${theme.headline}</h1><p>${theme.intro}</p>${document.body.dataset.theme==='editorial'?'':searchMarkup()}</div>${illustration}${document.body.dataset.theme==='editorial'?searchMarkup():''}</section>${categories()}`;
}
function serviceCard(p,index){
  return `<article class="service-card type-${p.type}"><div class="card-art art-${p.color}"><span class="card-art-icon">${icon(p.art)}</span><span class="card-art-index">${String(index+1).padStart(2,'0')}</span>${badge(p)}</div><div class="card-body"><div class="person-line"><span class="avatar avatar-${p.color}">${p.letter}</span><div><h3>${p.name}</h3><p>${p.service}</p></div></div><p class="card-description">${p.note}</p><p class="card-region">${icon('pin')}${p.region}</p><div class="card-actions"><button class="btn contact" data-detail="${p.id}">${icon('chat')} Pedir orçamento</button><button class="icon-btn details" data-detail="${p.id}" aria-label="Ver perfil de ${p.name}">${icon('arrow')}</button></div></div></article>`;
}
function requestCard(v){
  return `<article class="request-card type-${v.type}"><div class="request-top"><span class="opportunity-icon art-${v.color}">${icon(v.art)}</span>${badge(v)}</div><span class="request-kind">${v.label} procura</span><h3>${v.title}</h3><p class="request-author">${v.name}</p><p class="request-description">${v.note}</p><p class="card-region">${icon('pin')}${v.region}</p><button class="request-link" data-detail="${v.id}">Ver oportunidade ${icon('arrow')}</button></article>`;
}
const sectionHeader=(kind)=>`<div class="section-header"><div><span class="section-kicker">${kind==='servicos'?'QUEM FAZ, BEM PERTO':'QUEM PRECISA DA SUA AJUDA'}</span><h2>${kind==='servicos'?'SERVIÇOS OFERTADOS':'PROCURANDO SERVIÇO'}</h2><p>${kind==='servicos'?'Conheça profissionais e encontre a ajuda certa.':'Casas e agenciadores com oportunidades para você.'}</p></div><button class="text-button" data-route="${kind==='servicos'?'servicos':'oportunidades'}">Ver todos ${icon('arrow')}</button></div>`;
function home(){
  return `${hero()}<section class="directory">${sectionHeader('servicos')}<div class="cards-grid">${featuredProfiles.map(serviceCard).join('')}</div></section><section class="opportunities">${sectionHeader('oportunidades')}<div class="requests-grid">${featuredRequests.map(requestCard).join('')}</div></section><section class="join-strip"><span class="join-icon">${icon('spark')}</span><div><span class="eyebrow">SEU TRABALHO MERECE SER VISTO</span><h2>Tem talento para oferecer?</h2><p>Seu próximo cliente pode estar bem aqui.</p></div><button class="btn primary" data-route="cadastro">Quero divulgar meu trabalho ${icon('arrow')}</button></section><div class="rotation-note"><span>${icon('info')} Amostra visual: 2 PRO, 1 agenciador e 1 básico. Os contatos alternam em cada grupo.</span><button class="text-button" data-rotate>Simular nova visita ${icon('arrow')}</button></div>`;
}
function listPage(kind,query=''){
  const isService=kind==='servicos',list=isService?profiles:requests,filtered=list.filter(x=>JSON.stringify(x).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return `<section class="inner-page"><div class="page-eyebrow">${icon(isService?'search':'briefcase')} ${isService?'A AJUDA CERTA PARA VOCÊ':'SUA PRÓXIMA OPORTUNIDADE'}</div><h1>${isService?'Encontre quem resolve.':'Seu trabalho encontra um lugar.'}</h1><p class="page-intro">${isService?'Explore os serviços disponíveis na prévia.':'Casas e agenciadores que procuram profissionais.'}</p>${searchMarkup(true)}<div class="list-meta"><span>${filtered.length} ${isService?'perfis':'oportunidades'} fictícios nesta prévia</span><span>PRO → Agenciadores → Básicos</span></div><div class="${isService?'cards-grid':'requests-grid'}">${filtered.length?filtered.map(isService?serviceCard:requestCard).join(''):'<div class="empty-state"><h2>Nenhum resultado nesta prévia</h2><p>Experimente limpeza, elétrica, pintura ou reparos.</p><button class="btn primary" data-route="servicos">Ver todos os serviços</button></div>'}</div></section>`;
}
function account(){
  if(!demoUser) return `<section class="inner-page account-page"><span class="eyebrow">SUA CONTA, SEU CAMINHO</span><h1>Bom ter você por aqui.</h1><p class="page-intro">Uma entrada simples para contratar, trabalhar ou agenciar.</p><div class="account-panel"><span class="account-icon">${icon('user')}</span><h2>Entre para continuar</h2><p>No site real, este espaço usará o Google já conectado. Aqui você pode experimentar o design sem informar dados.</p><div class="simulation-note">SIMULAÇÃO · Nenhum login Google será realizado.</div><button class="google-demo-button" data-login="regular">${google} Simular conta de visitante</button><button class="btn secondary" data-login="admin">Simular minha conta de administrador</button><p class="small-muted">A opção de administração aparece apenas dentro do perfil autorizado.</p></div></section>`;
  return `<section class="inner-page account-page"><span class="eyebrow">CONTA SIMULADA · PRÉVIA DE DESIGN</span><h1>Olá, ${demoUser==='admin'?'Geraldo':'visitante'}.</h1><p class="page-intro">O que você quer fazer hoje?</p><div class="profile-head"><span class="avatar avatar-sage">${demoUser==='admin'?'GA':'VC'}</span><div><h2>${demoUser==='admin'?'Meu perfil':'Perfil de demonstração'}</h2><p>Esta conta existe apenas nesta prévia.</p></div><button class="text-button" data-logout>Sair da simulação</button></div><div class="account-choices"><button data-route="servicos">${icon('search')}<h3>Quero contratar</h3><p>Encontre alguém para cuidar da sua casa.</p>${icon('arrow')}</button><button data-route="oportunidades">${icon('briefcase')}<h3>Quero trabalhar</h3><p>Explore oportunidades na sua região.</p>${icon('arrow')}</button><button data-route="agenciadores">${icon('people')}<h3>Quero agenciar</h3><p>Conecte talentos a quem precisa.</p>${icon('arrow')}</button></div>${demoUser==='admin'?`<div class="admin-entry">${icon('shield')}<div><span class="eyebrow">ACESSO DO ADMINISTRADOR</span><h2>Painel do Administrador</h2><p>Gerencie solicitações, cadastros e sua comunidade.</p></div><button class="btn primary" data-route="painel-demo">Abrir painel ${icon('arrow')}</button></div>`:''}</section>`;
}
function infoPage(){return `<section class="inner-page"><span class="eyebrow">GENTE BOA SE ENCONTRA AQUI</span><h1>Da sua necessidade<br>à primeira conversa.</h1><p class="page-intro">Uma conexão simples, com espaço para os dois lados.</p><div class="steps-grid">${[['01','Encontre','Escolha o serviço e veja os profissionais da sua região.','search'],['02','Converse','Peça um orçamento diretamente e combine os detalhes.','chat'],['03','Combine','Confirme serviço, disponibilidade e condições antes de contratar.','house']].map(([n,title,text,symbol])=>`<article><span class="step-number">${n}</span>${icon(symbol)}<h2>${title}</h2><p>${text}</p></article>`).join('')}</div><div class="notice-card"><h2>Clareza em cada escolha</h2><p>PRO é uma apresentação de plano, não uma garantia de qualidade ou verificação. Agenciadores devem informar suas condições antes de qualquer acordo. A prévia não recebe avaliações, pagamentos ou contatos reais.</p></div><button class="btn primary" data-route="inicio">Voltar ao início ${icon('arrow')}</button></section>`;}
function agencyPage(){return `<section class="inner-page"><span class="eyebrow">CONEXÕES QUE ABREM PORTAS</span><h1>Talentos de um lado.<br>Oportunidades do outro.</h1><p class="page-intro">Um espaço organizado para apresentar oportunidades e aproximar famílias e profissionais.</p><div class="agency-hero">${icon('people')}<div><h2>Seu trabalho é conectar pessoas.</h2><p>Apresente o agenciamento com clareza. O profissional deve conhecer as condições e o responsável pela oportunidade.</p><button class="btn primary" data-route="cadastro">Quero criar meu perfil ${icon('arrow')}</button></div></div><h2 class="subheading">Agenciadores nesta prévia</h2><div class="cards-grid">${profiles.filter(x=>x.type==='agency').map(serviceCard).join('')}</div></section>`;}
function registerPage(){return `<section class="inner-page account-page"><span class="eyebrow">NOVO CADASTRO · SIMULAÇÃO</span><h1>Vamos mostrar o seu talento.</h1><p class="page-intro">Esta é uma demonstração do formulário, sem envio ou armazenamento.</p><form class="register-form"><label>Como quer participar?<select><option>Oferecer serviços</option><option>Procurar trabalho</option><option>Publicar uma oportunidade</option><option>Agenciar profissionais</option></select></label><label>Seu nome<input placeholder="Nome de demonstração" maxlength="100"></label><label>Serviço ou profissão<input placeholder="Ex.: limpeza residencial" maxlength="100"></label><p class="simulation-note">Não informe dados reais. Nada será enviado.</p><button class="btn primary" type="submit">Ver confirmação da prévia ${icon('arrow')}</button></form></section>`;}
function adminPage(){
  if(demoUser!=='admin')return account();
  return `<section class="inner-page"><span class="eyebrow">ÁREA DO ADMINISTRADOR · DADOS ILUSTRATIVOS</span><h1>Cuidar da rede,<br>de um jeito mais simples.</h1><p class="page-intro">Demonstração visual. Os números e nomes abaixo são fictícios.</p><div class="stats-grid"><article><span>Solicitações para revisar</span><strong>06</strong><small>Fila de exemplo</small></article><article><span>Cadastros da comunidade</span><strong>48</strong><small>Total ilustrativo</small></article><article><span>Alertas de moderação</span><strong>02</strong><small>Exemplos de análise</small></article></div><div class="notice-card"><h2>Um acesso dentro da sua conta</h2><p>O painel não aparece no menu público. No aplicativo real, a permissão continua sendo conferida pelo servidor; esconder o botão não substitui a proteção dos dados.</p><button class="btn secondary" data-route="conta">Voltar ao meu perfil</button></div></section>`;
}
function render(route=pageName,options={}){
  pageName=route;
  const renders={inicio:home,servicos:()=>listPage('servicos',options.query||''),oportunidades:()=>listPage('oportunidades',options.query||''),conta:account,'como-funciona':infoPage,agenciadores:agencyPage,cadastro:registerPage,'painel-demo':adminPage};
  $('#conteudo').innerHTML=(renders[route]||home)();
  document.querySelector('#menu nav').innerHTML=navMarkup();
  const btn=$('.login-button');btn.innerHTML=demoUser?`${icon('user')}<span>Meu perfil</span>`:`${google}<span>Entrar com Google</span>`;
  const lastScroll=scrollY;closeMenu();
  if(!options.keepScroll){scrollTo({top:0,behavior:'instant'});if(options.focus)$('#conteudo').focus({preventScroll:true});}else scrollTo(0,lastScroll);
}
function closeMenu(){const menu=$('#menu');menu.classList.remove('is-open');$('.menu-toggle').setAttribute('aria-expanded','false');$('.menu-backdrop').hidden=true;document.body.classList.remove('menu-open');}
function openMenu(){$('#menu').classList.add('is-open');$('.menu-toggle').setAttribute('aria-expanded','true');$('.menu-backdrop').hidden=false;document.body.classList.add('menu-open');$('.menu-close').focus();}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>{$('#toast').hidden=true;},4200);}
function detail(id){
  const p=profiles.find(x=>x.id===id),v=requests.find(x=>x.id===id),item=p||v;if(!item)return;
  const service=p?p.service:v.title;
  const message=`Olá, ${p?p.name:v.name}! Encontrei ${p?'seu cadastro':'sua oportunidade'} no site Ajuda em Casa (ajudaemcasa). Gostaria de ${p?'pedir um orçamento de':'conversar sobre'} ${service.toLocaleLowerCase('pt-BR')}.`;
  $('#detail-content').innerHTML=`<span class="eyebrow">PERFIL FICTÍCIO · PRÉVIA</span><h2 id="detail-title">${p?p.name:v.title}</h2>${badge(item)}<p class="detail-service">${service}</p><p>${p?p.note:v.note}</p><p class="card-region">${icon('pin')}${item.region}</p><div class="message-preview"><h3>Mensagem que acompanharia o contato</h3><p>${message}</p></div><p class="small-muted">Na prévia, nenhum WhatsApp é aberto. Nenhuma conversa, avaliação ou pagamento é enviado.</p><button class="btn primary" data-close-detail>Entendi, voltar à prévia</button>`;
  $('#detail-dialog').showModal();
}
document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  if(target.dataset.route){event.preventDefault();const route=target.dataset.route;history.replaceState(null,'','#'+route);render(route,{focus:true});}
  if(target.dataset.category){render('servicos',{query:target.dataset.category,focus:true});$('#busca').value=target.dataset.category;}
  if(target.hasAttribute('data-rotate')){refreshSelection();render('inicio',{keepScroll:true});toast('Nova visita simulada: os contatos alternaram dentro da prioridade.');}
  if(target.dataset.login){demoUser=target.dataset.login;render('conta',{focus:true});}
  if(target.hasAttribute('data-logout')){demoUser=null;render('conta',{focus:true});}
  if(target.dataset.detail)detail(target.dataset.detail);
  if(target.matches('.menu-toggle'))openMenu();
  if(target.matches('.menu-close,.menu-backdrop')){closeMenu();$('.menu-toggle').focus();}
  if(target.matches('.dialog-close,[data-close-detail]'))$('#detail-dialog').close();
});
document.addEventListener('submit',event=>{
  if(event.target.matches('.search-form')){event.preventDefault();const query=new FormData(event.target).get('q').trim();const kind=pageName==='oportunidades'?'oportunidades':'servicos';render(kind,{query,focus:true});$('#busca').value=query;}
  if(event.target.matches('.register-form')){event.preventDefault();toast('Cadastro apenas simulado. Nenhum dado foi enviado ou salvo.');}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('#menu').classList.contains('is-open')){closeMenu();$('.menu-toggle').focus();}
  if(event.key==='Tab'&&$('#menu').classList.contains('is-open')){const focusables=[...$('#menu').querySelectorAll('a,button')].filter(x=>x.getClientRects().length);const first=focusables[0],last=focusables.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
addEventListener('hashchange',()=>render(location.hash.slice(1)||'inicio',{focus:true}));
render(location.hash.slice(1)||'inicio');
