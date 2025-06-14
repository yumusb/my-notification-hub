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
  const notificationData = event.notification.data || {};
  let urlToOpen = notificationData.url || '/';

  // 确保 URL 是绝对路径
  if (urlToOpen.startsWith('/')) {
    urlToOpen = self.location.origin + urlToOpen;
  }

  if (action === "dismiss") {
    console.log("Notification dismissed by user");
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      // 检查是否有匹配的客户端
      const matchingClient = clientList.find(client => {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen);
        return clientUrl.pathname === targetUrl.pathname;
      });
      if (matchingClient) {
        console.log("Found matching client, focusing it");
        // 如果找到匹配的客户端，则聚焦它
        console.log("Focusing client:", matchingClient.url);
        // 确保客户端的 URL 是绝对路径
        return matchingClient.focus();
      } else {
        // 如果没有匹配的客户端，则打开新的窗口
        console.log("Opening new window for notification");
        if (clients.openWindow) {
          console.log("Opening URL:", urlToOpen);
        } else {
          console.warn("clients.openWindow is not available");
        }
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notification was closed", event.notification);
});
