"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    Truck,
    Plus,
    Search,
    FilterX,
    MoreHorizontal,
    CheckCircle2,
    XCircle,
    Eye,
    RefreshCw,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Pencil,
    UploadCloud,
} from "lucide-react";
import { CreateInboundChallanDialog } from "@/components/inbound/create-challan-dialog";
import { EditInboundChallanDialog } from "@/components/inbound/edit-challan-dialog";
import { DataImportModal } from "@/components/shared/data-import-modal";

export default function InboundChallansPage() {
    const { user } = useAuth();
    const [challans, setChallans] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [activeChallanId, setActiveChallanId] = useState(null);
    const [dialogMode, setDialogMode] = useState("view");

    const fetchDropdownData = useCallback(async () => {
        try {
            const [custRes, whRes, matRes] = await Promise.all([
                api.get("/customers?limit=100"),
                api.get("/warehouses?limit=100"),
                api.get("/materials?limit=100"),
            ]);
            const custList = Array.isArray(custRes?.data) ? custRes.data : custRes?.data?.items || [];
            const whList = Array.isArray(whRes?.data) ? whRes.data : whRes?.data?.items || [];
            const matList = Array.isArray(matRes?.data) ? matRes.data : matRes?.data?.items || [];

            setCustomers(custList);
            setWarehouses(whList);
            setMaterials(matList);
        } catch (err) {
            console.error("Failed to load master metadata for inbound challans", err);
        }
    }, []);

    const fetchChallans = useCallback(
        async (targetPage = page) => {
            setLoading(true);
            try {
                const queryParams = new URLSearchParams({
                    page: targetPage.toString(),
                    limit: "10",
                });
                if (selectedCustomer && selectedCustomer !== "ALL") {
                    queryParams.append("customerId", selectedCustomer);
                }
                if (selectedStatus && selectedStatus !== "ALL") {
                    queryParams.append("status", selectedStatus);
                }
                if (search.trim()) {
                    queryParams.append("search", search.trim());
                }

                const res = await api.get(`/inbound-challans?${queryParams.toString()}`);
                if (res?.data) {
                    const items = Array.isArray(res.data) ? res.data : res.data.items || [];
                    const total = res.meta?.total !== undefined ? res.meta.total : res.data.total || items.length;
                    const totalPages = res.meta?.totalPages !== undefined ? res.meta.totalPages : res.data.totalPages || 1;
                    setChallans(items);
                    setTotalPages(totalPages);
                    setTotalCount(total);
                }
            } catch (err) {
                toast.error(err.message || "Failed to fetch inbound delivery challans");
            } finally {
                setLoading(false);
            }
        },
        [page, selectedCustomer, selectedStatus, search],
    );

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    useEffect(() => {
        fetchChallans();
    }, [fetchChallans]);

    const handleRowClick = (challan, mode = "view") => {
        setActiveChallanId(challan._id);
        setDialogMode(mode);
        setEditOpen(true);
    };

    const handlePostChallan = async (challanId) => {
        if (!confirm("Post this challan? This will generate unique Material Lots and increase warehouse stock.")) return;
        try {
            const res = await api.post(`/inbound-challans/${challanId}/post`, {});
            if (res?.success) {
                toast.success("Challan posted! Material lots created and stock balances updated.");
                fetchChallans();
            }
        } catch (err) {
            toast.error(err.message || "Failed to post challan to inventory");
        }
    };

    const handleCancelChallan = async (challanId) => {
        if (!confirm("Are you sure you want to cancel this draft delivery challan?")) return;
        try {
            const res = await api.post(`/inbound-challans/${challanId}/cancel`, {});
            if (res?.success) {
                toast.success("Inbound challan cancelled");
                fetchChallans();
            }
        } catch (err) {
            toast.error(err.message || "Failed to cancel challan");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "POSTED":
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Posted</Badge>;
            case "DRAFT":
                return (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        Draft
                    </Badge>
                );
            case "CANCELLED":
                return (
                    <Badge variant="secondary" className="text-rose-700 bg-rose-50 border-rose-200">
                        Cancelled
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const hasActiveFilters = search || selectedCustomer !== "ALL" || selectedStatus !== "ALL";

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inbound Delivery Challans</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Receive and verify incoming customer-supplied raw materials for cable manufacturing.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setImportOpen(true)}
                        className="h-10 px-3.5 border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm gap-2 cursor-pointer shadow-xs"
                    >
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        Import Paper Challans
                    </Button>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Receive Inbound Material
                    </Button>
                </div>
            </div>

            {/* Main Unified Table Card */}
            <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="p-4 border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-600" />
                                Delivery Receipts
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                {totalCount} delivery challans registered
                            </CardDescription>
                        </div>

                        {/* Filter Toolbar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    placeholder="Search Challan or DC #..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9 text-sm bg-white border-slate-200"
                                />
                            </div>

                            <Select
                                value={selectedCustomer}
                                onValueChange={(val) => {
                                    setSelectedCustomer(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9 text-sm w-44 bg-white border-slate-200">
                                    <SelectValue placeholder="All Customers" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectItem value="ALL" className="text-sm">
                                        All Customers
                                    </SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c._id} value={c._id} className="text-sm">
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedStatus}
                                onValueChange={(val) => {
                                    setSelectedStatus(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9 text-sm w-36 bg-white border-slate-200">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-sm">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="POSTED" className="text-sm">
                                        Posted (In Stock)
                                    </SelectItem>
                                    <SelectItem value="DRAFT" className="text-sm">
                                        Draft
                                    </SelectItem>
                                    <SelectItem value="CANCELLED" className="text-sm">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCustomer("ALL");
                                        setSelectedStatus("ALL");
                                        setPage(1);
                                    }}
                                    className="h-9 px-3 text-sm text-slate-500 hover:text-slate-900 cursor-pointer"
                                >
                                    <FilterX className="w-4 h-4 mr-1.5" />
                                    Reset
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchChallans}
                                disabled={loading}
                                className="h-9 px-3 text-sm border-slate-200 cursor-pointer"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-44 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Internal Challan
                                    </TableHead>
                                    <TableHead className="w-36 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Customer DC
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Customer / Consignor
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Warehouse
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Date & Vehicle
                                    </TableHead>
                                    <TableHead className="w-28 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Status
                                    </TableHead>
                                    <TableHead className="w-16 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-44 text-center text-slate-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                                <span className="text-sm font-medium">Loading delivery challans...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : challans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-44 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Truck className="w-5 h-5" />
                                                </div>
                                                <p className="font-semibold text-slate-800 text-sm">No delivery challans found</p>
                                                <p className="text-xs text-slate-500 text-center">
                                                    {hasActiveFilters
                                                        ? "No challans match your search filters. Try clearing filters."
                                                        : "Receive incoming raw materials to start recording stock lots."}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    challans.map((challan) => (
                                        <TableRow
                                            key={challan._id}
                                            onClick={() => handleRowClick(challan, "view")}
                                            className="hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-100"
                                        >
                                            <TableCell className="py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div>
                                                        <span className="font-bold text-slate-900 text-sm hover:text-blue-600">
                                                            {challan.challanNumber}
                                                        </span>
                                                        <p className="text-xs text-slate-400">
                                                            {challan.ownerType === "CUSTOMER" ? "Customer Supplied" : "Factory In-House"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3.5 font-semibold text-slate-800 text-sm font-mono">
                                                {challan.customerChallanNumber}
                                            </TableCell>

                                            <TableCell className="py-3.5">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {challan.customerId?.name || "In-House"}
                                                </div>
                                                {challan.customerId?.code && (
                                                    <div className="text-xs text-slate-400 font-mono">{challan.customerId.code}</div>
                                                )}
                                            </TableCell>

                                            <TableCell className="py-3.5 font-medium text-slate-700 text-sm">
                                                {challan.warehouseId?.name || "Main Warehouse"}
                                            </TableCell>

                                            <TableCell className="py-3.5">
                                                <div className="text-sm text-slate-800 font-medium">
                                                    {challan.customerChallanDate
                                                        ? new Date(challan.customerChallanDate).toLocaleDateString()
                                                        : "N/A"}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    {challan.vehicleNumber || "No vehicle"}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3.5">{getStatusBadge(challan.status)}</TableCell>

                                            <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={(props) => (
                                                            <Button
                                                                {...props}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    />
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                            Actions
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => handleRowClick(challan, "view")}
                                                            className="cursor-pointer gap-2"
                                                        >
                                                            <Eye className="w-4 h-4 text-slate-500" />
                                                            View Lines & Lots
                                                        </DropdownMenuItem>

                                                        {challan.status === "DRAFT" && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleRowClick(challan, "edit")}
                                                                className="cursor-pointer gap-2 text-slate-900"
                                                            >
                                                                <Pencil className="w-4 h-4 text-slate-500" />
                                                                Edit Challan
                                                            </DropdownMenuItem>
                                                        )}

                                                        {challan.status === "DRAFT" && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handlePostChallan(challan._id)}
                                                                    className="cursor-pointer gap-2 text-emerald-600 font-medium"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                    Post & Generate Lots
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleCancelChallan(challan._id)}
                                                                    className="cursor-pointer gap-2 text-rose-600"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    Cancel Challan
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                        <div>
                            Showing <span className="font-semibold text-slate-700">{challans.length}</span> of{" "}
                            <span className="font-semibold text-slate-700">{totalCount}</span> Challans
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-8 text-xs border-slate-200 cursor-pointer"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                Previous
                            </Button>
                            <span className="px-2 text-slate-700 font-medium">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="h-8 text-xs border-slate-200 cursor-pointer"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Slide-over Create Challan Drawer */}
            <CreateInboundChallanDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                customers={customers}
                warehouses={warehouses}
                materials={materials}
                onSuccess={() => {
                    setPage(1);
                    fetchChallans(1);
                }}
            />

            {/* Slide-over View & Edit Challan Drawer */}
            <EditInboundChallanDialog
                challanId={activeChallanId}
                open={editOpen}
                onOpenChange={setEditOpen}
                initialMode={dialogMode}
                customers={customers}
                warehouses={warehouses}
                materials={materials}
                onSuccess={fetchChallans}
            />

            {/* Bulk Data Import Modal */}
            <DataImportModal
                open={importOpen}
                onOpenChange={setImportOpen}
                initialTemplateKey="INBOUND_CHALLANS"
                onSuccess={() => {
                    setPage(1);
                    fetchChallans(1);
                }}
            />
        </div>
    );
}
