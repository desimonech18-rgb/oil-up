/**
 * Projectname:            Oil-UP
 * Description:            An Application for writing checks and documenting outgoing products
 * Created:                30.01.2026             
 * Author:                 Breburda Dejan (https://breburda.at)
 */ 

const lblTotal = document.getElementById("lblTotal");
const lblSubTotal = document.getElementById("lblSubTotal");
const lblDiscount = document.getElementById("lblDiscount");
const lblReciptText = document.getElementById("lblReciptText")
const btnOpenCam = document.getElementById("btnOpenCam");
const btnClearCart = document.getElementById("btnClearCart");
const btnDiscount = document.getElementById("btnDiscount");
const btnPDF = document.getElementById("btnPDF");
const btnWhatsapp = document.getElementById("btnWhatsapp");
const btnFreeItem = document.getElementById("btnFreeItem");
const divCart = document.getElementById("divCart");
const divDiscounts = document.getElementById("divDiscounts");

const customername = document.getElementById("customername");
const customernumber = document.getElementById("customernumber");
const customeraddress = document.getElementById("customeraddress");
const recipt = document.getElementById("reciptid");
const info = document.getElementById("info");

btnOpenCam.onclick = startCam;

btnClearCart.onclick = () =>{
    cart = {};
    discounts = {};
    global_discount = 0;
    lblReciptText.classList.add("hidden");
    customername.value = "";
    customernumber.value = "";
    customeraddress.value = "";
    recipt.value = "";
    info.value = "";
    renderCart();
}

btnDiscount.onclick = () => {
  global_discount = global_discount > 0 ? 0 : 0.10;
  renderCart();
};

btnWhatsapp.onclick = async () => {
  const text = buildReceiptText();
  lblReciptText.classList.remove("hidden");
  lblReciptText.value = text;
  lblReciptText.select();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
  }
};

