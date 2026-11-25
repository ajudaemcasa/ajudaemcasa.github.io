import {createAuthService,authConfigured,authErrorMessage} from './auth-service.mjs?v=149f22201751';
import {createDataClient,backendConfigured} from './firestore.mjs?v=149f22201751';
import {createAdminService,editProfessional,recordsToCsv,REQUEST_LABELS} from './admin-domain.mjs?v=149f22201751';
import {CATEGORIES,categoryName,isPro} from './domain.mjs?v=149f22201751';
import {formatPhone,phoneDigits} from './telefone.mjs?v=149f22201751';
import {beginLoading,finishStartup} from './carregamento.mjs?v=149f22201751';

const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const labels={active:'Ativo',suspended:'Suspenso',pending:'Pendente',in_progress:'Em atendimento',rejected:'Recusado',resolved:'Concluído',published:'Publicado',deleted:'Excluído'};
const kindLabels={professional:'Profissional',vacancy:'Vaga',advertiser:'Anunciante'};
const roleLabels={worker:'Trabalhador',contractor:'Contratante',agency:'Agenciador'};
const tabs={overview:'Visão geral',requests:'Pedidos',records:'Cadastros',users:'Contas',settings:'Configurações',audit:'Histórico',blocks:'Bloqueios'};
const tabDescriptions={
  overview:'Resumo do que exige atenção agora e atalhos para as filas prioritárias.',
  requests:'Analise pedidos de cadastro, PRO, titularidade e orçamentos enviados pelos usuários.',
  records:'Revise, edite, pause ou conceda cortesia PRO aos profissionais, vagas e anunciantes.',
  users:'Gerencie as contas cadastradas no aplicativo.',
  settings:'Defina a mensagem da vitrine, abertura de pedidos e a fase comercial.',
  audit:'Registro completo de todas as alterações administrativas com responsável e motivo.',
  blocks:'Impeça novos cadastros ou pedidos por e-mail ou telefone normalizado.'
};

let auth,client,service,allowed=false,generation=0,tab='overview',rows=[],nextPageToken='',current,settings,query='',filter='',kindFilter='',planFilter='',busy=false;
let counts={pendingRequests:null,records:null,users:null};

const date=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const shortDate=value=>value?new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const tag=status=>`<span class="admin-tag ${esc(status)}">${esc(labels[status]||status)}</span>`;
const main=$('#admin-main'),dialog=$('#admin-dialog');

function open(html){$('#admin-dialog-content').innerHTML=html;if(!dialog.open)dialog.showModal();}
function close(){if(!busy)dialog.close();}
dialog.querySelector('.dialog-close').addEventListener('click',close);
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});

function signInView(message='Acesse com a conta Google autorizada para administrar o aplicativo.',{unavailable=false}={}) {
  allowed=false;rows=[];current=null;settings=null;generation++;
  if(dialog.open)dialog.close();
  $('#admin-account').textContent='';$('#admin-signout').hidden=!auth?.getUser();
  main.innerHTML=`<section class="admin-login"><span class="eyebrow">ÁREA RESTRITA</span><h1>Administração do Ajuda em Casa</h1><p>${esc(message)}</p>${unavailable?'':`<button id="admin-google" class="google-button" type="button"><img src="assets/google-g.svg" width="20" height="20" alt=""><span>Entrar com Google</span></button>`}<p id="admin-login-status" role="status" aria-live="polite"></p><p class="admin-note">O acesso administrativo depende da autorização online da sua conta. Entrar no Google, por si só, não libera o painel.</p><a class="btn secondary" href="index.html">Voltar ao aplicativo</a></section>`;
  $('#admin-google')?.addEventListener('click',async()=>{
    const button=$('#admin-google');button.disabled=true;
    try{await auth.signInGoogle();}
    catch(error){const el=$('#admin-login-status');if(el)el.textContent=authErrorMessage(error);}
    finally{if(button.isConnected)button.disabled=false;}
  });
}

function navBadge(id) {
  if(id==='requests'&&counts.pendingRequests!==null) {
    return `<span class="admin-nav-badge ${counts.pendingRequests>0?'is-alert':''}">${counts.pendingRequests}</span>`;
  }
  if(id==='records'&&counts.records!==null) return `<span class="admin-nav-badge">${counts.records}</span>`;
  if(id==='users'&&counts.users!==null) return `<span class="admin-nav-badge">${counts.users}</span>`;
  return '';
}

function shell() {
  $('#admin-account').textContent=auth.getUser().email;$('#admin-signout').hidden=false;
  main.innerHTML=`<div class="admin-layout"><nav class="admin-nav" aria-label="Administração"><p class="admin-nav-title">Gestão do App</p>${Object.entries(tabs).map(([id,label])=>`<button type="button" data-tab="${id}" aria-current="${tab===id?'page':'false'}"><span>${label}</span>${navBadge(id)}</button>`).join('')}</nav><section class="admin-section"><div class="admin-heading"><div><span class="eyebrow">AJUDA EM CASA · PETROLINA</span><h1>${tabs[tab]}</h1><p>${esc(tabDescriptions[tab]||'')}</p></div><button class="btn secondary" type="button" data-refresh>Atualizar</button></div><p id="admin-status" role="status" aria-live="polite"></p><div id="admin-content"></div></section></div>`;
}

