'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Printer, Download, FileSpreadsheet, Save, Pencil, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export function MaterialConsumptionSheetDialog({
  open,
  onOpenChange,
  challanId,
  initialData,
}) {
  const printRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData(initialData);
      } else if (challanId) {
        fetchSheetData();
      }
    }
  }, [open, challanId, initialData]);

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/outbound-challans/${challanId}/consumption-sheet`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load Material Consumption Sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (colIndex, field, subfield, value) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const val = parseFloat(value) || 0;
      next.columns[colIndex][field][subfield] = val;

      // Auto-recalculate net and balance
      if (field === 'originallyReceived' || field === 'processingLoss') {
        const orig = next.columns[colIndex].originallyReceived.qty;
        const loss = next.columns[colIndex].processingLoss.qty;
        next.columns[colIndex].netQuantity.qty = Number((orig - loss).toFixed(2));
      }

      if (field === 'originallyReceived' || field === 'qtyUsedEarlier' || field === 'qtyUsedThisAdvice') {
        const net = next.columns[colIndex].netQuantity.qty;
        const earlier = next.columns[colIndex].qtyUsedEarlier.qty;
        const current = next.columns[colIndex].qtyUsedThisAdvice.qty;
        const rate = next.columns[colIndex].unitRate || 100;

        next.columns[colIndex].balanceQtyInHand.qty = Number(Math.max(0, net - earlier - current).toFixed(2));
        next.columns[colIndex].balanceQtyInHand.value = Number((next.columns[colIndex].balanceQtyInHand.qty * rate).toFixed(2));
      }

      return next;
    });
  };

  const handleSaveSheet = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/outbound-challans/${challanId}/consumption-sheet`, data);
      if (res?.success || res?.data) {
        toast.success('Material Consumption Sheet adjustments saved successfully');
        setIsEditing(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save consumption sheet');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const winPrint = window.open('', '', 'left=0,top=0,width=1100,height=900,toolbar=0,scrollbars=0,status=0');
    winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Material Consumption Sheet - ${data?.metadata?.challanNumber || 'Challan'}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 5px; }
            .company-header { text-align: center; margin-bottom: 8px; }
            .company-title { font-size: 14px; font-weight: bold; }
            .sheet-title { text-align: center; font-size: 13px; font-weight: bold; margin: 6px 0 2px 0; text-decoration: underline; }
            .sheet-subtitle { text-align: center; font-size: 9px; font-style: italic; margin-bottom: 8px; }
            .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 10px; }
            .meta-grid td { padding: 2px 4px; vertical-align: top; }
            table.sheet-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9.5px; text-align: center; }
            table.sheet-table th, table.sheet-table td { border: 1px solid #000; padding: 3px 2px; }
            table.sheet-table th { background-color: #f2f2f2; font-weight: bold; }
            .row-label { text-align: left; font-weight: 600; padding-left: 4px !important; white-space: nowrap; }
            .num-cell { font-family: monospace; font-size: 9.5px; text-align: right; padding-right: 4px !important; }
            .summary-totals { margin-top: 15px; border-collapse: collapse; margin-left: auto; font-size: 9.5px; }
            .summary-totals td { border: 1px solid #000; padding: 2px 8px; font-family: monospace; text-align: right; }
            .sign-section { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    winPrint.document.close();
    winPrint.focus();
    setTimeout(() => {
      winPrint.print();
      winPrint.close();
    }, 250);
  };

  if (!data) return null;

  const { company, metadata, columns, dispatchDetails } = data;

  // Running totals across all columns
  const sumUsedEarlier = columns?.reduce((acc, c) => acc + (c.qtyUsedEarlier?.value || 0), 0) || 0;
  const sumUsedThis = columns?.reduce((acc, c) => acc + (c.qtyUsedThisAdvice?.value || 0), 0) || 0;
  const sumBalanceVal = columns?.reduce((acc, c) => acc + (c.balanceInHand?.value || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[94vh] overflow-y-auto bg-white p-0 border border-slate-300 shadow-2xl">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Material Consumption Sheet (Exact Image 2 Format)
              </DialogTitle>
              <p className="text-xs text-slate-400 font-mono">
                Challan Ref: {metadata?.challanNumber} • Date: {metadata?.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              {isEditing ? 'Cancel Edit' : 'Edit Values'}
            </Button>

            {isEditing && (
              <Button
                onClick={handleSaveSheet}
                disabled={saving}
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Adjustments'}
              </Button>
            )}

            <Button
              onClick={handlePrint}
              size="sm"
              className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Printable Document (Exact Match of Image 2) */}
        <div className="p-8 bg-white overflow-x-auto text-slate-900" ref={printRef}>
          {/* Header */}
          <div className="text-center pb-2">
            <p className="text-[11px] text-slate-700">{company?.address}</p>
            <p className="text-[11px] font-bold text-slate-900">
              GSTIN : {company?.gstin}, PAN NO. : {company?.pan}
            </p>
            <p className="text-[11px] font-bold text-slate-900">
              CIN NO. : {company?.cin}
            </p>

            <h2 className="text-sm font-black text-slate-900 tracking-wide mt-2 underline uppercase">
              Material Consumption Sheet
            </h2>
            <p className="text-[10px] text-slate-600 italic max-w-2xl mx-auto mt-0.5">
              (For return of goods, in more than one lot to the parent factory received partially processed / goods for further processing / operation under rule of GST on job basis.)
            </p>
          </div>

          {/* Challan & Date Header */}
          <div className="flex items-center justify-between font-bold text-xs border-y border-slate-800 py-1.5 my-2">
            <div>
              <span>Challan No.: </span>
              <span className="font-mono text-sm underline">{metadata?.challanNumber || 'MF/DC/408'}</span>
            </div>
            <div>
              <span>DATE : </span>
              <span className="font-mono">{metadata?.date || '17-08-2026'}</span>
            </div>
          </div>

          {/* Recipient & Job-Work Details Rows (1 to 6) */}
          <div className="space-y-1 text-xs mb-3 font-sans">
            <div className="flex">
              <span className="w-6 font-bold">1</span>
              <span className="w-64 font-semibold text-slate-800">Name & address of the Recipient</span>
              <div className="flex-1 font-bold">
                <p>{metadata?.recipientName}</p>
                <p className="text-[11px] font-normal text-slate-600">{metadata?.recipientAddress}</p>
              </div>
            </div>

            <div className="flex items-center">
              <span className="w-6 font-bold">2</span>
              <span className="w-64 font-semibold text-slate-800">Registration No. of the parent factory</span>
              <span className="font-bold font-mono text-slate-900">{metadata?.recipientGstin}</span>
            </div>

            <div className="flex items-center">
              <span className="w-6 font-bold">3</span>
              <span className="w-64 font-semibold text-slate-800">Nature of Process</span>
              <span className="font-medium text-slate-900">{metadata?.natureOfProcess}</span>
            </div>

            <div className="flex items-center">
              <span className="w-6 font-bold">4</span>
              <span className="w-64 font-semibold text-slate-800">Description of goods returned</span>
              <span className="font-bold font-mono text-slate-900 uppercase">{metadata?.descriptionOfGoodsReturned}</span>
            </div>

            <div className="flex items-center">
              <span className="w-6 font-bold">5</span>
              <span className="w-64 font-semibold text-slate-800">Dispatch Quantity in Kgs/Mtrs</span>
              <span className="font-bold font-mono text-slate-900">{metadata?.dispatchQuantity}</span>
            </div>

            <div className="flex items-center">
              <span className="w-6 font-bold">6</span>
              <span className="w-64 font-semibold text-slate-800">WO no and Date</span>
              <span className="font-bold font-mono text-slate-900">{metadata?.workOrderNumberAndDate}</span>
            </div>
          </div>

          {/* Grid Table of Inbound Raw Materials (Rows 7 to 19) */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[11px] text-center font-sans">
              <thead>
                {/* Row 7: Challan Ref No. & Date */}
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1.5 w-8 text-center font-bold">7</th>
                  <th className="border border-slate-900 p-1.5 text-left font-bold w-52">
                    Challan Ref.No. & Date
                  </th>
                  {columns?.map((c, i) => (
                    <th key={i} colSpan={2} className="border border-slate-900 p-1 text-[10px] font-mono font-bold bg-slate-100">
                      {c.challanRef}
                    </th>
                  ))}
                </tr>

                {/* Row 8: Description of Goods Received */}
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1 text-center font-bold">8</th>
                  <th className="border border-slate-900 p-1 text-left font-bold">
                    Description of goods received
                  </th>
                  {columns?.map((c, i) => (
                    <th key={i} colSpan={2} className="border border-slate-900 p-1 font-bold text-xs uppercase bg-amber-50/50">
                      {c.description}
                    </th>
                  ))}
                </tr>

                {/* Row 9: HSN */}
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1 text-center font-bold">9</th>
                  <th className="border border-slate-900 p-1 text-left font-bold">HSN</th>
                  {columns?.map((c, i) => (
                    <th key={i} colSpan={2} className="border border-slate-900 p-1 font-mono text-[11px]">
                      {c.hsn}
                    </th>
                  ))}
                </tr>

                {/* Tariff Classification Sub-Header */}
                <tr className="bg-slate-100 text-[10px] font-bold">
                  <th className="border border-slate-900 p-1 text-center font-bold">—</th>
                  <th className="border border-slate-900 p-1 text-left font-bold">
                    Tariff Classification
                  </th>
                  {columns?.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="border border-slate-900 p-1 w-20">Qty. (Kgs)</th>
                      <th className="border border-slate-900 p-1 w-24">Value (₹)</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Row 10: Originally Qty. Received */}
                <tr>
                  <td className="border border-slate-900 p-1 font-bold">10</td>
                  <td className="border border-slate-900 p-1 row-label">
                    Originally Qty. Received (In Kgs & Mtr)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell font-bold">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={c.originallyReceived?.qty}
                            onChange={(e) => handleCellChange(i, 'originallyReceived', 'qty', e.target.value)}
                            className="h-6 text-[10px] text-right font-mono p-1"
                          />
                        ) : (
                          c.originallyReceived?.qty?.toFixed(2)
                        )}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell">
                        {c.originallyReceived?.value?.toFixed(2)}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 11: Less Processing Loss */}
                <tr>
                  <td className="border border-slate-900 p-1 font-bold">11</td>
                  <td className="border border-slate-900 p-1 row-label text-slate-700">
                    Less Processing Loss (Kgs & Mtr)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={c.processingLoss?.qty}
                            onChange={(e) => handleCellChange(i, 'processingLoss', 'qty', e.target.value)}
                            className="h-6 text-[10px] text-right font-mono p-1"
                          />
                        ) : (
                          c.processingLoss?.qty?.toFixed(2) || '0.00'
                        )}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell">
                        {c.processingLoss?.value?.toFixed(2) || '0.00'}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 12: Net Quantity */}
                <tr className="bg-slate-50 font-semibold">
                  <td className="border border-slate-900 p-1 font-bold">12</td>
                  <td className="border border-slate-900 p-1 row-label">
                    Net Quantity of goods (Kgs & Mtr)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell font-bold text-slate-900">
                        {c.netQuantity?.qty?.toFixed(2)}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell">
                        {c.netQuantity?.value?.toFixed(2)}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 13: Qty. Used Earlier Advices */}
                <tr>
                  <td className="border border-slate-900 p-1 font-bold">13</td>
                  <td className="border border-slate-900 p-1 row-label text-slate-700">
                    Qty. Used Earlier Advices (Kgs & Mtr)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={c.qtyUsedEarlier?.qty}
                            onChange={(e) => handleCellChange(i, 'qtyUsedEarlier', 'qty', e.target.value)}
                            className="h-6 text-[10px] text-right font-mono p-1"
                          />
                        ) : (
                          c.qtyUsedEarlier?.qty?.toFixed(2) || '0.00'
                        )}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell">
                        {c.qtyUsedEarlier?.value?.toFixed(2) || '0.00'}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 14: Qty. Used under this Advice */}
                <tr className="bg-amber-50/60 font-bold">
                  <td className="border border-slate-900 p-1 font-bold">14</td>
                  <td className="border border-slate-900 p-1 row-label text-amber-900">
                    Qty. Used under this Advice (Kgs & Mtr)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell font-mono font-bold text-amber-950">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={c.qtyUsedThisAdvice?.qty}
                            onChange={(e) => handleCellChange(i, 'qtyUsedThisAdvice', 'qty', e.target.value)}
                            className="h-6 text-[10px] text-right font-mono p-1 border-amber-400"
                          />
                        ) : (
                          c.qtyUsedThisAdvice?.qty?.toFixed(2)
                        )}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell font-bold text-amber-950">
                        {c.qtyUsedThisAdvice?.value?.toFixed(2)}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 15: Balance Qty. In Hand */}
                <tr className="bg-emerald-50/70 font-bold">
                  <td className="border border-slate-900 p-1 font-bold">15</td>
                  <td className="border border-slate-900 p-1 row-label text-emerald-900">
                    Balance Qty. In Hand (Kgs & Mtr)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell font-mono font-black text-emerald-950">
                        {c.balanceInHand?.qty?.toFixed(2)}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell font-bold text-emerald-950">
                        {c.balanceInHand?.value?.toFixed(2)}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 16: Qty. Return */}
                <tr>
                  <td className="border border-slate-900 p-1 font-bold">16</td>
                  <td className="border border-slate-900 p-1 row-label text-slate-600">
                    Qty. Return (Kgs)
                  </td>
                  {columns?.map((c, i) => (
                    <React.Fragment key={i}>
                      <td className="border border-slate-900 p-1 num-cell">
                        {c.qtyReturn?.qty?.toFixed(2) || '0.00'}
                      </td>
                      <td className="border border-slate-900 p-1 num-cell">
                        {c.qtyReturn?.value?.toFixed(2) || '0.00'}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transport & Supply Details (Rows 17 to 19) */}
          <div className="grid grid-cols-2 gap-x-8 text-xs mt-3 border border-slate-900 p-3 font-sans">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-6 font-bold">17</span>
                <span className="w-36 font-semibold text-slate-700">Date of Dispatch :</span>
                <span className="font-mono font-bold text-slate-900">{dispatchDetails?.dateOfDispatch}</span>
              </div>
              <div className="flex">
                <span className="w-6 font-bold">18</span>
                <span className="w-36 font-semibold text-slate-700">Vehicle No. :</span>
                <span className="font-mono font-bold text-slate-900">{dispatchDetails?.vehicleNumber}</span>
              </div>
              <div className="flex">
                <span className="w-6 font-bold">19</span>
                <span className="w-36 font-semibold text-slate-700">Place of Supply :</span>
                <span className="font-bold text-slate-900">{dispatchDetails?.placeOfSupply}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex">
                <span className="w-20 font-semibold text-slate-700">Place :</span>
                <span className="font-bold text-slate-900">{dispatchDetails?.place || 'Chopanki'}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold text-slate-700">Date :</span>
                <span className="font-mono font-bold text-slate-900">{dispatchDetails?.date}</span>
              </div>
            </div>
          </div>

          {/* Remarks & Signatory */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between text-xs gap-4">
            <div className="max-w-md">
              <span className="font-semibold text-slate-700">Remarks : </span>
              <span className="text-slate-800 italic">{dispatchDetails?.remarks}</span>
            </div>

            <div className="text-right pr-6 font-bold">
              <p>{dispatchDetails?.authorizedSignatory || 'For MFOLKS INDUSTRIES PRIVATE LIMITED'}</p>
              <div className="h-12"></div>
              <p className="text-[11px] text-slate-500 font-medium">(Authorized Signatory)</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
