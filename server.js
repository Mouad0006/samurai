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

// تسجيل ثانية إرسال SlotSelection.js (يخزن في قائمة pending حسب IP)
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

// تأكيد ظهور ApplicantSelection.js?data=... 200 (ينقل من pending إلى confirmed)
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

// صفحة عرض الطلبات المؤكدة (Samurai GET) — فقط لآيبي المستخدم + زر للتايمر
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
        h2{letter-spacing:2px;font-size:2em;font-weight:bold;text-align:center;margin-bottom:18px;color:#63e2ff;}
        .table{border-radius:18px;overflow:hidden;}
        .btn-info {background:#63e2ff;border:none;color:#161a22;}
        .btn-info:hover {background:#18a6ff;color:#fff;}
      </style>
    </head>
    <body>
      <div class="main-card shadow-lg">
        <h2>📒 Samurai GET</h2>
        <a href="/visits" class="btn btn-info mb-3" style="width:100%;font-weight:bold;letter-spacing:1.5px;">⏰ الانتقال إلى صفحة التايمر</a>
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

// صفحة التايمر + زر العودة
app.get("/visits", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>SAMURAI TIME | Timer Monitor</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
      <style>
        body{background:#181d22;color:#fff;}
        .main-card{background:rgba(22,26,34,0.97);border-radius:25px;box-shadow:0 8px 32px 0 rgba(31,38,135,.25);max-width:480px;margin:50px auto 0;padding:32px 20px;}
        h2{letter-spacing:2px;font-size:2em;font-weight:bold;text-align:center;margin-bottom:18px;color:#63e2ff;}
        .btn-outline-info {border:2px solid #63e2ff;color:#63e2ff;font-weight:bold;}
        .btn-outline-info:hover {background:#63e2ff;color:#161a22;}
        .alert {margin-top:30px;}
      </style>
    </head>
    <body>
      <div class="main-card shadow-lg">
        <h2>⏰ SAMURAI TIME</h2>
        <a href="/" class="btn btn-outline-info mb-3" style="width:100%;font-weight:bold;">🔙 العودة إلى الطلبات</a>
        <div class="alert alert-info text-center">
          هذه الصفحة للاستخدام المستقبلي أو تطوير إضافي حسب حاجتك<br>
          (يمكنك ربطها بسجلات الآيبي مثل صفحة GET)
        </div>
      </div>
    </body>
    </html>
  `);
});

app.use(cors());
app.use(bodyParser.json());

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
});
