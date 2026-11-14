import { ACCOUNT_ROLES, validateAccountDraft } from './conta.mjs?v=77f496c8aac1';
import { authConfigured, authErrorMessage } from './auth-service.mjs?v=77f496c8aac1';
import { commercialOffer } from './comercial.mjs?v=77f496c8aac1';
import {formatPhone,phoneDigits} from './telefone.mjs?v=77f496c8aac1';
import {beginLoading,withLoading} from './carregamento.mjs?v=77f496c8aac1';
import {accountObjectives} from './objetivos.mjs?v=77f496c8aac1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const roles={
  contractor:{label:'Quero contratar',title:'Publique uma oportunidade',icon:'⌂',description:'Encontre profissionais ou divulgue uma oportunidade de trabalho.'},
  worker:{label:'Quero divulgar meu serviço',title:'Escolha como quer trabalhar',icon:'◉',description:'Busque emprego com carteira assinada ou divulgue serviços avulsos e diárias.'},
  agency:{label:'Quero agenciar empregos',title:'Agencie empregos',icon:'▦',description:'Organize oportunidades e aproxime contratantes de profissionais.'}
};
const workerGoals={
  jobseeker:'Quero ser contratado com carteira assinada',
  service:'Divulgar meus serviços de forma avulsa (sem carteira assinada / na diária)'
};
const validRole=role=>ACCOUNT_ROLES.some(item=>item.id===role)?role:'';

export function roleLandingMarkup(role) {
  const current=roles[validRole(role)]||roles.contractor;
  const content={
    contractor:`<a class="btn primary" href="#publicar-vaga">Publicar oportunidade · básico grátis</a><a class="btn secondary" href="#publicar-vaga-pro">Destacar minha oportunidade · PRO</a><button class="btn secondary" type="button" data-browse-mode="professionals">Encontrar profissionais sem publicar vaga</button><a class="btn secondary" href="#agenciar">Quero publicar como agenciador</a>`,
    worker:`<a class="btn primary" href="#cadastro"><span>Serviço avulso / diária<small>Divulgar meus serviços de forma avulsa (sem carteira assinada / na diária)</small></span></a><a class="btn secondary" href="#cadastro-emprego"><span>Emprego com carteira assinada<small>Divulgar meu perfil para ser contratado com carteira assinada</small></span></a><button class="btn secondary" type="button" data-browse-mode="jobs">Ver oportunidades de trabalho</button>`,
    agency:`<button class="btn primary" type="button" data-open-account="agency">Criar meu perfil de agenciador</button><a class="btn secondary" href="#agenciador">Preparar uma oportunidade</a><button class="btn secondary" type="button" data-browse-mode="jobseekers">Encontrar pessoas procurando emprego</button>`
  };
  return `<section class="role-landing profile-role-${esc(role)}"><span class="eyebrow">SEU OBJETIVO, SEU CAMINHO</span><h2 id="dialog-title">${current.icon} ${current.title}</h2><p class="dialog-intro">${current.description}</p><div class="account-actions">${content[role]||content.contractor}</div><p class="notice">${role==='agency'?'A taxa de intermediação é paga pelo contratante, nunca pelo candidato. Informe o preço antes do contato. Um cadastro não confirma identidade, assinatura ou repasse.':'Buscar e conversar continua gratuito. A localização é aproximada; combine os detalhes em uma conversa privada.'}</p>${role!=='agency'?`<button class="btn secondary" type="button" data-open-account="${esc(role)}">Criar meu perfil / Entrar</button>`:''}</section>`;
}

export function profileBenefitsMarkup(role,goal,config,settings={}) {
  const basic=role==='worker'?'<li>Nome, profissão e canais de contato escolhidos.</li><li>Observação de até 140 caracteres.</li><li>Sem fotos, selo ou destaque PRO.</li>':role==='agency'?'<li>Oportunidade no modelo básico neutro.</li><li>Preço de intermediação informado antes do contato.</li><li>Candidatura gratuita para quem procura emprego.</li>':'<li>Busca e contato direto com profissionais.</li><li>Pedido privado de orçamento.</li><li>Publicação básica de oportunidades.</li>';
  return `<div class="plans profile-plans"><section class="plan"><span class="eyebrow">BÁSICO · SEM MENSALIDADE</span><h3>Continue grátis</h3><div class="price">R$ 0</div><ul>${basic}</ul><p class="micro">O PRO é opcional. Seu plano só muda após análise e aprovação; criar uma conta não ativa extras.</p></section><section class="plan pro">${premiumBenefitsMarkup(role,goal,config,settings)}</section></div>`;
}

