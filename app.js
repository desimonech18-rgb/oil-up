// Colline Scan – simple local web app
let productsById= {};
let products = []
let cart = {}; // id -> {product, qty}
let discountRate = 0; // 0 or 0.10

const statusEl = document.getElementById("status");
const cartEl = document.getElementById("cart");
const totalEl = document.getElementById("total");
const btnOpenCam = document.getElementById("btnOpenCam");
const btnClear = document.getElementById("btnClear");
const btnPdf = document.getElementById("btnPdf");
const btnWhats = document.getElementById("btnWhats");
const btnDisc = document.getElementById("btnDisc");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const receiptTextEl = document.getElementById("receiptText");


statusEl.innerHTML = "Bereit!"

function euro(n) {
  // n is number
  return n.toFixed(2).replace(".", ",") + " €";
}
function nowStamp() {
  const d = new Date();
  const pad = (x)=>String(x).padStart(2,"0");
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} – ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function getData() {
  const url = "./products.json";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();

    result.forEach(element => {
      productsById[element.id] = element
      listProductsByCategory(element);
    });

  } catch (error) {
    console.error(error.message);
  }
}

function parseQr(raw) {
  return raw.replace("COLLINE:", "").trim();
}

function addToCart(productId, qty=1) {
  const p = productsById[productId];
  if (!p) {
    statusEl.textContent = `Unbekannter Code: ${productId}`;
    return;
  }
  if (!cart[productId]) cart[productId] = { product: p, qty: 0 };
  cart[productId].qty += qty;
  statusEl.textContent = `+1: ${p.name}${p.variant ? " · "+p.variant : ""}${p.size ? " · "+p.size : ""}`;
  render();
}

function setQty(productId, newQty) {
  if (!cart[productId]) return;
  cart[productId].qty = Math.max(0, newQty);
  if (cart[productId].qty === 0) delete cart[productId];
  render();
}

function subtotal() {
  let t = 0;
  for (const id in cart) {
    const {product, qty} = cart[id];
    t += Number(product.price) * qty;
  }
  return t;
}
function discountAmount() {
  return Math.round(subtotal() * discountRate * 100) / 100;
}
function total() {
  return Math.round((subtotal() - discountAmount()) * 100) / 100;
}

function buildReceiptText() {
  const lines = [];
  lines.push("Colline degli Ulivi");
  lines.push(`Datum: ${nowStamp()}`);
  lines.push("");
  // stable ordering
  const ids = Object.keys(cart).sort();
  for (const id of ids) {
    const {product, qty} = cart[id];
    const title = product.name;
    const sub = [product.variant, product.size].filter(Boolean).join(" · ");
    const line = `${qty}× ${title}${sub ? " · "+sub : ""} … ${euro(Number(product.price) * qty)}`;
    lines.push(line);
  }
  lines.push("");
  if (discountRate > 0) {
    lines.push(`Abzug: −${euro(discountAmount())}`);
  }
  lines.push(`SUMME: ${euro(total())}`);
  lines.push("Danke!");
  return lines.join("\n");
}

function render() {
  const ids = Object.keys(cart).sort();
  cartEl.innerHTML = "";
  if (ids.length === 0) {
    cartEl.innerHTML = "<p style='color:#666;margin:0'>Noch nix gescannt…</p>";
    subtotalEl.textContent = euro(0);
    discountEl.textContent = euro(0);
    totalEl.textContent = euro(0);
    btnPdf.disabled = true;
    btnWhats.disabled = true;
    btnDisc.disabled = true;
    btnDisc.classList.remove('toggleOn');
    return;
  }

  for (const id of ids) {
    const {product, qty} = cart[id];
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    const t = document.createElement("div");
    t.className = "itemTitle";
    t.textContent = product.name + " (" + euro(product.price) +")";
    const s = document.createElement("div");
    s.className = "itemSub";
    s.textContent = [product.variant, product.size].filter(Boolean).join(" · ");
    left.appendChild(t);
    if (s.textContent) left.appendChild(s);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "10px";
    right.style.alignItems = "center";

    const controls = document.createElement("div");
    controls.className = "qtyControls";

    const minus = document.createElement("button");
    minus.className = "qtyBtn";
    minus.textContent = "–";
    minus.onclick = () => setQty(id, qty - 1);

    const qtyEl = document.createElement("div");
    qtyEl.className = "qty";
    qtyEl.textContent = String(qty);

    const plus = document.createElement("button");
    plus.className = "qtyBtn";
    plus.textContent = "+";
    plus.onclick = () => setQty(id, qty + 1);

    controls.appendChild(plus);
    controls.appendChild(qtyEl);
    controls.appendChild(minus);

    const priceEl = document.createElement("div");
    priceEl.className = "price";
    priceEl.textContent = euro(Number(product.price) * qty);

    right.appendChild(controls);
    right.appendChild(priceEl);

    row.appendChild(left);
    row.appendChild(right);
    cartEl.appendChild(row);
  }

  subtotalEl.textContent = euro(subtotal());
  discountEl.textContent = euro(discountAmount());
  totalEl.textContent = euro(total());
  btnPdf.disabled = false;
  btnWhats.disabled = false;
  btnDisc.disabled = false;
  if (discountRate > 0) btnDisc.classList.add('toggleOn'); else btnDisc.classList.remove('toggleOn');

  receiptTextEl.value = buildReceiptText();
}

let html5QrcodeScanner;
function onScanSuccess(decodedText, decodedResult) {
  
  decodedText = decodedText.replace("COLLINE:","")

  //let product = productsById[decodedText]
  addToCart(decodedText);


  console.log(`Code matched = ${decodedText}`, decodedResult);
  html5QrcodeScanner.clear()
}

function onScanFailure(error) {
  // handle scan failure, usually better to ignore and keep scanning.
  // for example:
  console.warn(`Code scan error = ${error}`);
}

function startCam() {
  html5QrcodeScanner = new Html5QrcodeScanner(
  "reader",
  { fps: 10, qrbox: {width: 250, height: 250} },
  /* verbose= */ false);
html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}


function listProductsByCategory(product){
  let product_name = "("+euro(product.price) +")"
  if (product.size != null){
    product_name += " " + product.size
  }
  product_name += " " +product.name
  if (product.variant != null){
    product_name += " " + product.variant
  }
  
  console.log(product.id)
  document.getElementById(product.category).innerHTML += `<button onclick="addToCart('${product.id}')">${product_name}</button>`
}



// MAIN


btnOpenCam.onclick = startCam;
btnClear.onclick = () => { cart = {}; discountRate = 0; render(); statusEl.textContent = "Neuer Warenkorb."; };

btnDisc.onclick = () => {
  discountRate = (discountRate > 0) ? 0 : 0.10;
  statusEl.textContent = (discountRate > 0) ? "10% Abzug aktiv." : "Abzug aus.";
  render();
};

btnWhats.onclick = async () => {
  const text = buildReceiptText();
  // show and copy
  receiptTextEl.classList.remove("hidden");
  receiptTextEl.value = text;
  receiptTextEl.select();
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = "WhatsApp-Text kopiert. Einfach in WhatsApp einfügen.";
  } catch {
    statusEl.textContent = "Text markiert – bitte manuell kopieren.";
  }
};

btnPdf.onclick = () => {
  const text = buildReceiptText();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"pt", format:"a4" });

  const margin = 48;
  const maxWidth = 595 - margin*2; // a4 width in pt
  const lines = doc.splitTextToSize(text, maxWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(lines, margin, 72);

  const fileName = `Colline_Rechnung_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
  statusEl.textContent = "PDF erstellt (Download).";
};

getData();
