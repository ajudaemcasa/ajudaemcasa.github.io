// Recebe apenas projeções públicas de searchProfiles: plano e prazo já conferidos.
// Guarda somente IDs para rodízio; pagamento nunca altera a nota da comunidade.
export const SPOTLIGHT_MIN_VOTES=3;
export const SPOTLIGHT_MIN_SCORE=4;
const cache=new Map();
const prefix='ajudaemcasa:spotlight:v1:';
const priority=p=>p.featuredDays>0||p.plan==='pro';
export const communitySpotlight=p=>p.rating?.kind==='community'&&p.rating.count>=SPOTLIGHT_MIN_VOTES&&p.rating.score>=SPOTLIGHT_MIN_SCORE;

function previousIds(key) {
  try {const ids=JSON.parse(globalThis.sessionStorage?.getItem(prefix+key)||'[]');return Array.isArray(ids)?ids.filter(id=>typeof id==='string').slice(0,4):[];}
  catch {return [];}
}
function random() {
  if(globalThis.crypto?.getRandomValues){const n=new Uint32Array(1);globalThis.crypto.getRandomValues(n);return n[0]/4294967296;}
  return Math.random();
}
function shuffled(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function selectSpotlightProfiles(profiles,{key='home',force=false}={}) {
  const available=new Map();
  for(const p of profiles||[])if(p?.id&&!p.demo&&(p.adType||'service')==='service'&&(priority(p)||communitySpotlight(p))&&!available.has(p.id))available.set(p.id,p);
  const items=[...available.values()];
  // Mudanças públicas relevantes invalidam a seleção, sem rodar a cada renderização.
  const signature=JSON.stringify(items.map(p=>[p.id,p.plan,p.featuredDays||0,p.rating?.score||0,p.rating?.count||0]).sort((a,b)=>a[0].localeCompare(b[0])));
  const old=cache.get(key);
  if(!force&&old?.signature===signature)return old.ids.map(id=>available.get(id));
  const previous=new Set(old?.ids||previousIds(key));
  const rotate=group=>[...shuffled(group.filter(p=>!previous.has(p.id))),...shuffled(group.filter(p=>previous.has(p.id)))];
  const boosted=rotate(items.filter(p=>p.featuredDays>0));
  const pro=rotate(items.filter(p=>p.plan==='pro'&&!p.featuredDays));
  const paid=[...boosted,...pro];
  const rated=items.filter(p=>!priority(p)&&communitySpotlight(p));
  const chooseRated=group=>{
    // Melhor nota primeiro. Rodízio entre notas empatadas; não entre qualidades distintas.
    const scores=[...new Set(group.map(p=>p.rating.score))].sort((a,b)=>b-a);
    return scores.flatMap(score=>rotate(group.filter(p=>p.rating.score===score)));
  };
  const chosen=paid.slice(0,rated.length?3:4);
  chosen.push(...chooseRated(rated).slice(0,4-chosen.length));
  if(chosen.length<4)chosen.push(...paid.slice(chosen.filter(priority).length,chosen.filter(priority).length+4-chosen.length));
  const ids=chosen.map(p=>p.id);cache.set(key,{signature,ids});
  try {globalThis.sessionStorage?.setItem(prefix+key,JSON.stringify(ids));}catch{/* Rodízio em memória continua disponível. */}
  return chosen;
}
