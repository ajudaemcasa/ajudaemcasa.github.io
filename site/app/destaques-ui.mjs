import {categoryName,safeMediaUrl} from './domain.mjs?v=563d09a12b14';
import {crownMarkup} from './layout-conexao.mjs?v=563d09a12b14';
import {communityRatingMarkup} from './votos-ui.mjs?v=563d09a12b14';
import {adDetailsMarkup} from './anuncios-ui.mjs?v=563d09a12b14';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function spotlightCardMarkup(p) {
  const pro=p.plan==='pro',boosted=p.featuredDays>0;
  const photo=['depois','cartao','antes','fachada'].map(type=>p.media?.find(m=>m.type===type&&safeMediaUrl(m.url))).find(Boolean);
  const initials=p.name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('');
  const badge=boosted?'Destaque ativo':pro?'Profissional PRO':'Bem avaliado';
  const text=p.description||p.note||'Conheça os serviços e combine os detalhes diretamente com o profissional.';
  const region=p.neighborhoods?.slice(0,2).join(' · ');
  return `<a class="spotlight-card${pro?' spotlight-pro':''}" data-spotlight-profile="${esc(p.id)}" data-spotlight-kind="${boosted?'boost':pro?'pro':'community'}" href="#perfil/${encodeURIComponent(p.id)}"><div class="spotlight-cover${photo?' has-photo':''}"><span class="spotlight-monogram" aria-hidden="true">${esc(initials)}</span>${photo?`<img src="${esc(photo.url)}" alt="${esc(photo.alt||'Trabalho divulgado por '+p.name)}" loading="lazy" width="600" height="340" referrerpolicy="no-referrer">`:''}<span class="spotlight-badge">${pro?crownMarkup():'<span aria-hidden="true">★</span>'}${badge}</span>${boosted?`<small class="spotlight-duration">${p.featuredDays} ${p.featuredDays===1?'dia restante':'dias restantes'}</small>`:''}</div><div class="spotlight-body"><p class="spotlight-service">${esc(categoryName(p.category))}</p><h3>${esc(p.name)}</h3>${communityRatingMarkup(p,true,{actions:false})}${region?`<p class="spotlight-region">⌖ ${esc(region)}</p>`:''}<p class="spotlight-description">${esc(text)}</p><span class="spotlight-cta">Conhecer profissional <span aria-hidden="true">→</span></span></div></a>`;
}

export function initSpotlightMedia(root) {
  for(const img of root.querySelectorAll('.spotlight-cover>img')) {
    const fallback=()=>{img.closest('.spotlight-cover')?.classList.remove('has-photo');img.remove();};
    img.addEventListener('error',fallback,{once:true});
    if(img.complete&&!img.naturalWidth)fallback();
  }
}

export function professionalProfileMarkup(p,{galleryMarkup='',contactMarkup='',managementMarkup=''}={}) {
  const pro=p.plan==='pro',regions=p.neighborhoods||[];
  return `<article class="professional-profile profile-dialog ad-tone-${pro?p.ad.tone:'basic'}">
    <span class="eyebrow">CONHEÇA O PROFISSIONAL</span><h2 id="dialog-title">${esc(p.heading||p.name)}</h2><p class="dialog-intro">${esc(categoryName(p.category))}</p>
    <div class="profile-intro">${pro?`<span class="profile-pro-badge">${crownMarkup()} ${esc(p.ad.accessLabel)}</span>`:''}${p.unverified?'<span class="unverified-badge">Não verificado</span>':''}${p.verified?'<span class="verified">Cadastro conferido pela equipe</span>':''}${p.featuredDays?`<span class="feature-badge">Destaque ativo · ${p.featuredDays} ${p.featuredDays===1?'dia restante':'dias restantes'}</span>`:''}</div>
    ${communityRatingMarkup(p)}${galleryMarkup?`<h3>Trabalhos e apresentação</h3>${galleryMarkup}`:''}
    <h3>Conheça meu trabalho</h3><p class="profile-description">${esc(p.description||p.note||'Converse com o profissional para conhecer seus serviços e disponibilidade.')}</p>
    ${pro?adDetailsMarkup(p.ad,regions.join(' · ')):''}${regions.length?`<h3>Onde atendo</h3><div class="region-tags">${regions.map(n=>`<span>${esc(n)}</span>`).join('')}</div>`:''}
    ${p.emergency?'<p class="notice">Plantão / Emergência 24h informado pelo profissional. Confirme a disponibilidade na conversa.</p>':''}
    <section class="profile-contact-panel"><h3>Converse com ${esc(p.name)}</h3>${p.phone?`<p class="basic-phone">${esc(p.phone)}</p>`:''}<div class="profile-actions">${contactMarkup}${!p.demo?`<button type="button" class="btn secondary" data-share="${esc(p.id)}">Compartilhar perfil ↗</button>`:''}</div><p class="micro">Combine preço, prazo e condições diretamente. PRO é divulgação prioritária, não garantia de qualidade ou contratação.</p></section>
    ${managementMarkup}${p.verified?'<p class="micro">A conferência da equipe não certifica profissão nem garante a execução do serviço.</p>':''}${!pro?'<p class="plan-note"><a href="#pro">Este é seu perfil? Conheça o PRO para apresentar fotos e ampliar sua visibilidade.</a></p>':''}
  </article>`;
}
