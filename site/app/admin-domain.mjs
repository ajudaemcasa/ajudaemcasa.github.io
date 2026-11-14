import {CATEGORIES,validateEvent} from './domain.mjs?v=40b629349f7e';
import {phoneDigits} from './telefone.mjs?v=40b629349f7e';
import {normalizeIdentity,identityKey} from './bloqueios.mjs?v=40b629349f7e';
import {hasContact} from './canais.mjs?v=40b629349f7e';

export const REQUEST_LABELS={novo_cadastro_gratuito:'Cadastro básico',solicitacao_upgrade_pro:'Solicitação PRO',ativacao_destaque_3dias:'Destaque',novo_orcamento_cliente:'Orçamento',interesse_patrocinio_loja:'Patrocínio',nova_vaga_empregador:'Vaga',solicitacao_titularidade:'Titularidade',nova_avaliacao:'Avaliação'};
export function cleanText(raw,max,{required=false}={}) {
  const value=typeof raw==='string'?raw.normalize('NFC').trim():'';
  if((required&&!value)||Array.from(value).length>max||/[<>\p{Cc}\p{Cf}]/u.test(value))throw new Error('Use texto simples dentro do limite indicado.');
  return value;
}
export function editProfessional(original,raw,{allowMissingPhone=false}={}) {
  const name=cleanText(raw.name,160,{required:true}),note=cleanText(raw.note,140),phone=raw.phone?phoneDigits(raw.phone):'';
  const alternative=original.contactOptions?.whatsapp===false && hasContact({...original,phone:''});
  if(!phone && ((!allowMissingPhone&&!alternative) || String(raw.phone||'').trim()))throw new Error('Informe um telefone válido com DDD. Cadastro ativo precisa de um canal de contato autorizado.');
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
  async function commitChange(collection,current,next,{action,reason,publication,claims=[]}={}) {
    const actionId=crypto.randomUUID(),revision=(current?.data.revision??-1)+1,targetId=current?.id||next.id;
    const data={...next,revision,lastActionId:actionId,updatedBy:actor().uid};
    delete data.id;
    const writes=[client.write(collection+'/'+targetId,data,{version:current?.version,create:!current,timestamps:['updatedAt']})];
    for(const claim of claims)writes.push(client.write('publicationClaims/'+claim,{ownerUid:next.ownerUid||'legacy-import',profileId:targetId},{create:true,timestamps:['createdAt']}));
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
      if(current.data.status==='deleted')throw new Error('Este cadastro já foi excluído. O registro foi preservado somente para o histórico.');
      if(!['active','suspended','deleted'].includes(status))throw new Error('Situação inválida.');
      if(status==='active' && current.data.kind==='professional' && !hasContact(payload))throw new Error('Informe um telefone válido com DDD antes de publicar ou reativar o cadastro.');
      if(status==='active' && phoneDigits(payload.phone) && (await client.get('blocks/'+identityKey('phone',payload.phone)))?.data.enabled)throw new Error('Este telefone está bloqueado. Revise o bloqueio antes de publicar.');
      const publication=await client.get('publicCatalog/current');
      if(!publication)throw new Error('O catálogo ainda não foi importado pelo responsável.');
      if(current.data.kind==='professional'&&status==='active'&&phoneDigits(payload.phone)&&publication.data.profiles.some(p=>p.id!==payload.id&&phoneDigits(p.phone)===phoneDigits(payload.phone)&&p.category===payload.category))throw new Error('Este telefone já aparece em outro cadastro do mesmo serviço. Confira a duplicidade antes de salvar.');
      const record={...current.data,payload,status};
      const claim=phoneDigits(payload.phone)?'phone:'+phoneDigits(payload.phone)+':'+payload.category:'';
      const reserved=claim?await client.get('publicationClaims/'+claim):null;
      if(status==='active'&&reserved&&reserved.data.profileId!==payload.id)throw new Error('Telefone e serviço reservados para outro cadastro. Confira a titularidade antes de salvar.');
      publication.data=catalogWithRecord(publication.data,record);
      return commitChange('records',current,record,{action:status==='deleted'?'record.delete':'record.save',reason,publication,claims:status==='active'&&claim&&!reserved?[claim]:[]});
    },
    async setUserStatus(current,status,reason) {
      if(current.data.uid===actor().uid)throw new Error('Você não pode suspender a própria conta neste painel.');
      if(!['active','suspended','deleted'].includes(status))throw new Error('Situação inválida.');
      if(current.data.status==='deleted')throw new Error('Esta conta já foi excluída do app.');
      const data={...current.data,status,...(status==='deleted'?{name:'Usuário excluído'}:{})};
      return commitChange('users',current,data,{action:status==='deleted'?'user.delete':'user.status',reason});
    },
    async saveBlock(kind,raw,enabled,reason) {
      const value=normalizeIdentity(kind,raw),id=identityKey(kind,value);
      if(kind==='email' && value===actor().email.toLowerCase())throw new Error('Você não pode bloquear seu próprio e-mail de administrador.');
      const current=await client.get('blocks/'+id);
      return commitChange('blocks',current,{id,kind,value,enabled:enabled===true},{action:'block.save',reason});
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
      if((await client.get('blocks/'+identityKey('phone',payload.phone)))?.data.enabled)throw new Error('Este telefone está bloqueado para novos cadastros.');
      const publication=await client.get('publicCatalog/current');
      if(!publication)throw new Error('O catálogo ainda não está disponível.');
      if(publication.data.profiles.some(p=>phoneDigits(p.phone)===payload.phone&&p.category===payload.category))throw new Error('Já existe um cadastro com o mesmo telefone e serviço. Trate como titularidade.');
      const claim='phone:'+payload.phone+':'+payload.category,reserved=await client.get('publicationClaims/'+claim);
      if(reserved)throw new Error('Telefone e serviço já reservados. Confira a titularidade.');
      const actionId=crypto.randomUUID(),revision=current.data.revision+1;
      const record={kind:'professional',payload,status:'active',revision:0,lastActionId:actionId,updatedBy:actor().uid};
      const updatedCatalog=catalogWithRecord(publication.data,record);
      await client.commit([
        client.write('records/'+recordId,record,{create:true,timestamps:['updatedAt']}),
        client.write('publicationClaims/'+claim,{ownerUid:current.data.ownerUid,profileId:recordId},{create:true,timestamps:['createdAt']}),
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
