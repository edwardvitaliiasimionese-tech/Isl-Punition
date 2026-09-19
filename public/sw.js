self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Punitions ISL", body: "Nouvelle notification" };
  }

  const title = data.title || "Punitions ISL";
  const options = {
    body: data.body || "Nouvelle notification",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow("/");
    })
  );
});
