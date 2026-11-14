// Recebe somente projeções públicas já validadas pela busca. Não decide elegibilidade.
// Nenhum nome, telefone ou conteúdo de anúncio é gravado no armazenamento.
const selections=new Map();
const storagePrefix='ajudaemcasa:home-rotation:v1:';
const size=4;

function randomIndex(limit) {
  if(globalThis.crypto?.getRandomValues) {
    const values=new Uint32Array(1);
    // Rejeição evita favorecer índices quando o tamanho não divide 2^32.
    const ceiling=Math.floor(4294967296/limit)*limit;
    do {globalThis.crypto.getRandomValues(values);} while(values[0]>=ceiling);
    return values[0]%limit;
  }
  return Math.floor(Math.random()*limit);
}

function shuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=randomIndex(i+1);[result[i],result[j]]=[result[j],result[i]];}
  return result;
}

function readPrevious(key) {
  try {
    const stored=JSON.parse(globalThis.sessionStorage?.getItem(storagePrefix+key)||'[]');
    return Array.isArray(stored)?stored.filter(id=>typeof id==='string').slice(0,size):[];
  } catch {return [];}
}

function remember(key,ids) {
  try {globalThis.sessionStorage?.setItem(storagePrefix+key,JSON.stringify(ids));}catch{/* Rodízio também funciona em memória. */}
}

function select(items,key,tierOf,force) {
  const available=new Map();
  for(const item of Array.isArray(items)?items:[]) {
    // IDs são a identidade da seleção. O primeiro item evita duplicação de cards.
    if(item&&typeof item.id==='string'&&item.id&&!available.has(item.id))available.set(item.id,item);
  }
  const cached=selections.get(key);
  const tierCounts=[0,1,2].map(tier=>[...available.values()].filter(item=>tierOf(item)===tier).length);
  const requiredTiers=[];
  for(const tier of [0,1,2])requiredTiers.push(...Array(Math.min(tierCounts[tier],size-requiredTiers.length)).fill(tier));
  if(!force&&cached&&cached.ids.length===Math.min(size,available.size)&&cached.tiers.every((tier,index)=>tier===requiredTiers[index])&&cached.ids.every((id,index)=>available.has(id)&&tierOf(available.get(id))===cached.tiers[index])) {
    // Objetos atuais preservam correções públicas sem mudar os lugares da vitrine.
    return cached.ids.map(id=>available.get(id));
  }
  const previous=new Set(cached?.ids||readPrevious(key));
  const chosen=[];
  for(const tier of [0,1,2]) {
    const group=[...available.values()].filter(item=>tierOf(item)===tier);
    // A prioridade entre grupos é estrita. Rodízio acontece dentro de cada grupo.
    const fresh=shuffle(group.filter(item=>!previous.has(item.id)));
    const repeated=shuffle(group.filter(item=>previous.has(item.id)));
    chosen.push(...[...fresh,...repeated].slice(0,size-chosen.length));
    if(chosen.length===size)break;
  }
  const ids=chosen.map(item=>item.id);
  selections.set(key,{ids,tiers:chosen.map(tierOf)});
  remember(key,ids);
  return chosen;
}

/** Máximo de quatro profissionais, sem criar cards para completar uma vitrine vazia. */
export function selectHomeProfiles(profiles,{key='offers',force=false}={}) {
  return select(profiles,'profiles:'+String(key),item=>item.plan==='pro'?0:item.ad?.kind==='agency'?1:2,force);
}

/** Máximo de quatro oportunidades de contratantes/agenciadores já elegíveis. */
export function selectHomeJobs(jobs,{key='jobs',force=false}={}) {
  return select(jobs,'jobs:'+String(key),item=>item.ad?.premium?0:item.ad?.kind==='agency'?1:2,force);
}
