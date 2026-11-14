// Este módulo e todo o grafo de imports recebem a mesma versão durante o build.
// Um worker antigo não pode devolver JavaScript antigo para essas URLs novas.
// Captura antes do import e das consultas ao banco: o convite pode chegar cedo.
window.addEventListener('beforeinstallprompt',event=>{
  if(typeof event.prompt==='function'){
    event.preventDefault();window.__ajudaInstallPrompt=event;
  }
});
if('serviceWorker' in navigator && location.protocol!=='file:') {
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{/* A vitrine funciona sem worker e offline usa o cache já instalado. */});
}
try {
  await import('./app.mjs?v=40b629349f7e');
} catch {
  const notice=document.getElementById('startup-status');
  if(notice) {
    notice.hidden=false;
    notice.textContent='Não foi possível abrir esta versão do aplicativo. Verifique a conexão e recarregue a página. ';
    const reload=document.createElement('button');
    reload.type='button';reload.className='btn secondary';reload.textContent='Recarregar aplicativo';
    reload.addEventListener('click',()=>location.reload());notice.append(reload);
  }
}
