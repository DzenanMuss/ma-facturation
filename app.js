const K="mf-v2-data";

let D=JSON.parse(localStorage.getItem(K)||'{"company":{},"clients":[],"invoices":[],"quotes":[]}');

D.company=D.company||{};
D.company.prefix=D.company.prefix||"FAC-";
D.company.next=D.company.next||1;
D.company.qnext=D.company.qnext||1;
D.company.conditions=D.company.conditions||{
  delay:"30 jours",
  validity:"30 jours",
  deposit:"30 %",
  payment:"À réception de facture",
  method:"Virement bancaire",
  custom:""
};

D.clients=D.clients||[];
D.invoices=D.invoices||[];
D.quotes=D.quotes||[];

const $=id=>document.getElementById(id);

const save=()=>localStorage.setItem(K,JSON.stringify(D));

const eur=n=>Number(n||0).toLocaleString("fr-FR",{
  style:"currency",
  currency:"EUR"
});

const today=()=>new Date().toISOString().slice(0,10);

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[m]));

const units=["m²","ml","unité","forfait","heure","jour"];

function show(v){
  if(v=="home")home();
  if(v=="clients")clients();
  if(v=="invoices")docs("invoice");
  if(v=="quotes")docs("quote");
  if(v=="company")company();
}

function home(){
  let billed=D.invoices.reduce((a,x)=>a+x.ttc,0);
  let paid=D.invoices.filter(x=>x.paid).reduce((a,x)=>a+x.ttc,0);

  $("app").innerHTML=`
  <h2>Tableau de bord</h2>

  <div class="grid">
    <div class="card">
      Clients
      <div class="metric">${D.clients.length}</div>
    </div>

    <div class="card">
      Factures
      <div class="metric">${D.invoices.length}</div>
    </div>

    <div class="card">
      Facturé
      <div class="metric">${eur(billed)}</div>
    </div>

    <div class="card">
      Encaissé
      <div class="metric">${eur(paid)}</div>
    </div>
  </div>

  <div class="card">
    <button onclick="formClient()">+ Client</button>
    <button onclick="formDoc('invoice')">+ Facture</button>
    <button class="btn2" onclick="formDoc('quote')">+ Devis</button>
  </div>`;
}

function clients(){

  $("app").innerHTML=`
  <div class="row">
    <h2>Clients</h2>
    <button onclick="formClient()">+ Ajouter</button>
  </div>

  ${
    D.clients.map(c=>`
      <div class="card">
        <b>${esc(c.name)}</b><br>
        ${esc(c.email)} ${esc(c.phone)}<br>
        ${esc(c.address)} ${esc(c.postal)} ${esc(c.city)}
      </div>
    `).join("")
    ||
    '<div class="card empty">Aucun client.</div>'
  }`;
}

function formClient(){

  let n=prompt("Nom du client / entreprise");

  if(!n)return;

  D.clients.push({
    id:crypto.randomUUID(),
    name:n,
    email:prompt("Email")||"",
    phone:prompt("Téléphone")||"",
    address:prompt("Adresse")||"",
    postal:prompt("Code postal")||"",
    city:prompt("Ville")||""
  });

  save();
  clients();
}

function docs(t){

  let a=t=="invoice"?D.invoices:D.quotes;

  $("app").innerHTML=`
  <div class="row">
    <h2>${t=="invoice"?"Factures":"Devis"}</h2>
    <button onclick="formDoc('${t}')">+ Nouveau</button>
  </div>

  ${
    a.slice().reverse().map(x=>`
      <div class="card">

        <div class="row">

          <div>
            <b>${x.number}</b><br>
            ${esc((D.clients.find(c=>c.id==x.client)?.name)||"Client")}
            · ${x.date}
          </div>

          <div>
            <b>${eur(x.ttc)}</b><br>

            <span class="badge ${x.paid?"paid":""}">
              ${x.paid?"Payée":"À payer"}
            </span>
          </div>

        </div>

        <br>

        <button class="btn2"
          onclick="view('${t}','${x.id}')">
          Voir / PDF
        </button>

        ${
          t=="invoice"&&!x.paid
          ?
          `<button class="ok" onclick="pay('${x.id}')">
            Marquer payée
          </button>`
          :
          ""
        }

      </div>
    `).join("")
    ||
    '<div class="card empty">Aucun document.</div>'
  }`;
}

