self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Punitions ISL",
      {
        body: data.body || "Nouvelle notification",
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: { url: data.url || "/" }
      }
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientsList => {
        if (clientsList.length > 0) {
          return clientsList[0].focus();
        }
        return clients.openWindow("/");
      })
  );
});
