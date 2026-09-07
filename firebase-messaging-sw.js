/* Service Worker do Nosso Cantinho: PWA + Firebase Cloud Messaging */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBk67E8baV-i1whhVTWzodyQNE48T8DPis',
  authDomain: 'apprelacionamento-d0906.firebaseapp.com',
  projectId: 'apprelacionamento-d0906',
  storageBucket: 'apprelacionamento-d0906.firebasestorage.app',
  messagingSenderId: '190608228219',
  appId: '1:190608228219:web:5215badc045d9ddc6ac7de'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Nosso Cantinho ❤️';
  const body = payload.notification?.body || payload.data?.body || 'Há uma novidade no Cantinho.';
  const url = payload.data?.url || './';

  self.registration.showNotification(title, {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: payload.data?.tag || 'nosso-cantinho',
    renotify: true,
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