function updateNavBadges() {
  for(const btn of main.querySelectorAll('.admin-nav button[data-tab]')) {
    const id=btn.dataset.tab;
    btn.innerHTML=`<span>${tabs[id]}</span>${navBadge(id)}`;
  }
}

function errorMessage(error) {
  if(error?.code===403||error?.code===401){signInView('Acesso não autorizado ou sessão expirada. Entre com a conta administradora.');return;}
  const el=$('#admin-status');if(el){el.className='notice admin-error';el.textContent=error.message||'Não foi possível carregar os dados.';}
}

async function load({more=false,successMessage=''}={}) {
  if(!allowed)return;
  const finishLoading=beginLoading();
  const version=generation,selected=tab;shell();$('.admin-section').setAttribute('aria-busy','true');
  $('#admin-status').textContent=successMessage||'Carregando '+tabs[tab].toLowerCase()+'…';
  $('#admin-content').innerHTML='<p class="admin-loading" role="status">Buscando informações…</p>';
  for(const b of main.querySelectorAll('.admin-nav button,[data-refresh]'))b.disabled=true;
  const loadingButton=main.querySelector(more?'[data-more]':'[data-refresh]');
  if(loadingButton){loadingButton.textContent='Carregando…';loadingButton.classList.add('is-loading');}
  try {
    if(tab==='overview') {
      const [req,cat,user,blk]=await Promise.all([
        client.list('requests'),
        client.list('records'),
        client.list('users'),
        client.list('blocks').catch(()=>({items:[],nextPageToken:''}))
      ]);
      if(version!==generation||selected!==tab)return;
      const pendingReqs=req.items.filter(i=>i.data.status==='pending');
      const activeRecs=cat.items.filter(i=>i.data.status==='active');
      const proRecs=activeRecs.filter(i=>i.data.kind==='professional'&&isPro(i.data.payload));
      const suspendedRecs=cat.items.filter(i=>i.data.status==='suspended');
      const activeBlocks=blk.items.filter(i=>i.data.enabled);
      counts={
        pendingRequests:pendingReqs.length,
        records:cat.items.length+(cat.nextPageToken?'+':''),
        users:user.items.length+(user.nextPageToken?'+':'')
      };
      updateNavBadges();
      rows=pendingReqs;
      const queueMarkup=pendingReqs.length
        ?`<section class="admin-panel admin-queue"><div class="admin-queue-head"><h2>Fila prioritária · ${pendingReqs.length} pedido${pendingReqs.length===1?'':'s'} aguardando decisão</h2><button class="btn secondary" type="button" data-tab="requests">Ver todos os pedidos</button></div><div class="admin-queue-list">${pendingReqs.slice(0,5).map(item=>`<div class="admin-queue-item"><div><strong>${esc(REQUEST_LABELS[item.data.event?.type]||item.data.event?.type||'Pedido')} · ${esc(item.data.event?.data?.name||item.data.ownerEmail||'Solicitante')}</strong><small>Protocolo ${esc(item.id)} · ${esc(date(item.data.createdAt))}</small></div><button class="btn primary" type="button" data-open-request="${esc(item.id)}">Analisar agora</button></div>`).join('')}</div></section>`
        :`<div class="admin-summary"><strong>Tudo em dia na fila de pedidos</strong><p>Não há pedidos pendentes nesta página. Você pode revisar cadastros publicados, ajustar configurações comerciais ou conferir o histórico de ações.</p></div>`;
      $('#admin-content').innerHTML=`
        ${queueMarkup}
        <div class="admin-cards">
          <section class="admin-metric ${pendingReqs.length?'is-priority':''}">
            <span class="admin-metric-label">Pedidos pendentes</span>
            <strong>${pendingReqs.length}${req.nextPageToken?'+':''}</strong>
            <p class="admin-note">${req.items.length} carregados no total nesta página</p>
            <button class="btn ${pendingReqs.length?'primary':'secondary'}" type="button" data-tab="requests">Abrir pedidos</button>
          </section>
          <section class="admin-metric">
            <span class="admin-metric-label">Cadastros na vitrine</span>
            <strong>${activeRecs.length}${cat.nextPageToken?'+':''}</strong>
            <p class="admin-note">${proRecs.length} PRO ativos · ${suspendedRecs.length} suspensos</p>
            <button class="btn secondary" type="button" data-tab="records">Abrir cadastros</button>
          </section>
          <section class="admin-metric">
            <span class="admin-metric-label">Contas do app</span>
            <strong>${user.items.length}${user.nextPageToken?'+':''}</strong>
            <p class="admin-note">${user.items.filter(i=>i.data.status==='suspended').length} suspensas nesta página</p>
            <button class="btn secondary" type="button" data-tab="users">Abrir contas</button>
          </section>
          <section class="admin-metric">
            <span class="admin-metric-label">Bloqueios ativos</span>
            <strong>${activeBlocks.length}${blk.nextPageToken?'+':''}</strong>
            <p class="admin-note">E-mails e telefones impedidos de cadastrar</p>
            <button class="btn secondary" type="button" data-tab="blocks">Gerenciar bloqueios</button>
          </section>
        </div>
        <section class="admin-panel">
          <strong>Atendimento legado & auditoria</strong>
          <p class="admin-note">Todas as alterações feitas aqui exigem motivo e ficam gravadas no Histórico. Solicitações anteriores à fila autenticada permanecem no n8n.</p>
          <div class="admin-actions">
            <button class="btn secondary" type="button" data-tab="settings">Configurações comerciais</button>
            <button class="btn secondary" type="button" data-tab="audit">Ver histórico de auditoria</button>
            <a class="btn secondary" href="https://sternplatypus-n8n.cloudfy.live/workflow/Wchwco3Q58qJakDI" target="_blank" rel="noopener noreferrer">Abrir atendimento n8n ↗</a>
          </div>
        </section>`;
    } else if(tab==='settings') {
      settings=await client.get('settings/site');
      if(version!==generation||selected!==tab)return;
      if(!settings)throw new Error('As configurações iniciais ainda não foram criadas.');
      $('#admin-content').innerHTML=`<section class="admin-panel"><form class="form-grid admin-form" data-settings><div class="field full"><label for="directory-message">Mensagem de abertura da vitrine</label><input id="directory-message" name="directoryMessage" required maxlength="180" value="${esc(settings.data.directoryMessage)}"></div><label class="check full"><input type="checkbox" name="registrationOpen" ${settings.data.registrationOpen?'checked':''}><span>Receber novos pedidos e cadastros no aplicativo</span></label><p class="admin-note full">Ao desmarcar, pedidos já recebidos e contatos publicados continuam preservados.</p><div class="field full"><label for="commercial-stage">Fase comercial exibida no site</label><select id="commercial-stage" name="commercialStage"><option value="paid" ${settings.data.commercialStage!=='launch'?'selected':''}>Planos pagos · sem teste automático</option><option value="launch" ${settings.data.commercialStage==='launch'?'selected':''}>Lançamento · oferecer 6 meses grátis (concessão manual)</option></select><p class="admin-note">Esta opção define os textos comerciais da vitrine; não ativa cobrança Asaas automaticamente. Cortesias individuais são concedidas na aba Cadastros.</p></div>${reasonField('action-reason',['Ajuste de mensagem da vitrine','Pausa temporária para revisão','Atualização da fase comercial'])}<button type="submit" class="btn primary">Salvar configurações</button></form></section>`;
    } else {
      const response=await client.list(tab,{pageToken:more?nextPageToken:''});
      if(version!==generation||selected!==tab)return;
      rows=more?[...rows,...response.items]:response.items;nextPageToken=response.nextPageToken;
      if(tab==='requests')counts.pendingRequests=rows.filter(i=>i.data.status==='pending').length;
      if(tab==='records')counts.records=rows.length+(nextPageToken?'+':'');
      if(tab==='users')counts.users=rows.length+(nextPageToken?'+':'');
      updateNavBadges();
      renderListShell();
    }
  }catch(error){if(version===generation)errorMessage(error);}
  finally{finishLoading();if(version===generation){
    $('.admin-section')?.setAttribute('aria-busy','false');
    for(const b of main.querySelectorAll('.admin-nav button,[data-refresh]'))b.disabled=false;
    const refresh=main.querySelector('[data-refresh]');if(refresh){refresh.textContent='Atualizar';refresh.classList.remove('is-loading');}
    const status=$('#admin-status');if(status && !status.classList.contains('admin-error')){status.textContent=successMessage;status.className=successMessage?'notice admin-success':'';}
  }}
}

