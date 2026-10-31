"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CreateBomDialog } from "@/components/bom/create-bom-dialog";
import { EditBomDialog } from "@/components/bom/edit-bom-dialog";

import {
    Layers,
    Plus,
    Search,
    FilterX,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    CheckCircle2,
    Archive,
    Trash2,
    Pencil,
    Eye,
    Cable,
} from "lucide-react";

export default function BomManagementPage() {
    const [boms, setBoms] = useState([]);
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
    });
    const [search, setSearch] = useState("");
    const [productFilter, setProductFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(true);

    // Dialog & slide-over states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedBom, setSelectedBom] = useState(null);
    const [bomMode, setBomMode] = useState("view");

    const fetchDropdownData = useCallback(async () => {
        try {
            const prodRes = await apiClient("/products?limit=100");
            if (prodRes?.data) {
                setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.items || []);
            }
        } catch (err) {
            console.error("Failed to load products for filter", err);
        }
    }, []);

    const fetchBoms = useCallback(
        async (page = pagination.page) => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                params.append("page", page.toString());
                params.append("limit", pagination.limit.toString());

                if (productFilter !== "ALL") {
                    params.append("productId", productFilter);
                }
                if (statusFilter !== "ALL") {
                    params.append("status", statusFilter);
                }

                const res = await apiClient(`/boms?${params.toString()}`);
                if (res.data) {
                    const items = Array.isArray(res.data) ? res.data : res.data.items || [];
                    setBoms(items);
                    const meta = res.meta || res.data;
                    setPagination((prev) => ({
                        ...prev,
                        page: meta.page || page,
                        total: meta.total ?? items.length,
                        totalPages: meta.totalPages || 1,
                    }));
                }
            } catch (err) {
                toast.error("Failed to load BOM list", {
                    description: err.message,
                });
            } finally {
                setIsLoading(false);
            }
        },
        [pagination.limit, pagination.page, productFilter, statusFilter],
    );

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    useEffect(() => {
        fetchBoms(1);
    }, [fetchBoms]);

    const handleRowClick = (bom, mode = "view") => {
        setSelectedBom(bom);
        setBomMode(mode);
        setEditOpen(true);
    };

    const handleActivateBom = async (bomId, e) => {
        e?.stopPropagation();
        try {
            await apiClient(`/boms/${bomId}/activate`, { method: "POST" });
            toast.success("BOM Activated Successfully", {
                description: "BOM is now active and locked for factory work orders.",
            });
            fetchBoms(pagination.page);
        } catch (err) {
            toast.error("Failed to activate BOM", { description: err.message });
        }
    };

    const handleArchiveBom = async (bomId, e) => {
        e?.stopPropagation();
        try {
            await apiClient(`/boms/${bomId}/archive`, { method: "POST" });
            toast.success("BOM Archived", {
                description: "BOM version archived from production.",
            });
            fetchBoms(pagination.page);
        } catch (err) {
            toast.error("Failed to archive BOM", { description: err.message });
        }
    };

    const handleDeleteBom = async (bomId, e) => {
        e?.stopPropagation();
        if (!confirm("Are you sure you want to delete this draft BOM?")) return;
        try {
            await apiClient(`/boms/${bomId}`, { method: "DELETE" });
            toast.success("BOM Deleted");
            fetchBoms(pagination.page);
        } catch (err) {
            toast.error("Failed to delete BOM", { description: err.message });
        }
    };

    const filteredBoms = boms.filter((b) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            b.bomNumber?.toLowerCase().includes(q) ||
            b.productId?.name?.toLowerCase().includes(q) ||
            b.productId?.code?.toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "ACTIVE":
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active Approved</Badge>;
            case "DRAFT":
                return (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        Draft (In Review)
                    </Badge>
                );
            case "ARCHIVED":
                return (
                    <Badge variant="secondary" className="text-slate-500 bg-slate-100">
                        Archived
                    </Badge>
                );
            case "SUPERSEDED":
                return (
                    <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
                        Superseded
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Title & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bill of Materials (BOM)</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage cable manufacturing recipes, consumption norms, and approved engineering standards.
                    </p>
                </div>

                <Button
                    onClick={() => setCreateOpen(true)}
                    className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-xs gap-2 cursor-pointer self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    Create BOM
                </Button>
            </div>

            {/* Main Table Card */}
            <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-900">Manufacturing Recipes</CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                {pagination.total} BOM formulas engineered
                            </CardDescription>
                        </div>

                        {/* Filter Toolbar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    placeholder="Search BOM or product..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-9 text-sm bg-white border-slate-200"
                                />
                            </div>

                            <Select value={productFilter} onValueChange={setProductFilter}>
                                <SelectTrigger className="h-9 text-sm w-44 bg-white border-slate-200">
                                    <SelectValue placeholder="All Products" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectItem value="ALL" className="text-sm">
                                        All Products
                                    </SelectItem>
                                    {products.map((p) => (
                                        <SelectItem key={p._id} value={p._id} className="text-sm">
                                            {p.code} - {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 text-sm w-36 bg-white border-slate-200">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-sm">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="ACTIVE" className="text-sm">
                                        Active Approved
                                    </SelectItem>
                                    <SelectItem value="DRAFT" className="text-sm">
                                        Draft
                                    </SelectItem>
                                    <SelectItem value="ARCHIVED" className="text-sm">
                                        Archived
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {(search || productFilter !== "ALL" || statusFilter !== "ALL") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearch("");
                                        setProductFilter("ALL");
                                        setStatusFilter("ALL");
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
                                onClick={() => fetchBoms(pagination.page)}
                                disabled={isLoading}
                                className="h-9 px-3 text-sm border-slate-200 cursor-pointer"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
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
                                        BOM Number
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Target Cable Product
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Category
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Version</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Standard Batch
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="w-16 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-44 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                                <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
                                                <span className="text-sm font-medium">Loading Bills of Materials...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBoms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-44 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                <Layers className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                                                <p className="text-sm font-medium text-slate-600">No Bills of Materials found</p>
                                                <p className="text-xs text-slate-400 max-w-sm">
                                                    {search || productFilter !== "ALL" || statusFilter !== "ALL"
                                                        ? "No BOM matches the selected search filters. Try resetting the filters."
                                                        : 'Click "Create BOM" to define standard material consumption recipes.'}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBoms.map((bom) => (
                                        <TableRow
                                            key={bom._id}
                                            onClick={() => handleRowClick(bom, "view")}
                                            className="hover:bg-slate-50/80 cursor-pointer transition-colors border-b border-slate-100"
                                        >
                                            <TableCell className="font-mono text-xs font-bold text-slate-900 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="hover:text-slate-900">{bom.bomNumber}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3.5">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {bom.productId?.name || "Unknown Product"}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">{bom.productId?.code}</div>
                                            </TableCell>

                                            <TableCell className="py-3.5">
                                                <Badge variant="outline" className="bg-slate-50 font-normal text-xs text-slate-700">
                                                    {bom.productId?.cableCategory || "POWER_CABLE"}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="py-3.5 font-semibold text-slate-800 text-sm">
                                                v{bom.versionNumber}.0
                                            </TableCell>

                                            <TableCell className="py-3.5 font-medium text-slate-700 text-sm">
                                                {bom.batchSize} {bom.outputUnit}
                                            </TableCell>

                                            <TableCell className="py-3.5">{getStatusBadge(bom.status)}</TableCell>

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
                                                            onClick={() => handleRowClick(bom, "view")}
                                                            className="cursor-pointer gap-2"
                                                        >
                                                            <Eye className="w-4 h-4 text-slate-500" />
                                                            View Recipe Details
                                                        </DropdownMenuItem>

                                                        {bom.status === "DRAFT" && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleRowClick(bom, "edit")}
                                                                className="cursor-pointer gap-2 text-slate-900"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                                Edit Recipe
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuSeparator />

                                                        {bom.status === "DRAFT" && (
                                                            <DropdownMenuItem
                                                                onClick={(e) => handleActivateBom(bom._id, e)}
                                                                className="cursor-pointer gap-2 text-emerald-600"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Activate BOM
                                                            </DropdownMenuItem>
                                                        )}

                                                        {bom.status === "ACTIVE" && (
                                                            <DropdownMenuItem
                                                                onClick={(e) => handleArchiveBom(bom._id, e)}
                                                                className="cursor-pointer gap-2 text-amber-600"
                                                            >
                                                                <Archive className="w-4 h-4" />
                                                                Archive Version
                                                            </DropdownMenuItem>
                                                        )}

                                                        {bom.status === "DRAFT" && (
                                                            <DropdownMenuItem
                                                                onClick={(e) => handleDeleteBom(bom._id, e)}
                                                                className="cursor-pointer gap-2 text-rose-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete Draft
                                                            </DropdownMenuItem>
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

                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                        <p className="text-xs text-slate-500">
                            Showing{" "}
                            <span className="font-semibold text-slate-800">
                                {filteredBoms.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-slate-800">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{" "}
                            of <span className="font-semibold text-slate-800">{pagination.total}</span> BOM recipes
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchBoms(pagination.page - 1)}
                                disabled={pagination.page <= 1 || isLoading}
                                className="h-8 px-2.5 text-xs border-slate-200 cursor-pointer"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                Previous
                            </Button>
                            <span className="text-xs font-medium text-slate-600 px-2">
                                Page {pagination.page} of {pagination.totalPages || 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchBoms(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="h-8 px-2.5 text-xs border-slate-200 cursor-pointer"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create BOM Slide-over */}
            <CreateBomDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => fetchBoms(1)} />

            {/* View / Edit BOM Slide-over */}
            <EditBomDialog
                bom={selectedBom}
                open={editOpen}
                onOpenChange={setEditOpen}
                initialMode={bomMode}
                onSuccess={() => fetchBoms(pagination.page)}
            />
        </div>
    );
}
