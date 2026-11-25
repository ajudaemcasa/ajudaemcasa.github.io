import {CAREER_SOURCE_HOSTS,isAutomatedVacancy,isPublicAgencyVacancy} from './vagas-publicas.mjs?v=149f22201751';
export const PUBLIC_JOBS_FEED_URL='https://sternplatypus-n8n.cloudfy.live/webhook/ajuda-em-casa-vagas-publicas';
export const PUBLIC_JOBS_FEED_CACHE='ajuda-codex:vagas-publicas:v1';
export function normalizeJobsFeed(feed,now=Date.now()) {
  if(feed?.schemaVersion!==1||!Array.isArray(feed.sources)||feed.sources.length>10)throw new Error('Lista pública de fontes inválida.');
  const sources=[],seen=new Set(),time=+new Date(now),today=new Date(time-3*3600000).toISOString().slice(0,10);
  for(const s of feed.sources) {
    const allowed=['sedepe-petrolina',...CAREER_SOURCE_HOSTS.map(h=>'gupy-'+h)];
    if(!allowed.includes(s?.sourceId)||seen.has(s.sourceId)||s.schemaVersion!==1||s.complete!==true||!Array.isArray(s.jobs)||s.jobs.length>150)throw new Error('Snapshot público incompleto ou duplicado.');
    seen.add(s.sourceId);
    const checked=Date.parse(s.checkedAt);if(!Number.isFinite(checked)||checked>time+300000)throw new Error('Data da consulta inválida.');
    if(time-checked>7*86400000)continue;
    const agency=s.sourceId==='sedepe-petrolina';
    if(agency&&(!/^\d{4}-\d{2}-\d{2}$/.test(s.sourceDate)||s.sourceDate>today||time-Date.parse(s.sourceDate+'T23:59:59-03:00')>7*86400000))continue;
    const jobs=s.jobs.map(j=>{
      if(!isAutomatedVacancy(j)||j.publicSource.managedSourceId!==s.sourceId||!new RegExp('^'+(agency?'sedepe-auto-':s.sourceId+'-')+'[a-z0-9-]+$').test(j.id)||j.title.length<3||j.title.length>120||typeof j.description!=='string'||j.description.length>1500||typeof j.publicName!=='string'||j.publicName.length>120)throw new Error('Anúncio público inválido.');
      if(agency&&j.publicSource.bulletinDate!==s.sourceDate)throw new Error('Data do anúncio não corresponde ao boletim.');
      const expiresAt=new Date((agency?Date.parse(s.sourceDate+'T23:59:59-03:00'):checked)+7*86400000).toISOString();
      return {...j,publicationFormat:'standard',status:'approved',expiresAt,contactAuthorized:false,ownershipVerified:false,intermediation:{totalCents:0,payer:'employer'}};
    });
    if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw new Error('Anúncios repetidos no snapshot.');
    sources.push({...s,jobs});
  }
  return {schemaVersion:1,sources};
}
export function mergeManagedPublicJobs(baseline,feed,now=Date.now()) {
  if(!feed)return baseline;
  const checked=normalizeJobsFeed(feed,now);
  let result=baseline;
  for(const source of checked.sources) {
    const current=result.filter(j=>j.publicSource?.managedSourceId===source.sourceId);
    if(current.some(j=>source.sourceId==='sedepe-petrolina'?j.publicSource.bulletinDate>source.sourceDate:Date.parse(j.publicSource.checkedAt)>Date.parse(source.checkedAt)))continue;
    result=result.filter(j=>{
      if(j.publicSource?.managedSourceId===source.sourceId)return false;
      return !(source.sourceId==='sedepe-petrolina'&&isPublicAgencyVacancy(j)&&j.publicSource.bulletinDate<=source.sourceDate);
    }).concat(source.jobs);
  }
  return result;
}
export async function fetchPublicJobsFeed(url,fetcher=fetch) {
  if(url!==PUBLIC_JOBS_FEED_URL)throw new Error('Fonte pública não configurada.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {
    const r=await fetcher(url,{credentials:'omit',cache:'no-store',signal:controller.signal});
    if(!r.ok)throw new Error('Consulta de vagas públicas indisponível.');
    const text=await r.text();if(text.length>1000000)throw new Error('Resposta pública muito grande.');
    return normalizeJobsFeed(JSON.parse(text));
  } finally {clearTimeout(timer);}
}