function filteredRows() {
  return rows.filter(({id,data:d})=>{
    if(tab==='blocks')return !query||String(d.value||'').toLocaleLowerCase('pt-BR').includes(query);
    if(tab!=='audit') {
      if(filter?d.status!==filter:d.status==='deleted')return false;
    }
    if(tab==='records') {
      if(kindFilter && d.kind!==kindFilter)return false;
      if(planFilter==='pro' && !(d.kind==='professional'&&isPro(d.payload)))return false;
      if(planFilter==='free' && (d.kind==='professional'&&isPro(d.payload)))return false;
      if(planFilter==='unverified' && d.payload?.status!=='unverified')return false;
    }
    if(!query)return true;
    return JSON.stringify([id,d.payload?.name,d.payload?.title,d.payload?.phone,categoryName(d.payload?.category),d.event?.data?.name,d.event?.data?.phone,d.email,d.name,d.actorEmail,d.reason]).toLocaleLowerCase('pt-BR').includes(query);
  });
}

function renderListShell() {
  if(tab==='blocks'){renderBlocksShell();return;}
  const statuses=tab==='requests'?['pending','in_progress','published','resolved','rejected']:['active','suspended','deleted'];
  const kindChips=tab==='records'
    ?`<div class="admin-chips" role="group" aria-label="Filtrar por tipo">${[['','Todos'],['professional','Profissionais'],['vacancy','Vagas'],['advertiser','Anunciantes']].map(([v,lbl])=>`<button type="button" class="admin-chip" data-kind-filter="${v}" aria-pressed="${kindFilter===v?'true':'false'}">${lbl}</button>`).join('')}</div>`
    :'';
  const planSelect=tab==='records'
    ?`<label class="sr-only" for="admin-plan-filter">Plano ou verificação</label><select id="admin-plan-filter"><option value="">Todos os planos</option><option value="pro" ${planFilter==='pro'?'selected':''}>Somente PRO ativo</option><option value="free" ${planFilter==='free'?'selected':''}>Somente Básico</option><option value="unverified" ${planFilter==='unverified'?'selected':''}>Não verificados</option></select>`
    :'';
  const exportBtn=tab==='records'?'<button type="button" class="btn secondary" data-export-csv>Exportar CSV (Excel)</button>':'';
  $('#admin-content').innerHTML=`<section class="admin-panel">${kindChips}<div class="admin-toolbar"><label class="sr-only" for="admin-search">Buscar nos resultados carregados</label><input id="admin-search" type="search" placeholder="Buscar por nome, telefone, serviço ou e-mail" value="${esc(query)}">${tab==='audit'?'':`<label class="sr-only" for="admin-filter">Situação</label><select id="admin-filter"><option value="">Todas as situações</option>${statuses.map(s=>`<option value="${s}" ${s===filter?'selected':''}>${labels[s]}</option>`).join('')}</select>`}${planSelect}${exportBtn}</div><div id="admin-list-body"></div></section>`;
  renderListBody();
}

