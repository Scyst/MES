import { PARTNER_ITEM_DICTIONARY } from '../data/mockInboundData';

export function calculateMarketBenchmarkUsd(itemSpec, marketRates) {
  if (!itemSpec) return null;
  if (itemSpec.commodityType === 'LME_CU') {
    return Number(((itemSpec.netWeightKg * marketRates.lmeCopperUsdPerKg) + itemSpec.fabricationFeeUsd).toFixed(2));
  }
  if (itemSpec.commodityType === 'LME_AL') {
    return Number(((itemSpec.netWeightKg * marketRates.lmeAluminumUsdPerKg) + itemSpec.fabricationFeeUsd).toFixed(2));
  }
  if (itemSpec.commodityType === 'CRC_STEEL') {
    return Number(((itemSpec.netWeightKg * marketRates.crcSteelUsdPerKg) + itemSpec.fabricationFeeUsd).toFixed(2));
  }
  return itemSpec.contractUnitPriceUsd;
}

export function evaluateInvoiceLinePrice(line, marketRates, tolerancePct = 1.0) {
  const spec = PARTNER_ITEM_DICTIONARY[line.customerPartNo];
  if (!spec) {
    return {
      docPriceThb: line.docUnitPrice * marketRates.fxUsdThb,
      sapStdCostThb: 0,
      contractPriceUsd: line.docUnitPrice,
      marketPriceUsd: line.docUnitPrice,
      sysVariancePct: 0,
      marketVariancePct: 0,
      commodityLabel: 'ไม่พบข้อมูลอ้างอิง',
      hasAlert: false,
    };
  }

  const docPriceThb = Number((line.docUnitPrice * marketRates.fxUsdThb).toFixed(2));
  const marketPriceUsd = calculateMarketBenchmarkUsd(spec, marketRates);
  const sysVariancePct = spec.sapStdCostThb > 0
    ? Number((((docPriceThb - spec.sapStdCostThb) / spec.sapStdCostThb) * 100).toFixed(2))
    : 0;
  const marketVariancePct = marketPriceUsd > 0
    ? Number((((line.docUnitPrice - marketPriceUsd) / marketPriceUsd) * 100).toFixed(2))
    : 0;

  const commodityMap = {
    LME_CU: 'ทองแดง LME',
    LME_AL: 'อลูมิเนียม LME',
    CRC_STEEL: 'เหล็กแผ่นรีดเย็น',
    FIXED_CONTRACT: 'ราคาสัญญาคงที่',
  };

  return {
    docPriceThb,
    sapStdCostThb: spec.sapStdCostThb,
    contractPriceUsd: spec.contractUnitPriceUsd,
    marketPriceUsd,
    sysVariancePct,
    marketVariancePct,
    commodityLabel: commodityMap[spec.commodityType] || spec.commodityType,
    hasAlert: Math.abs(sysVariancePct) > tolerancePct || Math.abs(marketVariancePct) > (tolerancePct + 1.5),
  };
}
