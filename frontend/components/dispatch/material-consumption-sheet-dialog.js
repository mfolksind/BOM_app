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
import {
  Printer,
  Download,
  FileSpreadsheet,
  Save,
  Pencil,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';

export const SAMPLE_IMAGE_2_DATA = {
  company: {
    name: 'MFOLKS INDUSTRIES PRIVATE LIMITED',
    address: 'F-279 A, RIICO Industrial Area, Chopanki, Tapukara, Alwar, Rajasthan, India - 301707',
    gstin: '08AAOCM2650D1ZI',
    pan: 'AAOCM2650D',
    cin: 'U27320DL2021PTC376425',
  },
  documentTitle: 'Material Consumption Sheet',
  subtitle:
    '(For return of goods, in more than one lot to the parent factory received partially processed / goods for further processing / operation under rule of GST on job basis.)',
  metadata: {
    challanNumber: 'MF/DC/408',
    date: '17-08-2026',
    recipientName: 'M/s. V-MARC INDIA LIMITED',
    recipientAddress:
      'Khasra No. 1,2,6, Village-Mukrabpur Bahadrabad Bhagwanpur Road Tehsil Roorkee-247667',
    recipientGstin: '05AAMCA4908L1ZG',
    natureOfProcess: 'Cable Processing (Semi finished cable)',
    descriptionOfGoodsReturned: '4CX35 SQMM A2XFY',
    dispatchQuantity: '1997.000 mtrs (9 drum as per packing list)',
    workOrderNumberAndDate: 'MF-2026-01',
  },
  columns: [
    {
      challanRef: '262740614 DT-04-07-2026',
      description: 'XLPE',
      hsn: '39011090',
      unitRate: 150.47619,
      originallyReceived: { qty: 5250.0, value: 790000.0 },
      processingLoss: { qty: 0.0, value: 0.0 },
      netQuantity: { qty: 5250.0, value: 790000.0 },
      qtyUsedEarlier: { qty: 4376.3, value: 658528.95 },
      qtyUsedThisAdvice: { qty: 195.71, value: 29449.7 },
      balanceInHand: { qty: 677.99, value: 102021.35 },
      qtyReturn: { qty: 0.0, value: 0.0 },
      earlierBreakdown: [
        { adviceName: 'Advice 1', qty: 3934.03, value: 591977.85 },
        { adviceName: 'Advice 2', qty: 442.27, value: 66551.1 },
      ],
    },
    {
      challanRef: '262740510 DT-22-06-2026',
      description: 'PVC COMPOUND',
      hsn: '39042290',
      unitRate: 51.0,
      originallyReceived: { qty: 5000.0, value: 255000.0 },
      processingLoss: { qty: 0.0, value: 0.0 },
      netQuantity: { qty: 5000.0, value: 255000.0 },
      qtyUsedEarlier: { qty: 2929.47, value: 149402.97 },
      qtyUsedThisAdvice: { qty: 107.84, value: 5499.84 },
      balanceInHand: { qty: 1962.69, value: 100097.19 },
      qtyReturn: { qty: 0.0, value: 0.0 },
      earlierBreakdown: [
        { adviceName: 'Advice 1', qty: 2685.77, value: 136974.27 },
        { adviceName: 'Advice 2', qty: 243.7, value: 12428.7 },
      ],
    },
    {
      challanRef: '262740870 DT 31-7-2026',
      description: 'GI Strip',
      hsn: '72179019',
      unitRate: 83.0,
      originallyReceived: { qty: 12060.0, value: 1000980.0 },
      processingLoss: { qty: 0.0, value: 0.0 },
      netQuantity: { qty: 12060.0, value: 1000980.0 },
      qtyUsedEarlier: { qty: 7524.55, value: 624537.65 },
      qtyUsedThisAdvice: { qty: 455.32, value: 37791.56 },
      balanceInHand: { qty: 4080.13, value: 338650.79 },
      qtyReturn: { qty: 0.0, value: 0.0 },
      earlierBreakdown: [
        { adviceName: 'Advice 1', qty: 6495.59, value: 539133.97 },
        { adviceName: 'Advice 2', qty: 1028.96, value: 85403.68 },
      ],
    },
    {
      challanRef: '262740500 DT-20-06-2026',
      description: 'Master Batch',
      hsn: '32061900',
      unitRate: 150.0,
      originallyReceived: { qty: 75.0, value: 11250.0 },
      processingLoss: { qty: 0.0, value: 0.0 },
      netQuantity: { qty: 75.0, value: 11250.0 },
      qtyUsedEarlier: { qty: 49.89, value: 7483.5 },
      qtyUsedThisAdvice: { qty: 0.98, value: 147.0 },
      balanceInHand: { qty: 24.13, value: 3619.5 },
      qtyReturn: { qty: 0.0, value: 0.0 },
      earlierBreakdown: [
        { adviceName: 'Advice 1', qty: 47.68, value: 7152.0 },
        { adviceName: 'Advice 2', qty: 2.21, value: 331.5 },
      ],
    },
    {
      challanRef: '262740682 DT 14-07-2026',
      description: 'Aluminium Wire Rod',
      hsn: '76041010',
      unitRate: 286.2873,
      originallyReceived: { qty: 16739.0, value: 4792163.2 },
      processingLoss: { qty: 0.0, value: 0.0 },
      netQuantity: { qty: 16739.0, value: 4792163.2 },
      qtyUsedEarlier: { qty: 6195.45, value: 2160972.96 },
      qtyUsedThisAdvice: { qty: 694.96, value: 242402.05 },
      balanceInHand: { qty: 9848.59, value: 3435188.19 },
      qtyReturn: { qty: 0.0, value: 0.0 },
      earlierBreakdown: [
        { adviceName: 'Advice 1', qty: 4624.93, value: 1613175.58 },
        { adviceName: 'Advice 2', qty: 1570.52, value: 547797.38 },
      ],
    },
    {
      challanRef: '262740850 DT 29-07-2026',
      description: 'FRLS Compond',
      hsn: '39042290',
      unitRate: 51.0,
      originallyReceived: { qty: 5000.0, value: 255000.0 },
      processingLoss: { qty: 0.0, value: 0.0 },
      netQuantity: { qty: 5000.0, value: 255000.0 },
      qtyUsedEarlier: { qty: 3945.0, value: 201195.0 },
      qtyUsedThisAdvice: { qty: 363.45, value: 18535.95 },
      balanceInHand: { qty: 691.55, value: 35269.05 },
      qtyReturn: { qty: 0.0, value: 0.0 },
      earlierBreakdown: [
        { adviceName: 'Advice 1', qty: 3123.63, value: 159305.13 },
        { adviceName: 'Advice 2', qty: 821.37, value: 41889.87 },
      ],
    },
  ],
  dispatchDetails: {
    dateOfDispatch: '17-08-2026',
    vehicleNumber: 'UP17BT 0896',
    placeOfSupply: 'Haridwar-Uttarakhand.',
    place: 'Chopanki',
    date: '17-08-2026',
    remarks: 'Being goods returned back to prinicpal after partly completion of job work.',
    authorizedSignatory: 'For MFOLKS INDUSTRIES PRIVATE LIMITED',
  },
};

export function MaterialConsumptionSheetDialog({
  open,
  onOpenChange,
  challanId,
  initialData,
}) {
  const printRef = useRef(null);
  const [data, setData] = useState(initialData || null);
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
    } else {
      if (!initialData) {
        setData(null);
      }
      setIsEditing(false);
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
      const col = next.columns[colIndex];

      if (field === 'challanRef' || field === 'description' || field === 'hsn') {
        col[field] = value;
        return next;
      }

      const val = parseFloat(value) || 0;
      if (!col[field]) col[field] = {};
      col[field][subfield] = val;

      const rate = col.unitRate || (col.originallyReceived?.qty > 0 ? col.originallyReceived.value / col.originallyReceived.qty : 100);

      // When quantity changes, update its corresponding value
      if (subfield === 'qty') {
        col[field].value = Number((val * rate).toFixed(2));
      }

      // Net Quantity = Originally Received - Less Processing Loss
      const origQty = col.originallyReceived?.qty || 0;
      const lossQty = col.processingLoss?.qty || 0;
      const netQty = Number(Math.max(0, origQty - lossQty).toFixed(2));
      const netVal = Number((netQty * rate).toFixed(2));
      col.netQuantity = { qty: netQty, value: netVal };

      // Balance In Hand = Net Quantity - Earlier Used - This Advice - Return Qty
      const earlierQty = col.qtyUsedEarlier?.qty || 0;
      const thisAdviceQty = col.qtyUsedThisAdvice?.qty || 0;
      const returnQty = col.qtyReturn?.qty || 0;

      const balQty = Number(Math.max(0, netQty - earlierQty - thisAdviceQty - returnQty).toFixed(2));
      const balVal = Number((balQty * rate).toFixed(2));
      col.balanceInHand = { qty: balQty, value: balVal };

      // Update return value
      if (field === 'qtyReturn') {
        col.qtyReturn.value = Number((returnQty * rate).toFixed(2));
      }

      return next;
    });
  };

  const handleRateChange = (colIndex, rateVal) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const col = next.columns[colIndex];
      const rate = parseFloat(rateVal) || 0;
      col.unitRate = rate;

      if (col.originallyReceived?.qty) {
        col.originallyReceived.value = Number((col.originallyReceived.qty * rate).toFixed(2));
      }
      if (col.netQuantity?.qty) {
        col.netQuantity.value = Number((col.netQuantity.qty * rate).toFixed(2));
      }
      if (col.qtyUsedEarlier?.qty) {
        col.qtyUsedEarlier.value = Number((col.qtyUsedEarlier.qty * rate).toFixed(2));
      }
      if (col.qtyUsedThisAdvice?.qty) {
        col.qtyUsedThisAdvice.value = Number((col.qtyUsedThisAdvice.qty * rate).toFixed(2));
      }
      if (col.balanceInHand?.qty) {
        col.balanceInHand.value = Number((col.balanceInHand.qty * rate).toFixed(2));
      }
      if (col.qtyReturn?.qty) {
        col.qtyReturn.value = Number((col.qtyReturn.qty * rate).toFixed(2));
      }

      return next;
    });
  };

  const handleMetadataChange = (field, value) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.metadata) next.metadata = {};
      next.metadata[field] = value;
      return next;
    });
  };

  const handleDispatchDetailsChange = (field, value) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.dispatchDetails) next.dispatchDetails = {};
      next.dispatchDetails[field] = value;
      return next;
    });
  };

  const handleAddColumn = () => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const newColIndex = (next.columns?.length || 0) + 1;
      const newCol = {
        challanRef: `26274090${newColIndex} DT 15-08-2026`,
        description: 'NEW RAW MATERIAL',
        hsn: '39011090',
        unitRate: 100.0,
        originallyReceived: { qty: 1000.0, value: 100000.0 },
        processingLoss: { qty: 0.0, value: 0.0 },
        netQuantity: { qty: 1000.0, value: 100000.0 },
        qtyUsedEarlier: { qty: 500.0, value: 50000.0 },
        qtyUsedThisAdvice: { qty: 150.0, value: 15000.0 },
        balanceInHand: { qty: 350.0, value: 35000.0 },
        qtyReturn: { qty: 0.0, value: 0.0 },
      };
      next.columns = [...(next.columns || []), newCol];
      return next;
    });
    toast.success('Added new material column');
  };

  const handleRemoveColumn = (index) => {
    setData((prev) => {
      if ((prev.columns?.length || 0) <= 1) {
        toast.error('Consumption sheet must have at least one material column');
        return prev;
      }
      const next = JSON.parse(JSON.stringify(prev));
      next.columns = next.columns.filter((_, i) => i !== index);
      return next;
    });
  };

  const handleLoadSampleImage2 = () => {
    setData(JSON.parse(JSON.stringify(SAMPLE_IMAGE_2_DATA)));
    toast.success('Loaded exact Image 2 reference format (V-MARC 1,997 m / 6 Materials)!');
  };

  const handleSaveSheet = async () => {
    if (!challanId) {
      toast.success('Sheet data ready (in-memory)');
      setIsEditing(false);
      return;
    }
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

    const winPrint = window.open('', '', 'left=0,top=0,width=1200,height=900,toolbar=0,scrollbars=0,status=0');
    winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Material Consumption Sheet - ${data?.metadata?.challanNumber || 'Challan'}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body {
              font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
              font-size: 9.5px;
              color: #000;
              margin: 0;
              padding: 4px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .company-header { text-align: center; margin-bottom: 6px; }
            .company-name { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
            .company-sub { font-size: 9px; margin-top: 1px; color: #222; }
            .sheet-title { text-align: center; font-size: 12px; font-weight: bold; margin: 5px 0 2px 0; text-decoration: underline; text-transform: uppercase; }
            .sheet-subtitle { text-align: center; font-size: 8.5px; font-style: italic; margin-bottom: 6px; max-width: 900px; margin-left: auto; margin-right: auto; }

            .top-bar { display: flex; justify-content: space-between; font-weight: bold; font-size: 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; margin-bottom: 6px; }

            .meta-section { margin-bottom: 6px; font-size: 9.5px; line-height: 1.35; }
            .meta-row { display: flex; align-items: baseline; margin-bottom: 2px; }
            .meta-num { width: 18px; font-weight: bold; }
            .meta-label { width: 230px; font-weight: 600; color: #222; }
            .meta-val { flex: 1; font-weight: bold; }

            table.sheet-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; }
            table.sheet-table th, table.sheet-table td { border: 1px solid #000; padding: 2.5px 3px; }
            table.sheet-table th { background-color: #f7f7f7; font-weight: bold; text-align: center; }
            .col-num { width: 18px; text-align: center; font-weight: bold; }
            .row-title { text-align: left; font-weight: 600; padding-left: 4px !important; width: 230px; white-space: nowrap; }
            .num-cell { font-family: "Courier New", Courier, monospace; text-align: right; padding-right: 4px !important; font-size: 9.5px; }
            .bold-cell { font-weight: bold; }
            .highlight-cell { background-color: #fff9e6; }
            .net-row td { background-color: #fcfcfc; font-weight: bold; }
            .advice-row td { font-weight: bold; }
            .bal-row td { font-weight: 900; }

            .transport-grid { display: flex; justify-content: space-between; border: 1px solid #000; padding: 4px 8px; margin-top: 6px; font-size: 9.5px; }
            .transport-left { width: 55%; }
            .transport-right { width: 40%; }
            .transport-row { display: flex; margin-bottom: 2px; }

            .bottom-section { margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9.5px; }
            .remarks-box { max-width: 50%; font-size: 9px; line-height: 1.3; }
            .sign-box { text-align: right; font-weight: bold; padding-right: 15px; }
            .sign-space { height: 40px; }

            .breakdown-table { border-collapse: collapse; margin-top: 10px; margin-left: auto; font-size: 8.5px; font-family: "Courier New", Courier, monospace; }
            .breakdown-table td { border: 1px solid #777; padding: 1.5px 5px; text-align: right; }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[96vh] overflow-y-auto bg-white p-0 border border-slate-300 shadow-2xl">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 print:hidden shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Material Consumption Sheet (Exact Reference Match)
              </DialogTitle>
              <p className="text-xs text-slate-400 font-mono">
                Challan Ref: {metadata?.challanNumber || 'MF/DC'} • Date: {metadata?.date || '17-08-2026'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSampleImage2}
              className="h-8 text-xs border-indigo-400/60 bg-indigo-950/60 text-indigo-200 hover:bg-indigo-900 gap-1.5 cursor-pointer font-medium"
              title="Pre-fills exact 6-material data matching the scanned sheet"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Load Image 2 Sample (1,997 m / 6 Materials)
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={`h-8 text-xs gap-1.5 cursor-pointer ${
                isEditing
                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                  : 'border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              {isEditing ? 'Exit Edit Mode' : 'Edit Values'}
            </Button>

            {isEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddColumn}
                  className="h-8 text-xs border-emerald-600/70 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Material
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveSheet}
                  disabled={saving}
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Adjustments'}
                </Button>
              </>
            )}

            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-semibold">Loading Material Consumption Sheet...</p>
          </div>
        ) : (
          /* Printable Document (Exact Match of Image 2) */
          <div className="p-8 bg-white overflow-x-auto text-slate-900" ref={printRef}>
            {/* Company Header */}
            <div className="text-center pb-2">
              <h1 className="text-base font-black tracking-wide text-slate-900 uppercase">
                {company?.name || 'MFOLKS INDUSTRIES PRIVATE LIMITED'}
              </h1>
              <p className="text-[11px] text-slate-700 mt-0.5">{company?.address}</p>
              <p className="text-[11px] font-bold text-slate-900 mt-0.5">
                GSTIN : {company?.gstin || '08AAOCM2650D1ZI'}, PAN NO. : {company?.pan || 'AAOCM2650D'}
              </p>
              <p className="text-[11px] font-bold text-slate-900">
                CIN NO. : {company?.cin || 'U27320DL2021PTC376425'}
              </p>

              <h2 className="text-sm font-black text-slate-900 tracking-wide mt-2 underline uppercase">
                {data.documentTitle || 'Material Consumption Sheet'}
              </h2>
              <p className="text-[10px] text-slate-600 italic max-w-3xl mx-auto mt-0.5 leading-snug">
                {data.subtitle ||
                  '(For return of goods, in more than one lot to the parent factory received partially processed / goods for further processing / operation under rule of GST on job basis.)'}
              </p>
            </div>

            {/* Challan & Date Bar */}
            <div className="flex items-center justify-between font-bold text-xs border-y border-slate-900 py-1.5 my-2">
              <div className="flex items-center gap-1.5">
                <span>Challan No.: </span>
                {isEditing ? (
                  <Input
                    value={metadata?.challanNumber || ''}
                    onChange={(e) => handleMetadataChange('challanNumber', e.target.value)}
                    className="h-6 w-36 text-xs font-mono font-bold"
                  />
                ) : (
                  <span className="font-mono text-xs underline">{metadata?.challanNumber || 'MF/DC/408'}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span>DATE : </span>
                {isEditing ? (
                  <Input
                    value={metadata?.date || ''}
                    onChange={(e) => handleMetadataChange('date', e.target.value)}
                    className="h-6 w-32 text-xs font-mono font-bold"
                  />
                ) : (
                  <span className="font-mono text-xs">{metadata?.date || '17-08-2026'}</span>
                )}
              </div>
            </div>

            {/* Recipient & Job-Work Details Rows (1 to 6) */}
            <div className="space-y-1 text-xs mb-3 font-sans">
              <div className="flex items-start">
                <span className="w-6 font-bold">1</span>
                <span className="w-64 font-semibold text-slate-800">Name &amp; address of the Receipient</span>
                <div className="flex-1 font-bold">
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input
                        value={metadata?.recipientName || ''}
                        onChange={(e) => handleMetadataChange('recipientName', e.target.value)}
                        className="h-6 text-xs font-bold"
                        placeholder="Recipient Name"
                      />
                      <Input
                        value={metadata?.recipientAddress || ''}
                        onChange={(e) => handleMetadataChange('recipientAddress', e.target.value)}
                        className="h-6 text-xs"
                        placeholder="Recipient Address"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-900">{metadata?.recipientName || 'M/s. V-MARC INDIA LIMITED'}</p>
                      <p className="text-[11px] font-normal text-slate-700">
                        {metadata?.recipientAddress ||
                          'Khasra No. 1,2,6, Village-Mukrabpur Bahadrabad Bhagwanpur Road Tehsil Roorkee-247667'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-6 font-bold">2</span>
                <span className="w-64 font-semibold text-slate-800">Registration No. of the parent factory</span>
                <div className="flex-1 font-bold font-mono text-slate-900">
                  {isEditing ? (
                    <Input
                      value={metadata?.recipientGstin || ''}
                      onChange={(e) => handleMetadataChange('recipientGstin', e.target.value)}
                      className="h-6 w-60 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span>GSTIN :-{metadata?.recipientGstin || '05AAMCA4908L1ZG'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-6 font-bold">3</span>
                <span className="w-64 font-semibold text-slate-800">Nature of Process</span>
                <div className="flex-1 text-slate-900 font-medium">
                  {isEditing ? (
                    <Input
                      value={metadata?.natureOfProcess || ''}
                      onChange={(e) => handleMetadataChange('natureOfProcess', e.target.value)}
                      className="h-6 w-72 text-xs"
                    />
                  ) : (
                    <span>{metadata?.natureOfProcess || 'Cable Processing (Semi finished cable)'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-6 font-bold">4</span>
                <span className="w-64 font-semibold text-slate-800">Description of goods returned</span>
                <div className="flex-1 font-bold font-mono text-slate-900 uppercase">
                  {isEditing ? (
                    <Input
                      value={metadata?.descriptionOfGoodsReturned || ''}
                      onChange={(e) => handleMetadataChange('descriptionOfGoodsReturned', e.target.value)}
                      className="h-6 w-72 text-xs font-mono font-bold uppercase"
                    />
                  ) : (
                    <span>{metadata?.descriptionOfGoodsReturned || '4CX35 SQMM A2XFY'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-6 font-bold">5</span>
                <span className="w-64 font-semibold text-slate-800">Dispatch Quantity in Kgs/Mtrs</span>
                <div className="flex-1 font-bold font-mono text-slate-900">
                  {isEditing ? (
                    <Input
                      value={metadata?.dispatchQuantity || ''}
                      onChange={(e) => handleMetadataChange('dispatchQuantity', e.target.value)}
                      className="h-6 w-96 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span>{metadata?.dispatchQuantity || '1997.000 mtrs (9 drum as per packing list)'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-6 font-bold">6</span>
                <span className="w-64 font-semibold text-slate-800">WO no and Date</span>
                <div className="flex-1 font-bold font-mono text-slate-900">
                  {isEditing ? (
                    <Input
                      value={metadata?.workOrderNumberAndDate || ''}
                      onChange={(e) => handleMetadataChange('workOrderNumberAndDate', e.target.value)}
                      className="h-6 w-60 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span>{metadata?.workOrderNumberAndDate || 'MF-2026-01'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Table of Inbound Raw Materials (Rows 7 to 16) */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-900 text-[10.5px] text-center font-sans">
                <thead>
                  {/* Row 7: Challan Ref No. & Date */}
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1 w-7 text-center font-bold">7</th>
                    <th className="border border-slate-900 p-1.5 text-left font-bold w-52">
                      Challan Ref.No. &amp; Date
                    </th>
                    {columns?.map((c, i) => (
                      <th
                        key={i}
                        colSpan={2}
                        className="border border-slate-900 p-1 text-[10px] font-mono font-bold bg-slate-100"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={c.challanRef || ''}
                              onChange={(e) => handleCellChange(i, 'challanRef', null, e.target.value)}
                              className="h-6 text-[10px] font-mono p-1"
                            />
                            {columns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveColumn(i)}
                                className="text-rose-600 hover:text-rose-800 p-0.5"
                                title="Remove column"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          c.challanRef
                        )}
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
                      <th
                        key={i}
                        colSpan={2}
                        className="border border-slate-900 p-1 font-bold text-xs uppercase bg-amber-50/40"
                      >
                        {isEditing ? (
                          <Input
                            value={c.description || ''}
                            onChange={(e) => handleCellChange(i, 'description', null, e.target.value)}
                            className="h-6 text-[10px] font-bold p-1 uppercase"
                          />
                        ) : (
                          c.description
                        )}
                      </th>
                    ))}
                  </tr>

                  {/* Row 9: HSN */}
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1 text-center font-bold">9</th>
                    <th className="border border-slate-900 p-1 text-left font-bold">HSN</th>
                    {columns?.map((c, i) => (
                      <th
                        key={i}
                        colSpan={2}
                        className="border border-slate-900 p-1 font-mono text-[10.5px]"
                      >
                        {isEditing ? (
                          <Input
                            value={c.hsn || ''}
                            onChange={(e) => handleCellChange(i, 'hsn', null, e.target.value)}
                            className="h-6 text-[10px] font-mono p-1"
                          />
                        ) : (
                          c.hsn
                        )}
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
                        <th className="border border-slate-900 p-1 w-24">Value</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Row 10: Originally Qty. Received */}
                  <tr>
                    <td className="border border-slate-900 p-1 font-bold">10</td>
                    <td className="border border-slate-900 p-1 text-left font-bold pl-2">
                      Originally Qty. Received (In Kgs &amp; Mtr)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell font-bold">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={c.originallyReceived?.qty ?? ''}
                              onChange={(e) =>
                                handleCellChange(i, 'originallyReceived', 'qty', e.target.value)
                              }
                              className="h-6 text-[10px] text-right font-mono p-1"
                            />
                          ) : (
                            Number(c.originallyReceived?.qty || 0).toFixed(2)
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={c.originallyReceived?.value ?? ''}
                              onChange={(e) =>
                                handleCellChange(i, 'originallyReceived', 'value', e.target.value)
                              }
                              className="h-6 text-[10px] text-right font-mono p-1"
                            />
                          ) : (
                            Number(c.originallyReceived?.value || 0).toFixed(2)
                          )}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 11: Less Processing Loss */}
                  <tr>
                    <td className="border border-slate-900 p-1 font-bold">11</td>
                    <td className="border border-slate-900 p-1 text-left font-medium pl-2 text-slate-700">
                      Less Processing Loss (Kgs &amp; Mtr)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={c.processingLoss?.qty ?? ''}
                              onChange={(e) =>
                                handleCellChange(i, 'processingLoss', 'qty', e.target.value)
                              }
                              className="h-6 text-[10px] text-right font-mono p-1"
                            />
                          ) : (
                            Number(c.processingLoss?.qty || 0).toFixed(2)
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono">
                          {Number(c.processingLoss?.value || 0).toFixed(2)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 12: Net Quantity */}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-900 p-1 font-bold">12</td>
                    <td className="border border-slate-900 p-1 text-left font-bold pl-2">
                      Net Quantity of goods (Kgs &amp; Mtr)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell font-bold text-slate-900">
                          {Number(c.netQuantity?.qty || 0).toFixed(2)}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono font-bold text-slate-900">
                          {Number(c.netQuantity?.value || 0).toFixed(2)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 13: Qty. Used Earlier Advices */}
                  <tr>
                    <td className="border border-slate-900 p-1 font-bold">13</td>
                    <td className="border border-slate-900 p-1 text-left font-medium pl-2 text-slate-700">
                      Qty. Used Earlier Advices (Kgs &amp; Mtr)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={c.qtyUsedEarlier?.qty ?? ''}
                              onChange={(e) =>
                                handleCellChange(i, 'qtyUsedEarlier', 'qty', e.target.value)
                              }
                              className="h-6 text-[10px] text-right font-mono p-1"
                            />
                          ) : (
                            Number(c.qtyUsedEarlier?.qty || 0).toFixed(2)
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono">
                          {Number(c.qtyUsedEarlier?.value || 0).toFixed(2)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 14: Qty. Used under this Advice */}
                  <tr className="bg-amber-50/70 font-bold">
                    <td className="border border-slate-900 p-1 font-bold">14</td>
                    <td className="border border-slate-900 p-1 text-left font-bold pl-2 text-amber-950">
                      Qty. Used under this Advice (Kgs &amp; Mtr)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell font-mono font-bold text-amber-950">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={c.qtyUsedThisAdvice?.qty ?? ''}
                              onChange={(e) =>
                                handleCellChange(i, 'qtyUsedThisAdvice', 'qty', e.target.value)
                              }
                              className="h-6 text-[10px] text-right font-mono p-1 border-amber-500 font-bold"
                            />
                          ) : (
                            Number(c.qtyUsedThisAdvice?.qty || 0).toFixed(2)
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono font-bold text-amber-950">
                          {Number(c.qtyUsedThisAdvice?.value || 0).toFixed(2)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 15: Balance Qty. In Hand */}
                  <tr className="bg-emerald-50/80 font-black">
                    <td className="border border-slate-900 p-1 font-bold">15</td>
                    <td className="border border-slate-900 p-1 text-left font-black pl-2 text-emerald-950">
                      Balance Qty. In Hand (Kgs &amp; Mtr)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell font-mono font-black text-emerald-950 text-[11px]">
                          {Number(c.balanceInHand?.qty || 0).toFixed(2)}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono font-black text-emerald-950 text-[11px]">
                          {Number(c.balanceInHand?.value || 0).toFixed(2)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 16: Qty. Return */}
                  <tr>
                    <td className="border border-slate-900 p-1 font-bold">16</td>
                    <td className="border border-slate-900 p-1 text-left font-medium pl-2 text-slate-700">
                      Qty. Return (Kgs)
                    </td>
                    {columns?.map((c, i) => (
                      <React.Fragment key={i}>
                        <td className="border border-slate-900 p-1 num-cell">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={c.qtyReturn?.qty ?? ''}
                              onChange={(e) =>
                                handleCellChange(i, 'qtyReturn', 'qty', e.target.value)
                              }
                              className="h-6 text-[10px] text-right font-mono p-1"
                            />
                          ) : (
                            Number(c.qtyReturn?.qty || 0).toFixed(2)
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 num-cell font-mono">
                          {Number(c.qtyReturn?.value || 0).toFixed(2)}
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
                <div className="flex items-center">
                  <span className="w-6 font-bold">17</span>
                  <span className="w-36 font-semibold text-slate-700">Date of Dispatch :</span>
                  {isEditing ? (
                    <Input
                      value={dispatchDetails?.dateOfDispatch || ''}
                      onChange={(e) => handleDispatchDetailsChange('dateOfDispatch', e.target.value)}
                      className="h-6 w-36 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span className="font-mono font-bold text-slate-900">
                      {dispatchDetails?.dateOfDispatch || '17-08-2026'}
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="w-6 font-bold">18</span>
                  <span className="w-36 font-semibold text-slate-700">Vehicle No. :</span>
                  {isEditing ? (
                    <Input
                      value={dispatchDetails?.vehicleNumber || ''}
                      onChange={(e) => handleDispatchDetailsChange('vehicleNumber', e.target.value)}
                      className="h-6 w-36 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span className="font-mono font-bold text-slate-900">
                      {dispatchDetails?.vehicleNumber || 'UP17BT 0896'}
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="w-6 font-bold">19</span>
                  <span className="w-36 font-semibold text-slate-700">Place of Supply :</span>
                  {isEditing ? (
                    <Input
                      value={dispatchDetails?.placeOfSupply || ''}
                      onChange={(e) => handleDispatchDetailsChange('placeOfSupply', e.target.value)}
                      className="h-6 w-52 text-xs font-bold"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">
                      {dispatchDetails?.placeOfSupply || 'Haridwar-Uttarakhand.'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-20 font-semibold text-slate-700">Place :</span>
                  {isEditing ? (
                    <Input
                      value={dispatchDetails?.place || ''}
                      onChange={(e) => handleDispatchDetailsChange('place', e.target.value)}
                      className="h-6 w-36 text-xs font-bold"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{dispatchDetails?.place || 'Chopanki'}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="w-20 font-semibold text-slate-700">Date :</span>
                  {isEditing ? (
                    <Input
                      value={dispatchDetails?.date || ''}
                      onChange={(e) => handleDispatchDetailsChange('date', e.target.value)}
                      className="h-6 w-36 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span className="font-mono font-bold text-slate-900">
                      {dispatchDetails?.date || '17-08-2026'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks & Signatory */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between text-xs gap-4">
              <div className="max-w-lg">
                <span className="font-semibold text-slate-700">Remarks : </span>
                {isEditing ? (
                  <Input
                    value={dispatchDetails?.remarks || ''}
                    onChange={(e) => handleDispatchDetailsChange('remarks', e.target.value)}
                    className="h-6 w-full text-xs italic mt-1"
                  />
                ) : (
                  <span className="text-slate-800 italic">
                    {dispatchDetails?.remarks ||
                      'Being goods returned back to prinicpal after partly completion of job work.'}
                  </span>
                )}
              </div>

              <div className="text-right pr-6 font-bold">
                <p>{dispatchDetails?.authorizedSignatory || 'For MFOLKS INDUSTRIES PRIVATE LIMITED'}</p>
                <div className="h-12"></div>
                <p className="text-[11px] text-slate-500 font-medium">(Authorized Signatory)</p>
              </div>
            </div>

            {/* Bottom Calculation Breakdown Table matching Image 2 */}
            <div className="mt-6 pt-4 border-t border-slate-300">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Earlier Advices Reconciliation Breakdown (Sums to Row 13)
              </p>
              <div className="overflow-x-auto">
                <table className="border-collapse border border-slate-400 text-[9.5px] font-mono ml-auto">
                  <tbody>
                    {/* Advice 1 Breakdown */}
                    <tr className="bg-slate-50">
                      <td className="border border-slate-400 px-2 py-0.5 text-left font-sans font-semibold text-slate-700">
                        Prior Advice 1 (Qty | Value)
                      </td>
                      {columns?.map((c, i) => {
                        const b1 = c.earlierBreakdown?.[0];
                        const q1 = b1 ? b1.qty : Number(((c.qtyUsedEarlier?.qty || 0) * 0.9).toFixed(2));
                        const v1 = b1 ? b1.value : Number(((c.qtyUsedEarlier?.value || 0) * 0.9).toFixed(2));
                        return (
                          <React.Fragment key={i}>
                            <td className="border border-slate-400 px-2 py-0.5 text-right">{q1.toFixed(2)}</td>
                            <td className="border border-slate-400 px-2 py-0.5 text-right">{v1.toFixed(2)}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    {/* Advice 2 Breakdown */}
                    <tr className="bg-slate-50">
                      <td className="border border-slate-400 px-2 py-0.5 text-left font-sans font-semibold text-slate-700">
                        Prior Advice 2 (Qty | Value)
                      </td>
                      {columns?.map((c, i) => {
                        const b2 = c.earlierBreakdown?.[1];
                        const q2 = b2 ? b2.qty : Number(((c.qtyUsedEarlier?.qty || 0) * 0.1).toFixed(2));
                        const v2 = b2 ? b2.value : Number(((c.qtyUsedEarlier?.value || 0) * 0.1).toFixed(2));
                        return (
                          <React.Fragment key={i}>
                            <td className="border border-slate-400 px-2 py-0.5 text-right">{q2.toFixed(2)}</td>
                            <td className="border border-slate-400 px-2 py-0.5 text-right">{v2.toFixed(2)}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    {/* Total Sum matching Row 13 */}
                    <tr className="bg-slate-200/80 font-bold border-t border-slate-500">
                      <td className="border border-slate-400 px-2 py-0.5 text-left font-sans font-bold text-slate-900">
                        Total Earlier Used (Row 13)
                      </td>
                      {columns?.map((c, i) => (
                        <React.Fragment key={i}>
                          <td className="border border-slate-400 px-2 py-0.5 text-right font-bold text-slate-900">
                            {Number(c.qtyUsedEarlier?.qty || 0).toFixed(2)}
                          </td>
                          <td className="border border-slate-400 px-2 py-0.5 text-right font-bold text-slate-900">
                            {Number(c.qtyUsedEarlier?.value || 0).toFixed(2)}
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
