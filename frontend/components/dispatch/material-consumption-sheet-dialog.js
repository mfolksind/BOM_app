"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Download, FileSpreadsheet, Save, Pencil, CheckCircle2, Plus, Trash2, RefreshCw, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";

export function MaterialConsumptionSheetDialog({ open, onOpenChange, challanId, initialData }) {
    const printRef = useRef(null);
    const [data, setData] = useState(initialData || null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isReturningScrap, setIsReturningScrap] = useState(false);

    // Helper to group columns so all challans of the same product/material appear adjacent to each other
    const groupColumnsByMaterial = (cols) => {
        if (!Array.isArray(cols) || cols.length <= 1) return cols;
        // Stable group by description / material name, keeping challans of the same product contiguous
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

    // Toggle returning scrap for customer
    const handleToggleReturnScrap = (returning) => {
        setIsReturningScrap(returning);
        setData((prev) => {
            if (!prev || !Array.isArray(prev.columns)) return prev;
            const next = JSON.parse(JSON.stringify(prev));
            next.columns = next.columns.map((col) => {
                const rate =
                    col.unitRate || (col.originallyReceived?.qty > 0 ? col.originallyReceived.value / col.originallyReceived.qty : 100);
                const netQty = col.netQuantity?.qty || 0;
                const earlierQty = col.qtyUsedEarlier?.qty || 0;
                const thisAdviceQty = col.qtyUsedThisAdvice?.qty || 0;

                let returnQty = 0;
                if (returning) {
                    if (Number(col.scrapQuantity || 0) > 0) {
                        returnQty = Number(col.scrapQuantity);
                    } else {
                        // scrap percentage calculation from total used quantity (gross = net * (1 + scrapPct/100))
                        const scrapPct = Number(col.scrapPercentage || 2.5);
                        returnQty = Number((thisAdviceQty * (scrapPct / (100 + scrapPct))).toFixed(2));
                    }
                }

                const returnVal = Number((returnQty * rate).toFixed(2));
                // Balance in hand is the remaining unused raw material in parent factory's challan:
                // Net Quantity - Earlier Used - This Advice.
                // Qty Return represents the scrap generated from this advice returned back to the customer.
                const balQty = Number((netQty - earlierQty - thisAdviceQty).toFixed(2));
                const balVal = Number((balQty * rate).toFixed(2));

                return {
                    ...col,
                    qtyReturn: { qty: returnQty, value: returnVal },
                    balanceInHand: { qty: balQty, value: balVal },
                };
            });
            return next;
        });
        toast.info(returning ? "Scrap Return enabled: showing returned scrap quantities" : "Scrap Return disabled: return quantities set to 0");
    };

    useEffect(() => {
        if (open) {
            if (initialData) {
                const sorted = {
                    ...initialData,
                    columns: groupColumnsByMaterial(initialData.columns),
                };
                setData(sorted);
                const hasReturn = sorted.columns?.some((c) => Number(c.qtyReturn?.qty || 0) > 0);
                setIsReturningScrap(Boolean(hasReturn));
            } else if (challanId) {
                fetchSheetData();
            }
        } else {
            if (!initialData) {
                setData(null);
            }
            setIsEditing(false);
            setIsReturningScrap(false);
        }
    }, [open, challanId, initialData]);

    const fetchSheetData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/outbound-challans/${challanId}/consumption-sheet`);
            if (res?.data) {
                const sheetData = res.data;
                if (Array.isArray(sheetData.columns)) {
                    sheetData.columns = groupColumnsByMaterial(sheetData.columns);
                }
                setData(sheetData);
                const hasReturn = sheetData.columns?.some((c) => Number(c.qtyReturn?.qty || 0) > 0);
                setIsReturningScrap(Boolean(hasReturn));
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

            // When quantity changes, update its corresponding value
            if (subfield === "qty") {
                col[field].value = Number((val * rate).toFixed(2));
            }

            // Net Quantity = Originally Received - Less Processing Loss
            const origQty = col.originallyReceived?.qty || 0;
            const lossQty = col.processingLoss?.qty || 0;
            const netQty = Number(Math.max(0, origQty - lossQty).toFixed(2));
            const netVal = Number((netQty * rate).toFixed(2));
            col.netQuantity = { qty: netQty, value: netVal };

            // Balance In Hand = Net Quantity - Earlier Used - This Advice (allows negative if over-consumed)
            // (Note: This Advice already accounts for the total material consumed including scrap, so returnQty must NOT be deducted again)
            const earlierQty = col.qtyUsedEarlier?.qty || 0;
            const thisAdviceQty = col.qtyUsedThisAdvice?.qty || 0;
            const returnQty = col.qtyReturn?.qty || 0;

            const balQty = Number((netQty - earlierQty - thisAdviceQty).toFixed(2));
            const balVal = Number((balQty * rate).toFixed(2));
            col.balanceInHand = { qty: balQty, value: balVal };

            // Update return value
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
            const newColIndex = (next.columns?.length || 0) + 1;
            const newCol = {
                challanRef: `26274090${newColIndex} DT 15-08-2026`,
                description: "NEW RAW MATERIAL",
                hsn: "39011090",
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
        toast.success("Added new material column");
    };

    const handleRemoveColumn = (index) => {
        setData((prev) => {
            if ((prev.columns?.length || 0) <= 1) {
                toast.error("Consumption sheet must have at least one material column");
                return prev;
            }
            const next = JSON.parse(JSON.stringify(prev));
            next.columns = next.columns.filter((_, i) => i !== index);
            return next;
        });
    };

    const handleSaveSheet = async () => {
        if (!challanId) {
            toast.success("Sheet data ready (in-memory)");
            setIsEditing(false);
            return;
        }
        setSaving(true);
        try {
            const res = await api.post(`/outbound-challans/${challanId}/consumption-sheet`, data);
            if (res?.success || res?.data) {
                toast.success("Material Consumption Sheet adjustments saved successfully");
                setIsEditing(false);
            }
        } catch (err) {
            toast.error(err.message || "Failed to save consumption sheet");
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        // Clone node so we can safely convert any active input fields to their typed values for printing
        const clone = printContent.cloneNode(true);
        const originalInputs = printContent.querySelectorAll("input, textarea, select");
        const clonedInputs = clone.querySelectorAll("input, textarea, select");

        clonedInputs.forEach((clonedEl, idx) => {
            const origEl = originalInputs[idx];
            const val = origEl ? origEl.value : clonedEl.value;
            const span = document.createElement("span");
            span.textContent = val || "—";
            span.className = clonedEl.className.replace(/border[^\s]*/g, "").replace(/h-[^\s]*/g, "");
            span.style.display = "inline-block";
            span.style.padding = "2px 4px";
            clonedEl.parentNode.replaceChild(span, clonedEl);
        });

        // Collect all stylesheets from main document
        const styleElements = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
            .map((el) => el.outerHTML)
            .join("\n");

        const winPrint = window.open("", "", "left=0,top=0,width=1280,height=900,toolbar=0,scrollbars=0,status=0");
        winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Material Consumption Sheet - ${data?.metadata?.challanNumber || "Challan"}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styleElements}
          <style>
            @page {
              size: A4 landscape;
              margin: 6mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            body {
              padding: 4mm !important;
            }
            table {
              border-collapse: collapse !important;
            }
            /* Explicit fallback colors if Tailwind print stripping occurs */
            .bg-amber-50\\/70, .bg-amber-50 {
              background-color: #fffbeb !important;
            }
            .bg-emerald-50\\/80, .bg-emerald-50 {
              background-color: #ecfdf5 !important;
            }
            .bg-rose-100 {
              background-color: #ffe4e6 !important;
            }
            .bg-slate-50 {
              background-color: #f8fafc !important;
            }
            .bg-slate-100 {
              background-color: #f1f5f9 !important;
            }
            .text-amber-950 {
              color: #451a03 !important;
            }
            .text-emerald-950 {
              color: #022c22 !important;
            }
            .text-rose-700 {
              color: #be123c !important;
            }
            .border-slate-900 {
              border-color: #0f172a !important;
            }
            .border-slate-400 {
              border-color: #94a3b8 !important;
            }
            @media print {
              body {
                padding: 0 !important;
              }
              button {
                display: none !important;
              }
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 antialiased">
          <div class="print-container">
            ${clone.innerHTML}
          </div>
        </body>
      </html>
    `);
        winPrint.document.close();
        winPrint.focus();
        setTimeout(() => {
            winPrint.print();
            winPrint.close();
        }, 350);
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
                                Challan Ref: {metadata?.challanNumber || "MF/DC"} • Date: {metadata?.date || "17-08-2026"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Scrap Return Option */}
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 text-xs">
                            <span className="text-slate-300 font-medium">Return Scrap to Customer:</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleToggleReturnScrap(false)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                        !isReturningScrap
                                            ? "bg-slate-700 text-white shadow-xs"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    No (0 Qty)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggleReturnScrap(true)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                        isReturningScrap
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    Yes (Show Return)
                                </button>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                            className={`h-8 text-xs gap-1.5 cursor-pointer ${
                                isEditing
                                    ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                                    : "border-slate-700 text-slate-200 hover:bg-slate-800"
                            }`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            {isEditing ? "Exit Edit Mode" : "Edit Values"}
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
                                    {data.documentTitle || "Material Consumption Sheet"}
                                </h2>
                                <p className="text-[10px] text-slate-600 italic max-w-3xl mx-auto mt-0.5 leading-snug">
                                    {data.subtitle ||
                                        "(For return of goods, in more than one lot to the parent factory received partially processed / goods for further processing / operation under rule of GST on job basis.)"}
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
                                        <span className="font-mono text-xs underline">{metadata?.challanNumber || "MF/DC/408"}</span>
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
                                        <span className="font-mono text-xs">{metadata?.date || "17-08-2026"}</span>
                                    )}
                                </div>
                            </div>

                            {/* Recipient & Job-Work Details Rows (without serial numbers) */}
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
                                                    placeholder="Recipient Name"
                                                />
                                                <Input
                                                    value={metadata?.recipientAddress || ""}
                                                    onChange={(e) => handleMetadataChange("recipientAddress", e.target.value)}
                                                    className="h-6 text-xs"
                                                    placeholder="Recipient Address"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-slate-900">{metadata?.recipientName || "M/s. V-MARC INDIA LIMITED"}</p>
                                                <p className="text-[11px] font-normal text-slate-700">
                                                    {metadata?.recipientAddress ||
                                                        "Khasra No. 1,2,6, Village-Mukrabpur Bahadrabad Bhagwanpur Road Tehsil Roorkee-247667"}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Registration No. of the parent factory</span>
                                    <div className="flex-1 font-bold font-mono text-slate-900">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.recipientGstin || ""}
                                                onChange={(e) => handleMetadataChange("recipientGstin", e.target.value)}
                                                className="h-6 w-60 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>GSTIN :-{metadata?.recipientGstin || "05AAMCA4908L1ZG"}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Nature of Process</span>
                                    <div className="flex-1 text-slate-900 font-medium">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.natureOfProcess || ""}
                                                onChange={(e) => handleMetadataChange("natureOfProcess", e.target.value)}
                                                className="h-6 w-72 text-xs"
                                            />
                                        ) : (
                                            <span>{metadata?.natureOfProcess || "Cable Processing (Semi finished cable)"}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Description of goods returned</span>
                                    <div className="flex-1 font-bold font-mono text-slate-900 uppercase">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.descriptionOfGoodsReturned || ""}
                                                onChange={(e) => handleMetadataChange("descriptionOfGoodsReturned", e.target.value)}
                                                className="h-6 w-72 text-xs font-mono font-bold uppercase"
                                            />
                                        ) : (
                                            <span>{metadata?.descriptionOfGoodsReturned || "4CX35 SQMM A2XFY"}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="w-64 font-semibold text-slate-800">Dispatch Quantity in Kgs/Mtrs</span>
                                    <div className="flex-1 font-bold font-mono text-slate-900">
                                        {isEditing ? (
                                            <Input
                                                value={metadata?.dispatchQuantity || ""}
                                                onChange={(e) => handleMetadataChange("dispatchQuantity", e.target.value)}
                                                className="h-6 w-96 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.dispatchQuantity || "1997.000 mtrs (9 drum as per packing list)"}</span>
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
                                                className="h-6 w-60 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span>{metadata?.workOrderNumberAndDate || "MF-2026-01"}</span>
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
                                                Originally Qty. Received (In Kgs &amp; Mtr)
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
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={c.originallyReceived?.value ?? ""}
                                                                onChange={(e) =>
                                                                    handleCellChange(i, "originallyReceived", "value", e.target.value)
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

                                        {/* Less Processing Loss */}
                                        <tr>
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
                                                                value={c.processingLoss?.qty ?? ""}
                                                                onChange={(e) =>
                                                                    handleCellChange(i, "processingLoss", "qty", e.target.value)
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

                                        {/* Net Quantity */}
                                        <tr className="bg-slate-50 font-bold">
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

                                        {/* Qty. Used Earlier Advices */}
                                        <tr>
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

                                        {/* Qty. Used under this Advice */}
                                        <tr className="bg-amber-50/70 font-bold">
                                            <td className="border border-slate-900 p-1 text-left font-bold pl-2 text-amber-950">
                                                Qty. Used under this Advice (In Kgs &amp; Mtr)
                                                <span className="block text-[9px] text-amber-800 font-normal">
                                                    (Total used quantity including scrap)
                                                </span>
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell font-mono font-bold text-amber-950">
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={c.qtyUsedThisAdvice?.qty ?? ""}
                                                                onChange={(e) =>
                                                                    handleCellChange(i, "qtyUsedThisAdvice", "qty", e.target.value)
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

                                        {/* Balance Qty. In Hand */}
                                        <tr className="bg-emerald-50/80 font-black">
                                            <td className="border border-slate-900 p-1 text-left font-black pl-2 text-emerald-950">
                                                Balance Qty. In Hand (Kgs &amp; Mtr)
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

                                        {/* Qty. Return */}
                                        <tr>
                                            <td className="border border-slate-900 p-1 text-left font-medium pl-2 text-slate-700">
                                                Qty. Return (Kgs)
                                                <span className="block text-[9px] text-slate-500">
                                                    {isReturningScrap ? "(Scrap returning to customer)" : "(0.00 - Scrap not returning)"}
                                                </span>
                                            </td>
                                            {columns?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-slate-900 p-1 num-cell">
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={c.qtyReturn?.qty ?? ""}
                                                                onChange={(e) => handleCellChange(i, "qtyReturn", "qty", e.target.value)}
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
                                                {dispatchDetails?.dateOfDispatch || "17-08-2026"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-36 font-semibold text-slate-700">Vehicle No. :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.vehicleNumber || ""}
                                                onChange={(e) => handleDispatchDetailsChange("vehicleNumber", e.target.value)}
                                                className="h-6 w-36 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span className="font-mono font-bold text-slate-900">
                                                {dispatchDetails?.vehicleNumber || "UP17BT 0896"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-36 font-semibold text-slate-700">Place of Supply :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.placeOfSupply || ""}
                                                onChange={(e) => handleDispatchDetailsChange("placeOfSupply", e.target.value)}
                                                className="h-6 w-52 text-xs font-bold"
                                            />
                                        ) : (
                                            <span className="font-bold text-slate-900">
                                                {dispatchDetails?.placeOfSupply || "Haridwar-Uttarakhand."}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center">
                                        <span className="w-20 font-semibold text-slate-700">Place :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.place || ""}
                                                onChange={(e) => handleDispatchDetailsChange("place", e.target.value)}
                                                className="h-6 w-36 text-xs font-bold"
                                            />
                                        ) : (
                                            <span className="font-bold text-slate-900">{dispatchDetails?.place || "Chopanki"}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-20 font-semibold text-slate-700">Date :</span>
                                        {isEditing ? (
                                            <Input
                                                value={dispatchDetails?.date || ""}
                                                onChange={(e) => handleDispatchDetailsChange("date", e.target.value)}
                                                className="h-6 w-36 text-xs font-mono font-bold"
                                            />
                                        ) : (
                                            <span className="font-mono font-bold text-slate-900">
                                                {dispatchDetails?.date || "17-08-2026"}
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
                                            value={dispatchDetails?.remarks || ""}
                                            onChange={(e) => handleDispatchDetailsChange("remarks", e.target.value)}
                                            className="h-6 w-full text-xs italic mt-1"
                                        />
                                    ) : (
                                        <span className="text-slate-800 italic">
                                            {dispatchDetails?.remarks ||
                                                "Being goods returned back to prinicpal after partly completion of job work."}
                                        </span>
                                    )}
                                </div>

                                <div className="text-right pr-6 font-bold">
                                    <p>{dispatchDetails?.authorizedSignatory || "For MFOLKS INDUSTRIES PRIVATE LIMITED"}</p>
                                    <div className="h-12"></div>
                                    <p className="text-[11px] text-slate-500 font-medium">(Authorized Signatory)</p>
                                </div>
                            </div>

                            {/* Bottom Calculation Breakdown Table matching Image 2 (Dynamic: only displayed if earlier advices exist) */}
                            {(() => {
                                const hasEarlierAdvices = columns?.some(
                                    (c) => Number(c.qtyUsedEarlier?.qty || 0) > 0 || (c.earlierBreakdown && c.earlierBreakdown.length > 0)
                                );
                                if (!hasEarlierAdvices) return null;

                                // Collect unique prior advice labels or indices
                                const maxBreakdowns = Math.max(
                                    ...columns.map((c) => (c.earlierBreakdown ? c.earlierBreakdown.length : 0)),
                                    1
                                );
                                const adviceIndices = Array.from({ length: maxBreakdowns }, (_, idx) => idx);

                                return (
                                    <div className="mt-6 pt-4 border-t border-slate-300">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Earlier Advices Reconciliation Breakdown (Sums to Row 13)
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="border-collapse border border-slate-400 text-[9.5px] font-mono ml-auto">
                                                <tbody>
                                                    {adviceIndices.map((adviceIdx) => {
                                                        // Determine title from first column with this breakdown entry or fallback
                                                        const firstNamed = columns?.find((c) => c.earlierBreakdown?.[adviceIdx]?.label);
                                                        const rowTitle = firstNamed?.earlierBreakdown?.[adviceIdx]?.label
                                                            ? `Advice ${firstNamed.earlierBreakdown[adviceIdx].label}`
                                                            : `Prior Advice ${adviceIdx + 1} (Qty | Value)`;

                                                        return (
                                                            <tr key={adviceIdx} className="bg-slate-50">
                                                                <td className="border border-slate-400 px-2 py-0.5 text-left font-sans font-semibold text-slate-700 whitespace-nowrap">
                                                                    {rowTitle}
                                                                </td>
                                                                {columns?.map((c, i) => {
                                                                    const b = c.earlierBreakdown?.[adviceIdx];
                                                                    const totalEarlier = Number(c.qtyUsedEarlier?.qty || 0);
                                                                    const totalEarlierVal = Number(c.qtyUsedEarlier?.value || 0);
                                                                    
                                                                    // If backend breakdown exists, use it; otherwise single advice holds total
                                                                    const q = b
                                                                        ? b.qty
                                                                        : maxBreakdowns === 1
                                                                        ? totalEarlier
                                                                        : 0;
                                                                    const v = b
                                                                        ? b.value
                                                                        : maxBreakdowns === 1
                                                                        ? totalEarlierVal
                                                                        : 0;

                                                                    return (
                                                                        <React.Fragment key={i}>
                                                                            <td className="border border-slate-400 px-2 py-0.5 text-right">
                                                                                {Number(q || 0).toFixed(2)}
                                                                            </td>
                                                                            <td className="border border-slate-400 px-2 py-0.5 text-right">
                                                                                {Number(v || 0).toFixed(2)}
                                                                            </td>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}

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
                                );
                            })()}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
