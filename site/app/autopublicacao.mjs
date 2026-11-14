import {validateEvent} from './domain.mjs?v=77f496c8aac1';
import {contactChoices} from './canais.mjs?v=77f496c8aac1';
import {phoneDigits} from './telefone.mjs?v=77f496c8aac1';

export function automaticPublication(raw,user) {
  const event=validateEvent(raw),d=event.data;
  if(!user?.emailVerified)throw new Error('Entre com Google antes de publicar.');
  if(!['novo_cadastro_gratuito','nova_vaga_empregador'].includes(event.type))throw new Error('Este pedido não é uma publicação básica.');
  if(d.publishContact!==true || !d.contactOptions)throw new Error('Autorize a publicação e escolha seus canais de contato.');
  const contactOptions=contactChoices(d.contactOptions,user.email);
  if(contactOptions.email && d.email!==user.email)throw new Error('O e-mail de contato deve ser o da conta Google conectada.');
  const id='cadastro-'+event.eventId;
  const contact={phone:contactOptions.whatsapp?phoneDigits(d.phone):'',email:contactOptions.email?user.email:'',contactOptions,contactRef:user.uid,contactAuthorized:true};
  const kind=event.type==='novo_cadastro_gratuito'?'professional':'vacancy';
  const payload=kind==='professional'?{
    id,name:d.entityType==='company'?d.legalName:d.name,entityType:d.entityType||'person',...(d.entityType==='company'?{legalName:d.legalName}:{}),
    ...contact,category:d.category,status:'approved',plan:'free',demo:false,verified:false,ownershipVerified:false,registrationSource:'self',adType:d.adType||'service',note:d.note||'',neighborhoods:d.neighborhood?[d.neighborhood]:[],media:[],createdAt:event.createdAt
  }:{id,title:d.title,publicName:d.publisherType==='agency'?d.agencyName:d.name,...contact,category:d.category,description:d.description,neighborhood:d.neighborhood,schedule:d.schedule,status:'approved',publisherType:d.publisherType||'employer',publicationFormat:'standard',...(d.intermediation?{intermediation:d.intermediation}:{}),createdAt:Date.parse(event.createdAt),expiresAt:Date.parse(event.createdAt)+30*86400000};
  // Uma publicação por pessoa/serviço; WhatsApp também reserva telefone/serviço.
  const claims=['owner:'+user.uid+':'+kind+':'+d.category];
  if(contact.phone)claims.push('phone:'+contact.phone+':'+d.category);
  return {event,id,kind,payload,claims};
}

export function createPublicationService(client,auth) {
  return Object.freeze({
    async publish(raw) {
      await auth.ready();const user=auth.getUser(),p=automaticPublication(raw,user);
      const previous=await client.get('requests/'+p.event.eventId);
      if(previous?.data.status==='published' && previous.data.ownerUid===user.uid)return {ok:true,published:true,eventId:p.event.eventId,profileId:p.id};
      if(previous)throw new Error('Este protocolo já foi recebido. Acompanhe pelo seu perfil ou crie uma nova publicação com os canais autorizados.');
      for(const id of p.claims)if(await client.get('publicationClaims/'+id))throw new Error('Já existe cadastro com esta conta/serviço ou telefone/serviço. Use a atualização ou o pedido de titularidade; não crie uma duplicata.');
      for(let attempt=0;attempt<3;attempt++) {
        const [catalog,settings]=await Promise.all([client.get('publicCatalog/current',{publicRead:true}),client.get('settings/site',{publicRead:true})]);
        if(!settings?.data.registrationOpen)throw new Error('As publicações estão pausadas. Tente novamente mais tarde.');
        const actionId=crypto.randomUUID(),key=p.kind==='professional'?'profiles':'vacancies';
        const request={ownerUid:user.uid,ownerEmail:user.email,event:p.event,status:'published',revision:0,lastActionId:actionId};
        const record={kind:p.kind,ownerUid:user.uid,payload:p.payload,status:'active',revision:0,lastActionId:actionId,updatedBy:user.uid};
        const publication={...catalog.data,[key]:[...catalog.data[key],p.payload],revision:catalog.data.revision+1,lastActionId:actionId};
        try {
          await client.commit([
            client.write('records/'+p.id,record,{create:true,timestamps:['updatedAt']}),
            client.write('requests/'+p.event.eventId,request,{create:true,timestamps:['createdAt','updatedAt']}),
            ...p.claims.map(id=>client.write('publicationClaims/'+id,{ownerUid:user.uid,profileId:p.id},{create:true,timestamps:['createdAt']})),
            client.write('publicCatalog/current',publication,{version:catalog.version,timestamps:['updatedAt']}),
            client.write('audit/'+actionId,{actorUid:user.uid,actorEmail:user.email,collection:'requests',targetId:p.event.eventId,recordId:p.id,action:'record.selfpublish',reason:'Publicação básica autorizada pelo anunciante autenticado com Google.',revision:0},{create:true,timestamps:['createdAt']}),
          ]);
          return {ok:true,published:true,eventId:p.event.eventId,profileId:p.id};
        } catch(error) {
          if(![409,412].includes(error.code)||attempt===2)throw error;
        }
      }
    }
  });
}
