import {VOTE_REASONS,communityRatingSummary,updateVoteTotals} from './votos.mjs?v=77f496c8aac1';
import {withLoading} from './carregamento.mjs?v=77f496c8aac1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function communityRatingMarkup(profile,compact=false,{actions=true}={}) {
  const r=profile.rating||communityRatingSummary(profile);
  return `<div class="community-rating"><p class="rating${compact?' compact':''}" data-tier="${r.tier}" title="${esc(r.label)}"><span class="rating-stars" aria-hidden="true"><span class="rating-stars-filled">${'★'.repeat(r.tier)}</span><span class="rating-stars-empty">${'☆'.repeat(5-r.tier)}</span></span><strong>${r.score.toLocaleString('pt-BR',{minimumFractionDigits:1})}/5</strong><small>${esc(r.label)}</small></p>${actions&&!profile.demo?`<div class="vote-actions" aria-label="Avaliar ${esc(profile.name)}"><a class="vote-positive" href="#avaliar/${encodeURIComponent(profile.id)}/positive" aria-label="Marcar positivo para ${esc(profile.name)}"><span aria-hidden="true">👍</span> Positivo</a><a class="vote-negative" href="#avaliar/${encodeURIComponent(profile.id)}/negative" aria-label="Marcar negativo para ${esc(profile.name)}"><span aria-hidden="true">👎</span> Negativo</a></div>`:''}</div>`;
}
export function createVotesUI({service,showView,onSaved=()=>{}}) {
  let current,loaded,requestVersion=0;
  const form=()=>document.querySelector('[data-vote-form]');
  function render(profile,selected='') {
    const prior=loaded.vote?.data,side=selected||prior?.side||'';
    showView(`<section data-vote-view><a class="btn secondary" href="#perfil/${encodeURIComponent(profile.id)}">← Voltar ao contato</a><span class="eyebrow">AVALIAÇÃO DA COMUNIDADE</span><h2 id="dialog-title">Como foi com ${esc(profile.name)}?</h2>${communityRatingMarkup({...profile,rating:communityRatingSummary({communityRating:loaded.summary?.data})},false,{actions:false})}<p>Conte sua experiência real de contato ou serviço. Você pode escolher um ou vários motivos. Marcar mais motivos aumenta o peso deste voto, não a quantidade de votos.</p><form class="form-grid" data-vote-form><fieldset class="full vote-side"><legend>O contato foi positivo ou negativo?</legend><label><input type="radio" name="side" value="positive" ${side==='positive'?'checked':''} required> 👍 Positivo</label><label><input type="radio" name="side" value="negative" ${side==='negative'?'checked':''} required> 👎 Negativo</label></fieldset>${Object.entries(VOTE_REASONS).map(([key,reasons])=>`<fieldset class="full vote-reasons" data-vote-side="${key}" ${side===key?'':'hidden disabled'}><legend>${key==='positive'?'O que foi bom?':'O que precisa melhorar?'} · motivos opcionais</legend>${reasons.map(r=>`<label class="check"><input type="checkbox" name="reasons" value="${r.id}" ${prior?.side===key&&prior.reasons.includes(r.id)?'checked':''}><span>${r.label}</span></label>`).join('')}</fieldset>`).join('')}<p class="notice full" data-vote-preview>Escolha uma opção para ver a prévia da nota.</p><label class="check full"><input type="checkbox" name="experience" required><span>Confirmo que esta marcação corresponde a uma experiência real minha.</span></label><p class="form-status full" role="status" aria-live="polite"></p><button type="submit" class="btn primary full">${prior?'Atualizar minha avaliação':'Salvar avaliação'}</button>${prior?'<button type="button" class="btn secondary full" data-vote-remove>Retirar minha avaliação</button>':''}</form><details class="vote-method"><summary>Como calculamos as estrelas?</summary><p>Todos começam em 4/5, com um peso inicial de quatro votos simples. Cada voto positivo aponta para 5; cada negativo, para 1. Os motivos somam peso: contato 10%, responsabilidade 25%, rapidez 15%, serviço bom 30% e excelente 50%; nos negativos: falta de resposta 10%, número inválido 20%, ruim 30%, péssimo 50% e irresponsabilidade 40%.</p><p>Nota = (1.600 + 5 × peso positivo + peso negativo) ÷ (400 + peso positivo + peso negativo). Um voto simples pesa 100. Mostramos uma casa decimal; a cor e as estrelas preenchidas usam a nota arredondada ao inteiro mais próximo. 1 vermelha; 2 laranja; 3 amarela; 4 verde-claro; 5 verde-escuro.</p><p>Uma avaliação por conta e contato, editável ou removível. Não divulga nome nem telefone do avaliador e não suspende automaticamente o profissional. A nota inicial não é avaliação de cliente.</p></details></section>`);
    preview();
  }
  function preview() {
    const f=form();if(!f||!loaded)return;
    const fields=new FormData(f),side=fields.get('side');
    for(const group of f.querySelectorAll('[data-vote-side]')){group.hidden=group.dataset.voteSide!==side;group.disabled=group.hidden;}
    if(!side)return;
    const totals=updateVoteTotals(loaded.summary?.data,loaded.vote?.data,{side,reasons:new FormData(f).getAll('reasons')});
    const next=communityRatingSummary({communityRating:totals});
    f.querySelector('[data-vote-preview]').textContent=`Prévia após salvar: ${next.score.toLocaleString('pt-BR',{minimumFractionDigits:1})}/5 · ${next.count} voto(s). Seu voto anterior será substituído, não duplicado.`;
  }
  async function open(profile,side='') {
    current=profile;const version=++requestVersion;
    showView('<h2 id="dialog-title">Carregando sua avaliação…</h2>');
    try {loaded=await withLoading(()=>service.read(profile.id));if(version===requestVersion)render(profile,side);}
    catch {if(version===requestVersion)showView('<h2 id="dialog-title">Não foi possível abrir as avaliações.</h2><p>Verifique a conexão e tente novamente. Sua avaliação não foi alterada.</p>');}
  }
  async function save(remove=false) {
    const f=form();if(!f||f.dataset.busy==='true'||(!remove&&!f.reportValidity()))return;
    const fields=new FormData(f),value=remove?null:{side:fields.get('side'),reasons:fields.getAll('reasons')};
    f.dataset.busy='true';const status=f.querySelector('[role=status]');
    for(const b of f.querySelectorAll('button'))b.disabled=true;
    try {
      const result=await withLoading(()=>service.save(current.id,value));
      await onSaved(current.id,result.totals);
      loaded=await withLoading(()=>service.read(current.id));render(current);
      form().querySelector('[role=status]').textContent=result.removed?'Avaliação retirada. A nota já foi recalculada.':result.unchanged?'Sua avaliação já estava salva. Nenhum voto foi duplicado.':'Avaliação salva. A nota já foi atualizada.';
    } catch(error){status.textContent=error.code===403?'Não foi possível votar: sua conta precisa estar ativa e não pode avaliar seu próprio cadastro.':error.message;}
    finally{f.dataset.busy='false';for(const b of f.querySelectorAll('button'))b.disabled=false;}
  }
  document.addEventListener('change',e=>{if(e.target.closest('[data-vote-form]'))preview();});
  document.addEventListener('submit',e=>{if(e.target.matches('[data-vote-form]')){e.preventDefault();save();}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-vote-remove]'))save(true);});
  return {open};
}