function renderListBody() {
  const host=$('#admin-list-body');if(!host)return;
  if(tab==='blocks'){renderBlocksBody();return;}
  const items=filteredRows();
  const titles={records:['Cadastro','Serviço / Plano','Situação',''],requests:['Pedido','Solicitante','Situação',''],users:['Conta','Objetivo','Situação',''],audit:['Quando','Ação','Responsável','Motivo']};
  host.innerHTML=`<p class="admin-note">${items.length} exibidos · ${rows.length} registros carregados${nextPageToken?' · há mais páginas':''}</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr>${titles[tab].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${items.map(rowMarkup).join('')}</tbody></table>${items.length?'':'<p class="admin-empty">Nenhum registro encontrado com este filtro.</p>'}</div>${nextPageToken?'<button type="button" class="btn secondary admin-more" data-more>Carregar mais registros</button>':''}`;
}

function rowMarkup({id,data:d}) {
  if(tab==='audit') {
    return `<tr><td data-label="Quando">${esc(date(d.createdAt))}</td><td data-label="Ação">${esc(d.action)}<small>${esc(d.targetId)}</small></td><td data-label="Responsável">${esc(d.actorEmail)}</td><td data-label="Motivo">${esc(d.reason)}</td></tr>`;
  }
  if(tab==='records') {
    const p=d.payload;
    const proActive=d.kind==='professional'&&isPro(p);
    const phoneText=p.phone?formatPhone(p.phone):'Sem WhatsApp';
    const badges=`<span class="admin-badges">${tag(d.status)}${proActive?'<span class="admin-tag pro-badge">PRO</span>':''}${p.status==='unverified'?'<span class="admin-tag unverified-tag">Não verificado</span>':''}</span>`;
    return `<tr><td data-label="Cadastro"><strong>${esc(p.name||p.title)}</strong><small>${esc(kindLabels[d.kind]||d.kind)} · ${esc(phoneText)}</small></td><td data-label="Serviço">${esc(categoryName(p.category))}</td><td data-label="Situação">${badges}</td><td data-label=""><button class="btn secondary" type="button" data-record="${esc(id)}">Revisar / editar</button></td></tr>`;
  }
  if(tab==='requests') {
    return `<tr><td data-label="Pedido"><strong>${esc(REQUEST_LABELS[d.event.type]||d.event.type)}</strong><small>${esc(date(d.createdAt))} · ${esc(id)}</small></td><td data-label="Solicitante">${esc(d.event.data.name||d.ownerEmail)}<small>${esc(d.event.data.phone?formatPhone(d.event.data.phone):d.ownerEmail)}</small></td><td data-label="Situação">${tag(d.status)}</td><td data-label=""><button class="btn ${d.status==='pending'?'primary':'secondary'}" type="button" data-record="${esc(id)}">${d.status==='pending'?'Analisar':'Abrir'}</button></td></tr>`;
  }
  return `<tr><td data-label="Conta"><strong>${esc(d.name)}</strong><small>${esc(d.email)}</small></td><td data-label="Objetivo">${esc(roleLabels[d.role]||d.role)}</td><td data-label="Situação">${tag(d.status)}</td><td data-label=""><button class="btn secondary" type="button" data-record="${esc(id)}">Gerenciar</button></td></tr>`;
}

function reasonField(id='action-reason',presets=['Conferido com o titular','Solicitação do titular','Ajuste cadastral']) {
  const chips=presets.length
    ?`<div class="admin-reason-presets" role="group" aria-label="Motivos rápidos">${presets.map(p=>`<button type="button" class="admin-preset-btn" data-reason-preset="${esc(p)}" data-reason-target="${esc(id)}">${esc(p)}</button>`).join('')}</div>`
    :'';
  return `<div class="field full"><label for="${id}">Motivo da alteração · obrigatório</label>${chips}<textarea id="${id}" name="reason" required maxlength="500" placeholder="Escolha um motivo rápido acima ou descreva o que foi conferido."></textarea></div><p class="admin-dialog-status full" role="status" aria-live="polite"></p>`;
}

