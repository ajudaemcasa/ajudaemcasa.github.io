import { ACCOUNT_ROLES, validateAccountDraft } from './conta.mjs?v=4b7fdc914fc1';
import { authConfigured, authErrorMessage } from './auth-service.mjs?v=4b7fdc914fc1';
import { commercialOffer } from './comercial.mjs?v=4b7fdc914fc1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const roles={
  contractor:{label:'Quero contratar',title:'Contrate um serviço',icon:'⌂',description:'Encontre profissionais ou divulgue uma oportunidade de trabalho.'},
  worker:{label:'Quero ser contratado',title:'Seja contratado',icon:'◉',description:'Ofereça serviços ou encontre uma oportunidade de emprego.'},
  agency:{label:'Sou agenciador',title:'Agencie empregos',icon:'▦',description:'Organize oportunidades e aproxime contratantes de profissionais.'}
};
const validRole=role=>ACCOUNT_ROLES.some(item=>item.id===role)?role:'';

export function roleLandingMarkup(role) {
  const current=roles[validRole(role)]||roles.contractor;
  const content={
    contractor:`<button class="btn primary" type="button" data-browse-mode="professionals">Encontrar profissionais</button><a class="btn secondary" href="#orcamento">Pedir um orçamento privado</a><a class="btn secondary" href="#publicar-vaga">Publicar vaga grátis</a>`,
    worker:`<a class="btn primary" href="#cadastro">Divulgar meu trabalho grátis</a><button class="btn secondary" type="button" data-browse-mode="jobs">Encontrar vagas próximas</button><button class="btn secondary" type="button" data-browse-mode="agencies">Ver oportunidades de agenciadores</button>`,
    agency:`<button class="btn primary" type="button" data-open-account="agency">Criar meu perfil de agenciador</button><a class="btn secondary" href="#agenciador">Preparar uma oportunidade</a><button class="btn secondary" type="button" data-browse-mode="jobseekers">Encontrar pessoas procurando emprego</button>`
  };
  return `<section class="role-landing profile-role-${esc(role)}"><span class="eyebrow">SEU OBJETIVO, SEU CAMINHO</span><h2 id="dialog-title">${current.icon} ${current.title}</h2><p class="dialog-intro">${current.description}</p><div class="account-actions">${content[role]||content.contractor}</div><p class="notice">${role==='agency'?'A taxa de intermediação é paga pelo contratante, nunca pelo candidato. Informe o preço antes do contato. Um cadastro não confirma identidade, assinatura ou repasse.':'Buscar e conversar continua gratuito. A localização é aproximada; combine os detalhes em uma conversa privada.'}</p>${role!=='agency'?`<button class="btn secondary" type="button" data-open-account="${esc(role)}">Criar meu perfil / Entrar</button>`:''}</section>`;
}

export function profileBenefitsMarkup(role,goal,config,settings={}) {
  const basic=role==='worker'?'<li>Nome, WhatsApp e profissão.</li><li>Observação de até 140 caracteres.</li><li>Sem fotos, selo ou destaque PRO.</li>':role==='agency'?'<li>Oportunidade no modelo básico neutro.</li><li>Preço de intermediação informado antes do contato.</li><li>Candidatura gratuita para quem procura emprego.</li>':'<li>Busca e contato direto com profissionais.</li><li>Pedido privado de orçamento.</li><li>Publicação básica de oportunidades.</li>';
  return `<div class="plans profile-plans"><section class="plan"><span class="eyebrow">BÁSICO · SEM MENSALIDADE</span><h3>Continue grátis</h3><div class="price">R$ 0</div><ul>${basic}</ul><p class="micro">O PRO é opcional. Seu plano só muda após análise e aprovação; criar uma conta não ativa extras.</p></section><section class="plan pro">${premiumBenefitsMarkup(role,goal,config,settings)}</section></div>`;
}

