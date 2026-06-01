# MES Project Rules & Guidelines

## 🛑 Database Safety (CRITICAL)
1. **NO DROP COMMANDS**: Never execute `DROP TABLE`, `DROP DATABASE`, or `DROP COLUMN` under any circumstances.
2. **NO TRUNCATE COMMANDS**: Never execute `TRUNCATE TABLE`.
3. **SAFE DELETES/UPDATES**: Any `DELETE` or `UPDATE` statement MUST include a `WHERE` clause. Never delete all records in a table.
4. **ASK FIRST**: If an architectural change (like `ALTER TABLE`) is required, you must explain the change and ask for explicit user confirmation before execution.

## 🔄 Node-RED Workflow
1. When modifying Node-RED flows, ensure you back up the original state if making large architectural changes.
2. After making changes to the flows, communicate clearly which Node IDs or Tabs were updated.

## 📦 Available Local Libraries (`utils/libs`)
Instead of using external CDNs or downloading new packages, **ALWAYS prefer using the existing local libraries** located in `utils/libs`.
- **UI & Styling**: Bootstrap 5 (`bootstrap.min.css`, `bootstrap.bundle.min.js`), FontAwesome
- **DOM & Utility**: jQuery (`jquery-3.6.0.min.js`)
- **Alerts & Modals**: SweetAlert2 (`sweetalert2.all.min.js`)
- **Charts & Data**: Chart.js (`chart.umd.js` + zoom/datalabels plugins)
- **Maps**: Leaflet (`leaflet.js`, `leaflet.css`, `leaflet-heat.js`)
- **Dates & Calendar**: Flatpickr (`flatpickr.min.js`), FullCalendar (`fullcalendar.global.min.js`)
- **Exports & PDFs (JS)**: jsPDF (`jspdf.umd.min.js`, `jspdf.plugin.autotable.js`), SheetJS / XLSX (`xlsx.full.min.js`)
- **Exports & PDFs (PHP)**: FPDF, TCPDF, MPDF, PHPMailer, XLSXWriter
- **Others**: Html5-QRCode, JsBarcode, Sortable, Cropper, Hammer.js

## 📂 General Workflow
1. Always prioritize using specific tools for tasks.
2. Explain what you are about to do before running potentially dangerous scripts.
3. Keep logs or summaries of changes if the task is complex.
