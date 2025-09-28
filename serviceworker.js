// Versionsnummer des Caches. Erhöhe diese, wenn du neue Dateien hast
const CACHE_NAME = 'superball-v1.0.4'; 

// Liste der Dateien, die gecached werden müssen (Offline-Fähigkeit)
const urlsToCache = [
    './', // Wichtig: Für den Root-Pfad
    'index.html',
    'style.css',
    'script.js',
    // GLB-Modelle für die Auswahl
    'superball.glb',
    'superball_w.glb',
    'superball_t.glb',
    // THREE.js Bibliotheken (von CDN, wird aber gecached)
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    // Sounds (falls vorhanden)
    'sounds/background_music.mp3',
    'sounds/schade.mp3',
    // Icons (wie im Manifest definiert)
    'icons/fav.png',
    'icons/fav.png',
    'icons/fav.png',
    'icons/fav.png'
];


// INSTALLIEREN des Service Workers und Cachen aller statischen Dateien
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installiere und cache statische Assets');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Das Caching schlägt fehl, wenn eine Datei in urlsToCache nicht gefunden wird
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Aktiviert den Service Worker sofort
            .catch((error) => {
                console.error('[Service Worker] Caching-Fehler:', error);
            })
    );
});


// AKTIVIEREN des Service Workers und Löschen alter Caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Aktiviert und bereinigt alte Caches');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Lösche alle Caches, die nicht in der Whitelist sind
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


// FETCH-EVENT: Abfangen von Anfragen und Bereitstellen von gecachten Assets
self.addEventListener('fetch', (event) => {
    // Wenn die Anfrage nicht GET ist, ignoriere sie
    if (event.request.method !== 'GET') return;
    
    // Netzwerk-Fallback-Strategie: Zuerst Cache, dann Netzwerk
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Wenn im Cache, liefere die Cache-Antwort
                if (response) {
                    return response;
                }
                
                // Ansonsten versuche, die Datei vom Netzwerk zu holen
                return fetch(event.request).catch(() => {
                    // Fallback für den Offline-Modus (optional)
                    // Wenn z.B. nur die index.html gecached werden soll
                });
            })
    );
});