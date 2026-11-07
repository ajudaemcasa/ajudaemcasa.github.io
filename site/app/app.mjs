import { CATEGORIES, NEIGHBORHOODS, CONDOMINIUMS, MEDIA_LABELS, categoryName, visibleProfile, searchProfiles, whatsappUrl, isPro, featuredDays, monthKey, validateEvent } from './domain.mjs?v=dae75b201aa5';
import { formatPhone, phoneDigits, duplicateProfiles } from './telefone.mjs?v=dae75b201aa5';
import { createN8nService } from './n8n-service.mjs?v=dae75b201aa5';
import { commercialOffer } from './comercial.mjs?v=dae75b201aa5';
import { proPaymentMarkup } from './comercial-ui.mjs?v=dae75b201aa5';
import { locationPicker, getLocation, initLocationPickers } from './localizacao-ui.mjs?v=dae75b201aa5';
import { distanceLabel, searchVacancies } from './localizacao.mjs?v=dae75b201aa5';
import {agencyFeeEditor,intermediationMarkup,readIntermediation} from './intermediacao-ui.mjs?v=dae75b201aa5';
import {adHeader,adDetailsMarkup,purposeField,adEditorFields,readAdDetails,updateAdPreview,modelsMarkup} from './anuncios-ui.mjs?v=dae75b201aa5';
import { createAuthService } from './auth-service.mjs?v=dae75b201aa5';
import { createAccountStore } from './conta.mjs?v=dae75b201aa5';
import { createAccountUI, roleLandingMarkup } from './conta-ui.mjs?v=dae75b201aa5';
import {profileHeading} from './perfil.mjs?v=dae75b201aa5';
import {createDataClient,backendConfigured} from './firestore.mjs?v=dae75b201aa5';
import {createRequestService} from './request-service.mjs?v=dae75b201aa5';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const paths = {
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M21 14l-4 1 1 4M3 14l4 1-1 4M21 10l-4-1 1-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  water: '<path d="M3 10q3-4 6 0t6 0t6 0M3 16q3-4 6 0t6 0t6 0M3 22q3-4 6 0t6 0t6 0M8 7V3q0-2 3-2M16 7V3q0-2 3-2M8 4h8"/>',
  bolt: '<path d="m14 2-9 12h7l-2 8 9-12h-7z"/>',
  drop: '<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13zM9 16q0 3 3 3"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4M18 4h4"/>',
  bricks: '<rect x="2" y="4" width="20" height="16" rx="1"/><path d="M2 9h20M2 15h20M10 4v5M7 9v6M16 9v6M12 15v5"/>',
  tool: '<path d="M14 7a5 5 0 0 1 7-5l-3 3 1 3 3 1a5 5 0 0 1-7 6l-7 7-5-5 7-7a5 5 0 0 1 4-3z"/>',
  home: '<path d="m2 11 10-8 10 8M5 9v12h14V9M9 21v-7h6v7"/>',
  heart: '<path d="M12 21 3 12C-3 5 7-2 12 5c5-7 15 0 9 7z"/>',
  leaf: '<path d="M4 20Q0 3 21 3q0 19-17 17zM4 20 16 8"/>',
  check: '<path d="m9 12 2 2 4-4"/><path d="m12 2 3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1z"/>'
};
const icon = id => `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true">${paths[id] || paths.home}</svg>`;
const options = (items, selected = '') => items.map(item => { const value = typeof item === 'string' ? item : item.id; const label = typeof item === 'string' ? item : item.name; return `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`; }).join('');
const dialog = $('#dialog');
const infoDialog = $('#info-dialog');
let config, catalog, vacancies, advertisers, service, accountUI, toastTimer, lastFocus, auth, dataClient;
let infoLastFocus, lastResultMarkup='';
let sponsorClickSent = false;
const LISTING_PAGE_SIZE=4;
let visibleLimit=LISTING_PAGE_SIZE,lastFiltersKey='';
let cardsLayoutFrame;
function refreshCardsLayout() {
  cancelAnimationFrame(cardsLayoutFrame);
  cardsLayoutFrame=requestAnimationFrame(()=>{
    const results=$('#results');
    results.style.removeProperty('--card-title-height');
    if(results.dataset.layout==='cards') {
      const titles=[...results.querySelectorAll(':scope>.person-card h3')];
      const height=Math.max(0,...titles.map(title=>title.getBoundingClientRect().height));
      if(height)results.style.setProperty('--card-title-height',Math.ceil(height)+'px');
    }
    updateCardsNavigation();
  });
}
const filters = { category: '', neighborhood: '', query: '', emergency: false, sort:'recommended', origin:null, mode:'professionals' };
const mediaBlobs = new Set();
const availableProfiles=()=>catalog.profiles.filter(p=>!p.demo || config.showDemoProfiles===true);
const distanceMarkup=p=>Object.hasOwn(p,'distanceKm')?`<p class="distance-label">⌖ ${esc(distanceLabel(p.distanceKm))}</p>`:'';
function resolveLocality(value) {
  const text=String(value||'').trim();
  const condo=CONDOMINIUMS.find(c=>text===`${c.name} · ${c.neighborhood || 'Petrolina'}`);
  return condo?{neighborhood:condo.neighborhood || 'Petrolina',condominiumId:condo.id}:{neighborhood:text};
}
function registrationLocation() {
  return `<fieldset class="full"><legend>Endereço de referência · localização aproximada</legend><label for="registration-area">Bairro ou condomínio em Petrolina</label><input id="registration-area" name="area" list="locality-options" maxlength="220" placeholder="Digite para buscar na lista ou informe outro bairro"><label for="registration-street">Rua ou avenida (opcional, sem número)</label><input id="registration-street" maxlength="100" autocomplete="off" placeholder="Referência apenas nesta tela"><p class="micro">Rua não é enviada nem armazenada. O bairro e a região aproximada ajudam a encontrar oportunidades perto de você; não publique número ou apartamento.</p>${locationPicker()}<label class="check"><input type="checkbox" name="locationConsent"><span>Autorizo usar e divulgar somente minha região aproximada (~1 km), se eu definir um ponto. Sei que ela não garante anonimato.</span></label></fieldset>`;
}
function vacancyCard(job) {
  const number=phoneDigits(job.phone);
  const agency=job.ad.kind==='agency';
  const message=agency?'Olá! Vi a oportunidade '+job.title+' no Ajuda em Casa Petrolina e quero falar diretamente com o agenciador.':'Olá! Vi a vaga '+job.title+' no Ajuda em Casa Petrolina e tenho interesse em conversar sobre o trabalho.';
  const href=number?'https://wa.me/'+number+'?text='+encodeURIComponent(message):null;
  const ad=job.ad;
  return `<article class="person-card basic-card job-card ad-poster ad-tone-${ad.tone}" data-job="${esc(job.id)}" data-plan="${ad.premium?'pro':'free'}">${job.promotion?.paidBoostDays?`<div class="feature-badge">🔥 Destaque avulso · restam ${job.promotion.paidBoostDays} dias</div>`:job.promotion?.agencyTrialDays?`<div class="feature-badge">Agenciador em destaque · período inicial de 6 meses · restam ${job.promotion.agencyTrialDays} dias</div>`:''}${adHeader(ad)}<p class="ad-model-name">${ad.premium?esc(ad.name):'Oportunidade · básico'}</p><h3>${esc(job.title)}</h3><p class="ad-byline">Divulgado por ${esc(job.publicName)}</p>${distanceMarkup(job)}<p>${esc(job.neighborhood)}</p><p>${esc(job.description)}</p>${ad.premium?adDetailsMarkup(ad,job.neighborhood):`<p>${esc(job.schedule)}</p>`}${intermediationMarkup(job.intermediation)}${href?`<a class="btn whatsapp" target="_blank" rel="noopener noreferrer" href="${esc(href)}">${agency?'Falar com o agenciador':'Tenho interesse na vaga'} ↗</a>`:''}<p class="micro">Confirme disponibilidade e condições. Endereço exato e referências só na conversa privada.</p></article>`;
}

