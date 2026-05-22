const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('e:\\MES\\MES\\MES\\page\\documentCenter\\Sales_Plan_Export_2026-05-21.xlsx');
const csvOutput = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], { raw: true, defval: '' });

fs.writeFileSync('e:\\MES\\MES\\MES\\test_csv_output.csv', csvOutput);
console.log("CSV saved to test_csv_output.csv");

// Let's print the first few rows
const lines = csvOutput.split('\n');
for(let i=0; i<5; i++) {
    console.log(lines[i]);
}
