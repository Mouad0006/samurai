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
  const visits = JSON.parse(fs.readFileSync(VISITS_PATH));
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>SAMURAI TIME | Timer Monitor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Bootstrap 5 CDN -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Cairo', sans-serif;
        background: linear-gradient(120deg,#222,#111 100%);
        min-height: 100vh;
        color: #fafbfc;
        margin: 0;
      }
      .main-card {
        background: rgba(22, 26, 34, 0.97);
        border-radius: 25px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.25);
        max-width: 480px;
        margin: 45px auto 0;
        padding: 32px 24px 24px 24px;
        border: 1px solid #2a2d36;
      }
      h2 {
        letter-spacing: 2px;
        font-size: 2.3em;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20px;
        color: #63e2ff;
      }
      .times-table {
        margin-top: 16px;
        background: rgba(40, 48, 70, 0.87);
        border-radius: 16px;
        overflow: hidden;
      }
      .times-table th, .times-table td {
        padding: 10px 14px;
        text-align: center;
        border-bottom: 1px solid #2a2d36;
      }
      .times-table th {
        color: #63e2ff;
        font-size: 1.12em;
        background: #19202e;
        font-weight: bold;
        border-bottom: 2px solid #444;
      }
      .times-table tr:last-child td {
        border-bottom: none;
      }
      .time-badge {
        background: linear-gradient(92deg,#18a6ff 20%,#19f7dc 80%);
        color: #141b25;
        font-size: 1.12em;
        border-radius: 10px;
        font-weight: 700;
        letter-spacing: 1.3px;
        padding: 4px 14px;
        display: inline-block;
        margin: 0 2px;
        box-shadow: 0 1px 2px #2229;
      }
      .footer-link {
        display: block;
        text-align: center;
        margin-top: 28px;
        font-size: 1em;
        color: #5be8c9;
        text-decoration: none;
        letter-spacing: 1px;
        transition: color 0.2s;
      }
      .footer-link:hover { color: #30b5fa; }
      @media (max-width: 550px) {
        .main-card { max-width: 97vw; padding: 16px 4vw 10vw 4vw;}
        h2 { font-size: 1.5em;}
        .times-table th, .times-table td { font-size: 0.99em; padding: 7px 4px;}
      }
    </style>
  </head>
  <body>
    <div class="main-card shadow-lg">
      <h2>⏰ SAMURAI TIME</h2>
      <table class="table times-table table-hover table-borderless mb-0">
        <thead>
          <tr>
            <th>#</th>
            <th>CALENDRIA TIME</th>
          </tr>
        </thead>
        <tbody>
          ${visits.length === 0 ? `
            <tr>
              <td colspan="2" style="color:#999">لا يوجد أي دخول مسجل بعد.</td>
            </tr>
          ` : visits.slice().reverse().map((v,i) => `
            <tr>
              <td style="font-weight:bold;">${visits.length - i}</td>
              <td>
                <span class="time-badge">${v.time}</span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <a class="footer-link" href="/">⏪ العودة لسجل الطلبات</a>
    </div>
  </body>
  </html>
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
