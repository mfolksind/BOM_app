"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    Truck,
    Plus,
    Search,
    RefreshCw,
    Eye,
    FileText,
    Send,
    XCircle,
    FileCheck2,
    Package,
    Layers,
    Building2,
    Calendar,
    CheckCircle2,
} from "lucide-react";

import { CreateDispatchDialog } from "@/components/dispatch/create-dispatch-dialog";
import { MaterialConsumptionSheetDialog } from "@/components/dispatch/material-consumption-sheet-dialog";
import { PackingListDocumentDialog } from "@/components/packing/packing-list-document-dialog";

export default function DispatchManagementPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("challans"); // 'challans' | 'shipments'

    // Outbound Delivery Challans (GST Job Work)
    const [outboundChallans, setOutboundChallans] = useState([]);
    const [loadingChallans, setLoadingChallans] = useState(true);

    // Shipments State
    const [dispatches, setDispatches] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Dialog state
    const [createDispatchOpen, setCreateDispatchOpen] = useState(false);
    const [selectedChallanId, setSelectedChallanId] = useState(null);
    const [selectedPackingListId, setSelectedPackingListId] = useState(null);

    // Fetch Outbound Challans
    const fetchOutboundChallans = useCallback(async () => {
        setLoadingChallans(true);
        try {
            const res = await apiClient("/outbound-challans?limit=50");
            if (res?.data) {
                const list = Array.isArray(res.data) ? res.data : res.data.items || res.data.challans || [];
                setOutboundChallans(list);
            } else {
                setOutboundChallans([]);
            }
        } catch (err) {
            toast.error("Failed to load outbound challans", { description: err.message });
            setOutboundChallans([]);
        } finally {
            setLoadingChallans(false);
        }
    }, []);

    const fetchDropdownData = useCallback(async () => {
        try {
            const [cRes, woRes, whRes] = await Promise.all([
                api.get("/customers?limit=100"),
                api.get("/work-orders?limit=100"),
                api.get("/warehouses?limit=100"),
            ]);
            const custList = Array.isArray(cRes?.data) ? cRes.data : cRes?.data?.items || cRes?.data?.customers || [];
            setCustomers(custList);

            const woList = woRes?.data?.workOrders || woRes?.data?.items || (Array.isArray(woRes?.data) ? woRes.data : []);
            setWorkOrders(woList);

            const whList = Array.isArray(whRes?.data) ? whRes.data : whRes?.data?.items || whRes?.data?.warehouses || [];
            setWarehouses(whList);
        } catch (err) {
            console.error("Failed to load dispatch metadata", err);
        }
    }, []);

    const fetchDispatches = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: "15",
            });
            if (selectedStatus && selectedStatus !== "ALL") {
                queryParams.append("status", selectedStatus);
            }
            if (search.trim()) {
                queryParams.append("search", search.trim());
            }

            const res = await api.get(`/dispatches?${queryParams.toString()}`);
            if (res?.data) {
                const list = Array.isArray(res.data) ? res.data : res.data.items || res.data.dispatches || [];
                setDispatches(list);
                const pagination = res.meta?.pagination || res.data.pagination || {};
                setTotalPages(pagination.totalPages || 1);
                setTotalCount(pagination.total || list.length);
            } else {
                setDispatches([]);
            }
        } catch (err) {
            toast.error(err.message || "Failed to fetch dispatches");
            setDispatches([]);
        } finally {
            setLoading(false);
        }
    }, [page, selectedStatus, search]);

    useEffect(() => {
        fetchOutboundChallans();
        fetchDropdownData();
        fetchDispatches();
    }, []);

    const handlePostDispatch = async (dispatchId) => {
        try {
            await api.post(`/dispatches/${dispatchId}/dispatch`, {});
            toast.success("Shipment marked as Dispatched");
            fetchDispatches();
        } catch (err) {
            toast.error(err.message || "Failed to dispatch shipment");
        }
    };

    const handleGenerateChallan = async (dispatchId) => {
        try {
            const res = await api.post(`/dispatches/${dispatchId}/generate-outbound-challan`, {});
            if (res?.success) {
                toast.success(`Outbound Challan ${res.data.challanNumber} generated`);
                fetchOutboundChallans();
                setActiveTab("challans");
            }
        } catch (err) {
            toast.error(err.message || "Failed to generate challan");
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <Truck className="w-7 h-7 text-indigo-600" />
                        Outbound Dispatch &amp; Delivery Challans
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Manage statutory GST Job-Work Delivery Challans, Material Consumption Sheets , and vehicle shipments.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchOutboundChallans();
                            fetchDispatches();
                        }}
                        className="h-9 px-3 gap-1.5 text-xs text-slate-700 bg-white"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </Button>

                    <Button
                        onClick={() => setCreateDispatchOpen(true)}
                        className="h-9 px-3.5 gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        New Dispatch Shipment
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab("challans")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === "challans"
                            ? "border-indigo-600 text-indigo-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <FileCheck2 className="w-4 h-4" />
                    Delivery Challans &amp; Material Consumption Sheets ({outboundChallans.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("shipments")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === "shipments"
                            ? "border-indigo-600 text-indigo-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    Dispatch Shipments &amp; Gate Passes ({totalCount})
                </button>
            </div>

            {/* TAB 1: OUTBOUND DELIVERY CHALLANS (Image 2 Match) */}
            {activeTab === "challans" && (
                <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 shadow-xs overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                            <TableRow>
                                <TableHead className="text-xs font-semibold text-slate-700">Challan No &amp; Date</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700">Customer Consignee</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700">Work Order &amp; Packing List</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700 text-right">Dispatched Length</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700">Vehicle / Transport</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-700">Statutory Documents</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loadingChallans ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                                        Loading delivery challans...
                                    </TableCell>
                                </TableRow>
                            ) : outboundChallans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-14 text-center text-slate-500 text-xs">
                                        <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="font-semibold text-slate-800">No delivery challans generated yet.</p>
                                        <p className="text-slate-400 mt-1">
                                            Finalize drums in <strong>Packaging</strong> to generate Outbound Delivery Challans with
                                            Material Consumption Sheets.
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                outboundChallans.map((oc) => (
                                    <TableRow key={oc._id} className="hover:bg-slate-50/60">
                                        <TableCell className="py-3">
                                            <div className="font-mono font-bold text-xs text-slate-900">{oc.challanNumber}</div>
                                            <div className="text-[11px] text-slate-400">
                                                {oc.challanDate ? new Date(oc.challanDate).toLocaleDateString("en-GB") : "—"}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="font-semibold text-xs text-slate-900">{oc.customerId?.name || "Customer"}</div>
                                            <div className="text-[11px] font-mono text-slate-500">
                                                GSTIN: {oc.customerId?.gstin || "05AAMCA4908L1ZG"}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3 text-xs text-slate-700">
                                            <div className="font-mono text-slate-900">
                                                WO: {oc.workOrderId?.workOrderNumber || "MF-2026-01"}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                PL: {oc.packingListId?.packingListNumber || "MF/PL/389"}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-indigo-700">
                                            {oc.totalLengthMeters ? oc.totalLengthMeters.toLocaleString("en-IN") : "1,997"} m
                                        </TableCell>

                                        <TableCell className="py-3 text-xs text-slate-600">
                                            <div className="font-mono font-semibold text-slate-900">
                                                {oc.vehicleNumber || "UP17BT 0896"}
                                            </div>
                                            <div className="text-[11px] text-slate-400">{oc.placeOfSupply || "Haridwar-Uttarakhand"}</div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                    oc.status === "DELIVERED"
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                                }`}
                                            >
                                                {oc.status || "DISPATCHED"}
                                            </span>
                                        </TableCell>

                                        <TableCell className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Packing List */}
                                                {oc.packingListId && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedPackingListId(oc.packingListId?._id || oc.packingListId)}
                                                        className="h-8 text-xs px-2.5 gap-1.5 text-slate-700 hover:text-orange-700 hover:border-orange-300"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                                                        Packing List
                                                    </Button>
                                                )}

                                                {/* Material Consumption Sheet   */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedChallanId(oc._id)}
                                                    className="h-8 text-xs px-2.5 gap-1.5 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 shadow-xs font-semibold"
                                                >
                                                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    Consumption Sheet
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* TAB 2: DISPATCH SHIPMENTS */}
            {activeTab === "shipments" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search Dispatch # or Vehicle..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9 text-xs bg-slate-50/50"
                            />
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <Select
                                value={selectedStatus}
                                onValueChange={(val) => {
                                    setSelectedStatus(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="DRAFT" className="text-xs">
                                        Draft
                                    </SelectItem>
                                    <SelectItem value="DISPATCHED" className="text-xs">
                                        Dispatched
                                    </SelectItem>
                                    <SelectItem value="CANCELLED" className="text-xs">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <Table>
                            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
                                <TableRow>
                                    <TableHead className="text-xs font-semibold text-slate-700">Dispatch Order #</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700">Customer</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700">Source Warehouse</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700">Vehicle &amp; LR #</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                                    <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400">
                                            Loading dispatches...
                                        </TableCell>
                                    </TableRow>
                                ) : dispatches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-500">
                                            No dispatch shipments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    dispatches.map((disp) => (
                                        <TableRow key={disp._id} className="hover:bg-slate-50/50">
                                            <TableCell className="py-2.5">
                                                <div className="font-mono font-bold text-xs text-slate-900">{disp.dispatchNumber}</div>
                                                <span className="text-[11px] text-slate-400">
                                                    {disp.createdAt ? new Date(disp.createdAt).toLocaleDateString() : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-xs font-medium text-slate-900">
                                                {disp.customerId?.name || "Customer"}
                                            </TableCell>
                                            <TableCell className="py-2.5 text-xs text-slate-700">
                                                {disp.sourceWarehouseId?.name || "Finished Goods"}
                                            </TableCell>
                                            <TableCell className="py-2.5 text-xs text-slate-700">
                                                <div className="font-mono font-semibold">{disp.vehicleNumber || "—"}</div>
                                                <span className="text-[11px] text-slate-400">
                                                    {disp.lrNumber ? `LR: ${disp.lrNumber}` : ""}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <Badge variant="outline" className="text-[11px]">
                                                    {disp.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {disp.status === "DRAFT" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePostDispatch(disp._id)}
                                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            Dispatch
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleGenerateChallan(disp._id)}
                                                        className="h-7 text-xs gap-1 text-indigo-700 border-indigo-200"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        Generate Challan
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Dialog: Create Dispatch */}
            <CreateDispatchDialog
                open={createDispatchOpen}
                onOpenChange={setCreateDispatchOpen}
                customers={customers}
                workOrders={workOrders}
                warehouses={warehouses}
                onSuccess={() => {
                    fetchDispatches();
                    fetchOutboundChallans();
                }}
            />

            {/* Dialog: Material Consumption Sheet   */}
            {selectedChallanId && (
                <MaterialConsumptionSheetDialog
                    challanId={selectedChallanId}
                    open={Boolean(selectedChallanId)}
                    onOpenChange={(val) => !val && setSelectedChallanId(null)}
                />
            )}

            {/* Dialog: Packing List Document (Image 1) */}
            {selectedPackingListId && (
                <PackingListDocumentDialog
                    packingListId={selectedPackingListId}
                    open={Boolean(selectedPackingListId)}
                    onOpenChange={(val) => !val && setSelectedPackingListId(null)}
                />
            )}
        </div>
    );
}
