"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Download, Package, X, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";

export function PackingListDocumentDialog({ open, onOpenChange, documentData: propDocumentData, packingListId }) {
    const printRef = useRef(null);
    const [data, setData] = useState(propDocumentData || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (propDocumentData) {
                setData(propDocumentData);
            } else if (packingListId) {
                fetchDocument();
            }
        } else {
            if (!propDocumentData) {
                setData(null);
            }
        }
    }, [open, packingListId, propDocumentData]);

    const fetchDocument = async () => {
        setLoading(true);
        try {
            const res = await apiClient(`/packing-lists/${packingListId}/document`);
            if (res?.data) {
                setData(res.data);
            }
        } catch (err) {
            console.error("Failed to load packing list document", err);
            toast.error("Failed to load packing list document", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        // Clone node
        const clone = printContent.cloneNode(true);

        // Collect all stylesheets from main document
        const styleElements = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
            .map((el) => el.outerHTML)
            .join("\n");

        const winPrint = window.open("", "", "left=0,top=0,width=1000,height=900,toolbar=0,scrollbars=0,status=0");
        winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing List - ${data?.header?.packingNumber || "MF-PL"}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styleElements}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
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
            .bg-slate-100\\/90, .bg-slate-100 {
              background-color: #f1f5f9 !important;
            }
            .bg-amber-50 {
              background-color: #fffbeb !important;
            }
            .bg-slate-50\\/50, .bg-slate-50 {
              background-color: #f8fafc !important;
            }
            .border-slate-800 {
              border-color: #1e293b !important;
            }
            .border-slate-900 {
              border-color: #0f172a !important;
            }
            .border-slate-300 {
              border-color: #cbd5e1 !important;
            }
            .border-slate-200 {
              border-color: #e2e8f0 !important;
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

    const { company, documentTitle, header, table, totalLength, totalDrums, footer } = data || {};

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-white p-0 border border-slate-300 shadow-2xl">
                {/* Top Control Bar */}
                <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 print:hidden">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-white">Official Packing List</DialogTitle>
                            <p className="text-xs text-slate-400">
                                Challan Ref: {header?.challanNumber || "Pending"} • Packing No: {header?.packingNumber || "Pending"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrint}
                            disabled={loading || !data}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print / Save PDF
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 text-center text-slate-500 space-y-3">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-600" />
                        <p className="text-xs font-semibold">Loading official Packing List document...</p>
                    </div>
                ) : !data ? (
                    <div className="py-20 text-center text-slate-400 text-xs">No document data available.</div>
                ) : (
                    /* Printable Sheet Matching Image 1 */
                    <div className="p-8 bg-white" ref={printRef}>
                        {/* Company Header */}
                        <div className="text-center pb-2 border-b border-slate-300">
                            <h1 className="text-xl font-extrabold tracking-wide text-slate-900 uppercase">
                                {company?.name || "MFOLKS INDUSTRIES PRIVATE LIMITED"}
                            </h1>
                            <p className="text-xs text-slate-700 mt-0.5">
                                {company?.address || "F-279 A, RIICO Industrial Area, Chopanki, Tapukara, Alwar, Rajasthan, India - 301707"}
                            </p>
                            <p className="text-xs font-medium text-slate-800 mt-0.5">
                                GSTIN : <span className="font-mono font-bold">{company?.gstin || "08AAOCM2650D1ZI"}</span>, PAN NO. :{" "}
                                <span className="font-mono font-bold">{company?.pan || "AAOCM2650D"}</span>
                            </p>
                            <p className="text-xs font-medium text-slate-800">
                                CIN NO. : <span className="font-mono">{company?.cin || "U27320DL2021PTC376425"}</span>
                            </p>
                        </div>

                        {/* Title */}
                        <div className="text-center py-2.5 my-1">
                            <h2 className="text-sm font-black tracking-widest text-slate-900 underline uppercase">
                                {documentTitle || "PACKING LIST"}
                            </h2>
                        </div>

                        {/* Metadata Block (Exact Layout of Image 1) */}
                        <div className="grid grid-cols-2 gap-x-6 text-xs text-slate-900 mb-3 border-y border-slate-300 py-2.5 font-sans">
                            {/* Left Column */}
                            <div className="space-y-1.5">
                                <div className="flex items-baseline">
                                    <span className="w-32 font-semibold text-slate-700">Customer Name :</span>
                                    <span className="font-bold text-slate-900">{header?.customerName || "V-MARC INDIA LIMITED"}</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-32 font-semibold text-slate-700">WORK ORDER :</span>
                                    <span className="font-bold font-mono text-slate-900 mr-4">{header?.workOrder || "MF-2026-01"}</span>
                                    <span className="font-semibold text-slate-700 mr-1">Dtd :</span>
                                    <span className="font-medium text-slate-800">{header?.workOrderDate || ""}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-32 font-semibold text-slate-700">SIZE :</span>
                                    <span className="px-2.5 py-0.5 border border-slate-800 font-bold font-mono text-xs uppercase bg-slate-50">
                                        {header?.size || "4CX35 SQMM A2XFY"}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-32 font-semibold text-slate-700">DATE :</span>
                                    <span className="font-bold font-mono text-slate-900">{header?.date || "17-08-2026"}</span>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-1.5 pl-4 border-l border-slate-200">
                                <div className="flex items-baseline">
                                    <span className="w-32 font-semibold text-slate-700">INVOICE NO. :</span>
                                    <span className="font-bold font-mono text-slate-900">
                                        {header?.invoiceNumber || "2025-26/RJ/JW/337"}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-32 font-semibold text-slate-700">CHALLAN NO. :</span>
                                    <span className="font-bold font-mono text-slate-900">{header?.challanNumber || "MF/DC/408"}</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-32 font-semibold text-slate-700">PACKING NO. :</span>
                                    <span className="font-bold font-mono text-slate-900">{header?.packingNumber || "MF/PL/389"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Table (Exact Columns Matching Image 1) */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-800 text-xs text-center font-sans">
                                <thead>
                                    <tr className="bg-slate-100/90 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
                                        <th className="border border-slate-800 p-2 w-12">S.NO</th>
                                        <th className="border border-slate-800 p-2 w-20">D.NO</th>
                                        <th className="border border-slate-800 p-2">LENGTH BOTTOM</th>
                                        <th className="border border-slate-800 p-2">LENGTH TOP</th>
                                        <th className="border border-slate-800 p-2 font-black">LENGTH TOTAL</th>
                                        <th className="border border-slate-800 p-2">DRUM SIZE</th>
                                        <th className="border border-slate-800 p-2">Ref RGP No</th>
                                        <th className="border border-slate-800 p-2">TYPE</th>
                                        <th className="border border-slate-800 p-2">REMARK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {table && table.length > 0 ? (
                                        table.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="border border-slate-800 p-1.5 font-mono">{row.sNo || idx + 1}</td>
                                                <td className="border border-slate-800 p-1.5 font-mono font-bold text-slate-900">
                                                    {row.dNo || row.drumNumber}
                                                </td>
                                                <td className="border border-slate-800 p-1.5 font-mono">{row.lengthBottom ?? 0}</td>
                                                <td className="border border-slate-800 p-1.5 font-mono">
                                                    {row.lengthTop ?? row.lengthMeters}
                                                </td>
                                                <td className="border border-slate-800 p-1.5 font-mono font-bold text-slate-900 bg-slate-50/50">
                                                    {row.lengthTotal ?? row.lengthMeters}
                                                </td>
                                                <td className="border border-slate-800 p-1.5 font-mono">{row.drumSize || "44X16X24"}</td>
                                                <td className="border border-slate-800 p-1.5 font-mono text-slate-700">
                                                    {row.refRgpNo || row.refRgpNumber || "—"}
                                                </td>
                                                <td className="border border-slate-800 p-1.5 uppercase text-slate-700">
                                                    {row.type || row.drumType || ""}
                                                </td>
                                                <td className="border border-slate-800 p-1.5 text-slate-700 font-mono text-[11px]">
                                                    {row.remark || row.remarks || "STD.LENGTH"}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="border border-slate-800 p-4 text-slate-400 text-center">
                                                No drum rows recorded in packing list.
                                            </td>
                                        </tr>
                                    )}
                                    {/* Total Row */}
                                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                                        <td colSpan={4} className="border border-slate-800 p-2 text-right pr-4 font-black">
                                            TOTAL CABLE LENGTH :
                                        </td>
                                        <td className="border border-slate-800 p-2 font-mono font-black text-slate-900 text-sm bg-amber-50">
                                            {totalLength !== undefined ? Number(totalLength).toFixed(1) : "1997.0"} m
                                        </td>
                                        <td colSpan={4} className="border border-slate-800 p-2 text-left pl-3 text-slate-700 font-semibold">
                                            ({totalDrums || (table ? table.length : 0)} Drums Loaded)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Signature */}
                        <div className="mt-12 text-right pr-6 font-bold text-xs text-slate-900">
                            <p>{footer || "For MFOLKS INDUSTRIES PRIVATE LIMITED"}</p>
                            <div className="h-12"></div>
                            <p className="text-[11px] text-slate-500 font-medium tracking-normal">(Authorized Signatory)</p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
