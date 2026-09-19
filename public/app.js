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
$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target===$("modal"))close
