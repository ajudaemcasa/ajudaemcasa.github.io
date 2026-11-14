import { CATEGORIES, NEIGHBORHOODS, CONDOMINIUMS, MEDIA_LABELS, categoryName, visibleProfile, searchProfiles, whatsappUrl, isPro, featuredDays, monthKey, validateEvent } from './domain.mjs?v=77f496c8aac1';
import { formatPhone, phoneDigits, duplicateProfiles } from './telefone.mjs?v=77f496c8aac1';
import { createN8nService } from './n8n-service.mjs?v=77f496c8aac1';
import { commercialOffer } from './comercial.mjs?v=77f496c8aac1';
import { plansMarkup, proPaymentMarkup } from './comercial-ui.mjs?v=77f496c8aac1';
import { locationPicker, getLocation, initLocationPickers } from './localizacao-ui.mjs?v=77f496c8aac1';
import { distanceLabel, searchVacancies } from './localizacao.mjs?v=77f496c8aac1';
import {agencyFeeEditor,intermediationMarkup,readIntermediation} from './intermediacao-ui.mjs?v=77f496c8aac1';
import {adHeader,adDetailsMarkup,purposeField,adEditorFields,readAdDetails,updateAdPreview,modelsMarkup} from './anuncios-ui.mjs?v=77f496c8aac1';
import { createAuthService, authConfigured } from './auth-service.mjs?v=77f496c8aac1';
import { createAccountStore } from './conta.mjs?v=77f496c8aac1';
import { createAccountUI, roleLandingMarkup } from './conta-ui.mjs?v=77f496c8aac1';
import {profileHeading} from './perfil.mjs?v=77f496c8aac1';
import {createDataClient,backendConfigured} from './firestore.mjs?v=77f496c8aac1';
import {createRequestService} from './request-service.mjs?v=77f496c8aac1';
import {hasContact,validEmail} from './canais.mjs?v=77f496c8aac1';
import {createPublicationService} from './autopublicacao.mjs?v=77f496c8aac1';
import {publicationContactFields,initPublicationContacts,readPublicationContacts} from './publicacao-ui.mjs?v=77f496c8aac1';
import {createMessagesService} from './mensagens.mjs?v=77f496c8aac1';
import {createMessagesUI} from './mensagens-ui.mjs?v=77f496c8aac1';
import {selectHomeProfiles,selectHomeJobs} from './vitrine-home.mjs?v=77f496c8aac1';
import {setupInstallation} from './instalacao-ui.mjs?v=77f496c8aac1';
import {crownMarkup} from './layout-conexao.mjs?v=77f496c8aac1';
import {createNotificationService} from './avisos.mjs?v=77f496c8aac1';
import {beginLoading,withLoading,finishStartup} from './carregamento.mjs?v=77f496c8aac1';
import {createVotesService} from './votos.mjs?v=77f496c8aac1';
import {createVotesUI,communityRatingMarkup} from './votos-ui.mjs?v=77f496c8aac1';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const accountFirstName = user => {
  const source=(user?.name||user?.email?.split('@')[0]||'').trim();
  const first=source.split(/\s+/u)[0]||'';
  return Array.from(first).slice(0,24).join('');
};
const accountIntent = hash => {
  const route=String(hash||'').replace(/^#/,'');
  if(['cadastro-emprego','pro-emprego'].includes(route))return {role:'worker',workerGoal:'jobseeker'};
  if(['pro','cadastro'].includes(route))return {role:'worker',workerGoal:'service'};
  if(['agenciar','agenciador'].includes(route))return {role:'agency',workerGoal:'service'};
  return {role:'contractor',workerGoal:'service'};
};
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
let config, catalog, vacancies, advertisers, service, accountUI, toastTimer, lastFocus, auth, dataClient,publicationService,messagesUI;
let infoLastFocus, lastResultMarkup='';
let votesService,votesUI;
let sponsorClickSent = false;
let catalogFallback = '';
const PUBLIC_CATALOG_CACHE='ajuda-codex:catalogo-publico:v1';
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
const availableProfiles=()=>catalog.profiles.filter(p=>(!p.demo || config.showDemoProfiles===true) && (p.demo || hasContact(p)));
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
  const message=agency?'Olá! Vi a oportunidade '+job.title+' no Ajuda em Casa (https://ajudaemcasa.github.io/app/) e quero falar diretamente com o agenciador.':'Olá! Vi a vaga '+job.title+' no Ajuda em Casa (https://ajudaemcasa.github.io/app/) e tenho interesse em conversar sobre o trabalho.';
  const href=number?'https://wa.me/'+number+'?text='+encodeURIComponent(message):null;
  const ad=job.ad;
  return `<article class="person-card basic-card job-card ad-poster ad-tone-${ad.tone}" data-job="${esc(job.id)}" data-plan="${ad.premium?'pro':'free'}">${job.promotion?.paidBoostDays?`<div class="feature-badge">🔥 Destaque avulso · restam ${job.promotion.paidBoostDays} dias</div>`:job.promotion?.agencyTrialDays?`<div class="feature-badge">Agenciador em destaque · período inicial de 6 meses · restam ${job.promotion.agencyTrialDays} dias</div>`:''}${adHeader(ad)}<p class="ad-model-name">${ad.premium?esc(ad.name):'Oportunidade · básico'}</p><h3>${esc(job.title)}</h3><p class="ad-byline">Divulgado por ${esc(job.publicName)}</p>${distanceMarkup(job)}<p>${esc(job.neighborhood)}</p><p>${esc(job.description)}</p>${ad.premium?adDetailsMarkup(ad,job.neighborhood):`<p>${esc(job.schedule)}</p>`}${intermediationMarkup(job.intermediation)}${contactActions({...job,name:job.publicName},agency?'Falar com o agenciador':'Tenho interesse na vaga',message)}<p class="micro">Confirme disponibilidade e condições. Endereço exato e referências só na conversa privada.</p></article>`;
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
  return contactActions(profile);
}
function contactActions(profile,whatsappLabel='WhatsApp',message='') {
  const href = whatsappUrl(profile);
  const text=message||`Olá! Encontrei ${profile.name||profile.publicName} no Ajuda em Casa (https://ajudaemcasa.github.io/app/) e quero conversar sobre ${categoryName(profile.category)}.`;
  const links=[];
  if(href)links.push(`<a class="btn whatsapp" href="${esc(message?'https://wa.me/'+phoneDigits(profile.phone)+'?text='+encodeURIComponent(message):href)}" data-contact="${esc(profile.id)}" target="_blank" rel="noopener noreferrer">${esc(whatsappLabel)} <span aria-hidden="true">↗</span></a>`);
  if(profile.contactOptions?.email && validEmail(profile.email))links.push(`<a class="btn secondary" href="mailto:${esc(encodeURIComponent(profile.email))}?subject=${encodeURIComponent(categoryName(profile.category)+' · Ajuda em Casa')}&amp;body=${encodeURIComponent(text)}">E-mail</a>`);
  if(profile.contactOptions?.site && profile.contactRef)links.push(`<a class="btn secondary" href="#mensagem/${encodeURIComponent(profile.id)}">Mensagem pelo site</a>`);
  return links.join('')||(profile.demo?'<button class="btn whatsapp" type="button" data-demo-contact>Ver contato de exemplo</button>':'<span class="micro">Canal de contato indisponível</span>');
}
function renderHome() {
  if(!catalog)return;
  const profiles=selectHomeProfiles(searchProfiles(availableProfiles(),{adType:'service'}));
  const jobs=selectHomeJobs(searchVacancies(vacancies.jobs,{sort:'recommended'},Date.now(),advertisers.advertisers));
  const offers=profiles.map(card).join('')||'<div class="empty"><h3>Seja o primeiro a oferecer este serviço</h3><a class="btn primary" href="#cadastro">Publicar meu cadastro</a></div>';
  const wanted=jobs.map(vacancyCard).join('')||'<div class="empty"><h3>Nenhuma oportunidade publicada por enquanto</h3><p>Casas e agenciadores podem publicar uma oportunidade gratuita.</p><a class="btn primary" href="#publicar-vaga">Publicar oportunidade</a></div>';
  if($('#home-offers').innerHTML!==offers){$('#home-offers').innerHTML=offers;initCarousels($('#home-offers'));}
  if($('#home-jobs').innerHTML!==wanted)$('#home-jobs').innerHTML=wanted;
}
function ratingMarkup(profile,compact=false) {
  return communityRatingMarkup(profile,compact);
}
function managementLinks(profile) {
  if(profile.unverified) return `<p class="micro"><a href="#meu-cadastro/${encodeURIComponent(profile.id)}">Este cadastro é meu / pedir correção ou retirada</a></p>`;
  return profile.demo ? '' : `<p class="micro"><a href="#avaliar/${encodeURIComponent(profile.id)}">Avaliar serviço</a> · <a href="#meu-cadastro/${encodeURIComponent(profile.id)}">Este cadastro é meu / pedir retirada</a></p>`;
}
function card(profile) {
  if (profile.plan !== 'pro') return `<article class="person-card basic-card ${profile.featuredDays?'featured':''}" data-profile="${esc(profile.id)}" data-plan="free">${profile.featuredDays?`<div class="feature-badge">🔥 EM DESTAQUE (Restam ${profile.featuredDays} dias)</div>`:''}<h3>${esc(profile.heading || profile.name)}</h3>${!profile.heading||profile.heading===profile.name?`<p class="service-name">${esc(categoryName(profile.category))}</p>`:''}${profile.unverified?'<span class="unverified-badge" title="Identidade, disponibilidade e atendimento não confirmados">Não verificado</span>':''}${ratingMarkup(profile,true)}${profile.note?`<p class="card-note">${esc(profile.note)}</p>`:''}${profile.phone?`<p class="basic-phone">${esc(profile.phone)}</p>`:''}<div class="card-actions">${contactButton(profile)}</div><a class="card-detail-link" href="#perfil/${encodeURIComponent(profile.id)}">Ver detalhes</a></article>`;
  return `<article class="person-card ad-tone-${profile.ad.tone} ${profile.featuredDays ? 'featured' : ''}" data-profile="${esc(profile.id)}" data-plan="pro">${profile.featuredDays ? `<div class="feature-badge"><span class="flame">🔥</span> EM DESTAQUE (Restam ${profile.featuredDays} ${profile.featuredDays === 1 ? 'dia' : 'dias'})</div>` : ''}${gallery(profile)}<div class="card-body">${adHeader(profile.ad)}<div class="title-row"><div><h3>${esc(profile.heading || profile.name)}</h3><p class="service-name">${esc(categoryName(profile.category))}</p></div><span class="plan-tag">${crownMarkup()}${esc(profile.ad.accessLabel)}</span></div>${profile.verified ? `<div class="verified">${icon('check')} Profissional Verificado</div>` : ''}${ratingMarkup(profile)}<p class="card-note">${esc(profile.note)}</p><p class="card-regions">⌖ ${esc(profile.neighborhoods.slice(0, 2).join(' · '))}${profile.neighborhoods.length > 2 ? ` +${profile.neighborhoods.length - 2} regiões` : ''}${profile.emergency ? ' · Plantão 24h' : ''}</p>${adDetailsMarkup(profile.ad,profile.neighborhoods.slice(0,2).join(' · '))}<div class="card-actions"><a class="btn details" href="#perfil/${encodeURIComponent(profile.id)}">Ver perfil</a>${contactButton(profile)}</div>${managementLinks(profile)}</div></article>`;
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
    route();
  $('#profissionais').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function clearFilters() {
  Object.assign(filters, { category:'', neighborhood:'', query:'', emergency:false });
  $('#query').value = ''; $('#query-clear').hidden=true;$('.directory-search').classList.remove('has-query');
  $('#category').value = ''; $('#neighborhood').value = ''; $('#emergency').setAttribute('aria-pressed', 'false'); renderResults();
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
  if(config&&catalog)route();
}
function openDialog(html) {
  closeFilters();
  const central=/^#(?:contratar|ser-contratado|agenciar|conta|entrar|perfil-conta|planos|modelos|termos|privacidade|mensagens|mensagem\/|avaliar\/)/.test(location.hash);
  if(central && dialog.open)dialog.close();
  const view=central?$('#central-view-content'):$('#dialog-content');
  if(central){$('#dialog-content').replaceChildren();$('#central-view').hidden=false;$('#home-showcase').hidden=true;$('#profissionais').hidden=true;}
  else if(!dialog.open && !$('#central-view').hidden){$('#central-view-content').replaceChildren();$('#central-view').hidden=true;$('#home-showcase').hidden=false;}

  if(infoDialog.open)infoDialog.close();
  revokePreviews();
  if (!dialog.open) lastFocus = document.activeElement;
  view.innerHTML = html;
  initPublicationContacts(view);
  const professionalForm=view.querySelector('form[data-event="novo_cadastro_gratuito"],form[data-event="solicitacao_upgrade_pro"]');
  if(professionalForm) {
    professionalForm.insertAdjacentHTML('afterbegin',`<div class="field full"><label for="entity-type">Quem vai divulgar o serviço?</label><select id="entity-type" name="entityType"><option value="person">Pessoa física</option><option value="company">Empresa · razão social</option></select></div><div class="field full" data-company-name hidden><label for="legal-name">Razão social da empresa</label><input id="legal-name" name="legalName" autocomplete="organization" maxlength="160" disabled></div>`);
    professionalForm.querySelector('#service').closest('.field').insertAdjacentHTML('afterend','<div class="notice full identity-preview"><strong>Assim aparecerá no cartão</strong><output data-profile-heading aria-live="polite"></output><small>Serviço primeiro; pessoa com primeiro nome e último sobrenome, ou razão social da empresa. O nome completo enviado não é alterado.</small></div>');
    updateIdentityPreview(professionalForm);
  }
  if (!central && !dialog.open) dialog.showModal();
  if(!central)document.body.classList.add('modal-open');
  view.scrollTop = 0;
  initCarousels(view);
  initLocationPickers(view,config);
  updateAdPreview(view.querySelector('form'));
  const title=view.querySelector('#dialog-title'); title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});
  if(central)$('#main-content').scrollIntoView({block:'start',behavior:'instant'});
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
  openDialog(plansMarkup(config));
}
const namePhone = `<div class="field"><label for="name">Seu nome e sobrenome</label><input id="name" name="name" autocomplete="name" maxlength="100" required></div><div class="field"><label for="phone">WhatsApp com DDD</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+55 87 99999-9999" maxlength="26" required></div>`;
const categoryField = () => `<div class="field full"><label for="service">Categoria do serviço</label><select id="service" name="category" required><option value="">Selecione o serviço</option>${options(CATEGORIES, filters.category)}</select></div>`;
const consent = '<label class="check consent full"><input type="checkbox" name="consent" required><span>Concordo com o tratamento destes dados pelo Ajuda em Casa para executar meu pedido. Li <a href="#termos">como funciona</a> e a <a href="#privacidade">informação de privacidade</a>.</span></label>';
function formShell(type, title, intro, fields, button) {
  if(['novo_cadastro_gratuito','solicitacao_upgrade_pro','novo_orcamento_cliente','nova_vaga_empregador'].includes(type)) fields+=registrationLocation();
  return `<span class="eyebrow">AJUDA EM CASA · PETROLINA</span><h2 id="dialog-title">${title}</h2><p class="dialog-intro">${intro}</p>${!config.webhookUrl ? '<p class="notice">Os envios ainda não estão disponíveis nesta versão de teste. Você pode conhecer os campos; nenhum dado será enviado até o atendimento ser conectado.</p>' : ''}<form class="form-grid" data-event="${type}">${fields}<div class="trap" aria-hidden="true"><label>Deixe vazio<input name="website" tabindex="-1" autocomplete="off"></label></div>${consent}<p class="form-status full" role="status" aria-live="polite"></p><button class="btn primary full" type="submit">${button}</button><p class="micro full">${['novo_cadastro_gratuito','nova_vaga_empregador'].includes(type)?'A publicação básica é automática após as validações. Isso não concede selo, PRO ou cobrança.':'Pedidos de titularidade, avaliações e benefícios específicos seguem o procedimento correspondente.'}</p></form>`;
}
function showFreeForm(adType='service') {
  openDialog(formShell('novo_cadastro_gratuito', 'Seu trabalho começa aqui.', 'Publique seu perfil básico gratuitamente. Escolha quais contatos divulgar; a publicação válida é automática.', `${publicationContactFields(auth.getUser())}${purposeField()}${categoryField()}<div class="field full"><label for="note">Observação curta <span class="micro">(opcional)</span></label><textarea id="note" name="note" maxlength="140" rows="3" placeholder="Conte, em poucas palavras, como você pode ajudar."></textarea><span id="note-counter" class="counter">0 / 140 caracteres · somente texto</span></div><div class="notice full">Fotos de Antes/Depois, cartão profissional, descrição detalhada e destaque no topo fazem parte do <a href="#planos">Plano PRO</a>.</div>`, 'Publicar meu cadastro grátis'));
  $('#ad-type').value=adType;
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
  openDialog(formShell('nova_vaga_empregador','Sua oportunidade, fácil de entender.','O básico é gratuito. Para publicar o modelo didático, solicite PRO: seis meses de teste após aprovação, depois assinatura opcional. Escolher o modelo abaixo não ativa o plano.',`${publicationContactFields(auth.getUser())}<div class="field full"><label for="publisher-type">Quem está divulgando?</label><select id="publisher-type" name="publisherType"><option value="employer">Contratante direto · azul no PRO</option><option value="agency">Agenciador / agência · amarelo no PRO</option></select></div><div class="field full" data-agency-field hidden><label for="agency-name">Nome público da agência / agenciador</label><input id="agency-name" name="agencyName" maxlength="100"></div><div class="field full"><label for="requested-format">Modelo de divulgação</label><select id="requested-format" name="requestedFormat"><option value="standard">Básico gratuito · fundo neutro</option><option value="pro">Solicitar modelo PRO · 6 meses de teste no lançamento</option></select></div><div class="field full"><label for="advertiser-id">Código do anunciante PRO (se já aprovado)</label><input id="advertiser-id" name="advertiserId" maxlength="80" pattern="[a-z0-9-]+" placeholder="Opcional; a equipe confere o titular e o plano"><small>O código identifica a conta; não é senha nem prova de assinatura. Novos anunciantes solicitam o teste ao escolher o modelo PRO.</small></div>${categoryField()}<div class="field full"><label for="job-title">Título da vaga</label><input id="job-title" name="title" required maxlength="100" placeholder="Ex.: profissional para trabalho doméstico"></div><div class="field full"><label for="job-description">Resumo da oportunidade</label><textarea id="job-description" name="description" required maxlength="1500" rows="3" placeholder="Informe as atividades e condições principais; não inclua endereço exato."></textarea></div><div class="field full"><label for="schedule">Dias, horários e intervalo</label><input id="schedule" name="schedule" required maxlength="200" placeholder="Ex.: segunda a sexta, horário e intervalo a combinar"></div>${adEditorFields({job:true})}${agencyFeeEditor()}<p class="notice full">O teste pertence ao anunciante, não à vaga. Criar outra oportunidade não reinicia os seis meses. Sem adesão paga após o teste, o anúncio fica no modelo básico neutro.</p>`,'Publicar oportunidade grátis'));
  $('#registration-area').required=true;
  $('#publisher-type').value=kind;
  if(kind==='agency' || premium) $('#requested-format').value='pro';
  updateAdPreview(dialog.querySelector('form'));
}

