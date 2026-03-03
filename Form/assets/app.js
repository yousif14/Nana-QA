// ===== Config (from assets/config.js) =====
const CFG = window.NANA_CONFIG || {};
const WEBHOOK_URL = CFG.WEBHOOK_URL;
const IBAN = CFG.IBAN;

const prices = CFG.prices || { cat1: 2.5, cat2: 5 };
const labels = CFG.labels || {
  cat1: "الصغار (إبتدائي وتحت)",
  cat2: "الكبار (إعدادي فما فوق)",
};

if (!WEBHOOK_URL || !IBAN) {
  console.error("Missing config: WEBHOOK_URL or IBAN in assets/config.js");
}


const el = (id) => document.getElementById(id);

function showLoading(){
  const ov = el("loadingOverlay");
  if (ov) ov.style.display = "flex";

  // lock scroll (iOS-safe)
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";

  document.body.classList.add("isLoading");
}

function hideLoading(){
  const ov = el("loadingOverlay");
  if (ov) ov.style.display = "none";

  // unlock scroll
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";

  document.body.classList.remove("isLoading");
}

function toInt(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function digitsOnly(s){
  return String(s || "").replace(/\D+/g, "");
}

function getCounts(){
  const cat1 = toInt(el("cat1").value || 0);
  const cat2 = toInt(el("cat2").value || 0);
  return { cat1, cat2 };
}


function calc(){
  const counts = getCounts();
  const warnZero = el("warnZero");

  const f1 = counts.cat1 * prices.cat1;
  const f2 = counts.cat2 * prices.cat2;

  const total = f1 + f2;

  el("total").textContent = total.toFixed(2) + " د.ب";
  el("breakdown").textContent =
    `${labels.cat1} (${counts.cat1}) = ${f1.toFixed(2)} د.ب\n` +
    `${labels.cat2} (${counts.cat2}) = ${f2.toFixed(2)} د.ب`;

  const allZero = (counts.cat1 + counts.cat2) === 0;
  warnZero.style.display = allZero ? "block" : "none";

  return { total, ...counts, allZero };
}

function validateRequired(){
  const name = (el("name").value || "").trim();
  const phone = digitsOnly(el("phone").value || "");

  const warnName = el("warnName");
  const warnPhone = el("warnPhone");

  let ok = true;

  if (!name){
    warnName.style.display = "block";
    ok = false;
  } else warnName.style.display = "none";

  if (phone.length < 8){
    warnPhone.style.display = "block";
    ok = false;
  } else warnPhone.style.display = "none";

  return { ok, name, phone };
}

// ===== Events =====

// Stepper
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-stepper]");
  if (!btn) return;

  const action = btn.dataset.stepper;
  if (action !== "plus" && action !== "minus") return;

  if (navigator.vibrate) navigator.vibrate(10);

  const stepper = btn.closest(".stepper");
  const input = stepper.querySelector('[data-stepper="value"]');
  if (!input) return;

  const min = Number(input.dataset.min ?? 0);
  const max = Number(input.dataset.max ?? 999);

  let val = toInt(input.value || 0);
  val = action === "plus" ? val + 1 : val - 1;
  val = Math.max(min, Math.min(max, val));

  input.value = String(val);

  input.classList.remove("bump");
  void input.offsetWidth;
  input.classList.add("bump");

  calc();
});

// Phone digits only
el("phone").addEventListener("input", () => {
  el("phone").value = digitsOnly(el("phone").value);
  el("warnPhone").style.display = "none";
});

calc();

// Submit
el("submit").addEventListener("click", async () => {
  const btn = el("submit");
  const x = calc();
  const v = validateRequired();

  if (x.allZero) return;
  if (!v.ok) return;

  btn.disabled = true;
  const originalText = btn.textContent;

  showLoading();

  const payload = {
    name: v.name,
    phone: v.phone,
    cat1: x.cat1,
    cat2: x.cat2,
    clientTotal: Number(x.total.toFixed(2)),
    iban: IBAN,
    returnUrl: window.location.href,
  };

  const failSafe = setTimeout(() => {
    hideLoading();
    btn.disabled = false;
    btn.textContent = originalText;
  }, 15000);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const html = await res.text();

    clearTimeout(failSafe);
    document.open();
    document.write(html);
    document.close();
  } catch (e) {
    clearTimeout(failSafe);
    hideLoading();
    alert("حدث خطأ أثناء الإرسال ❌");
    btn.disabled = false;
    btn.textContent = originalText;
  }
});
