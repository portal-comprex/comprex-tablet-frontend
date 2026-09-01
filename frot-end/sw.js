// Service Worker do app de tablet — só cuida de deixar a PÁGINA (o "casco" do
// app) disponível offline. O envio dos checklists/parte diária é feito pela
// própria página, que guarda tudo numa fila local (IndexedDB) quando não há
// internet e tenta reenviar sozinha quando a conexão volta (ver index.html).
const CACHE_NAME = 'comprex-tablet-v2';
const ARQUIVOS_DO_CASCO = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARQUIVOS_DO_CASCO);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Só intercepta navegação/arquivos do próprio app (GET, mesma origem).
// Chamadas pra API (POST, ou domínio do backend) passam direto pra rede —
// a fila offline delas é tratada em index.html, não aqui.
//
// Estratégia "network-first": com internet, sempre busca a versão mais nova
// na rede (e atualiza o cache) — assim uma atualização do app aparece já no
// primeiro carregamento, sem precisar recarregar duas vezes. Só usa a versão
// guardada em cache quando a rede falhar (offline).
self.addEventListener('fetch', function (evento) {
  const req = evento.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    fetch(req).then(function (respostaRede) {
      if (respostaRede && respostaRede.ok) {
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, respostaRede.clone()); });
      }
      return respostaRede;
    }).catch(function () { return caches.match(req); })
  );
});
