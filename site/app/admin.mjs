import {createAuthService,authConfigured,authErrorMessage} from './auth-service.mjs?v=dae75b201aa5';
import {createDataClient,backendConfigured} from './firestore.mjs?v=dae75b201aa5';
import {createAdminService,editProfessional,REQUEST_LABELS} from './admin-domain.mjs?v=dae75b201aa5';
import {CATEGORIES,categoryName} from './domain.mjs?v=dae75b201aa5';

const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const labels={active:'Ativo',suspended:'Suspenso',pending:'Pendente',in_progress:'Em atendimento',rejected:'Recusado',resolved:'Concluído',published:'Publicado'};
const kindLabels={professional:'Profissional',vacancy:'Vaga',advertiser:'Anunciante'};
const tabs={overview:'Visão geral',requests:'Pedidos',records:'Cadastros',users:'Contas',settings:'Configurações',audit:'Histórico'};
let auth,client,service,allowed=false,generation=0,tab='overview',rows=[],nextPageToken='',current,settings,query='',filter='',busy=false;
const date=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
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
  main.innerHTML=`<section class="admin-login"><span class="eyebrow">ÁREA RESTRITA</span><h1>Administração da casa.</h1><p>${esc(message)}</p>${unavailable?'':`<button id="admin-google" class="google-button" type="button"><img src="assets/google-g.svg" width="20" height="20" alt=""><span>Entrar com Google</span></button>`}<p id="admin-login-status" role="status" aria-live="polite"></p><p class="admin-note">O acesso administrativo depende da autorização da sua conta. Entrar no Google, por si só, não libera o painel.</p><a href="index.html">Voltar ao aplicativo</a></section>`;
  $('#admin-google')?.addEventListener('click',async()=>{
    const button=$('#admin-google');button.disabled=true;
    try{await auth.signInGoogle();}
    catch(error){const el=$('#admin-login-status');if(el)el.textContent=authErrorMessage(error);}
    finally{if(button.isConnected)button.disabled=false;}
  });
}
function shell() {
  $('#admin-account').textContent=auth.getUser().email;$('#admin-signout').hidden=false;
  main.innerHTML=`<div class="admin-layout"><nav class="admin-nav" aria-label="Administração">${Object.entries(tabs).map(([id,label])=>`<button type="button" data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}</nav><section class="admin-section"><div class="admin-heading"><div><span class="eyebrow">AJUDA EM CASA · PETROLINA</span><h1>${tabs[tab]}</h1><p>Cuide dos cadastros e acompanhe o que precisa de atenção.</p></div><button class="btn secondary" type="button" data-refresh>Atualizar</button></div><p id="admin-status" role="status" aria-live="polite"></p><div id="admin-content"></div></section></div>`;
}
function errorMessage(error) {
  if(error?.code===403||error?.code===401){signInView('Acesso não autorizado ou sessão expirada. Entre com a conta administradora.');return;}
  const el=$('#admin-status');if(el){el.className='notice admin-error';el.textContent=error.message||'Não foi possível carregar os dados.';}
}
async function load({more=false}={}) {
  if(!allowed)return;
  const version=generation,selected=tab;shell();$('.admin-section').setAttribute('aria-busy','true');
  try {
    if(tab==='overview') {
      const [req,cat,user]=await Promise.all(['requests','records','users'].map(k=>client.list(k)));
      if(version!==generation||selected!==tab)return;
      $('#admin-content').innerHTML=`<div class="admin-summary"><strong>O que merece sua atenção</strong><p>Confira pedidos pendentes, revise contatos e mantenha a vitrine atualizada. Cada alteração exige um motivo e fica no histórico.</p></div><div class="admin-cards">${[[req,'Pedidos carregados',req.items.filter(i=>i.data.status==='pending').length+' pendentes','requests'],[cat,'Cadastros carregados',cat.items.filter(i=>i.data.status==='suspended').length+' suspensos','records'],[user,'Contas carregadas',user.items.filter(i=>i.data.status==='suspended').length+' suspensas','users']].map(([r,title,note,dest])=>`<section class="admin-metric"><span>${title}</span><strong>${r.items.length}${r.nextPageToken?'+':''}</strong><p class="admin-note">${note} nesta página de resultados</p><button class="btn secondary" type="button" data-tab="${dest}">Abrir ${tabs[dest].toLowerCase()}</button></section>`).join('')}</div><p class="admin-note">Os pedidos desta área pertencem à nova fila autenticada. Solicitações anteriores permanecem preservadas no atendimento n8n.</p><p><a href="https://sternplatypus-n8n.cloudfy.live/workflow/Wchwco3Q58qJakDI" target="_blank" rel="noopener noreferrer">Abrir atendimento anterior no n8n</a></p>`;
    } else if(tab==='settings') {
      settings=await client.get('settings/site');
      if(version!==generation||selected!==tab)return;
      if(!settings)throw new Error('As configurações iniciais ainda não foram criadas.');
      $('#admin-content').innerHTML=`<section class="admin-panel"><form class="form-grid admin-form" data-settings><div class="field full"><label for="directory-message">Mensagem de abertura da vitrine</label><input id="directory-message" name="directoryMessage" required maxlength="180" value="${esc(settings.data.directoryMessage)}"></div><label class="check full"><input type="checkbox" name="registrationOpen" ${settings.data.registrationOpen?'checked':''}><span>Receber novos pedidos</span></label><p class="admin-note full">Ao pausar, pedidos já recebidos e contatos publicados são preservados.</p>${reasonField()}<button type="submit" class="btn primary">Salvar configurações</button></form></section>`;
    } else {
      const response=await client.list(tab,{pageToken:more?nextPageToken:''});
      if(version!==generation||selected!==tab)return;
      rows=more?[...rows,...response.items]:response.items;nextPageToken=response.nextPageToken;renderList();
    }
  }catch(error){if(version===generation)errorMessage(error);}
  finally{if(version===generation)$('.admin-section')?.setAttribute('aria-busy','false');}
}
function renderList() {
  const items=rows.filter(({id,data:d})=>(!filter||d.status===filter)&&(!query||JSON.stringify([id,d.payload?.name,d.payload?.phone,d.event?.data?.name,d.event?.data?.phone,d.email,d.name,d.actorEmail,d.reason]).toLocaleLowerCase('pt-BR').includes(query)));
  const titles={records:['Cadastro','Serviço','Situação',''],requests:['Pedido','Solicitante','Situação',''],users:['Conta','Objetivo','Situação',''],audit:['Quando','Ação','Responsável','Motivo']};
  const statuses=tab==='requests'?['pending','in_progress','published','resolved','rejected']:['active','suspended'];
  $('#admin-content').innerHTML=`<section class="admin-panel"><div class="admin-toolbar"><label class="sr-only" for="admin-search">Buscar nos resultados carregados</label><input id="admin-search" type="search" placeholder="Buscar por nome, telefone ou e-mail" value="${esc(query)}">${tab==='audit'?'':`<label class="sr-only" for="admin-filter">Situação</label><select id="admin-filter"><option value="">Todas as situações</option>${statuses.map(s=>`<option value="${s}" ${s===filter?'selected':''}>${labels[s]}</option>`).join('')}</select>`}</div><p class="admin-note">${items.length} resultados · ${rows.length} registros carregados${nextPageToken?' · há mais páginas':''}</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr>${titles[tab].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${items.map(rowMarkup).join('')}</tbody></table>${items.length?'':'<p class="admin-empty">Nenhum registro encontrado.</p>'}</div>${nextPageToken?'<button type="button" class="btn secondary admin-more" data-more>Carregar mais registros</button>':''}</section>`;
}
function rowMarkup({id,data:d}) {
  if(tab==='audit')return `<tr><td>${esc(date(d.createdAt))}</td><td>${esc(d.action)}<small>${esc(d.targetId)}</small></td><td>${esc(d.actorEmail)}</td><td>${esc(d.reason)}</td></tr>`;
  const details=tab==='records'?[d.payload.name,kindLabels[d.kind],categoryName(d.payload.category)]:tab==='requests'?[REQUEST_LABELS[d.event.type]||d.event.type,id,d.event.data.name||d.ownerEmail]:[d.name,d.email,({worker:'Trabalhador',contractor:'Contratante',agency:'Agenciador'})[d.role]||d.role];
  return `<tr><td>${esc(details[0])}<small>${esc(details[1])}</small></td><td>${esc(details[2])}</td><td>${tag(d.status)}</td><td><button class="btn secondary" type="button" data-record="${esc(id)}">${tab==='records'?'Revisar / editar':'Abrir'}</button></td></tr>`;
}
const reasonField=()=>'<div class="field full"><label for="action-reason">Motivo da alteração</label><textarea id="action-reason" name="reason" required maxlength="500" placeholder="Registre o que foi conferido e por que a alteração é necessária."></textarea></div><p class="admin-dialog-status full" role="status" aria-live="polite"></p>';
function detail(item) {
  current=item;const d=item.data;
  if(tab==='records') {
    const p=d.payload;
    open(`<section class="admin-detail"><span class="eyebrow">${kindLabels[d.kind]||'CADASTRO'} · ${esc(p.id)}</span><h2 id="admin-dialog-title">${esc(p.name||p.title)}</h2><p>${tag(d.status)}</p><form class="form-grid admin-form" data-edit-record>${d.kind==='professional'?`<div class="field full"><label for="edit-name">Nome público</label><input id="edit-name" name="name" value="${esc(p.name)}" required maxlength="160"></div><div class="field"><label for="edit-phone">Telefone com DDD</label><input id="edit-phone" name="phone" type="tel" value="${esc(p.phone)}" maxlength="20"></div><div class="field"><label for="edit-category">Serviço</label><select id="edit-category" name="category">${CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===p.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label for="edit-note">Observação pública</label><textarea id="edit-note" name="note" maxlength="140">${esc(p.note)}</textarea></div>`:`<p class="admin-note full">${esc(p.title||p.description||'Cadastro de '+kindLabels[d.kind])}</p>`}<label class="check full"><input type="checkbox" name="suspended" ${d.status==='suspended'?'checked':''}><span>Suspender a exibição deste cadastro na vitrine</span></label><p class="admin-note full">Salvar atualiza a vitrine. Plano, selo e conferência de titularidade não mudam nesta edição.</p>${reasonField()}<button class="btn primary" type="submit">Salvar alteração</button></form></section>`);
  } else if(tab==='users') {
    open(`<section class="admin-detail"><span class="eyebrow">CONTA DO APLICATIVO</span><h2 id="admin-dialog-title">${esc(d.name)}</h2><dl><dt>E-mail</dt><dd>${esc(d.email)}</dd><dt>Situação</dt><dd>${tag(d.status)}</dd><dt>Criada em</dt><dd>${esc(date(d.createdAt))}</dd></dl><form class="form-grid admin-form" data-user-status>${reasonField()}<input type="hidden" name="status" value="${d.status==='suspended'?'active':'suspended'}"><button type="submit" class="btn ${d.status==='suspended'?'primary':'admin-danger'}" ${d.uid===auth.getUser().uid?'disabled':''}>${d.status==='suspended'?'Reativar conta':'Suspender conta'}</button><p class="admin-note full">A suspensão bloqueia operações privadas no app; não apaga a identidade Google nem concede acesso administrativo.</p></form></section>`);
  } else if(tab==='requests') {
    const data=d.event.data,finished=!['pending','in_progress'].includes(d.status);
    open(`<section class="admin-detail"><span class="eyebrow">PROTOCOLO ${esc(item.id)}</span><h2 id="admin-dialog-title">${esc(REQUEST_LABELS[d.event.type]||d.event.type)}</h2><p>${tag(d.status)}</p><dl>${Object.entries(data).filter(([key,value])=>!['files','media'].includes(key)&&value!==''&&value!=null).map(([key,value])=>`<dt>${esc(({name:'Nome',phone:'Telefone',category:'Serviço',note:'Observação',description:'Descrição',neighborhood:'Região',consent:'Aceite'})[key]||key)}</dt><dd>${esc(typeof value==='object'?JSON.stringify(value):value)}</dd>`).join('')}</dl>${(data.files||[]).map(f=>/^image\/(png|jpeg|webp)$/.test(f.mime)&&/^[A-Za-z0-9+/=]+$/.test(f.base64)&&f.base64.length<710000?`<details><summary>Anexo · ${esc(f.type)}</summary><img class="admin-attachment" src="data:${f.mime};base64,${f.base64}" alt="Anexo enviado no pedido"></details>`:'').join('')}${finished?'':`<form class="form-grid admin-form" data-request-decision>${d.event.type==='novo_cadastro_gratuito'&&d.status==='pending'?'<label class="check full"><input type="checkbox" name="ownershipConfirmed"><span>Conferi, fora do formulário, o controle do telefone pelo titular.</span></label><label class="check full"><input type="checkbox" name="publicationConsent"><span>Conferi a autorização para publicar os dados de contato.</span></label>':''}${reasonField()}<div class="admin-actions full"><button class="btn secondary" name="decision" value="in_progress" type="submit">Assumir atendimento</button><button class="btn secondary" name="decision" value="resolved" type="submit">Concluir atendimento</button><button class="btn admin-danger" name="decision" value="rejected" type="submit">Recusar</button>${d.event.type==='novo_cadastro_gratuito'&&d.status==='pending'?'<button class="btn primary" name="decision" value="publish" type="submit">Publicar cadastro básico</button>':''}</div></form>`}<p class="admin-note">Concluir atendimento não publica anúncio, confirma pagamento ou concede benefícios. A publicação básica exige as conferências indicadas.</p></section>`);
  }
}
async function perform(form,operation) {
  if(busy||!allowed)return;busy=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  const status=form.querySelector('[role=status]');if(status)status.textContent='Salvando…';
  try {await operation();dialog.close();await load();const el=$('#admin-status');if(el){el.className='notice admin-success';el.textContent='Alteração salva e registrada no histórico.';}}
  catch(error){if(error?.code===403||error?.code===401)errorMessage(error);else if(status)status.textContent=error.message;}
  finally{busy=false;buttons.forEach(b=>b.disabled=false);}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||busy||!allowed)return;
  if(button.dataset.tab){tab=button.dataset.tab;query='';filter='';generation++;load();}
  if(button.hasAttribute('data-refresh'))load();
  if(button.hasAttribute('data-more'))load({more:true});
  if(button.dataset.record){const item=rows.find(i=>i.id===button.dataset.record);if(item)detail(item);}
});
document.addEventListener('input',event=>{if(event.target.id==='admin-search'){const start=event.target.selectionStart;query=event.target.value.toLocaleLowerCase('pt-BR');renderList();$('#admin-search').focus();$('#admin-search').setSelectionRange(start,start);}});
document.addEventListener('change',event=>{if(event.target.id==='admin-filter'){filter=event.target.value;renderList();}});
document.addEventListener('submit',event=>{
  const form=event.target;if(!form.matches('[data-edit-record],[data-user-status],[data-request-decision],[data-settings]'))return;
  event.preventDefault();if(!form.reportValidity())return;const raw=Object.fromEntries(new FormData(form));
  perform(form,async()=>{
    if(form.matches('[data-edit-record]'))return service.saveRecord(current,current.data.kind==='professional'?editProfessional(current.data.payload,raw):current.data.payload,raw.reason,raw.suspended==='on'?'suspended':'active');
    if(form.matches('[data-user-status]'))return service.setUserStatus(current,raw.status,raw.reason);
    if(form.matches('[data-settings]'))return service.saveSettings(settings,{...raw,registrationOpen:raw.registrationOpen==='on'},raw.reason);
    const decision=event.submitter?.value;
    if(decision==='publish')return service.approveBasic(current,{ownershipConfirmed:raw.ownershipConfirmed==='on',publicationConsent:raw.publicationConsent==='on'},raw.reason);
    return service.decideRequest(current,decision,raw.reason);
  });
});
$('#admin-signout').addEventListener('click',async()=>{generation++;allowed=false;main.replaceChildren();if(dialog.open)dialog.close();await auth.signOut();signInView();});
async function sessionChanged(user) {
  const version=++generation;
  if(!user){signInView();return;}
  if(!user.emailVerified){signInView('Confirme o e-mail da sua conta antes de acessar o painel.');return;}
  main.innerHTML='<p role="status">Conferindo a autorização da conta…</p>';
  try {
    if(!await service.access())throw new Error('A sua conta Google não está autorizada para administrar este aplicativo.');
    if(version!==generation)return;allowed=true;await load();
  }catch(error){if(version===generation)signInView(error.message);}
}
try {
  const response=await fetch('config.json',{cache:'no-store'});if(!response.ok)throw new Error('Não foi possível carregar a configuração.');
  const config=await response.json();
  if(!authConfigured(config)||!backendConfigured(config))signInView('O painel aguarda a conexão do projeto Firebase do responsável.',{unavailable:true});
  else {auth=createAuthService(config);client=createDataClient(config,auth);service=createAdminService(client,auth);await auth.ready();auth.subscribe(sessionChanged);}
}catch(error){signInView(authErrorMessage(error),{unavailable:true});}
