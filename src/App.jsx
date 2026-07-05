
import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

// ===================== FIREBASE CONFIG =====================
// يُملأ تلقائياً من صفحة الإعداد عند أول تشغيل (يُخزَّن في localStorage على كل جهاز)
const FB_STORAGE_KEY = "eb_firebase_config";
let _fbDb = null;

function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function initFirebase(config) {
  const app = getApps().length ? getApp() : initializeApp(config);
  _fbDb = getFirestore(app);
}

// يحسب رقماً تسلسلياً بسيطاً (1, 2, 3...) بديلاً عن الـ id التلقائي في Postgres،
// لأن مستندات Firestore تُعرَّف بمعرّف نصي وليس رقم تسلسلي جاهز.
async function nextNumericId(table) {
  const snap = await getDocs(collection(_fbDb, table));
  let max = 0;
  snap.forEach(d => { const n = Number(d.id); if (!isNaN(n) && n > max) max = n; });
  return max + 1;
}

// يزيل أي قيم undefined لأن Firestore لا يقبلها (خلافاً لـ JSON العادي)
function sanitize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const supabase = {
  async getAll(table) {
    if (!_fbDb) return [];
    const snap = await getDocs(collection(_fbDb, table));
    return snap.docs
      .map(d => ({ id: Number(d.id), ...d.data() }))
      .sort((a, b) => a.id - b.id);
  },
  async insert(table, data) {
    const id = await nextNumericId(table);
    const clean = sanitize(data);
    await setDoc(doc(_fbDb, table, String(id)), clean);
    return { id, ...clean };
  },
  async update(table, id, data) {
    const clean = sanitize(data);
    await updateDoc(doc(_fbDb, table, String(id)), clean);
    return { id, ...clean };
  },
  async delete(table, id) {
    await deleteDoc(doc(_fbDb, table, String(id)));
  },
  async login(username, password) {
    const users = await this.getAll("users");
    return users.find(u => u.username === username && u.password === password && u.active) || null;
  }
};

// ===================== COLORS =====================
const C = {
  primary: "#1B3A6E", primaryLight: "#2952A3", gold: "#F5C518", goldLight: "#FFD84D",
  bg: "#F0F4FA", white: "#FFFFFF", text: "#1A1A2E", textLight: "#5A6A85",
  success: "#16A34A", danger: "#DC2626", warning: "#D97706", border: "#D1D9E6",
  sidebar: "#0F2449",
};

// ===================== PRODUCT CATEGORIES =====================
const CATEGORIES = ["غرف نوم","غرف أطفال","غرف سفرة","انتريهات","ركنات","مراتب","أثاث مكتبي","إكسسوارات"];
const EXPENSE_CATS = ["إيجار","كهرباء","مياه","إنترنت","مرتبات","صيانة","نقل","إعلانات وتسويق","عمولات","متنوعة"];
const ROLES = ["مدير النظام","صاحب المعرض","محاسب","موظف مبيعات","أمين مخزن","سائق"];

// ===================== UTILS =====================
const fmt = n => Number(n || 0).toLocaleString("ar-EG");
const today = () => new Date().toISOString().split("T")[0];
const totalCost = p => ["buy_price","transport","labor","installation","packaging","shipping","extra"].reduce((s, k) => s + Number(p[k] || 0), 0);
const profitAmt = p => Number(p.sale_price || 0) - totalCost(p);
const profitPct = p => totalCost(p) > 0 ? ((profitAmt(p) / totalCost(p)) * 100).toFixed(1) : 0;

// ===================== STYLES =====================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body,#root{font-family:'Cairo',sans-serif;background:${C.bg};direction:rtl;min-height:100vh}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${C.primaryLight};border-radius:3px}

