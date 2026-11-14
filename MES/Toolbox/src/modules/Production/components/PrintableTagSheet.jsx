import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildTransferQrUrl, parseUuidParts } from '../utils/thermalPrinter';

/**
 * Offscreen HTML print sheet renderer using QRCodeSVG (100% air-gapped).
 * Captured by TagPrinterTab via ref.innerHTML when browser printing is selected.
 */
export const PrintableTagSheet = React.forwardRef(function PrintableTagSheet({ labels = [] }, ref) {
  return (
    <div ref={ref} className="hidden" aria-hidden="true">
      {labels.map((label) => {
        const parts = parseUuidParts(label.transfer_uuid);
        const qrUrl = label.qr_url || buildTransferQrUrl(label.transfer_uuid);
        const qty = Math.floor(Number(label.quantity) || 0);
        const prodDate = String(label.prod_date || '-').slice(0, 10);

        return (
          <div key={label.transfer_uuid} className="tag-page">
            <div className="tag-head">
              <span>SNC FORMER • WIP / FG TAG</span>
              <span>LOT: {parts.displayLot}</span>
            </div>
            <div className="tag-body">
              <div className="tag-info">
                <div>
                  <div className="tag-part">{label.part_no || label.sap_no}</div>
                  <div className="tag-sub">
                    SAP: {label.sap_no} | LOC: {label.from_location_name || label.location_name || '-'}
                  </div>
                  <div className="tag-desc">{label.part_description || '-'}</div>
                </div>
                <div className="tag-qty-row">
                  <div className="tag-qty">{qty.toLocaleString()} PCS</div>
                  <div className="tag-meta">
                    <div>MFG: {prodDate}</div>
                    <div>NOTE: {(label.notes || label.remark || '-').slice(0, 28)}</div>
                  </div>
                </div>
              </div>
              <div className="tag-qr">
                <QRCodeSVG value={qrUrl} size={96} level="M" includeMargin={false} />
                <div className="tag-uuid">{label.transfer_uuid}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
