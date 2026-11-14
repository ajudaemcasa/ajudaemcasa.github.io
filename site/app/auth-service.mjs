// SDK modular oficial, versão fixa conferida em 2026-11-02:
// https://firebase.google.com/docs/web/alt-setup
// https://firebase.google.com/support/release-notes/js
const FIREBASE_VERSION = '13.2.0';
const RESET_MESSAGE = 'Se houver uma conta para este e-mail, você receberá as instruções para redefinir a senha.';
const MESSAGES = Object.freeze({
  'auth/not-configured': 'O acesso à conta ainda não foi configurado. Tente novamente mais tarde.',
  'auth/configuration-mismatch': 'A configuração de acesso mudou. Recarregue a página para continuar.',
  'auth/unauthorized-domain': 'O domínio deste site ainda precisa ser autorizado no Firebase pelo responsável pelo aplicativo.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.',
  'auth/popup-closed-by-user': 'A janela de acesso foi fechada. Tente novamente quando quiser.',
  'auth/cancelled-popup-request': 'Outra tentativa de acesso está em andamento. Aguarde ou tente novamente.',
  'auth/invalid-credential': 'Não foi possível entrar. Confira seu e-mail e senha.',
  'auth/invalid-login-credentials': 'Não foi possível entrar. Confira seu e-mail e senha.',
  'auth/wrong-password': 'Não foi possível entrar. Confira seu e-mail e senha.',
  'auth/user-not-found': 'Não foi possível entrar. Confira seu e-mail e senha.',
  'auth/weak-password': 'Use uma senha com pelo menos 8 caracteres e no máximo 128, atendendo aos requisitos de segurança da conta.',
  'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.',
  'auth/email-already-in-use': 'Não foi possível cadastrar este e-mail. Tente entrar ou recuperar sua senha.',
  'auth/invalid-email': 'Informe um e-mail válido (até 180 caracteres).',
  'auth/invalid-name': 'Informe seu nome completo, com nome e sobrenome (até 100 caracteres).',
  'auth/missing-password': 'Informe sua senha.',
  'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  'auth/user-disabled': 'Não foi possível acessar esta conta. Procure o atendimento.',
  'auth/operation-not-allowed': 'Esta forma de acesso ainda precisa ser habilitada pelo responsável pelo aplicativo.',
  'auth/operation-not-supported-in-this-environment': 'Este navegador não permite essa forma de acesso. Tente outro navegador.',
  'auth/web-storage-unsupported': 'O navegador não permite guardar a sessão. Habilite o armazenamento deste site.',
  'auth/requires-recent-login': 'Entre novamente na sua conta para continuar.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente para continuar.',
  'auth/invalid-user-token': 'Sua sessão expirou. Entre novamente para continuar.',
  'auth/no-current-user': 'Entre na sua conta para continuar.',
  'auth/account-exists-with-different-credential': 'Não foi possível concluir o acesso. Tente a forma de entrada usada no cadastro.',
  'auth/unknown': 'Não foi possível concluir o acesso. Tente novamente mais tarde.'
});

/** Não retorna mensagens, customData, credenciais ou outros detalhes brutos do SDK. */
export function authErrorMessage(error) {
  return Object.hasOwn(MESSAGES, error?.code) ? MESSAGES[error.code] : MESSAGES['auth/unknown'];
}

function authError(error) {
  const code = Object.hasOwn(MESSAGES, error?.code) ? error.code : 'auth/unknown';
  return Object.assign(new Error(authErrorMessage({ code })), { code });
}
const fail = code => { throw authError({ code }); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const PUBLIC_FIELDS = ['apiKey', 'authDomain', 'projectId', 'appId'];

function privateSettings(value, seen = new WeakSet()) {
  if (typeof value === 'string') return /-----BEGIN[\w\s]*PRIVATE KEY-----|"type"\s*:\s*"service_account"/i.test(value);
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.entries(value).some(([key, item]) =>
    /^(?:serviceaccount|privatekey|privatekeyid|clientemail|clientsecret|password|credential|credentials|accesstoken|refreshtoken)$/i.test(key.replace(/[_-]/g, '')) ||
    item === 'service_account' || privateSettings(item, seen));
}

function publicSettings(config) {
  const auth = config?.auth;
  if (!isRecord(auth) || auth.provider !== 'firebase' || !isRecord(auth.firebase) || privateSettings(auth)) return null;
  const settings = {};
  for (const key of PUBLIC_FIELDS) {
    const value = auth.firebase[key];
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 200 ||
        /[\s<>\p{Cc}\p{Cf}]/u.test(value) || /^(?:your[_-]|replace[_-]|changeme|sua[_-]|seu[_-])/i.test(value)) return null;
    settings[key] = value;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(settings.apiKey) ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(settings.authDomain) ||
      !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(settings.projectId) ||
      !/^\d+:\d+:web:[a-z0-9]+$/i.test(settings.appId)) return null;
  return Object.freeze(settings);
}

