"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { PackingListDocumentDialog } from "@/components/packing/packing-list-document-dialog";
import { MaterialConsumptionSheetDialog } from "@/components/dispatch/material-consumption-sheet-dialog";

import {
    Building2,
    Package,
    Layers,
    Truck,
    FileText,
    RotateCcw,
    CheckCircle2,
    Clock,
    Archive,
    RefreshCw,
    ExternalLink,
    MapPin,
    Phone,
    FileCheck2,
    Scale,
    Warehouse,
    Briefcase,
    Calendar,
    ChevronRight,
    Tag,
} from "lucide-react";

export function CustomerStockOverviewDialog({ customer, open, onOpenChange }) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("raw-materials");

    // Sub-views for Raw Materials and Scrap
    const [stockSubTab, setStockSubTab] = useState("warehouse"); // 'warehouse' | 'material' | 'challan-lots'
    const [scrapSubTab, setScrapSubTab] = useState("work-order"); // 'work-order' | 'challan' | 'material' | 'transactions'

    // Preview dialog states
    const [selectedPackingListId, setSelectedPackingListId] = useState(null);
    const [selectedChallanId, setSelectedChallanId] = useState(null);

    const fetchOverview = async () => {
        if (!customer?._id) return;
        setIsLoading(true);
        try {
            const res = await apiClient(`/customers/${customer._id}/stock-overview`);
            if (res.data) {
                setData(res.data);
            }
        } catch (err) {
            toast.error("Failed to load customer stock overview", {
                description: err.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && customer?._id) {
            fetchOverview();
        }
    }, [open, customer?._id]);

    if (!customer) return null;

    const summary = data?.summary || {};
    const drumSummary = summary.drumSummary || {};
    const warehouseBreakdown = data?.warehouseBreakdown || [];
    const materialBalances = data?.materialBalances || [];
    const rawMaterialStock = data?.rawMaterialStock || [];
    const scrapByWorkOrder = data?.scrapByWorkOrder || [];
    const scrapByChallan = data?.scrapByChallan || [];
    const scrapRecords = data?.scrapRecords || [];

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-4xl md:max-w-5xl lg:w-[75vw] lg:max-w-[1240px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
                >
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs shrink-0">
                            <SheetHeader className="p-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                                                <Building2 className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <SheetTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                    {customer.name}
                                                    <span className="text-xs font-mono font-normal bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                        {customer.code}
                                                    </span>
                                                </SheetTitle>
                                                <SheetDescription className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                                                    <span>
                                                        GSTIN:{" "}
                                                        <strong className="font-mono text-slate-700">{customer.gstin || "N/A"}</strong>
                                                    </span>
                                                    {customer.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {customer.phone}
                                                        </span>
                                                    )}
                                                    {customer.billingAddress?.city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-slate-400" />
                                                            {customer.billingAddress.city}, {customer.billingAddress.state}
                                                        </span>
                                                    )}
                                                </SheetDescription>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchOverview}
                                            disabled={isLoading}
                                            className="h-8.5 gap-1.5 text-xs text-slate-700 bg-white cursor-pointer"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                                            Refresh
                                        </Button>
                                    </div>
                                </div>
                            </SheetHeader>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                            {/* KPI Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                                        Total RM Stock
                                    </span>
                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                        {summary.totalStockKg ? summary.totalStockKg.toLocaleString("en-IN") : "0.00"}
                                        <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">Customer Owned</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                                        Available Free
                                    </span>
                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                        {summary.totalAvailableKg ? summary.totalAvailableKg.toLocaleString("en-IN") : "0.00"}
                                        <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">Ready for production</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                                        Reserved in POs
                                    </span>
                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                        {summary.totalReservedKg ? summary.totalReservedKg.toLocaleString("en-IN") : "0.00"}
                                        <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">Locked in WIP</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                                        Process Scrap
                                    </span>
                                    <div className="text-xl font-bold text-rose-700 font-mono">
                                        {summary.totalScrapKg ? summary.totalScrapKg.toLocaleString("en-IN") : "0.00"}
                                        <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
                                    </div>
                                    <span className="text-[10px] text-rose-600/80 mt-1 block">Party Process Loss</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                                        Empty Drums
                                    </span>
                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                        {drumSummary.availableEmpty || 0}
                                        <span className="text-xs font-normal text-slate-500 ml-1">/ {drumSummary.totalReceived || 0}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">In plant yard</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                                        Packed Drums
                                    </span>
                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                        {drumSummary.packed || 0}
                                        <span className="text-xs font-normal text-slate-500 ml-1">drums</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">Ready for dispatch</span>
                                </div>
                            </div>

                            {/* Main Tab Navigation */}
                            <div className="flex border-b border-slate-200 mt-6 bg-white rounded-t-xl px-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("raw-materials")}
                                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                                        activeTab === "raw-materials"
                                            ? "border-indigo-600 text-indigo-700"
                                            : "border-transparent text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <Warehouse className="w-3.5 h-3.5" />
                                    Warehouse Balances & Stock ({materialBalances.length || rawMaterialStock.length || 0})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("drums")}
                                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                                        activeTab === "drums"
                                            ? "border-indigo-600 text-indigo-700"
                                            : "border-transparent text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <Package className="w-3.5 h-3.5" />
                                    Returnable Drums ({data?.drums?.length || 0})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("inbound")}
                                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                                        activeTab === "inbound"
                                            ? "border-indigo-600 text-indigo-700"
                                            : "border-transparent text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <Truck className="w-3.5 h-3.5" />
                                    Inbound Challans ({data?.inboundChallans?.length || 0})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("outbound")}
                                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                                        activeTab === "outbound"
                                            ? "border-indigo-600 text-indigo-700"
                                            : "border-transparent text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <FileCheck2 className="w-3.5 h-3.5" />
                                    Outbound Challans & Consumption ({data?.outboundChallans?.length || 0})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("scrap")}
                                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                                        activeTab === "scrap"
                                            ? "border-rose-600 text-rose-700"
                                            : "border-transparent text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <Scale className="w-3.5 h-3.5 text-rose-600" />
                                    Process Loss & Scrap ({scrapRecords.length || 0})
                                </button>
                            </div>

                            {/* ======================================================== */}
                            {/* Tab 1: Warehouse Balances & Raw Materials */}
                            {/* ======================================================== */}
                            {activeTab === "raw-materials" && (
                                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-5 space-y-5">
                                    {/* Sub-view Switcher */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setStockSubTab("warehouse")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    stockSubTab === "warehouse"
                                                        ? "bg-white text-indigo-900 shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                                                By Warehouse ({warehouseBreakdown.length})
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setStockSubTab("material")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    stockSubTab === "material"
                                                        ? "bg-white text-indigo-900 shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                                Consolidated Material Stock ({materialBalances.length})
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setStockSubTab("challan-lots")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    stockSubTab === "challan-lots"
                                                        ? "bg-white text-indigo-900 shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                                Inbound Challan Lots
                                            </button>
                                        </div>

                                        <div className="text-xs text-slate-500 font-medium">
                                            Total Customer Material: <strong className="font-mono text-slate-900">{summary.totalStockKg || 0} kg</strong>
                                        </div>
                                    </div>

                                    {/* 1A. Warehouse-Wise Breakdown View */}
                                    {stockSubTab === "warehouse" && (
                                        <div className="space-y-4">
                                            {warehouseBreakdown.length === 0 ? (
                                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    No warehouse balances found for this customer.
                                                </div>
                                            ) : (
                                                warehouseBreakdown.map((wh) => (
                                                    <div
                                                        key={wh.warehouseId}
                                                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                                                    >
                                                        {/* Warehouse Card Header */}
                                                        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
                                                                    <Warehouse className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold text-sm text-slate-900">
                                                                            {wh.warehouseName}
                                                                        </h4>
                                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                                            {wh.warehouseCode}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500">
                                                                        Type: <span className="font-semibold text-slate-700">{wh.warehouseType?.replace(/_/g, " ")}</span> &bull; {wh.materialsCount} material types stored
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 text-right">
                                                                <div className="p-1.5 px-3 rounded-lg bg-white border border-slate-200 text-xs">
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">On-Hand</span>
                                                                    <span className="font-mono font-bold text-slate-900">{wh.totalOnHandKg.toLocaleString("en-IN")} kg</span>
                                                                </div>
                                                                <div className="p-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                                                                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-semibold">Available Free</span>
                                                                    <span className="font-mono font-bold text-emerald-900">{wh.totalAvailableKg.toLocaleString("en-IN")} kg</span>
                                                                </div>
                                                                <div className="p-1.5 px-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                                                                    <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-semibold">Reserved WIP</span>
                                                                    <span className="font-mono font-bold text-amber-900">{wh.totalReservedKg.toLocaleString("en-IN")} kg</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Warehouse Materials Table */}
                                                        <Table>
                                                            <TableHeader className="bg-slate-50/50">
                                                                <TableRow>
                                                                    <TableHead className="text-xs font-semibold">Material Code & Name</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Category / HSN</TableHead>
                                                                    <TableHead className="text-xs font-semibold text-right">On-Hand Stock</TableHead>
                                                                    <TableHead className="text-xs font-semibold text-right">Reserved (WIP)</TableHead>
                                                                    <TableHead className="text-xs font-semibold text-right">Available Free</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {wh.materials.map((m, idx) => (
                                                                    <TableRow key={`${wh.warehouseId}-${m.materialId || idx}`} className="hover:bg-slate-50/50">
                                                                        <TableCell className="py-2.5">
                                                                            <div className="font-semibold text-xs text-slate-900">{m.materialName}</div>
                                                                            <span className="font-mono text-[11px] text-slate-500">{m.materialCode}</span>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-600">
                                                                            <div>{m.category || "RAW_MATERIAL"}</div>
                                                                            <span className="text-[11px] font-mono text-slate-400">HSN: {m.hsnCode || "—"}</span>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-right font-mono font-semibold text-xs text-slate-900">
                                                                            {m.quantityOnHand.toLocaleString("en-IN")} {m.unit}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-right font-mono font-medium text-xs text-amber-800">
                                                                            {m.quantityReserved.toLocaleString("en-IN")} {m.unit}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-emerald-800">
                                                                            {m.quantityAvailable.toLocaleString("en-IN")} {m.unit}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* 1B. Consolidated Material View */}
                                    {stockSubTab === "material" && (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                            <Table>
                                                <TableHeader className="bg-slate-50/80">
                                                    <TableRow>
                                                        <TableHead className="text-xs font-semibold">Material Code & Name</TableHead>
                                                        <TableHead className="text-xs font-semibold">Category / HSN</TableHead>
                                                        <TableHead className="text-xs font-semibold">Warehouses Stored In</TableHead>
                                                        <TableHead className="text-xs font-semibold text-right">Total On-Hand</TableHead>
                                                        <TableHead className="text-xs font-semibold text-right">Reserved</TableHead>
                                                        <TableHead className="text-xs font-semibold text-right">Available Free</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {materialBalances.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                                                                No raw material inventory records found.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        materialBalances.map((m, idx) => (
                                                            <TableRow key={m.materialId || m.materialCode || idx} className="hover:bg-slate-50/50">
                                                                <TableCell className="py-2.5">
                                                                    <div className="font-semibold text-xs text-slate-900">{m.materialName}</div>
                                                                    <span className="font-mono text-[11px] text-slate-500">{m.materialCode}</span>
                                                                </TableCell>
                                                                <TableCell className="py-2.5 text-xs text-slate-600">
                                                                    <div>{m.category || "RAW_MATERIAL"}</div>
                                                                    <span className="text-[11px] font-mono text-slate-400">HSN: {m.hsnCode || "—"}</span>
                                                                </TableCell>
                                                                <TableCell className="py-2.5 text-xs text-slate-600">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {m.warehouses?.map((w, wIdx) => (
                                                                            <Badge key={`${m.materialId || idx}-${w.warehouseId || wIdx}`} variant="outline" className="text-[10px] bg-slate-50">
                                                                                {w.warehouseName}: <strong className="ml-1 font-mono">{w.quantityOnHand} {m.unit}</strong>
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-slate-900">
                                                                    {m.quantityOnHand?.toLocaleString("en-IN")} {m.unit}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 text-right font-mono font-medium text-xs text-amber-800">
                                                                    {m.quantityReserved?.toLocaleString("en-IN")} {m.unit}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-emerald-800">
                                                                    {m.quantityAvailable?.toLocaleString("en-IN")} {m.unit}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}

                                    {/* 1C. Inbound Challan Lots View */}
                                    {stockSubTab === "challan-lots" && (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                            <Table>
                                                <TableHeader className="bg-slate-50/80">
                                                    <TableRow>
                                                        <TableHead className="text-xs font-semibold">Challan Ref No & Date</TableHead>
                                                        <TableHead className="text-xs font-semibold">Material</TableHead>
                                                        <TableHead className="text-xs font-semibold">Lot Number</TableHead>
                                                        <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                                                        <TableHead className="text-xs font-semibold text-right">Initial Received</TableHead>
                                                        <TableHead className="text-xs font-semibold text-right">Current Balance</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {materialBalances.flatMap((m) => m.lots || []).length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                                                                No active material lots recorded against customer inbound challans.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        materialBalances.flatMap((m, mIdx) =>
                                                            (m.lots || []).map((lot, lIdx) => (
                                                                <TableRow key={`${m.materialId || mIdx}-${lot._id || lot.lotNumber || lIdx}-${lIdx}`} className="hover:bg-slate-50/50">
                                                                    <TableCell className="py-2.5 font-mono text-xs">
                                                                        <div className="font-bold text-slate-900">{lot.challanNumber}</div>
                                                                        {lot.challanDate && (
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {new Date(lot.challanDate).toLocaleDateString()}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="py-2.5 text-xs text-slate-800 font-medium">
                                                                        {m.materialName} ({m.materialCode})
                                                                    </TableCell>
                                                                    <TableCell className="py-2.5 font-mono text-xs text-slate-700">
                                                                        {lot.lotNumber}
                                                                        {lot.supplierLotNumber && (
                                                                            <span className="block text-[10px] text-slate-400">
                                                                                Supplier: {lot.supplierLotNumber}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="py-2.5 text-xs text-slate-600">
                                                                        {lot.warehouseName}
                                                                    </TableCell>
                                                                    <TableCell className="py-2.5 text-right font-mono text-xs text-slate-500">
                                                                        {lot.initialQuantity?.toLocaleString("en-IN")} {lot.unit}
                                                                    </TableCell>
                                                                    <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-emerald-700">
                                                                        {lot.currentBalance?.toLocaleString("en-IN")} {lot.unit}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ======================================================== */}
                            {/* Tab 2: Drums */}
                            {/* ======================================================== */}
                            {activeTab === "drums" && (
                                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
                                    <Table>
                                        <TableHeader className="bg-slate-50/80">
                                            <TableRow>
                                                <TableHead className="text-xs font-semibold">Drum No / Code</TableHead>
                                                <TableHead className="text-xs font-semibold">Size (Flange x Core x Trav)</TableHead>
                                                <TableHead className="text-xs font-semibold">Ref RGP No</TableHead>
                                                <TableHead className="text-xs font-semibold">Inbound Challan</TableHead>
                                                <TableHead className="text-xs font-semibold">Type</TableHead>
                                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                                                        Loading drum inventory...
                                                    </TableCell>
                                                </TableRow>
                                            ) : !data?.drums?.length ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                                                        No drums received for this customer yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                data.drums.map((drum, idx) => (
                                                    <TableRow key={drum._id || idx} className="hover:bg-slate-50/50">
                                                        <TableCell className="py-2.5 font-mono font-semibold text-xs text-slate-900">
                                                            {drum.drumNumber}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 font-mono text-xs text-slate-700">
                                                            {drum.flangeDiameterMm && drum.barrelDiameterMm && drum.traverseWidthMm
                                                                ? `${drum.flangeDiameterMm}x${drum.barrelDiameterMm}x${drum.traverseWidthMm}`
                                                                : drum.sizeDescription || "44X16X24"}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 font-mono text-xs text-slate-800 font-medium">
                                                            {drum.refRgpNumber || "—"}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 font-mono text-xs text-slate-600">
                                                            {drum.inboundChallanNumber || "—"}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs text-slate-600 uppercase">
                                                            {drum.drumType || "WOODEN"}
                                                        </TableCell>
                                                        <TableCell className="py-2.5">
                                                            <span
                                                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                                                    drum.status === "AVAILABLE"
                                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                        : drum.status === "PACKED" || drum.status === "IN_USE"
                                                                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                                          : drum.status === "DISPATCHED"
                                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                            : "bg-slate-100 text-slate-600"
                                                                }`}
                                                            >
                                                                {drum.status}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* ======================================================== */}
                            {/* Tab 3: Inbound Challans */}
                            {/* ======================================================== */}
                            {activeTab === "inbound" && (
                                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
                                    <Table>
                                        <TableHeader className="bg-slate-50/80">
                                            <TableRow>
                                                <TableHead className="text-xs font-semibold">Challan / RGP #</TableHead>
                                                <TableHead className="text-xs font-semibold">Customer Challan Date</TableHead>
                                                <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                                                <TableHead className="text-xs font-semibold">Materials Received</TableHead>
                                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!data?.inboundChallans?.length ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">
                                                        No inbound delivery challans found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                data.inboundChallans.map((ic) => (
                                                    <TableRow key={ic._id} className="hover:bg-slate-50/50">
                                                        <TableCell className="py-2.5 font-mono text-xs">
                                                            <div className="font-bold text-slate-900">{ic.customerChallanNumber}</div>
                                                            <span className="text-[10px] text-slate-400 font-normal">Internal: {ic.challanNumber}</span>
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs text-slate-600">
                                                            {ic.customerChallanDate
                                                                ? new Date(ic.customerChallanDate).toLocaleDateString()
                                                                : new Date(ic.createdAt).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs text-slate-600">
                                                            {ic.warehouseId?.name || "Main Warehouse"}
                                                        </TableCell>
                                                        <TableCell className="py-2.5">
                                                            <div className="space-y-1">
                                                                {ic.lines?.map((line, lIdx) => (
                                                                    <div key={lIdx} className="text-xs text-slate-700 flex items-center justify-between gap-4 font-mono">
                                                                        <span className="font-sans font-medium text-slate-800">
                                                                            {line.materialName || line.materialId?.name || "Raw Material"}
                                                                        </span>
                                                                        <span className="font-bold text-slate-900">
                                                                            {line.quantityReceived?.toLocaleString("en-IN")} {line.unit}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] ${
                                                                    ic.status === "POSTED"
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        : "bg-slate-100 text-slate-600"
                                                                }`}
                                                            >
                                                                {ic.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* ======================================================== */}
                            {/* Tab 4: Outbound Challans & Consumption */}
                            {/* ======================================================== */}
                            {activeTab === "outbound" && (
                                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
                                    <Table>
                                        <TableHeader className="bg-slate-50/80">
                                            <TableRow>
                                                <TableHead className="text-xs font-semibold">Challan No & Date</TableHead>
                                                <TableHead className="text-xs font-semibold">Work Order #</TableHead>
                                                <TableHead className="text-xs font-semibold">Packing List / Invoice</TableHead>
                                                <TableHead className="text-xs font-semibold">Vehicle / Supply</TableHead>
                                                <TableHead className="text-xs font-semibold text-center">Material Sheet</TableHead>
                                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!data?.outboundChallans?.length ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                                                        No outbound challans dispatched to this customer yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                data.outboundChallans.map((oc) => (
                                                    <TableRow key={oc._id} className="hover:bg-slate-50/50">
                                                        <TableCell className="py-2.5 font-mono text-xs">
                                                            <div className="font-bold text-slate-900">{oc.challanNumber}</div>
                                                            <span className="text-[10px] text-slate-400">
                                                                {oc.challanDate ? new Date(oc.challanDate).toLocaleDateString() : "—"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-800">
                                                            {oc.workOrderId?.workOrderNumber || "—"}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs">
                                                            {oc.packingListId ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedPackingListId(oc.packingListId._id || oc.packingListId)}
                                                                    className="text-indigo-600 hover:text-indigo-800 underline font-mono font-medium flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    {oc.packingListId.packingListNumber || "View Packing List"}
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs text-slate-600">
                                                            <div>{oc.vehicleNumber || "—"}</div>
                                                            <span className="text-[10px] text-slate-400">{oc.placeOfSupply || "—"}</span>
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedChallanId(oc._id)}
                                                                className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 font-medium cursor-pointer"
                                                            >
                                                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                                                Consumption Sheet
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="py-2.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] ${
                                                                    oc.status === "DISPATCHED"
                                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                }`}
                                                            >
                                                                {oc.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* ======================================================== */}
                            {/* Tab 5: Process Loss & Scrap (Work Order & Challan Wise) */}
                            {/* ======================================================== */}
                            {activeTab === "scrap" && (
                                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-5 space-y-6">
                                    {/* Scrap Summary Banner */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-rose-50/60 rounded-xl border border-rose-200/80">
                                        <div>
                                            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                                                Total Party Scrap / Waste
                                            </span>
                                            <div className="text-2xl font-black font-mono text-rose-950 mt-1">
                                                {data?.scrapSummary?.totalScrapKg || summary.totalScrapKg || 0} kg
                                            </div>
                                            <span className="text-[10px] text-rose-700/80 mt-0.5 block">
                                                Accumulated across all Work Orders
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                                                Work Orders Scrapped
                                            </span>
                                            <div className="text-2xl font-black font-mono text-rose-950 mt-1">
                                                {scrapByWorkOrder.length} WOs
                                            </div>
                                            <span className="text-[10px] text-rose-700/80 mt-0.5 block">
                                                With recorded process loss
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                                                Inbound Challans Impacted
                                            </span>
                                            <div className="text-2xl font-black font-mono text-rose-950 mt-1">
                                                {scrapByChallan.length} Challans
                                            </div>
                                            <span className="text-[10px] text-rose-700/80 mt-0.5 block">
                                                Associated with raw material loss
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                                                Scrap Storage Location
                                            </span>
                                            <div className="text-sm font-bold text-rose-900 mt-1.5 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                Customer Scrap Yard
                                            </div>
                                            <span className="text-[10px] text-rose-700/80 mt-0.5 block">
                                                Saleable / Returnable to Party
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sub-view Navigation Switcher */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setScrapSubTab("work-order")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    scrapSubTab === "work-order"
                                                        ? "bg-white text-rose-900 shadow-xs ring-1 ring-rose-200"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <Briefcase className="w-3.5 h-3.5 text-rose-600" />
                                                Work Order Wise Scrap ({scrapByWorkOrder.length})
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setScrapSubTab("challan")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    scrapSubTab === "challan"
                                                        ? "bg-white text-rose-900 shadow-xs ring-1 ring-rose-200"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <Truck className="w-3.5 h-3.5 text-rose-600" />
                                                Challan Wise Scrap ({scrapByChallan.length})
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setScrapSubTab("material")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    scrapSubTab === "material"
                                                        ? "bg-white text-rose-900 shadow-xs ring-1 ring-rose-200"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <Scale className="w-3.5 h-3.5 text-rose-600" />
                                                Material Summary ({data?.scrapSummary?.materialBreakdown?.length || 0})
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setScrapSubTab("transactions")}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    scrapSubTab === "transactions"
                                                        ? "bg-white text-rose-900 shadow-xs ring-1 ring-rose-200"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                <FileText className="w-3.5 h-3.5 text-rose-600" />
                                                All Transactions ({scrapRecords.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* 5A. Work Order Wise Scrap View */}
                                    {scrapSubTab === "work-order" && (
                                        <div className="space-y-4">
                                            {scrapByWorkOrder.length === 0 ? (
                                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    No scrap recorded against any customer work orders yet.
                                                </div>
                                            ) : (
                                                scrapByWorkOrder.map((wo, woIdx) => (
                                                    <div
                                                        key={`${wo.workOrderId}-${woIdx}`}
                                                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                                                    >
                                                        {/* Work Order Header */}
                                                        <div className="p-3.5 bg-rose-50/40 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-xs">
                                                                    WO
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold text-sm text-slate-900 font-mono">
                                                                            {wo.workOrderNumber}
                                                                        </h4>
                                                                        {wo.cableSpecification && (
                                                                            <Badge variant="outline" className="text-[10px] bg-white text-slate-700 border-slate-200">
                                                                                {wo.cableSpecification}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                                        Challan Ref: <strong className="font-mono text-slate-800">{wo.challanNumber}</strong>
                                                                        {wo.challanDate && (
                                                                            <span className="text-slate-400 ml-1">
                                                                                (DT: {new Date(wo.challanDate).toLocaleDateString()})
                                                                            </span>
                                                                        )}
                                                                        &bull; {wo.recordsCount} scrap transactions
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="p-1.5 px-3 rounded-lg bg-white border border-rose-200 text-right">
                                                                    <span className="text-[10px] text-rose-700 uppercase tracking-wider block font-semibold">
                                                                        WO Total Scrap
                                                                    </span>
                                                                    <span className="font-mono font-black text-rose-900 text-sm">
                                                                        {wo.totalScrapKg.toLocaleString("en-IN")} kg
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Material Scrap Breakdown for this WO */}
                                                        <Table>
                                                            <TableHeader className="bg-slate-50/50">
                                                                <TableRow>
                                                                    <TableHead className="text-xs font-semibold">Scrap #</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Material Code & Name</TableHead>
                                                                    <TableHead className="text-xs font-semibold text-right">Scrap Qty</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Scrap Type / Stage</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Warehouse / Yard</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Date</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {wo.records.map((r, rIdx) => (
                                                                    <TableRow key={r._id || `${wo.workOrderId}-${rIdx}`} className="hover:bg-slate-50/50">
                                                                        <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                                                                            {r.scrapNumber}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5">
                                                                            <div className="font-semibold text-xs text-slate-900">
                                                                                {r.materialId?.name || "Raw Material"}
                                                                            </div>
                                                                            <span className="font-mono text-[11px] text-slate-500">
                                                                                {r.materialId?.code}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-rose-900">
                                                                            {r.scrapQuantity} {r.unit}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-700">
                                                                            <span className="capitalize font-medium">
                                                                                {r.scrapType?.replace(/_/g, " ").toLowerCase()}
                                                                            </span>
                                                                            {r.processStageId?.name && (
                                                                                <span className="block text-[10px] text-slate-400">
                                                                                    Stage: {r.processStageId.name}
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-600">
                                                                            {r.scrapWarehouseId?.name || "Customer Scrap Yard"}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-400 font-mono">
                                                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* 5B. Challan Wise Scrap View */}
                                    {scrapSubTab === "challan" && (
                                        <div className="space-y-4">
                                            {scrapByChallan.length === 0 ? (
                                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    No scrap associated with customer inbound challans yet.
                                                </div>
                                            ) : (
                                                scrapByChallan.map((ch, idx) => (
                                                    <div
                                                        key={`${ch.challanNumber}-${idx}`}
                                                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                                                    >
                                                        {/* Challan Card Header */}
                                                        <div className="p-3.5 bg-orange-50/40 border-b border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-bold text-xs">
                                                                    <Truck className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-slate-500 font-semibold uppercase">Challan Ref:</span>
                                                                        <h4 className="font-bold text-sm text-slate-900 font-mono">
                                                                            {ch.challanNumber}
                                                                        </h4>
                                                                        {ch.challanDate && (
                                                                            <span className="text-xs text-slate-500">
                                                                                DT: {new Date(ch.challanDate).toLocaleDateString()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                        <span className="text-[11px] text-slate-500">Work Orders:</span>
                                                                        {ch.workOrders?.map((wo, wIdx) => (
                                                                            <Badge key={wIdx} variant="outline" className="text-[10px] font-mono bg-white text-slate-700">
                                                                                {wo}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="p-1.5 px-3 rounded-lg bg-white border border-orange-200 text-right">
                                                                    <span className="text-[10px] text-orange-700 uppercase tracking-wider block font-semibold">
                                                                        Challan Scrap Total
                                                                    </span>
                                                                    <span className="font-mono font-black text-orange-950 text-sm">
                                                                        {ch.totalScrapKg.toLocaleString("en-IN")} kg
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Scrap Records for this Challan */}
                                                        <Table>
                                                            <TableHeader className="bg-slate-50/50">
                                                                <TableRow>
                                                                    <TableHead className="text-xs font-semibold">Work Order #</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Material</TableHead>
                                                                    <TableHead className="text-xs font-semibold text-right">Scrapped Qty</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Type / Reason</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Date</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {ch.records.map((r, rIdx) => (
                                                                    <TableRow key={r._id || `${ch.challanNumber}-${rIdx}`} className="hover:bg-slate-50/50">
                                                                        <TableCell className="py-2.5 font-mono text-xs font-bold text-slate-900">
                                                                            {r.resolvedWorkOrderNumber}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5">
                                                                            <div className="font-semibold text-xs text-slate-900">
                                                                                {r.materialId?.name || "Raw Material"}
                                                                            </div>
                                                                            <span className="font-mono text-[11px] text-slate-500">
                                                                                {r.materialId?.code}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-rose-900">
                                                                            {r.scrapQuantity} {r.unit}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-700">
                                                                            <span className="capitalize font-medium">
                                                                                {r.scrapType?.replace(/_/g, " ").toLowerCase()}
                                                                            </span>
                                                                            {r.reason && (
                                                                                <span className="block text-[10px] text-slate-400">
                                                                                    {r.reason}
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-600">
                                                                            {r.scrapWarehouseId?.name || "Customer Scrap Yard"}
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-slate-400 font-mono">
                                                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* 5C. Material Summary Breakdown Table */}
                                    {scrapSubTab === "material" && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <Scale className="w-4 h-4 text-rose-600" />
                                                Scrap Breakdown by Material Category
                                            </h4>
                                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/80">
                                                        <TableRow>
                                                            <TableHead className="text-xs font-semibold">Material Code & Name</TableHead>
                                                            <TableHead className="text-xs font-semibold text-right">Total Scrapped</TableHead>
                                                            <TableHead className="text-xs font-semibold text-right">Unit</TableHead>
                                                            <TableHead className="text-xs font-semibold text-center">Party Accounting</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {!data?.scrapSummary?.materialBreakdown ||
                                                        data.scrapSummary.materialBreakdown.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center text-xs text-slate-400 py-6">
                                                                    No scrap records posted yet for this customer.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            data.scrapSummary.materialBreakdown.map((m, idx) => (
                                                                <TableRow key={m.materialCode || idx} className="hover:bg-slate-50/60">
                                                                    <TableCell>
                                                                        <div className="font-semibold text-xs text-slate-900">
                                                                            {m.materialName}
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                                            {m.materialCode}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono font-bold text-xs text-rose-900">
                                                                        {m.totalKg?.toFixed(2)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs font-medium text-slate-600">
                                                                        {m.unit}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] bg-slate-50 text-slate-700 border-slate-200"
                                                                        >
                                                                            Customer Scrap Accounted
                                                                        </Badge>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 5D. All Historical Scrap Transactions */}
                                    {scrapSubTab === "transactions" && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-600" />
                                                Complete Scrap Transactions Ledger ({scrapRecords.length})
                                            </h4>
                                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/80">
                                                        <TableRow>
                                                            <TableHead className="text-xs font-semibold">Scrap #</TableHead>
                                                            <TableHead className="text-xs font-semibold">Work Order #</TableHead>
                                                            <TableHead className="text-xs font-semibold">Challan Ref</TableHead>
                                                            <TableHead className="text-xs font-semibold">Material</TableHead>
                                                            <TableHead className="text-xs font-semibold text-right">Quantity</TableHead>
                                                            <TableHead className="text-xs font-semibold">Type / Stage</TableHead>
                                                            <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                                                            <TableHead className="text-xs font-semibold">Date</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {scrapRecords.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={8} className="text-center py-6 text-xs text-slate-400">
                                                                    No scrap records recorded.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            scrapRecords.map((s) => (
                                                                <TableRow key={s._id} className="hover:bg-slate-50/60">
                                                                    <TableCell className="font-mono text-xs font-semibold text-slate-800">
                                                                        {s.scrapNumber}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs text-slate-900 font-bold">
                                                                        {s.resolvedWorkOrderNumber || s.workOrderId?.workOrderNumber || "—"}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs text-slate-700">
                                                                        {s.resolvedChallanNumber || "—"}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-800">
                                                                        <div className="font-medium">{s.materialId?.name || "Material"}</div>
                                                                        <span className="font-mono text-[10px] text-slate-400">{s.materialId?.code}</span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-xs font-bold text-rose-900">
                                                                        {s.scrapQuantity} {s.unit}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-600">
                                                                        <span className="capitalize">
                                                                            {s.scrapType?.replace(/_/g, " ").toLowerCase()}
                                                                        </span>
                                                                        {s.processStageId?.name && (
                                                                            <span className="block text-[10px] text-slate-400">
                                                                                {s.processStageId.name}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-600">
                                                                        {s.scrapWarehouseId?.name || "Customer Scrap Yard"}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-400 font-mono">
                                                                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="text-xs border-slate-200 cursor-pointer"
                            >
                                Close Overview
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Nested Packing List Dialog */}
            {selectedPackingListId && (
                <PackingListDocumentDialog
                    packingListId={selectedPackingListId}
                    open={!!selectedPackingListId}
                    onOpenChange={(val) => !val && setSelectedPackingListId(null)}
                />
            )}

            {/* Nested Material Consumption Sheet Dialog */}
            {selectedChallanId && (
                <MaterialConsumptionSheetDialog
                    challanId={selectedChallanId}
                    open={!!selectedChallanId}
                    onOpenChange={(val) => !val && setSelectedChallanId(null)}
                />
            )}
        </>
    );
}
