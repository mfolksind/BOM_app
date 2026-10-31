"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CreateDrumDialog } from "@/components/packing/create-drum-dialog";
import { EditDrumDialog } from "@/components/packing/edit-drum-dialog";
import { ReceiveCustomerDrumsDialog } from "@/components/packing/receive-customer-drums-dialog";
import { CreatePackingListDialog } from "@/components/packing/create-packing-list-dialog";
import { PackingListDocumentDialog } from "@/components/packing/packing-list-document-dialog";
import { MaterialConsumptionSheetDialog } from "@/components/dispatch/material-consumption-sheet-dialog";

import {
    Package,
    Plus,
    Search,
    RefreshCw,
    Eye,
    FileText,
    Boxes,
    Truck,
    Layers,
    ArrowRight,
    CheckCircle2,
    MoreVertical,
    Building2,
    FileCheck2,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
} from "lucide-react";

export default function PackingPage() {
    const searchParams = useSearchParams();
    const initialWoId = searchParams.get("workOrderId");

    const [activeTab, setActiveTab] = useState("packing-lists"); // 'packing-lists' | 'drums'

    // Packing Lists State
    const [packingLists, setPackingLists] = useState([]);
    const [loadingLists, setLoadingLists] = useState(true);

    // Drums State
    const [drums, setDrums] = useState([]);
    const [loadingDrums, setLoadingDrums] = useState(true);
    const [drumSearch, setDrumSearch] = useState("");
    const [drumStatusFilter, setDrumStatusFilter] = useState("ALL");
    const [drumOwnershipFilter, setDrumOwnershipFilter] = useState("ALL");
    const [drumCustomerFilter, setDrumCustomerFilter] = useState("ALL");
    const [drumViewMode, setDrumViewMode] = useState("company"); // 'company' | 'flat'
    const [expandedCompanies, setExpandedCompanies] = useState({});

    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    // Modals State
    const [createPackingOpen, setCreatePackingOpen] = useState(false);
    const [receiveDrumsOpen, setReceiveDrumsOpen] = useState(false);
    const [createDrumOpen, setCreateDrumOpen] = useState(false);
    const [editingDrum, setEditingDrum] = useState(null);

    // Document Previews
    const [previewPackingListId, setPreviewPackingListId] = useState(null);
    const [previewChallanId, setPreviewChallanId] = useState(null);
    const [selectedPackingCustomer, setSelectedPackingCustomer] = useState(null);
    const [selectedPackingCustomerName, setSelectedPackingCustomerName] = useState("");

    // Fetch Customers & Warehouses
    const fetchMasters = async () => {
        try {
            const [cRes, whRes] = await Promise.all([apiClient("/customers?limit=100"), apiClient("/warehouses?limit=100")]);
            if (cRes?.data) {
                setCustomers(Array.isArray(cRes.data) ? cRes.data : cRes.data.items || cRes.data.customers || []);
            }
            if (whRes?.data) {
                setWarehouses(Array.isArray(whRes.data) ? whRes.data : whRes.data.items || whRes.data.warehouses || []);
            }
        } catch (err) {
            console.error("Failed to load masters in packing page", err);
        }
    };

    // Fetch Packing Lists
    const fetchPackingLists = useCallback(async () => {
        setLoadingLists(true);
        try {
            const res = await apiClient("/packing-lists?limit=50");
            if (res.data) {
                setPackingLists(res.data.items || res.data || []);
            }
        } catch (err) {
            toast.error("Failed to load packing lists", { description: err.message });
        } finally {
            setLoadingLists(false);
        }
    }, []);

    // Fetch Drums
    const fetchDrums = useCallback(async () => {
        setLoadingDrums(true);
        try {
            const params = new URLSearchParams({ limit: "200" });
            if (drumStatusFilter !== "ALL") params.append("status", drumStatusFilter);
            if (drumOwnershipFilter !== "ALL") params.append("ownership", drumOwnershipFilter);
            if (drumCustomerFilter !== "ALL") params.append("customerId", drumCustomerFilter);
            if (drumSearch.trim()) params.append("search", drumSearch.trim());

            const res = await apiClient(`/drums?${params.toString()}`);
            if (res.data) {
                setDrums(res.data.items || res.data.drums || (Array.isArray(res.data) ? res.data : []));
            }
        } catch (err) {
            toast.error("Failed to load drums", { description: err.message });
        } finally {
            setLoadingDrums(false);
        }
    }, [drumStatusFilter, drumOwnershipFilter, drumCustomerFilter, drumSearch]);

    useEffect(() => {
        fetchMasters();
        fetchPackingLists();
        fetchDrums();
    }, [fetchPackingLists, fetchDrums]);

    // Handle Packing List Lifecycle Status Update: DRAFT -> PACKED
    const handlePackList = async (id) => {
        try {
            const res = await apiClient(`/packing-lists/${id}/pack`, { method: "POST" });
            if (res.data) {
                toast.success("Packing list finalized and drums sealed!");
                fetchPackingLists();
                fetchDrums();
            }
        } catch (err) {
            toast.error("Failed to finalize packing list", { description: err.message });
        }
    };

    // Handle Generating Delivery Challan with Consumption Sheet
    const handleGenerateChallan = async (pl) => {
        try {
            const res = await apiClient(`/packing-lists/${pl._id}/generate-challan`, {
                method: "POST",
                body: JSON.stringify({
                    deliveryPlace: "Client Site Yard",
                    transportMode: "BY_ROAD",
                    remarks: `Delivery challan for packed cable list ${pl.packingListNumber}`,
                }),
            });
            if (res.data) {
                toast.success(`Outbound Challan ${res.data.challanNumber} generated successfully!`);
                fetchPackingLists();
                if (res.data._id) {
                    setPreviewChallanId(res.data._id);
                }
            }
        } catch (err) {
            toast.error("Failed to generate challan", { description: err.message });
        }
    };

    // Group drums by Company / Customer for Company-Wise view
    const companyGroups = useMemo(() => {
        const groups = {};
        drums.forEach((drum) => {
            const isCust = drum.ownership === "CUSTOMER" || drum.ownership === "CUSTOMER_SUPPLIED" || Boolean(drum.customerId);
            const customerObj =
                (drum.customerId && typeof drum.customerId === "object" ? drum.customerId : null) ||
                customers.find((c) => String(c._id) === String(drum.customerId?._id || drum.customerId));

            const key = isCust
                ? customerObj?._id
                    ? String(customerObj._id)
                    : drum.customerId
                      ? String(drum.customerId)
                      : "CUSTOMER_OTHER"
                : "FACTORY_OWNED";

            const name = isCust
                ? customerObj?.name || customerObj?.legalName || drum.inboundChallanId?.customerId?.name || "Customer Supplied Drums"
                : "Factory Owned Inventory";

            const code = isCust ? customerObj?.code || "CUST" : "PLANT";

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    name,
                    code,
                    isCustomer: isCust,
                    customer: customerObj,
                    drums: [],
                    availableCount: 0,
                    packedCount: 0,
                    inUseCount: 0,
                    dispatchedCount: 0,
                    rgps: new Set(),
                };
            }

            groups[key].drums.push(drum);
            if (drum.status === "AVAILABLE" || drum.status === "EMPTY" || !drum.status) groups[key].availableCount++;
            if (drum.status === "PACKED") groups[key].packedCount++;
            if (drum.status === "IN_USE") groups[key].inUseCount++;
            if (drum.status === "DISPATCHED") groups[key].dispatchedCount++;
            if (drum.refRgpNumber) groups[key].rgps.add(drum.refRgpNumber);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.isCustomer && !b.isCustomer) return -1;
            if (!a.isCustomer && b.isCustomer) return 1;
            return b.drums.length - a.drums.length;
        });
    }, [drums, customers]);

    const toggleCompanyExpand = (companyId) => {
        setExpandedCompanies((prev) => ({
            ...prev,
            [companyId]: prev[companyId] === undefined ? false : !prev[companyId],
        }));
    };

    const isCompanyExpanded = (companyId) => {
        return expandedCompanies[companyId] !== false; // default open
    };

    return (
        <div className="space-y-6 p-6">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <Boxes className="w-7 h-7 text-orange-600" />
                        Cable Drums &amp; Packaging Operations
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage customer returnable empty drums received under Inbound Challan/RGP, allocate cable lengths, and generate
                        Packing Lists &amp; Delivery Challans.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Receive Customer Returnable Drums Action */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReceiveDrumsOpen(true)}
                        className="h-9 px-3 gap-1.5 border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100/60 shadow-xs cursor-pointer font-medium"
                    >
                        <Truck className="w-4 h-4" />
                        Receive Customer Drums (Inbound Challan)
                    </Button>

                    {/* Pack Cable into Drums Action */}
                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedPackingCustomer(null);
                            setSelectedPackingCustomerName("");
                            setCreatePackingOpen(true);
                        }}
                        className="h-9 px-3.5 gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shadow-xs cursor-pointer font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Pack Cable into Drums
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchPackingLists();
                            fetchDrums();
                            toast.success("Packaging data updated");
                        }}
                        disabled={loadingLists || loadingDrums}
                        className="h-9 px-3 gap-1.5 border-slate-200 text-slate-700 bg-white shadow-xs cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingLists || loadingDrums ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">Total Cable Drums</span>
                    <div className="text-2xl font-bold font-mono text-slate-900">{drums.length}</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Registered in Inventory</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                        Customer Yard Drums
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900">
                        {drums.filter((d) => d.customerId || d.ownership === "CUSTOMER_SUPPLIED" || d.ownership === "CUSTOMER").length}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        Across {companyGroups.filter((g) => g.isCustomer).length} Customer Companies
                    </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                        Available Empty Drums
                    </span>
                    <div className="text-2xl font-bold font-mono text-emerald-700">
                        {drums.filter((d) => d.status === "AVAILABLE" || d.status === "EMPTY" || !d.status).length}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Ready for Cable Winding</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                        Active Packing Runs
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900">{packingLists.length}</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Packing Lists Recorded</span>
                </div>
            </div>

            {/* Tabs Bar */}
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab("packing-lists")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === "packing-lists"
                            ? "border-orange-600 text-orange-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <Package className="w-4 h-4" />
                    Packing Lists ({packingLists.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("drums")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === "drums"
                            ? "border-orange-600 text-orange-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    Cable Drums &amp; Ref RGP Inventory ({drums.length})
                </button>
            </div>

            {/* TAB 1: PACKING LISTS */}
            {activeTab === "packing-lists" && (
                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 shadow-xs overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                            <TableRow>
                                <TableHead className="text-xs font-semibold text-slate-700">Packing List No</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700">Customer &amp; Work Order</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700">Cable Size (SIZE)</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700 text-right">Total Packed Length</TableHead>
                                {/* <TableHead className="text-xs font-semibold text-slate-700 text-center">Drums</TableHead> */}
                                <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loadingLists ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-600 mb-2" />
                                        Loading packing lists...
                                    </TableCell>
                                </TableRow>
                            ) : packingLists.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-14 text-center text-slate-500 text-xs">
                                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="font-semibold text-slate-800">No packing lists created yet.</p>
                                        <p className="text-slate-400 mt-1">
                                            Click <strong>&quot;Pack Cable into Drums&quot;</strong> to pack cables from a Production Order
                                            into drums.
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                packingLists.map((pl) => {
                                    const isShortageDraft =
                                        pl.status === "DRAFT" && (pl.remarks?.includes("SHORTAGE") || pl.remarks?.includes("Pending"));

                                    return (
                                        <TableRow key={pl._id} className="hover:bg-slate-50/60">
                                            <TableCell className="py-3">
                                                <div className="font-mono font-bold text-xs text-slate-900">{pl.packingListNumber}</div>
                                                <div className="text-[11px] text-slate-400">
                                                    {pl.packingDate ? new Date(pl.packingDate).toLocaleDateString("en-GB") : "—"}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3">
                                                <div className="font-semibold text-xs text-slate-900">
                                                    {pl.customerId?.name || "Customer"}
                                                </div>
                                                <div className="text-[11px] font-mono text-indigo-700">
                                                    WO: {pl.workOrderId?.workOrderNumber || pl.workOrderNumber || "—"}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3 font-mono font-semibold text-xs text-slate-800">
                                                {pl.sizeDescription || pl.productId?.code || "4CX35 SQMM A2XFY"}
                                            </TableCell>

                                            <TableCell className="py-3 text-right font-mono font-bold text-xs text-indigo-700">
                                                {pl.totalLengthMeters ? pl.totalLengthMeters.toLocaleString("en-IN") : "0.0"} m
                                            </TableCell>
                                            {/* 
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className="font-mono text-xs bg-slate-50 font-bold text-slate-800">
                            {pl.totalDrums || pl.drumNumbers?.length || pl.lines?.length || 0} drums
                          </Badge>
                          {Array.isArray(pl.drumNumbers) && pl.drumNumbers.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                              {pl.drumNumbers.map((dNo, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-orange-50 text-orange-700 border border-orange-200"
                                  title={`Drum #${dNo}`}
                                >
                                  {dNo}
                                </span>
                              ))}
                            </div>
                          ) : Array.isArray(pl.lines) && pl.lines.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                              {pl.lines.map((l, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-orange-50 text-orange-700 border border-orange-200"
                                  title={`Drum #${l.drumNumber}`}
                                >
                                  {l.drumNumber}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </TableCell> */}

                                            <TableCell className="py-3">
                                                <div className="space-y-1">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                            pl.status === "CHALLAN_CREATED"
                                                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                : pl.status === "PACKED"
                                                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                                                        }`}
                                                    >
                                                        {pl.status}
                                                    </span>
                                                    {isShortageDraft && (
                                                        <div className="flex items-center gap-1 text-[10px] text-amber-800 font-medium">
                                                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                            <span>Waiting for Drums</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {/* Image 1 Document Button */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setPreviewPackingListId(pl._id)}
                                                        className="h-8 text-xs px-2.5 gap-1.5 text-slate-700 hover:text-orange-700 hover:border-orange-300"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                                                        Packing List
                                                    </Button>

                                                    {/* Step 1 Completion: Finalize DRAFT to PACKED */}
                                                    {pl.status === "DRAFT" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePackList(pl._id)}
                                                            className="h-8 text-xs px-2.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Finalize &amp; Seal Drums
                                                        </Button>
                                                    )}

                                                    {/* Step 2: Generate Delivery Challan with Consumption Sheet   */}
                                                    {pl.status === "PACKED" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleGenerateChallan(pl)}
                                                            className="h-8 text-xs px-2.5 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                                                        >
                                                            <Truck className="w-3.5 h-3.5" />
                                                            Create Outbound Challan
                                                        </Button>
                                                    )}

                                                    {/* If Challan Already Created, allow viewing Image 2 */}
                                                    {pl.status === "CHALLAN_CREATED" && pl.outboundChallanId && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setPreviewChallanId(pl.outboundChallanId?._id || pl.outboundChallanId)
                                                            }
                                                            className="h-8 text-xs px-2.5 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                                        >
                                                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            Consumption Sheet
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* TAB 2: CABLE DRUMS & REF RGP INVENTORY (COMPANY-WISE) */}
            {activeTab === "drums" && (
                <div className="space-y-4">
                    {/* Controls Bar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                            <button
                                type="button"
                                onClick={() => setDrumViewMode("company")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                    drumViewMode === "company" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                Company-Wise View ({companyGroups.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDrumViewMode("flat")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                    drumViewMode === "flat" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5 text-slate-600" />
                                All Drums Flat List
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Search Drum No or Ref RGP..."
                                    value={drumSearch}
                                    onChange={(e) => setDrumSearch(e.target.value)}
                                    className="pl-9 h-9 text-xs bg-slate-50/50"
                                />
                            </div>

                            <Select value={drumStatusFilter} onValueChange={setDrumStatusFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-xs">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="AVAILABLE" className="text-xs">
                                        Available Empty
                                    </SelectItem>
                                    <SelectItem value="PACKED" className="text-xs">
                                        Packed with Cable
                                    </SelectItem>
                                    <SelectItem value="IN_USE" className="text-xs">
                                        In Use
                                    </SelectItem>
                                    <SelectItem value="DISPATCHED" className="text-xs">
                                        Dispatched to Client
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={drumOwnershipFilter} onValueChange={setDrumOwnershipFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-xs">
                                    <SelectValue placeholder="All Ownership" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">
                                        All Ownership
                                    </SelectItem>
                                    <SelectItem value="CUSTOMER" className="text-xs">
                                        Customer Supplied
                                    </SelectItem>
                                    <SelectItem value="FACTORY" className="text-xs">
                                        Factory Owned
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={drumCustomerFilter} onValueChange={setDrumCustomerFilter}>
                                <SelectTrigger className="w-[170px] h-9 text-xs">
                                    <SelectValue placeholder="All Customers">
                                        {(() => {
                                            if (drumCustomerFilter === "ALL") return "All Customers";
                                            const c = (Array.isArray(customers) ? customers : []).find(
                                                (cust) => String(cust._id) === String(drumCustomerFilter),
                                            );
                                            return c ? `${c.name} (${c.code || "CUST"})` : "Customer";
                                        })()}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">
                                        All Customers
                                    </SelectItem>
                                    {(Array.isArray(customers) ? customers : []).map((c) => (
                                        <SelectItem key={c._id} value={c._id} className="text-xs">
                                            {c.name} ({c.code || "CUST"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                size="sm"
                                onClick={() => setCreateDrumOpen(true)}
                                className="h-9 px-3 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Reel
                            </Button>
                        </div>
                    </div>

                    {/* VIEW MODE 1: COMPANY-WISE DRUMS */}
                    {drumViewMode === "company" && (
                        <div className="space-y-4">
                            {loadingDrums ? (
                                <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-xl border border-slate-200">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-600 mb-2" />
                                    Loading company-wise drum inventory...
                                </div>
                            ) : companyGroups.length === 0 ? (
                                <div className="bg-white p-12 text-center text-slate-500 text-xs rounded-xl border border-slate-200">
                                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="font-semibold text-slate-800">No drums found matching current filters.</p>
                                </div>
                            ) : (
                                companyGroups.map((group) => {
                                    const expanded = isCompanyExpanded(group.id);
                                    const rgpList = Array.from(group.rgps);

                                    return (
                                        <div
                                            key={group.id}
                                            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                                        >
                                            {/* Company Header */}
                                            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCompanyExpand(group.id)}
                                                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                                                    >
                                                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>

                                                    <div
                                                        className={`p-2 rounded-lg ${group.isCustomer ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"}`}
                                                    >
                                                        {group.isCustomer ? (
                                                            <Building2 className="w-5 h-5" />
                                                        ) : (
                                                            <Boxes className="w-5 h-5" />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-sm text-slate-900">{group.name}</h3>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] font-mono bg-white text-slate-700"
                                                            >
                                                                {group.code}
                                                            </Badge>
                                                            {group.isCustomer && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                >
                                                                    Customer Supplied
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                                                            <span>
                                                                Total:{" "}
                                                                <strong className="text-slate-900 font-mono">{group.drums.length}</strong>{" "}
                                                                drums
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-emerald-700 font-medium">
                                                                <strong className="font-mono">{group.availableCount}</strong> Available
                                                                Empty in Yard
                                                            </span>
                                                            {group.packedCount > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-purple-700 font-medium">
                                                                        <strong className="font-mono">{group.packedCount}</strong> Packed
                                                                    </span>
                                                                </>
                                                            )}
                                                            {rgpList.length > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="font-mono text-slate-600">
                                                                        RGPs: {rgpList.join(", ")}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions per Company */}
                                                <div className="flex items-center gap-2">
                                                    {group.isCustomer && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setReceiveDrumsOpen(true)}
                                                                className="h-8 text-xs px-2.5 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                            >
                                                                <Truck className="w-3.5 h-3.5 text-orange-600" />
                                                                Receive Drums
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedPackingCustomer(group.id);
                                                                    setSelectedPackingCustomerName(group.name);
                                                                    setCreatePackingOpen(true);
                                                                }}
                                                                className="h-8 text-xs px-2.5 gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-xs cursor-pointer"
                                                            >
                                                                <Package className="w-3.5 h-3.5" />
                                                                Pack Cable into Drums
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Drum Table for Company */}
                                            {expanded && (
                                                <Table>
                                                    <TableHeader className="bg-slate-100/50 border-b border-slate-200">
                                                        <TableRow>
                                                            <TableHead className="text-xs font-semibold text-slate-700">
                                                                Drum Identification #
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold text-slate-700">
                                                                Size (Flange x Core x Trav)
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold text-slate-700">
                                                                Ref RGP No
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold text-slate-700">
                                                                Inbound Challan
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold text-slate-700">Type</TableHead>
                                                            <TableHead className="text-xs font-semibold text-slate-700">
                                                                Tare Weight
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                                                            <TableHead className="text-right text-xs font-semibold text-slate-700">
                                                                Actions
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>

                                                    <TableBody>
                                                        {group.drums.map((drum) => (
                                                            <TableRow key={drum._id} className="hover:bg-slate-50/50">
                                                                <TableCell className="py-2.5 font-mono font-bold text-xs text-slate-900">
                                                                    {drum.drumNumber}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 font-mono text-xs text-slate-700">
                                                                    {drum.sizeDescription ||
                                                                        (drum.flangeDiameterMm &&
                                                                        drum.barrelDiameterMm &&
                                                                        drum.traverseWidthMm
                                                                            ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
                                                                            : "44X16X24")}
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
                                                                <TableCell className="py-2.5 font-mono text-xs text-slate-600">
                                                                    {drum.tareWeightKg || 150} kg
                                                                </TableCell>
                                                                <TableCell className="py-2.5">
                                                                    <span
                                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                                                            drum.status === "AVAILABLE" || drum.status === "EMPTY"
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
                                                                <TableCell className="py-2.5 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setEditingDrum(drum)}
                                                                        className="h-7 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* VIEW MODE 2: FLAT LIST OF ALL DRUMS */}
                    {drumViewMode === "flat" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                            <Table>
                                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="text-xs font-semibold text-slate-700">Drum Identification #</TableHead>
                                        <TableHead className="text-xs font-semibold text-slate-700">Size (Flange x Core x Trav)</TableHead>
                                        <TableHead className="text-xs font-semibold text-slate-700">Ref RGP No</TableHead>
                                        <TableHead className="text-xs font-semibold text-slate-700">Inbound Challan</TableHead>
                                        <TableHead className="text-xs font-semibold text-slate-700">Customer / Owner</TableHead>
                                        <TableHead className="text-xs font-semibold text-slate-700">Type</TableHead>
                                        <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                                        <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loadingDrums ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-400">
                                                Loading drum inventory...
                                            </TableCell>
                                        </TableRow>
                                    ) : drums.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                                                No drums match the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        drums.map((drum) => (
                                            <TableRow key={drum._id} className="hover:bg-slate-50/50">
                                                <TableCell className="py-2.5 font-mono font-bold text-xs text-slate-900">
                                                    {drum.drumNumber}
                                                </TableCell>
                                                <TableCell className="py-2.5 font-mono text-xs text-slate-700">
                                                    {drum.sizeDescription ||
                                                        (drum.flangeDiameterMm && drum.barrelDiameterMm && drum.traverseWidthMm
                                                            ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
                                                            : "44X16X24")}
                                                </TableCell>
                                                <TableCell className="py-2.5 font-mono text-xs text-slate-800 font-medium">
                                                    {drum.refRgpNumber || "—"}
                                                </TableCell>
                                                <TableCell className="py-2.5 font-mono text-xs text-slate-600">
                                                    {drum.inboundChallanNumber || "—"}
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs">
                                                    {(() => {
                                                        const isCust =
                                                            drum.ownership === "CUSTOMER" ||
                                                            drum.ownership === "CUSTOMER_SUPPLIED" ||
                                                            Boolean(drum.customerId);
                                                        const customerObj =
                                                            (drum.customerId && typeof drum.customerId === "object"
                                                                ? drum.customerId
                                                                : null) ||
                                                            customers.find(
                                                                (c) => c._id === drum.customerId || c._id === drum.customerId?._id,
                                                            );
                                                        const customerName =
                                                            customerObj?.name ||
                                                            customerObj?.legalName ||
                                                            drum.inboundChallanId?.customerId?.name ||
                                                            (isCust ? "Customer Supplied" : "Factory Owned");

                                                        return isCust ? (
                                                            <div>
                                                                <span className="font-semibold text-slate-900 block">{customerName}</span>
                                                                {customerObj?.code && (
                                                                    <span className="font-mono text-[10px] text-slate-400">
                                                                        {customerObj.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-600 font-medium">Factory Owned</span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs text-slate-600 uppercase">
                                                    {drum.drumType || "WOODEN"}
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                                            drum.status === "AVAILABLE" || drum.status === "EMPTY"
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
                                                <TableCell className="py-2.5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingDrum(drum)}
                                                        className="h-7 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                                                    >
                                                        Edit
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {/* Receive Customer Returnable Drums Dialog */}
            <ReceiveCustomerDrumsDialog
                open={receiveDrumsOpen}
                onOpenChange={setReceiveDrumsOpen}
                customers={customers}
                warehouses={warehouses}
                onSuccess={() => {
                    fetchDrums();
                    toast.success("Customer returnable drums received into warehouse yard!");
                }}
            />

            {/* Create / Pack Cable into Drums Dialog */}
            <CreatePackingListDialog
                open={createPackingOpen}
                onOpenChange={(val) => {
                    setCreatePackingOpen(val);
                    if (!val) {
                        setSelectedPackingCustomer(null);
                        setSelectedPackingCustomerName("");
                    }
                }}
                defaultWorkOrderId={initialWoId}
                defaultCustomerId={selectedPackingCustomer}
                defaultCustomerName={selectedPackingCustomerName}
                onSuccess={() => {
                    fetchPackingLists();
                    fetchDrums();
                }}
            />

            {/* Register Reel / Drum Dialog */}
            <CreateDrumDialog
                open={createDrumOpen}
                onOpenChange={setCreateDrumOpen}
                customers={customers}
                warehouses={warehouses}
                onSuccess={() => fetchDrums()}
            />

            {/* Edit Drum Dialog */}
            {editingDrum && (
                <EditDrumDialog
                    drum={editingDrum}
                    open={!!editingDrum}
                    onOpenChange={(val) => !val && setEditingDrum(null)}
                    customers={customers}
                    initialMode="edit"
                    onSuccess={() => fetchDrums()}
                />
            )}

            {/* Official Packing List Document Preview (Image 1) */}
            {previewPackingListId && (
                <PackingListDocumentDialog
                    packingListId={previewPackingListId}
                    open={Boolean(previewPackingListId)}
                    onOpenChange={(val) => !val && setPreviewPackingListId(null)}
                />
            )}

            {/* Material Consumption Sheet Dialog   */}
            {previewChallanId && (
                <MaterialConsumptionSheetDialog
                    challanId={previewChallanId}
                    open={Boolean(previewChallanId)}
                    onOpenChange={(val) => !val && setPreviewChallanId(null)}
                />
            )}
        </div>
    );
}
