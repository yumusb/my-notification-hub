self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener('pushsubscriptionchange', async event => {
  console.log('Push subscription changed');

  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(newSub => {
        // 发送新订阅给服务器更新
        return fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSub),
        });
      })
  );
});


self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === "granted")) {
    return;
  }

  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (e) {
    console.error("Push data JSON parse error:", e);
  }

  const title = data.title || "新消息";
  const body = data.body || "你有一条新消息";
  const icon = data.icon || "/icon.png";
  const badge = data.badge || "/badge.png";

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: data.tag || "default-tag",
    data: {
      url: data.url,
      timestamp: Date.now(),
    },
    actions: data.actions || [
      {
        action: "open",
        title: "查看 👀",
        // emoji 不支持直接作为 icon 字段，但可以放在标题里表现
      },
      {
        action: "dismiss",
        title: "忽略 ❌",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const urlToOpen = event.notification.data?.url || "/";

  if (action === "dismiss") {
    console.log("Notification dismissed by user");
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notification was closed", event.notification);
});