export function authConfigured(config) {
  return publicSettings(config) !== null;
}

async function loadFirebaseSdk() {
  try {
    const [app, auth] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)
    ]);
    return { ...app, ...auth };
  } catch {
    fail('auth/network-request-failed');
  }
}

function normalizeEmail(raw) {
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!email || Array.from(email).length > 180 || !/^[^\s@<>\p{Cc}\p{Cf}]+@[^\s@<>\p{Cc}\p{Cf}.]+(?:\.[^\s@<>\p{Cc}\p{Cf}.]+)+$/u.test(email)) fail('auth/invalid-email');
  return email;
}

function normalizeName(raw) {
  const name = typeof raw === 'string' ? raw.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
  if (!name || Array.from(name).length > 100 || /[<>\p{Cc}\p{Cf}]/u.test(raw) ||
      name.split(' ').filter(word => /\p{L}/u.test(word)).length < 2) fail('auth/invalid-name');
  return name;
}

function sanitizeUser(user) {
  if (!user || typeof user.uid !== 'string' || !user.uid || user.isAnonymous === true) return null;
  const text = (value, max) => typeof value === 'string'
    ? Array.from(value.normalize('NFC').replace(/[<>\p{Cc}\p{Cf}]/gu, '').trim()).slice(0, max).join('') : '';
  return Object.freeze({ uid: user.uid, name: text(user.displayName, 100), email: text(user.email, 180), emailVerified: user.emailVerified === true });
}

function waitForInitialState(sdk, auth) {
  if (typeof auth.authStateReady === 'function') return auth.authStateReady();
  if (typeof sdk.authStateReady === 'function') return sdk.authStateReady(auth);
  return new Promise((resolve, reject) => {
    let unsubscribe;
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      if (error) reject(error); else resolve();
    };
    unsubscribe = sdk.onAuthStateChanged(auth, () => finish(), finish);
    // Também encerra stubs que emitem sincronicamente durante a inscrição.
    if (settled) unsubscribe?.();
  });
}

