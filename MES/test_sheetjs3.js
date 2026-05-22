const XLSX = require('xlsx');

const wb = XLSX.readFile('e:\\\\MES\\\\MES\\\\MES\\\\page\\\\documentCenter\\\\Sales_Plan_Export_2026-05-21.xlsx', {cellDates: true});
const sheet = wb.Sheets[wb.SheetNames[0]];

const jsonOutput = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'YYYY-MM-DD' });

const row = jsonOutput.find(r => r['PO Number'] === '38001-7456587');
console.log(row);
