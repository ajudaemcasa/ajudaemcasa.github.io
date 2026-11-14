const PREFIX = 'ajuda-codex:' + new URL(self.registration.scope).pathname + ':';
const BUILD = 'db21b3690644';
const CACHE = PREFIX + BUILD;
const versioned = file => /\.(?:mjs|css)$/.test(file)?file+'?v='+BUILD:file;
const CORE = ['./', 'index.html', 'styles.css', 'bootstrap.mjs', 'app.mjs', 'conta.mjs', 'conta-ui.mjs', 'auth-service.mjs', 'anuncios.mjs', 'anuncios-ui.mjs', 'intermediacao.mjs', 'intermediacao-ui.mjs', 'promocoes.mjs', 'domain.mjs', 'telefone.mjs', 'servicos-extra.mjs', 'avaliacoes.mjs', 'perfil.mjs', 'localidades.mjs', 'localizacao.mjs', 'localizacao-ui.mjs', 'comercial.mjs', 'comercial-ui.mjs', 'n8n-service.mjs', 'manifest.webmanifest', 'icone.svg', 'icone-192.png', 'icone-512.png', 'assets/vizinhanca.svg', 'assets/antes.svg', 'assets/depois.svg', 'assets/cartao.svg'].map(versioned);
CORE.push('assets/google-g.svg');
CORE.push(versioned('firestore.mjs'),versioned('request-service.mjs'));
CORE.push(versioned('bloqueios.mjs'),versioned('avisos.mjs'));
CORE.push(versioned('canais.mjs'),versioned('autopublicacao.mjs'),versioned('mensagens.mjs'));
CORE.push(...['conexao.css','layout-conexao.mjs','instalacao-ui.mjs','vitrine-home.mjs','publicacao-ui.mjs','mensagens-ui.mjs'].map(versioned));
// O primeiro carregamento pode preceder o controle do worker. Estes arquivos são
// públicos e necessários para iniciar a vitrine mesmo já na primeira visita offline.
CORE.push('config.json','profissionais.json','vagas.json','anunciantes.json');
const CORE_URLS = new Set(CORE.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url), scope = new URL(self.registration.scope);
  // Nunca interceptar envios, Telegram, fotos externas ou qualquer URL fora deste aplicativo.
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (['config.json','profissionais.json','vagas.json','anunciantes.json'].includes(relative)) {
    event.respondWith(fetch(request).then(async response => { if (response.ok) { const cache = await caches.open(CACHE); await cache.put(request, response.clone()); } return response; }).catch(async () => (await caches.match(request)) || Response.error()));
    return;
  }
  if (request.mode === 'navigate' && ['', 'index.html'].includes(relative)) {
    event.respondWith(fetch(request).catch(() => caches.match(new URL('index.html', scope).href)));
    return;
  }
  if (CORE_URLS.has(url.href)) event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
