const ENDPOINT='https://sternplatypus-n8n.cloudfy.live/webhook/ajuda-em-casa-aviso-google';
// O token é usado somente para validar a identidade no atendimento configurado.
// Não vai à URL, ao Telegram, ao catálogo nem ao armazenamento do navegador.
export function createNotificationService(auth,{fetcher=globalThis.fetch}={}) {
  return {async notify(eventId) {
    if(!/^[\w-]{16,80}$/.test(eventId||''))throw new Error('Protocolo inválido.');
    const idToken=await auth.getIdToken(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,idToken}),credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok)throw new Error('Aviso não confirmado.');
      const result=await response.json();
      if(result.ok!==true||result.delivered!==true||result.eventId!==eventId)throw new Error('Aviso não confirmado.');
      return {delivered:true};
    } catch {throw new Error('O registro está salvo, mas o aviso ao atendimento não foi confirmado. Você pode tentar enviar só o aviso novamente.');}
    finally {clearTimeout(timer);}
  }};
}
