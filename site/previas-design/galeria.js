'use strict';
function sizeFrames(){
  document.querySelectorAll('.live-frame').forEach(frame=>{frame.querySelector('iframe').style.transform=`scale(${frame.clientWidth/1280})`;});
  const phone=document.querySelector('.phone');if(phone.clientWidth)document.querySelector('#mobile-frame').style.transform=`scale(${phone.clientWidth/390})`;
}
new ResizeObserver(sizeFrames).observe(document.body);
sizeFrames();
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.mobile){const option=button.dataset.mobile;document.querySelector('#mobile-frame').src=`opcao-${option}.html`;document.querySelector('#mobile-open').href=`opcao-${option}.html`;document.querySelector('#mobile-title').textContent=`Opção ${option} em celular`;document.querySelector('#mobile-dialog').showModal();sizeFrames();}
  if(button.id==='close-mobile')document.querySelector('#mobile-dialog').close();
  if(button.dataset.choice){const status=document.querySelector('#choice-status');status.hidden=false;status.textContent=`Sua preferência nesta prévia: ${button.dataset.choice}. Para aprovar ou pedir ajustes, envie essa escolha no chat. Este botão não envia dados nem altera o app.`;status.scrollIntoView({behavior:'smooth',block:'center'});}
});
