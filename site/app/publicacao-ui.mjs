const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function publicationContactFields(user) {
  return `<div class="field"><label for="name">Seu nome e sobrenome</label><input id="name" name="name" autocomplete="name" maxlength="100" required value="${esc(user?.name)}"></div><div class="field"><label for="phone">WhatsApp com DDD</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+55 87 99999-9999" maxlength="26" required></div><fieldset class="full" data-contact-choices><legend>Como você quer receber contatos?</legend><label class="check"><input type="checkbox" name="contactWhatsApp" checked><span>WhatsApp · divulgar meu telefone</span></label><label class="check"><input type="checkbox" name="contactEmail" checked><span>E-mail · divulgar meu e-mail Google</span></label><p class="micro">${esc(user?.email)}. O Google não fornece seu telefone nesse acesso. Se desmarcar WhatsApp, você não precisa informar telefone. Se desmarcar os dois canais, receberá mensagens pela caixa do site.</p><p class="notice">Os canais marcados ficarão públicos no anúncio. Mensagens pelo site ficam privadas e são lidas em Meu perfil → Minhas mensagens; não enviamos um e-mail automaticamente.</p></fieldset><label class="check full"><input type="checkbox" name="publishContact" required><span>Autorizo publicar meu anúncio e somente os canais selecionados. Confirmo que os dados são meus ou tenho autorização para divulgar a oportunidade.</span></label>`;
}
export function initPublicationContacts(root) {
  for(const form of root.querySelectorAll('form')) {
    const choice=form.querySelector('[name=contactWhatsApp]'),phone=form.querySelector('[name=phone]');
    if(!choice||!phone)continue;
    const update=()=>{phone.required=choice.checked;phone.disabled=!choice.checked;phone.closest('.field').hidden=!choice.checked;};
    choice.addEventListener('change',update);update();
  }
}
export function readPublicationContacts(form,user) {
  if(!form.querySelector('[data-contact-choices]'))return {};
  return {contactOptions:{email:form.elements.contactEmail.checked,whatsapp:form.elements.contactWhatsApp.checked,site:true},email:form.elements.contactEmail.checked?user?.email||'':'',phone:form.elements.contactWhatsApp.checked?form.elements.phone.value:''};
}