function identityBlockMarkup(kind='email',value='',enabled=true,scope='new') {
  const presets=enabled
    ?['Bloqueio após análise administrativa','Cadastro abusivo ou spam','Solicitação de bloqueio']
    :['Bloqueio revisto pelo administrador','Regularizado pelo titular'];
  return `<form class="form-grid admin-form admin-block-form" data-identity-block novalidate><h3 class="full">${enabled?'Bloquear novos cadastros':'Desbloquear identificação'}</h3><p class="admin-note full">E-mail bloqueado impede uso e novos perfis no app. Telefone bloqueado impede novos pedidos/cadastros com esse número. Suspensão e exclusão de anúncio existente são ações separadas.</p><div class="field"><label for="block-kind-${scope}">Identificação</label><select id="block-kind-${scope}" name="kind"><option value="email" ${kind==='email'?'selected':''}>E-mail</option><option value="phone" ${kind==='phone'?'selected':''}>Telefone</option></select></div><div class="field"><label for="block-value-${scope}">E-mail ou telefone com DDD</label><input id="block-value-${scope}" name="value" value="${esc(value)}" required maxlength="180"></div><input type="hidden" name="enabled" value="${enabled}">${reasonField('block-reason-'+scope,presets)}<button type="submit" class="btn ${enabled?'admin-danger':'primary'}">${enabled?'Bloquear identificação':'Desbloquear identificação'}</button></form>`;
}

function renderBlocksShell() {
  $('#admin-content').innerHTML=`<section class="admin-panel"><div class="admin-step-card">${identityBlockMarkup()}</div><div class="admin-toolbar"><label class="sr-only" for="admin-search">Buscar bloqueios carregados</label><input id="admin-search" type="search" value="${esc(query)}" placeholder="Filtrar bloqueios por e-mail ou telefone"></div><div id="admin-list-body"></div></section>`;
  renderBlocksBody();
}

function renderBlocksBody() {
  const host=$('#admin-list-body');if(!host)return;
  const items=filteredRows();
  host.innerHTML=`<p class="admin-note">${items.length} exibidos · ${rows.length} bloqueios carregados${nextPageToken?' · há mais páginas':''}</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Identificação</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${items.map(({id,data:d})=>`<tr><td data-label="Identificação"><strong>${esc(d.value)}</strong><small>${d.kind==='email'?'E-mail':'Telefone'}</small></td><td data-label="Situação">${d.enabled?'<span class="admin-tag suspended">Bloqueado</span>':'<span class="admin-tag active">Liberado</span>'}</td><td data-label=""><button class="btn secondary" type="button" data-record="${esc(id)}">${d.enabled?'Desbloquear':'Bloquear'}</button></td></tr>`).join('')}</tbody></table></div>${!items.length?'<p class="admin-empty">Nenhum bloqueio encontrado.</p>':''}${nextPageToken?'<button type="button" class="btn secondary admin-more" data-more>Carregar mais</button>':''}`;
}

