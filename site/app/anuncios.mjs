import {phoneDigits} from './telefone.mjs?v=98736c3d20a4';

export const AD_KINDS = {
  service: {title:'Ofereço serviços',name:'PRO Serviços',tone:'service',symbol:'✦'},
  jobseeker: {title:'Procuro emprego',name:'PRO Talento',tone:'jobseeker',symbol:'◉'},
  employer: {title:'Estou contratando',name:'PRO Contratante',tone:'employer',symbol:'⌂'},
  agency: {title:'Oportunidade via agenciador',name:'Agenciador PRO',tone:'agency',symbol:'▦'}
};
export const AD_DETAIL_LIMITS={compensation:100,benefits:240,workContext:300,schedule:200,availability:120,experience:500};
export function sanitizeAdDetails(raw={}) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error('Detalhes do anúncio inválidos.');
  const clean={};
  for(const [key,max] of Object.entries(AD_DETAIL_LIMITS)) {
    if(raw[key]===undefined || raw[key]==='') continue;
    if(typeof raw[key]!=='string' || Array.from(raw[key]).length>max || /[<>\u0000-\u001f]/.test(raw[key]))
      throw new Error('Detalhe inválido: '+key+' (texto simples, até '+max+' caracteres).');
    clean[key]=raw[key].trim();
  }
  for(const key of ['duties','requirements']) {
    if(raw[key]===undefined) continue;
    if(!Array.isArray(raw[key]) || raw[key].length>8 || raw[key].some(s=>typeof s!=='string' || !s.trim() || Array.from(s).length>160 || /[<>\u0000-\u001f]/.test(s)))
      throw new Error('Informe até 8 itens de texto simples em '+key+', com até 160 caracteres cada.');
    clean[key]=raw[key].map(s=>s.trim());
  }
  return clean;
}
export function hasPremiumAccess(entity,now=Date.now()) {
  const time=+new Date(now);
  if(entity?.status!=='approved' || entity.plan!=='pro' || !(Date.parse(entity.proUntil)>time)) return false;
  if(entity.proAccessSource==='launch_trial' && !(Date.parse(entity.trialStartedAt)<=time)) return false;
  return true;
}
export function premiumLabel(entity,now=Date.now()) {
  if(!hasPremiumAccess(entity,now)) return 'Básico gratuito';
  if(entity.proAccessSource==='launch_trial') return 'PRO em teste';
  if(entity.proAccessSource==='paid') return 'PRO assinante';
  return 'PRO ativo';
}
export function adPresentation(entity,kind='service',now=Date.now()) {
  const model=AD_KINDS[kind] || AD_KINDS.service;
  const premium=hasPremiumAccess(entity,now);
  return {kind:AD_KINDS[kind]?kind:'service',title:model.title,name:model.name,
    symbol:model.symbol,tone:premium?model.tone:'basic',premium,
    accessLabel:premiumLabel(entity,now),
    details:premium?sanitizeAdDetails(entity.adDetails||{}):{}};
}
export function vacancyPresentation(job,advertisers=[],now=Date.now()) {
  const kind=job.publisherType==='agency'?'agency':'employer';
  const advertiser=advertisers.find(a=>a.id===job.advertiserId);
  // O formulário só solicita; somente vínculo administrativo por telefone pode liberar o modelo.
  const valid=job.status==='approved' && job.publicationFormat==='pro' &&
    advertiser?.kind===kind && advertiser.ownershipVerified===true && advertiser.contactAuthorized===true &&
    phoneDigits(job.phone) && phoneDigits(job.phone)===phoneDigits(advertiser.phone);
  return adPresentation(valid?{...advertiser,adDetails:{...job.adDetails,schedule:job.schedule}}:{plan:'free'},kind,now);
}
