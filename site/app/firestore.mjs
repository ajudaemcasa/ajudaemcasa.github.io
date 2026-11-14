import {authConfigured} from './auth-service.mjs?v=77f496c8aac1';
import {phoneDigits} from './telefone.mjs?v=77f496c8aac1'; import {accountObjectives} from './objetivos.mjs?v=77f496c8aac1';

export const backendConfigured = config => authConfigured(config) && config?.data?.provider === 'firestore';
export class DataError extends Error {
  constructor(message, code) {super(message); this.code=code;}
}
export function encodeValue(value) {
  if(value===null)return {nullValue:null};
  if(typeof value==='boolean')return {booleanValue:value};
  if(typeof value==='string')return {stringValue:value};
  if(typeof value==='number' && Number.isFinite(value))return Number.isSafeInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  if(Array.isArray(value))return {arrayValue:{values:value.map(encodeValue)}};
  if(value && Object.getPrototypeOf(value)===Object.prototype)return {mapValue:{fields:encodeFields(value)}};
  throw new DataError('O registro contém um valor inválido.','INVALID_DATA');
}
export function encodeFields(data) {return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encodeValue(v)]));}
export function decodeValue(value) {
  if('nullValue' in value)return null;
  if('booleanValue' in value)return value.booleanValue;
  if('stringValue' in value)return value.stringValue;
  if('timestampValue' in value)return value.timestampValue;
  if('integerValue' in value)return Number(value.integerValue);
  if('doubleValue' in value)return value.doubleValue;
  if('arrayValue' in value)return (value.arrayValue.values||[]).map(decodeValue);
  if('mapValue' in value)return decodeFields(value.mapValue.fields||{});
  throw new DataError('O servidor devolveu um formato desconhecido.','INVALID_RESPONSE');
}
export function decodeFields(fields) {return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,decodeValue(v)]));}
const messages={
  400:'O servidor recusou os dados. Confira os campos e tente novamente.',
  401:'Sua sessão expirou. Entre novamente.',
  403:'Sua conta não tem permissão para esta operação.',
  409:'Este registro foi alterado por outra pessoa. Atualize o painel antes de tentar novamente.',
  412:'Este registro mudou. Atualize o painel antes de salvar.',
  429:'O serviço atingiu seu limite temporário. Aguarde e tente novamente.'
};

// REST oficial: ID token somente no cabeçalho; nenhum dado privado vai para cache/URL.
export function createDataClient(config,auth,{fetcher=globalThis.fetch}={}) {
  const enabled=backendConfigured(config);
  const project=config?.auth?.firebase?.projectId;
  const database=`projects/${project}/databases/(default)`;
  const prefix=`${database}/documents`;
  const endpoint=`https://firestore.googleapis.com/v1/${prefix}`;
  const validPath=value=>{
    if(typeof value!=='string'||!value||value.split('/').some(p=>!p||p==='.'||p==='..'||/[\p{Cc}\\]/u.test(p)))throw new DataError('Caminho de registro inválido.','INVALID_PATH');
    return value.split('/').map(encodeURIComponent).join('/');
  };
  async function request(suffix,{method='GET',body,publicRead=false,missing=false}={}) {
    if(!enabled)throw new DataError('A conexão com os dados ainda não foi ativada.','NOT_CONFIGURED');
    const headers={'Content-Type':'application/json'};
    if(!publicRead)headers.Authorization='Bearer '+await auth.getIdToken();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetcher(endpoint+suffix,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
      if(response.status===404&&missing)return null;
      if(!response.ok)throw new DataError(messages[response.status]||'Não foi possível acessar os dados. Tente novamente.',response.status);
      return await response.json();
    } catch(error) {
      if(error instanceof DataError)throw error;
      throw new DataError('Não foi possível confirmar a operação. Verifique sua conexão e atualize antes de repetir.','NETWORK');
    } finally {clearTimeout(timer);}
  }
  const unpack=doc=>doc?{id:doc.name.split('/').at(-1),data:decodeFields(doc.fields||{}),version:doc.updateTime}:null;
  const write=(documentPath,data,{version,create=false,timestamps=[]}={})=>({
    update:{name:prefix+'/'+documentPath,fields:{...encodeFields(data),...Object.fromEntries(['createdAt','updatedAt'].filter(k=>typeof data[k]==='string'&&Number.isFinite(Date.parse(data[k]))).map(k=>[k,{timestampValue:data[k]}]))}},
    ...(version?{currentDocument:{updateTime:version}}:create?{currentDocument:{exists:false}}:{}),
    ...(timestamps.length?{updateTransforms:timestamps.map(fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'}))}:{})
  });
  return Object.freeze({
    enabled,
    get:async(documentPath,options={})=>unpack(await request('/'+validPath(documentPath),{missing:true,...options})),
    documentName:documentPath=>prefix+'/'+validPath(documentPath),
    async list(collection,{pageToken='',pageSize=100,publicRead=false}={}) {
      const params=new URLSearchParams({pageSize:String(Math.min(100,Math.max(1,pageSize)))});
      if(['requests','users','audit'].includes(collection))params.set('orderBy','createdAt desc');
      if(collection==='records')params.set('orderBy','updatedAt desc');
      if(pageToken)params.set('pageToken',pageToken);
      const result=await request('/'+validPath(collection)+'?'+params,{publicRead});
      return {items:(result.documents||[]).map(unpack),nextPageToken:result.nextPageToken||''};
    },
    async find(collection,field,value,{limit=100}={}) {
      validPath(collection);
      if(!['senderUid','recipientUid','ownerUid'].includes(field))throw new DataError('Filtro inválido.','INVALID_QUERY');
      const rows=await request(':runQuery',{method:'POST',body:{structuredQuery:{from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:encodeValue(value)}},limit:Math.min(100,limit)}}});
      return rows.filter(row=>row.document).map(row=>unpack(row.document));
    },
    write,
    commit:async writes=>request(':commit',{method:'POST',body:{writes}}),
    async hasAdminAccess() {
      const user=auth.getUser();
      if(!enabled || !user?.emailVerified)return false;
      const [access,account]=await Promise.all([this.get('adminAccess/'+user.email),this.get('users/'+user.uid)]);
      return auth.getUser()?.uid===user.uid && access?.data.enabled===true && (!account || account.data.status==='active');
    },
    async loadAccount(user) {
      if(!enabled||!user?.uid)return null;
      const current=await this.get('users/'+user.uid);
      return current?.data||null;
    },
    async saveAccount(user,preferences={}) {
      const path='users/'+user.uid,current=await this.get(path);
      if(current && current.data.status!=='active')throw new DataError('Esta conta não está habilitada para usar o app. Procure o atendimento.','SUSPENDED');
      const suppliedPhone=Object.hasOwn(preferences,'phone'),phone=suppliedPhone?phoneDigits(preferences.phone):(current?.data.phone||'');
      if((suppliedPhone||!current)&&!phone)throw new DataError('Informe um WhatsApp brasileiro válido com DDD.','INVALID_PHONE');
      const data={...(current?.data||{}),uid:user.uid,email:user.email,name:user.name||user.email,role:preferences.role||current?.data.role||'contractor',workerGoal:preferences.workerGoal||current?.data.workerGoal||'service',status:current?.data.status||'active',consentVersion:'2026-11-14',revision:current?.data.revision||0,...(phone?{phone}:{}),...(preferences.roles?accountObjectives(preferences):{})};
      await this.commit([write(path,data,{version:current?.version,create:!current,timestamps:current?['updatedAt']:['createdAt','updatedAt']})]);
      return data;
    }
  });
}
