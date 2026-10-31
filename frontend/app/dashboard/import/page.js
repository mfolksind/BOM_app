"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    UploadCloud,
    Download,
    FileSpreadsheet,
    FileText,
    ArrowRight,
    CheckCircle2,
    Users,
    Boxes,
    Cable,
    Warehouse,
    Package,
    ClipboardList,
    ShieldAlert,
} from "lucide-react";
import {
    IMPORT_TEMPLATES,
    exportSampleTemplate,
    exportMasterMultiSheetWorkbook,
    ALLOWED_CHOICES_DICTIONARY,
} from "@/lib/import-templates";
import { DataImportModal } from "@/components/shared/data-import-modal";

const TEMPLATE_ICONS = {
    CUSTOMERS: Users,
    RAW_MATERIALS: Boxes,
    CABLE_PRODUCTS: Cable,
    WAREHOUSES: Warehouse,
    CABLE_DRUMS: Package,
    INBOUND_CHALLANS: ClipboardList,
};

export default function ImportCenterPage() {
    const [selectedTemplateKey, setSelectedTemplateKey] = useState("CUSTOMERS");
    const [modalOpen, setModalOpen] = useState(false);
    const [showChoicesTable, setShowChoicesTable] = useState(false);

    const handleOpenImport = (key) => {
        setSelectedTemplateKey(key);
        setModalOpen(true);
    };

    const handleDownloadSample = (e, key) => {
        e.stopPropagation();
        exportSampleTemplate(key);
        toast.success(`Downloaded sample template for ${IMPORT_TEMPLATES[key]?.title}`);
    };

    const handleDownloadMasterWorkbook = () => {
        exportMasterMultiSheetWorkbook();
        toast.success("Downloaded Master Multi-Sheet Excel Workbook (All 6 Templates + Guidelines)");
    };

    return (
        <div className="space-y-6 p-6">
            {/* Page Header with Master Workbook Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <UploadCloud className="w-6 h-6 text-emerald-600" />
                        Data Import Center
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Digitize legacy paper registers, supplier challans, and customer drum sheets into the ERP system.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChoicesTable(!showChoicesTable)}
                        className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 cursor-pointer"
                    >
                        <FileText className="w-4 h-4 text-slate-600" />
                        {showChoicesTable ? "Hide Units & Choices Guide" : "View Units & Choices Guide"}
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleDownloadMasterWorkbook}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        Download Master Multi-Sheet Excel Workbook (.xlsx)
                    </Button>
                </div>
            </div>

            {/* Units & Choices Reference Guide for Data Entry Operator */}
            {showChoicesTable && (
                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold text-xs uppercase tracking-wider">
                                Standard Units &amp; Allowed Choices Reference (For Data Entry Operator)
                            </span>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-[10px]">Reference Guide</Badge>
                    </div>

                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                                    <th className="p-2.5 w-48">Category</th>
                                    <th className="p-2.5">Allowed Values / Choices</th>
                                    <th className="p-2.5 w-36">Default Value</th>
                                    <th className="p-2.5">Usage / Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {ALLOWED_CHOICES_DICTIONARY.map((dict, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80">
                                        <td className="p-2.5 font-bold font-sans text-slate-900">{dict.Category}</td>
                                        <td className="p-2.5 text-emerald-800 font-bold">{dict.ValidValues}</td>
                                        <td className="p-2.5 text-slate-700">
                                            <Badge variant="outline" className="text-[10px] bg-slate-50">
                                                {dict.DefaultValue}
                                            </Badge>
                                        </td>
                                        <td className="p-2.5 font-sans text-slate-600">{dict.Description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Instruction Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-emerald-950">
                            How to Import Your Old Paper Data:
                        </h2>
                        <ol className="text-xs text-emerald-800 list-decimal list-inside space-y-1 mt-1 font-medium">
                            <li>
                                <b>Option A (All-in-one):</b> Click <b>"Download Master Multi-Sheet Excel Workbook"</b> above to get all 6 categories (Customers, Materials, Products, Warehouses, Drums, Inbound Challans) in a single workbook with guideline sheets.
                            </li>
                            <li>
                                <b>Option B (Category-specific):</b> Click <b>"Sample File"</b> on any card below to download a standalone sheet for just that category.
                            </li>
                            <li>
                                Open the downloaded file in Microsoft Excel or Google Sheets. The sheet contains labeled columns marked <b>MANDATORY</b> or <b>OPTIONAL</b>, along with allowable units like <b>KG, METER, KM</b>.
                            </li>
                            <li>
                                Fill in your old paper records, then click <b>"Import Data"</b> to verify and ingest the rows into your ERP database.
                            </li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Object.values(IMPORT_TEMPLATES).map((tmpl) => {
                    const Icon = TEMPLATE_ICONS[tmpl.key] || FileSpreadsheet;
                    return (
                        <Card
                            key={tmpl.key}
                            className="border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
                                        <Icon className="w-5 h-5 text-emerald-700" />
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                                        {tmpl.fields.length} Columns
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 mt-3">
                                    {tmpl.title}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 line-clamp-2">
                                    {tmpl.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="pt-0 space-y-3">
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                                    <span className="font-semibold text-slate-700 block">Sample Columns:</span>
                                    <p className="font-mono text-[10px] text-slate-500 line-clamp-2">
                                        {tmpl.fields.map((f) => f.label).join(", ")}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => handleDownloadSample(e, tmpl.key)}
                                        className="flex-1 text-xs gap-1 cursor-pointer border-slate-300 hover:bg-slate-100"
                                    >
                                        <Download className="w-3.5 h-3.5 text-slate-600" />
                                        Sample File
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleOpenImport(tmpl.key)}
                                        className="flex-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs font-semibold"
                                    >
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        Import Data
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Modal Dialog */}
            <DataImportModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                initialTemplateKey={selectedTemplateKey}
                onSuccess={() => {
                    toast.success("Data successfully digitized and imported into database!");
                }}
            />
        </div>
    );
}
