"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { CreateScrapChallanDialog } from "@/components/scraps/create-scrap-challan-dialog";
import { ScrapConsumptionSheetDialog } from "@/components/scraps/scrap-consumption-sheet-dialog";

import {
    Trash2,
    Plus,
    Search,
    RefreshCw,
    FileSpreadsheet,
    FileText,
    Truck,
    Layers,
    FilterX,
    Building2,
    Calendar,
    ArrowUpRight,
} from "lucide-react";

export default function ScrapsManagementPage() {
    const [scrapChallans, setScrapChallans] = useState([]);
    const [loadingChallans, setLoadingChallans] = useState(true);
    const [customers, setCustomers] = useState([]);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");

    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [previewChallanId, setPreviewChallanId] = useState(null);

    // Fetch customers for filter
    const fetchCustomers = async () => {
        try {
            const res = await apiClient("/customers?limit=100");
            if (res?.data) {
                const list = Array.isArray(res.data) ? res.data : res.data.items || res.data.customers || [];
                setCustomers(list);
            }
        } catch (err) {
            console.error("Failed to load customers in scraps page", err);
        }
    };

    // Fetch scrap challans
    const fetchScrapChallans = useCallback(async () => {
        setLoadingChallans(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (selectedCustomer && selectedCustomer !== "ALL") params.append("customerId", selectedCustomer);
            if (selectedStatus && selectedStatus !== "ALL") params.append("status", selectedStatus);
            if (search.trim()) params.append("search", search.trim());

            const res = await apiClient(`/outbound-challans/scrap?${params.toString()}`);
            if (res?.data) {
                const list = Array.isArray(res.data) ? res.data : res.data.items || res.data.challans || [];
                setScrapChallans(list);
            } else {
                setScrapChallans([]);
            }
        } catch (err) {
            toast.error("Failed to load scrap challans", { description: err.message });
            setScrapChallans([]);
        } finally {
            setLoadingChallans(false);
        }
    }, [selectedCustomer, selectedStatus, search]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        fetchScrapChallans();
    }, [fetchScrapChallans]);

    // Customer options for SearchableSelect
    const customerFilterOptions = useMemo(() => {
        const list = [{ value: "ALL", label: "All Customers" }];
        (customers || []).forEach((c) => {
            list.push({
                value: String(c._id),
                label: c.name,
                code: c.code || "CUST",
                subLabel: c.phone || c.email || "",
            });
        });
        return list;
    }, [customers]);

    // Metrics
    const totalScrapWeight = useMemo(() => {
        return scrapChallans.reduce((sum, c) => sum + (c.totalScrapQuantity || 0), 0);
    }, [scrapChallans]);

    const uniqueCustomersCount = useMemo(() => {
        const ids = new Set(scrapChallans.map((c) => c.customerId?._id || c.customerId).filter(Boolean));
        return ids.size;
    }, [scrapChallans]);

    const uniqueWOsCount = useMemo(() => {
        let count = 0;
        scrapChallans.forEach((c) => {
            count += c.workOrderNumbers?.length || c.workOrderIds?.length || 1;
        });
        return count;
    }, [scrapChallans]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Scrap &amp; Return Challans
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Return customer process waste and manufacturing scrap under Job-Work Delivery Challans.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="h-10 px-4 gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Create Scrap Challan
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchScrapChallans();
                            toast.success("Scrap challans refreshed");
                        }}
                        disabled={loadingChallans}
                        className="h-10 px-3 gap-1.5 border-slate-200 text-slate-700 bg-white shadow-sm cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingChallans ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-slate-200/90 shadow-sm bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total Scrap Challans
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold font-mono text-slate-900">{scrapChallans.length}</div>
                        <span className="text-[11px] text-slate-400 mt-1 block">Challans Generated</span>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/90 shadow-sm bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total Scrap Returned
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold font-mono text-amber-700">
                            {totalScrapWeight.toLocaleString()} Kgs
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1 block">Returned to Principals</span>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/90 shadow-sm bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Clients Covered
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold font-mono text-slate-900">{uniqueCustomersCount}</div>
                        <span className="text-[11px] text-slate-400 mt-1 block">Parent Companies</span>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/90 shadow-sm bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Inbound Challans Covered
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold font-mono text-slate-900">
                            {scrapChallans.reduce((sum, c) => sum + (c.inboundChallanNumbers?.length || c.inboundChallanIds?.length || 1), 0)}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1 block">Active Inbound Entries</span>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-900">
                                Scrap Delivery Challans
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                {scrapChallans.length} scrap return challans recorded
                            </CardDescription>
                        </div>

                        {/* Filter Toolbar */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <Input
                                    placeholder="Search Challan #, Inbound #..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-9 text-xs bg-white border-slate-200"
                                />
                            </div>

                            <div className="w-48">
                                <SearchableSelect
                                    options={customerFilterOptions}
                                    value={selectedCustomer}
                                    onChange={setSelectedCustomer}
                                    placeholder="All Customers"
                                    searchPlaceholder="Search customer..."
                                    className="h-9 text-xs bg-white"
                                />
                            </div>

                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="h-9 text-xs w-32 bg-white border-slate-200">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">All Status</SelectItem>
                                    <SelectItem value="ISSUED" className="text-xs">Issued</SelectItem>
                                    <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
                                    <SelectItem value="ACKNOWLEDGED" className="text-xs">Acknowledged</SelectItem>
                                    <SelectItem value="CANCELLED" className="text-xs">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            {(search || selectedCustomer !== "ALL" || selectedStatus !== "ALL") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCustomer("ALL");
                                        setSelectedStatus("ALL");
                                    }}
                                    className="h-9 px-2 text-xs text-slate-500 hover:text-slate-900 gap-1"
                                >
                                    <FilterX className="w-3.5 h-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                        <TableRow>
                            <TableHead className="text-xs font-semibold text-slate-700">Challan No &amp; Date</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700">Customer</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700">Inbound Challans</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 text-right">Scrap Returned</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700">Vehicle / Transporter</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loadingChallans ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-2" />
                                    Loading scrap challans...
                                </TableCell>
                            </TableRow>
                        ) : scrapChallans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-14 text-center text-slate-500 text-xs">
                                    <Trash2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="font-semibold text-slate-800">No scrap return challans found.</p>
                                    <p className="text-slate-400 mt-1">
                                        Click <strong>&quot;Create Scrap Challan&quot;</strong> to return scrap against un-depleted Inbound Challans.
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            scrapChallans.map((challan) => {
                                const customer = challan.customerId;
                                const inboundNos = challan.inboundChallanNumbers || challan.workOrderNumbers || [];

                                return (
                                    <TableRow key={challan._id} className="hover:bg-slate-50/60">
                                        <TableCell className="py-3">
                                            <div className="font-mono font-bold text-xs text-slate-900">
                                                {challan.challanNumber}
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                {challan.challanDate ? new Date(challan.challanDate).toLocaleDateString("en-GB") : "—"}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="font-medium text-xs text-slate-900">
                                                {customer?.name || "Customer"}
                                            </div>
                                            {customer?.code && (
                                                <div className="text-[10px] font-mono text-slate-400">
                                                    {customer.code}
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                                {inboundNos.length > 0 ? (
                                                    inboundNos.map((inNo, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className="font-mono text-[10px] bg-slate-50 text-slate-700 border-slate-200"
                                                        >
                                                            {inNo}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-amber-900">
                                            {(challan.totalScrapQuantity || 0).toLocaleString()} Kgs
                                        </TableCell>

                                        <TableCell className="py-3 text-xs text-slate-600">
                                            <div className="font-mono font-medium text-slate-800">
                                                {challan.vehicleNumber || "—"}
                                            </div>
                                            {challan.transporter && (
                                                <div className="text-[10px] text-slate-400">
                                                    {challan.transporter}
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <Badge
                                                className={
                                                    challan.status === "ISSUED"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : challan.status === "ACKNOWLEDGED"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : challan.status === "CANCELLED"
                                                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                                                : "bg-amber-50 text-amber-700 border-amber-300"
                                                }
                                            >
                                                {challan.status}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setPreviewChallanId(challan._id)}
                                                className="h-8 text-xs px-2.5 gap-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 cursor-pointer"
                                            >
                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                                Consumption Sheet
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Create Dialog */}
            <CreateScrapChallanDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                customers={customers}
                onSuccess={(newChallan) => {
                    fetchScrapChallans();
                    if (newChallan?._id) {
                        setPreviewChallanId(newChallan._id);
                    }
                }}
            />

            {/* Consumption Sheet Dialog */}
            {previewChallanId && (
                <ScrapConsumptionSheetDialog
                    open={Boolean(previewChallanId)}
                    onOpenChange={(val) => !val && setPreviewChallanId(null)}
                    challanId={previewChallanId}
                />
            )}
        </div>
    );
}
