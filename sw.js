self.addEventListener("push",event=>{
  let data={title:"Punitions ISL",body:"Nouvelle punition ajoutée."};
  try{data=event.data.json()}catch(e){}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/icon.svg",badge:"/icon.svg",data:data.data||{}}));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list)if("focus"in c)return c.focus();
    return clients.openWindow("/");
  }));
});
