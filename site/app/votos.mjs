// Pesos em centésimos de voto; sem nota fabricada de cliente nem privilégio PRO.
export const VOTE_REASONS=Object.freeze({
  positive:Object.freeze([{id:'good_contact',label:'Bom de contato',weight:10},{id:'responsible',label:'Responsável',weight:25},{id:'fast',label:'Atende rápido',weight:15},{id:'good_service',label:'Serviço bom',weight:30},{id:'excellent_service',label:'Serviço excelente',weight:50}].map(Object.freeze)),
  negative:Object.freeze([{id:'no_response',label:'Não responde',weight:10},{id:'invalid_number',label:'Número não funciona',weight:20},{id:'poor_service',label:'Serviço ruim',weight:30},{id:'terrible_service',label:'Serviço péssimo',weight:50},{id:'irresponsible',label:'Sem responsabilidade',weight:40}].map(Object.freeze))
});
export const PRIOR_WEIGHT=400;
export function sanitizeVote(raw) {
  if(!raw||!Object.hasOwn(VOTE_REASONS,raw.side))throw new Error('Escolha Positivo ou Negativo.');
  const reasons=raw.reasons??[];
  if(!Array.isArray(reasons)||reasons.length>5||new Set(reasons).size!==reasons.length||reasons.some(id=>!VOTE_REASONS[raw.side].some(r=>r.id===id)))throw new Error('Marque somente os motivos válidos para esta avaliação.');
  const selected=VOTE_REASONS[raw.side].filter(r=>reasons.includes(r.id));
  return {side:raw.side,reasons:selected.map(r=>r.id),weight:100+selected.reduce((sum,r)=>sum+r.weight,0)};
}
export function voteTotals(summary={}) {
  const result={};
  for(const key of ['positiveWeight','negativeWeight','positiveCount','negativeCount']) {
    const n=summary?.[key]??0;
    if(!Number.isSafeInteger(n)||n<0||n>250000000)throw new Error('Não foi possível conferir os totais das avaliações. Atualize a página.');
    result[key]=n;
  }
  for(const side of ['positive','negative'])if(result[side+'Weight']<result[side+'Count']*100||result[side+'Weight']>result[side+'Count']*250)throw new Error('Totais de avaliação inconsistentes.');
  return result;
}
export function updateVoteTotals(summary,previous,next) {
  const result=voteTotals(summary);
  for(const [vote,sign] of [[previous,-1],[next,1]])if(vote){const clean=sanitizeVote(vote);result[clean.side+'Weight']+=sign*clean.weight;result[clean.side+'Count']+=sign;}
  return voteTotals(result);
}
export function communityRatingSummary(profile={}) {
  const totals=voteTotals(profile.communityRating),count=totals.positiveCount+totals.negativeCount;
  const score=Math.round((PRIOR_WEIGHT*4+totals.positiveWeight*5+totals.negativeWeight)/(PRIOR_WEIGHT+totals.positiveWeight+totals.negativeWeight)*10)/10;
  return {score,count,kind:count?'community':'initial',tier:Math.max(1,Math.min(5,Math.round(score))),label:count?`${count} voto${count===1?'':'s'} da comunidade`:'Nota inicial de 4/5 · nenhum voto ainda',...totals};
}
export function createVotesService(client,auth) {
  const identity=()=>{const u=auth.getUser();if(!u?.emailVerified)throw new Error('Entre com Google para avaliar este contato.');return u;};
  const profileId=id=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error('Contato inválido.');return id;};
  async function read(id) {
    profileId(id);const user=auth.getUser();
    const [summary,vote]=await Promise.all([client.get('publicRatings/'+id,{publicRead:true}),user?.emailVerified?client.get(`contactVotes/${id}/users/${user.uid}`):null]);
    voteTotals(summary?.data);return {summary,vote};
  }
  return Object.freeze({
    read,
    async listPublic() {
      const result=new Map();let pageToken='';
      do {let page;try{page=await client.list('publicRatings',{publicRead:true,pageToken});}catch(error){if(error.code===404&&!pageToken)return result;throw error;}for(const item of page.items)result.set(item.id,voteTotals(item.data));pageToken=page.nextPageToken;}while(pageToken);
      return result;
    },
    async save(id,raw) {
      const user=identity(),next=raw===null?null:sanitizeVote(raw),{summary,vote}=await read(id);
      if(next&&vote&&JSON.stringify(sanitizeVote(vote.data))===JSON.stringify(next))return {totals:voteTotals(summary?.data),unchanged:true};
      if(!next&&!vote)return {totals:voteTotals(summary?.data),unchanged:true};
      const totals=updateVoteTotals(summary?.data,vote?.data,next),path=`contactVotes/${id}/users/${user.uid}`;
      const writes=[next?client.write(path,{uid:user.uid,profileId:id,...next,...(vote?{createdAt:vote.data.createdAt}:{})},{version:vote?.version,create:!vote,timestamps:vote?['updatedAt']:['createdAt','updatedAt']}):{delete:client.documentName(path),currentDocument:{updateTime:vote.version}},
        client.write('publicRatings/'+id,{profileId:id,...totals,revision:(summary?.data.revision??-1)+1},{version:summary?.version,create:!summary,timestamps:['updatedAt']})];
      await client.commit(writes);return {totals,removed:!next};
    }
  });
}
