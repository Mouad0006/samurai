const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ملفات حفظ البيانات
const LOGS_PATH = path.join(__dirname, "logs.json");
const VISITS_PATH = path.join(__dirname, "visits.json");

// تأكد من وجود ملفات الحفظ
if (!fs.existsSync(LOGS_PATH)) fs.writeFileSync(LOGS_PATH, "[]");
if (!fs.existsSync(VISITS_PATH)) fs.writeFileSync(VISITS_PATH, "[]");

app.use(cors());
app.use(bodyParser.json());

// ========== الواجهة 1: سجل الطلبات ==========

app.get("/", (req, res) => {
  // صفحة HTML تعرض السجل وتسمح بإضافة طلب جديد
  const logs = JSON.parse(fs.readFileSync(LOGS_PATH));
  res.send(`
    <h2>📒 SAMURAI GET</h2>
    <form method="POST" action="/log" style="margin-bottom:16px">
      <input name="message" placeholder="أدخل الطلب" required>
      <button type="submit">إرسال</button>
    </form>
    <ul>
      ${logs.map(log => `<li><b>${log.time}</b>: ${log.message}</li>`).join("")}
    </ul>
    <a href="/visits">↪️ SAMURAI TIME</a>
    <script>
      // إرسال الطلب بدون إعادة تحميل الصفحة
      document.querySelector("form").onsubmit = async e => {
        e.preventDefault();
        const form = e.target;
        const message = form.message.value;
        await fetch("/log", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ message })
        });
        location.reload();
      };
    </script>
  `);
});

// API لتسجيل طلب جديد
app.post("/log", (req, res) => {
  let body = req.body;
  if (!body.message) return res.status(400).send("يرجى إدخال الطلب");
  const logs = JSON.parse(fs.readFileSync(LOGS_PATH));
  logs.push({ message: body.message, time: new Date().toLocaleString("ar-MA") });
  fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2));
  res.status(200).send({ ok: true });
});

// ========== الواجهة 2: سجل الدخول للصفحات ==========

app.get("/visits", (req, res) => {
  // صفحة HTML تعرض سجل أوقات الدخول وتسمح بتسجيل دخول جديد
  const visits = JSON.parse(fs.readFileSync(VISITS_PATH));
  res.send(`
    <h2>⏰ SAMURAI TIME</h2>
    <form method="POST" action="/visit" style="margin-bottom:16px">
      <input name="page" placeholder="اسم الصفحة/الرابط" required>
      <button type="submit">سجل دخول</button>
    </form>
    <ul>
      ${visits.map(v => `<li><b>${v.time}</b>: دخلت <code>${v.page}</code></li>`).join("")}
    </ul>
    <a href="/">↪️ SAMURAI GET</a>
    <script>
      // إرسال الطلب بدون إعادة تحميل الصفحة
      document.querySelector("form").onsubmit = async e => {
        e.preventDefault();
        const form = e.target;
        const page = form.page.value;
        await fetch("/visit", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ page })
        });
        location.reload();
      };
    </script>
  `);
});

app.post("/visit", (req, res) => {
  let body = req.body;
  if (!body.page) return res.status(400).send("يرجى إدخال اسم الصفحة");

  // حساب الوقت بدقة بتوقيت المغرب Africa/Casablanca وبصيغة YYYY-MM-DD HH:mm:ss
  const now = new Date();
  const dateObj = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  const moroccoTime = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

  const visits = JSON.parse(fs.readFileSync(VISITS_PATH));
  visits.push({ page: body.page, time: moroccoTime });
  fs.writeFileSync(VISITS_PATH, JSON.stringify(visits, null, 2));
  res.status(200).send({ ok: true });
});


app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
});
