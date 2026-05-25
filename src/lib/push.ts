let _swReg: ServiceWorkerRegistration | null = null;

export async function registerSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    _swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // SW unavailable in this env (dev HTTP etc.)
  }
}

export async function askNotifPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function fireLuciaPush(body: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const title = 'Lucia 💜';
  const opts = {
    body: body.length > 100 ? body.slice(0, 97) + '…' : body,
    tag: 'lucia-notif',
    renotify: true,
  } as NotificationOptions;

  try {
    const reg = _swReg ?? (await navigator.serviceWorker?.ready.catch(() => null));
    if (reg) {
      reg.showNotification(title, opts);
    } else {
      new Notification(title, opts);
    }
  } catch {
    try { new Notification(title, opts); } catch { /* sem suporte */ }
  }
}
