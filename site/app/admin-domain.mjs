import {CATEGORIES,validateEvent} from './domain.mjs?v=dae75b201aa5';
import {phoneDigits} from './telefone.mjs?v=dae75b201aa5';

export const REQUEST_LABELS={novo_cadastro_gratuito:'Cadastro básico',solicitacao_upgrade_pro:'Solicitação PRO',ativacao_destaque_3dias:'Destaque',novo_orcamento_cliente:'Orçamento',interesse_patrocinio_loja:'Patrocínio',nova_vaga_empregador:'Vaga',solicitacao_titularidade:'Titularidade',nova_avaliacao:'Avaliação'};
export function cleanText(raw,max,{required=false}={}) {
  const value=typeof raw==='string'?raw.normalize('NFC').trim():'';
  if((required&&!value)||Array.from(value).length>max||/[<>\p{Cc}\p{Cf}]/u.test(value))throw new Error('Use texto simples dentro do limite indicado.');
  return value;
}
export function editProfessional(original,raw) {
  const name=cleanText(raw.name,160,{required:true}),note=cleanText(raw.note,140),phone=raw.phone?phoneDigits(raw.phone):'';
  if(raw.phone&&!phone)throw new Error('Informe um telefone válido com DDD.');
  if(!CATEGORIES.some(c=>c.id===raw.category))throw new Error('Escolha um serviço válido.');
  if(original.entityType==='company'&&name!==original.legalName)throw new Error('A alteração de razão social exige conferência específica.');
  // Edição comum não concede plano, selo, titularidade, nota ou autorização.
  return {...original,name,phone,category:raw.category,note};
}
export function catalogWithRecord(catalog,record) {
  const key={professional:'profiles',vacancy:'vacancies',advertiser:'advertisers'}[record.kind];
  if(!key)throw new Error('Tipo de cadastro inválido.');
  const next={...catalog,[key]:(catalog[key]||[]).filter(p=>p.id!==record.payload.id)};
  if(record.status==='active')next[key].push(record.payload);
  return next;
}
export function basicProfileFromRequest(request,{id,ownershipConfirmed=false,publicationConsent=false}={}) {
  const event=validateEvent(request.event);
  if(event.type!=='novo_cadastro_gratuito')throw new Error('Esta solicitação exige um procedimento específico; não é um cadastro básico.');
  if(!ownershipConfirmed||!publicationConsent)throw new Error('Confirme a conferência de titularidade e a autorização de publicação.');
  const d=event.data;
  if(d.entityType!=='company'&&d.name.trim().split(/\s+/u).length<2)throw new Error('Confira o nome e o sobrenome antes de publicar o autocadastro.');
  return {id,name:d.entityType==='company'?d.legalName:d.name,entityType:d.entityType||'person',...(d.entityType==='company'?{legalName:d.legalName}:{}),phone:phoneDigits(d.phone),category:d.category,status:'approved',plan:'free',demo:false,verified:false,ownershipVerified:true,contactAuthorized:true,registrationSource:'self',adType:'service',note:d.note||'',neighborhoods:d.neighborhood?[d.neighborhood]:[],...(d.location&&d.locationConsent?{location:d.location,locationConsent:true}:{}),media:[],createdAt:event.createdAt};
}

