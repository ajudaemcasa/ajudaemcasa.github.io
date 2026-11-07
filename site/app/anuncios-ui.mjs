import {AD_KINDS,adPresentation} from './anuncios.mjs?v=dae75b201aa5';
import {intermediationMarkup,previewIntermediation} from './intermediacao-ui.mjs?v=dae75b201aa5';
import {intermediationSplit} from './intermediacao.mjs?v=dae75b201aa5';
const adEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function adHeader(ad) {
  return `<div class="ad-topline"><span class="ad-purpose"><span aria-hidden="true">${ad.symbol}</span> ${adEsc(ad.title)}</span><span class="ad-access">${adEsc(ad.accessLabel)}</span></div>`;
}
export function adDetailsMarkup(ad,location='') {
  if(!ad?.premium) return '';
  const d=ad.details||{},work=ad.kind==='service'||ad.kind==='jobseeker';
  const box=(label,value)=>value?`<div class="ad-fact"><dt>${adEsc(label)}</dt><dd>${adEsc(value)}</dd></div>`:'';
  const list=(label,items)=>items?.length?`<section class="ad-section"><h4>${label}</h4><ul>${items.map(s=>`<li>${adEsc(s)}</li>`).join('')}</ul></section>`:'';
  return `<dl class="ad-facts">${box('⌖ Região',location)}${box(work?'◷ Disponibilidade':'◷ Jornada',d.schedule)}${box(ad.kind==='jobseeker'?'R$ Pretensão':ad.kind==='service'?'R$ Valor / orçamento':'R$ Remuneração',d.compensation||'A combinar')}</dl>
    ${d.workContext?`<section class="ad-section"><h4>${work?'Sobre meu trabalho':'Sobre o local de trabalho'}</h4><p>${adEsc(d.workContext)}</p></section>`:''}
    ${list(work?'O que eu faço':'Funções',d.duties)}${list(work?'Condições / preferências':'Requisitos',d.requirements)}
    ${d.experience?`<section class="ad-section"><h4>Experiência</h4><p>${adEsc(d.experience)}</p></section>`:''}
    ${d.benefits?`<section class="ad-section"><h4>${work?'Diferenciais / condições':'Benefícios'}</h4><p>${adEsc(d.benefits)}</p></section>`:''}
    ${d.availability?`<p class="ad-start"><strong>${work?'Disponibilidade':'Início'}:</strong> ${adEsc(d.availability)}</p>`:''}`;
}
export function purposeField() {
  return '<div class="field full"><label for="ad-type">Como você quer se apresentar?</label><select id="ad-type" name="adType"><option value="service">Ofereço serviços · PRO Serviços</option><option value="jobseeker">Procuro emprego · PRO Talento</option></select></div>';
}
export function adEditorFields({job=false}={}) {
  const field=(key,label,max,placeholder='')=>`<div class="field"><label for="ad-${key}">${label}</label><input id="ad-${key}" name="ad-${key}" maxlength="${max}" placeholder="${placeholder}"></div>`;
  return `<fieldset class="full ad-editor"><legend>Seu anúncio organizado · modelo PRO</legend><p class="micro">Campos opcionais. Não publique endereço exato, documentos ou contatos de referências. A equipe confere o conteúdo e o acesso PRO antes de publicar.</p>
    <div class="form-grid">
      ${!job?field('schedule','Jornada / disponibilidade',200,'Dias e horários em que pode trabalhar'):''}
      ${field('compensation',job?'Remuneração oferecida':'Valor / pretensão (opcional)',100,'Ex.: R$ 2.400 por mês ou a combinar')}
      ${field('availability',job?'Previsão de início':'Quando pode começar?',120,'Ex.: a combinar')}
      ${field('benefits',job?'Benefícios (separados da remuneração)':'Diferenciais / condições',240,job?'Ex.: transporte, alimentação':'Ex.: ferramentas próprias')}
      ${field('workContext',job?'Contexto do trabalho':'Sobre o trabalho que procura / oferece',300,job?'Ex.: casa térrea, 3 quartos, sem endereço exato':'Ex.: serviços residenciais e comerciais')}
      <div class="field full"><label for="ad-duties">${job?'Funções da vaga':'Serviços / atividades que realiza'}</label><textarea id="ad-duties" name="ad-duties" rows="3" maxlength="1288" placeholder="Um item por linha · até 8 itens, 160 caracteres cada"></textarea></div>
      <div class="field full"><label for="ad-requirements">${job?'Requisitos profissionais':'Condições / preferências de trabalho'}</label><textarea id="ad-requirements" name="ad-requirements" rows="3" maxlength="1288" placeholder="Um item por linha · use apenas critérios relacionados ao trabalho"></textarea></div>
      ${!job?'<div class="field full"><label for="ad-experience">Experiência e qualificações</label><input id="ad-experience" name="ad-experience" maxlength="500" placeholder="Sem documentos nem telefone de terceiros"></div>':''}
    </div></fieldset><section class="full ad-preview-wrap" aria-label="Prévia do modelo"><p class="ad-preview-notice">PRÉVIA · não é anúncio publicado nem comprovação de PRO</p><div data-ad-preview></div></section>`;
}
export function readAdDetails(fields) {
  const details={};
  for(const key of ['compensation','benefits','workContext','schedule','availability','experience']) {
    const value=String(fields.get('ad-'+key)||'').trim();if(value) details[key]=value;
  }
  for(const key of ['duties','requirements']) {
    const value=String(fields.get('ad-'+key)||'').trim();
    if(value) details[key]=value.split(/\r?\n/).map(s=>s.replace(/^[-•]\s*/,'').trim()).filter(Boolean);
  }
  return details;
}
export function updateAdPreview(form) {
  const node=form?.querySelector('[data-ad-preview]');if(!node)return;
  const fields=new FormData(form),job=form.dataset.event==='nova_vaga_empregador';
  const kind=job?fields.get('publisherType')||'employer':fields.get('adType')||'service';
  const premium=!job||fields.get('requestedFormat')==='pro';
  const feeField=form.querySelector('[data-agency-fee]');
  if(feeField) {
    feeField.hidden=kind!=='agency';
    feeField.querySelector('input').required=kind==='agency';
    feeField.querySelector('input').disabled=kind!=='agency';
  }
  const details=readAdDetails(fields);
  if(job) details.schedule=String(fields.get('schedule')||'');
  let ad;
  try {ad=adPresentation({status:'approved',plan:premium?'pro':'free',proUntil:'9999-01-01',adDetails:details},kind);}
  catch {node.innerHTML='<p class="notice">Ajuste os campos: até 8 itens por lista, 160 caracteres por item, somente texto simples.</p>';return;}
  ad.accessLabel=premium?'Prévia do modelo PRO':'Prévia do básico';
  const title=job?fields.get('title')||'Título da oportunidade':fields.get('name')||'Seu nome';
  const name=kind==='agency'?fields.get('agencyName')||'Nome do agenciador':fields.get('name');
  let fee='';
  if(kind==='agency') {
    try {fee=intermediationMarkup(previewIntermediation(fields));}
    catch {fee='<p class="notice">Informe o preço da intermediação com até duas casas decimais.</p>';}
  }
  node.innerHTML=`<article class="ad-poster ad-tone-${ad.tone}">${adHeader(ad)}<h3>${adEsc(title)}</h3><p class="ad-byline">${adEsc(name)}</p>${premium?adDetailsMarkup(ad,fields.get('area')||'Região aproximada em Petrolina'):`<p>${adEsc(String(fields.get('description')||'Resumo da oportunidade.').slice(0,140))}</p>`}${fee}<span class="ad-preview-cta">${kind==='agency'?'Falar com o agenciador':job?'Tenho interesse na vaga':'Conversar sobre o trabalho'}</span></article>`;
  const agency=form.querySelector('[data-agency-field]');
  if(agency) {agency.hidden=kind!=='agency';agency.querySelector('input').required=kind==='agency';}
}
export function modelsMarkup() {
  const details={schedule:'Segunda a sexta · horários a combinar',compensation:'R$ 2.400 / mês (exemplo)',benefits:'Transporte a combinar, informado separadamente',workContext:'Casa térrea · 3 quartos · ambiente residencial',duties:['Limpeza e organização','Cozinhar o básico','Cuidar das roupas'],requirements:['Experiência nas atividades da vaga','Referências apresentadas em conversa privada'],availability:'A combinar'};
  const models=Object.entries(AD_KINDS).map(([kind,model])=>{
    const work=kind==='service'||kind==='jobseeker';
    const d=work?{schedule:'Disponibilidade a combinar',compensation:'A combinar',duties:['Limpeza e organização','Cuidados com a casa'],experience:'Conte aqui sua experiência profissional.',availability:'A combinar'}:details;
    const ad=adPresentation({status:'approved',plan:'pro',proAccessSource:'launch_trial',trialStartedAt:'2026-01-01',proUntil:'9999-01-01',adDetails:d},kind);
    return `<article class="ad-poster ad-tone-${model.tone}" data-model="${kind}"><span class="ad-example">EXEMPLO FICTÍCIO · NÃO É VAGA REAL</span>${adHeader(ad)}<p class="ad-model-name">${model.name}</p><h3>${work?'Trabalho doméstico':'Vaga · trabalho doméstico'}</h3><p class="ad-byline">${kind==='agency'?'Agência Exemplo':work?'Maria Exemplo':'Contratante Exemplo'}</p>${adDetailsMarkup(ad,'Boa Esperança · Petrolina')}${kind==='agency'?intermediationMarkup({...intermediationSplit(),source:'agency'}):''}${!work?'<p class="micro">Remuneração e horários ilustrativos; condições reais precisam ser informadas e conferidas.</p>':''}<a class="btn primary" href="${kind==='agency'?'#agenciador':kind==='employer'?'#publicar-vaga-pro':kind==='jobseeker'?'#pro-emprego':'#pro'}">Preparar meu anúncio</a></article>`;
  }).join('');
  return `<span class="eyebrow">UM MODELO PARA CADA OBJETIVO</span><h2 id="dialog-title">Anúncios claros. Oportunidades fáceis de entender.</h2><p class="dialog-intro">Cor + nome + informações organizadas. PRO e agenciadores têm seis meses de teste após aprovação. Depois, os recursos extras dependem de assinatura ativa. O básico continua gratuito.</p><div class="model-gallery">${models}</div><article class="ad-poster ad-tone-basic basic-model"><span class="ad-access">Básico gratuito</span><h3>Mesmo objetivo, apresentação simples</h3><p>Nome, contato e resumo em fundo neutro. Sem blocos didáticos, cores PRO ou selo de assinante. Os contatos básicos continuam acessíveis.</p></article><p class="notice">“PRO em teste” e “PRO assinante” identificam o acesso ao plano. Não significam identidade verificada, contratação garantida ou qualidade certificada. Estes exemplos não são inseridos na lista de vagas.</p>`;
}
