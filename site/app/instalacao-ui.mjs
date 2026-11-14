// Referências: MDN beforeinstallprompt/appinstalled e guias Apple de apps web.
// A interface não simula instalação nem encaminha para lojas de aplicativos.
const buttonSelector='[data-install-app],#install';
let disposePrevious;

const guides={
  ios:{title:'No iPhone ou iPad',steps:[
    'No menu do navegador, toque em Compartilhar → Adicionar à Tela de Início → Adicionar.'
  ]},
  android:{title:'No celular Android',steps:[
    'Abra o menu do navegador (⋮), escolha Instalar app ou Adicionar à tela inicial e confirme.'
  ]},
  desktop:{title:'Neste computador',steps:[
    'No Chrome, use o ícone de instalação da barra de endereço. No Edge, abra Aplicativos → Instalar este site como aplicativo.'
  ]},
  mac:{title:'No Mac com Safari',steps:[
    'No Safari, escolha Arquivo → Adicionar ao Dock e confirme em Adicionar.'
  ]}
};

function platformOf(navigator) {
  const ua=navigator.userAgent||'',platform=navigator.userAgentData?.platform||navigator.platform||'';
  if(/iPhone|iPad|iPod/i.test(ua)||(/Mac/i.test(platform)&&navigator.maxTouchPoints>1))return 'ios';
  if(/Android/i.test(ua)||/Android/i.test(platform))return 'android';
  if(/Mac/i.test(platform)&&/Safari/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua))return 'mac';
  return 'desktop';
}

function browserOf(navigator) {
  const ua=navigator.userAgent||'';
  if(/Edg\//i.test(ua))return 'edge';
  if(/SamsungBrowser\//i.test(ua))return 'samsung';
  if(/Firefox|FxiOS/i.test(ua))return 'firefox';
  if(/Chrome|CriOS|Chromium/i.test(ua))return 'chrome';
  if(/Safari/i.test(ua))return 'safari';
  return 'other';
}

const guideMarkup=key=>`<section class="installation-platform"><h3>${guides[key].title}</h3><ol>${guides[key].steps.map(step=>`<li>${step}</li>`).join('')}</ol></section>`;

function instructionsMarkup(platform,intro='') {
  return `<section class="installation-help"><span class="eyebrow">INSTALAÇÃO NESTE APARELHO</span><h2 id="dialog-title">${platform==='ios'?'Adicione à tela inicial.':'Instale pelo seu navegador.'}</h2><p class="dialog-intro">${intro||(platform==='ios'?'O iPhone e o iPad exigem esta confirmação no menu do navegador.':'O navegador ainda não disponibilizou o convite automático. Se o app já estiver instalado, abra pelo ícone no aparelho.')}</p>${guideMarkup(platform)}</section>`;
}

function labelElement(button,document) {
  let label=button.querySelector('[data-install-label]');
  if(label)return label;
  const plainSpan=[...button.children].find(child=>child.tagName==='SPAN'&&!child.classList.contains('icon'));
  if(plainSpan)label=plainSpan;
  else {
    label=document.createElement('span');
    for(const node of [...button.childNodes])if(node.nodeType===3)node.remove();
    button.insertBefore(label,button.firstChild);
  }
  label.dataset.installLabel='';
  return label;
}

/** Conecta os atalhos existentes e retorna uma função para remover os listeners. */
export function setupInstallation({showInfo,toast=()=>{}}={}) {
  const window=globalThis.window,document=globalThis.document,navigator=globalThis.navigator;
  if(!window||!document||!navigator)return ()=>{};
  if(typeof showInfo!=='function')throw new TypeError('setupInstallation precisa de showInfo(html).');
  disposePrevious?.();
  let deferredPrompt=window.__ajudaInstallPrompt||null,prompting=false,confirmedInstalled=false,disposed=false;
  const displayMode=window.matchMedia?.('(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)');
  const appInUse=()=>navigator.standalone===true||displayMode?.matches===true;
  const platform=platformOf(navigator),browser=browserOf(navigator);

  function refresh() {
    const label=appInUse()?'App em uso':confirmedInstalled?'App instalado':prompting?'Abrindo instalação…':platform==='ios'?'Adicionar à tela inicial':platform==='mac'&&browser==='safari'?'Adicionar ao Dock':'Instalar app';
    for(const button of document.querySelectorAll(buttonSelector)) {
      button.hidden=false;
      labelElement(button,document).textContent=label;
      button.disabled=prompting;
      button.setAttribute('aria-busy',String(prompting));
      button.setAttribute('aria-label',appInUse()?'Ajuda em Casa já está aberto como app':confirmedInstalled?'Instalação confirmada pelo navegador':label);
    }
  }

  function showInstalled() {
    showInfo(`<section class="installation-help"><span class="eyebrow">SEU AJUDA EM CASA</span><h2 id="dialog-title">${appInUse()?'Você já está usando o app.':'O navegador confirmou a instalação.'}</h2><p class="dialog-intro">${appInUse()?'Continue encontrando serviços e oportunidades por aqui.':'Abra o Ajuda em Casa pelo ícone criado na tela inicial, no Dock ou na lista de aplicativos do seu aparelho.'}</p><p class="installation-note">Em outro aparelho, abra o site e escolha Instalar app novamente.</p></section>`);
  }

  async function install(event) {
    const button=event.target.closest?.(buttonSelector);
    if(!button)return;
    event.preventDefault();
    if(prompting)return;
    if(appInUse()||confirmedInstalled){showInstalled();return;}
    if(!deferredPrompt){showInfo(instructionsMarkup(platform));return;}
    const promptEvent=deferredPrompt;deferredPrompt=null;window.__ajudaInstallPrompt=null;prompting=true;refresh();
    try {
      const result=await promptEvent.prompt();
      const choice=promptEvent.userChoice?await promptEvent.userChoice:result;
      if(disposed)return;
      if(appInUse()||confirmedInstalled)showInstalled();
      else if(choice?.outcome==='accepted')toast('Instalação aceita. Aguarde o navegador concluir e abra pelo ícone do Ajuda em Casa.');
      // Ao dispensar o convite nativo, a página permanece na tarefa anterior.
    } catch {
      if(!disposed)showInfo(instructionsMarkup(platform,'O convite automático não abriu. Você também pode instalar pelo menu do navegador, seguindo estas etapas.'));
    } finally {
      prompting=false;
      if(!disposed)refresh();
    }
  }

  function beforePrompt(event) {
    if(typeof event.prompt!=='function'||appInUse()||confirmedInstalled)return;
    event.preventDefault();deferredPrompt=event;window.__ajudaInstallPrompt=event;refresh();
  }
  function installed() {confirmedInstalled=true;deferredPrompt=null;window.__ajudaInstallPrompt=null;refresh();toast('Ajuda em Casa instalado. Abra pelo ícone criado no aparelho.');}
  window.addEventListener('beforeinstallprompt',beforePrompt);
  window.addEventListener('appinstalled',installed);
  document.addEventListener('click',install);
  displayMode?.addEventListener?.('change',refresh);
  refresh();
  const dispose=()=>{
    disposed=true;deferredPrompt=null;
    window.removeEventListener('beforeinstallprompt',beforePrompt);
    window.removeEventListener('appinstalled',installed);
    document.removeEventListener('click',install);
    displayMode?.removeEventListener?.('change',refresh);
    if(disposePrevious===dispose)disposePrevious=undefined;
  };
  disposePrevious=dispose;
  return dispose;
}