function toast(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6000);
}
function gallery(profile) {
  if (!profile.media?.length) return '';
  return `<div class="carousel" aria-label="Trabalhos de ${esc(profile.name)}" aria-roledescription="carrossel"><div class="slides" tabindex="0" aria-label="Galeria; use as setas para navegar">${profile.media.map((media, index) => `<figure class="slide" aria-label="${index + 1} de ${profile.media.length}"><img ${media.type === 'cartao' || media.type === 'certificado' ? 'class="media-card"' : ''} src="${esc(media.url)}" alt="${esc(media.alt || MEDIA_LABELS[media.type] + ' · ' + profile.name)}" loading="lazy" referrerpolicy="no-referrer" width="600" height="340"><figcaption>${MEDIA_LABELS[media.type]}</figcaption></figure>`).join('')}</div><div class="carousel-bottom"><span class="carousel-label">${profile.demo ? 'IMAGENS ILUSTRATIVAS' : 'GALERIA DE TRABALHOS'} · <span class="slide-count">1 / ${profile.media.length}</span></span>${profile.media.length > 1 ? '<div class="carousel-controls"><button type="button" data-slide="-1" aria-label="Imagem anterior">‹</button><button type="button" data-slide="1" aria-label="Próxima imagem">›</button></div>' : ''}</div></div>`;
}
function contactButton(profile) {
  if(profile.unverified && !profile.phone) return profile.sourceUrl ? `<a class="btn secondary" href="${esc(profile.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver anúncio original ↗</a>` : '<span class="micro">Telefone indisponível · aguardando conferência</span>';
  const href = whatsappUrl(profile);
  return href ? `<a class="btn whatsapp" href="${esc(href)}" data-contact="${esc(profile.id)}" target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">↗</span></a>` : `<button class="btn whatsapp" type="button" data-demo-contact>Ver contato de exemplo</button>`;
}
function ratingMarkup(profile,compact=false) {
  const r=profile.rating;
  return r ? `<p class="rating${compact?' compact':''}" title="${esc(r.label)}"><strong>★ ${r.score.toLocaleString('pt-BR')}/5</strong><small>${esc(compact&&r.kind==='initial'?'Nota inicial':r.label)}</small></p>` : '';
}
function managementLinks(profile) {
  if(profile.unverified) return `<p class="micro"><a href="#meu-cadastro/${encodeURIComponent(profile.id)}">Este cadastro é meu / pedir correção ou retirada</a></p>`;
  return profile.demo ? '' : `<p class="micro"><a href="#avaliar/${encodeURIComponent(profile.id)}">Avaliar serviço</a> · <a href="#meu-cadastro/${encodeURIComponent(profile.id)}">Este cadastro é meu / pedir retirada</a></p>`;
}
function card(profile) {
  if (profile.plan !== 'pro') return `<article class="person-card basic-card ${profile.featuredDays?'featured':''}" data-profile="${esc(profile.id)}" data-plan="free">${profile.featuredDays?`<div class="feature-badge">🔥 EM DESTAQUE (Restam ${profile.featuredDays} dias)</div>`:''}<h3>${esc(profile.heading || profile.name)}</h3>${!profile.heading||profile.heading===profile.name?`<p class="service-name">${esc(categoryName(profile.category))}</p>`:''}${profile.unverified?'<span class="unverified-badge" title="Identidade, disponibilidade e atendimento não confirmados">Não verificado</span>':''}${ratingMarkup(profile,true)}${profile.note?`<p class="card-note">${esc(profile.note)}</p>`:''}${profile.phone?`<p class="basic-phone">${esc(profile.phone)}</p>`:''}<div class="card-actions">${contactButton(profile)}</div><a class="card-detail-link" href="#perfil/${encodeURIComponent(profile.id)}">Ver detalhes</a></article>`;
  return `<article class="person-card ad-tone-${profile.ad.tone} ${profile.featuredDays ? 'featured' : ''}" data-profile="${esc(profile.id)}" data-plan="pro">${profile.featuredDays ? `<div class="feature-badge"><span class="flame">🔥</span> EM DESTAQUE (Restam ${profile.featuredDays} ${profile.featuredDays === 1 ? 'dia' : 'dias'})</div>` : ''}${gallery(profile)}<div class="card-body">${adHeader(profile.ad)}<div class="title-row"><div><h3>${esc(profile.heading || profile.name)}</h3><p class="service-name">${esc(categoryName(profile.category))}</p></div><span class="plan-tag">${esc(profile.ad.accessLabel)}</span></div>${profile.verified ? `<div class="verified">${icon('check')} Profissional Verificado</div>` : ''}${ratingMarkup(profile)}<p class="card-note">${esc(profile.note)}</p><p class="card-regions">⌖ ${esc(profile.neighborhoods.slice(0, 2).join(' · '))}${profile.neighborhoods.length > 2 ? ` +${profile.neighborhoods.length - 2} regiões` : ''}${profile.emergency ? ' · Plantão 24h' : ''}</p>${adDetailsMarkup(profile.ad,profile.neighborhoods.slice(0,2).join(' · '))}<div class="card-actions"><a class="btn details" href="#perfil/${encodeURIComponent(profile.id)}">Ver perfil</a>${contactButton(profile)}</div>${managementLinks(profile)}</div></article>`;
}
function renderResults() {
  if (!catalog) return;
  const jobs=['jobs','agencies'].includes(filters.mode);
  filters.adType=filters.mode==='jobseekers'?'jobseeker':'';
  filters.publisherType=filters.mode==='agencies'?'agency':'';
  const filterKey=JSON.stringify(filters);
  const reset=filterKey!==lastFiltersKey, previousLeft=$('#results').scrollLeft;
  if(reset) {visibleLimit=LISTING_PAGE_SIZE;lastFiltersKey=filterKey;}
  const profiles = jobs?searchVacancies(vacancies.jobs,filters,Date.now(),advertisers.advertisers):searchProfiles(availableProfiles(), filters);
  const markup = profiles.length ? profiles.slice(0,visibleLimit).map(p=>jobs?vacancyCard(p):card(p).replace('<h3>',distanceMarkup(p)+'<h3>').replace(/<h3>([\s\S]*?)<\/h3>/,(_,title)=>`<h3><a class="profile-title-link" href="#perfil/${encodeURIComponent(p.id)}">${title}</a></h3>`)).join('') : `<div class="empty"><h3>${jobs?'Nenhuma vaga aprovada nesta busca':'Nossa rede está começando'}</h3><p>${jobs?'As vagas aparecerão após a publicação autorizada pelo empregador. Não exibimos empregadores fictícios.':'Ainda não há profissionais confirmados nesta busca. Faça parte dos primeiros cadastros gratuitos.'}</p><button class="btn secondary" type="button" data-clear>Limpar filtros</button> <a class="btn primary" href="${jobs?'#publicar-vaga':'#cadastro'}">${jobs?'Publicar vaga grátis':'Cadastrar meu serviço grátis'}</a></div>`;
  const changed=markup!==lastResultMarkup;
  if(changed) {
    $('#results').innerHTML=markup;lastResultMarkup=markup;
    initCarousels($('#results'));
  }
  $('#load-more').hidden=visibleLimit>=profiles.length;
  $('#load-more').textContent='Mostrar mais '+Math.min(LISTING_PAGE_SIZE,Math.max(0,profiles.length-visibleLimit));
  $('#result-count').textContent = `Mostrando ${Math.min(visibleLimit,profiles.length)} de ${profiles.length} ${jobs?'vagas encontradas':config.showDemoProfiles?'perfis de demonstração / aprovados':'cadastros encontrados'}`;
  $('#directory-title').textContent=({professionals:'Profissionais em Petrolina',jobseekers:'Pessoas procurando emprego',jobs:'Vagas de emprego',agencies:'Oportunidades de agenciadores'})[filters.mode];
  $('#sort-note').textContent=filters.sort==='distance'?'Do mais perto ao mais distante; sem localização fica no final.':'Destaques primeiro, depois assinantes / PRO e básicos. Agenciadores têm destaque inicial de seis meses.';
  $('#location-help').textContent=filters.origin?'Distâncias aproximadas em linha reta, não por ruas ou tempo de deslocamento.':'Defina sua região para calcular distâncias. Sem coordenadas, não inventamos proximidade.';
  $('#emergency').hidden=jobs;
  $('#sort').disabled=false; $('#sort').value=filters.sort;
  for (const link of document.querySelectorAll('[data-category]')) link.setAttribute('aria-current', String(link.dataset.category === filters.category));
  if(reset || changed)$('#results').scrollLeft=reset?0:previousLeft;
  if(reset||changed)refreshCardsLayout();else requestAnimationFrame(updateCardsNavigation);
  const params = new URLSearchParams();
  if (filters.query) params.set('busca', filters.query);
  if (filters.category) params.set('categoria', filters.category);
  if (filters.neighborhood) params.set('bairro', filters.neighborhood);
  if (filters.emergency) params.set('plantao', '1');
  if (jobs) params.set('modo',filters.mode==='agencies'?'agencias':'vagas');
  if(filters.mode==='jobseekers') params.set('modo','emprego');
  if (filters.sort==='distance') params.set('ordem','mais-proximos');
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
}
function updateCardsNavigation() {
  const results=$('#results'), overflow=results.scrollWidth>results.clientWidth+2;
  $('#cards-next').closest('.results-navigation').hidden=!overflow;
  $('#cards-prev').disabled=!overflow || results.scrollLeft<=2;
  $('#cards-next').disabled=!overflow || results.scrollLeft+results.clientWidth>=results.scrollWidth-2;
}
function scrollCards(direction) {
  const results=$('#results'), card=results.querySelector('.person-card');
  if(!card) return;
  const gap=parseFloat(getComputedStyle(results).columnGap)||20;
  results.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function setResultsLayout(layout) {
  closeFilters();
  const next=layout==='list'?'list':'cards';
  if($('#results').dataset.layout===next)return;
  $('#results').dataset.layout=next;
  $('#results').scrollLeft=0;
  for(const button of document.querySelectorAll('[data-results-layout]')) button.setAttribute('aria-pressed',String(button.dataset.resultsLayout===$('#results').dataset.layout));
  refreshCardsLayout();
}
function setMenuOpen(open,restoreFocus=false) {
  if(open) closeFilters();
  const mobile=matchMedia('(max-width: 1050px)').matches;
  const expanded=mobile && open;
  $('#side-menu').classList.toggle('is-open',expanded);
  $('#side-menu').inert=mobile && !expanded;
  $('#menu-toggle').setAttribute('aria-expanded',String(expanded));
  $('#menu-backdrop').hidden=!expanded;
  document.body.classList.toggle('menu-open',expanded);
  $('#side-menu').setAttribute('role',expanded?'dialog':'complementary');
  if(expanded) $('#side-menu').setAttribute('aria-modal','true');else $('#side-menu').removeAttribute('aria-modal');
  for(const el of document.querySelectorAll('.page-content,.site-header,.topline,.mobile-nav')) el.inert=expanded;
  if(expanded) $('#menu-close').focus();
  else if(restoreFocus && mobile) $('#menu-toggle').focus();
}
function showRoleLanding(role) { openDialog(roleLandingMarkup(role)); }
function browseFor(mode) {
  filters.mode=mode;$('#directory-mode').value=mode;
  clearFilters();closeDialog();
  history.replaceState(null,'',location.pathname+location.search+'#profissionais');
  $('#profissionais').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function clearFilters() {
  Object.assign(filters, { category:'', neighborhood:'', query:'', emergency:false });
  $('#query').value = ''; $('#category').value = ''; $('#neighborhood').value = ''; $('#emergency').setAttribute('aria-pressed', 'false'); renderResults();
}
function initCarousels(root) {
  for (const carousel of root.querySelectorAll('.carousel')) {
    const slides = carousel.querySelector('.slides');
    slides.addEventListener('scroll', () => { carousel.querySelector('.slide-count').textContent = `${Math.round(slides.scrollLeft / (slides.clientWidth || 1)) + 1} / ${slides.children.length}`; }, { passive: true });
    slides.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); slideBy(carousel, event.key === 'ArrowRight' ? 1 : -1); } });
  }
}
function slideBy(carousel, direction) {
  const slides = carousel.querySelector('.slides');
  const current = Math.round(slides.scrollLeft / slides.clientWidth);
  const index = (current + direction + slides.children.length) % slides.children.length;
  slides.scrollTo({ left: index * slides.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function revokePreviews() { for (const url of mediaBlobs) URL.revokeObjectURL(url); mediaBlobs.clear(); }
function closeDialog() {
  if (dialog.querySelector('form[data-busy="true"]')) return;
  if (/^#(?:perfil\/|perfil-conta|conta|entrar|contratar|ser-contratado|agenciar|modelos|agenciador|pro-emprego|planos|cadastro|meu-cadastro|avaliar|pro$|orcamento|publicar-vaga|destaque|patrocinio|privacidade|termos)/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search+'#profissionais');
  revokePreviews();
  dialog.close();
}
function openDialog(html) {
  closeFilters();
  if(infoDialog.open)infoDialog.close();
  revokePreviews();
  if (!dialog.open) lastFocus = document.activeElement;
  $('#dialog-content').innerHTML = html;
  const professionalForm=dialog.querySelector('form[data-event="novo_cadastro_gratuito"],form[data-event="solicitacao_upgrade_pro"]');
  if(professionalForm) {
    professionalForm.insertAdjacentHTML('afterbegin',`<div class="field full"><label for="entity-type">Quem vai divulgar o serviço?</label><select id="entity-type" name="entityType"><option value="person">Pessoa física</option><option value="company">Empresa · razão social</option></select></div><div class="field full" data-company-name hidden><label for="legal-name">Razão social da empresa</label><input id="legal-name" name="legalName" autocomplete="organization" maxlength="160" disabled></div>`);
    professionalForm.querySelector('#service').closest('.field').insertAdjacentHTML('afterend','<div class="notice full identity-preview"><strong>Assim aparecerá no cartão</strong><output data-profile-heading aria-live="polite"></output><small>Serviço primeiro; pessoa com primeiro nome e último sobrenome, ou razão social da empresa. O nome completo enviado não é alterado.</small></div>');
    updateIdentityPreview(professionalForm);
  }
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.scrollTop = 0;
  initCarousels(dialog);
  initLocationPickers(dialog,config);
  updateAdPreview(dialog.querySelector('form'));
  const title = $('#dialog-title'); title?.setAttribute('tabindex', '-1'); title?.focus();
}
function updateIdentityPreview(form) {
  if(!form?.querySelector('[data-profile-heading]'))return;
  const company=form.elements.entityType.value==='company',legal=form.elements.legalName;
  form.querySelector('[data-company-name]').hidden=!company;
  legal.disabled=!company;legal.required=company;
  form.querySelector('label[for="name"]').textContent=company?'Nome e sobrenome do responsável':'Seu nome completo';
  const service=form.elements.category.value;
  form.querySelector('[data-profile-heading]').textContent=profileHeading({entityType:company?'company':'person',name:form.elements.name.value||'Primeiro Sobrenome',legalName:company?(legal.value||'Razão social'):undefined},service?categoryName(service):'Serviço');
}
function showPlans() {
  accountUI.openPro();
}
const namePhone = `<div class="field"><label for="name">Seu nome e sobrenome</label><input id="name" name="name" autocomplete="name" maxlength="100" required></div><div class="field"><label for="phone">WhatsApp com DDD</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+55 87 99999-9999" maxlength="26" required></div>`;
const categoryField = () => `<div class="field full"><label for="service">Categoria do serviço</label><select id="service" name="category" required><option value="">Selecione o serviço</option>${options(CATEGORIES, filters.category)}</select></div>`;
const consent = '<label class="check consent full"><input type="checkbox" name="consent" required><span>Autorizo o envio destes dados à equipe do Ajuda em Casa para atender meu pedido. Li <a href="#termos">como funciona</a> e a <a href="#privacidade">informação de privacidade</a>.</span></label>';
function formShell(type, title, intro, fields, button) {
  if(['novo_cadastro_gratuito','solicitacao_upgrade_pro','novo_orcamento_cliente','nova_vaga_empregador'].includes(type)) fields+=registrationLocation();
  return `<span class="eyebrow">AJUDA EM CASA · PETROLINA</span><h2 id="dialog-title">${title}</h2><p class="dialog-intro">${intro}</p>${!config.webhookUrl ? '<p class="notice">Os envios ainda não estão disponíveis nesta versão de teste. Você pode conhecer os campos; nenhum dado será enviado até o atendimento ser conectado.</p>' : ''}<form class="form-grid" data-event="${type}">${fields}<div class="trap" aria-hidden="true"><label>Deixe vazio<input name="website" tabindex="-1" autocomplete="off"></label></div>${consent}<p class="form-status full" role="status" aria-live="polite"></p><button class="btn primary full" type="submit">${button}</button><p class="micro full">O envio é uma solicitação para análise. Cadastros e alterações só aparecem depois da aprovação da equipe.</p></form>`;
}
function showFreeForm() {
  openDialog(formShell('novo_cadastro_gratuito', 'Seu trabalho começa aqui.', 'Crie seu perfil básico gratuitamente. Só nome, telefone, serviço e uma observação curta aparecem na vitrine.', `${namePhone}${purposeField()}${categoryField()}<div class="field full"><label for="note">Observação curta <span class="micro">(opcional)</span></label><textarea id="note" name="note" maxlength="140" rows="3" placeholder="Conte, em poucas palavras, como você pode ajudar."></textarea><span id="note-counter" class="counter">0 / 140 caracteres · somente texto</span></div><div class="notice full">Fotos de Antes/Depois, cartão profissional, descrição detalhada e destaque no topo fazem parte do <a href="#planos">Plano PRO</a>.</div>`, 'Enviar cadastro gratuito'));
}
function showProForm(adType='service') {
  const mediaFields = ['antes','depois','cartao'].map(type => `<div><label for="media-${type}">${MEDIA_LABELS[type]} <span class="micro">· link ou arquivo (opcional)</span></label><div class="upload-row"><input id="media-${type}" name="media-${type}" type="url" placeholder="https://…" maxlength="600" aria-label="Link ${MEDIA_LABELS[type]}"><input type="file" name="file-${type}" data-upload="${type}" accept="image/jpeg,image/png,image/webp" aria-label="Arquivo ${MEDIA_LABELS[type]}"></div><img id="preview-${type}" class="upload-preview" hidden alt="Prévia ${MEDIA_LABELS[type]}"></div>`).join('');
  const pix = proPaymentMarkup(config);
  openDialog(formShell('solicitacao_upgrade_pro', 'Mostre o melhor do seu trabalho.', 'Solicite o PRO e prepare sua vitrine. Envie fotos do serviço e a arte do seu cartão. O selo só aparece depois da conferência da equipe.', `${namePhone}${purposeField()}${categoryField()}${adEditorFields()}<div class="field full"><label for="description">Apresentação detalhada</label><textarea id="description" name="description" maxlength="6000" rows="5" required placeholder="Conte sua experiência, os serviços que oferece e seus diferenciais."></textarea><small>Até 6.000 caracteres para contar sua história.</small></div><fieldset class="full"><legend>Regiões que atende</legend><div class="checks">${NEIGHBORHOODS.map(n => `<label class="check"><input type="checkbox" name="neighborhoods" value="${esc(n)}"><span>${esc(n)}</span></label>`).join('')}</div></fieldset><label class="check full"><input type="checkbox" name="emergency"><span>Ofereço plantão / emergência 24h (o cliente deve confirmar a disponibilidade).</span></label><fieldset class="full"><legend>Galeria de trabalhos</legend><p class="micro">JPG, PNG ou WebP, até 512 KB por arquivo. Use fotos autorizadas. Certificados e fachada podem ser enviados por link abaixo; não envie documentos pessoais.</p><div class="media-inputs">${mediaFields}<div><label for="certificate">Certificado (opcional, sem dados pessoais sensíveis)</label><input id="certificate" name="media-certificado" type="url" maxlength="600" placeholder="https://…"></div><div><label for="facade">Foto da fachada (opcional)</label><input id="facade" name="media-fachada" type="url" maxlength="600" placeholder="https://…"></div></div></fieldset>${pix}`, 'Solicitar meu Plano PRO'));
  $('#ad-type').value=adType;updateAdPreview(dialog.querySelector('form'));
}
function showQuoteForm() {
  openDialog(formShell('novo_orcamento_cliente', 'O que sua casa precisa?', 'Pedido privado de orçamento: não vira vaga pública. Para receber candidatos, use Publicar vaga grátis.', `${namePhone}<div class="field full"><label for="quote-neighborhood">Seu bairro ou região</label><input id="quote-neighborhood" name="neighborhood" list="locality-options" required maxlength="100" placeholder="Digite bairro ou condomínio"></div>${categoryField()}<div class="field full"><label for="urgency">Quando precisa?</label><select id="urgency" name="urgency" required><option value="">Selecione a urgência</option>${options(['Emergência · agora','Hoje','Nesta semana','Sem pressa'])}</select></div>`, 'Pedir orçamento gratuito'));
}
function showVacancyForm(kind='employer',premium=false) {
  openDialog(formShell('nova_vaga_empregador','Sua oportunidade, fácil de entender.','O básico é gratuito. Para publicar o modelo didático, solicite PRO: seis meses de teste após aprovação, depois assinatura opcional. Escolher o modelo abaixo não ativa o plano.',`${namePhone}<div class="field full"><label for="publisher-type">Quem está divulgando?</label><select id="publisher-type" name="publisherType"><option value="employer">Contratante direto · azul no PRO</option><option value="agency">Agenciador / agência · amarelo no PRO</option></select></div><div class="field full" data-agency-field hidden><label for="agency-name">Nome público da agência / agenciador</label><input id="agency-name" name="agencyName" maxlength="100"></div><div class="field full"><label for="requested-format">Modelo de divulgação</label><select id="requested-format" name="requestedFormat"><option value="standard">Básico gratuito · fundo neutro</option><option value="pro">Solicitar modelo PRO · 6 meses de teste no lançamento</option></select></div><div class="field full"><label for="advertiser-id">Código do anunciante PRO (se já aprovado)</label><input id="advertiser-id" name="advertiserId" maxlength="80" pattern="[a-z0-9-]+" placeholder="Opcional; a equipe confere o titular e o plano"><small>O código identifica a conta; não é senha nem prova de assinatura. Novos anunciantes solicitam o teste ao escolher o modelo PRO.</small></div>${categoryField()}<div class="field full"><label for="job-title">Título da vaga</label><input id="job-title" name="title" required maxlength="100" placeholder="Ex.: profissional para trabalho doméstico"></div><div class="field full"><label for="job-description">Resumo da oportunidade</label><textarea id="job-description" name="description" required maxlength="1500" rows="3" placeholder="Informe as atividades e condições principais; não inclua endereço exato."></textarea></div><div class="field full"><label for="schedule">Dias, horários e intervalo</label><input id="schedule" name="schedule" required maxlength="200" placeholder="Ex.: segunda a sexta, horário e intervalo a combinar"></div>${adEditorFields({job:true})}${agencyFeeEditor()}<label class="check full"><input type="checkbox" name="publishContact" required><span>Autorizo publicar esta vaga e meu WhatsApp após conferência. Se represento terceiros, tenho autorização para divulgar a oportunidade. Posso pedir a retirada.</span></label><p class="notice full">O teste pertence ao anunciante, não à vaga. Criar outra oportunidade não reinicia os seis meses. Sem adesão paga após o teste, o anúncio fica no modelo básico neutro.</p>`,'Enviar oportunidade para aprovação'));
  $('#registration-area').required=true;
  $('#publisher-type').value=kind;
  if(kind==='agency' || premium) $('#requested-format').value='pro';
  updateAdPreview(dialog.querySelector('form'));
}

function showFeatureForm() {
  const active=availableProfiles().filter(p=>p.status==='approved');
  openDialog(formShell('ativacao_destaque_3dias','Apareça no topo por 3 dias.','Escolha o benefício mensal PRO ou o destaque avulso de R$ 99,90 por 72 horas. A equipe confere o cadastro e o pagamento antes da ativação.',`${namePhone}<div class="field full"><label for="boost-mode">Como deseja destacar?</label><select id="boost-mode" name="purchaseMode"><option value="pro_monthly">Benefício mensal de um PRO ativo · 3 dias</option><option value="one_off">Destaque avulso · R$ 99,90 por 72 horas</option></select></div><div class="field full"><label for="profileId">Código do seu cadastro</label><input id="profileId" name="profileId" required pattern="[a-z0-9-]+" maxlength="80" list="pro-profiles" placeholder="Código recebido na aprovação"><datalist id="pro-profiles">${active.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</datalist><small>A equipe confirma o titular. O destaque avulso não exige assinatura PRO.</small></div><div id="feature-status" class="notice full">Agenciadores aprovados têm destaque inicial por seis meses. Depois, poderá haver mensalidade ou destaque avulso para manter prioridade. Não há renovação automática.</div><p class="micro full">O pagamento Asaas ainda está em preparação. Enviar este pedido não faz cobrança nem garante ativação.</p>`,'Solicitar meu destaque'));
}

function showSponsorForm() {
  const offer=commercialOffer(config), price=offer.sponsorMonthly.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  openDialog(formShell('interesse_patrocinio_loja', 'Sua loja, na vizinhança certa.', `${offer.launch?`Piloto sem cobrança. Futuro banner a ${price}/mês, mediante contratação, disponibilidade e validação da audiência.`:`Banner a ${price}/mês, mediante contratação e disponibilidade.`} Sem promessa de alcance ou vendas e sem cobrança automática.`, `${namePhone}<div class="field full"><label for="store">Nome da loja</label><input id="store" name="store" required maxlength="120" autocomplete="organization"></div><div class="field full"><label for="message">Conte o que sua loja oferece (opcional)</label><textarea id="message" name="message" maxlength="500" rows="3"></textarea></div>`, 'Quero anunciar minha loja'));
}
function showOwnershipForm(id='',prefill={}) {
  const p=availableProfiles().find(p=>p.id===id && !p.demo);
  openDialog(formShell('solicitacao_titularidade','Este cadastro é seu?','Solicite assumir, corrigir ou retirar um anúncio. A equipe retornará pelo número já cadastrado para conferir o controle do telefone. Não envie CPF, documento ou códigos de outros serviços.',`${namePhone}${categoryField()}<input type="hidden" name="profileId" value="${esc(p?.id || '')}"><div class="field full"><label for="claim-action">O que deseja?</label><select id="claim-action" name="action"><option value="assumir">Assumir meu cadastro</option><option value="atualizar">Atualizar meus dados</option><option value="remover">Pedir retirada do site</option></select></div><div class="field full"><label for="claim-message">Detalhes (opcional)</label><textarea id="claim-message" name="message" maxlength="1000"></textarea></div><p class="notice full">Esta solicitação não comprova identidade nem libera edição. Protocolo de atendimento não é senha. Nenhuma alteração ou remoção é automática.</p>`,'Solicitar conferência'));
  $('#name').value=prefill.name || '';
  $('#phone').value=formatPhone(prefill.phone || p?.phone);
  $('#service').value=prefill.category || p?.category || '';
}
function showReviewForm(id) {
  const p=availableProfiles().find(p=>p.id===id && p.status==='approved' && !p.demo);
  if(!p) {openDialog('<h2 id="dialog-title">Perfil indisponível para avaliação</h2><p>Somente serviços de profissionais reais podem ser avaliados.</p>');return;}
  openDialog(formShell('nova_avaliacao','Como foi o serviço?','Avalie somente um serviço que você contratou. A equipe confere a avaliação antes de atualizar a nota. Seus dados de contato não são publicados.',`${namePhone}<input type="hidden" name="category" value="${esc(p.category)}"><input type="hidden" name="profileId" value="${esc(p.id)}"><input type="hidden" name="professionalPhone" value="${esc(p.phone)}"><div class="field full"><label for="review-score">Nota do serviço</label><select id="review-score" name="score" required><option value="">Escolha</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('')}</select></div><div class="field full"><label for="review-comment">Conte sua experiência</label><textarea id="review-comment" name="comment" maxlength="1000" required></textarea></div>`,'Enviar avaliação para análise'));
}
function showProfile(id) {
  const raw = availableProfiles().find(p => p.id === id && ['approved','unverified'].includes(p.status));
  if (!raw) { openDialog('<h2 id="dialog-title">Perfil não encontrado</h2><p>Este perfil pode ter sido removido ou ainda estar em análise.</p><button class="btn secondary" type="button" data-close>Voltar para a busca</button>'); return; }
  const p = visibleProfile(raw);
  if (p.plan !== 'pro') { openDialog(`<h2 id="dialog-title">${esc(p.heading || p.name)}</h2>${p.unverified ? '<p class="unverified-badge">Não verificado</p>' : ''}${ratingMarkup(p)}${managementLinks(p)}<p>${esc(categoryName(p.category))}</p><p>${esc(p.phone)}</p><p>${esc(p.note)}</p>${contactButton(p)}<p class="plan-note"><a href="#pro">É você? Vire PRO para adicionar fotos de Antes/Depois e ficar no topo.</a></p>`); return; }
  openDialog(`<div class="profile-dialog ad-tone-${p.ad.tone}">${adHeader(p.ad)}<span class="eyebrow">PERFIL PRO ${p.demo ? '· DEMONSTRAÇÃO' : '· PETROLINA'}</span><h2 id="dialog-title">${esc(p.heading || p.name)}</h2>${ratingMarkup(p)}${managementLinks(p)}<p class="dialog-intro">${esc(categoryName(p.category))}</p>${p.verified ? `<div class="verified">${icon('check')} Profissional Verificado${p.demo ? ' · selo ilustrativo' : ''}</div>` : ''}${p.featuredDays ? `<p class="feature-badge">🔥 EM DESTAQUE (Restam ${p.featuredDays} dias)</p>` : ''}${gallery(p)}${adDetailsMarkup(p.ad,p.neighborhoods.join(' · '))}<h3>Conheça meu trabalho</h3><p class="profile-description">${esc(p.description)}</p><h3>Onde atendo</h3><div class="region-tags">${p.neighborhoods.map(n => `<span>${esc(n)}</span>`).join('')}</div>${p.emergency ? '<p class="notice">Plantão / Emergência 24h informado pelo profissional. Confirme a disponibilidade na conversa.</p>' : ''}<p>${esc(p.phone)}</p><div class="profile-actions">${contactButton(p)}<button type="button" class="btn secondary" data-share="${esc(p.id)}">Compartilhar perfil ↗</button></div><p class="micro">O selo indica uma conferência da equipe; não garante a qualidade ou a execução do serviço.</p></div>`);
}
function showInfo(type,overForm=false) {
  const privacy=type==='privacidade', offer=commercialOffer(config);
  const text=privacy?
    '<h3>Cadastro e contato</h3><p>Os formulários enviam contato e pedido ao n8n e ao Telegram privado do administrador, quando conectados. Publicação e verificação dependem de conferência. Não convertemos pedidos privados de orçamento em vagas públicas.</p><h3>Localização aproximada</h3><p>GPS só é solicitado após seu clique. Coordenadas são arredondadas em uma grade de cerca de 1 km antes de envio. Rua, número e apartamento não são enviados. Apenas bairro/região e localização aproximada autorizada podem constar no catálogo; isso não garante anonimato, sobretudo em áreas pouco povoadas.</p><p>O mapa é opcional: ao abri-lo, o OpenStreetMap recebe seu IP e as áreas visualizadas. Não enviamos o endereço digitado a geocodificadores. A localização usada apenas na busca fica em memória, não na URL ou no armazenamento do navegador. Limpar localização a remove.</p><h3>Fotos e vagas</h3><p>Use somente material autorizado. Vagas exigem autorização separada para publicar o WhatsApp. Descrições são revisadas para remover endereços e dados sensíveis antes da publicação.</p><h3>Revisão e remoção</h3><p>Peça atualização ou retirada pelo canal da equipe que confirmou seu cadastro. Use <a href="#meu-cadastro">Este cadastro é meu / pedir retirada</a>. Se o atendimento estiver desconectado, o administrador deve disponibilizar um canal operacional de privacidade antes do lançamento público. Cadastros importados podem aparecer como não verificados; isso não comprova identidade, disponibilidade ou autorização.</p><h3>Notas e avaliações</h3><p>A nota inicial 5/5 (ou 3/5 definida pelo administrador) não é avaliação de cliente. Quando há avaliações reais aprovadas, mostramos a média dessas avaliações sem misturá-la com a nota inicial.</p><h3>Cache</h3><p>O cache guarda a vitrine pública para uso offline. A localização de busca e os formulários não são armazenados. A contagem de cliques é local a este aparelho, sem identificar visitantes. Um catálogo offline pode estar desatualizado.</p>':
    '<h3>Para moradores e profissionais</h3><p>Buscar, conversar e publicar vagas é gratuito. O básico continua sem mensalidade. O contato direto com profissionais é sem comissão. A intermediação de agenciadores é cobrada do contratante: valor padrão R$ 200,00, com 25% do valor líquido para o app e 75% para o agenciador, após as tarifas Asaas. O preço informado aparece antes do contato; o candidato não paga para concorrer. Não prometemos contratações.</p><h3>PRO no lançamento</h3><p>'+ (offer.launch?'Experimente por '+offer.trialMonths+' meses a partir da aprovação. Não faça Pix. Após o período, você pode permanecer no básico gratuito; o PRO pago será opcional quando a fase comercial for aberta.':'O PRO é opcional e depende de contratação e confirmação pela equipe.')+'</p><p>O PRO de profissionais, contratantes e agenciadores dá acesso aos modelos organizados e às cores por objetivo. Ao expirar, esses extras deixam de aparecer; o básico permanece gratuito. Não existe renovação ou cobrança automática. Pagamento não confere selo: a verificação é separada.</p><h3>Proximidade e destaque</h3><p>Mais próximos usa distância aproximada em linha reta; não estima trajeto ou tempo. Sem coordenadas, o resultado fica no final e não ganha uma distância inventada. Recomendados prioriza destaques ativos, PRO e gratuitos. O destaque dura 72 horas, uma ativação por mês no horário de Petrolina.</p><h3>Destaque de agenciadores e avulso</h3><p>Agenciadores aprovados têm seis meses iniciais de destaque. Após esse prazo poderá ser cobrada mensalidade ou valor avulso para manter prioridade no topo, mediante adesão. O destaque avulso custa R$ 99,90 por 72 horas. Sem adesão, a apresentação fica básica. Os valores são informados antes da contratação e não há renovação automática.</p><h3>Vagas</h3><p>Empregadores enviam solicitações; só anúncios autorizados e aprovados são publicados. Confirme horário, pagamento e condições diretamente. Não há contratação, pagamento ou conta autenticada pelo site nesta versão.</p>';
  const currentText=privacy?text.replace('A localização de busca e os formulários não são armazenados.','A localização de busca e os pedidos de serviço não são guardados pelo cache. O pré-cadastro de conta tem armazenamento separado, explicado abaixo.'):text.replace('Não há contratação, pagamento ou conta autenticada pelo site nesta versão.','Não há contratação ou pagamento operacional pelo site. O acesso à conta depende da configuração de autenticação descrita abaixo.');
  const accountText=privacy?'<h3>Conta, Google e pré-cadastro local</h3><p>Sem autenticação configurada, o pré-cadastro guarda apenas nome, e-mail, objetivo e aceite nesta sessão do navegador, ou em memória se o armazenamento estiver bloqueado. Ele não envia dados, não cria uma conta online e não publica contato. Você pode apagá-lo na prévia do perfil.</p><p>Quando o Firebase Authentication estiver configurado, o login Google usa identidade básica e e-mail; não pede contatos, agenda ou Drive. E-mail e senha são processados pelo Firebase, não enviados ao n8n ou publicados na vitrine. O SDK administra a sessão por aba. As preferências do objetivo ficam neste navegador, separadas por identificador da conta; ainda não são sincronizadas entre aparelhos. O cadastro de anúncio e a autorização para divulgar contato são etapas separadas.</p>':'<h3>Conta e escolha do objetivo</h3><p>Para acessar as opções PRO, cadastre-se ou entre e escolha contratar, ser contratado ou agenciar. Trabalhadores podem divulgar serviços ou procurar emprego. O cadastro por e-mail exige confirmação. O pré-cadastro local é apenas uma prévia e não equivale a login. Quando a autenticação não estiver configurada, a interface informa essa limitação.</p><p>Login não comprova propriedade de WhatsApp, profissão, identidade civil ou pagamento. A conta começa básica; a ativação de PRO, o selo e o vínculo aos anúncios dependem de conferência administrativa separada.</p>';
  const aiText=privacy?'<h3>Revisão assistida por IA</h3><p>Textos e até três fotos anexadas aos anúncios podem ser processados pela OpenAI para resumir o conteúdo, sugerir uma descrição e apontar pendências para a equipe. Evite enviar documentos, dados sensíveis ou fotos de terceiros sem autorização. Links externos permanecem para consulta da equipe.</p><p>A análise auxilia a revisão do anúncio; a equipe decide sobre sua publicação. Ela não confirma identidade, propriedade do telefone, pagamento ou qualificação profissional, nem decide contratações. Pedidos e decisões ficam na fila administrativa privada.</p>':'';
  const activeAccountText=backendConfigured(config)?(privacy?'<h3>Conta Google, pedidos e administração</h3><p>O Firebase Authentication processa o acesso com Google ou e-mail. O login Google usa identidade básica e e-mail, sem solicitar contatos, agenda ou Drive. O SDK mantém a sessão por aba; senhas e tokens não são publicados nem enviados ao atendimento.</p><p>Nome, e-mail, objetivo e versão do aceite ficam associados à conta no Cloud Firestore. Os pedidos e seus anexos ficam na fila privada, acessível aos administradores autorizados. O banco está na região de São Paulo. Alterações administrativas registram responsável, horário, motivo e cadastro afetado.</p><p>O anúncio público é separado da conta. Nome, telefone e dados do serviço só são divulgados após o procedimento de publicação. Para correção, suspensão ou retirada, use o pedido de titularidade no perfil. Entrar com Google não comprova propriedade de telefone ou qualificação profissional.</p>':'<h3>Sua conta e seus pedidos</h3><p>Você pode entrar com Google ou e-mail e escolher seu objetivo. Pedidos enviados com a conta ficam na fila de atendimento. Criar uma conta não publica contato, concede selo ou confirma pagamento.</p><p>A publicação básica exige conferir titularidade e autorização. Os administradores podem corrigir ou suspender cadastros, com registro da alteração. O básico continua gratuito e o PRO é opcional. Pagamentos ainda não estão ativados.</p>'):accountText;
  const html='<div class="document-copy"><span class="eyebrow">TRANSPARÊNCIA</span><h2 id="dialog-title">'+(privacy?'Seus dados, com clareza.':'Como funciona o Ajuda em Casa')+'</h2>'+currentText+activeAccountText+aiText+'</div>';
  if(!overForm)return openDialog(html);
  infoLastFocus=document.activeElement;
  $('#info-dialog-content').innerHTML=html.replace('id="dialog-title"','id="info-dialog-title"');
  if(!infoDialog.open)infoDialog.showModal();
  infoDialog.scrollTop=0;
  $('#info-dialog-title').tabIndex=-1;$('#info-dialog-title').focus();
}
function route() {
  if (!config || !catalog || dialog.querySelector('form[data-busy="true"]')) return;
  closeFilters();
  if(infoDialog.open)infoDialog.close();
  if($('#side-menu').classList.contains('is-open'))setMenuOpen(false);
  let hash;
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
  for(const link of document.querySelectorAll('#side-menu nav a')) {
    const current=link.hash.slice(1)===hash || (link.hash==='#conta' && ['entrar','perfil-conta'].includes(hash));
    if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  const routes = { contratar:()=>showRoleLanding('contractor'),'ser-contratado':()=>showRoleLanding('worker'),agenciar:()=>showRoleLanding('agency'),conta:()=>accountUI.open(),entrar:()=>accountUI.open({mode:'login'}),'perfil-conta':()=>accountUI.showProfile(),modelos:()=>openDialog(modelsMarkup()),agenciador:()=>showVacancyForm('agency'),'pro-emprego':()=>accountUI.guard(()=>showProForm('jobseeker'),{role:'worker',workerGoal:'jobseeker'}),planos:showPlans,cadastro:showFreeForm,pro:()=>accountUI.guard(()=>showProForm(),{role:'worker'}),orcamento:showQuoteForm,'publicar-vaga':()=>showVacancyForm(),'publicar-vaga-pro':()=>accountUI.guard(()=>showVacancyForm('employer',true),{role:'contractor'}),destaque:showFeatureForm,patrocinio:showSponsorForm,privacidade:()=>showInfo('privacidade'),termos:()=>showInfo('termos') };
  if(backendConfigured(config) && (!auth.getUser()?.emailVerified || !accountUI.hasPreferences()) && (['cadastro','agenciador','pro-emprego','pro','orcamento','publicar-vaga','publicar-vaga-pro','destaque','patrocinio','meu-cadastro'].includes(hash)||hash.startsWith('avaliar/')||hash.startsWith('meu-cadastro/')))return accountUI.guard(route);
  if (hash.startsWith('perfil/')) showProfile(hash.slice(7));
  else if(hash==='meu-cadastro' || hash.startsWith('meu-cadastro/')) showOwnershipForm(hash.slice(13));
  else if(hash.startsWith('avaliar/')) showReviewForm(hash.slice(8));
  else if (routes[hash]) routes[hash]();
  else if (dialog.open) dialog.close();
}
async function readFile(file, type) {
  if (file.size > 524288 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPG, PNG ou WebP de até 512 KB por imagem.');
  const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(file); });
  return { type, name:file.name, mime:file.type, base64:String(url).split(',')[1] };
}
async function submitForm(form) {
  if (form.dataset.busy === 'true' || !form.reportValidity()) return;
  form.dataset.busy = 'true';
  const status = form.querySelector('.form-status'), button = form.querySelector('[type=submit]'), close = $('.dialog-close');
  const originalLabel = button.textContent;
  button.disabled = true; close.disabled = true;
  status.className = 'form-status full loading'; status.textContent = 'Conferindo seu pedido…';
  try {
    const fields = new FormData(form), data = Object.fromEntries(fields);
    data.consent = fields.get('consent') === 'on'; data.emergency = fields.get('emergency') === 'on';
    const locality=resolveLocality(data.area || data.neighborhood);
    if(locality.neighborhood) Object.assign(data,locality);
    data.location=getLocation(form); data.locationConsent=fields.get('locationConsent')==='on';
    data.publishContact=fields.get('publishContact')==='on';
    if(form.dataset.event==='nova_vaga_empregador' && data.publisherType==='agency') data.intermediation=readIntermediation(fields);
    if(['solicitacao_upgrade_pro','nova_vaga_empregador'].includes(form.dataset.event)) data.adDetails=readAdDetails(fields);
    if(form.dataset.event==='nova_avaliacao') data.score=Number(fields.get('score'));
    if(['novo_cadastro_gratuito','solicitacao_upgrade_pro'].includes(form.dataset.event)) {
      const duplicates=duplicateProfiles(catalog.profiles,data.phone,data.category);
      if(duplicates.length) {
        const oldHint=form.querySelector('[data-duplicate-hint]');if(oldHint)oldHint.remove();
        const hint=document.createElement('div');hint.className='notice full';hint.dataset.duplicateHint='true';
        const text=document.createElement('p');text.textContent='Este telefone já tem cadastro nesta profissão. Para assumir, alterar, pedir PRO ou retirar, solicite a conferência de titularidade.';
        const action=document.createElement('button');action.type='button';action.className='btn secondary';action.textContent='Solicitar verificação deste cadastro';
        action.addEventListener('click',()=>showOwnershipForm(duplicates[0].id,data));hint.append(text,action);status.before(hint);
        throw new Error('Cadastro repetido: mesmo telefone e profissão. Outras profissões e vagas continuam permitidas.');
      }
    }
    data.neighborhoods = fields.getAll('neighborhoods');
    if (form.dataset.event === 'solicitacao_upgrade_pro') {
      data.media = Object.keys(MEDIA_LABELS).filter(type => fields.get('media-' + type)).map(type => ({ type, url:String(fields.get('media-' + type)).trim() }));
      data.files = await Promise.all(['antes','depois','cartao'].filter(type => fields.get('file-' + type)?.size).map(type => readFile(fields.get('file-' + type), type)));
    }
    if (form.dataset.event === 'ativacao_destaque_3dias') {
      const profile = catalog.profiles.find(p => p.id === data.profileId?.trim());
      if (!profile || profile.status!=='approved') throw new Error('Informe o código de um cadastro aprovado.');
      if(data.purchaseMode!=='one_off' && !isPro(profile)) throw new Error('Informe o código de um perfil com PRO ativo.');
      if (profile.demo) throw new Error('Este é um perfil de demonstração. A solicitação estará disponível para seu perfil real depois da aprovação.');
      if (featuredDays(profile)) throw new Error('Este perfil já está em destaque.');
      if (data.purchaseMode!=='one_off' && ((profile.featuredMonths || []).includes(monthKey()) || profile.featuredMonth === monthKey())) throw new Error('O benefício deste mês já foi utilizado.');
    }
    form.dataset.eventId ||= crypto.randomUUID(); form.dataset.createdAt ||= new Date().toISOString();
    const payload = validateEvent({ type:form.dataset.event, schemaVersion:1, eventId:form.dataset.eventId, createdAt:form.dataset.createdAt, data });
    status.textContent = 'Enviando para a equipe…'; button.textContent = 'Enviando…';
    const receipt = await service.send(payload);
    status.className = 'form-status full success';
    status.textContent = `Pedido recebido pela equipe! Protocolo: ${receipt.eventId}. Aguarde a conferência; isso não publica, altera, verifica nem remove dados automaticamente.`;
    form.dataset.delivered = 'true'; button.textContent = 'Pedido enviado';
    for (const input of form.querySelectorAll('input,textarea,select,button')) input.disabled = true;
  } catch (error) {
    status.className = 'form-status full error'; status.textContent = error.message;
    button.disabled = false; button.textContent = originalLabel;
  } finally { form.dataset.busy = 'false'; close.disabled = false; }
}
document.addEventListener('submit', event => { if (event.target.matches('form[data-event]')) { event.preventDefault(); submitForm(event.target); } });
document.addEventListener('input', event => {
  const form = event.target.closest('form');
  updateIdentityPreview(form);
  updateAdPreview(form);
  if (form && form.dataset.busy !== 'true') { delete form.dataset.eventId; delete form.dataset.createdAt; }
  if (event.target.id === 'note') $('#note-counter').textContent = `${Array.from(event.target.value).length} / 140 caracteres · somente texto`;
  if (event.target.id === 'profileId' && $('#feature-status')) {
    const p = catalog.profiles.find(p => p.id === event.target.value.trim());
    $('#feature-status').textContent = p ? `${p.name}: ${p.demo ? 'perfil de demonstração. ' : ''}${!isPro(p) ? 'PRO inativo.' : featuredDays(p) ? 'Destaque já ativo.' : (p.featuredMonths || []).includes(monthKey()) || p.featuredMonth === monthKey() ? 'Benefício utilizado neste mês.' : 'Pode solicitar análise para ativação.'}` : 'Informe o código enviado pela equipe quando seu perfil foi aprovado.';
  }
});
document.addEventListener('focusout',event=>{
  if(event.target.matches('input[type="tel"]')) {
    const formatted=formatPhone(event.target.value);
    if(formatted) event.target.value=formatted;
  }
});
document.addEventListener('change', event => {
  updateIdentityPreview(event.target.closest('form'));
  updateAdPreview(event.target.closest('form'));
  if (!event.target.matches('[data-upload]')) return;
  const input = event.target, file = input.files[0], preview = $('#preview-' + input.dataset.upload);
  input.setCustomValidity('');
  if (preview.dataset.blob) { URL.revokeObjectURL(preview.dataset.blob); mediaBlobs.delete(preview.dataset.blob); delete preview.dataset.blob; }
  preview.hidden = true;
  if (!file) return;
  if (file.size > 524288 || !['image/jpeg','image/png','image/webp'].includes(file.type)) { input.setCustomValidity('Use JPG, PNG ou WebP de até 512 KB.'); input.reportValidity(); return; }
  const url = URL.createObjectURL(file); mediaBlobs.add(url); preview.dataset.blob = url; preview.src = url; preview.hidden = false;
});
document.addEventListener('click', async event => {
  const target = event.target.closest('button,a');
  if(!target) {
    const profile=event.target.closest('.person-card[data-profile]');
    if(profile && !event.target.closest('.carousel,input,textarea,select,label,summary') && !window.getSelection()?.toString()) {
      const hash='#perfil/'+encodeURIComponent(profile.dataset.profile);
      if(location.hash===hash)route();else location.hash=hash;
    }
    return;
  }
  if(target.matches('[data-close-info]')) {infoDialog.close();return;}
  if(target.closest('form,.google-signin-panel') && ['#termos','#privacidade'].includes(target.getAttribute('href'))) {
    event.preventDefault();showInfo(target.hash.slice(1),true);return;
  }
  if(target.matches('[data-close-filters]')) {$('#directory-filters').open=false;$('#directory-filters summary').focus();}
  if (target.matches('#menu-toggle')) setMenuOpen(!$('#side-menu').classList.contains('is-open'));
  if (target.matches('#menu-close,#menu-backdrop')) setMenuOpen(false,true);
  if (target.closest('#side-menu') && target.matches('a')) setMenuOpen(false,true);
  if (target.matches('[data-browse-mode]')) browseFor(target.dataset.browseMode);
  if (target.matches('[data-open-account]')) accountUI.open({role:target.dataset.openAccount});
  if (target.matches('[data-results-layout]')) setResultsLayout(target.dataset.resultsLayout);
  if (target.matches('#cards-prev,#cards-next')) scrollCards(target.id==='cards-next'?1:-1);
  if (target.getAttribute('href') === '#patrocinio' && config?.webhookUrl && !sponsorClickSent) {
    sponsorClickSent = true;
    service.send({ schemaVersion:1, eventId:crypto.randomUUID(), createdAt:new Date().toISOString(), type:'interesse_patrocinio_loja', data:{action:'banner_click'} }).catch(() => { /* O formulário ainda pode enviar o contato; sem tentativas automáticas. */ });
  }
  if (target.matches('[data-slide]')) slideBy(target.closest('.carousel'), Number(target.dataset.slide));
  if (target.matches('#load-more')) {
    const previousCount=$('#results').children.length;
    visibleLimit+=LISTING_PAGE_SIZE;renderResults();
    const firstNew=$('#results').children[previousCount];
    if(firstNew) {firstNew.tabIndex=-1;firstNew.focus({preventScroll:true});firstNew.scrollIntoView({block:'nearest',inline:'start',behavior:'instant'});}
  }
  if (target.matches('[data-clear]')) clearFilters();
  if (target.matches('.dialog-close,[data-close]')) closeDialog();
  if (target.matches('[data-demo-contact]')) toast('Perfil de demonstração. Não há número real para contatar.');
  if (target.matches('[data-category]')) { filters.category = target.dataset.category; $('#category').value = filters.category; renderResults(); }
  if (target.matches('[data-copy-pix]')) {
    if(!commercialOffer(config).chargeNow){toast('O lançamento é gratuito. Não faça Pix.');return;}
    try { await navigator.clipboard.writeText(config.pixKey); toast('Chave Pix copiada. Confirme o valor com a equipe antes de pagar.'); } catch { toast('Copie a chave exibida no quadro de pagamento.'); }
  }
  if (target.matches('[data-share]')) {
    const profile = catalog.profiles.find(p => p.id === target.dataset.share);
    const url = new URL('index.html', location.href); url.hash = 'perfil/' + profile.id;
    try {
      if (navigator.share) await navigator.share({ title:profile.name + ' · Ajuda em Casa Petrolina', url:url.href });
      else { await navigator.clipboard.writeText(url.href); toast('Link do perfil copiado.'); }
    } catch (error) { if (error.name !== 'AbortError') toast('Copie o endereço desta página para compartilhar o perfil.'); }
  }
  if (target.matches('[data-contact]')) {
    // Contagem anônima neste aparelho; sem telefone ou nome do visitante.
    try { const key='ajuda-codex:cliques'; const counts=JSON.parse(localStorage.getItem(key) || '{}'); counts[target.dataset.contact]=(Number(counts[target.dataset.contact]) || 0)+1; localStorage.setItem(key,JSON.stringify(counts)); } catch { /* Contato continua disponível. */ }
    window.dispatchEvent(new CustomEvent('ajuda:whatsapp', { detail:{ profileId:target.dataset.contact, source:'ajuda-em-casa-petrolina' } }));
  }
  if (target.getAttribute('href')?.startsWith('#') && target.hash === location.hash) route();
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('close', () => { if (!dialog.open) {document.body.classList.remove('modal-open');revokePreviews();if(lastFocus?.closest('#side-menu') && matchMedia('(max-width: 1050px)').matches) $('#menu-toggle').focus();else if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});} });
infoDialog.addEventListener('close',()=>{if(dialog.open&&infoLastFocus?.isConnected)infoLastFocus.focus({preventScroll:true});});
function closeFilters(restoreFocus=false) {
  const panel=$('#directory-filters');
  if(panel?.open) {panel.open=false;if(restoreFocus)panel.querySelector('summary').focus();}
}
// Fechar no click, não no pointerdown/focusin: recolher antes do mouseup
// desloca o botão tocado e faz o primeiro clique se perder.
document.addEventListener('click',event=>{if(!event.target.closest('#directory-filters'))closeFilters();},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && !dialog.open && $('#directory-filters').open) {event.preventDefault();closeFilters(true);return;}
  if(!$('#side-menu')?.classList.contains('is-open')) return;
  if(event.key==='Escape') {event.preventDefault();setMenuOpen(false,true);return;}
  if(event.key==='Tab') {
    const focusable=[...$('#side-menu').querySelectorAll('a,button')].filter(el=>el.getClientRects().length && !el.disabled);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
  }
});
window.addEventListener('hashchange', route);
window.addEventListener('offline', () => toast('Você está offline. A vitrine pode continuar disponível; os pedidos precisam de conexão.'));
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt=event; $('#install').hidden=false; });
$('#install').addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt=null; $('#install').hidden=true; } });