function showFeatureForm() {
  const active=availableProfiles().filter(p=>p.status==='approved');
  openDialog(formShell('ativacao_destaque_3dias','Apareça no topo por 3 dias.','Escolha o benefício mensal PRO ou o destaque avulso de R$ 99,90 por 72 horas. A equipe confere o cadastro e o pagamento antes da ativação.',`${namePhone}<div class="field full"><label for="boost-mode">Como deseja destacar?</label><select id="boost-mode" name="purchaseMode"><option value="pro_monthly">Benefício mensal de um PRO ativo · 3 dias</option><option value="one_off">Destaque avulso · R$ 99,90 por 72 horas</option></select></div><div class="field full"><label for="profileId">Código do seu cadastro</label><input id="profileId" name="profileId" required pattern="[a-z0-9-]+" maxlength="80" list="pro-profiles" placeholder="Código recebido na aprovação"><datalist id="pro-profiles">${active.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</datalist><small>A equipe confirma o titular. O destaque avulso não exige assinatura PRO.</small></div><div id="feature-status" class="notice full">Destaque avulso tem preço separado. Não há teste automático de seis meses; cortesias dependem de concessão do administrador. Não há renovação automática.</div><p class="micro full">O pagamento Asaas ainda está em preparação. Enviar este pedido não faz cobrança nem garante ativação.</p>`,'Solicitar meu destaque'));
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
  const [profileId,side]=id.split('/');
  const p=availableProfiles().find(p=>p.id===profileId && ['approved','unverified'].includes(p.status) && !p.demo);
  if(!p) {openDialog('<h2 id="dialog-title">Perfil indisponível para avaliação</h2><p>Somente serviços de profissionais reais podem ser avaliados.</p>');return;}
  votesUI.open(p,['positive','negative'].includes(side)?side:'');
}
function showProfile(id) {
  const raw = availableProfiles().find(p => p.id === id && ['approved','unverified'].includes(p.status));
  if (!raw) { openDialog('<h2 id="dialog-title">Perfil não encontrado</h2><p>Este perfil pode ter sido removido ou ainda estar em análise.</p><button class="btn secondary" type="button" data-close>Voltar para a busca</button>'); return; }
  const p = visibleProfile(raw);
  if (p.plan !== 'pro') { openDialog(`<h2 id="dialog-title">${esc(p.heading || p.name)}</h2>${p.unverified ? '<p class="unverified-badge">Não verificado</p>' : ''}${ratingMarkup(p)}${managementLinks(p)}<p>${esc(categoryName(p.category))}</p><p>${esc(p.phone)}</p><p>${esc(p.note)}</p>${contactButton(p)}<p class="plan-note"><a href="#pro">É você? Vire PRO para adicionar fotos de Antes/Depois e ficar no topo.</a></p>`); return; }
  openDialog(`<div class="profile-dialog ad-tone-${p.ad.tone}">${adHeader(p.ad)}<span class="eyebrow">PERFIL PRO ${p.demo ? '· DEMONSTRAÇÃO' : '· PETROLINA'}</span><h2 id="dialog-title">${esc(p.heading || p.name)}</h2>${ratingMarkup(p)}${managementLinks(p)}<p class="dialog-intro">${esc(categoryName(p.category))}</p>${p.verified ? `<div class="verified">${icon('check')} Profissional Verificado${p.demo ? ' · selo ilustrativo' : ''}</div>` : ''}${p.featuredDays ? `<p class="feature-badge">🔥 EM DESTAQUE (Restam ${p.featuredDays} dias)</p>` : ''}${gallery(p)}${adDetailsMarkup(p.ad,p.neighborhoods.join(' · '))}<h3>Conheça meu trabalho</h3><p class="profile-description">${esc(p.description)}</p><h3>Onde atendo</h3><div class="region-tags">${p.neighborhoods.map(n => `<span>${esc(n)}</span>`).join('')}</div>${p.emergency ? '<p class="notice">Plantão / Emergência 24h informado pelo profissional. Confirme a disponibilidade na conversa.</p>' : ''}<p>${esc(p.phone)}</p><div class="profile-actions">${contactButton(p)}<button type="button" class="btn secondary" data-share="${esc(p.id)}">Compartilhar perfil ↗</button></div><p class="micro">O selo indica uma conferência da equipe; não garante a qualidade ou a execução do serviço.</p></div>`);
}
function showInfo(type,overForm=false) {
  const privacy=type==='privacidade';
  const text=privacy?
    '<h3>Conta Google e publicação</h3><p>O acesso e o cadastro usam somente Google pelo Firebase Authentication. Recebemos nome, e-mail e identificador da conta, sem acesso à agenda, Drive ou telefone. No primeiro acesso, você informa um WhatsApp para sua conta. Esse número fica privado e só aparece em um anúncio se houver uma autorização separada no formulário de publicação. Nome, objetivo, WhatsApp privado e aceite ficam no Cloud Firestore, na região de São Paulo. O login não verifica telefone, profissão ou identidade civil.</p><p>Cadastros básicos e oportunidades válidos são publicados automaticamente após sua autorização. Nome, serviço e apresentação ficam públicos. Você escolhe separadamente quais canais deseja publicar. Sem autorizar o WhatsApp, pode receber por e-mail e/ou na caixa de mensagens do site. O botão E-mail abre o programa de e-mail de quem escreve; não há envio automático de e-mail.</p><h3>Mensagens e atendimento</h3><p>As mensagens do site ficam no banco privado e podem ser lidas somente pelas contas participantes, em Meu perfil → Minhas mensagens. O texto não publica seu e-mail ou telefone. Consulte a caixa para ver respostas; ainda não há aviso automático por e-mail.</p><p>Pedidos de titularidade, avaliações escritas anteriores, orçamento e extras ficam na fila privada de atendimento. O n8n valida temporariamente o token de acesso e o protocolo para enviar um aviso ao Telegram privado do administrador. O token não entra no aviso nem é armazenado nas execuções do fluxo. O aviso não contém o texto das mensagens privadas.</p><h3>Localização e cache</h3><p>Localização é opcional e depende de seu clique. Quando autorizada para publicação, é arredondada para uma região de cerca de 1 km. Não publique endereço exato. O mapa opcional usa OpenStreetMap, que recebe seu IP e a área visualizada. A localização usada na busca fica em memória. O cache guarda somente a vitrine pública para consulta offline, que pode estar desatualizada.</p><h3>Avaliações, correções e retirada</h3><p>As marcações positivas e negativas são feitas por contas conectadas, com um voto editável por contato e vários motivos opcionais. Os motivos somam peso à média; todos começam em 4/5, indicada como nota inicial sem votos. A nota muda após salvar o voto no servidor, sem depender de pagamento ou PRO. Nome, telefone e identificador do avaliador não são públicos; somente contagens e pesos agregados são públicos. O avaliador pode retirar o próprio voto. Administradores autorizados podem consultar as marcações para conferência. Votos não suspendem automaticamente um profissional. Não usamos IP ou GPS para atribuir fraude automaticamente. A nota inicial do cadastro não é avaliação de cliente. Cadastros importados não verificados não confirmam identidade, autorização ou disponibilidade.</p><p>Para corrigir ou retirar um anúncio, use <a href="#meu-cadastro">Este cadastro é meu / pedir retirada</a>. Administradores autorizados podem corrigir, suspender e excluir da vitrine, com registro do motivo. O histórico necessário para segurança e bloqueios permanece privado.</p>':
    '<h3>Buscar, publicar e conversar</h3><p>O acesso é somente com Google. O Google fornece nome e e-mail, não seu telefone. No primeiro acesso, você confirma um WhatsApp privado para a conta e aceita as políticas. Publicar esse número exige autorização separada em um anúncio. O cadastro básico e a publicação de oportunidades são gratuitos e automáticos quando os dados e o consentimento são válidos.</p><p>Não publique informações de terceiros sem autorização. Confirme condições, preço e disponibilidade diretamente com o profissional. Não prometemos contratação e o login não comprova profissão, identidade civil ou propriedade de telefone. Pedidos de titularidade têm análise separada. Avaliações positivas ou negativas devem descrever experiências reais, sem votar no próprio cadastro identificado. Cada conta mantém um voto por contato, editável e removível. Os totais são públicos; a identidade do avaliador fica privada.</p><h3>Vitrine e oportunidades</h3><p>A página inicial mostra até quatro serviços e quatro oportunidades reais, com rodízio a cada visita. Destaques ativos e PRO têm prioridade; há rodízio dentro da mesma faixa, seguido dos cadastros básicos. Na busca Mais próximos, a distância aproximada vem primeiro. Oportunidades expiram em até 30 dias.</p><p>Agenciadores informam o preço de intermediação antes do contato. O candidato não paga para concorrer. Combine todas as condições de trabalho com quem anuncia.</p><h3>PRO e pagamentos</h3><p>PRO é opcional e segue procedimento próprio. Não concede selo de verificação automaticamente. Pagamentos e cobranças pelo site ainda não estão ativos. Nenhuma inscrição autoriza cobrança ou renovação automática.</p>';
  const html='<div class="document-copy"><span class="eyebrow">TRANSPARÊNCIA</span><h2 id="dialog-title">'+(privacy?'Seus dados, com clareza.':'Como funciona o Ajuda em Casa')+'</h2>'+text+'</div>';
  if(!overForm)return openDialog(html);
  infoLastFocus=document.activeElement;
  $('#info-dialog-content').innerHTML=html.replace('id="dialog-title"','id="info-dialog-title"');
  if(!infoDialog.open)infoDialog.showModal();
  infoDialog.scrollTop=0;
  $('#info-dialog-title').tabIndex=-1;$('#info-dialog-title').focus();
}
function route() {
  if (!config || !catalog || document.querySelector('form[data-busy="true"]')) return;
  closeFilters();
  if(infoDialog.open)infoDialog.close();
  if($('#side-menu').classList.contains('is-open'))setMenuOpen(false);
  let hash;
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
  for(const link of document.querySelectorAll('#side-menu nav a')) {
    const current=link.hash.slice(1)===(hash||'inicio') || (link.hash==='#conta' && ['entrar','perfil-conta'].includes(hash));
    if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  const home=hash==='inicio'||(!hash&&!location.search);
  const directory=['servicos','profissionais','oportunidades'].includes(hash)||(!hash&&!!location.search);
  if(home||directory) {
    if(dialog.open)dialog.close();
    $('#central-view').hidden=true;$('#central-view-content').replaceChildren();
    $('#home-showcase').hidden=!home;$('#profissionais').hidden=!directory;
    if(hash==='servicos')filters.mode='professionals';if(hash==='oportunidades')filters.mode='jobs';
    $('#directory-mode').value=filters.mode;renderResults();renderHome();return;
  }
  if(hash==='mensagens')return accountUI.guard(()=>messagesUI.open());
  if(hash.startsWith('mensagem/'))return accountUI.guard(()=>{
    const id=hash.slice(9),profile=[...catalog.profiles,...vacancies.jobs].find(p=>p.id===id);
    if(!profile)return openDialog('<h2 id="dialog-title">Contato não encontrado</h2><p>Este anúncio pode ter sido retirado.</p>');
    messagesUI.compose(profile);
  });
  const routes = { contratar:()=>showRoleLanding('contractor'),'ser-contratado':()=>showRoleLanding('worker'),agenciar:()=>showRoleLanding('agency'),conta:()=>accountUI.open(),entrar:()=>accountUI.open({mode:'login'}),'perfil-conta':()=>accountUI.showProfile(),modelos:()=>openDialog(modelsMarkup()),agenciador:()=>showVacancyForm('agency'),'pro-emprego':()=>accountUI.guard(()=>showProForm('jobseeker'),{role:'worker',workerGoal:'jobseeker'}),planos:showPlans,cadastro:showFreeForm,pro:()=>accountUI.guard(()=>showProForm(),{role:'worker'}),orcamento:showQuoteForm,'publicar-vaga':()=>showVacancyForm(),'publicar-vaga-pro':()=>accountUI.guard(()=>showVacancyForm('employer',true),{role:'contractor'}),destaque:showFeatureForm,patrocinio:showSponsorForm,privacidade:()=>showInfo('privacidade'),termos:()=>showInfo('termos') };
  routes['cadastro-emprego']=()=>showFreeForm('jobseeker');
  if(backendConfigured(config) && (!auth.getUser()?.emailVerified || !accountUI.hasPreferences()) && (['cadastro','cadastro-emprego','agenciador','pro-emprego','pro','orcamento','publicar-vaga','publicar-vaga-pro','destaque','patrocinio','meu-cadastro'].includes(hash)||hash.startsWith('avaliar/')||hash.startsWith('meu-cadastro/')))return accountUI.guard(route,accountIntent('#'+hash));
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
  const finishLoading=beginLoading();
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
    Object.assign(data,readPublicationContacts(form,auth.getUser()));
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
      const profile = [...catalog.profiles,...vacancies.jobs,...advertisers.advertisers].find(p => p.id === data.profileId?.trim());
      if (!profile || profile.status!=='approved') throw new Error('Informe o código de um cadastro aprovado.');
      if(data.purchaseMode!=='one_off' && !isPro(profile)) throw new Error('Informe o código de um perfil com PRO ativo.');
      if (profile.demo) throw new Error('Este é um perfil de demonstração. A solicitação estará disponível para seu perfil real depois da aprovação.');
      if (featuredDays(profile)) throw new Error('Este perfil já está em destaque.');
      if (data.purchaseMode!=='one_off' && ((profile.featuredMonths || []).includes(monthKey()) || profile.featuredMonth === monthKey())) throw new Error('O benefício deste mês já foi utilizado.');
    }
    form.dataset.eventId ||= crypto.randomUUID(); form.dataset.createdAt ||= new Date().toISOString();
    const payload = validateEvent({ type:form.dataset.event, schemaVersion:1, eventId:form.dataset.eventId, createdAt:form.dataset.createdAt, data });
    status.textContent = 'Salvando seus dados…'; button.textContent = 'Salvando…';
    const automatic=['novo_cadastro_gratuito','nova_vaga_empregador'].includes(payload.type)&&payload.data.contactOptions;
    const receipt=automatic?await publicationService.publish(payload):await service.send(payload);
    if(receipt.published){try{await refreshLiveCatalog();renderResults();renderHome();}catch{/* A publicação confirmada não pode virar erro de envio. */}}
    status.className = 'form-status full success';
    status.textContent=receipt.published?`Anúncio publicado! Protocolo: ${receipt.eventId}. Já está disponível na vitrine com os canais que você autorizou.`:`Pedido registrado. Protocolo: ${receipt.eventId}. Acompanhe pelo atendimento.`;
    form.dataset.delivered = 'true'; button.textContent=receipt.published?'Anúncio publicado':'Pedido registrado';
    for (const input of form.querySelectorAll('input,textarea,select,button')) input.disabled = true;
    const notice=document.createElement('p');notice.className='micro full';notice.setAttribute('role','status');status.after(notice);
    const notify=async()=>{
      notice.textContent='Enviando aviso ao atendimento…';
      try{await createNotificationService(auth).notify(receipt.eventId);notice.textContent='Atendimento avisado pelo Telegram.';}
      catch(error){notice.textContent=error.message+' ';const retry=document.createElement('button');retry.type='button';retry.className='btn secondary';retry.textContent='Reenviar somente o aviso';retry.onclick=notify;notice.append(retry);}
    };
    notify();
  } catch (error) {
    status.className = 'form-status full error'; status.textContent = error.message;
    button.disabled = false; button.textContent = originalLabel;
  } finally { form.dataset.busy = 'false'; close.disabled = false; finishLoading(); }
}
document.addEventListener('submit', event => { if (event.target.matches('form[data-event]')) { event.preventDefault(); submitForm(event.target); } });
document.addEventListener('input', event => {
  const form = event.target.closest('form');
  updateIdentityPreview(form);
  updateAdPreview(form);
  if (form && form.dataset.busy !== 'true') { delete form.dataset.eventId; delete form.dataset.createdAt; }
  if (event.target.id === 'note') $('#note-counter').textContent = `${Array.from(event.target.value).length} / 140 caracteres · somente texto`;
  if (event.target.id === 'profileId' && $('#feature-status')) {
    const p = [...catalog.profiles,...vacancies.jobs,...advertisers.advertisers].find(p => p.id === event.target.value.trim());
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
  if(target.matches('.google-entry')&&!auth?.getUser()) {
    event.preventDefault();
    accountUI?.startGoogle(accountIntent(location.hash));
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
setupInstallation({showInfo:html=>openDialog(html),toast});

async function refreshLiveCatalog() {
  const [live,settings,ratings]=await Promise.all([dataClient.get('publicCatalog/current',{publicRead:true}),dataClient.get('settings/site',{publicRead:true}),votesService.listPublic()]);
  const d=live?.data;
  if(d?.schemaVersion!==1||![d.profiles,d.vacancies,d.advertisers].every(Array.isArray))throw new Error('Catálogo online indisponível.');
  catalog={...catalog,profiles:d.profiles.map(p=>({...p,communityRating:ratings.get(p.id)}))};vacancies={...vacancies,jobs:d.vacancies};advertisers={...advertisers,advertisers:d.advertisers};
  config.directoryMessage=settings?.data.directoryMessage||'Encontre e converse gratuitamente.'; if(['paid','launch'].includes(settings?.data.commercialStage))config.commercialStage=settings.data.commercialStage;
  try {
    const snapshot=JSON.stringify({schemaVersion:1,profiles:catalog.profiles,vacancies:d.vacancies,advertisers:d.advertisers,directoryMessage:config.directoryMessage,savedAt:Date.now()});
    if(snapshot.length<=4000000)localStorage.setItem(PUBLIC_CATALOG_CACHE,snapshot);
  } catch { /* A vitrine online continua funcionando sem armazenamento local. */ }
  if($('#commercial-notice'))$('#commercial-notice').textContent=config.directoryMessage;
}
function restorePublicCatalog() {
  try {
    const d=JSON.parse(localStorage.getItem(PUBLIC_CATALOG_CACHE)||'null');
    if(d?.schemaVersion!==1||![d.profiles,d.vacancies,d.advertisers].every(Array.isArray))return false;
    catalog={...catalog,profiles:d.profiles};vacancies={...vacancies,jobs:d.vacancies};advertisers={...advertisers,advertisers:d.advertisers};
    if(typeof d.directoryMessage==='string'&&d.directoryMessage.length<=300)config.directoryMessage=d.directoryMessage;
    return true;
  } catch { return false; }
}
async function start() {
  const getJSON = async path => {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {const response=await fetch(path,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Falha ao carregar '+path);return await response.json();}
    finally {clearTimeout(timer);}
  };
  try {
    [config,catalog,vacancies,advertisers] = await Promise.all([getJSON('config.json'),getJSON('profissionais.json'),getJSON('vagas.json'),getJSON('anunciantes.json')]);
    if (!Array.isArray(catalog.profiles) || catalog.schemaVersion !== 1) throw new Error('Formato de catálogo inválido.');
    auth=createAuthService(config);
    dataClient=createDataClient(config,auth);
    votesService=createVotesService(dataClient,auth);
    votesUI=createVotesUI({service:votesService,showView:openDialog,onSaved:async(id,totals)=>{catalog.profiles=catalog.profiles.map(p=>p.id===id?{...p,communityRating:totals}:p);renderResults();renderHome();}});
    service = backendConfigured(config)?createRequestService(dataClient,auth):createN8nService(config);
    publicationService=createPublicationService(dataClient,auth);
    messagesUI=createMessagesUI({service:createMessagesService(dataClient,auth),auth,showView:openDialog});
    if(dataClient.enabled) {
      const restored=restorePublicCatalog();
      if(!navigator.onLine)catalogFallback=restored?'cached':'empty';
      else if(restored) {
        // A cópia pública abre a tela imediatamente; a rede atualiza em segundo plano.
        // Uma conexão lenta não deixa a página vazia nem prende o usuário no carregamento.
        refreshLiveCatalog().then(()=>{catalogFallback='';renderResults();renderHome();}).catch(error=>{
          catalogFallback='cached';
          console.warn('Catálogo online indisponível; usando a cópia pública local.',error.message);
          toast('Conexão instável: exibindo a última cópia pública disponível.');
        });
      } else {
        try { await refreshLiveCatalog(); }
        catch(error) {
          catalogFallback='empty';
          console.warn('Catálogo online indisponível e sem cópia local.',error.message);
        }
      }
    }
    let accountStorage;
    try {accountStorage=window.sessionStorage;} catch { /* Rascunho funciona em memória se o armazenamento estiver bloqueado. */ }
    accountUI=createAccountUI({config,auth,store:createAccountStore(accountStorage),openDialog,toast,onAdminAccess:()=>dataClient.hasAdminAccess(),onProfileLoad:user=>withLoading(()=>dataClient.enabled?dataClient.loadAccount(user):Promise.resolve(null)),onProfileSave:preferences=>withLoading(()=>dataClient.enabled?dataClient.saveAccount(auth.getUser(),preferences):Promise.resolve()),onRegistrationComplete:()=>{history.replaceState(null,'',location.pathname+location.search+'#inicio');route();}});
    auth.subscribe(user=>{
      const entry=$('.google-entry');
      const firstName=accountFirstName(user);
      entry.href=user?'#conta':'#entrar';
      entry.querySelector('img').hidden=!!user;
      entry.querySelector('span').textContent=user?(firstName?`Olá, ${firstName}`:'Meu perfil'):'Entrar com Google';
      entry.setAttribute('aria-label',user?(firstName?`Abrir perfil de ${firstName}`:'Abrir meu perfil'):'Entrar ou cadastrar com Google');
      const accountLabel=$('.nav-account span');
      if(accountLabel)accountLabel.textContent=user?(firstName?`Meu perfil · ${firstName}`:'Meu perfil'):'Meu perfil / Entrar';
      if(user&&auth.consumeGoogleRedirectResult())queueMicrotask(async()=>{
        try {
          const existing=await accountUI.resolveAccount(accountIntent(location.hash));
          if(existing) {
            history.replaceState(null,'',location.pathname+location.search+'#inicio');
            toast(firstName?`Olá, ${firstName}! Seu acesso foi concluído.`:'Seu acesso foi concluído.');
            route();
          } else {
            history.replaceState(null,'',location.pathname+location.search+'#conta');
            accountUI.showRegistrationForm();
          }
        } catch {
          history.replaceState(null,'',location.pathname+location.search+'#conta');
          accountUI.showProfile();
        }
      });
    });
    // Restaura a sessão sem bloquear a vitrine pública. O assinante acima trata
    // o retorno do Google e leva a conta autenticada para a página principal.
    if(authConfigured(config)){
      const arrivingGoogle=new URLSearchParams(location.search).get('entrarGoogle')==='1';
      (arrivingGoogle?withLoading(()=>auth.ready()):auth.ready()).catch(()=>{});
    }
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
    $('#query').value=filters.query; $('#query-clear').hidden=!filters.query;$('.directory-search').classList.toggle('has-query',!!filters.query);
    $('#category').value=filters.category; $('#neighborhood').value=filters.neighborhood; $('#emergency').setAttribute('aria-pressed',String(filters.emergency));
    $('#query').addEventListener('input', event => {
      filters.query=event.target.value;
      $('#query-clear').hidden=!event.target.value;$('.directory-search').classList.toggle('has-query',!!event.target.value);
      renderResults();
    });
    $('#query-clear').addEventListener('click',()=>{filters.query='';$('#query').value='';$('#query-clear').hidden=true;$('.directory-search').classList.remove('has-query');renderResults();$('#query').focus();});
    $('#category').addEventListener('change',event => { filters.category=event.target.value; renderResults(); });
    $('#neighborhood').addEventListener('change',event => { filters.neighborhood=resolveLocality(event.target.value).neighborhood; renderResults(); });
    $('#sort').addEventListener('change',event=>{filters.sort=event.target.value;renderResults();});
    $('#directory-mode').addEventListener('change',event=>{filters.mode=event.target.value;renderResults();});
    $('#emergency').addEventListener('click',() => { filters.emergency=!filters.emergency; $('#emergency').setAttribute('aria-pressed',String(filters.emergency)); renderResults(); });
    $('#clear').addEventListener('click',clearFilters);
    renderResults();renderHome();route();
    if(catalogFallback==='cached')toast('Conexão instável: exibindo a última cópia pública disponível.');
    else if(catalogFallback==='empty')toast('Conexão instável: os contatos serão carregados quando a internet voltar.');
    // Atualiza expirações sem exigir recarregamento; não recria o resultado durante interação.
    setInterval(async () => {
      if(dialog.open||$('#results').contains(document.activeElement))return;
      if(dataClient.enabled) {
        try{await refreshLiveCatalog();}
        catch{toast('Não foi possível atualizar agora. A vitrine anterior foi preservada.');}
      }
      renderResults();renderHome();
    },60000);
  } catch (error) {
    console.error('Falha ao carregar a vitrine:',error.message);
    const startup=$('#startup-status');if(startup){startup.hidden=false;startup.textContent='Não foi possível carregar a vitrine. Verifique sua conexão e recarregue a página.';}
    $('#result-count').textContent='Não foi possível carregar a vitrine.';
    $('#results').innerHTML='<div class="empty"><h3>Vamos tentar de novo?</h3><p>Verifique sua conexão e recarregue a página. Para visualizar a cópia no computador, use o servidor local indicado no README.</p><a class="btn secondary" href="index.html">Recarregar</a></div>';
  }
}
start().finally(finishStartup);