export function createAdminService(client,auth) {
  const actor=()=>{const user=auth.getUser();if(!user?.emailVerified)throw new Error('Entre com uma conta confirmada.');return user;};
  const audit=(id,collection,targetId,action,reason,revision)=>({actorUid:actor().uid,actorEmail:actor().email,collection,targetId,action,reason:cleanText(reason,500,{required:true}),revision});
  async function commitChange(collection,current,next,{action,reason,publication}={}) {
    const actionId=crypto.randomUUID(),revision=(current?.data.revision??-1)+1,targetId=current?.id||next.id;
    const data={...next,revision,lastActionId:actionId,updatedBy:actor().uid};
    delete data.id;
    const writes=[client.write(collection+'/'+targetId,data,{version:current?.version,create:!current,timestamps:['updatedAt']})];
    if(publication)writes.push(client.write('publicCatalog/current',{...publication.data,revision:publication.data.revision+1,lastActionId:actionId},{version:publication.version,timestamps:['updatedAt']}));
    writes.push(client.write('audit/'+actionId,audit(actionId,collection,targetId,action,reason,revision),{create:true,timestamps:['createdAt']}));
    await client.commit(writes);
    return {actionId,targetId};
  }
  return Object.freeze({
    async access() {
      const user=actor(),access=await client.get('adminAccess/'+user.email);
      return access?.data.enabled===true;
    },
    list:collection=>client.list(collection),
    async saveRecord(current,payload,reason,status=current.data.status) {
      if(!['active','suspended'].includes(status))throw new Error('Situação inválida.');
      const publication=await client.get('publicCatalog/current');
      if(!publication)throw new Error('O catálogo ainda não foi importado pelo responsável.');
      if(current.data.kind==='professional'&&status==='active'&&phoneDigits(payload.phone)&&publication.data.profiles.some(p=>p.id!==payload.id&&phoneDigits(p.phone)===phoneDigits(payload.phone)&&p.category===payload.category))throw new Error('Este telefone já aparece em outro cadastro do mesmo serviço. Confira a duplicidade antes de salvar.');
      const record={...current.data,payload,status};
      publication.data=catalogWithRecord(publication.data,record);
      return commitChange('records',current,record,{action:'record.save',reason,publication});
    },
    async setUserStatus(current,status,reason) {
      if(current.data.uid===actor().uid)throw new Error('Você não pode suspender a própria conta neste painel.');
      if(!['active','suspended'].includes(status))throw new Error('Situação inválida.');
      return commitChange('users',current,{...current.data,status},{action:'user.status',reason});
    },
    async decideRequest(current,status,reason) {
      if(!['pending','in_progress'].includes(current.data.status))throw new Error('Este pedido já foi concluído. Atualize a lista.');
      if(!['in_progress','rejected','resolved'].includes(status))throw new Error('Decisão inválida.');
      return commitChange('requests',current,{...current.data,status},{action:'request.decide',reason});
    },
    async approveBasic(current,checks,reason) {
      if(current.data.status!=='pending')throw new Error('Este pedido já recebeu uma decisão.');
      const recordId='cadastro-'+current.id;
      const payload=basicProfileFromRequest(current.data,{id:recordId,...checks});
      const publication=await client.get('publicCatalog/current');
      if(!publication)throw new Error('O catálogo ainda não está disponível.');
      if(publication.data.profiles.some(p=>phoneDigits(p.phone)===payload.phone&&p.category===payload.category))throw new Error('Já existe um cadastro com o mesmo telefone e serviço. Trate como titularidade.');
      const actionId=crypto.randomUUID(),revision=current.data.revision+1;
      const record={kind:'professional',payload,status:'active',revision:0,lastActionId:actionId,updatedBy:actor().uid};
      const updatedCatalog=catalogWithRecord(publication.data,record);
      await client.commit([
        client.write('records/'+recordId,record,{create:true,timestamps:['updatedAt']}),
        client.write('requests/'+current.id,{...current.data,status:'published',revision,lastActionId:actionId,updatedBy:actor().uid},{version:current.version,timestamps:['updatedAt']}),
        client.write('publicCatalog/current',{...updatedCatalog,revision:publication.data.revision+1,lastActionId:actionId},{version:publication.version,timestamps:['updatedAt']}),
        client.write('audit/'+actionId,{...audit(actionId,'requests',current.id,'request.publish',reason,revision),recordId},{create:true,timestamps:['createdAt']})
      ]);
    },
    async saveSettings(current,raw,reason) {
      const directoryMessage=cleanText(raw.directoryMessage,180,{required:true});
      return commitChange('settings',current,{...current.data,directoryMessage,registrationOpen:raw.registrationOpen===true},{action:'settings.save',reason});
    }
  });
}