btnPDF.onclick = () => {
  const text = buildReceiptText();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const margin = 48;
  const maxWidth = 595 - margin * 2;
  const lines = doc.splitTextToSize(text, maxWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(lines, margin, 72);

  const fileName = `Colline_Rechnung_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};

btnFreeItem.onclick = () => {
    addToDiscount(lastAddedProduct.id);
}


let productsById = {};
let cart = {};
let discounts = {};
let lastAddedProduct = null;
let global_discount = 0;


async function getProducts(){
    const url = "./products.json";
    try {
        const response =await fetch(url);
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        const result =await response.json();

        result.forEach(product => {
            productsById[product.id] = product;
            listProductsByCategory(product);
        });
    } catch (error) {
        console.error(error.message);
    }
}


function euro(n) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function nowStamp() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} – ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function chCartQty(productId, changeValue){
    if (!cart[productId]) return;
    cart[productId].qty += changeValue;
    if (cart[productId].qty === 0){ delete cart[productId];delete discounts[productId];}
    if(discounts[productId]){
        if(cart[productId].qty < discounts[productId].qty) discounts[productId].qty = cart[productId].qty;
    }
    renderCart();
}

function chDiscountQty(productId, changeValue){
    if (!discounts[productId]) return;

    discounts[productId].qty += changeValue;
    
    if(cart[productId]){
        if(cart[productId].qty < discounts[productId].qty) cart[productId].qty = discounts[productId].qty;
    }
    
    if (discounts[productId].qty === 0) delete discounts[productId];

    

    renderCart();
}


function addToCart(productId, qty = 1) {
  const product = productsById[productId];
  if (!product) {
    return;
  }

  if (!cart[productId]) {
    cart[productId] = {
      product: product,
      qty: 0
    };
  }

  cart[productId].qty += qty;
  lastAddedProduct = product;
  renderCart();
}


function addToDiscount(productId, qty = 1){
    const product = productsById[productId];
    if (!product) {
        return;
    }

    if (!discounts[productId]) {
        discounts[productId] = {
            product: product,
            qty: 0,
            price: product.price
        };
    }
    discounts[productId].qty += qty;
    renderCart();
}


function subtotal(){
    let subtotal = 0;
    for (const id in cart){
        const {product,qty} = cart[id];
        subtotal += Number(product.price)*qty
    }
    return subtotal;
}


function discountAmount(){
    let discount = subtotal() *global_discount;

    for(const id in discounts){
        const {product,qty,price} = discounts[id];
        discount += price*qty * (1-global_discount);
    }

    return Math.round(discount * 100)/100;
}

function total(){
    return Math.round((subtotal() - discountAmount()) * 100) / 100;
}

function buildReceiptText() {
    let lines = [];
    lines.push("Lieferschein");
    lines.push(`Datum: ${nowStamp()}`);

    if(customername.value) lines.push(`Name: ${customername.value}`);
    if(customernumber.value) lines.push(`Nummer: ${customernumber.value}`);
    if(customeraddress.value) lines.push(`Adresse: ${customeraddress.value}`);
    if(recipt.value) lines.push(`Rechnungsnummer: ${recipt.value}`);
    if(info.value) lines.push(`Informationen: \n"${info.value}"`);


    lines.push("");
    lines.push("EINKAUF:")
    for (const id in cart) {
        const { product, qty } = cart[id];
        const title = product.name;
        const sub = [product.variant, product.size].filter(Boolean).join(" · ");
        const price = Number(product.price) * qty;
        const line = `${qty}× (${euro(product.price)})${title}${sub ? " · " + sub : ""} … ${euro(price)}`;
        lines.push(line);
    }
    lines.push("----------------------------------------------------------------");
    lines.push(`ZWISCHENSUMME: ${euro(subtotal())}`);
    lines.push("");
    if (discountAmount() > 0) {
        lines.push("ABZÜGE:");
        for (const id in discounts) {
            const { product, qty, price } = discounts[id];
            const title = product.name;
            const sub = [product.variant, product.size].filter(Boolean).join(" · ");
            const discount = Number(product.price) * qty * (-1);
            const line = `${qty}× (${euro(product.price)})${title}${sub ? " · " + sub : ""} … ${euro(discount)}`;
            lines.push(line);
        }   
            lines.push("");
            lines.push(`Abzug: -${euro(discountAmount())}`);
    }
    lines.push(`SUMME: ${euro(total())}`);
    return lines.join("\n");
}


function renderCart(){
    divCart.innerHTML = "";
    divDiscounts.innerHTML = "";

    if (Object.keys(cart).length === 0) {
        divCart.innerHTML = "<p style='color:#666;margin:0'></p>";
        lblSubTotal.textContent = euro(0);
        lblDiscount.textContent = euro(0);
        lblTotal.textContent = euro(0);
        btnPDF.disabled = true;
        btnWhatsapp.disabled = true;
        btnDiscount.disabled = true;
        btnFreeItem.disabled = true;
        btnDiscount.classList.remove("toggleOn");
        return;
    }

    for (const id in cart) {
        const { product, qty, discountRate } = cart[id];
        const row = document.createElement("div");
        row.className = "item";

        const left = document.createElement("div");
        const title = document.createElement("div");
        title.className = "itemTitle";
        title.textContent = product.name;
        const variant = document.createElement("div");
        variant.className = "itemSub";
        variant.textContent = [product.variant, product.size].filter(Boolean).join(" · ");
        left.appendChild(title);
        if (variant.textContent) left.appendChild(variant);

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "10px";
        right.style.alignItems = "center";

        const controls = document.createElement("div");
        controls.className = "qtyControls";

        const minus = document.createElement("button");
        minus.className = "qtyBtn";
        minus.textContent = "–";
        minus.onclick = () => chCartQty(id, -1);

        const qtyEl = document.createElement("div");
        qtyEl.className = "qty";
        qtyEl.textContent = String(qty);

        const plus = document.createElement("button");
        plus.className = "qtyBtn";
        plus.textContent = "+";
        plus.onclick = () => chCartQty(id, 1);

        controls.appendChild(plus);
        controls.appendChild(qtyEl);
        controls.appendChild(minus);

        const priceEl = document.createElement("div");
        priceEl.className = "price";
        const price = Number(product.price) * qty * (1 - global_discount);
        priceEl.textContent = euro(price);

        right.appendChild(controls);
        right.appendChild(priceEl);

        row.appendChild(left);
        row.appendChild(right);
        divCart.appendChild(row);
    }
    lblSubTotal.textContent = euro(subtotal());
    for (const id in discounts) {
        const { product, qty,price} = discounts[id];
        const row = document.createElement("div");
        row.className = "item";

        const left = document.createElement("div");
        const title = document.createElement("div");
        title.className = "itemTitle";
        title.textContent = product.name;
        const variant = document.createElement("div");
        variant.className = "itemSub";
        variant.textContent = [product.variant, product.size].filter(Boolean).join(" · ");
        left.appendChild(title);
        if (variant.textContent) left.appendChild(variant);

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "10px";
        right.style.alignItems = "center";

        const controls = document.createElement("div");
        controls.className = "qtyControls";

        const minus = document.createElement("button");
        minus.className = "qtyBtn";
        minus.textContent = "–";
        minus.onclick = () => chDiscountQty(id, -1);

        const qtyEl = document.createElement("div");
        qtyEl.className = "qty";
        qtyEl.textContent = String(qty);

        const plus = document.createElement("button");
        plus.className = "qtyBtn";
        plus.textContent = "+";
        plus.onclick = () => chDiscountQty(id, 1);

        controls.appendChild(plus);
        controls.appendChild(qtyEl);
        controls.appendChild(minus);

        const priceEl = document.createElement("div");
        priceEl.className = "price";
        priceEl.textContent = euro(price*qty* (1-global_discount));

        right.appendChild(controls);
        right.appendChild(priceEl);

        row.appendChild(left);
        row.appendChild(right);
        divDiscounts.appendChild(row);
    }
    lblDiscount.textContent = euro(discountAmount());
    lblTotal.textContent = euro(total());

    btnPDF.disabled = false;
    btnWhatsapp.disabled = false;
    btnDiscount.disabled = false;
    btnFreeItem.disabled = false;

    if (global_discount > 0) btnDiscount.classList.add("toggleOn");
    else btnDiscount.classList.remove("toggleOn");

    lblReciptText.value = buildReceiptText();
}

let html5QrcodeScanner;

function onScanSuccess(decodedText) {
  decodedText = decodedText.replace("COLLINE:", "");
  addToCart(decodedText);
  html5QrcodeScanner.clear();
}

function onScanFailure(error) {
  console.warn(`Code scan error = ${error}`);
}

function startCam() {
  html5QrcodeScanner = new Html5QrcodeScanner(
    "reader",
    { fps: 10, qrbox: { width: 250, height: 250 } },
    false
  );
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function listProductsByCategory(product) {
  let label = `(${euro(product.price)})`;
  if (product.size) label += " " + product.size;
  label += " " + product.name;
  if (product.variant) label += " " + product.variant;

  document.getElementById(product.category).innerHTML +=
    `<button onclick="addToCart('${product.id}')">${label}</button>`;
}


getProducts();
