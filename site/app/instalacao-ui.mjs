// Referências: MDN beforeinstallprompt/appinstalled e guias Apple de apps web.
// A interface não simula instalação nem encaminha para lojas de aplicativos.
const buttonSelector='[data-install-app],#install';
let disposePrevious;

const guides={
  ios:{title:'No iPhone ou iPad',steps:[
    'Abra o Ajuda em Casa no Safari.',
    'Toque em Compartilhar. Dependendo do Safari, essa opção fica no menu da página.',
    'Escolha Adicionar à Tela de Início. Se aparecer Abrir como App, mantenha essa opção ativada.',
    'Confirme em Adicionar. Depois, abra pelo ícone na tela inicial.'
  ]},
  android:{title:'No celular Android',steps:[
    'Abra o Ajuda em Casa no Chrome e toque no menu de três pontos (⋮).',
    'Escolha Instalar app ou Adicionar à tela inicial.',
    'Confirme a opção oferecida pelo navegador. Depois, abra pelo ícone criado no celular.'
  ]},
  desktop:{title:'No computador com Chrome ou Edge',steps:[
    'Procure o ícone de instalação na barra de endereço e clique nele.',
    'Se o ícone não aparecer no Chrome, abra o menu (⋮), depois Transmitir, salvar e compartilhar e Instalar página como app.',
    'No Edge, abra o menu (…), Mais ferramentas, Aplicativos e Instalar este site como um aplicativo. Em algumas versões, Aplicativos aparece diretamente no menu.',
    'Confirme a instalação. Abra o Ajuda em Casa pela lista de aplicativos do computador.'
  ]},
  mac:{title:'No Mac com Safari',steps:[
    'Abra o Ajuda em Casa no Safari.',
    'No menu Arquivo ou no botão Compartilhar, escolha Adicionar ao Dock.',
    'Confirme em Adicionar. Depois, abra o Ajuda em Casa pelo ícone no Dock.'
  ]}
};

function platformOf(navigator) {
  const ua=navigator.userAgent||'',platform=navigator.userAgentData?.platform||navigator.platform||'';
  if(/iPhone|iPad|iPod/i.test(ua)||(/Mac/i.test(platform)&&navigator.maxTouchPoints>1))return 'ios';
  if(/Android/i.test(ua)||/Android/i.test(platform))return 'android';
  if(/Mac/i.test(platform)&&/Safari/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua))return 'mac';
  return 'desktop';
}

const guideMarkup=key=>`<section class="installation-platform"><h3>${guides[key].title}</h3><ol>${guides[key].steps.map(step=>`<li>${step}</li>`).join('')}</ol></section>`;

function instructionsMarkup(platform,intro='') {
  return `<section class="installation-help"><span class="eyebrow">AJUDA EM CASA, SEMPRE POR PERTO</span><h2 id="dialog-title">Instale no seu celular ou computador.</h2><p class="dialog-intro">${intro||'Tenha um ícone do Ajuda em Casa para abrir o site como app. A instalação é feita pelo seu navegador.'}</p>${guideMarkup(platform)}<details class="installation-other"><summary>Como instalar em outro aparelho</summary>${Object.keys(guides).filter(key=>key!==platform).map(guideMarkup).join('')}</details><p class="installation-note">Se o navegador oferecer apenas um atalho, ele abrirá o site. Você pode continuar usando o Ajuda em Casa normalmente pelo navegador.</p></section>`;
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
export function setupInstallation({showInfo}={}) {
  const window=globalThis.window,document=globalThis.document,navigator=globalThis.navigator;
  if(!window||!document||!navigator)return ()=>{};
  if(typeof showInfo!=='function')throw new TypeError('setupInstallation precisa de showInfo(html).');
  disposePrevious?.();
  let deferredPrompt=null,prompting=false,confirmedInstalled=false,disposed=false;
  const displayMode=window.matchMedia?.('(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)');
  const appInUse=()=>navigator.standalone===true||displayMode?.matches===true;
  const platform=platformOf(navigator);

  function refresh() {
    const label=appInUse()?'App em uso':confirmedInstalled?'App instalado':prompting?'Abrindo instalação…':'Instalar app';
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
    const promptEvent=deferredPrompt;deferredPrompt=null;prompting=true;refresh();
    try {
      const result=await promptEvent.prompt();
      const choice=promptEvent.userChoice?await promptEvent.userChoice:result;
      if(disposed)return;
      if(appInUse()||confirmedInstalled)showInstalled();
      else if(choice?.outcome==='accepted')showInfo(instructionsMarkup(platform,'Seu pedido foi aceito. Conclua as etapas que o navegador apresentar e procure o ícone do Ajuda em Casa no aparelho.'));
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
    event.preventDefault();deferredPrompt=event;refresh();
  }
  function installed() {confirmedInstalled=true;deferredPrompt=null;refresh();}
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
