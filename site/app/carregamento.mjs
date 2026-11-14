// Uma única tela de espera para tarefas de primeiro plano, sem perder formulários.
const document=globalThis.document;
const pending=new Set(document?.body?.hasAttribute('data-app-loading')?['startup']:[]);
let previousFocus;
function update() {
  if(!document?.body)return;
  const overlay=document.getElementById('app-loading');
  if(!overlay)return;
  const loading=pending.size>0;
  if(loading){
    if(!document.body.hasAttribute('data-app-loading'))previousFocus=document.activeElement;
    document.body.setAttribute('data-app-loading','true');
    document.body.setAttribute('aria-busy','true');overlay.hidden=false;
    if(typeof overlay.showPopover==='function'){
      overlay.setAttribute('popover','manual');
      if(!overlay.matches(':popover-open'))try{overlay.showPopover();}catch{/* A cobertura fixa continua disponível. */}
    }
  }else{
    if(overlay.matches(':popover-open'))overlay.hidePopover();
    overlay.hidden=true;document.body.removeAttribute('data-app-loading');document.body.setAttribute('aria-busy','false');
    const target=previousFocus;previousFocus=null;
    if(target?.isConnected&&!target.disabled&&target.getClientRects().length)target.focus({preventScroll:true});
  }
}
export function beginLoading() {
  const token={};pending.add(token);update();let ended=false;
  return ()=>{if(ended)return;ended=true;pending.delete(token);update();};
}
export function finishStartup(){pending.delete('startup');update();}
export async function withLoading(task){const finish=beginLoading();try{return await task();}finally{finish();}}