async function refreshLiveCatalog() {
  const [live,settings]=await Promise.all([dataClient.get('publicCatalog/current',{publicRead:true}),dataClient.get('settings/site',{publicRead:true})]);
  const d=live?.data;
  if(d?.schemaVersion!==1||![d.profiles,d.vacancies,d.advertisers].every(Array.isArray))throw new Error('Catálogo online indisponível.');
  catalog={...catalog,profiles:d.profiles};vacancies={...vacancies,jobs:d.vacancies};advertisers={...advertisers,advertisers:d.advertisers};
  config.directoryMessage=settings?.data.directoryMessage||'Encontre e converse gratuitamente.';
  if($('#commercial-notice'))$('#commercial-notice').textContent=config.directoryMessage;
}
async function start() {
  const getJSON = async path => { const response=await fetch(path,{cache:'no-store'}); if (!response.ok) throw new Error('Falha ao carregar ' + path); return response.json(); };
  try {
    [config,catalog,vacancies,advertisers] = await Promise.all([getJSON('config.json'),getJSON('profissionais.json'),getJSON('vagas.json'),getJSON('anunciantes.json')]);
    if (!Array.isArray(catalog.profiles) || catalog.schemaVersion !== 1) throw new Error('Formato de catálogo inválido.');
    auth=createAuthService(config);
    dataClient=createDataClient(config,auth);
    service = backendConfigured(config)?createRequestService(dataClient,auth):createN8nService(config);
    if(dataClient.enabled)await refreshLiveCatalog();
    let accountStorage;
    try {accountStorage=window.sessionStorage;} catch { /* Rascunho funciona em memória se o armazenamento estiver bloqueado. */ }
    accountUI=createAccountUI({config,auth,store:createAccountStore(accountStorage),openDialog,toast,onProfileSave:preferences=>dataClient.enabled?dataClient.saveAccount(auth.getUser(),preferences):Promise.resolve()});
    setMenuOpen(false);
    matchMedia('(max-width: 1050px)').addEventListener('change',()=>setMenuOpen(false));
    $('#results').addEventListener('scroll',updateCardsNavigation,{passive:true});
    $('#results').addEventListener('keydown',event=>{if(event.target===$('#results') && ['ArrowLeft','ArrowRight'].includes(event.key)) {event.preventDefault();scrollCards(event.key==='ArrowRight'?1:-1);}});
    window.addEventListener('resize',refreshCardsLayout,{passive:true});
    if('ResizeObserver' in window) {
      let previousWidth;
      new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==previousWidth){previousWidth=width;refreshCardsLayout();}}).observe($('#results'));
    }
    document.fonts?.ready.then(refreshCardsLayout);
    $('#demo-notice').hidden = !availableProfiles().some(p => p.demo);
    $('#commercial-notice').textContent=config.directoryMessage||'Encontre e converse gratuitamente.';
    $('#year').textContent = new Date().getFullYear();
    $('#category').insertAdjacentHTML('beforeend',options(CATEGORIES));
    $('#locality-options').innerHTML=[...NEIGHBORHOODS,...CONDOMINIUMS.map(c=>`${c.name} · ${c.neighborhood || 'Petrolina'}`)].map(n=>`<option value="${esc(n)}"></option>`).join('');
    $('#locality-count').textContent=`${CONDOMINIUMS.length} condomínios e ${NEIGHBORHOODS.length} bairros/regiões da base original. Você também pode informar outro bairro.`;
    $('#search-location').innerHTML=locationPicker();initLocationPickers($('#search-location'),config);
    $('#search-location').addEventListener('locationchange',event=>{filters.origin=event.detail;renderResults();});
    const params=new URLSearchParams(location.search);
    const requestedCategory = params.get('categoria');
    filters.category=CATEGORIES.find(c => c.id === requestedCategory || c.name === requestedCategory)?.id || '';
    filters.neighborhood=(params.get('bairro') || '').slice(0,100);
    filters.sort=params.get('ordem')==='mais-proximos'?'distance':'recommended';$('#sort').value=filters.sort;
    filters.mode=({vagas:'jobs',agencias:'agencies',emprego:'jobseekers'})[params.get('modo')]||'professionals';$('#directory-mode').value=filters.mode;
    filters.query=params.get('busca') || ''; filters.emergency=params.get('plantao') === '1';
    $('#directory-filters').open=!!(filters.category||filters.neighborhood||filters.emergency||filters.mode!=='professionals'||filters.sort==='distance');
    $('#query').value=filters.query; $('#category').value=filters.category; $('#neighborhood').value=filters.neighborhood; $('#emergency').setAttribute('aria-pressed',String(filters.emergency));
    $('#query').addEventListener('input', event => { filters.query=event.target.value.trim(); renderResults(); });
    $('#category').addEventListener('change',event => { filters.category=event.target.value; renderResults(); });
    $('#neighborhood').addEventListener('change',event => { filters.neighborhood=resolveLocality(event.target.value).neighborhood; renderResults(); });
    $('#sort').addEventListener('change',event=>{filters.sort=event.target.value;renderResults();});
    $('#directory-mode').addEventListener('change',event=>{filters.mode=event.target.value;renderResults();});
    $('#emergency').addEventListener('click',() => { filters.emergency=!filters.emergency; $('#emergency').setAttribute('aria-pressed',String(filters.emergency)); renderResults(); });
    $('#clear').addEventListener('click',clearFilters);
    renderResults(); route();
    // Atualiza expirações sem exigir recarregamento; não recria o resultado durante interação.
    setInterval(async () => {
      if(dialog.open||$('#results').contains(document.activeElement))return;
      if(dataClient.enabled) {
        try{await refreshLiveCatalog();}
        catch{catalog.profiles=[];vacancies.jobs=[];advertisers.advertisers=[];toast('Não foi possível atualizar a vitrine. Verifique sua conexão e recarregue.');}
      }
      renderResults();
    },60000);
  } catch {
    $('#result-count').textContent='Não foi possível carregar a vitrine.';
    $('#results').innerHTML='<div class="empty"><h3>Vamos tentar de novo?</h3><p>Verifique sua conexão e recarregue a página. Para visualizar a cópia no computador, use o servidor local indicado no README.</p><a class="btn secondary" href="index.html">Recarregar</a></div>';
  }
}
start();
