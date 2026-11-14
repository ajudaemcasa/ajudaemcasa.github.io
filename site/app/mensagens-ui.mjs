import {beginLoading} from './carregamento.mjs?v=77f496c8aac1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function createMessagesUI({service,auth,showView}) {
  let generation=0,rows=[];
  async function open() {
    const finishLoading=beginLoading();
    const version=++generation,uid=auth.getUser()?.uid;
    showView('<section><span class="eyebrow">SUA CAIXA PRIVADA</span><h2 id="dialog-title">Minhas mensagens</h2><p role="status">Carregando mensagens…</p></section>');
    try {
      const result=await service.list();
      if(version!==generation||auth.getUser()?.uid!==uid||location.hash!=='#mensagens')return;
      rows=result;
      showView(`<section class="inbox-view"><span class="eyebrow">SUA CAIXA PRIVADA</span><h2 id="dialog-title">Minhas mensagens</h2><p>Leia e responda por aqui. As mensagens ficam no site; nenhum aviso por e-mail é enviado automaticamente.</p><button class="btn secondary" type="button" data-inbox-refresh>Atualizar mensagens</button>${rows.length?`<p class="micro">${rows.length} mensagens carregadas · até 100 enviadas e 100 recebidas por consulta</p>`:'<p class="notice">Você ainda não tem mensagens. Quem encontrar seu anúncio poderá conversar com você por esta caixa.</p>'}<div class="inbox-list">${rows.map(({id,data:d})=>`<article class="inbox-message"><span class="eyebrow">${d.senderUid===uid?'VOCÊ ENVIOU':'VOCÊ RECEBEU'}</span><h3>${esc(d.senderName)}</h3><small>${esc(new Date(d.createdAt).toLocaleString('pt-BR'))}</small><p class="message-body">${esc(d.text)}</p><button class="btn secondary" type="button" data-message-reply="${esc(id)}">Responder nesta conversa</button></article>`).join('')}</div></section>`);
    } catch(error) {if(version===generation&&location.hash==='#mensagens')showView(`<h2 id="dialog-title">Não foi possível abrir as mensagens</h2><p role="alert">${esc(error.message)}</p><button class="btn secondary" type="button" data-inbox-refresh>Tentar novamente</button>`);}
    finally {finishLoading();}
  }
  function composer(profile,original) {
    generation++;
    showView(`<section><span class="eyebrow">CONTATO PELO AJUDA EM CASA</span><h2 id="dialog-title">${original?'Responder mensagem':'Enviar mensagem'}</h2><p>${original?'A resposta será entregue à outra pessoa desta conversa.':`Para ${esc(profile.name||profile.publicName||profile.title)}. Seu telefone e e-mail não são enviados automaticamente nesta mensagem.`}</p><form class="form-grid" data-site-message><div class="field full"><label for="site-message">Sua mensagem</label><textarea id="site-message" name="message" required maxlength="1500" rows="5" placeholder="Apresente o serviço que precisa e combine os detalhes."></textarea></div><label class="check full"><input type="checkbox" required><span>Concordo com o envio desta mensagem à pessoa que receberá o contato. Não incluirei senhas ou dados de pagamento.</span></label><p class="form-status full" role="status"></p><button class="btn primary full" type="submit">Enviar pelo site</button></form><p class="micro">A pessoa precisa acessar a caixa no site para ler. Para contato por e-mail ou WhatsApp, use o canal público correspondente, quando autorizado.</p></section>`);
    const form=document.querySelector('[data-site-message]');
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(form.dataset.busy==='true'||!form.reportValidity())return;
      const finishLoading=beginLoading();
      form.dataset.busy='true';const button=form.querySelector('button'),status=form.querySelector('[role=status]');button.disabled=true;button.textContent='Enviando…';status.textContent='Enviando sua mensagem…';
      try {
        if(original)await service.reply(original,form.elements.message.value);else await service.send(profile,form.elements.message.value);
        status.textContent='Mensagem entregue à caixa privada no site.';button.textContent='Mensagem enviada';form.elements.message.disabled=true;
      } catch(error){status.textContent=error.message;button.disabled=false;button.textContent='Tentar enviar novamente';}
      finally{form.dataset.busy='false';finishLoading();}
    });
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-inbox-refresh'))open();
    if(button.dataset.messageReply){const original=rows.find(r=>r.id===button.dataset.messageReply);if(original)composer(null,original);}
  });
  auth.subscribe(()=>{generation++;rows=[];});
  return {open,compose:profile=>composer(profile)};
}
