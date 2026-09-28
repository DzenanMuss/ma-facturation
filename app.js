const KEY="ma_facturation_v1";
const state=JSON.parse(localStorage.getItem(KEY)||'null')||{
company:{name:"Mon entreprise",legal:"",siret:"",vat:"",address:"",zip:"",city:"",email:"",phone:""},
clients:[], invoices:[], seq:1
};
let page="dashboard";
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const euro=n=>(Number(n||0).toFixed(2)).replace(".",",")+" €";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const invoiceNumber=()=>`FA-${String(state.seq).padStart(4,"0")}`;
function shell(html){document.getElementById("content").innerHTML=`<div class="container">${html}</div>`}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});

function render(){
 if(page==="dashboard") dashboard();
 if(page==="clients") clients();
 if(page==="invoices") invoices();
 if(page==="settings") settings();
}
function dashboard(){
 const total=state.invoices.reduce((s,i)=>s+i.total,0), paid=state.invoices.filter(i=>i.status==="Payée").reduce((s,i)=>s+i.total,0);
 shell(`<h2>Tableau de bord</h2><div class="grid">
 <div class="card"><div class="muted">Clients</div><div class="metric">${state.clients.length}</div></div>
 <div class="card"><div class="muted">Factures</div><div class="metric">${state.invoices.length}</div></div>
 <div class="card"><div class="muted">Chiffre facturé</div><div class="metric">${euro(total)}</div></div>
 <div class="card"><div class="muted">Encaissé</div><div class="metric">${euro(paid)}</div></div></div>
 <div class="card"><h3>Dernières factures</h3>${state.invoices.slice(-5).reverse().map(i=>`<p><b>${esc(i.number)}</b> — ${esc(i.clientName)} — ${euro(i.total)} — ${esc(i.status)}</p>`).join("")||'<div class="empty">Aucune facture pour le moment.</div>'}</div>`);
}
function clients(){
 shell(`<div class="actions no-print"><button onclick="newClient()">+ Nouveau client</button></div><div class="card"><h2>Clients</h2>
 ${state.clients.length?`<table><thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Ville</th><th></th></tr></thead><tbody>${state.clients.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${esc(c.city)}</td><td><button class="danger" onclick="delClient('${c.id}')">Supprimer</button></td></tr>`).join("")}</tbody></table>`:'<div class="empty">Aucun client.</div>'}</div>`);
}
function newClient(){
 shell(`<div class="card"><h2>Nouveau client</h2><form id="clientForm" class="formgrid">
 <div class="field"><label>Nom / société *</label><input name="name" required></div><div class="field"><label>Email</label><input name="email" type="email"></div>
 <div class="field"><label>Téléphone</label><input name="phone"></div><div class="field"><label>Adresse</label><input name="address"></div>
 <div class="field"><label>Code postal</label><input name="zip"></div><div class="field"><label>Ville</label><input name="city"></div>
 <div class="field"><label>N° TVA</label><input name="vat"></div><div class="field"><label>SIREN</label><input name="siren"></div>
 <div class="actions full"><button>Enregistrer</button><button type="button" class="secondary" onclick="clients()">Annuler</button></div></form></div>`);
 document.getElementById("clientForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.clients.push({id:crypto.randomUUID(),name:f.get("name"),email:f.get("email"),phone:f.get("phone"),address:f.get("address"),zip:f.get("zip"),city:f.get("city"),vat:f.get("vat"),siren:f.get("siren")});save();clients()};
}
function delClient(id){if(confirm("Supprimer ce client ?")){state.clients=state.clients.filter(c=>c.id!==id);save();clients()}}
function invoices(){
 shell(`<div class="actions no-print"><button onclick="newInvoice()">+ Nouvelle facture</button></div><div class="card"><h2>Factures</h2>
 ${state.invoices.length?`<table><thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Total</th><th>Statut</th><th></th></tr></thead><tbody>${state.invoices.slice().reverse().map(i=>`<tr><td>${esc(i.number)}</td><td>${i.date}</td><td>${esc(i.clientName)}</td><td>${euro(i.total)}</td><td>${esc(i.status)}</td><td><div class="actions"><button onclick="viewInvoice('${i.id}')">Voir</button>${i.status!=="Payée"?`<button onclick="markPaid('${i.id}')">Payée</button>`:""}<button class="danger" onclick="delInvoice('${i.id}')">Supprimer</button></div></td></tr>`).join("")}</tbody></table>`:'<div class="empty">Aucune facture.</div>'}</div>`);
}
function newInvoice(){
 if(!state.clients.length){alert("Ajoute d'abord un client.");page="clients";clients();return}
 const opts=state.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
 shell(`<div class="card"><h2>Nouvelle facture</h2><form id="invForm">
 <div class="formgrid"><div class="field"><label>Client *</label><select name="client">${opts}</select></div><div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Échéance</label><input name="due" type="date"></div></div>
 <h3>Lignes</h3><div id="lines"></div><button type="button" class="secondary" onclick="addLine()">+ Ajouter une ligne</button>
 <div class="total" id="calc">Total TTC : 0,00 €</div><br><div class="actions"><button>Créer la facture</button><button type="button" class="secondary" onclick="invoices()">Annuler</button></div></form></div>`);
 addLine();document.getElementById("invForm").onsubmit=saveInvoice;
}
function addLine(){
 const box=document.getElementById("lines"), div=document.createElement("div");div.className="line";
 div.innerHTML=`<input placeholder="Description" class="desc"><input type="number" value="1" min="0.01" step="0.01" class="qty"><input type="number" value="0" min="0" step="0.01" class="price"><input type="number" value="20" min="0" step="0.01" class="vat"><button type="button" class="danger" onclick="this.parentElement.remove();recalc()">×</button>`;
 box.appendChild(div);div.querySelectorAll("input").forEach(x=>x.oninput=recalc);recalc();
}
function recalc(){
 let ht=0,tva=0;document.querySelectorAll(".line").forEach(l=>{const q=+l.querySelector(".qty").value||0,p=+l.querySelector(".price").value||0,v=+l.querySelector(".vat").value||0;const h=q*p;ht+=h;tva+=h*v/100});document.getElementById("calc").textContent=`HT : ${euro(ht)} · TVA : ${euro(tva)} · Total TTC : ${euro(ht+tva)}`;
}
function saveInvoice(e){
 e.preventDefault();const f=new FormData(e.target), c=state.clients.find(x=>x.id===f.get("client"));let ht=0,tva=0,lines=[];
 document.querySelectorAll(".line").forEach(l=>{const q=+l.querySelector(".qty").value||0,p=+l.querySelector(".price").value||0,v=+l.querySelector(".vat").value||0,d=l.querySelector(".desc").value;const h=q*p;ht+=h;tva+=h*v/100;lines.push({d,q,p,v,h})});
 if(!lines.length){alert("Ajoute une ligne.");return}
 const inv={id:crypto.randomUUID(),number:invoiceNumber(),date:f.get("date"),due:f.get("due"),clientName:c.name,clientId:c.id,lines,ht,tva,total:ht+tva,status:"Brouillon"};
 state.invoices.push(inv);state.seq++;save();viewInvoice(inv.id);
}
function viewInvoice(id){
 const i=state.invoices.find(x=>x.id===id);const c=state.clients.find(x=>x.id===i.clientId)||{};
 shell(`<div class="actions no-print"><button onclick="window.print()">Imprimer / PDF</button><button class="secondary" onclick="invoices()">Retour</button></div>
 <div class="card invoice-print"><h2>FACTURE ${esc(i.number)}</h2><p><b>${esc(state.company.name)}</b><br>${esc(state.company.address)}<br>${esc(state.company.zip)} ${esc(state.company.city)}<br>${esc(state.company.email)}</p>
 <hr><p><b>Facturé à :</b><br>${esc(c.name)}<br>${esc(c.address||"")}<br>${esc(c.zip||"")} ${esc(c.city||"")}</p>
 <table><thead><tr><th>Description</th><th>Qté</th><th>PU HT</th><th>TVA</th><th>Total HT</th></tr></thead><tbody>${i.lines.map(l=>`<tr><td>${esc(l.d)}</td><td>${l.q}</td><td>${euro(l.p)}</td><td>${l.v}%</td><td>${euro(l.h)}</td></tr>`).join("")}</tbody></table>
 <div class="total"><p>Total HT : ${euro(i.ht)}</p><p>TVA : ${euro(i.tva)}</p><h2>Total TTC : ${euro(i.total)}</h2></div><p>Statut : <b>${esc(i.status)}</b></p></div>`);
}
function markPaid(id){const i=state.invoices.find(x=>x.id===id);i.status="Payée";save();invoices()}
function delInvoice(id){if(confirm("Supprimer cette facture ?")){state.invoices=state.invoices.filter(x=>x.id!==id);save();invoices()}}
function settings(){
 const c=state.company;
 shell(`<div class="card"><h2>Mon entreprise</h2><form id="settingsForm" class="formgrid">
 <div class="field"><label>Nom / société</label><input name="name" value="${esc(c.name)}"></div><div class="field"><label>Raison sociale</label><input name="legal" value="${esc(c.legal)}"></div>
 <div class="field"><label>SIRET</label><input name="siret" value="${esc(c.siret)}"></div><div class="field"><label>TVA intracommunautaire</label><input name="vat" value="${esc(c.vat)}"></div>
 <div class="field full"><label>Adresse</label><input name="address" value="${esc(c.address)}"></div><div class="field"><label>Code postal</label><input name="zip" value="${esc(c.zip)}"></div><div class="field"><label>Ville</label><input name="city" value="${esc(c.city)}"></div>
 <div class="field"><label>Email</label><input name="email" value="${esc(c.email)}"></div><div class="field"><label>Téléphone</label><input name="phone" value="${esc(c.phone)}"></div>
 <div class="actions full"><button>Enregistrer</button></div></form></div>
 <div class="card"><h3>Sauvegarde</h3><p>Les données sont conservées dans ce navigateur. Fais régulièrement une sauvegarde.</p><div class="actions"><button onclick="backup()">Exporter mes données</button><button class="secondary" onclick="restore()">Importer</button></div></div>`);
 document.getElementById("settingsForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.company=Object.fromEntries([...f.entries()]);save();alert("Enregistré.")};
}
function backup(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="ma-facturation-sauvegarde.json";a.click()}
function restore(){const x=document.createElement("input");x.type="file";x.accept=".json";x.onchange=()=>{const r=new FileReader();r.onload=()=>{try{Object.assign(state,JSON.parse(r.result));save();alert("Sauvegarde importée.");render()}catch{alert("Fichier invalide.")}};r.readAsText(x.files[0])};x.click()}
render();
