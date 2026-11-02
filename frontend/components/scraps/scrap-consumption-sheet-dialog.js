"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Download, FileSpreadsheet, Save, Pencil, CheckCircle2, Plus, Trash2, RefreshCw, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";

export function ScrapConsumptionSheetDialog({ open, onOpenChange, challanId, initialData }) {
    const printRef = useRef(null);
    const [data, setData] = useState(initialData || null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const groupColumnsByMaterial = (cols) => {
        if (!Array.isArray(cols) || cols.length <= 1) return cols;
        const groups = new Map();
        for (const col of cols) {
            const key = (col.description || "").trim().toLowerCase();
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(col);
        }
        const grouped = [];
        for (const group of groups.values()) {
            grouped.push(...group);
        }
        return grouped;
    };

    useEffect(() => {
        if (open) {
            if (initialData) {
                const sorted = {
                    ...initialData,
                    columns: groupColumnsByMaterial(initialData.columns),
                };
                setData(sorted);
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
            const res = await api.get(`/outbound-challans/scrap/${challanId}/consumption-sheet`);
            if (res?.data) {
                const sheetData = res.data;
                if (Array.isArray(sheetData.columns)) {
                    sheetData.columns = groupColumnsByMaterial(sheetData.columns);
                }
                setData(sheetData);
            }
        } catch (err) {
            toast.error(err.message || "Failed to load Material Consumption Sheet");
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = (colIndex, field, subfield, value) => {
        setData((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const col = next.columns[colIndex];

            if (field === "challanRef" || field === "description" || field === "hsn") {
                col[field] = value;
                return next;
            }

            const val = parseFloat(value) || 0;
            if (!col[field]) col[field] = {};
            col[field][subfield] = val;

            const rate =
                col.unitRate || (col.originallyReceived?.qty > 0 ? col.originallyReceived.value / col.originallyReceived.qty : 100);

            if (subfield === "qty") {
                col[field].value = Number((val * rate).toFixed(2));
            }

            const origQty = col.originallyReceived?.qty || 0;
            const lossQty = col.processingLoss?.qty || 0;
            const netQty = Number(Math.max(0, origQty - lossQty).toFixed(2));
            const netVal = Number((netQty * rate).toFixed(2));
            col.netQuantity = { qty: netQty, value: netVal };

            // In Scrap Return: Qty Used Earlier + Qty Return (Scrap) deducted from Net Quantity
            const earlierQty = col.qtyUsedEarlier?.qty || 0;
            const thisAdviceQty = col.qtyUsedThisAdvice?.qty || 0; // should be 0
            const returnQty = col.qtyReturn?.qty || 0;

            const balQty = Number((netQty - earlierQty - thisAdviceQty - returnQty).toFixed(2));
            const balVal = Number((balQty * rate).toFixed(2));
            col.balanceInHand = { qty: balQty, value: balVal };

            if (field === "qtyReturn") {
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
            const newCol = {
                challanRef: "MANUAL LOT",
                description: "NEW SCRAP MATERIAL",
                hsn: "39011090",
                unitRate: 100,
                originallyReceived: { qty: 0, value: 0 },
                processingLoss: { qty: 0, value: 0 },
                netQuantity: { qty: 0, value: 0 },
                qtyUsedEarlier: { qty: 0, value: 0 },
                qtyUsedThisAdvice: { qty: 0, value: 0 },
                balanceInHand: { qty: 0, value: 0 },
                qtyReturn: { qty: 0, value: 0 },
            };
            next.columns.push(newCol);
            return next;
        });
    };

    const handleRemoveColumn = (colIndex) => {
        if (!confirm("Remove this material column from the sheet?")) return;
        setData((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.columns.splice(colIndex, 1);
            return next;
        });
    };

    const handleSaveSheet = async () => {
        if (!challanId) {
            toast.error("Cannot save: No Challan ID available");
            return;
        }
        setSaving(true);
        try {
            await api.put(`/outbound-challans/scrap/${challanId}/consumption-sheet`, data);
            toast.success("Material Consumption Sheet saved successfully!");
            setIsEditing(false);
        } catch (err) {
            toast.error(err.message || "Failed to save Consumption Sheet adjustments");
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        if (!printRef.current) return;
        const printContents = printRef.current.innerHTML;
        const win = window.open("", "_blank", "width=1200,height=900");
        if (!win) {
            toast.error("Popup blocked! Please allow popups to print/save PDF.");
            return;
        }

        win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data?.documentTitle || "Material Consumption Sheet (Scrap Return)"} - ${data?.metadata?.challanNumber || "Challan"}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000;
              font-size: 10.5px;
            }
            th, td {
              border: 1px solid #000;
              padding: 3px 5px;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: monospace; }
            .uppercase { text-transform: uppercase; }
            .underline { text-decoration: underline; }
            .bg-yellow { background-color: #fef3c7 !important; }
            .bg-green { background-color: #d1fae5 !important; }
            .bg-gray { background-color: #f3f4f6 !important; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
        win.document.close();
    };

    if (!data) return null;

    const { company, metadata, columns = [], dispatchDetails } = data;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[96vw] lg:max-w-[1300px] max-h-[92vh] overflow-y-auto bg-white p-0 rounded-xl shadow-2xl border border-slate-200">
                <DialogHeader className="sr-only">
                    <DialogTitle>{data.documentTitle || "Material Consumption Sheet (Scrap Return)"}</DialogTitle>
                </DialogHeader>

                {/* Sticky Action Toolbar */}
                <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white shadow-md rounded-t-xl">
                    <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        <div>
                            <span className="text-xs font-bold tracking-wide uppercase block">
                                {data.documentTitle || "Material Consumption Sheet (Scrap Return)"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                Challan No: {metadata?.challanNumber} • Date: {metadata?.date}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                            className="h-8 text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5 cursor-pointer"
                        >
                            <Pencil className="w-3.5 h-3.5 text-amber-400" />
                            {isEditing ? "Exit Edit Mode" : "Edit / Adjust Cells"}
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
                                    {saving ? "Saving..." : "Save Adjustments"}
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
                    <div>
                        {/* Printable Document (Exact Match of Image 2) */}
                        <div className="p-8 bg-white overflow-x-auto text-slate-900" ref={printRef}>
                            {/* Company Header */}
                            <div className="text-center pb-2">
                                <h1 className="text-base font-black tracking-wide text-slate-900 uppercase">
                                    {company?.name || "MFOLKS INDUSTRIES PRIVATE LIMITED"}
                                </h1>
                                <p className="text-[11px] text-slate-700 mt-0.5">{company?.address}</p>
                                <p className="text-[11px] font-bold text-slate-900 mt-0.5">
                                    GSTIN : {company?.gstin || "08AAOCM2650D1ZI"}, PAN NO. : {company?.pan || "AAOCM2650D"}
                                </p>
                                <p className="text-[11px] font-bold text-slate-900">CIN NO. : {company?.cin || "U27320DL2021PTC376425"}</p>

                                <h2 className="text-sm font-black text-slate-900 tracking-wide mt-2 underline uppercase">
                                    {data.documentTitle || "Material Consumption Sheet (Scrap Return)"}
                                </h2>
                                <p className="text-[10px] text-slate-600 italic max-w-3xl mx-auto mt-0.5 leading-snug">
                                    {data.subtitle ||
                                        "(For return of scrap goods / process waste to parent factory under GST rule on job work basis.)"}
                                </p>
                            </div>

                            {/* Challan & Date Bar */}
                            <div className="flex items-center justify-between font-bold text-xs border-y border-slate-900 py-1.5 my-2">
                                <div className="flex items-center gap-1.5">
                                    <span>Challan No.: </span>
                                    {isEditing ? (
                                        <Input
                                            value={metadata?.challanNumber || ""}
                                            onChange={(e) => handleMetadataChange("challanNumber", e.target.value)}
                                            className="h-6 w-36 text-xs font-mono font-bold"
                                        />
                                    ) : (
                                        <span className="font-mono text-xs underline">{metadata?.challanNumber}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span>DATE : </span>
                                    {isEditing ? (
                                        <Input
                                            value={metadata?.date || ""}
                                            onChange={(e) => handleMetadataChange("date", e.target.value)}
                                            className="h-6 w-32 text-xs font-mono font-bold"
                                        />
                                    ) : (
                                        <span className="font-mono text-xs">{metadata?.date}</span>
                                    )}
                                </div>
                            </div>

                            {/* Recipient Details */}
                            <div className="space-y-1 text-xs mb-3 font-sans">
                                <div className="flex items-start">
                                    <span className="w-64 font-semibold text-slate-800">Name &amp; address of the Receipient</span>
                                    <div className="flex-1 font-bold">
                                        {isEditing ? (
                                            <div className="space-y-1">
                                                <Input
                                                    value={metadata?.recipientName || ""}
                                                    onChange={(e) => handleMetadataChange("recipientName", e.target.value)}
                                                    className="h-6 text-xs font-bold"
                                                />
                                                <Input
                                                    value={metadata?.recipientAddress || ""}
                                                    onChange={(e) => handleMetadataChange("recipientAddress", e.target.value)}
                                                    className="h-6 text-xs"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div>{metadata?.recipientName}</div>
                                                <div className="font-normal text-slate-700">{metadata?.recipientAddress}</div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">GSTIN OF RECEIPIENT</span>
                                    <div className="flex-1 font-bold font-mono">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.recipientGstin || ""}
                                                onChange={(e) => handleMetadataChange("recipientGstin", e.target.value)}
                                                className="h-6 w-52 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.recipientGstin}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Nature of processing/operation</span>
                                    <div className="flex-1 font-bold">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.natureOfProcess || ""}
                                                onChange={(e) => handleMetadataChange("natureOfProcess", e.target.value)}
                                                className="h-6 w-96 text-xs font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.natureOfProcess}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Description of goods returned</span>
                                    <div className="flex-1 font-bold font-mono text-slate-900">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.descriptionOfGoodsReturned || ""}
                                                onChange={(e) => handleMetadataChange("descriptionOfGoodsReturned", e.target.value)}
                                                className="h-6 w-96 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.descriptionOfGoodsReturned}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Return Quantity in Kgs</span>
                                    <div className="flex-1 font-bold font-mono text-slate-900">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.dispatchQuantity || ""}
                                                onChange={(e) => handleMetadataChange("dispatchQuantity", e.target.value)}
                                                className="h-6 w-96 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.dispatchQuantity}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">WO no and Date</span>
                                    <div className="flex-1 font-bold font-mono text-slate-900">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.workOrderNumberAndDate || ""}
                                                onChange={(e) => handleMetadataChange("workOrderNumberAndDate", e.target.value)}
                                                className="h-6 w-80 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.workOrderNumberAndDate}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grid Table of Inbound Raw Materials */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-900 text-[10.5px] text-center font-sans">
                                    <thead>
                                        {/* Challan Ref No. & Date */}
                                        <tr className="bg-slate-50">
                                            <th className="border border-slate-900 p-1.5 text-left font-bold w-56">
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
                                                                value={c.challanRef || ""}
                                                                onChange={(e) => handleCellChange(i, "challanRef", null, e.target.value)}
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

                                        {/* Description of Goods Received */}
                                        <tr className="bg-slate-50">
                                            <th className="border border-slate-900 p-1.5 text-left font-bold">
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
                                                            value={c.description || ""}
                                                            onChange={(e) => handleCellChange(i, "description", null, e.target.value)}
                                                            className="h-6 text-[10px] font-bold p-1 uppercase"
                                                        />
                                                    ) : (
                                                        c.description
                                                    )}
                                                </th>
                                            ))}
                                        </tr>

                                        {/* HSN */}
                                        <tr className="bg-slate-50">
                                            <th className="border border-slate-900 p-1.5 text-left font-bold">HSN</th>
                                            {columns?.map((c, i) => (
                                                <th key={i} colSpan={2} className="border border-slate-900 p-1 font-mono text-[10.5px]">
                                                    {isEditing ? (
                                                        <Input
                                                            value={c.hsn || ""}
                                                            onChange={(e) => handleCellChange(i, "hsn", null, e.target.value)}
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
                                            <th className="border border-slate-900 p-1 text-left font-bold">Tariff Classification</th>
                                            {columns?.map((_, i) => (
                                                <React.Fragment key={i}>
                                                    <th className="border border-slate-900 p-1 w-20">Qty. (Kgs)</th>
                                                    <th className="border border-slate-900 p-1 w-24">Value</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {/* Originally Qty. Received */}
                                        <tr>
                                            <td className="border border-slate-900 p-1 text-left font-bold pl-2">
                                                Originally Qty. Received (In Kgs)
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell font-bold">
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={c.originallyReceived?.qty ?? ""}
                                                                onChange={(e) =>
                                                                    handleCellChange(i, "originallyReceived", "qty", e.target.value)
                                                                }
                                                                className="h-6 text-[10px] text-right font-mono p-1"
                                                            />
                                                        ) : (
                                                            Number(c.originallyReceived?.qty || 0).toFixed(2)
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono">
                                                        {Number(c.originallyReceived?.value || 0).toFixed(2)}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>

                                        {/* Less Processing Loss */}
                                        <tr>
                                            <td className="border border-slate-900 p-1 text-left font-medium pl-2 text-slate-700">
                                                Less Processing Loss (Kgs)
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell">
                                                        {Number(c.processingLoss?.qty || 0).toFixed(2)}
                                                    </td>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono">
                                                        {Number(c.processingLoss?.value || 0).toFixed(2)}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>

                                        {/* Net Quantity */}
                                        <tr className="bg-slate-50 font-bold">
                                            <td className="border border-slate-900 p-1 text-left font-bold pl-2">
                                                Net Quantity of goods (Kgs)
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

                                        {/* Qty. Used Earlier Advices */}
                                        <tr>
                                            <td className="border border-slate-900 p-1 text-left font-medium pl-2 text-slate-700">
                                                Qty. Used Earlier Advices (Kgs)
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell">
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={c.qtyUsedEarlier?.qty ?? ""}
                                                                onChange={(e) =>
                                                                    handleCellChange(i, "qtyUsedEarlier", "qty", e.target.value)
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

                                        {/* Qty. Used under this Advice (Always 0.00 for Scrap Return) */}
                                        <tr className="bg-slate-50 font-medium">
                                            <td className="border border-slate-900 p-1 text-left pl-2 text-slate-600">
                                                Qty. Used under this Advice (In Kgs)
                                                <span className="block text-[9px] text-slate-500 font-normal">
                                                    (0.00 - Scrap Return Challan)
                                                </span>
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono text-slate-500">
                                                        {Number(c.qtyUsedThisAdvice?.qty || 0).toFixed(2)}
                                                    </td>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono text-slate-500">
                                                        {Number(c.qtyUsedThisAdvice?.value || 0).toFixed(2)}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>

                                        {/* Balance Qty. In Hand */}
                                        <tr className="bg-emerald-50/80 font-black">
                                            <td className="border border-slate-900 p-1 text-left font-black pl-2 text-emerald-950">
                                                Balance Qty. In Hand (Kgs)
                                            </td>
                                            {columns?.map((c, i) => {
                                                const isNegative = Number(c.balanceInHand?.qty || 0) < 0;
                                                return (
                                                    <React.Fragment key={i}>
                                                        <td
                                                            className={`border border-slate-900 p-1 num-cell font-mono font-black text-[11px] ${
                                                                isNegative ? "bg-rose-100 text-rose-700 font-extrabold" : "text-emerald-950"
                                                            }`}
                                                        >
                                                            {Number(c.balanceInHand?.qty || 0).toFixed(2)}
                                                        </td>
                                                        <td
                                                            className={`border border-slate-900 p-1 num-cell font-mono font-black text-[11px] ${
                                                                isNegative ? "bg-rose-100 text-rose-700 font-extrabold" : "text-emerald-950"
                                                            }`}
                                                        >
                                                            {Number(c.balanceInHand?.value || 0).toFixed(2)}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>

                                        {/* Qty. Return (Scrap Return Highlighted in Amber) */}
                                        <tr className="bg-amber-50/80 font-black">
                                            <td className="border border-slate-900 p-1 text-left font-black pl-2 text-amber-950">
                                                Qty. Return (Scrap / Waste in Kgs)
                                                <span className="block text-[9px] text-amber-800 font-normal">
                                                    (Job-Work Scrap Return to Principal)
                                                </span>
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono font-black text-amber-950">
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={c.qtyReturn?.qty ?? ""}
                                                                onChange={(e) => handleCellChange(i, "qtyReturn", "qty", e.target.value)}
                                                                className="h-6 text-[10px] text-right font-mono p-1 border-amber-500 font-bold"
                                                            />
                                                        ) : (
                                                            Number(c.qtyReturn?.qty || 0).toFixed(2)
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono font-black text-amber-950">
                                                        {Number(c.qtyReturn?.value || 0).toFixed(2)}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Transport & Supply Details */}
                            <div className="grid grid-cols-2 gap-x-8 text-xs mt-3 border border-slate-900 p-3 font-sans">
                                <div className="space-y-1">
                                    <div className="flex items-center">
                                        <span className="w-36 font-semibold text-slate-700">Date of Dispatch :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.dateOfDispatch || ""}
                                                onChange={(e) => handleDispatchDetailsChange("dateOfDispatch", e.target.value)}
                                                className="h-6 w-36 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span className="font-mono font-bold text-slate-900">
                                                {dispatchDetails?.dateOfDispatch}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-36 font-semibold text-slate-700">Vehicle No. :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.vehicleNumber || ""}
                                                onChange={(e) => handleDispatchDetailsChange("vehicleNumber", e.target.value)}
                                                className="h-6 w-44 text-xs font-mono font-bold uppercase"
                                            />
                                        ) : (
                                            <span className="font-mono font-bold text-slate-900">
                                                {dispatchDetails?.vehicleNumber}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-36 font-semibold text-slate-700">Place of Supply :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.placeOfSupply || ""}
                                                onChange={(e) => handleDispatchDetailsChange("placeOfSupply", e.target.value)}
                                                className="h-6 w-52 text-xs"
                                            />
                                        ) : (
                                            <span>{dispatchDetails?.placeOfSupply}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center">
                                        <span className="w-24 font-semibold text-slate-700">Place :</span>
                                        <span className="font-semibold text-slate-900">{dispatchDetails?.place || "Chopanki"}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-24 font-semibold text-slate-700">Date :</span>
                                        <span className="font-mono font-bold text-slate-900">{dispatchDetails?.date}</span>
                                    </div>
                                    <div className="pt-4 text-right">
                                        <span className="font-bold text-slate-900 text-xs block">
                                            {dispatchDetails?.authorizedSignatory || "For MFOLKS INDUSTRIES PRIVATE LIMITED"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-6">
                                            (Authorized Signatory / Plant Incharge)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