.sidebar{position:fixed;right:0;top:0;height:100vh;width:230px;background:${C.sidebar};display:flex;flex-direction:column;z-index:100;overflow-y:auto;transition:width .25s}
.sidebar.col{width:60px}
.s-logo{padding:18px 14px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px;cursor:pointer}
.s-logo-ico{width:38px;height:38px;background:${C.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:${C.primary};flex-shrink:0}
.s-logo-txt{color:#fff;font-weight:700;font-size:12px;line-height:1.4}
.s-logo-txt span{color:${C.gold};font-size:10px;display:block}
.nav-sec{padding:6px 0}
.nav-lbl{padding:5px 14px;font-size:10px;color:rgba(255,255,255,.35);letter-spacing:1px;font-weight:600;white-space:nowrap;overflow:hidden}
.nav-it{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;color:rgba(255,255,255,.65);font-size:13px;font-weight:500;transition:all .15s;border-right:3px solid transparent}
.nav-it:hover{background:rgba(255,255,255,.07);color:#fff}
.nav-it.act{background:rgba(245,197,24,.15);color:${C.gold};border-right-color:${C.gold}}
.nav-ico{font-size:17px;flex-shrink:0;width:20px;text-align:center}
.nav-txt{white-space:nowrap;overflow:hidden}

.main{margin-right:230px;min-height:100vh;transition:margin-right .25s}
.main.col{margin-right:60px}
.topbar{background:#fff;padding:11px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${C.border};position:sticky;top:0;z-index:50;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.topbar-t{font-size:19px;font-weight:700;color:${C.primary}}
.ubadge{display:flex;align-items:center;gap:8px;background:${C.bg};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;color:${C.primary}}
.ubadge span{width:26px;height:26px;background:${C.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px}
.page{padding:22px}

.kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;margin-bottom:22px}
.kpi{background:#fff;border-radius:12px;padding:18px;border:1px solid ${C.border};display:flex;align-items:center;gap:14px}
.kpi-ico{width:46px;height:46px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.kpi-v{font-size:21px;font-weight:900;color:${C.primary}}
.kpi-l{font-size:11px;color:${C.textLight};margin-top:2px;font-weight:500}

.card{background:#fff;border-radius:12px;border:1px solid ${C.border};overflow:hidden;margin-bottom:18px}
.card-h{padding:14px 18px;border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.card-t{font-size:14px;font-weight:700;color:${C.primary}}
.card-b{padding:18px}

.btn{padding:7px 14px;border-radius:8px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:5px;transition:all .15s}
.btn-p{background:${C.primary};color:#fff}.btn-p:hover{background:${C.primaryLight}}
.btn-g{background:${C.gold};color:${C.primary}}.btn-g:hover{background:${C.goldLight}}
.btn-d{background:${C.danger};color:#fff}
.btn-s{background:${C.success};color:#fff}
.btn-o{background:transparent;border:1px solid ${C.border};color:${C.text}}.btn-o:hover{background:${C.bg}}
.btn-sm{padding:4px 9px;font-size:12px}

.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:${C.bg};padding:9px 13px;text-align:right;font-weight:700;color:${C.primary};font-size:11px;border-bottom:2px solid ${C.border};white-space:nowrap}
td{padding:9px 13px;border-bottom:1px solid ${C.border};color:${C.text};vertical-align:middle}
tr:hover td{background:#F8FAFF}
tr:last-child td{border-bottom:none}

.badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700}
.b-s{background:#DCFCE7;color:#15803D}.b-d{background:#FEE2E2;color:#991B1B}
.b-w{background:#FEF3C7;color:#92400E}.b-i{background:#DBEAFE;color:#1E40AF}
.b-g{background:#F3F4F6;color:#374151}

.fg{margin-bottom:14px}
.fl{display:block;font-size:12px;font-weight:600;color:${C.text};margin-bottom:5px}
.fc{width:100%;padding:8px 11px;border:1px solid ${C.border};border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;color:${C.text};outline:none;background:#fff;transition:border-color .15s}
.fc:focus{border-color:${C.primary};box-shadow:0 0 0 3px rgba(27,58,110,.08)}
select.fc{cursor:pointer}

.mo{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
.md{background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.md-h{padding:18px 22px;border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1}
.md-t{font-size:16px;font-weight:800;color:${C.primary}}
.md-b{padding:22px}
.md-f{padding:14px 22px;border-top:1px solid ${C.border};display:flex;gap:8px;justify-content:flex-end}
.mc{background:none;border:none;font-size:20px;cursor:pointer;color:${C.textLight}}

.fg2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.cs2{grid-column:span 2}

.sr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px dashed ${C.border}}
.sr:last-child{border-bottom:none}
.sl{font-size:13px;color:${C.textLight}}
.sv{font-size:14px;font-weight:700;color:${C.primary}}
.sv.d{color:${C.danger}}.sv.s{color:${C.success}}.sv.w{color:${C.warning}}

.sw{position:relative;display:inline-block}
.sb{padding:8px 11px 8px 34px;border:1px solid ${C.border};border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;width:220px;outline:none}
.si{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:${C.textLight};font-size:15px;pointer-events:none}

.al{padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.al-w{background:#FEF3C7;color:#92400E;border:1px solid #FDE68A}
.al-d{background:#FEE2E2;color:#991B1B;border:1px solid #FECACA}
.al-s{background:#DCFCE7;color:#15803D;border:1px solid #BBF7D0}
.al-i{background:#DBEAFE;color:#1E40AF;border:1px solid #BFDBFE}

.pb{height:5px;background:${C.border};border-radius:3px;overflow:hidden}
.pf{height:100%;border-radius:3px;background:${C.primary};transition:width .4s}

.tabs{display:flex;gap:3px;background:${C.bg};padding:4px;border-radius:10px;margin-bottom:18px;flex-wrap:wrap}
.tab{padding:7px 14px;border-radius:7px;border:none;background:transparent;cursor:pointer;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;color:${C.textLight};transition:all .15s}
.tab.act{background:#fff;color:${C.primary};box-shadow:0 1px 4px rgba(0,0,0,.08)}

.ir{display:flex;align-items:center;gap:10px;padding:9px 12px;background:${C.bg};border-radius:8px;border:1px solid ${C.border};margin-bottom:6px}
.id{width:11px;height:11px;border-radius:50%;flex-shrink:0}
.id-p{background:${C.success}}.id-o{background:${C.danger}}.id-u{background:${C.border}}

.login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${C.sidebar}}
.lc{background:#fff;border-radius:20px;padding:44px 38px;width:370px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.ll{width:76px;height:76px;background:${C.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:${C.primary};margin:0 auto 18px}

.cb{background:${C.bg};border-radius:9px;padding:14px}
.cr{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px dashed ${C.border}}
.cr:last-child{border-bottom:none;font-weight:700;font-size:14px;color:${C.primary}}

.es{text-align:center;padding:50px 20px;color:${C.textLight}}
.es .ei{font-size:44px;margin-bottom:14px;opacity:.4}

.sync-bar{background:${C.primary};color:#fff;padding:6px 16px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;justify-content:center}
.sync-bar.ok{background:${C.success}}
.sync-bar.err{background:${C.danger}}

.config-box{background:#FFF7ED;border:2px dashed ${C.gold};border-radius:12px;padding:24px;margin-bottom:20px}
.config-box h3{color:${C.primary};font-size:16px;margin-bottom:12px}
.config-box input{width:100%;margin-bottom:10px;padding:9px 12px;border:1px solid ${C.border};border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;direction:ltr}

@media(max-width:768px){
  .sidebar{width:60px}.sidebar.col{width:60px}
  .s-logo-txt,.nav-txt,.nav-lbl{display:none}
  .main{margin-right:60px}.main.col{margin-right:60px}
  .kpi-grid{grid-template-columns:1fr 1fr}
  .fg2{grid-template-columns:1fr}.fg3{grid-template-columns:1fr 1fr}
  .md{max-width:100%}.page{padding:14px}
  .topbar-t{font-size:15px}
}
`;

// ===================== SYNC STATUS BAR =====================
function SyncBar({ status }) {
  const msgs = { idle: null, loading: ["🔄", "جاري التزامن..."], ok: ["✅", "تم الحفظ في السحاب"], err: ["❌", "خطأ في الاتصال"] };
  if (!msgs[status]) return null;
  return (
    <div className={`sync-bar ${status === "ok" ? "ok" : status === "err" ? "err" : ""}`}>
      <span>{msgs[status][0]}</span><span>{msgs[status][1]}</span>
    </div>
  );
}

// ===================== LOGIN =====================
function LoginPage({ onLogin, configured }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!configured) { setError("يجب ضبط إعدادات Firebase أولاً"); return; }
    setLoading(true); setError("");
    try {
      const user = await supabase.login(username, password);
      if (user) onLogin(user);
      else setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    } catch { setError("خطأ في الاتصال بقاعدة البيانات"); }
    setLoading(false);
  };

  return (
    <div className="login">
      <div className="lc">
        <div className="ll">ع</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.primary, marginBottom: 4 }}>عباد الله للأثاث المنزلي</h2>
        <p style={{ color: C.textLight, fontSize: 12, marginBottom: 28 }}>نظام الإدارة السحابي</p>
        {!configured && (
          <div className="al al-w">⚙️ يجب ضبط إعدادات Firebase أولاً</div>
        )}
        {error && <div className="al al-d">⚠️ {error}</div>}
        <div className="fg">
          <label className="fl">اسم المستخدم</label>
          <input className="fc" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="fg">
          <label className="fl">كلمة المرور</label>
          <input type="password" className="fc" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <button className="btn btn-p" style={{ width: "100%", padding: "11px", fontSize: 15, marginTop: 6 }} onClick={handleLogin} disabled={loading}>
          {loading ? "⏳ جاري التحقق..." : "🔐 تسجيل الدخول"}
        </button>
      </div>
    </div>
  );
}

// ===================== SETUP PAGE =====================
function SetupPage({ onSave }) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  const parseAndSave = () => {
    setError("");
    let text = raw.trim();
    if (!text) { setError("الصق إعدادات Firebase أولاً"); return; }
    try {
      // يقبل أي شكل من الأشكال التي يعطيها Firebase: كائن JS خام، أو
      // "const firebaseConfig = { ... };" كاملة، بمسافات أو أسطر متعددة.
      text = text.replace(/^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*/, "");
      text = text.replace(/;\s*$/, "");
      // eslint-disable-next-line no-new-func
      const config = new Function("return (" + text + ")")();
      if (!config || !config.apiKey || !config.projectId) {
        setError("الإعدادات غير مكتملة — تأكد إنك نسخت كل الكائن بما فيه apiKey و projectId");
        return;
      }
      onSave(config);
    } catch (e) {
      setError("تعذّر قراءة الإعدادات — تأكد إنك لصقت الكود كما هو من Firebase بدون تعديل");
    }
  };

  return (
    <div className="login">
      <div style={{ background: "#fff", borderRadius: 16, padding: 36, width: "min(600px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="ll" style={{ margin: "0 auto 14px" }}>ع</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>إعداد قاعدة البيانات السحابية</h2>
          <p style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>اتبع الخطوات لربط النظام بـ Firebase مجاناً</p>
        </div>

        <div className="al al-i">
          📋 <div>
            <strong>الخطوات:</strong><br />
            1. اذهب لـ <strong>console.firebase.google.com</strong> وأنشئ مشروع جديد<br />
            2. من الصفحة الرئيسية اضغط أيقونة <strong>الويب (&lt;/&gt;)</strong> لإضافة تطبيق ويب<br />
            3. فعّل <strong>Firestore Database</strong> من القائمة الجانبية (Build → Firestore Database → Create database)<br />
            4. ارجع لإعدادات التطبيق وانسخ كائن <code>firebaseConfig</code> بالكامل والصقه هنا تحت
          </div>
        </div>

        <div className="fg">
          <label className="fl">الصق كود firebaseConfig هنا</label>
          <textarea
            className="fc"
            style={{ direction: "ltr", fontFamily: "monospace", fontSize: 11, minHeight: 140 }}
            placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
            value={raw}
            onChange={e => setRaw(e.target.value)}
          />
        </div>
        {error && <div className="al al-d" style={{ marginBottom: 12 }}>⚠️ {error}</div>}
        <button className="btn btn-g" style={{ width: "100%", padding: 12, fontSize: 15 }} onClick={parseAndSave}>
          ✅ حفظ وتشغيل
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: C.textLight, marginTop: 14 }}>
          البيانات ستُحفظ على Firebase السحابي — مجاني ضمن الباقة المجانية (Spark)
        </p>
      </div>
    </div>
  );
}

// ===================== DASHBOARD =====================
function Dashboard({ data, loading }) {
  if (loading) return <div className="page"><div className="al al-i">⏳ جاري تحميل البيانات...</div></div>;

  const { invoices = [], expenses = [], products = [], customers = [] } = data;
  const totalMonth = invoices.filter(i => i.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, i) => s + Number(i.total), 0);
  const totalToday = invoices.filter(i => i.date === today()).reduce((s, i) => s + Number(i.total), 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const allPayments = invoices.filter(i => i.type === "تقسيط" && i.installment?.payments).flatMap(inv => {
    const cust = customers.find(c => c.id === inv.customer_id);
    return (inv.installment.payments || []).map(p => ({ ...p, customer: cust?.name, invNum: inv.number, invoiceId: inv.id }));
  });
  const pendingAmt = allPayments.filter(p => !p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const overdueAmt = allPayments.filter(p => !p.paid && p.due < today()).reduce((s, p) => s + Number(p.amount), 0);

  const totalCogs = invoices.reduce((s, inv) => {
    return s + (inv.items || []).reduce((x, item) => {
      const p = products.find(p => p.id === item.productId);
      return x + (p ? totalCost(p) * item.qty : 0);
    }, 0);
  }, 0);
  const netProfit = invoices.reduce((s, i) => s + Number(i.total), 0) - totalCogs - totalExp;
  const lowStock = products.filter(p => p.stock <= 2);

  const kpis = [
    { l: "مبيعات اليوم", v: fmt(totalToday) + " ج", ic: "🛍️", bg: "#DBEAFE" },
    { l: "مبيعات الشهر", v: fmt(totalMonth) + " ج", ic: "📅", bg: "#DCFCE7" },
    { l: "أقساط مستحقة", v: fmt(pendingAmt) + " ج", ic: "⏰", bg: "#FEF3C7" },
    { l: "أقساط متأخرة", v: fmt(overdueAmt) + " ج", ic: "🚨", bg: "#FEE2E2" },
    { l: "إجمالي المصروفات", v: fmt(totalExp) + " ج", ic: "💸", bg: "#F3E8FF" },
    { l: "صافي الربح", v: fmt(netProfit) + " ج", ic: "💰", bg: "#ECFDF5" },
  ];

  return (
    <div className="page">
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-ico" style={{ background: k.bg }}>{k.ic}</div>
            <div><div className="kpi-v">{k.v}</div><div className="kpi-l">{k.l}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="card-h"><span className="card-t">📋 آخر الفواتير</span></div>
          <div className="tw">
            <table>
              <thead><tr><th>رقم</th><th>العميل</th><th>النوع</th><th>الإجمالي</th></tr></thead>
              <tbody>
                {[...invoices].slice(-6).reverse().map(inv => {
                  const cust = customers.find(c => c.id === inv.customer_id);
                  return (
                    <tr key={inv.id}>
                      <td><strong>{inv.number}</strong></td>
                      <td>{cust?.name || "—"}</td>
                      <td><span className={`badge b-${inv.type === "نقدي" ? "s" : "i"}`}>{inv.type}</span></td>
                      <td><strong>{fmt(inv.total)} ج</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">⚠️ تنبيهات المخزون</span></div>
          <div className="card-b">
            {lowStock.length === 0
              ? <div className="al al-s">✅ المخزون في مستوى جيد</div>
              : lowStock.map(p => <div key={p.id} className="al al-w">🪑 <strong>{p.name}</strong> — باقي {p.stock} قطع</div>)
            }
            {products.slice(0, 5).map(p => (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span>{p.name}</span><span>{p.stock}</span>
                </div>
                <div className="pb"><div className="pf" style={{ width: `${Math.min((p.stock / 20) * 100, 100)}%`, background: p.stock <= 2 ? C.danger : C.primary }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><span className="card-t">📆 أقساط قريبة الاستحقاق</span></div>
        <div className="tw">
          <table>
            <thead><tr><th>العميل</th><th>الفاتورة</th><th>القسط</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
            <tbody>
              {allPayments.filter(p => !p.paid).slice(0, 8).map((p, i) => (
                <tr key={i}>
                  <td>{p.customer}</td>
                  <td>{p.invNum}</td>
                  <td><strong>{fmt(Number(p.amount).toFixed(2))} ج</strong></td>
                  <td>{p.due}</td>
                  <td><span className={`badge b-${p.due < today() ? "d" : "w"}`}>{p.due < today() ? "⚠️ متأخر" : "⏳ قادم"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===================== PRODUCTS PAGE =====================
function ProductsPage({ data, reload, syncStatus }) {
  const { products = [] } = data;
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("الكل");
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = products.filter(p =>
    (cat === "الكل" || p.category === cat) &&
    ((p.name || "").includes(search) || (p.code || "").includes(search))
  );

  const openNew = () => {
    setForm({ buy_price: 0, transport: 0, labor: 0, installation: 0, packaging: 0, shipping: 0, extra: 0, stock: 0, sale_price: 0, install_price: 0, category: "غرف نوم" });
    setEditItem(null); setModal(true);
  };

  const openEdit = (p) => { setForm({ ...p }); setEditItem(p); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const id = products.length + 1;
      const payload = {
        ...form,
        code: editItem ? form.code : `P${String(id).padStart(3, "0")}`,
        buy_price: Number(form.buy_price || 0),
        transport: Number(form.transport || 0),
        labor: Number(form.labor || 0),
        installation: Number(form.installation || 0),
        packaging: Number(form.packaging || 0),
        shipping: Number(form.shipping || 0),
        extra: Number(form.extra || 0),
        sale_price: Number(form.sale_price || 0),
        install_price: Number(form.install_price || 0),
        stock: Number(form.stock || 0),
      };
      if (editItem) await supabase.update("products", editItem.id, payload);
      else await supabase.insert("products", payload);
      await reload();
      setModal(false);
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm("حذف المنتج؟")) return;
    await supabase.delete("products", id);
    await reload();
  };

  const tc = totalCost(form);
  const pr = Number(form.sale_price || 0) - tc;

  return (
    <div className="page">
      <div className="card">
        <div className="card-h">
          <span className="card-t">🛋️ المنتجات ({filtered.length})</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div className="sw"><span className="si">🔍</span><input className="sb" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="fc" style={{ width: 150 }} value={cat} onChange={e => setCat(e.target.value)}>
              <option>الكل</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button className="btn btn-g" onClick={openNew}>+ منتج جديد</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>الكود</th><th>الاسم</th><th>التصنيف</th><th>التكلفة</th><th>نقدي</th><th>تقسيط</th><th>الربح</th><th>المخزون</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const tc = totalCost(p), pr = profitAmt(p);
                return (
                  <tr key={p.id}>
                    <td><span className="badge b-i">{p.code}</span></td>
                    <td><strong>{p.name}</strong><br /><small style={{ color: C.textLight }}>{p.manufacturer}</small></td>
                    <td><span className="badge b-g">{p.category}</span></td>
                    <td>{fmt(tc)} ج</td>
                    <td><strong style={{ color: C.success }}>{fmt(p.sale_price)} ج</strong></td>
                    <td><strong style={{ color: C.primary }}>{fmt(p.install_price)} ج</strong></td>
                    <td>
                      <strong style={{ color: pr >= 0 ? C.success : C.danger }}>{fmt(pr)} ج</strong>
                      <br /><small style={{ color: C.textLight }}>{profitPct(p)}%</small>
                    </td>
                    <td><span className={`badge b-${p.stock <= 2 ? "d" : p.stock <= 5 ? "w" : "s"}`}>{p.stock}</span></td>
                    <td>
                      <button className="btn btn-o btn-sm" onClick={() => openEdit(p)} style={{ marginLeft: 4 }}>✏️</button>
                      <button className="btn btn-d btn-sm" onClick={() => remove(p.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="es"><div className="ei">📦</div><p>لا توجد منتجات</p></div>}
        </div>
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="md">
            <div className="md-h">
              <span className="md-t">{editItem ? "تعديل منتج" : "منتج جديد"}</span>
              <button className="mc" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="md-b">
              <div className="fg2">
                <div className="fg cs2"><label className="fl">اسم المنتج *</label><input className="fc" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="fg"><label className="fl">التصنيف</label>
                  <select className="fc" value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">الشركة المصنعة</label><input className="fc" value={form.manufacturer || ""} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div>
                <div className="fg"><label className="fl">المورد</label><input className="fc" value={form.supplier || ""} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="fg"><label className="fl">الكمية بالمخزن</label><input type="number" className="fc" value={form.stock || 0} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
              </div>

              <div style={{ fontWeight: 700, color: C.primary, margin: "8px 0 10px", fontSize: 13 }}>💰 تفاصيل التكلفة</div>
              <div className="fg3">
                {[["buy_price","سعر الشراء"],["transport","النقل"],["labor","العمالة"],["installation","التركيب"],["packaging","التغليف"],["shipping","الشحن"],["extra","إضافية"]].map(([k, l]) => (
                  <div key={k} className="fg"><label className="fl">{l}</label><input type="number" className="fc" value={form[k] || 0} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
              </div>
              <div className="cb" style={{ marginBottom: 14 }}>
                <div className="cr"><span>إجمالي التكلفة الفعلية</span><span>{fmt(tc)} ج</span></div>
              </div>

              <div className="fg2">
                <div className="fg"><label className="fl">سعر البيع النقدي</label><input type="number" className="fc" value={form.sale_price || 0} onChange={e => setForm({ ...form, sale_price: e.target.value })} /></div>
                <div className="fg"><label className="fl">سعر البيع بالتقسيط</label><input type="number" className="fc" value={form.install_price || 0} onChange={e => setForm({ ...form, install_price: e.target.value })} /></div>
              </div>
              <div className="cb">
                <div className="cr"><span>التكلفة</span><span>{fmt(tc)} ج</span></div>
                <div className="cr"><span>هامش الربح (نقدي)</span><span style={{ color: pr >= 0 ? C.success : C.danger }}>{fmt(pr)} ج ({tc > 0 ? ((pr / tc) * 100).toFixed(1) : 0}%)</span></div>
              </div>

              <div className="fg" style={{ marginTop: 14 }}><label className="fl">الوصف</label><textarea className="fc" rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={save} disabled={saving}>{saving ? "⏳ جاري الحفظ..." : "💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== CUSTOMERS PAGE =====================
function CustomersPage({ data, reload }) {
  const { customers = [] } = data;
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ status: "نشط" });
  const [saving, setSaving] = useState(false);

  const filtered = customers.filter(c =>
    (c.name || "").includes(search) || (c.phone || "").includes(search) || (c.national_id || "").includes(search)
  );

  const openNew = () => { setForm({ status: "نشط" }); setEditItem(null); setModal(true); };
  const openEdit = (c) => { setForm({ ...c }); setEditItem(c); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary || 0) };
      if (editItem) await supabase.update("customers", editItem.id, payload);
      else await supabase.insert("customers", payload);
      await reload(); setModal(false);
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm("حذف العميل؟")) return;
    await supabase.delete("customers", id); await reload();
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-h">
          <span className="card-t">👥 العملاء ({filtered.length})</span>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="sw"><span className="si">🔍</span><input className="sb" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <button className="btn btn-g" onClick={openNew}>+ عميل جديد</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>الاسم</th><th>الرقم القومي</th><th>الهاتف</th><th>العنوان</th><th>جهة العمل</th><th>المرتب</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ fontFamily: "monospace", direction: "ltr" }}>{c.national_id}</td>
                  <td>{c.phone}</td>
                  <td>{c.address}</td>
                  <td>{c.employer}</td>
                  <td>{fmt(c.salary)} ج</td>
                  <td><span className={`badge b-${c.status === "نشط" ? "s" : "d"}`}>{c.status}</span></td>
                  <td>
                    <button className="btn btn-o btn-sm" onClick={() => openEdit(c)} style={{ marginLeft: 4 }}>✏️</button>
                    <button className="btn btn-d btn-sm" onClick={() => remove(c.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="es"><div className="ei">👤</div><p>لا يوجد عملاء</p></div>}
        </div>
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="md">
            <div className="md-h">
              <span className="md-t">{editItem ? "تعديل بيانات العميل" : "عميل جديد"}</span>
              <button className="mc" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="md-b">
              <div className="fg2">
                {[["name","الاسم الكامل *","text"],["national_id","الرقم القومي","text"],["phone","رقم الهاتف","text"],["address","العنوان","text"],["employer","جهة العمل","text"],["salary","المرتب","number"],["guarantor","الضامن","text"]].map(([k, l, t]) => (
                  <div key={k} className="fg"><label className="fl">{l}</label><input type={t} className="fc" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
                <div className="fg"><label className="fl">الحالة</label>
                  <select className="fc" value={form.status || "نشط"} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option>نشط</option><option>متعثر</option><option>محظور</option>
                  </select>
                </div>
                <div className="fg cs2"><label className="fl">ملاحظات</label><textarea className="fc" rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== INVOICES PAGE =====================
function InvoicesPage({ data, reload }) {
  const { invoices = [], customers = [], products = [] } = data;
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "نقدي", items: [], date: today(), discount: 0, tax: 0, dp: 0, rate: 10, months: 12 });

  const sub = form.items.reduce((s, i) => s + (Number(i.qty) * Number(i.price) - Number(i.discount || 0)), 0);
  const total = sub - Number(form.discount || 0) + Number(form.tax || 0);
  const net = total - Number(form.dp || 0);
  const interest = net * (Number(form.rate || 0) / 100);
  const totalInst = net + interest;
  const monthly = Number(form.months) > 0 ? totalInst / Number(form.months) : 0;

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: null, name: "", qty: 1, price: 0, discount: 0 }] });
  const updItem = (idx, k, v) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [k]: v };
    if (k === "productId") {
      const p = products.find(x => x.id === Number(v));
      if (p) { items[idx].name = p.name; items[idx].price = form.type === "نقدي" ? p.sale_price : p.install_price; }
    }
    setForm({ ...form, items });
  };

  const saveInvoice = async () => {
    if (!form.customerId || form.items.length === 0) return alert("اختر العميل وأضف منتجاً");
    setSaving(true);
    try {
      const count = invoices.length + 1;
      const number = `INV-${String(count).padStart(3, "0")}`;
      let installment = null;
      if (form.type === "تقسيط") {
        const payments = Array.from({ length: Number(form.months) }, (_, i) => {
          const d = new Date(form.date); d.setMonth(d.getMonth() + i + 1);
          return { month: i + 1, due: d.toISOString().split("T")[0], amount: monthly, paid: false, paidDate: null };
        });
        installment = { downPayment: Number(form.dp), interestRate: Number(form.rate), months: Number(form.months), monthly, net, interest, totalInst, payments };
      }
      const payload = {
        number, date: form.date, type: form.type,
        customer_id: Number(form.customerId),
        employee_id: 1,
        items: form.items,
        subtotal: sub, discount: Number(form.discount || 0), tax: Number(form.tax || 0), total,
        installment, status: "جارية", notes: form.notes || ""
      };
      await supabase.insert("invoices", payload);
      // Update stock
      for (const item of form.items) {
        const p = products.find(x => x.id === Number(item.productId));
        if (p) await supabase.update("products", p.id, { stock: Math.max(0, p.stock - Number(item.qty)) });
      }
      await reload();
      setModal(false);
      setForm({ type: "نقدي", items: [], date: today(), discount: 0, tax: 0, dp: 0, rate: 10, months: 12 });
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  const payInstallment = async (inv, monthIdx) => {
    const payments = [...inv.installment.payments];
    payments[monthIdx] = { ...payments[monthIdx], paid: true, paidDate: today() };
    await supabase.update("invoices", inv.id, { installment: { ...inv.installment, payments } });
    await reload();
    // Refresh payModal
    const updated = (await supabase.getAll("invoices")).find(i => i.id === inv.id);
    setPayModal(updated || null);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-h">
          <span className="card-t">📄 الفواتير ({invoices.length})</span>
          <button className="btn btn-g" onClick={() => setModal(true)}>+ فاتورة جديدة</button>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>رقم</th><th>التاريخ</th><th>العميل</th><th>النوع</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {[...invoices].reverse().map(inv => {
                const cust = customers.find(c => c.id === inv.customer_id);
                return (
                  <tr key={inv.id}>
                    <td><strong style={{ color: C.primary }}>{inv.number}</strong></td>
                    <td>{inv.date}</td>
                    <td>{cust?.name || "—"}</td>
                    <td><span className={`badge b-${inv.type === "نقدي" ? "s" : "i"}`}>{inv.type}</span></td>
                    <td><strong>{fmt(inv.total)} ج</strong></td>
                    <td><span className={`badge b-${inv.status === "مكتملة" ? "s" : "w"}`}>{inv.status}</span></td>
                    <td>
                      <button className="btn btn-o btn-sm" onClick={() => setViewModal(inv)} style={{ marginLeft: 4 }}>👁️</button>
                      {inv.type === "تقسيط" && <button className="btn btn-p btn-sm" onClick={() => setPayModal(inv)}>💳 الأقساط</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      {modal && (
        <div className="mo">
          <div className="md" style={{ maxWidth: 780 }}>
            <div className="md-h">
              <span className="md-t">📝 فاتورة جديدة</span>
              <button className="mc" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="md-b">
              <div className="fg2">
                <div className="fg"><label className="fl">التاريخ</label><input type="date" className="fc" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div className="fg"><label className="fl">نوع البيع</label>
                  <select className="fc" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option>نقدي</option><option>تقسيط</option>
                  </select>
                </div>
                <div className="fg cs2"><label className="fl">العميل *</label>
                  <select className="fc" value={form.customerId || ""} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">-- اختر العميل --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, color: C.primary }}>🛋️ المنتجات</strong>
                  <button className="btn btn-o btn-sm" onClick={addItem}>+ إضافة</button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 80px 36px", gap: 6, marginBottom: 6, alignItems: "end" }}>
                    <select className="fc" value={item.productId || ""} onChange={e => updItem(idx, "productId", e.target.value)}>
                      <option value="">-- اختر --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" className="fc" placeholder="كمية" value={item.qty} onChange={e => updItem(idx, "qty", e.target.value)} />
                    <input type="number" className="fc" placeholder="السعر" value={item.price} onChange={e => updItem(idx, "price", e.target.value)} />
                    <input type="number" className="fc" placeholder="خصم" value={item.discount || 0} onChange={e => updItem(idx, "discount", e.target.value)} />
                    <button className="btn btn-d btn-sm" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>✕</button>
                  </div>
                ))}
              </div>

              <div className="fg2">
                <div className="fg"><label className="fl">خصم إضافي</label><input type="number" className="fc" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} /></div>
                <div className="fg"><label className="fl">ضريبة</label><input type="number" className="fc" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} /></div>
              </div>

              {form.type === "تقسيط" && (
                <div style={{ background: "#EFF6FF", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: C.primary, marginBottom: 10, fontSize: 13 }}>📊 إعدادات التقسيط</div>
                  <div className="fg3">
                    <div className="fg"><label className="fl">المقدم (ج)</label><input type="number" className="fc" value={form.dp} onChange={e => setForm({ ...form, dp: e.target.value })} /></div>
                    <div className="fg"><label className="fl">نسبة الفائدة %</label><input type="number" className="fc" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
                    <div className="fg"><label className="fl">عدد الشهور</label><input type="number" className="fc" value={form.months} onChange={e => setForm({ ...form, months: e.target.value })} /></div>
                  </div>
                  <div className="cb">
                    <div className="cr"><span>إجمالي الفاتورة</span><span>{fmt(total)} ج</span></div>
                    <div className="cr"><span>المقدم</span><span>{fmt(form.dp || 0)} ج</span></div>
                    <div className="cr"><span>صافي التقسيط</span><span>{fmt(net.toFixed(2))} ج</span></div>
                    <div className="cr"><span>الفائدة ({form.rate}%)</span><span>{fmt(interest.toFixed(2))} ج</span></div>
                    <div className="cr"><span>القسط الشهري</span><span style={{ color: C.warning, fontSize: 15, fontWeight: 900 }}>{fmt(monthly.toFixed(2))} ج</span></div>
                  </div>
                </div>
              )}

              <div className="cb">
                <div className="cr"><span>المجموع الفرعي</span><span>{fmt(sub)} ج</span></div>
                <div className="cr"><span>الخصم</span><span>- {fmt(form.discount || 0)} ج</span></div>
                <div className="cr"><span>الإجمالي النهائي</span><span style={{ fontSize: 16 }}>{fmt(total)} ج</span></div>
              </div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={saveInvoice} disabled={saving}>{saving ? "⏳ جاري الحفظ..." : "✅ حفظ الفاتورة"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div className="md">
            <div className="md-h"><span className="md-t">🧾 فاتورة {viewModal.number}</span><button className="mc" onClick={() => setViewModal(null)}>✕</button></div>
            <div className="md-b">
              <div style={{ textAlign: "center", padding: 14, background: C.bg, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>معرض عباد الله للأثاث المنزلي</div>
                <div style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>فاتورة: {viewModal.number} | التاريخ: {viewModal.date}</div>
              </div>
              <div className="fg2" style={{ marginBottom: 14 }}>
                <div><strong>العميل:</strong> {customers.find(c => c.id === viewModal.customer_id)?.name}</div>
                <div><strong>النوع:</strong> <span className={`badge b-${viewModal.type === "نقدي" ? "s" : "i"}`}>{viewModal.type}</span></div>
              </div>
              <table>
                <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  {(viewModal.items || []).map((item, i) => (
                    <tr key={i}><td>{item.name}</td><td>{item.qty}</td><td>{fmt(item.price)} ج</td><td><strong>{fmt(item.qty * item.price)} ج</strong></td></tr>
                  ))}
                </tbody>
              </table>
              <div className="cb" style={{ marginTop: 14 }}>
                <div className="cr"><span>الإجمالي</span><span style={{ fontSize: 16 }}>{fmt(viewModal.total)} ج</span></div>
              </div>
              {viewModal.installment && (
                <div style={{ marginTop: 14, background: "#EFF6FF", borderRadius: 10, padding: 14 }}>
                  <strong style={{ color: C.primary, fontSize: 13 }}>📅 التقسيط</strong>
                  <div className="cr"><span>المقدم</span><span>{fmt(viewModal.installment.downPayment)} ج</span></div>
                  <div className="cr"><span>القسط الشهري</span><span>{fmt(Number(viewModal.installment.monthly).toFixed(2))} ج × {viewModal.installment.months} شهر</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {payModal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="md">
            <div className="md-h"><span className="md-t">💳 أقساط {payModal.number}</span><button className="mc" onClick={() => setPayModal(null)}>✕</button></div>
            <div className="md-b">
              <div style={{ background: "#EFF6FF", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div className="sr"><span className="sl">العميل</span><span className="sv">{customers.find(c => c.id === payModal.customer_id)?.name}</span></div>
                <div className="sr"><span className="sl">القسط الشهري</span><span className="sv w">{fmt(Number(payModal.installment.monthly).toFixed(2))} ج</span></div>
                <div className="sr"><span className="sl">المسدد</span><span className="sv s">{fmt((payModal.installment.payments.filter(p => p.paid).reduce((s, p) => s + Number(p.amount), 0)).toFixed(2))} ج</span></div>
                <div className="sr"><span className="sl">المتبقي</span><span className="sv d">{fmt((payModal.installment.payments.filter(p => !p.paid).reduce((s, p) => s + Number(p.amount), 0)).toFixed(2))} ج</span></div>
              </div>
              {payModal.installment.payments.map((p, idx) => (
                <div key={idx} className="ir">
                  <div className={`id ${p.paid ? "id-p" : p.due < today() ? "id-o" : "id-u"}`} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>قسط {p.month} — {fmt(Number(p.amount).toFixed(2))} ج</div>
                    <div style={{ fontSize: 11, color: C.textLight }}>الاستحقاق: {p.due}{p.paidDate ? ` | سُدد: ${p.paidDate}` : ""}</div>
                  </div>
                  {p.paid
                    ? <span className="badge b-s">✅ مسدد</span>
                    : p.due < today()
                      ? <button className="btn btn-d btn-sm" onClick={() => payInstallment(payModal, idx)}>💰 تسديد متأخر</button>
                      : <button className="btn btn-s btn-sm" onClick={() => payInstallment(payModal, idx)}>💰 تسديد</button>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== EXPENSES PAGE =====================
function ExpensesPage({ data, reload }) {
  const { expenses = [] } = data;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: today(), category: "إيجار", amount: 0 });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("الكل");

  const filtered = expenses.filter(e => filter === "الكل" || e.category === filter);
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const save = async () => {
    setSaving(true);
    try {
      await supabase.insert("expenses", { ...form, amount: Number(form.amount), added_by: "المدير" });
      await reload(); setModal(false); setForm({ date: today(), category: "إيجار", amount: 0 });
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  const remove = async (id) => {
    await supabase.delete("expenses", id); await reload();
  };

  const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const catTotals = EXPENSE_CATS.map(c => ({ c, t: expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0) })).filter(x => x.t > 0).sort((a, b) => b.t - a.t);

  return (
    <div className="page">
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="card-h">
            <span className="card-t">💸 المصروفات</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select className="fc" style={{ width: 150 }} value={filter} onChange={e => setFilter(e.target.value)}>
                <option>الكل</option>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <button className="btn btn-g" onClick={() => setModal(true)}>+ إضافة</button>
            </div>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>التاريخ</th><th>التصنيف</th><th>المبلغ</th><th>الملاحظات</th><th></th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td><span className="badge b-i">{e.category}</span></td>
                    <td><strong>{fmt(e.amount)} ج</strong></td>
                    <td>{e.notes}</td>
                    <td><button className="btn btn-d btn-sm" onClick={() => remove(e.id)}>🗑️</button></td>
                  </tr>
                ))}
                <tr><td colSpan={2}><strong>الإجمالي</strong></td><td colSpan={3}><strong style={{ color: C.danger }}>{fmt(total)} ج</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">📊 التوزيع</span></div>
          <div className="card-b">
            {catTotals.map(({ c, t }) => (
              <div key={c} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span>{c}</span><span style={{ fontWeight: 700 }}>{fmt(t)} ج</span></div>
                <div className="pb"><div className="pf" style={{ width: `${(t / (grandTotal || 1)) * 100}%`, background: C.gold }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="md" style={{ maxWidth: 460 }}>
            <div className="md-h"><span className="md-t">إضافة مصروف</span><button className="mc" onClick={() => setModal(false)}>✕</button></div>
            <div className="md-b">
              <div className="fg"><label className="fl">التاريخ</label><input type="date" className="fc" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="fg"><label className="fl">التصنيف</label>
                <select className="fc" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">المبلغ (ج)</label><input type="number" className="fc" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="fg"><label className="fl">ملاحظات</label><textarea className="fc" rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== SUPPLIERS PAGE =====================
function SuppliersPage({ data, reload }) {
  const { suppliers = [] } = data;
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, balance: Number(form.balance || 0) };
      if (editItem) await supabase.update("suppliers", editItem.id, payload);
      else await supabase.insert("suppliers", payload);
      await reload(); setModal(false);
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-h">
          <span className="card-t">🏭 الموردون</span>
          <button className="btn btn-g" onClick={() => { setForm({ balance: 0 }); setEditItem(null); setModal(true); }}>+ مورد جديد</button>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>الرصيد</th><th></th></tr></thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.phone}</td>
                  <td>{s.address}</td>
                  <td><strong style={{ color: s.balance < 0 ? C.danger : C.success }}>{fmt(Math.abs(s.balance))} ج {s.balance < 0 ? "مديونية" : "رصيد"}</strong></td>
                  <td><button className="btn btn-o btn-sm" onClick={() => { setForm({ ...s }); setEditItem(s); setModal(true); }}>✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="md" style={{ maxWidth: 460 }}>
            <div className="md-h"><span className="md-t">{editItem ? "تعديل مورد" : "مورد جديد"}</span><button className="mc" onClick={() => setModal(false)}>✕</button></div>
            <div className="md-b">
              {[["name","الاسم"],["phone","الهاتف"],["address","العنوان"]].map(([k, l]) => (
                <div key={k} className="fg"><label className="fl">{l}</label><input className="fc" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              <div className="fg"><label className="fl">الرصيد (سالب = مديونية)</label><input type="number" className="fc" value={form.balance || 0} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
              <div className="fg"><label className="fl">ملاحظات</label><textarea className="fc" rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== EMPLOYEES PAGE =====================
function EmployeesPage({ data, reload }) {
  const { employees = [] } = data;
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ role: "موظف مبيعات", status: "نشط", commission: 0 });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary || 0), commission: Number(form.commission || 0) };
      if (editItem) await supabase.update("employees", editItem.id, payload);
      else await supabase.insert("employees", payload);
      await reload(); setModal(false);
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-h">
          <span className="card-t">👨‍💼 الموظفون — الرواتب: {fmt(employees.reduce((s, e) => s + Number(e.salary || 0), 0))} ج</span>
          <button className="btn btn-g" onClick={() => { setForm({ role: "موظف مبيعات", status: "نشط", commission: 0 }); setEditItem(null); setModal(true); }}>+ موظف جديد</button>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>الاسم</th><th>الوظيفة</th><th>الهاتف</th><th>الراتب</th><th>العمولة %</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td><span className="badge b-i">{e.role}</span></td>
                  <td>{e.phone}</td>
                  <td><strong>{fmt(e.salary)} ج</strong></td>
                  <td>{e.commission}%</td>
                  <td><span className={`badge b-${e.status === "نشط" ? "s" : "d"}`}>{e.status}</span></td>
                  <td><button className="btn btn-o btn-sm" onClick={() => { setForm({ ...e }); setEditItem(e); setModal(true); }}>✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="md" style={{ maxWidth: 480 }}>
            <div className="md-h"><span className="md-t">{editItem ? "تعديل موظف" : "موظف جديد"}</span><button className="mc" onClick={() => setModal(false)}>✕</button></div>
            <div className="md-b">
              <div className="fg2">
                <div className="fg cs2"><label className="fl">الاسم</label><input className="fc" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="fg"><label className="fl">الوظيفة</label>
                  <select className="fc" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">الهاتف</label><input className="fc" value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="fg"><label className="fl">الراتب</label><input type="number" className="fc" value={form.salary || 0} onChange={e => setForm({ ...form, salary: e.target.value })} /></div>
                <div className="fg"><label className="fl">العمولة %</label><input type="number" className="fc" value={form.commission || 0} onChange={e => setForm({ ...form, commission: e.target.value })} /></div>
                <div className="fg"><label className="fl">الحالة</label>
                  <select className="fc" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option>نشط</option><option>موقوف</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== REPORTS PAGE =====================
function ReportsPage({ data }) {
  const { invoices = [], expenses = [], products = [], customers = [] } = data;
  const [tab, setTab] = useState("مبيعات");

  const revenue = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const cogs = invoices.reduce((s, inv) => s + (inv.items || []).reduce((x, item) => {
    const p = products.find(p => p.id === item.productId);
    return x + (p ? totalCost(p) * item.qty : 0);
  }, 0), 0);
  const gross = revenue - cogs;
  const net = gross - totalExp;

  const overdue = invoices.filter(i => i.type === "تقسيط" && i.installment?.payments).flatMap(inv => {
    const cust = customers.find(c => c.id === inv.customer_id);
    return (inv.installment.payments || []).filter(p => !p.paid && p.due < today()).map(p => ({ ...p, customer: cust?.name, invoice: inv.number }));
  });

  return (
    <div className="page">
      <div className="tabs">
        {["مبيعات","أرباح وخسائر","الأقساط المتأخرة","المخزون"].map(t => (
          <button key={t} className={`tab ${tab === t ? "act" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "مبيعات" && (
        <div className="card">
          <div className="card-h"><span className="card-t">📊 تقرير المبيعات</span></div>
          <div className="card-b">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
              {[
                { l: "إجمالي الإيرادات", v: fmt(revenue) + " ج", c: C.success },
                { l: "مبيعات نقدية", v: fmt(invoices.filter(i => i.type === "نقدي").reduce((s, i) => s + Number(i.total), 0)) + " ج", c: C.primary },
                { l: "مبيعات تقسيط", v: fmt(invoices.filter(i => i.type === "تقسيط").reduce((s, i) => s + Number(i.total), 0)) + " ج", c: C.warning },
              ].map((s, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 9, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <table>
              <thead><tr><th>رقم</th><th>التاريخ</th><th>العميل</th><th>النوع</th><th>الإجمالي</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.number}</td><td>{inv.date}</td>
                    <td>{customers.find(c => c.id === inv.customer_id)?.name}</td>
                    <td><span className={`badge b-${inv.type === "نقدي" ? "s" : "i"}`}>{inv.type}</span></td>
                    <td><strong>{fmt(inv.total)} ج</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "أرباح وخسائر" && (
        <div className="card">
          <div className="card-h"><span className="card-t">📈 قائمة الأرباح والخسائر</span></div>
          <div className="card-b" style={{ maxWidth: 500 }}>
            <div style={{ fontWeight: 700, color: C.primary, marginBottom: 10 }}>الإيرادات</div>
            <div className="sr"><span className="sl">إجمالي المبيعات</span><span className="sv s">{fmt(revenue)} ج</span></div>
            <div style={{ fontWeight: 700, color: C.primary, margin: "18px 0 10px" }}>تكلفة البضاعة المباعة</div>
            <div className="sr"><span className="sl">تكلفة المنتجات المباعة</span><span className="sv d">- {fmt(cogs)} ج</span></div>
            <div className="sr" style={{ borderTop: "2px solid " + C.primary, paddingTop: 8 }}>
              <span style={{ fontWeight: 700 }}>مجمل الربح</span>
              <span className="sv" style={{ color: gross >= 0 ? C.success : C.danger }}>{fmt(gross)} ج</span>
            </div>
            <div style={{ fontWeight: 700, color: C.primary, margin: "18px 0 10px" }}>المصروفات التشغيلية</div>
            {EXPENSE_CATS.map(cat => {
              const t = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
              return t > 0 ? <div key={cat} className="sr"><span className="sl">{cat}</span><span className="sv d">- {fmt(t)} ج</span></div> : null;
            })}
            <div className="sr" style={{ borderTop: "3px solid " + C.gold, paddingTop: 10 }}>
              <span style={{ fontWeight: 900, fontSize: 15 }}>صافي الربح</span>
              <span style={{ fontWeight: 900, fontSize: 19, color: net >= 0 ? C.success : C.danger }}>{fmt(net)} ج</span>
            </div>
          </div>
        </div>
      )}

      {tab === "الأقساط المتأخرة" && (
        <div className="card">
          <div className="card-h">
            <span className="card-t">🚨 الأقساط المتأخرة ({overdue.length})</span>
            <span className="badge b-d" style={{ fontSize: 13 }}>{fmt(overdue.reduce((s, p) => s + Number(p.amount), 0).toFixed(2))} ج</span>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>العميل</th><th>الفاتورة</th><th>القسط</th><th>تاريخ الاستحقاق</th><th>أيام التأخر</th></tr></thead>
              <tbody>
                {overdue.map((p, i) => {
                  const days = Math.floor((new Date() - new Date(p.due)) / 86400000);
                  return (
                    <tr key={i}>
                      <td><strong>{p.customer}</strong></td>
                      <td>{p.invoice}</td>
                      <td><strong style={{ color: C.danger }}>{fmt(Number(p.amount).toFixed(2))} ج</strong></td>
                      <td>{p.due}</td>
                      <td><span className="badge b-d">{days} يوم</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {overdue.length === 0 && <div className="es"><div className="ei">✅</div><p>لا توجد أقساط متأخرة</p></div>}
          </div>
        </div>
      )}

      {tab === "المخزون" && (
        <div className="card">
          <div className="card-h"><span className="card-t">📦 تقرير المخزون</span>
            <span className="badge b-i" style={{ fontSize: 13 }}>القيمة الإجمالية: {fmt(products.reduce((s, p) => s + totalCost(p) * p.stock, 0))} ج</span>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>الكود</th><th>المنتج</th><th>التصنيف</th><th>الكمية</th><th>التكلفة</th><th>قيمة المخزون</th><th>الحالة</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.code}</td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.category}</td>
                    <td><strong>{p.stock}</strong></td>
                    <td>{fmt(totalCost(p))} ج</td>
                    <td><strong>{fmt(totalCost(p) * p.stock)} ج</strong></td>
                    <td><span className={`badge b-${p.stock === 0 ? "d" : p.stock <= 2 ? "w" : "s"}`}>{p.stock === 0 ? "نفذ" : p.stock <= 2 ? "منخفض" : "جيد"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== USERS / SETTINGS PAGE =====================
function SettingsPage({ data, reload, currentUser }) {
  const { users = [] } = data;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ role: "موظف مبيعات", active: true });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await supabase.insert("users", { ...form });
      await reload(); setModal(false); setForm({ role: "موظف مبيعات", active: true });
    } catch (e) { alert("خطأ: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="card-h">
            <span className="card-t">👥 إدارة المستخدمين</span>
            <button className="btn btn-g" onClick={() => setModal(true)}>+ مستخدم جديد</button>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>الاسم</th><th>المستخدم</th><th>الصلاحية</th><th>الحالة</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td style={{ fontFamily: "monospace" }}>{u.username}</td>
                    <td><span className="badge b-i">{u.role}</span></td>
                    <td><span className={`badge b-${u.active ? "s" : "d"}`}>{u.active ? "نشط" : "موقوف"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">☁️ معلومات قاعدة البيانات</span></div>
          <div className="card-b">
            <div className="al al-s">✅ متصل بـ Firebase — البيانات محفوظة في السحاب</div>
            <div className="sr"><span className="sl">المشروع</span><span className="sv" style={{ fontSize: 11, direction: "ltr", fontFamily: "monospace" }}>{(getSavedFirebaseConfig() || {}).projectId || "—"}</span></div>
            <div className="sr"><span className="sl">المستخدم الحالي</span><span className="sv">{currentUser.name}</span></div>
            <div className="sr"><span className="sl">الصلاحية</span><span className="sv">{currentUser.role}</span></div>
            <div className="al al-i" style={{ marginTop: 16 }}>
              💡 البيانات محفوظة تلقائياً في كل عملية. يمكنك فتح النظام من أي جهاز أو متصفح بنفس بيانات تسجيل الدخول.
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="md" style={{ maxWidth: 420 }}>
            <div className="md-h"><span className="md-t">مستخدم جديد</span><button className="mc" onClick={() => setModal(false)}>✕</button></div>
            <div className="md-b">
              {[["name","الاسم الكامل"],["username","اسم المستخدم"]].map(([k, l]) => (
                <div key={k} className="fg"><label className="fl">{l}</label><input className="fc" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              <div className="fg"><label className="fl">كلمة المرور</label><input type="password" className="fc" value={form.password || ""} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div className="fg"><label className="fl">الصلاحية</label>
                <select className="fc" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {["مدير النظام","صاحب المعرض","محاسب","موظف مبيعات","أمين مخزن"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="md-f">
              <button className="btn btn-o" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn btn-g" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== NAV =====================
const NAV = [
  { s: "الرئيسية", items: [{ k: "dashboard", ic: "🏠", l: "لوحة التحكم" }] },
  { s: "المبيعات", items: [{ k: "invoices", ic: "📄", l: "الفواتير" }, { k: "customers", ic: "👥", l: "العملاء" }] },
  { s: "المخزن", items: [{ k: "products", ic: "🛋️", l: "المنتجات" }, { k: "suppliers", ic: "🏭", l: "الموردون" }] },
  { s: "الإدارة", items: [{ k: "employees", ic: "👨‍💼", l: "الموظفون" }, { k: "expenses", ic: "💸", l: "المصروفات" }] },
  { s: "تقارير", items: [{ k: "reports", ic: "📊", l: "التقارير" }, { k: "settings", ic: "⚙️", l: "الإعدادات" }] },
];
const PT = { dashboard: "لوحة التحكم", invoices: "الفواتير والمبيعات", customers: "إدارة العملاء", products: "إدارة المنتجات", suppliers: "إدارة الموردين", employees: "إدارة الموظفين", expenses: "إدارة المصروفات", reports: "التقارير", settings: "الإعدادات" };

// ===================== MAIN APP =====================
export default function App() {
  const [configured, setConfigured] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [data, setData] = useState({ products: [], customers: [], suppliers: [], employees: [], invoices: [], expenses: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const loadAll = useCallback(async () => {
    if (!configured) return;
    setLoading(true); setSyncStatus("loading");
    try {
      const [products, customers, suppliers, employees, invoices, expenses, users] = await Promise.all([
        supabase.getAll("products"), supabase.getAll("customers"), supabase.getAll("suppliers"),
        supabase.getAll("employees"), supabase.getAll("invoices"), supabase.getAll("expenses"), supabase.getAll("users")
      ]);
      setData({ products, customers, suppliers, employees, invoices, expenses, users });
      setSyncStatus("ok");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (e) { setSyncStatus("err"); console.error(e); }
    setLoading(false);
  }, [configured]);

  useEffect(() => { if (configured && currentUser) loadAll(); }, [configured, currentUser, loadAll]);

  const handleSetup = (config) => {
    localStorage.setItem(FB_STORAGE_KEY, JSON.stringify(config));
    initFirebase(config);
    setConfigured(true);
  };

  // On mount, check localStorage for saved Firebase config and connect automatically
  useEffect(() => {
    const saved = getSavedFirebaseConfig();
    if (saved && saved.apiKey && saved.projectId) {
      initFirebase(saved);
      setConfigured(true);
    }
  }, []);

  if (!configured) return <SetupPage onSave={handleSetup} />;
  if (!currentUser) return <LoginPage onLogin={u => setCurrentUser(u)} configured={configured} />;

  return (
    <div>
      <div className={`sidebar ${collapsed ? "col" : ""}`}>
        <div className="s-logo" onClick={() => setCollapsed(!collapsed)}>
          <div className="s-logo-ico">ع</div>
          {!collapsed && <div className="s-logo-txt">عباد الله للأثاث<span>نظام الإدارة السحابي ☁️</span></div>}
        </div>
        {NAV.map(sec => (
          <div key={sec.s} className="nav-sec">
            {!collapsed && <div className="nav-lbl">{sec.s}</div>}
            {sec.items.map(it => (
              <div key={it.k} className={`nav-it ${page === it.k ? "act" : ""}`} onClick={() => setPage(it.k)} title={collapsed ? it.l : ""}>
                <span className="nav-ico">{it.ic}</span>
                {!collapsed && <span className="nav-txt">{it.l}</span>}
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <div className="nav-it" onClick={() => setCurrentUser(null)}>
            <span className="nav-ico">🚪</span>
            {!collapsed && <span className="nav-txt">تسجيل الخروج</span>}
          </div>
        </div>
      </div>

      <div className={`main ${collapsed ? "col" : ""}`}>
        <SyncBar status={syncStatus} />
        <div className="topbar">
          <span className="topbar-t">{PT[page]}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 11, color: C.textLight }}>{new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
            <div className="ubadge"><span>👤</span>{currentUser.name}</div>
          </div>
        </div>

        {page === "dashboard" && <Dashboard data={data} loading={loading} />}
        {page === "products" && <ProductsPage data={data} reload={loadAll} syncStatus={syncStatus} />}
        {page === "customers" && <CustomersPage data={data} reload={loadAll} />}
        {page === "invoices" && <InvoicesPage data={data} reload={loadAll} />}
        {page === "expenses" && <ExpensesPage data={data} reload={loadAll} />}
        {page === "suppliers" && <SuppliersPage data={data} reload={loadAll} />}
        {page === "employees" && <EmployeesPage data={data} reload={loadAll} />}
        {page === "reports" && <ReportsPage data={data} />}
        {page === "settings" && <SettingsPage data={data} reload={loadAll} currentUser={currentUser} />}
      </div>
    </div>
  );
}