function detail(item) {
  current=item;const d=item.data;
  if(tab==='records') {
    const p=d.payload;
    const proActive=d.kind==='professional'&&isPro(p);
    const digits=phoneDigits(p.phone);
    const waLink=digits?`<a href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp (${esc(formatPhone(digits))}) ↗</a>`:'<span>Sem WhatsApp cadastrado</span>';
    const proInfo=proActive?`PRO ativo até ${esc(shortDate(p.proUntil))}`:'Plano Básico gratuito';
    open(`<section class="admin-detail">
      <div class="admin-detail-head">
        <span class="eyebrow">${kindLabels[d.kind]||'CADASTRO'} · ${esc(p.id)}</span>
        <h2 id="admin-dialog-title">${esc(p.name||p.title)}</h2>
        <div class="admin-badges">${tag(d.status)}<span class="admin-tag ${proActive?'pro-badge':'unverified-tag'}">${proInfo}</span>${p.status==='unverified'?'<span class="admin-tag unverified-tag">Não verificado</span>':''}</div>
        <div class="admin-detail-meta"><span>Serviço: <strong>${esc(categoryName(p.category))}</strong></span><span>·</span>${waLink}</div>
      </div>

      <div class="admin-step-card">
        <h3>1. Editar dados e visibilidade na vitrine</h3>
        <p class="admin-note">Alterações aqui atualizam o catálogo público imediatamente e ficam gravadas no Histórico.</p>
        <form class="form-grid admin-form" data-edit-record novalidate>
          ${d.kind==='professional'
            ?`<div class="field full"><label for="edit-name">Nome público</label><input id="edit-name" name="name" value="${esc(p.name)}" required maxlength="160"></div>
              <div class="field"><label for="edit-phone">Telefone com DDD</label><input id="edit-phone" name="phone" type="tel" ${p.contactOptions?.whatsapp===false?'':'required'} value="${esc(p.phone)}" maxlength="20"></div>
              <div class="field"><label for="edit-category">Serviço</label><select id="edit-category" name="category">${CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===p.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
              <div class="field full"><label for="edit-note">Observação pública</label><textarea id="edit-note" name="note" maxlength="140">${esc(p.note)}</textarea></div>`
            :`<p class="admin-note full">${esc(p.title||p.description||'Cadastro de '+kindLabels[d.kind])}</p>`}
          <label class="check full"><input type="checkbox" name="suspended" ${d.status==='suspended'?'checked':''}><span>Suspender (ocultar temporariamente este cadastro da vitrine)</span></label>
          ${reasonField('action-reason',['Nome/telefone conferidos com o titular','Solicitação de pausa pelo titular','Correção de categoria ou observação','Cadastro duplicado confirmado'])}
          <div class="admin-actions full">
            <button class="btn primary" type="submit" value="save">Salvar alteração</button>
          </div>
          <div class="admin-danger-zone full">
            <strong>Zona de exclusão (permanente na vitrine)</strong>
            <label class="check"><input type="checkbox" name="confirmDelete"><span>Confirmo excluir este cadastro da vitrine. O registro administrativo e o histórico serão preservados.</span></label>
            <div class="admin-actions"><button class="btn admin-danger" type="submit" value="delete">Excluir cadastro</button></div>
          </div>
        </form>
      </div>

      <div class="admin-step-card is-pro">
        <h3>2. Cortesia PRO · 6 meses grátis</h3>
        <p class="admin-note">Concessão manual sem cobrança ou renovação automática. Exige cadastro real aprovado, sem PRO ativo e sem cortesia anterior.</p>
        <form class="form-grid admin-form" data-grant-trial>
          <label class="check full"><input type="checkbox" name="confirmTrial" required><span>Autorizo conceder seis meses de PRO gratuitamente a este cadastro.</span></label>
          ${reasonField('trial-reason',['Cortesia autorizada para teste da plataforma','Parceiro inicial em Petrolina'])}
          <button type="submit" class="btn secondary">Conceder 6 meses grátis</button>
        </form>
      </div>

      ${p.phone?`<details class="admin-accordion"><summary>3. Ação avançada · Bloquear telefone (${esc(formatPhone(p.phone)||p.phone)})</summary>${identityBlockMarkup('phone',p.phone,true,'detail')}</details>`:''}
    </section>`);
  } else if(tab==='users') {
    open(`<section class="admin-detail">
      <div class="admin-detail-head">
        <span class="eyebrow">CONTA DO APLICATIVO</span>
        <h2 id="admin-dialog-title">${esc(d.name)}</h2>
        <div class="admin-badges">${tag(d.status)}<span class="admin-tag unverified-tag">${esc(roleLabels[d.role]||d.role)}</span></div>
      </div>
      <dl><dt>E-mail</dt><dd>${esc(d.email)}</dd><dt>WhatsApp privado</dt><dd>${esc(d.phone?formatPhone(d.phone):'Não informado')}</dd><dt>Criada em</dt><dd>${esc(date(d.createdAt))}</dd></dl>
      <div class="admin-step-card">
        <h3>Situação da conta</h3>
        <form class="form-grid admin-form" data-user-status novalidate>
          ${reasonField('action-reason',['Exclusão solicitada pelo titular','Suspensão preventiva após análise','Reativação após conferência'])}
          <input type="hidden" name="status" value="${d.status==='suspended'?'active':'suspended'}">
          <div class="admin-actions full">
            <button type="submit" class="btn ${d.status==='suspended'?'primary':'admin-danger'}" ${d.uid===auth.getUser().uid?'disabled':''}>${d.status==='suspended'?'Reativar conta':'Suspender conta'}</button>
          </div>
          <div class="admin-danger-zone full">
            <strong>Excluir usuário do app</strong>
            <label class="check"><input type="checkbox" name="confirmDelete"><span>Confirmo excluir o perfil do app e impedir o uso desta conta. A conta Google e o histórico administrativo são separados.</span></label>
            <div class="admin-actions"><button class="btn admin-danger" type="submit" value="deleted" ${d.uid===auth.getUser().uid||d.status==='deleted'?'disabled':''}>Excluir usuário do app</button></div>
          </div>
        </form>
      </div>
      ${d.uid!==auth.getUser().uid?`<details class="admin-accordion"><summary>Ação avançada · Bloquear e-mail (${esc(d.email)})</summary>${identityBlockMarkup('email',d.email,true,'detail')}</details>`:''}
    </section>`);
  } else if(tab==='blocks') {
    open(`<section class="admin-detail"><div class="admin-step-card"><h2 id="admin-dialog-title">${d.enabled?'Desbloquear identificação':'Bloquear identificação'}</h2>${identityBlockMarkup(d.kind,d.value,!d.enabled,'detail')}</div></section>`);
  } else if(tab==='requests') {
    const data=d.event.data,finished=!['pending','in_progress'].includes(d.status);
    const phoneNum=phoneDigits(data.phone);
    open(`<section class="admin-detail">
      <div class="admin-detail-head">
        <span class="eyebrow">PROTOCOLO ${esc(item.id)}</span>
        <h2 id="admin-dialog-title">${esc(REQUEST_LABELS[d.event.type]||d.event.type)}</h2>
        <div class="admin-badges">${tag(d.status)}</div>
        <div class="admin-detail-meta"><span>Recebido em ${esc(date(d.createdAt))}</span>${phoneNum?`<span>·</span><a href="https://wa.me/${esc(phoneNum)}" target="_blank" rel="noopener noreferrer">Conferir no WhatsApp (${esc(formatPhone(phoneNum))}) ↗</a>`:''}</div>
      </div>
      <dl>${Object.entries(data).filter(([key,value])=>!['files','media'].includes(key)&&value!==''&&value!=null).map(([key,value])=>`<dt>${esc(({name:'Nome',phone:'Telefone',category:'Serviço',note:'Observação',description:'Descrição',neighborhood:'Região',consent:'Aceite'})[key]||key)}</dt><dd>${esc(key==='category'?categoryName(value):key==='phone'?formatPhone(value)||value:typeof value==='object'?JSON.stringify(value):value)}</dd>`).join('')}</dl>
      ${(data.files||[]).map(f=>/^image\/(png|jpeg|webp)$/.test(f.mime)&&/^[A-Za-z0-9+/=]+$/.test(f.base64)&&f.base64.length<710000?`<details class="admin-accordion"><summary>Ver anexo enviado · ${esc(f.type)}</summary><img class="admin-attachment" src="data:${f.mime};base64,${f.base64}" alt="Anexo enviado no pedido"></details>`:'').join('')}
      ${finished?'':`<div class="admin-step-card"><h3>Decisão do administrador</h3><form class="form-grid admin-form" data-request-decision>${d.event.type==='novo_cadastro_gratuito'&&d.status==='pending'?'<label class="check full"><input type="checkbox" name="ownershipConfirmed"><span>Conferi, fora do formulário, o controle do telefone pelo titular.</span></label><label class="check full"><input type="checkbox" name="publicationConsent"><span>Conferi a autorização para publicar os dados de contato.</span></label>':''}${reasonField('action-reason',['Titularidade e autorização conferidas por WhatsApp','Em atendimento pela equipe','Atendimento concluído','Dados incompletos ou recusados'])}<div class="admin-actions full">${d.event.type==='novo_cadastro_gratuito'&&d.status==='pending'?'<button class="btn primary" name="decision" value="publish" type="submit">Publicar cadastro básico</button>':''}<button class="btn secondary" name="decision" value="in_progress" type="submit">Assumir atendimento</button><button class="btn secondary" name="decision" value="resolved" type="submit">Concluir atendimento</button><button class="btn admin-danger" name="decision" value="rejected" type="submit">Recusar</button></div></form><p class="admin-note">Concluir atendimento encerra o protocolo sem publicar anúncio ou liberar benefícios. Para publicar na vitrine, marque as conferências e clique em Publicar cadastro básico.</p></div>`}
    </section>`);
  }
}

async function perform(form,operation) {
  if(busy||!allowed)return;busy=true;
  const finishLoading=beginLoading();
  const buttons=[...form.querySelectorAll('button[type=submit],button:not([type])')].map(button=>({button,text:button.textContent,disabled:button.disabled}));
  for(const {button} of buttons){button.disabled=true;button.classList.add('is-loading');button.textContent='Salvando…';}
  form.setAttribute('aria-busy','true');
  const pageStatus=$('#admin-status');if(pageStatus){pageStatus.className='notice';pageStatus.textContent='Salvando alteração…';}
  const status=form.querySelector('[role=status]');if(status)status.textContent='Salvando alteração. Aguarde a confirmação…';
  try {await operation();if(status)status.textContent='Alteração salva e registrada no histórico.';dialog.close();await load({successMessage:'Alteração salva e registrada no histórico.'});}
  catch(error){if(error?.code===401)errorMessage(error);else {
    if(status)status.textContent=error?.code===403?'Operação não autorizada. Confira os bloqueios e suas permissões antes de tentar novamente.':error.message;
    if(pageStatus?.isConnected){pageStatus.className='notice admin-error';pageStatus.textContent='Não foi salvo. Confira a mensagem no formulário.';}
  }}
  finally{finishLoading();busy=false;form.setAttribute('aria-busy','false');for(const {button,text,disabled} of buttons){button.disabled=disabled;button.textContent=text;button.classList.remove('is-loading');}}
}

document.addEventListener('invalid',event=>{
  const field=event.target,form=field.closest('.admin-form');if(!form)return;
  const label=form.querySelector(`label[for="${field.id}"]`)?.textContent|| (field.name==='confirmDelete'?'Confirmação de exclusão':'Campo obrigatório');
  const status=form.querySelector('[role=status]');if(status)status.textContent='Não foi salvo. Confira: '+label+'. '+field.validationMessage;
},true);

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||busy||!allowed)return;
  if(button.dataset.reasonPreset) {
    const target=document.getElementById(button.dataset.reasonTarget);
    if(target){target.value=button.dataset.reasonPreset;target.focus();}
    return;
  }
  if(button.dataset.openRequest) {
    const item=rows.find(i=>i.id===button.dataset.openRequest);
    if(item){tab='requests';detail(item);}
    return;
  }
  if(button.dataset.kindFilter!==undefined) {
    kindFilter=button.dataset.kindFilter;
    for(const chip of main.querySelectorAll('[data-kind-filter]'))chip.setAttribute('aria-pressed',chip.dataset.kindFilter===kindFilter?'true':'false');
    renderListBody();
    return;
  }
  if(button.hasAttribute('data-export-csv')) {
    const csv=recordsToCsv(filteredRows());
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`ajuda-em-casa-cadastros-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    return;
  }
  if(button.dataset.tab){tab=button.dataset.tab;query='';filter='';kindFilter='';planFilter='';generation++;load();return;}
  if(button.hasAttribute('data-refresh')){load();return;}
  if(button.hasAttribute('data-more')){load({more:true});return;}
  if(button.dataset.record){const item=rows.find(i=>i.id===button.dataset.record);if(item)detail(item);}
});

document.addEventListener('input',event=>{
  if(event.target.id==='admin-search'){
    query=event.target.value.toLocaleLowerCase('pt-BR');
    renderListBody();
  }
});
document.addEventListener('change',event=>{
  if(event.target.id==='admin-filter'){filter=event.target.value;renderListBody();}
  if(event.target.id==='admin-plan-filter'){planFilter=event.target.value;renderListBody();}
});

document.addEventListener('submit',event=>{
  const form=event.target;if(!form.matches('[data-edit-record],[data-user-status],[data-request-decision],[data-settings],[data-identity-block],[data-grant-trial]'))return;
  event.preventDefault();
  const deleting=event.submitter?.value==='delete'||event.submitter?.value==='deleted';
  const confirmation=form.querySelector('[name=confirmDelete]');if(confirmation)confirmation.required=deleting;
  const phone=form.querySelector('[name=phone]');if(phone)phone.required=!deleting&&!form.querySelector('[name=suspended]')?.checked;
  if(!form.reportValidity())return;
  const raw=Object.fromEntries(new FormData(form));
  if(event.submitter?.value==='deleted')raw.status='deleted';
  perform(form,async()=>{
    if(form.matches('[data-edit-record]'))return service.saveRecord(current,current.data.kind==='professional'?editProfessional(current.data.payload,raw,{allowMissingPhone:deleting||raw.suspended==='on'}):current.data.payload,raw.reason,deleting?'deleted':raw.suspended==='on'?'suspended':'active');
    if(form.matches('[data-grant-trial]')){if(raw.confirmTrial!=='on')throw new Error('Confirme a cortesia.');return service.grantTrial(current,raw.reason);}
    if(form.matches('[data-identity-block]'))return service.saveBlock(raw.kind,raw.value,raw.enabled==='true',raw.reason);
    if(form.matches('[data-user-status]'))return service.setUserStatus(current,raw.status,raw.reason);
    if(form.matches('[data-settings]'))return service.saveSettings(settings,{...raw,registrationOpen:raw.registrationOpen==='on'},raw.reason);
    const decision=event.submitter?.value;
    if(decision==='publish')return service.approveBasic(current,{ownershipConfirmed:raw.ownershipConfirmed==='on',publicationConsent:raw.publicationConsent==='on'},raw.reason);
    return service.decideRequest(current,decision,raw.reason);
  });
});

$('#admin-signout').addEventListener('click',async()=>{
  const button=$('#admin-signout');button.disabled=true;button.textContent='Saindo…';button.classList.add('is-loading');
  generation++;allowed=false;counts={pendingRequests:null,records:null,users:null};main.innerHTML='<p role="status">Encerrando a sessão…</p>';if(dialog.open)dialog.close();
  try{await auth.signOut();signInView();}catch(error){signInView(authErrorMessage(error));}
  finally{button.disabled=false;button.textContent='Sair da conta';button.classList.remove('is-loading');}
});

async function sessionChanged(user) {
  const version=++generation;
  if(!user){signInView();return;}
  if(!user.emailVerified){signInView('Confirme o e-mail da sua conta antes de acessar o painel.');return;}
  const finishLoading=beginLoading();
  main.innerHTML='<p role="status">Conferindo a autorização da conta…</p>';
  try {
    if(!await service.access())throw new Error('A sua conta Google não está autorizada para administrar este aplicativo.');
    if(version!==generation)return;allowed=true;await load();
  }catch(error){if(version===generation)signInView(error.message);}
  finally {finishLoading();}
}

try {
  const response=await fetch('config.json',{cache:'no-store'});if(!response.ok)throw new Error('Não foi possível carregar a configuração.');
  const config=await response.json();
  if(!authConfigured(config)||!backendConfigured(config))signInView('O painel aguarda a conexão do projeto Firebase do responsável.',{unavailable:true});
  else {auth=createAuthService({...config,auth:{...config.auth,persistence:'session'}});client=createDataClient(config,auth);service=createAdminService(client,auth);await auth.ready();auth.subscribe(sessionChanged);}
}catch(error){signInView(authErrorMessage(error),{unavailable:true});}
finally {finishStartup();}
