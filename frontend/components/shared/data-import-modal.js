"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Download,
    UploadCloud,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileText,
    ArrowRight,
    HelpCircle,
} from "lucide-react";
import { IMPORT_TEMPLATES, exportSampleTemplate, parseImportFile } from "@/lib/import-templates";
import { apiClient } from "@/lib/api";

export function DataImportModal({ open, onOpenChange, initialTemplateKey = "CUSTOMERS", onSuccess }) {
    const [selectedKey, setSelectedKey] = useState(initialTemplateKey);
    const [file, setFile] = useState(null);
    const [parsedRows, setParsedRows] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const currentTemplate = IMPORT_TEMPLATES[selectedKey] || IMPORT_TEMPLATES.CUSTOMERS;

    const handleTemplateChange = (key) => {
        setSelectedKey(key);
        setFile(null);
        setParsedRows([]);
        setImportResult(null);
    };

    const handleDownloadTemplate = () => {
        exportSampleTemplate(selectedKey);
        toast.success(`Downloaded sample template for ${currentTemplate.title}`);
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsParsing(true);
        setImportResult(null);

        try {
            const parsed = await parseImportFile(selectedFile, currentTemplate.sheetName || currentTemplate.key);
            const rows = parsed.rows || [];
            setParsedRows(rows);
            toast.success(`Loaded ${rows.length} records from sheet "${parsed.sheetName}"`);
        } catch (err) {
            toast.error("Failed to parse file", { description: err.message });
            setFile(null);
            setParsedRows([]);
        } finally {
            setIsParsing(false);
        }
    };

    const handleExecuteImport = async () => {
        if (!parsedRows || parsedRows.length === 0) {
            toast.error("No valid data rows found in uploaded file");
            return;
        }

        setIsUploading(true);
        setImportResult(null);

        try {
            // Transform rows using template mapper
            const transformed = parsedRows.map((r) => currentTemplate.transform(r));

            // Determine endpoint: map to /import/<resource>
            let targetEndpoint = "/import/customers";
            if (selectedKey === "RAW_MATERIALS") targetEndpoint = "/import/materials";
            else if (selectedKey === "CABLE_PRODUCTS") targetEndpoint = "/import/products";
            else if (selectedKey === "WAREHOUSES") targetEndpoint = "/import/warehouses";
            else if (selectedKey === "CABLE_DRUMS") targetEndpoint = "/import/drums";
            else if (selectedKey === "INBOUND_CHALLANS") targetEndpoint = "/import/inbound-challans";

            const res = await apiClient(targetEndpoint, {
                method: "POST",
                body: JSON.stringify({ rows: transformed }),
            });

            if (res?.success || res?.data) {
                const data = res.data || {};
                setImportResult(data);
                toast.success(`Import completed: ${data.imported || 0} created, ${data.updated || 0} updated`);
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            toast.error("Import failed", { description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-white p-0 border border-slate-300 shadow-2xl">
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                                Historical &amp; Master Data Import System
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400">
                                Digitize paper records, old challans, and spreadsheets with pre-formatted Excel templates.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Category Selection Tabs */}
                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                            Select Data Category to Import
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.values(IMPORT_TEMPLATES).map((tmpl) => (
                                <button
                                    key={tmpl.key}
                                    type="button"
                                    onClick={() => handleTemplateChange(tmpl.key)}
                                    className={`p-3 text-left rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                        selectedKey === tmpl.key
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold">{tmpl.title}</span>
                                        {selectedKey === tmpl.key && (
                                            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Active</Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-1">{tmpl.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 1: Download Sample Excel Template */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                                <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                                Step 1: Download Sample Pre-formatted Excel File
                            </div>
                            <p className="text-[11px] text-amber-800 leading-snug">
                                Contains pre-filled sample rows and a <b>Field_Guidelines</b> sheet with exact headers and valid options.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleDownloadTemplate}
                            size="sm"
                            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download Sample ({currentTemplate.key}.xlsx)
                        </Button>
                    </div>

                    {/* Field Reference Summary for Data Entry Guy */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <HelpCircle className="w-4 h-4 text-emerald-700" />
                                Data Entry Guide: Mandatory vs Optional Fields &amp; Permitted Choices
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal">
                                Sheet: <b>{currentTemplate.sheetName || currentTemplate.key}</b>
                            </span>
                        </div>
                        <div className="p-3 bg-white overflow-x-auto max-h-48">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                                        <th className="p-1.5 w-44">Field / Column Name</th>
                                        <th className="p-1.5 w-28 text-center">Requirement</th>
                                        <th className="p-1.5">Allowed Choices / Example</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentTemplate.fields.map((f, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80">
                                            <td className="p-1.5 font-bold text-slate-900">{f.label}</td>
                                            <td className="p-1.5 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[9.5px] px-1.5 py-0 font-bold ${
                                                        f.required === "MANDATORY"
                                                            ? "bg-rose-50 text-rose-700 border-rose-300"
                                                            : f.required === "RECOMMENDED"
                                                            ? "bg-amber-50 text-amber-700 border-amber-300"
                                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                                    }`}
                                                >
                                                    {f.required}
                                                </Badge>
                                            </td>
                                            <td className="p-1.5 font-mono text-[10.5px] text-slate-700">
                                                {f.allowedValues || f.example}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Step 2: Upload Filled File */}
                    <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            id="file-upload-input"
                            className="hidden"
                        />
                        <label
                            htmlFor="file-upload-input"
                            className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                        >
                            <div className="p-3 bg-white rounded-full border border-slate-200 shadow-xs text-emerald-600">
                                {isParsing ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <UploadCloud className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-800 underline">
                                    {file ? file.name : "Click to select or drop completed Excel/CSV file"}
                                </span>
                                <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, and .csv formats</p>
                            </div>
                        </label>
                    </div>

                    {/* Data Preview */}
                    {parsedRows.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                        Data Preview ({parsedRows.length} rows ready)
                                    </span>
                                    <Badge variant="outline" className="text-[10px] bg-slate-100">
                                        First 5 rows shown below
                                    </Badge>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleExecuteImport}
                                    disabled={isUploading}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Importing {parsedRows.length} records...
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                            Import {parsedRows.length} Records to System
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56">
                                <table className="w-full border-collapse text-[11px] font-sans text-left">
                                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="p-2 border-r border-slate-200 w-12 text-center">#</th>
                                            {Object.keys(parsedRows[0] || {}).map((header, idx) => (
                                                <th key={idx} className="p-2 border-r border-slate-200 whitespace-nowrap">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedRows.slice(0, 5).map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-50">
                                                <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500 font-semibold">
                                                    {rIdx + 1}
                                                </td>
                                                {Object.values(row).map((val, cIdx) => (
                                                    <td key={cIdx} className="p-2 border-r border-slate-200 whitespace-nowrap font-mono text-slate-800">
                                                        {String(val || "—")}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Result Summary */}
                    {importResult && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Import Summary
                            </div>
                            <div className="flex items-center gap-4 text-xs text-emerald-800 font-medium">
                                <span>Records Created: <b>{importResult.imported || 0}</b></span>
                                {importResult.updated !== undefined && <span>Records Updated: <b>{importResult.updated}</b></span>}
                                {importResult.linesCreated !== undefined && <span>Line Items Posted: <b>{importResult.linesCreated}</b></span>}
                                {importResult.errors && importResult.errors.length > 0 && (
                                    <span className="text-rose-700 font-bold">Errors: {importResult.errors.length}</span>
                                )}
                            </div>
                            {importResult.errors && importResult.errors.length > 0 && (
                                <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 max-h-24 overflow-y-auto">
                                    {importResult.errors.map((err, i) => (
                                        <div key={i}>Row {err.row || err.key}: {err.error}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
