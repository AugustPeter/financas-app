// Service Worker para PWA
const CACHE_NAME = 'financas-app-v12';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/tabs.css',
  '/styles/responsive.css',
  '/styles/mobile-optimization.css',
  '/js/utils.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/tabs.js',
  '/js/dashboard.js',
  '/js/transactions.js',
  '/js/investments.js',
  '/js/reports.js',
  '/js/charts.js',
  '/js/supabase-data.js',
  '/js/supabase-config.js',
  '/js/connection-monitor.js',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  // Para requisições de API do Supabase, sempre buscar da rede
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Para arquivos JS, usar network-first (evitar cache desatualizado)
  if (event.request.url.endsWith('.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Atualizar cache com a nova versão
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Se falhar, tentar do cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para outros recursos, usar cache-first
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retornar resposta do cache
        if (response) {
          return response;
        }
        
        // Clone da requisição
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Verificar se a resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone da resposta
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
      .catch(() => {
        // Fallback para offline
        if (event.request.url.includes('.html')) {
          return caches.match('/index.html');
        }
      })
  );
});