function premiumBenefitsMarkup(role,goal,config,{preview=false}={}) {
  const offer=commercialOffer(config),money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const kind=role==='worker'?(goal==='jobseeker'?'jobseeker':'service'):role==='contractor'?'employer':'agency';
  const details={
    service:{name:'PRO Serviços',items:['Carrossel de Antes/Depois e foto do cartão profissional.','Apresentação detalhada e regiões atendidas.','3 dias de destaque por mês em Recomendados.'],href:'#pro'},
    jobseeker:{name:'PRO Talento',items:['Apresentação organizada com experiência e habilidades.','Disponibilidade e serviços em um modelo de leitura fácil.','3 dias de destaque por mês em Recomendados.'],href:'#pro-emprego'},
    employer:{name:'PRO Contratante',items:['Oportunidade organizada por jornada, remuneração e benefícios.','Funções e requisitos com leitura fácil.','Modelo azul claro para identificar quem está contratando.'],href:'#publicar-vaga-pro'},
    agency:{name:'Agenciador PRO',items:['Oportunidades organizadas com identificação do agenciador.','Modelo amarelo claro, preço transparente e contato direto.','Identificação diferenciada e prioridade PRO nas oportunidades recomendadas.'],href:'#agenciador'}
  }[kind];
  return `<section class="profile-pro-benefits ad-tone-${kind}" data-pro-benefits="${kind}"><span class="eyebrow">VANTAGENS PARA O SEU PERFIL${preview?' · PRÉVIA':''}</span><h3>${details.name}</h3><p>${offer.launch?`Teste de ${offer.trialMonths} meses após aprovação, sem cobrança automática.`:`Assinatura opcional de ${money(offer.monthly)}/mês, mediante contratação.`}</p><ul>${details.items.map(item=>`<li>${item}</li>`).join('')}<li>Selo somente após conferência; assinatura não comprova identidade.</li></ul><a class="btn primary" href="${details.href}"${kind==='agency'?' data-account-premium-agency':''}>${preview?'Entrar para solicitar o PRO':'Preparar solicitação PRO'}</a><p class="micro">${offer.launch?`Ao fim do teste, o básico permanece gratuito. O PRO poderá custar ${money(offer.monthly)}/mês mediante adesão, sem renovação automática. `:''}${kind==='agency'?'A intermediação tem preço separado, com 30% do líquido para a plataforma e 70% para o agenciador. ':''}O destaque avulso de R$ 99,90 por 72 horas é separado. Em Mais próximos, a distância continua em primeiro lugar.</p></section>`;
}

function roleFields(selected='',goal='service',saved={}) {
  const selectedRoles=saved.roles||[selected];
  const descriptions={contractor:'O que você procura contratar?',worker:'Quais serviços, experiências e disponibilidade você oferece?',agency:'Quais empregos e regiões você agencia?'};
  return `<fieldset class="full"><legend>Como quer usar o Ajuda em Casa?</legend><p>Selecione pelo menos uma opção. Você pode participar das três.</p><div class="role-options">${Object.entries(roles).map(([id,r])=>`<label class="role-choice"><input type="checkbox" name="roles" value="${id}" ${selectedRoles.includes(id)?'checked':''}><span><strong>${r.icon} ${r.label}</strong><small>${r.description}</small></span></label>`).join('')}</div>${Object.keys(roles).map(id=>`<details data-role-detail="${id}" ${selectedRoles.includes(id)?'open':'hidden'}><summary>${roles[id].label}</summary><label for="objective-${id}">${descriptions[id]}</label><textarea id="objective-${id}" name="detail-${id}" maxlength="1000" rows="3" placeholder="Você pode completar agora ou depois; isto não publica anúncio.">${esc(saved.roleDetails?.[id]||'')}</textarea></details>`).join('')}<div data-worker-goal ${selectedRoles.includes('worker')?'':'hidden'}><label for="account-worker-goal">Qual é o seu objetivo profissional?</label><select id="account-worker-goal" name="workerGoal"><option value="jobseeker" ${goal==='jobseeker'?'selected':''}>${workerGoals.jobseeker}</option><option value="service" ${goal==='service'?'selected':''}>${workerGoals.service}</option></select></div><p class="micro">Essas informações ficam privadas na conta. Cada anúncio exige sua própria confirmação de publicação.</p></fieldset>`;
}
const consentField=()=>'<label class="check full"><input type="checkbox" name="consent" required><span>Li <a href="#termos">como funciona</a> e a <a href="#privacidade">informação de privacidade</a>. Concordo com o uso dos dados para criar meu perfil. Isso não autoriza publicação do meu contato nem cobrança.</span></label>';

