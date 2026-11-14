import {validateEvent} from './domain.mjs?v=a72bd4388845';
import {DataError} from './firestore.mjs?v=a72bd4388845';

export function createRequestService(client,auth) {
  const inFlight=new Set();
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&Object.getPrototypeOf(v)===Object.prototype?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  return Object.freeze({
    async send(raw) {
      const event=validateEvent(raw);
      if(event.data.action==='banner_click')return {ok:true,delivered:true,ignored:true,eventId:event.eventId};
      await auth.ready();const user=auth.getUser();
      if(!user?.emailVerified)throw new DataError('Entre com Google ou confirme seu e-mail antes de enviar.','LOGIN_REQUIRED');
      if(new TextEncoder().encode(JSON.stringify(event)).length>850000)throw new Error('Os anexos juntos ficaram grandes. Reduza as imagens para um total de até 600 KB antes de enviar.');
      if(inFlight.has(event.eventId))throw new Error('Este pedido já está sendo enviado.');
      inFlight.add(event.eventId);
      try {
        const settings=await client.get('settings/site',{publicRead:true});
        if(!settings?.data.registrationOpen)throw new Error('O recebimento de novos pedidos está pausado. Tente novamente mais tarde.');
        const path='requests/'+event.eventId,current=await client.get(path);
        if(current) {
          if(current.data.ownerUid!==user.uid||canonical(current.data.event)!==canonical(event))throw new Error('Este protocolo já foi usado com outros dados. Atualize o formulário.');
        } else await client.commit([client.write(path,{ownerUid:user.uid,ownerEmail:user.email,event,status:'pending',revision:0},{create:true,timestamps:['createdAt','updatedAt']})]);
        return {ok:true,delivered:true,stored:true,deliveryTarget:'admin_queue',eventId:event.eventId};
      } finally {inFlight.delete(event.eventId);}
    }
  });
}
