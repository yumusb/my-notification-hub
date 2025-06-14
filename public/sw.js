self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === "granted")) {
    return;
  }

  const data = event.data?.json() ?? {};
  const title = data.title || "新消息";
  const body = data.body || "你有一条新消息";
  const icon = "/icon.png";

  const options = {
    body: body,
    icon: icon,
    tag: data.tag || "default-tag",
    data: {
      url: data.url,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url;

  if (urlToOpen) {
    event.waitUntil(clients.openWindow(urlToOpen));
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});