export function createAccountUI({config,auth,store,openDialog,toast,onProfileLoad=async()=>null,onProfileSave=async()=>{},onRegistrationComplete=()=>{},onAdminAccess=async()=>false}) {
  const configured=authConfigured(config);
  let intentRole='',intentGoal='service',busy=false,ready=false,pendingAction;
  const persistedProfiles=new Set();
  const checkedProfiles=new Set();
  const accountData=new Map();
  const accountLoads=new Map();
  const area=()=>document.querySelector('[data-account-view]');
  const adminElements=()=>[...document.querySelectorAll('[data-admin-action]')];
  async function refreshAdminAction() {
    const elements=adminElements(),user=auth.getUser();
    if(!elements.length||!user?.emailVerified){for(const el of elements){el.hidden=true;el.dataset.access='denied';}return;}
    try {
      const allowed=await onAdminAccess();
      if(auth.getUser()?.uid===user.uid)for(const el of adminElements()){el.hidden=allowed!==true;el.dataset.access=allowed===true?'allowed':'denied';}
    } catch { for(const el of adminElements()){el.hidden=true;el.dataset.access='unavailable';} /* O painel também confere no servidor. */ }
  }
  auth.subscribe(()=>{for(const el of adminElements()){el.hidden=true;el.dataset.access='pending';}refreshAdminAction();});
  const status=message=>{const el=area()?.querySelector('.account-status');if(el)el.textContent=message;};
  const googleStatus=message=>{const el=area()?.querySelector('[data-google-feedback]');if(el)el.textContent=message;};
  function setBusy(value) {
    busy=value;
    const form=area()?.querySelector('form');if(form)form.dataset.busy=String(value);
    area()?.setAttribute('aria-busy',String(value));
    for(const el of area()?.querySelectorAll('button,input,select')||[]) el.disabled=value;
    if(!value && area()) for(const el of area().querySelectorAll('[data-needs-auth]')) el.disabled=!configured||!ready;
  }
  function draftValues() {
    const draft=store.readDraft();
    return {...draft,role:intentRole||draft?.role||'',workerGoal:intentRole?intentGoal:(draft?.workerGoal||'service')};
  }
  async function prepareAuth() {
    if(!configured) return;
    try {
      await withLoading(()=>auth.ready());ready=true;
      if(area()) {
        if(!busy)for(const el of area().querySelectorAll('[data-needs-auth]'))el.disabled=false;
        const button=area().querySelector('[data-account-google]');if(button)button.dataset.authReady='true';
        if(!busy)googleStatus('Conexão pronta para continuar com Google.');
      }
    } catch(error) {ready=false;status(authErrorMessage(error));googleStatus(authErrorMessage(error));}
  }
  async function restoreAccount() {
    const user=auth.getUser();
    if(!user?.emailVerified)return null;
    if(checkedProfiles.has(user.uid))return accountData.get(user.uid)||null;
    if(accountLoads.has(user.uid))return accountLoads.get(user.uid);
    const loading=Promise.resolve(onProfileLoad(user)).then(account=>{
      if(auth.getUser()?.uid!==user.uid)return null;
      checkedProfiles.add(user.uid);
      if(account?.status==='active') {
        persistedProfiles.add(user.uid);accountData.set(user.uid,account);
        store.savePreferences(user.uid,{role:account.role,workerGoal:account.workerGoal,...(account.roles?accountObjectives(account):{})});
        return account;
      }
      return null;
    }).finally(()=>accountLoads.delete(user.uid));
    accountLoads.set(user.uid,loading);return loading;
  }
  function renderForm(mode='signup') {
    if(config.auth?.googleOnly) {
      openDialog(`<section data-account-view="login"><span class="eyebrow">SUA CONTA NO AJUDA EM CASA</span><h2 id="dialog-title">Entre com sua conta Google.</h2><p class="dialog-intro">O mesmo acesso serve para entrar e criar seu perfil. Não pedimos uma nova senha.</p><section class="google-signin-panel"><button class="google-button" type="button" data-account-google data-auth-ready="${configured&&ready}" aria-describedby="google-feedback"><img src="assets/google-g.svg" width="20" height="20" alt=""><span>Continuar com Google</span></button><p id="google-feedback" class="google-feedback" data-google-feedback role="status">${ready?'Conexão pronta para continuar.':'Preparando conexão com Google…'}</p></section><p class="micro">O Google informa nome e e-mail; esse acesso não fornece seu telefone. Você escolhe os canais de contato ao publicar. Leia <a href="#termos">como funciona</a> e a <a href="#privacidade">privacidade</a>.</p><p class="account-status" role="status"></p></section>`);
      prepareAuth();return;
    }
    const signup=mode!=='login',draft=draftValues();
    openDialog(`<section data-account-view="${signup?'signup':'login'}"><span class="eyebrow">SEU PERFIL NO AJUDA EM CASA</span><h2 id="dialog-title">Entre ou crie sua conta.</h2><p class="dialog-intro">Use sua conta Google ou continue com e-mail. Depois, escolha seu objetivo.</p><section class="google-signin-panel" aria-label="Acesso com Google"><button class="google-button" type="button" data-account-google data-auth-ready="${configured&&ready}" aria-describedby="google-feedback"><img src="assets/google-g.svg" width="20" height="20" alt=""><span>Continuar com Google</span></button><p class="google-signin-caption">A mesma opção serve para entrar e cadastrar.</p><p id="google-feedback" class="google-feedback" data-google-feedback role="status" aria-live="polite">${!configured?'Login Google ainda não ativado pelo administrador.':ready?'Conexão pronta para continuar com Google.':'Preparando conexão com Google…'}</p><p class="micro">Ao continuar, você solicita criar ou acessar sua conta com nome e e-mail do Google. Leia <a href="#termos">como funciona</a> e a <a href="#privacidade">privacidade</a>. Não pedimos sua senha Google.</p></section><span class="account-divider">ou use seu e-mail</span><div class="account-tabs"><button type="button" class="btn ${signup?'primary':'secondary'}" data-account-mode="signup" aria-pressed="${signup}">Criar perfil</button><button type="button" class="btn ${!signup?'primary':'secondary'}" data-account-mode="login" aria-pressed="${!signup}">Já tenho conta</button></div>${!configured?'<p class="notice auth-unavailable"><strong>Contas online ainda não conectadas.</strong> Falta o administrador configurar o Firebase. O pré-cadastro abaixo fica só nesta sessão; não cria conta online, não publica anúncio nem ativa PRO.</p>':''}<form class="form-grid account-form" data-account-form="${signup?'signup':'login'}">${signup?`<div class="field full"><label for="account-name">Nome e sobrenome</label><input id="account-name" name="name" autocomplete="name" required maxlength="100" value="${esc(draft.name)}"></div>`:''}<div class="field full"><label for="account-email">E-mail</label><input id="account-email" type="email" name="email" autocomplete="email" required maxlength="180" value="${esc(draft.email)}"></div>${configured?`<div class="field full"><label for="account-password">Senha${signup?' · mínimo de 8 caracteres':''}</label><input id="account-password" type="password" name="password" autocomplete="${signup?'new-password':'current-password'}" required ${signup?'minlength="8"':''} maxlength="128"></div>`:''}${signup?roleFields(draft.role,draft.workerGoal)+consentField():''}<p class="account-status full" role="status" aria-live="polite">${configured&&!ready?'Preparando conexão segura…':''}</p><button class="btn primary full" type="submit" ${configured?'data-needs-auth disabled':!signup?'disabled':''}>${!configured?(signup?'Salvar pré-cadastro neste aparelho':'Login indisponível até a configuração'):signup?'Criar conta com e-mail':'Entrar com e-mail'}</button>${!signup&&configured?'<button class="btn secondary full" type="button" data-account-reset>Esqueci minha senha</button>':''}<p class="micro full">Autenticação não comprova telefone, profissão, propriedade de anúncio ou pagamento.</p></form></section>`);
    prepareAuth();
  }
  function showRegistrationForm() {
    const user=auth.getUser();if(!user)return renderForm('login');
    const role=validRole(intentRole)||'contractor',goal=role==='worker'&&intentGoal==='jobseeker'?'jobseeker':'service';
    const objective=role==='worker'?workerGoals[goal]:(roles[role]||roles.contractor).label;
    openDialog(`<section data-account-view="complete"><span class="eyebrow">PRIMEIRO ACESSO</span><h2 id="dialog-title">Confirme seus dados e objetivos.</h2><p class="dialog-intro">O Google já informou seu nome e e-mail. Confirme seu número e aceite as políticas para concluir o cadastro.</p><div class="account-summary"><strong>${esc(user.name||user.email)}</strong><p>${esc(user.email)}</p><span class="account-status">Conta Google conectada</span></div><form class="form-grid account-form" data-account-form="complete">${roleFields(role,goal)}<div class="field full"><label for="account-phone">Seu WhatsApp com DDD</label><input id="account-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+55 87 99999-9999" maxlength="26" required></div><p class="notice full"><strong>Objetivo inicial: ${esc(objective)}.</strong><br>Você pode mudar seus objetivos a qualquer momento. O WhatsApp fica privado na conta e só aparece em anúncio se você autorizar ao publicar.</p><label class="check full"><input type="checkbox" name="consent" required><span>Confirmo que o WhatsApp informado é meu ou está sob minha responsabilidade. Li <a href="#termos">como funciona</a> e a <a href="#privacidade">informação de privacidade</a> e aceito criar meu cadastro no Ajuda em Casa.</span></label><p class="account-status full" role="status" aria-live="polite"></p><button class="btn primary full" type="submit">Concluir meu cadastro</button></form><button type="button" class="btn secondary" data-account-signout>Usar outra conta Google</button></section>`);
  }
  function showRoleForm() {
    const user=auth.getUser(),pref=store.readPreferences(user?.uid);
    openDialog(`<section data-account-view="role"><span class="eyebrow">CONTA CONECTADA</span><h2 id="dialog-title">Qual é seu objetivo agora?</h2><p class="dialog-intro">Olá, ${esc(user?.name||user?.email)}. Escolha como quer usar o app. Você pode escolher mais de um objetivo e completar cada descrição separadamente. Isso não altera a titularidade dos anúncios.</p><form class="form-grid account-form" data-account-form="role">${roleFields(intentRole||pref?.role||'',intentRole?intentGoal:pref?.workerGoal||'service',pref||{})}${consentField()}<p class="account-status full" role="status" aria-live="polite"></p><button class="btn primary full" type="submit">Salvar</button></form><a class="btn secondary" href="#mensagens">Minhas mensagens</a><button type="button" class="btn secondary" data-account-signout>Sair da conta</button></section>`);
    refreshAdminAction();
  }
  function showVerification() {
    const user=auth.getUser();
    openDialog(`<section data-account-view="verify"><span class="eyebrow">CONTA CRIADA · CONFIRMAÇÃO PENDENTE</span><h2 id="dialog-title">Confirme seu e-mail.</h2><p>Enviamos uma mensagem para <strong>${esc(user?.email)}</strong>. Confirme pelo link recebido antes de continuar para as opções PRO.</p><p class="account-status" role="status" aria-live="polite"></p><div class="account-actions"><button class="btn primary" type="button" data-account-refresh>Já confirmei meu e-mail</button><button class="btn secondary" type="button" data-account-resend>Reenviar confirmação</button><button class="btn secondary" type="button" data-account-signout>Sair da conta</button></div><p class="micro">Confirmar e-mail não comprova propriedade do WhatsApp nem ativa benefícios pagos.</p></section>`);
  }
  function showProfile({edit=false}={}) {
    const user=auth.getUser();
    if(user) {
      if(!user.emailVerified) return showVerification();
      if(config?.data?.provider==='firestore' && !checkedProfiles.has(user.uid)) {
        openDialog('<section data-account-view="checking"><span class="eyebrow">SUA CONTA</span><h2 id="dialog-title">Conferindo seu cadastro…</h2><p class="dialog-intro">Aguarde só um instante.</p></section>');
        restoreAccount().then(()=>{if(auth.getUser()?.uid===user.uid)showProfile({edit});}).catch(error=>{
          if(auth.getUser()?.uid===user.uid)openDialog(`<section data-account-view="error"><span class="eyebrow">SUA CONTA</span><h2 id="dialog-title">Não foi possível conferir seu cadastro.</h2><p>${esc(error?.message||'Verifique sua internet e tente novamente.')}</p><button class="btn primary" type="button" data-account-retry>Tentar novamente</button></section>`);
        });return;
      }
      if(config?.data?.provider==='firestore' && !persistedProfiles.has(user.uid))return showRegistrationForm();
      if(edit||!store.readPreferences(user.uid)) return showRoleForm();
      if(pendingAction){const action=pendingAction;pendingAction=undefined;return action();}
    } else if(configured || !store.readDraft()) return open();
    const preview=!user,profile=preview?store.readDraft():{...store.readPreferences(user.uid),name:user.name,email:user.email};
    const saved=user?accountData.get(user.uid):null;
    const r=roles[profile.role]||roles.worker;
    const objective=profile.role==='worker'?workerGoals[profile.workerGoal||'service']:r.label;
    openDialog(`<section data-account-view="profile" class="profile-role-${esc(profile.role)}"><span class="eyebrow">${preview?'PRÉVIA · NÃO É CONTA AUTENTICADA':'MEU PERFIL'}</span><h2 id="dialog-title">${preview?'Prévia do seu perfil':`Olá, ${esc(profile.name||profile.email)}.`}</h2><div class="account-summary"><strong>${esc(profile.name||profile.email)}</strong><p>${esc(profile.email)}</p>${saved?.phone?`<p>${esc(formatPhone(saved.phone))}</p>`:''}<span class="account-status">${r.icon} ${esc(objective)}${preview?' · Pré-cadastro local':' · Conta conectada'}</span></div>${preview?'<p class="notice auth-unavailable">Estes dados estão apenas neste navegador, durante esta sessão. Nenhuma conta online ou anúncio foi criado. O login precisa ser configurado antes de solicitar PRO pela área autenticada.</p>':'<p class="notice">Conta básica. A identidade da conta não confirma titularidade de telefone, anúncio, assinatura ou selo. O cadastro básico é publicado automaticamente com sua autorização. PRO e selo seguem procedimentos próprios.</p>'}<div class="account-actions"><button class="btn secondary" type="button" data-account-edit>${preview?'Editar pré-cadastro':'Meus objetivos'}</button>${preview?'<button class="btn secondary" type="button" data-account-clear>Apagar pré-cadastro local</button>':'<button class="btn secondary" type="button" data-account-signout>Sair da conta</button>'}</div>${!preview?'<a class="btn primary" href="#mensagens">Minhas mensagens</a>':''}${(profile.roles||[profile.role]).map(id=>`<section class="profile-objective"><h3>${esc(roles[id]?.label)}</h3><p>${esc(profile.roleDetails?.[id]||'Complete os detalhes em Meus objetivos.')}</p><a class="btn secondary" href="${id==='worker'?'#ser-contratado':id==='agency'?'#agenciar':'#contratar'}">${id==='worker'?'Divulgar serviço ou currículo':id==='agency'?'Preparar oportunidade agenciada':'Encontrar ou contratar'}</a></section>`).join('')}${profileBenefitsMarkup(profile.role,profile.workerGoal,config,{preview})}<p class="micro">Seu objetivo fica associado à conta e pode ser alterado. O telefone permanece privado até você autorizar sua publicação em um anúncio.</p></section>`);
    refreshAdminAction();
  }
  function open({role='',workerGoal='service',mode='signup'}={}) {
    if(role) {intentRole=validRole(role);intentGoal=workerGoal==='jobseeker'?'jobseeker':'service';}
    if(auth.getUser()) return showProfile();
    renderForm(mode);
    // Restaura a sessão real do SDK; não usa localStorage como prova de login.
    if(configured) prepareAuth().then(()=>{if(auth.getUser() && ['signup','login'].includes(area()?.dataset.accountView) && !busy) showProfile();});
  }
  function openPro() {
    if(auth.getUser() || (!configured&&store.readDraft())) return showProfile();
    open();
  }
  async function startGoogle({role='',workerGoal='service'}={}) {
    if(role){intentRole=validRole(role);intentGoal=workerGoal==='jobseeker'?'jobseeker':'service';}
    if(!configured){open();googleStatus('Não é possível entrar com Google ainda: o administrador precisa ativar o Firebase.');return;}
    const finishLoading=beginLoading();
    try {
      const user=await auth.signInGoogle();
      if(user?.emailVerified) {
        const existing=await restoreAccount();
        if(existing)onRegistrationComplete(user);else showRegistrationForm();
      } else if(user)showVerification();
    } catch(error) {open();googleStatus(authErrorMessage(error));}
    finally {finishLoading();}
  }
  async function resolveAccount({role='',workerGoal='service'}={}) {
    if(role){intentRole=validRole(role);intentGoal=workerGoal==='jobseeker'?'jobseeker':'service';}
    return Boolean(await restoreAccount());
  }
  function guard(action,{role='',workerGoal='service'}={}) {
    const user=auth.getUser();
    if(user?.emailVerified && store.readPreferences(user.uid)) return action();
    pendingAction=action;
    const requestedHash=location.hash;
    open({role,workerGoal});
    if(configured&&!ready)prepareAuth().then(()=>{
      const restored=auth.getUser();
      if(location.hash===requestedHash && restored?.emailVerified && store.readPreferences(restored.uid) && pendingAction){pendingAction=undefined;action();}
    });
  }
  async function perform(task,{after=showProfile,clearPasswords=false,onError}={}) {
    if(busy) return;
    setBusy(true);status('Aguarde…');
    let succeeded=false,failure;
    try {await task();succeeded=true;}
    catch(error) {failure=error;status(authErrorMessage(error));}
    finally {
      if(clearPasswords) {const field=area()?.querySelector('[name=password]');if(field)field.value='';}
      setBusy(false);
    }
    if(succeeded) after?.();
    else onError?.(failure);
  }
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-account-form] [name=roles]')) {
      const form=event.target.form;
      const field=area()?.querySelector('[data-worker-goal]');if(field)field.hidden=!form.querySelector('[name=roles][value=worker]').checked;
      const detail=form.querySelector(`[data-role-detail="${event.target.value}"]`);if(detail){detail.hidden=!event.target.checked;detail.open=event.target.checked;}
    }
  });
  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-account-form]');if(!form)return;
    event.preventDefault();if(busy||!form.reportValidity())return;
    const raw=Object.fromEntries(new FormData(form)),kind=form.dataset.accountForm;
    if(kind==='complete') {
      const phone=phoneDigits(raw.phone);
      if(!phone){status('Informe um WhatsApp brasileiro válido com DDD.');return;}
      if(raw.consent!=='on'){status('Aceite as políticas para concluir seu cadastro.');return;}
      let objectives;
      try {const fields=new FormData(form);objectives=accountObjectives({roles:fields.getAll('roles'),roleDetails:Object.fromEntries(Object.keys(roles).map(id=>[id,fields.get('detail-'+id)||'']))});}catch(error){status(error.message);return;}
      perform(async()=>{
        const user=auth.getUser();
        const preferences={...objectives,workerGoal:raw.workerGoal==='jobseeker'?'jobseeker':'service',phone};
        const saved=await onProfileSave(preferences);
        checkedProfiles.add(user.uid);persistedProfiles.add(user.uid);accountData.set(user.uid,saved||{...user,...preferences,status:'active'});
        store.savePreferences(user.uid,preferences);intentRole='';
      },{after:()=>{onRegistrationComplete(auth.getUser());toast('Cadastro concluído. Bem-vindo ao Ajuda em Casa!');}});
      return;
    }
    if(kind==='role') {
      let objectives;
      try {const fields=new FormData(form);objectives=accountObjectives({roles:fields.getAll('roles'),roleDetails:Object.fromEntries(Object.keys(roles).map(id=>[id,fields.get('detail-'+id)||'']))});}
      catch(error){status(error.message);return;}
      perform(async()=>{
        const user=auth.getUser();if(!user?.emailVerified) return showVerification();
        const preferences={...objectives,workerGoal:raw.workerGoal};
        const saved=await onProfileSave(preferences);
        persistedProfiles.add(user.uid);checkedProfiles.add(user.uid);accountData.set(user.uid,saved||{...accountData.get(user.uid),...preferences});
        store.savePreferences(user.uid,preferences);intentRole='';
      });
      return;
    }
    if(kind==='signup') {
      let draft;
      try {draft=validateAccountDraft({...raw,...accountObjectives({roles:new FormData(form).getAll('roles')}),consent:raw.consent==='on'});}
      catch(error) {status(error.message);return;}
      if(!configured) {store.saveDraft(draft);intentRole='';showProfile();return;}
      perform(async()=>{await auth.signUpEmail({name:draft.name,email:draft.email,password:raw.password});const user=auth.getUser();if(user)store.savePreferences(user.uid,{role:draft.role,workerGoal:draft.workerGoal});store.clearDraft();},{clearPasswords:true,onError:error=>{
        const user=auth.getUser();
        if(user && !user.emailVerified && user.email===draft.email) {store.savePreferences(user.uid,{role:draft.role,workerGoal:draft.workerGoal});showVerification();status('Sua conta foi criada, mas não foi possível concluir o envio da confirmação. '+authErrorMessage(error));}
      }});
    } else perform(()=>auth.signInEmail({email:raw.email,password:raw.password}),{clearPasswords:true});
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('button,a');if(!button || busy)return;
    if(button.matches('[data-account-mode]'))renderForm(button.dataset.accountMode);
    if(button.matches('[data-account-google]')) {
      const form=area()?.querySelector('form');
      if(form?.dataset.accountForm==='signup') {
        const selected=form.querySelector('[name=role]:checked');
        if(selected) {intentRole=selected.value;intentGoal=form.querySelector('[name=workerGoal]').value;}
      }
      googleStatus('Abrindo acesso com Google…');
      startGoogle();
    }
    if(button.matches('[data-account-reset]')) {
      const field=area()?.querySelector('[name=email]');
      if(!field?.reportValidity())return;
      perform(()=>auth.resetPassword(field.value),{after:()=>status('Se existir uma conta elegível para esse e-mail, você receberá as instruções de recuperação.')});
    }
    if(button.matches('[data-account-refresh]'))perform(()=>auth.refreshUser(),{after:()=>auth.getUser()?.emailVerified?showProfile():status('A confirmação ainda não apareceu. Abra o link recebido e tente novamente.')});
    if(button.matches('[data-account-resend]'))perform(()=>auth.resendVerification(),{after:()=>status('Solicitação de confirmação enviada. Confira também a caixa de spam.')});
    if(button.matches('[data-account-edit]'))auth.getUser()?showProfile({edit:true}):renderForm('signup');
    if(button.matches('[data-account-clear]')) {store.clearDraft();intentRole='';renderForm('signup');toast('Pré-cadastro local apagado.');}
    if(button.matches('[data-account-signout]'))perform(()=>auth.signOut(),{after:()=>{store.clearDraft();intentRole='';renderForm('login');toast('Você saiu da conta.');}});
    if(button.matches('[data-account-retry]')){const user=auth.getUser();if(user){checkedProfiles.delete(user.uid);accountLoads.delete(user.uid);}showProfile();}
    if(button.matches('[data-account-premium-agency]')) {
      if(!auth.getUser()?.emailVerified) {event.preventDefault();event.stopImmediatePropagation();open({role:'agency'});}
    }
  });
  return {open,openPro,showProfile,showRegistrationForm,startGoogle,resolveAccount,guard,hasPreferences:()=>!!store.readPreferences(auth.getUser()?.uid)};
}
