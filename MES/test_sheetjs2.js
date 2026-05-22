const XLSX = require('xlsx');

const wb = XLSX.readFile('e:\\\\MES\\\\MES\\\\MES\\\\page\\\\documentCenter\\\\Sales_Plan_Export_2026-05-21.xlsx', {cellDates: true});
const sheet = wb.Sheets[wb.SheetNames[0]];

const csvOutput = XLSX.utils.sheet_to_csv(sheet, { dateNF: 'YYYY-MM-DD' });

const lines = csvOutput.split('\n');
lines.forEach((l, i) => { 
    if(l.includes('38001-7456587')) console.log('Line ' + i + ': ' + l); 
});