function premiumBenefitsMarkup(role,goal,config,{preview=false}={}) {
  const offer=commercialOffer(config),money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const kind=role==='worker'?(goal==='jobseeker'?'jobseeker':'service'):role==='contractor'?'employer':'agency';
  const details={
    service:{name:'PRO Serviços',items:['Carrossel de Antes/Depois e foto do cartão profissional.','Apresentação detalhada e regiões atendidas.','3 dias de destaque por mês em Recomendados.'],href:'#pro'},
    jobseeker:{name:'PRO Talento',items:['Apresentação organizada com experiência e habilidades.','Disponibilidade e serviços em um modelo de leitura fácil.','3 dias de destaque por mês em Recomendados.'],href:'#pro-emprego'},
    employer:{name:'PRO Contratante',items:['Oportunidade organizada por jornada, remuneração e benefícios.','Funções e requisitos com leitura fácil.','Modelo azul claro para identificar quem está contratando.'],href:'#publicar-vaga-pro'},
    agency:{name:'Agenciador PRO',items:['Oportunidades organizadas com identificação do agenciador.','Modelo amarelo claro, preço transparente e contato direto.','Seis meses iniciais de destaque após aprovação do anunciante.'],href:'#agenciador'}
  }[kind];
  return `<section class="profile-pro-benefits ad-tone-${kind}" data-pro-benefits="${kind}"><span class="eyebrow">VANTAGENS PARA O SEU PERFIL${preview?' · PRÉVIA':''}</span><h3>${details.name}</h3><p>${offer.launch?`Teste de ${offer.trialMonths} meses após aprovação, sem cobrança automática.`:`Assinatura opcional de ${money(offer.monthly)}/mês, mediante contratação.`}</p><ul>${details.items.map(item=>`<li>${item}</li>`).join('')}<li>Selo somente após conferência; assinatura não comprova identidade.</li></ul><a class="btn primary" href="${details.href}"${kind==='agency'?' data-account-premium-agency':''}>${preview?'Entrar para solicitar o PRO':'Preparar solicitação PRO'}</a><p class="micro">${offer.launch?`Ao fim do teste, o básico permanece gratuito. O PRO poderá custar ${money(offer.monthly)}/mês mediante adesão, sem renovação automática. `:''}${kind==='agency'?'Após os seis meses iniciais, manter destaque poderá exigir mensalidade ou contratação avulsa. ':''}O destaque avulso de R$ 99,90 por 72 horas é separado. Em Mais próximos, a distância continua em primeiro lugar.</p></section>`;
}

function roleFields(selected='',goal='service') {
  return `<fieldset class="full"><legend>Como quer usar o Ajuda em Casa?</legend><div class="role-options">${Object.entries(roles).map(([id,r])=>`<label class="role-choice"><input type="radio" name="role" value="${id}" required ${id===selected?'checked':''}><span><strong>${r.icon} ${r.label}</strong><small>${r.description}</small></span></label>`).join('')}</div><div data-worker-goal ${selected==='worker'?'':'hidden'}><label for="account-worker-goal">Qual é o seu objetivo profissional?</label><select id="account-worker-goal" name="workerGoal"><option value="service" ${goal==='service'?'selected':''}>Divulgar meus serviços</option><option value="jobseeker" ${goal==='jobseeker'?'selected':''}>Procurar emprego</option></select></div></fieldset>`;
}
const consentField=()=>'<label class="check full"><input type="checkbox" name="consent" required><span>Li <a href="#termos">como funciona</a> e a <a href="#privacidade">informação de privacidade</a>. Concordo com o uso dos dados para criar meu perfil. Isso não autoriza publicação do meu contato nem cobrança.</span></label>';