function formDoc(t){

  if(!D.clients.length){
    alert("Ajoute d'abord un client.");
    return;
  }

  let c=D.clients.map(c=>
    `<option value="${c.id}">${esc(c.name)}</option>`
  ).join("");

  $("app").innerHTML=`

  <h2>${t=="invoice"?"Nouvelle facture":"Nouveau devis"}</h2>

  <div class="card">

    <label>Client</label>
    <select id="dc">${c}</select>

    <label>Date</label>
    <input id="dd" type="date" value="${today()}">

    <h3>Travaux</h3>

    <div class="small">
      Exemple : peinture murs, plafonds, portes,
      préparation des supports, fourniture et pose.
    </div>

    <div id="lines"></div>

    <button class="btn2" onclick="line()">
      + Ajouter une ligne
    </button>

    <p class="total" id="tot">
      0,00 €
    </p>

    <h3>Conditions</h3>

    <label>Délai d'exécution</label>
    <input id="delay"
      value="${esc(D.company.conditions.delay)}">

    <label>Validité du devis</label>
    <input id="validity"
      value="${esc(D.company.conditions.validity)}">

    <label>Acompte</label>
    <input id="deposit"
      value="${esc(D.company.conditions.deposit)}">

    <label>Conditions de paiement</label>
    <input id="payment"
      value="${esc(D.company.conditions.payment)}">

    <label>Mode de paiement</label>
    <input id="method"
      value="${esc(D.company.conditions.method)}">

    <label>Autres conditions</label>
    <textarea id="custom"
      placeholder="Ex. travaux supplémentaires après accord du client.">${esc(D.company.conditions.custom)}</textarea>

    <br><br>

    <button onclick="saveDoc('${t}')">
      Enregistrer
    </button>

  </div>`;

  line();
}

function line(){

  let e=document.createElement("div");

  e.className="line";

  e.innerHTML=`

    <input
      placeholder="Description des travaux"
      class="ld">

    <input
      type="number"
      min="0"
      step=".01"
      value="1"
      class="lq">

    <select class="lu">

      ${units.map(u=>
        `<option>${u}</option>`
      ).join("")}

    </select>

    <input
      type="number"
      min="0"
      step=".01"
      value="0"
      class="lp">

    <input
      type="number"
      min="0"
      step=".01"
      value="20"
      class="lv">

    <button
      class="danger"
      onclick="this.parentElement.remove();calc()">
      ×
    </button>
  `;

  $("lines").appendChild(e);

  e.querySelectorAll("input,select")
    .forEach(x=>x.oninput=calc);

  calc();
}

function read(){

  return [...document.querySelectorAll(".line")]
    .map(r=>({

      d:r.querySelector(".ld").value,

      q:+r.querySelector(".lq").value||0,

      unit:r.querySelector(".lu").value,

      p:+r.querySelector(".lp").value||0,

      v:+r.querySelector(".lv").value||0

    }))
    .filter(x=>x.d||x.p);
}

function calc(){

  let a=read();

  let ht=a.reduce(
    (s,x)=>s+x.q*x.p,
    0
  );

  let vat=a.reduce(
    (s,x)=>s+x.q*x.p*x.v/100,
    0
  );

  if($("tot")){
    $("tot").textContent=
      `HT ${eur(ht)} · TVA ${eur(vat)} · TTC ${eur(ht+vat)}`;
  }
}

function saveDoc(t){

  let a=read();

  if(!a.length){
    alert("Ajoute au moins une ligne.");
    return;
  }

  let ht=a.reduce(
    (s,x)=>s+x.q*x.p,
    0
  );

  let vat=a.reduce(
    (s,x)=>s+x.q*x.p*x.v/100,
    0
  );

  let num=
    t=="invoice"
    ?
    D.company.prefix+
    String(D.company.next++).padStart(4,"0")
    :
    "DEV-"+
    String(D.company.qnext++).padStart(4,"0");

  D.company.conditions={
    delay:$("delay").value,
    validity:$("validity").value,
    deposit:$("deposit").value,
    payment:$("payment").value,
    method:$("method").value,
    custom:$("custom").value
  };

  let x={

    id:crypto.randomUUID(),

    number:num,

    client:$("dc").value,

    date:$("dd").value,

    lines:a,

    ht,

    vat,

    ttc:ht+vat,

    paid:false,

    conditions:{...D.company.conditions}

  };

  D[t=="invoice"?"invoices":"quotes"].push(x);

  save();

  show(t=="invoice"?"invoices":"quotes");
}

