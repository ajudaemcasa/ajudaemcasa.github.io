export function createMessagesService(client,auth) {
  const user=()=>{const u=auth.getUser();if(!u?.emailVerified)throw new Error('Entre com Google para enviar ou ler mensagens.');return u;};
  async function storeMessage(id,data) {
    const limit=await client.get('messageLimits/'+data.senderUid);
    if(limit && Date.now()-Date.parse(limit.data.lastSentAt)<30000)throw new Error('Aguarde 30 segundos entre mensagens para evitar envios repetidos.');
    await client.commit([
      client.write('messages/'+id,data,{create:true,timestamps:['createdAt']}),
      client.write('messageLimits/'+data.senderUid,{uid:data.senderUid,lastMessageId:id},{version:limit?.version,create:!limit,timestamps:['lastSentAt']}),
    ]);
  }
  return Object.freeze({
    async list() {
      const u=user(),groups=await Promise.all([client.find('messages','recipientUid',u.uid),client.find('messages','senderUid',u.uid)]);
      return [...new Map(groups.flat().map(d=>[d.id,d])).values()].sort((a,b)=>String(b.data.createdAt).localeCompare(String(a.data.createdAt)));
    },
    async send(profile,text) {
      const u=user(),message=String(text||'').trim();
      if(!profile?.contactRef||profile.contactOptions?.site!==true)throw new Error('Este perfil ainda não recebe mensagens pelo site.');
      if(!message||Array.from(message).length>1500||/[<>\p{Cc}\p{Cf}]/u.test(message.replace(/[\n\r\t]/g,'')))throw new Error('Escreva uma mensagem em texto simples, com até 1.500 caracteres.');
      const id=crypto.randomUUID();
      await storeMessage(id,{profileId:profile.id,recipientUid:profile.contactRef,senderUid:u.uid,senderName:u.name||'Usuário',text:message,state:'new'});
      return {id,stored:true};
    },
    async reply(original,text) {
      const u=user(),body=String(text||'').trim();
      if(!body||Array.from(body).length>1500||/[<>\p{Cc}\p{Cf}]/u.test(body.replace(/[\n\r\t]/g,'')))throw new Error('Escreva uma resposta em texto simples, com até 1.500 caracteres.');
      if(![original.data.senderUid,original.data.recipientUid].includes(u.uid))throw new Error('Esta conversa não pertence à sua conta.');
      const id=crypto.randomUUID(),recipientUid=u.uid===original.data.senderUid?original.data.recipientUid:original.data.senderUid;
      await storeMessage(id,{profileId:original.data.profileId,recipientUid,senderUid:u.uid,senderName:u.name||'Usuário',text:body,state:'new',replyTo:original.id});
      return {id,stored:true};
    }
  });
}
