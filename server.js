const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// مجلد بيانات منفصل لكل جهاز (حسب IP)
const DATA_DIR = path.join(__dirname, "slot_data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection?.socket ? req.connection.socket.remoteAddress : null)
  ).replace(/[^a-zA-Z0-9_.-]/g, '_');
}
function getPendingFile(ip) {
  return path.join(DATA_DIR, `pendingSlotRequests__${ip}.json`);
}
function getConfirmedFile(ip) {
  return path.join(DATA_DIR, `confirmedSlotRequests__${ip}.json`);
}
function readFileSafe(fp) {
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, "[]");
  return JSON.parse(fs.readFileSync(fp));
}

// API لتسجيل ثانية إرسال SlotSelection.js
app.post("/api/slot-request", (req, res) => {
  const ip = getClientIp(req);
  const { data, time } = req.body;
  if (!data || !time) return res.status(400).send("Missing data/time");
  const fp = getPendingFile(ip);
  let pending = readFileSafe(fp);
  pending.push({ data, time });
  fs.writeFileSync(fp, JSON.stringify(pending, null, 2));
  res.send({ ok: true });
});

// API لتأكيد ظهور ApplicantSelection.js?data=... 200
app.post("/api/slot-confirm", (req, res) => {
  const ip = getClientIp(req);
  const { data } = req.body;
  if (!data) return res.status(400).send("Missing data");
  const fpPending = getPendingFile(ip);
  const fpConfirmed = getConfirmedFile(ip);
  let pending = readFileSafe(fpPending);
  let confirmed = readFileSafe(fpConfirmed);

  const idx = pending.findIndex(r => r.data === data);
  if (idx !== -1) {
    confirmed.push(pending[idx]);
    fs.writeFileSync(fpConfirmed, JSON.stringify(confirmed, null, 2));
    pending.splice(idx, 1);
    fs.writeFileSync(fpPending, JSON.stringify(pending, null, 2));
    return res.send({ ok: true });
  }
  res.status(404).send("Pending slot request not found");
});

// واجهة عرض الطلبات المؤكدة (Samurai GET)
app.get("/", (req, res) => {
  const ip = getClientIp(req);
  const confirmed = readFileSafe(getConfirmedFile(ip));
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>SAMURAI GET</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
      <style>
        body{background:#181d22;color:#fff;}
        .main-card{background:rgba(22,26,34,0.97);border-radius:25px;box-shadow:0 8px 32px 0 rgba(31,38,135,.25);max-width:520px;margin:50px auto 0;padding:32px 20px;}
        h2{letter-spacing:2px;font-size:2em;font-weight:bold;text-align:center;margin-bottom:24px;color:#63e2ff;}
        .table{border-radius:18px;overflow:hidden;}
      </style>
    </head>
    <body>
      <div class="main-card shadow-lg">
        <h2>📒 Samurai GET</h2>
        <table class="table table-dark table-bordered table-hover text-center align-middle mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>ثانية إرسال الطلب</th>
              <th>data</th>
            </tr>
          </thead>
          <tbody>
          ${
            confirmed.length === 0 ? `<tr><td colspan="3" style="color:#bbb">لا توجد طلبات مؤكدة بعد</td></tr>` :
            confirmed
              .slice()
              .sort((a, b) => new Date(a.time.replace(' ', 'T')) - new Date(b.time.replace(' ', 'T')))
              .map((row, i) => `
                <tr>
                  <td>${i+1}</td>
                  <td>${row.time}</td>
                  <td style="direction:ltr">${row.data}</td>
                </tr>
              `).join("")
          }
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);
});

app.use(cors());
app.use(bodyParser.json());

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
          ${
            visits.length === 0 ? `
            <tr>
              <td colspan="2" style="color:#999">لا يوجد أي دخول مسجل بعد.</td>
            </tr>
            ` :
            // فرز الأوقات تصاعدياً (من الأصغر للأكبر)
            visits
              .slice()
              .sort((a, b) => {
                // دعم تنسيقات بها ms أو بدونها
                let at = a.time.split('.')[0].replace(' ', 'T');
                let bt = b.time.split('.')[0].replace(' ', 'T');
                return new Date(at) - new Date(bt);
              })
              .map((v, i) => {
                // طرح ثانيتين من الوقت المعروض
                let showTime = v.time;
                try {
                  let timeStr = v.time;
                  if (timeStr.includes('.')) timeStr = timeStr.split('.')[0]; // إزالة ms إن وجدت
                  let dt = timeStr.replace(' ', 'T');
                  let dateObj = new Date(dt);
                  if (!isNaN(dateObj)) {
                    dateObj.setSeconds(dateObj.getSeconds() - 2);
                    // إعادة بناء النص بالتنسيق السابق
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    const hh = String(dateObj.getHours()).padStart(2, '0');
                    const min = String(dateObj.getMinutes()).padStart(2, '0');
                    const ss = String(dateObj.getSeconds()).padStart(2, '0');
                    showTime = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
                  }
                } catch(e){}
                return `
                  <tr>
                    <td style="font-weight:bold;">${i + 1}</td>
                    <td>
                      <span class="time-badge">${showTime}</span>
                    </td>
                  </tr>
                `;
              }).join("")
          }
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