function pay(id){

  let x=D.invoices.find(x=>x.id==id);

  if(x)x.paid=true;

  save();

  docs("invoice");
}

function view(t,id){

  let x=
    (t=="invoice"?D.invoices:D.quotes)
    .find(x=>x.id==id);

  let c=D.company;

  let cl=D.clients.find(
    z=>z.id==x.client
  );

  let cond=x.conditions||D.company.conditions;

  let rows=x.lines.map(l=>`

    <tr>

      <td>${esc(l.d)}</td>

      <td class="num">${l.q}</td>

      <td>${esc(l.unit)}</td>

      <td class="num">${eur(l.p)}</td>

      <td class="num">${l.v}%</td>

      <td class="num">${eur(l.q*l.p)}</td>

    </tr>

  `).join("");

  $("app").innerHTML=`

  <div class="invoice">

    <div class="invoice-head">

      <div>

        ${
          c.logo
          ?
          `<img class="logo" src="${c.logo}">`
          :
          ""
        }

        <h2>
          ${esc(c.name||"Votre entreprise")}
        </h2>

        ${esc(c.address)}<br>
        ${esc(c.postal)} ${esc(c.city)}<br>
        ${esc(c.phone)} · ${esc(c.email)}<br>

        ${
          c.siret
          ?
          `SIRET : ${esc(c.siret)}<br>`
          :
          ""
        }

        ${
          c.vat
          ?
          `TVA : ${esc(c.vat)}`
          :
          ""
        }

      </div>

      <div class="invoice-title">

        <h2>
          ${t=="invoice"?"FACTURE":"DEVIS"}
        </h2>

        <b>
          N° ${esc(x.number)}
        </b>

        <br>

        Date : ${esc(x.date)}

        ${
          t=="invoice"
          ?
          `<br>${x.paid?"PAYÉE":"À PAYER"}`
          :
          ""
        }

      </div>

    </div>

    <div class="invoice-meta">

      <div>

        <b>ÉMETTEUR</b><br>

        ${esc(c.name||"Votre entreprise")}<br>

        ${esc(c.address)}<br>

        ${esc(c.postal)} ${esc(c.city)}

      </div>

      <div>

        <b>CLIENT</b><br>

        ${esc(cl?.name||"")}<br>

        ${esc(cl?.address||"")}<br>

        ${esc(cl?.postal||"")}
        ${esc(cl?.city||"")}<br>

        ${esc(cl?.phone||"")}
        ${esc(cl?.email||"")}

      </div>

    </div>

    <table>

      <thead>

        <tr>

          <th>Travaux / désignation</th>

          <th class="num">Qté</th>

          <th>Unité</th>

          <th class="num">PU HT</th>

          <th class="num">TVA</th>

          <th class="num">Total HT</th>

        </tr>

      </thead>

      <tbody>
        ${rows}
      </tbody>

    </table>

    <div class="invoice-total">

      <div>
        <span>Total HT</span>
        <b>${eur(x.ht)}</b>
      </div>

      <div>
        <span>TVA</span>
        <b>${eur(x.vat)}</b>
      </div>

      <div class="grand">
        <span>Total TTC</span>
        <b>${eur(x.ttc)}</b>
      </div>

    </div>

    <div class="card">

      <h3>
        ${
          t=="invoice"
          ?
          "CONDITIONS DE PAIEMENT"
          :
          "CONDITIONS DU DEVIS"
        }
      </h3>

      <p>
        <b>Délai d'exécution :</b>
        ${esc(cond.delay)}
      </p>

      ${
        t=="quote"
        ?
        `<p>
          <b>Validité du devis :</b>
          ${esc(cond.validity)}
        </p>`
        :
        ""
      }

      <p>
        <b>Acompte :</b>
        ${esc(cond.deposit)}
      </p>

      <p>
        <b>Conditions de paiement :</b>
        ${esc(cond.payment)}
      </p>

      <p>
        <b>Mode de paiement :</b>
        ${esc(cond.method)}
      </p>

      ${
        cond.custom
        ?
        `<p>
          <b>Autres conditions :</b><br>
          ${esc(cond.custom).replace(/\n/g,"<br>")}
        </p>`
        :
        ""
      }

    </div>

    <p class="small">
      Merci pour votre confiance.
    </p>

  </div>

  <br>

  <button
    class="no-print"
    onclick="print()">
    Imprimer / PDF
  </button>

  <button
    class="no-print btn2"
    onclick="show('${t=="invoice"?"invoices":"quotes"}')">
    Retour
  </button>
  `;
}

