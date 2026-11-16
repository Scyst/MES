/**
 * Calculation engine for Daily P&L Entry, Report, Yearly/Daily Statements,
 * Executive Summary Template (EBIT/EAT/EBITDA), and Excel Exports.
 */
import * as XLSX from 'xlsx';

/** Safely evaluates arithmetic expression containing only numbers and + - * / ( ). */
function evalArithmeticString(expr) {
  const sanitized = String(expr || '').replace(/[^0-9+\-*/().\s]/g, '').trim();
  if (!sanitized) return 0;
  try {
    // Only arithmetic operators and digits exist after strict whitelist stripping
    const fn = new Function(`return (${sanitized});`);
    const result = Number(fn());
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

/** Multi-pass formula resolution for daily entry & report rows (mutates clone safely). */
export function resolveEntryFormulas(rows = []) {
  const cloned = rows.map((r) => ({
    ...r,
    actual_amount: Number(r.actual_amount || 0),
    daily_target: Number(r.daily_target || 0),
    monthly_budget: Number(r.monthly_budget || 0),
    item_level: Number(r.item_level || 0),
    item_id: Number(r.item_id || 0),
    parent_id: r.parent_id !== null && r.parent_id !== undefined ? Number(r.parent_id) : null,
  }));

  for (let pass = 0; pass < 15; pass += 1) {
    let changed = false;
    cloned.forEach((item) => {
      if (item.data_source !== 'CALCULATED') return;
      const oldAct = item.actual_amount;
      const oldTgt = item.daily_target;
      const formulaUpper = String(item.calculation_formula || '').trim().toUpperCase();
      let nextAct = 0;
      let nextTgt = 0;

      if (formulaUpper === 'SUM_CHILDREN') {
        const children = cloned.filter((c) => c.parent_id === item.item_id);
        nextAct = children.reduce((s, c) => s + Number(c.actual_amount || 0), 0);
        nextTgt = children.reduce((s, c) => s + Number(c.daily_target || 0), 0);
      } else if (formulaUpper === 'USE_TARGET') {
        nextAct = item.daily_target;
        nextTgt = item.daily_target;
      } else if (item.calculation_formula) {
        let fAct = String(item.calculation_formula);
        let fTgt = String(item.calculation_formula);
        const matches = fAct.match(/\[(.*?)\]/g);
        if (matches) {
          matches.forEach((token) => {
            const code = token.slice(1, -1);
            const ref = cloned.find((d) => d.account_code === code);
            const refAct = ref ? Number(ref.actual_amount || 0) : 0;
            const refTgt = ref ? Number(ref.daily_target || 0) : 0;
            fAct = fAct.split(token).join(`(${refAct})`);
            fTgt = fTgt.split(token).join(`(${refTgt})`);
          });
        }
        nextAct = evalArithmeticString(fAct);
        nextTgt = evalArithmeticString(fTgt);
      }

      if (Math.abs(nextAct - oldAct) > 0.001 || Math.abs(nextTgt - oldTgt) > 0.001) {
        item.actual_amount = nextAct;
        item.daily_target = nextTgt;
        changed = true;
      }
    });
    if (!changed) break;
  }

  return cloned;
}

/** Multi-pass formula resolution for Statement grids ('yearly' m1..m12 or 'daily' d1..d31). */
export function resolveStatementFormulas(rows = [], mode = 'yearly') {
  const limit = mode === 'yearly' ? 12 : 31;
  const prefix = mode === 'yearly' ? 'm' : 'd';
  const cloned = rows.map((r) => ({ ...r }));

  for (let pass = 0; pass < 15; pass += 1) {
    let changed = false;
    cloned.forEach((item) => {
      if (item.data_source !== 'CALCULATED') return;
      const formulaUpper = String(item.calculation_formula || '').trim().toUpperCase();

      for (let i = 1; i <= limit; i += 1) {
        const actKey = `${prefix}${i}_act`;
        const tgtKey = `${prefix}${i}_tgt`;
        const oldAct = Number(item[actKey] || 0);
        const oldTgt = Number(item[tgtKey] || 0);
        let nextAct = 0;
        let nextTgt = 0;

        if (formulaUpper === 'SUM_CHILDREN') {
          const children = cloned.filter((c) => Number(c.parent_id) === Number(item.item_id));
          nextAct = children.reduce((s, c) => s + Number(c[actKey] || 0), 0);
          nextTgt = children.reduce((s, c) => s + Number(c[tgtKey] || 0), 0);
        } else if (formulaUpper === 'USE_TARGET') {
          nextAct = Number(item[tgtKey] || 0);
          nextTgt = Number(item[tgtKey] || 0);
        } else if (item.calculation_formula) {
          let fAct = String(item.calculation_formula);
          let fTgt = String(item.calculation_formula);
          const matches = fAct.match(/\[(.*?)\]/g);
          if (matches) {
            matches.forEach((token) => {
              const code = token.slice(1, -1);
              const ref = cloned.find((d) => d.account_code === code);
              const refAct = ref ? Number(ref[actKey] || 0) : 0;
              const refTgt = ref ? Number(ref[tgtKey] || 0) : 0;
              fAct = fAct.split(token).join(`(${refAct})`);
              fTgt = fTgt.split(token).join(`(${refTgt})`);
            });
          }
          nextAct = evalArithmeticString(fAct);
          nextTgt = evalArithmeticString(fTgt);
        }

        if (Math.abs(nextAct - oldAct) > 0.001 || Math.abs(nextTgt - oldTgt) > 0.001) {
          item[actKey] = nextAct;
          item[tgtKey] = nextTgt;
          changed = true;
        }
      }
    });
    if (!changed) break;
  }

  return cloned;
}

/** Computes KPI Strip metrics matching legacy pl_entry.js calculateSummary(). */
export function computePlSummary(rows = []) {
  const revItem = rows.find((d) => d.account_code === 'REVENUES');
  const netItem = rows.find((d) => d.account_code === 'NET_PF');
  const revenue = revItem ? Number(revItem.actual_amount || 0) : 0;
  const netProfit = netItem ? Number(netItem.actual_amount || 0) : 0;
  const expense = revenue - netProfit;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { revenue, expense, netProfit, margin };
}

/** Executive P&L Summary template matching legacy getExecTemplate(). */
export function buildExecSummaryRows(data = [], mode = 'yearly') {
  const prefix = mode === 'yearly' ? 'm' : 'd';
  const mapByCode = {};
  data.forEach((d) => {
    mapByCode[d.account_code] = d;
  });

  const getAct = (code, p) => Number(mapByCode[code]?.[`${prefix}${p}_act`] || 0);
  const getTgt = (code, p) => Number(mapByCode[code]?.[`${prefix}${p}_tgt`] || 0);

  const getGrossAct = (p) => getAct('REVENUES', p) - getAct('COGS', p);
  const getGrossTgt = (p) => getTgt('REVENUES', p) - getTgt('COGS', p);
  const getSgaAct = (p) => getAct('SELL_EXP', p) + getAct('ADMIN_FC', p);
  const getSgaTgt = (p) => getTgt('SELL_EXP', p) + getTgt('ADMIN_FC', p);
  const getProfitAct = (p) => getGrossAct(p) - getSgaAct(p);
  const getProfitTgt = (p) => getGrossTgt(p) - getSgaTgt(p);
  const getEbitAct = (p) => getProfitAct(p) + getAct('OT_IC', p) - getAct('EX', p);
  const getEbitTgt = (p) => getProfitTgt(p) + getTgt('OT_IC', p) - getTgt('EX', p);

  return [
    { label: 'SALE', code: 'REVENUES', isBold: true, tone: 'blue', isBase: true },
    { label: 'RM', isBold: true, calcAct: (p) => getAct('GRP_RM', p) + getAct('CR_R', p), calcTgt: (p) => getTgt('GRP_RM', p) + getTgt('CR_R', p) },
    { label: 'DLOT', isBold: true, calcAct: (p) => getAct('522001+3', p) + getAct('DL_SCAN', p) + getAct('522002+4', p) + getAct('OT_SCAN', p), calcTgt: (p) => getTgt('522001+3', p) + getTgt('DL_SCAN', p) + getTgt('522002+4', p) + getTgt('OT_SCAN', p) },
    { label: 'DL', indent: 1, calcAct: (p) => getAct('522001+3', p) + getAct('DL_SCAN', p), calcTgt: (p) => getTgt('522001+3', p) + getTgt('DL_SCAN', p) },
    { label: 'OT', indent: 1, calcAct: (p) => getAct('522002+4', p) + getAct('OT_SCAN', p), calcTgt: (p) => getTgt('522002+4', p) + getTgt('OT_SCAN', p) },
    { label: 'OH', isBold: true, calcAct: (p) => getAct('OH_FC', p) + getAct('OH_VC', p), calcTgt: (p) => getTgt('OH_FC', p) + getTgt('OH_VC', p) },
    { label: 'OH FC', code: 'OH_FC', isBold: true },
    { label: 'Staff expenses', indent: 1, code: 'GRP_STF' },
    { label: 'Depreciation', indent: 1, code: 'GRP_DEP' },
    { label: 'Rental expense', indent: 1, code: 'GRP_RT' },
    { label: 'OH VC', code: 'OH_VC', isBold: true },
    { label: 'Utilities', indent: 1, code: 'GRP_UTIL' },
    { label: 'Subcontract', indent: 1, code: 'GRP_SUB' },
    { label: 'Accessories', indent: 1, code: 'GRP_AC' },
    { label: 'Repair', indent: 1, code: 'GRP_REP' },
    { label: 'Others', indent: 1, calcAct: (p) => getAct('GRP_TRV', p) + getAct('GRP_OT', p) + getAct('GRP_OTR', p), calcTgt: (p) => getTgt('GRP_TRV', p) + getTgt('GRP_OT', p) + getTgt('GRP_OTR', p) },
    { label: 'Total CoGS', code: 'COGS', isBold: true, tone: 'amber', textTone: 'danger' },
    { label: 'Gross Profit', isBold: true, tone: 'green', textTone: 'success', calcAct: getGrossAct, calcTgt: getGrossTgt },
    { label: 'Selling VC', code: 'SELL_EXP', isBold: true },
    { label: 'Transportation', indent: 1, code: '542006' },
    { label: 'Selling VC others', indent: 1, calcAct: (p) => getAct('SELL_EXP', p) - getAct('542006', p), calcTgt: (p) => getTgt('SELL_EXP', p) - getTgt('542006', p) },
    { label: 'Admin FC', code: 'ADMIN_FC', isBold: true },
    { label: 'Staff expenses (Admin)', indent: 1, calcAct: (p) => getAct('GRP_AD_STF', p) + getAct('GRP_AD_ST', p), calcTgt: (p) => getTgt('GRP_AD_STF', p) + getTgt('GRP_AD_ST', p) },
    { label: 'Service fee', indent: 1, code: 'GRP_SVF' },
    { label: 'Rental expenses (Admin)', indent: 1, code: 'GRP_AD_RT' },
    { label: 'Depreciation (Admin)', indent: 1, code: 'GRP_AD_DSP' },
    { label: 'Others (Admin)', indent: 1, calcAct: (p) => getAct('GRP_OFF', p) + getAct('GRP_AD_OT', p) + getAct('GRP_AD_UTL', p), calcTgt: (p) => getTgt('GRP_OFF', p) + getTgt('GRP_AD_OT', p) + getTgt('GRP_AD_UTL', p) },
    { label: 'SG&A', isBold: true, tone: 'amber', textTone: 'danger', calcAct: getSgaAct, calcTgt: getSgaTgt },
    { label: 'Profit (Operating)', isBold: true, tone: 'slate', calcAct: getProfitAct, calcTgt: getProfitTgt },
    { label: 'Other income', code: 'OT_IC', isBold: true },
    { label: 'Bonus OH & Admin', indent: 1, calcAct: (p) => getAct('541014', p) + getAct('541015_1', p), calcTgt: (p) => getTgt('541014', p) + getTgt('541015_1', p) },
    { label: 'Management bonus', indent: 1, code: '541015_2' },
    { label: 'Extra', indent: 1, calcAct: (p) => getAct('EX', p) - getAct('541014', p) - getAct('541015_1', p) - getAct('541015_2', p), calcTgt: (p) => getTgt('EX', p) - getTgt('541014', p) - getTgt('541015_1', p) - getTgt('541015_2', p) },
    { label: 'EBIT', isBold: true, tone: 'emerald', calcAct: getEbitAct, calcTgt: getEbitTgt },
    { label: 'Interest expense', code: 'ITR_C' },
    { label: 'Tax', code: 'TAX' },
    { label: 'EAT', isBold: true, tone: 'emerald', calcAct: (p) => getEbitAct(p) - getAct('ITR_C', p) - getAct('TAX', p), calcTgt: (p) => getEbitTgt(p) - getTgt('ITR_C', p) - getTgt('TAX', p) },
    { label: 'EBITDA', isBold: true, tone: 'blue', textTone: 'primary', calcAct: (p) => getEbitAct(p) + getAct('GRP_DEP', p) + getAct('GRP_AD_DSP', p), calcTgt: (p) => getEbitTgt(p) + getTgt('GRP_DEP', p) + getTgt('GRP_AD_DSP', p) },
  ].map((row) => ({
    ...row,
    getAct: (p) => (row.calcAct ? row.calcAct(p) : getAct(row.code, p)),
    getTgt: (p) => (row.calcTgt ? row.calcTgt(p) : getTgt(row.code, p)),
  }));
}

export function formatPlNumber(val, decimals = 2) {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPlShort(val) {
  const num = Number(val || 0);
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function exportPlRowsToExcel(rows = [], section = 'ALL', periodLabel = '') {
  const sheetData = rows.map((r) => ({
    Code: r.account_code,
    'Account Item': `${'  '.repeat(Number(r.item_level || 0))}${r.item_name}`,
    Type: r.item_type,
    Source: r.data_source,
    Target: Number(r.daily_target || 0),
    Actual: Number(r.actual_amount || 0),
    Diff: Number(r.actual_amount || 0) - Number(r.daily_target || 0),
    Remark: r.remark || '',
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DailyPL');
  XLSX.writeFile(wb, `Daily_PL_${section}_${periodLabel || 'Export'}.xlsx`);
}

export function exportPlStructureTemplate(items = []) {
  const codeById = {};
  items.forEach((i) => {
    codeById[i.id] = i.account_code;
  });
  const sheetData = items.map((i) => ({
    account_code: i.account_code,
    item_name: i.item_name,
    parent_code: i.parent_id ? (codeById[i.parent_id] || '') : '',
    item_type: i.item_type,
    data_source: i.data_source,
    calculation_formula: i.calculation_formula || '',
    row_order: i.row_order,
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PL_Structure');
  XLSX.writeFile(wb, 'PL_Structure_Template.xlsx');
}
