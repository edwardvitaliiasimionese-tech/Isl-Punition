let students=[], punishments=[], config={};
const $=id=>document.getElementById(id);
const today=new Date().toISOString().slice(0,10);

async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const data=await r.json();if(!r.ok)throw Error(data.error||"Erreur");return data}
async function load(){[students,punishments,config]=await Promise.all([api("/api/students"),api("/api/punishments"),api("/api/config")]);render();updateStats();populateClasses()}
function updateStats(){$("studentCount").textContent=students.length;$("punishmentCount").textContent=punishments.length;$("todayCount").textContent=punishments.filter(p=>p.date===today).length}
function populateClasses(){const current=$("classFilter").value;const classes=[...new Set(students.map(s=>s.classe))].sort();$("classFilter").innerHTML='<option value="">Toutes les classes</option>'+classes.map(c=>`<option>${esc(c)}</option>`).join("");$("classFilter").value=current}
function render(){
 let ps=punishments.filter(p=>(`${p.prenom} ${p.nom}`).toLowerCase().includes($("search").value.toLowerCase())&&(!$("classFilter").value||p.classe===$("classFilter").value)&&(!$("typeFilter").value||p.type===$("typeFilter").value));
 const order=$("sort").value, sev={"Exclusion":4,"Avertissement":3,"Retenue":2,"Travail supplémentaire":1,"Autre":0};
 ps.sort((a,b)=>order==="date"?b.date.localeCompare(a.date):order==="severity"?sev[b.type]-sev[a.type]:`${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`,"fr"));
 $("punishments").innerHTML=ps.length?ps.map(p=>`<tr><td><strong>${esc(p.prenom)} ${esc(p.nom)}</strong><br><small>${esc(p.classe)}</small></td><td><span class="type">${esc(p.type)}</span></td><td>${esc(p.motif)}</td><td>${format(p.date)}</td><td>${esc(p.duree||"—")}</td><td class="row-actions"><button onclick="editPunishment(${p.id})">✎</button><button class="danger" onclick="deletePunishment(${p.id})">🗑</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty">Aucune punition trouvée.</td></tr>';
 const filteredStudents=students.filter(s=>(`${s.prenom} ${s.nom}`).toLowerCase().includes($("search").value.toLowerCase())&&(!$("classFilter").value||s.classe===$("classFilter").value));
 $("students").innerHTML=filteredStudents.length?filteredStudents.map(s=>`<div class="student"><div><div class="student-name">${esc(s.prenom)} ${esc(s.nom)}</div><div class="student-class">${esc(s.classe)}</div></div><div><span class="badge">${s.punishment_count}</span> <button onclick="editStudent(${s.id})">✎</button><button class="delete-link" onclick="deleteStudent(${s.id})">🗑</button></div></div>`).join(""):'<div class="empty">Aucun élève.</div>';
}
function format(d){return new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})}
function esc(x){const d=document.createElement("div");d.textContent=x??"";return d.innerHTML}
function openModal(title,html){$("modalTitle").textContent=title;$("modalForm").innerHTML=html;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target===$("modal"))closeModal()}
$("addStudentBtn").onclick=()=>{openModal("Ajouter un élève",studentForm());$("modalForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/students",{method:"POST",body:JSON.stringify(formData())});closeModal();await load();toast("Élève ajouté ✓")}catch(e){toast(e.message,true)}}}
function studentForm(s={}){return `<div class="form-grid"><label>Prénom<input name="prenom" value="${esc(s.prenom)}" required></label><label>Nom<input name="nom" value="${esc(s.nom)}" required></label><label>Classe<input name="classe" value="${esc(s.classe)}" placeholder="Ex. 2A" required></label><button class="primary">Enregistrer</button></div>`}
function formData(){return Object.fromEntries(new FormData($("modalForm")))}
window.editStudent=async id=>{const s=students.find(x=>x.id===id);openModal("Modifier l’élève",studentForm(s));$("modalForm").onsubmit=async e=>{e.preventDefault();try{await api(`/api/students/${id}`,{method:"PUT",body:JSON.stringify(formData())});closeModal();await load();toast("Élève modifié ✓")}catch(e){toast(e.message,true)}}}
window.deleteStudent=async id=>{if(!confirm("Supprimer cet élève et tout son historique ?"))return;await api(`/api/students/${id}`,{method:"DELETE"});await load();toast("Élève supprimé")}
$("addPunishmentBtn").onclick=()=>{openModal("Ajouter une punition",punishmentForm());$("modalForm").onsubmit=savePunishment}
function punishmentForm(p={}){return `<div class="form-grid"><label>Élève<select name="student_id" required>${students.map(s=>`<option value="${s.id}" ${p.student_id==s.id?"selected":""}>${esc(s.prenom)} ${esc(s.nom)} — ${esc(s.classe)}</option>`).join("")}</select></label><label>Type<select name="type"><option ${p.type==="Retenue"?"selected":""}>Retenue</option><option ${p.type==="Avertissement"?"selected":""}>Avertissement</option><option ${p.type==="Exclusion"?"selected":""}>Exclusion</option><option ${p.type==="Travail supplémentaire"?"selected":""}>Travail supplémentaire</option><option ${p.type==="Autre"?"selected":""}>Autre</option></select></label><label>Motif<textarea name="motif" required>${esc(p.motif||"")}</textarea></label><label>Date<input type="date" name="date" value="${p.date||today}" required></label><label>Durée (facultatif)<input name="duree" value="${esc(p.duree||"")}" placeholder="Ex. 1 heure"></label><button class="primary">Enregistrer</button></div>`}
async function savePunishment(e){e.preventDefault();try{await api("/api/punishments",{method:"POST",body:JSON.stringify(formData())});closeModal();await load();toast("Punition ajoutée ✓");}catch(e){toast(e.message,true)}}
window.editPunishment=async id=>{const p=punishments.find(x=>x.id===id);openModal("Modifier la punition",punishmentForm(p));$("modalForm").onsubmit=async e=>{e.preventDefault();try{await api(`/api/punishments/${id}`,{method:"PUT",body:JSON.stringify(formData())});closeModal();await load();toast("Punition modifiée ✓")}catch(e){toast(e.message,true)}}}
window.deletePunishment=async id=>{if(!confirm("Supprimer cette punition ?"))return;await api(`/api/punishments/${id}`,{method:"DELETE"});await load();toast("Punition supprimée")}
["search","classFilter","typeFilter","sort"].forEach(id=>$(id).oninput=render);
function toast(msg,bad=false){const t=$("toast");t.textContent=msg;t.className=bad?"bad":"show";setTimeout(()=>t.className="",2800)}
async function setupPush(){
 if(!("serviceWorker"in navigator)||!("PushManager"in window)){toast("Les notifications Push ne sont pas prises en charge ici.",true);return}
 if(Notification.permission==="denied"){toast("Notifications bloquées dans Chrome.",true);return}
 if(!config.vapidPublicKey){toast("Le serveur Push n'est pas encore configuré.",true);return}
 const permission=await Notification.requestPermission();if(permission!=="granted"){toast("Autorisation refusée.",true);return}
 const reg=await navigator.serviceWorker.register("/sw.js");
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(config.vapidPublicKey)});
 await api("/api/push/subscribe",{method:"POST",body:JSON.stringify(sub)});
 toast("Notifications activées ✓");
}
$("pushBtn").onclick=setupPush;
function urlBase64ToUint8Array(base64){const pad="=".repeat((4-base64.length%4)%4);const raw=atob((base64+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
load().catch(e=>toast(e.message,true));