function company(){

  $("app").innerHTML=`

  <h2>Entreprise</h2>

  <div class="card">

    <label>Nom</label>
    <input id="cn" value="${esc(D.company.name)}">

    <label>Adresse</label>
    <input id="ca" value="${esc(D.company.address)}">

    <label>Code postal</label>
    <input id="cp" value="${esc(D.company.postal)}">

    <label>Ville</label>
    <input id="cc" value="${esc(D.company.city)}">

    <label>Email</label>
    <input id="ce" value="${esc(D.company.email)}">

    <label>Téléphone</label>
    <input id="ct" value="${esc(D.company.phone)}">

    <label>SIRET</label>
    <input id="cs" value="${esc(D.company.siret)}">

    <label>TVA</label>
    <input id="cv" value="${esc(D.company.vat)}">

    <label>Préfixe factures</label>
    <input id="cx" value="${esc(D.company.prefix)}">

    <label>Logo</label>
    <input id="logo" type="file" accept="image/*">

    <h3>Conditions par défaut</h3>

    <label>Délai d'exécution</label>
    <input id="delay" value="${esc(D.company.conditions.delay)}">

    <label>Validité du devis</label>
    <input id="validity" value="${esc(D.company.conditions.validity)}">

    <label>Acompte</label>
    <input id="deposit" value="${esc(D.company.conditions.deposit)}">

    <label>Conditions de paiement</label>
    <input id="payment" value="${esc(D.company.conditions.payment)}">

    <label>Mode de paiement</label>
    <input id="method" value="${esc(D.company.conditions.method)}">

    <label>Autres conditions</label>
    <textarea id="custom">${esc(D.company.conditions.custom)}</textarea>

    <br><br>

    <button onclick="saveCo()">
      Enregistrer
    </button>

  </div>

  <div class="card">

    <button onclick="backup()">
      Exporter sauvegarde
    </button>

    <button class="btn2" onclick="restore()">
      Restaurer
    </button>

  </div>`;
}

function saveCo(){

  Object.assign(D.company,{

    name:$("cn").value,
    address:$("ca").value,
    postal:$("cp").value,
    city:$("cc").value,
    email:$("ce").value,
    phone:$("ct").value,
    siret:$("cs").value,
    vat:$("cv").value,
    prefix:$("cx").value||"FAC-",

    conditions:{
      delay:$("delay").value,
      validity:$("validity").value,
      deposit:$("deposit").value,
      payment:$("payment").value,
      method:$("method").value,
      custom:$("custom").value
    }

  });

  let f=$("logo").files[0];

  if(f){

    let r=new FileReader;

    r.onload=()=>{

      D.company.logo=r.result;

      save();

      company();
    };

    r.readAsDataURL(f);

  }else{

    save();

    company();
  }
}

function backup(){

  let a=document.createElement("a");

  a.href=URL.createObjectURL(
    new Blob(
      [JSON.stringify(D)],
      {type:"application/json"}
    )
  );

  a.download="ma-facturation-sauvegarde.json";

  a.click();
}

function restore(){

  let i=document.createElement("input");

  i.type="file";
  i.accept=".json";

  i.onchange=()=>{

    let r=new FileReader;

    r.onload=()=>{

      D=JSON.parse(r.result);

      save();

      company();
    };

    r.readAsText(i.files[0]);
  };

  i.click();
}

show("home");

if("serviceWorker" in navigator){

  navigator.serviceWorker
    .register("./sw.js")
    .catch(()=>{});

}
