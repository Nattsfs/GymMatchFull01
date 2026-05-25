// Service Worker — Lucia push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Lucia 💜', {
      body: data.body ?? '',
      tag: 'lucia-notif',
      renotify: true,
      data: { url: '/chat/lucia' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('/chat/lucia', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === target && 'focus' in c) return c.focus();
      }
      return clients.openWindow(target);
    })
  );
});