/** loadSdk() retorna os exports planos app/auth; loadedSdk também aceita o objeto diretamente. */
export function createAuthService(config, { loadSdk = loadFirebaseSdk, loadedSdk, navigation = globalThis.window } = {}) {
  const settings = publicSettings(config);
  const listeners = new Set();
  let sdk;
  let auth;
  let initialized = false;
  let readyPromise;
  let unsubscribeAuth;
  let completedGoogleRedirect = false;
  const redirectMode=config?.auth?.flow==='redirect';
  const accessOrigin=settings?'https://'+settings.authDomain:'';
  const googleProvider=()=>{
    const provider=new sdk.GoogleAuthProvider();
    provider.addScope('profile');provider.addScope('email');
    provider.setCustomParameters?.({prompt:'select_account'});
    return provider;
  };
  const redirectGoogle=async()=>{
    await sdk.signInWithRedirect(auth,googleProvider());
    // O documento está saindo. A UI não deve interpretar navegação como login concluído.
    return new Promise(()=>{});
  };

  const getUser = () => initialized ? sanitizeUser(auth.currentUser) : null;
  const notify = listener => {
    if (!listeners.has(listener)) return;
    const user = getUser();
    const signature = JSON.stringify(user);
    if (signature === listener.last) return;
    listener.last = signature;
    try { listener.callback(user); } catch { /* Falha da UI não afeta a sessão nem outros assinantes. */ }
  };
  const publish = () => { for (const listener of [...listeners]) notify(listener); };
  const stopWatching = () => {
    unsubscribeAuth?.();
    unsubscribeAuth = undefined;
  };
  const watch = () => {
    if (initialized && listeners.size && !unsubscribeAuth) {
      unsubscribeAuth = sdk.onAuthStateChanged(auth, publish);
      if (!listeners.size) stopWatching();
    }
  };
  const requireConfigured = () => { if (!settings) fail('auth/not-configured'); };

  function ready() {
    if (!settings) return Promise.reject(authError({ code: 'auth/not-configured' }));
    if (initialized) return Promise.resolve(getUser());
    if (!readyPromise) {
      // O roteador da busca pode limpar a query enquanto o SDK carrega.
      // Capturar o pedido agora preserva o clique feito na origem GitHub.
      const requestedGoogle=redirectMode && navigation?.location?.origin===accessOrigin &&
        new URL(navigation.location.href).searchParams.get('entrarGoogle')==='1';
      readyPromise = (async () => {
        sdk = loadedSdk ?? await loadSdk();
        const name = `ajuda-em-casa-marketplace-auth:${settings.projectId}:${settings.appId}`;
        const existing = sdk.getApps().find(app => app.name === name);
        if (existing && !PUBLIC_FIELDS.every(key => existing.options?.[key] === settings[key])) fail('auth/configuration-mismatch');
        const app = existing || sdk.initializeApp({ ...settings }, name);
        auth = sdk.getAuth(app);
        await sdk.setPersistence(auth, sdk.browserSessionPersistence);
        auth.languageCode = 'pt-BR';
        await waitForInitialState(sdk, auth);
        if(redirectMode && navigation?.location?.origin===accessOrigin) {
          const redirectResult=await sdk.getRedirectResult(auth);
          completedGoogleRedirect=!!redirectResult?.user && !!auth.currentUser;
          const url=new URL(navigation.location.href);
          if(requestedGoogle && !auth.currentUser) {
            url.searchParams.delete('entrarGoogle');
            navigation.history.replaceState(null,'',url.href);
            await redirectGoogle();
          }
        }
        initialized = true;
        watch();
        publish();
        return getUser();
      })().catch(error => {
        stopWatching();
        initialized = false;
        completedGoogleRedirect = false;
        sdk = undefined;
        auth = undefined;
        readyPromise = undefined;
        throw authError(error);
      });
    }
    return readyPromise;
  }

  const operation = async run => {
    try {
      requireConfigured();
      return await run();
    } catch (error) {
      throw authError(error);
    }
  };
  const currentUser = () => {
    if (!getUser()) fail('auth/no-current-user');
    return auth.currentUser;
  };
  const afterSignIn = () => { publish(); return getUser(); };
  const popup = () => {
    const provider = googleProvider();
    // Não acessar credenciais/tokens de UserCredential; somente auth.currentUser.
    return sdk.signInWithPopup(auth, provider).then(afterSignIn);
  };

  return Object.freeze({
    ready,
    getUser,
    consumeGoogleRedirectResult() {
      const completed=completedGoogleRedirect;
      completedGoogleRedirect=false;
      return completed;
    },
    getIdToken(forceRefresh=false) {
      return operation(async()=>{
        await ready();
        return sdk.getIdToken(currentUser(),forceRefresh);
      });
    },
    signInGoogle() {
      if(redirectMode && navigation?.location) {
        return operation(async()=>{
          if(navigation.location.origin!==accessOrigin) {
            const url=new URL(navigation.location.href);
            // O destino deriva do authDomain validado; nenhum token acompanha a URL.
            const target=new URL('/app/'+(url.pathname.endsWith('/painel.html')?'painel.html':'index.html'),accessOrigin);
            target.hash=url.hash||'#entrar';target.searchParams.set('entrarGoogle','1');
            navigation.location.assign(target.href);
            return new Promise(()=>{});
          }
          await ready();
          if(getUser())return getUser();
          return redirectGoogle();
        });
      }
      // Sem await/then antes do SDK quando ready() já terminou: preserva o gesto do clique.
      return operation(() => initialized ? popup() : ready().then(popup));
    },
    signUpEmail(raw) {
      return operation(async () => {
        if(config?.auth?.googleOnly)fail('auth/operation-not-allowed');
        const name = normalizeName(raw?.name);
        const email = normalizeEmail(raw?.email);
        if (typeof raw?.password !== 'string' || raw.password.length < 8 || raw.password.length > 128) fail('auth/weak-password');
        await ready();
        await sdk.createUserWithEmailAndPassword(auth, email, raw.password);
        const user = currentUser();
        await sdk.updateProfile(user, { displayName: name });
        await sdk.sendEmailVerification(user);
        return afterSignIn();
      });
    },
    signInEmail(raw) {
      return operation(async () => {
        if(config?.auth?.googleOnly)fail('auth/operation-not-allowed');
        const email = normalizeEmail(raw?.email);
        if (typeof raw?.password !== 'string' || !raw.password || raw.password.length > 128) fail('auth/missing-password');
        await ready();
        await sdk.signInWithEmailAndPassword(auth, email, raw.password);
        return afterSignIn();
      });
    },
    resetPassword(rawEmail) {
      return operation(async () => {
        if(config?.auth?.googleOnly)fail('auth/operation-not-allowed');
        const email = normalizeEmail(rawEmail);
        await ready();
        try {
          await sdk.sendPasswordResetEmail(auth, email);
        } catch (error) {
          // Mesmo resultado para endereço inexistente, inclusive em projetos sem proteção contra enumeração.
          if (!['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-disabled', 'auth/email-not-found'].includes(error?.code)) throw error;
        }
        return Object.freeze({ message: RESET_MESSAGE });
      });
    },
    refreshUser() {
      return operation(async () => {
        await ready();
        if (!getUser()) return null;
        await sdk.reload(currentUser());
        publish();
        return getUser();
      });
    },
    resendVerification() {
      return operation(async () => {
        await ready();
        const user = currentUser();
        if (!user.emailVerified) await sdk.sendEmailVerification(user);
        return getUser();
      });
    },
    signOut() {
      return operation(async () => {
        await ready();
        await sdk.signOut(auth);
        publish();
        return getUser();
      });
    },
    subscribe(callback) {
      if (typeof callback !== 'function') throw new TypeError('Informe uma função para acompanhar a conta.');
      const listener = { callback, last: undefined };
      listeners.add(listener);
      notify(listener);
      watch();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) stopWatching();
      };
    }
  });
}