export function createAccountUI({config,auth,store,openDialog,toast,onProfileSave=async()=>{},onAdminAccess=async()=>false}) {
  const configured=authConfigured(config);
  let intentRole='',intentGoal='service',busy=false,ready=false,pendingAction;
  const persistedProfiles=new Set();
  const area=()=>document.querySelector('[data-account-view]');
  const adminActionMarkup=()=>'<div class="account-actions" data-admin-action data-access="pending" hidden><a class="btn primary" href="painel.html">Painel do Administrador</a></div>';
  async function refreshAdminAction() {
    const el=area()?.querySelector('[data-admin-action]'),user=auth.getUser();
    if(!el || !user?.emailVerified)return;
    try {
      const allowed=await onAdminAccess();
      if(el.isConnected && auth.getUser()?.uid===user.uid) {el.hidden=allowed!==true;el.dataset.access=allowed===true?'allowed':'denied';}
    } catch { if(el.isConnected)el.dataset.access='unavailable'; /* O painel também confere no servidor. */ }
  }
  auth.subscribe(()=>{const el=area()?.querySelector('[data-admin-action]');if(el)el.hidden=true;refreshAdminAction();});
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
      await auth.ready();ready=true;
      if(area()) {
        if(!busy)for(const el of area().querySelectorAll('[data-needs-auth]'))el.disabled=false;
        const button=area().querySelector('[data-account-google]');if(button)button.dataset.authReady='true';
        if(!busy)googleStatus('Conexão pronta para continuar com Google.');
      }
    } catch(error) {ready=false;status(authErrorMessage(error));googleStatus(authErrorMessage(error));}
  }
  function renderForm(mode='signup') {
    const signup=mode!=='login',draft=draftValues();
    openDialog(`<section data-account-view="${signup?'signup':'login'}"><span class="eyebrow">SEU PERFIL NO AJUDA EM CASA</span><h2 id="dialog-title">Entre ou crie sua conta.</h2><p class="dialog-intro">Use sua conta Google ou continue com e-mail. Depois, escolha seu objetivo.</p><section class="google-signin-panel" aria-label="Acesso com Google"><button class="google-button" type="button" data-account-google data-auth-ready="${configured&&ready}" aria-describedby="google-feedback"><img src="assets/google-g.svg" width="20" height="20" alt=""><span>Continuar com Google</span></button><p class="google-signin-caption">A mesma opção serve para entrar e cadastrar.</p><p id="google-feedback" class="google-feedback" data-google-feedback role="status" aria-live="polite">${!configured?'Login Google ainda não ativado pelo administrador.':ready?'Conexão pronta para continuar com Google.':'Preparando conexão com Google…'}</p><p class="micro">Ao continuar, você solicita criar ou acessar sua conta com nome e e-mail do Google. Leia <a href="#termos">como funciona</a> e a <a href="#privacidade">privacidade</a>. Não pedimos sua senha Google.</p></section><span class="account-divider">ou use seu e-mail</span><div class="account-tabs"><button type="button" class="btn ${signup?'primary':'secondary'}" data-account-mode="signup" aria-pressed="${signup}">Criar perfil</button><button type="button" class="btn ${!signup?'primary':'secondary'}" data-account-mode="login" aria-pressed="${!signup}">Já tenho conta</button></div>${!configured?'<p class="notice auth-unavailable"><strong>Contas online ainda não conectadas.</strong> Falta o administrador configurar o Firebase. O pré-cadastro abaixo fica só nesta sessão; não cria conta online, não publica anúncio nem ativa PRO.</p>':''}<form class="form-grid account-form" data-account-form="${signup?'signup':'login'}">${signup?`<div class="field full"><label for="account-name">Nome e sobrenome</label><input id="account-name" name="name" autocomplete="name" required maxlength="100" value="${esc(draft.name)}"></div>`:''}<div class="field full"><label for="account-email">E-mail</label><input id="account-email" type="email" name="email" autocomplete="email" required maxlength="180" value="${esc(draft.email)}"></div>${configured?`<div class="field full"><label for="account-password">Senha${signup?' · mínimo de 8 caracteres':''}</label><input id="account-password" type="password" name="password" autocomplete="${signup?'new-password':'current-password'}" required ${signup?'minlength="8"':''} maxlength="128"></div>`:''}${signup?roleFields(draft.role,draft.workerGoal)+consentField():''}<p class="account-status full" role="status" aria-live="polite">${configured&&!ready?'Preparando conexão segura…':''}</p><button class="btn primary full" type="submit" ${configured?'data-needs-auth disabled':!signup?'disabled':''}>${!configured?(signup?'Salvar pré-cadastro neste aparelho':'Login indisponível até a configuração'):signup?'Criar conta com e-mail':'Entrar com e-mail'}</button>${!signup&&configured?'<button class="btn secondary full" type="button" data-account-reset>Esqueci minha senha</button>':''}<p class="micro full">Autenticação não comprova telefone, profissão, propriedade de anúncio ou pagamento.</p></form></section>`);
    prepareAuth();
  }
  function showRoleForm() {
    const user=auth.getUser(),pref=store.readPreferences(user?.uid);
    openDialog(`<section data-account-view="role"><span class="eyebrow">CONTA CONECTADA</span><h2 id="dialog-title">Qual é seu objetivo agora?</h2><p class="dialog-intro">Olá, ${esc(user?.name||user?.email)}. Escolha como quer usar o app. Você pode trocar de objetivo depois; isso não altera a titularidade dos anúncios.</p><form class="form-grid account-form" data-account-form="role">${roleFields(intentRole||pref?.role||'',intentRole?intentGoal:pref?.workerGoal||'service')}${consentField()}<p class="account-status full" role="status" aria-live="polite"></p><button class="btn primary full" type="submit">Salvar objetivo e ver meu perfil</button></form>${adminActionMarkup()}<button type="button" class="btn secondary" data-account-signout>Sair da conta</button></section>`);
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
      if(config?.data?.provider==='firestore' && !persistedProfiles.has(user.uid))return showRoleForm();
      if(edit||!store.readPreferences(user.uid)) return showRoleForm();
      if(pendingAction){const action=pendingAction;pendingAction=undefined;return action();}
    } else if(configured || !store.readDraft()) return open();
    const preview=!user,profile=preview?store.readDraft():{...store.readPreferences(user.uid),name:user.name,email:user.email};
    const r=roles[profile.role]||roles.worker;
    openDialog(`<section data-account-view="profile" class="profile-role-${esc(profile.role)}"><span class="eyebrow">${preview?'PRÉVIA · NÃO É CONTA AUTENTICADA':'MEU PERFIL'}</span><h2 id="dialog-title">${preview?'Prévia do seu perfil':`Olá, ${esc(profile.name||profile.email)}.`}</h2><div class="account-summary"><strong>${esc(profile.name||profile.email)}</strong><p>${esc(profile.email)}</p><span class="account-status">${r.icon} ${r.label}${preview?' · Pré-cadastro local':' · Conta conectada'}</span></div>${preview?'<p class="notice auth-unavailable">Estes dados estão apenas neste navegador, durante esta sessão. Nenhuma conta online ou anúncio foi criado. O login precisa ser configurado antes de solicitar PRO pela área autenticada.</p>':'<p class="notice">Conta básica. A identidade da conta não confirma titularidade de telefone, anúncio, assinatura ou selo. Os benefícios dependem de aprovação administrativa separada.</p>'}<div class="account-actions"><button class="btn secondary" type="button" data-account-edit>${preview?'Editar pré-cadastro':'Trocar meu objetivo'}</button>${preview?'<button class="btn secondary" type="button" data-account-clear>Apagar pré-cadastro local</button>':'<button class="btn secondary" type="button" data-account-signout>Sair da conta</button>'}</div>${!preview?adminActionMarkup():''}${profileBenefitsMarkup(profile.role,profile.workerGoal,config,{preview})}<p class="micro">O objetivo escolhido fica neste navegador, associado à conta quando há login. Ainda não há sincronização de preferências ou gerenciamento automático dos anúncios entre aparelhos.</p></section>`);
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
    if(event.target.matches('[data-account-form] [name=role]')) {
      const field=area()?.querySelector('[data-worker-goal]');if(field)field.hidden=event.target.value!=='worker';
    }
  });
  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-account-form]');if(!form)return;
    event.preventDefault();if(busy||!form.reportValidity())return;
    const raw=Object.fromEntries(new FormData(form)),kind=form.dataset.accountForm;
    if(kind==='role') {
      perform(async()=>{
        const user=auth.getUser();if(!user?.emailVerified) return showVerification();
        const preferences={role:raw.role,workerGoal:raw.workerGoal};
        await onProfileSave(preferences);
        persistedProfiles.add(user.uid);
        store.savePreferences(user.uid,preferences);intentRole='';
      });
      return;
    }
    if(kind==='signup') {
      let draft;
      try {draft=validateAccountDraft({...raw,consent:raw.consent==='on'});}
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
      if(!configured) {
        googleStatus('Não é possível entrar com Google ainda: o administrador precisa ativar o Firebase. Você pode escolher Criar perfil e salvar apenas um pré-cadastro local.');
        return;
      }
      if(!ready) {
        googleStatus('Preparando a conexão. Aguarde a confirmação e clique novamente para abrir o Google.');
        prepareAuth();return;
      }
      const form=area()?.querySelector('form');
      if(form?.dataset.accountForm==='signup') {
        const selected=form.querySelector('[name=role]:checked');
        if(selected) {intentRole=selected.value;intentGoal=form.querySelector('[name=workerGoal]').value;}
      }
      // SDK já carregado; o popup é iniciado dentro do gesto do usuário.
      googleStatus('Abrindo acesso com Google…');
      perform(()=>auth.signInGoogle(),{after:()=>{if(auth.getUser()?.emailVerified)showRoleForm();else showVerification();},onError:error=>googleStatus(authErrorMessage(error))});
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
    if(button.matches('[data-account-premium-agency]')) {
      if(!auth.getUser()?.emailVerified) {event.preventDefault();event.stopImmediatePropagation();open({role:'agency'});}
    }
  });
  return {open,openPro,showProfile,guard,hasPreferences:()=>!!store.readPreferences(auth.getUser()?.uid)};
}
