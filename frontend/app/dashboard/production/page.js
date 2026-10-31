"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    Cpu,
    Plus,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    Play,
    RotateCcw,
    ArrowRightLeft,
    ShieldCheck,
    RefreshCw,
    Layers,
    Sparkles,
    Cog,
    Workflow,
    XCircle,
    AlertTriangle,
    ArrowRight,
    ClipboardCheck,
    Package,
} from "lucide-react";
import { CreateProductionOrderDialog } from "@/components/production/create-production-order-dialog";
import { CreateBatchDialog } from "@/components/production/create-batch-dialog";
import { CreateMaterialIssueDialog } from "@/components/production/create-material-issue-dialog";
import { RecordOutputDialog } from "@/components/production/record-output-dialog";
import { BatchTestDialog } from "@/components/production/batch-test-dialog";
import { NextMachineDialog } from "@/components/production/next-machine-dialog";

export default function ProductionOrdersPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'batches'

    // Production Orders state
    const [productionOrders, setProductionOrders] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [stages, setStages] = useState([]);
    const [machines, setMachines] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [operators, setOperators] = useState([]);
    const [drums, setDrums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Machine Batches state
    const [batches, setBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [batchSearch, setBatchSearch] = useState("");
    const [batchStatusFilter, setBatchStatusFilter] = useState("ALL");
    const [batchTestStatusFilter, setBatchTestStatusFilter] = useState("ALL");
    const [batchesPage, setBatchesPage] = useState(1);
    const [batchesTotalPages, setBatchesTotalPages] = useState(1);
    const [batchesTotal, setBatchesTotal] = useState(0);

    // Dialog states
    const [createOrderOpen, setCreateOrderOpen] = useState(false);
    const [createBatchOpen, setCreateBatchOpen] = useState(false);
    const [createIssueOpen, setCreateIssueOpen] = useState(false);
    const [recordOutputOpen, setRecordOutputOpen] = useState(false);
    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [nextMachineDialogOpen, setNextMachineDialogOpen] = useState(false);

    const [activeOrderId, setActiveOrderId] = useState(null);
    const [activeBatchId, setActiveBatchId] = useState(null);
    const [selectedBatchForTest, setSelectedBatchForTest] = useState(null);
    const [nextStageInfo, setNextStageInfo] = useState(null);
    const [selectedBatchForNext, setSelectedBatchForNext] = useState(null);

    const fetchDropdownData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                api.get("/work-orders?limit=100"),
                api.get("/process-stages?limit=50"),
                api.get("/machines?limit=50"),
                api.get("/warehouses?limit=50"),
                api.get("/materials?limit=100"),
                api.get("/admins?limit=50"),
                api.get("/drums?limit=50"),
            ]);

            const [woRes, stgRes, mchRes, whRes, matRes, usrRes, drmRes] = results;

            if (woRes.status === "fulfilled" && woRes.value?.data) {
                setWorkOrders(
                    woRes.value.data.workOrders || woRes.value.data.items || (Array.isArray(woRes.value.data) ? woRes.value.data : []),
                );
            }
            if (stgRes.status === "fulfilled" && stgRes.value?.data) {
                setStages(Array.isArray(stgRes.value.data) ? stgRes.value.data : stgRes.value.data.items || []);
            }
            if (mchRes.status === "fulfilled" && mchRes.value?.data) {
                setMachines(Array.isArray(mchRes.value.data) ? mchRes.value.data : mchRes.value.data.items || []);
            }
            if (whRes.status === "fulfilled" && whRes.value?.data) {
                setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : whRes.value.data.items || []);
            }
            if (matRes.status === "fulfilled" && matRes.value?.data) {
                setMaterials(Array.isArray(matRes.value.data) ? matRes.value.data : matRes.value.data.items || []);
            }
            if (usrRes.status === "fulfilled" && usrRes.value?.data) {
                setOperators(Array.isArray(usrRes.value.data) ? usrRes.value.data : usrRes.value.data.items || []);
            }
            if (drmRes.status === "fulfilled" && drmRes.value?.data) {
                setDrums(Array.isArray(drmRes.value.data) ? drmRes.value.data : drmRes.value.data.items || []);
            }
        } catch (err) {
            console.error("Failed to load shopfloor metadata", err);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: "10",
            });
            if (selectedStatus && selectedStatus !== "ALL") {
                queryParams.append("status", selectedStatus);
            }
            if (search.trim()) {
                queryParams.append("search", search.trim());
            }

            const res = await api.get(`/production-orders?${queryParams.toString()}`);
            if (res?.data) {
                setProductionOrders(res.data.productionOrders || res.data.items || []);
                const pagination = res.data.pagination || {};
                setTotalPages(pagination.totalPages || res.data.totalPages || 1);
                setTotalCount(pagination.total || res.data.total || 0);
            }
        } catch (err) {
            toast.error(err.message || "Failed to fetch production orders");
        } finally {
            setLoading(false);
        }
    }, [page, selectedStatus, search]);

    const fetchBatches = useCallback(async () => {
        setBatchesLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: batchesPage.toString(),
                limit: "15",
            });
            if (batchStatusFilter && batchStatusFilter !== "ALL") {
                queryParams.append("status", batchStatusFilter);
            }
            if (batchTestStatusFilter && batchTestStatusFilter !== "ALL") {
                queryParams.append("testStatus", batchTestStatusFilter);
            }

            const res = await api.get(`/production-batches?${queryParams.toString()}`);
            if (res?.data) {
                const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
                setBatches(items);
                setBatchesTotal(res.data.total || items.length);
                setBatchesTotalPages(res.data.totalPages || 1);
            }
        } catch (err) {
            console.error("Failed to load batches", err);
        } finally {
            setBatchesLoading(false);
        }
    }, [batchesPage, batchStatusFilter, batchTestStatusFilter]);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    const handleCreateOrder = async (workOrderId, payload) => {
        const res = await api.post(`/work-orders/${workOrderId}/production-orders`, payload);
        if (res?.success || res?.data) {
            toast.success("Production order released to shopfloor");
            fetchOrders();
            fetchBatches();
        }
    };

    const handleStartOrder = async (orderId) => {
        try {
            const res = await api.post(`/production-orders/${orderId}/start`, {});
            if (res?.success || res?.data) {
                toast.success("Production order started");
                fetchOrders();
                fetchBatches();
            }
        } catch (err) {
            toast.error(err.message || "Failed to start production order");
        }
    };

    const handleCompleteOrder = async (orderId) => {
        if (!confirm("Mark this production run as completed?")) return;
        try {
            const res = await api.post(`/production-orders/${orderId}/complete`, {});
            if (res?.success || res?.data) {
                toast.success("Production order completed successfully");
                fetchOrders();
                fetchBatches();
            }
        } catch (err) {
            toast.error(err.message || "Failed to complete production order");
        }
    };

    const handleCreateBatch = async (orderId, payload) => {
        const res = await api.post(`/production-orders/${orderId}/batches`, payload);
        if (res?.success || res?.data) {
            toast.success("WIP process stage batch created on machine");
            fetchOrders();
            fetchBatches();
        }
    };

    const handleCreateMaterialIssue = async (orderId, payload) => {
        const res = await api.post(`/production-orders/${orderId}/material-issues`, payload);
        if (res?.success || res?.data) {
            toast.success("Raw materials issued to shopfloor WIP");
            fetchOrders();
        }
    };

    const handleRecordOutput = async (batchId, payload) => {
        const res = await api.post(`/production-batches/${batchId}/outputs`, payload);
        if (res?.success || res?.data) {
            toast.success("Quality inspected output logged to inventory");
            fetchOrders();
            fetchBatches();
        }
    };

    const handleOpenTestDialog = (batch) => {
        setSelectedBatchForTest(batch);
        setTestDialogOpen(true);
    };

    const handleMoveToNextMachine = (arg1, arg2) => {
        let batch = arg1;
        let stageInfo = arg2;

        // Defensively detect if arg1 is stageInfo (contains nextStageId or availableMachines)
        if (arg1 && (arg1.nextStageId || arg1.nextStageName || arg1.availableMachines)) {
            stageInfo = arg1;
            batch = arg2;
        }

        setSelectedBatchForNext(batch);
        setNextStageInfo(stageInfo);
        setNextMachineDialogOpen(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "IN_PROGRESS":
            case "IN_PROCESS":
                return <Badge className="bg-amber-50 text-amber-800 border-amber-200">In Progress (Floor)</Badge>;
            case "PLANNED":
                return (
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                        Planned
                    </Badge>
                );
            case "COMPLETED":
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
            case "CANCELLED":
                return (
                    <Badge variant="secondary" className="text-slate-500 bg-slate-100">
                        Cancelled
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTestStatusBadge = (testStatus) => {
        switch (testStatus) {
            case "TEST_PASSED":
            case "PASSED":
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Test Passed
                    </Badge>
                );
            case "TEST_FAILED":
            case "FAILED":
                return (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold gap-1 animate-pulse">
                        <XCircle className="w-3 h-3 text-rose-600" /> Test Failed (Rework)
                    </Badge>
                );
            case "NOT_TESTED":
            default:
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Pending Test
                    </Badge>
                );
        }
    };

    // Filter batches for client-side quick search
    const filteredBatches = batches.filter((b) => {
        if (!batchSearch.trim()) return true;
        const q = batchSearch.toLowerCase();
        const batchNum = (b.batchNumber || "").toLowerCase();
        const machineCode = (b.machineCode || b.machineId?.code || "").toLowerCase();
        const stageName = (b.processStageId?.name || "").toLowerCase();
        const poNum = (b.productionOrderId?.productionOrderNumber || "").toLowerCase();
        return batchNum.includes(q) || machineCode.includes(q) || stageName.includes(q) || poNum.includes(q);
    });

    return (
        <div className="space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Shopfloor WIP & Machine Batches</h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Manage stage-by-stage machine execution, free-hand quality tests, pass/fail routing, and finished cable output.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchOrders();
                            fetchBatches();
                        }}
                        className="h-10 text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading || batchesLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setCreateOrderOpen(true)}
                        className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Launch Production Order
                    </Button>
                </div>
            </div>

            {/* Tabs Switcher */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === "orders"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                    <Cpu className="w-4 h-4" />
                    Production Orders ({totalCount})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("batches")}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === "batches"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                    <Workflow className="w-4 h-4" />
                    Machine Batches & Live QA Tests
                    {batches.filter((b) => b.status === "IN_PROCESS" || b.testStatus === "NOT_TESTED").length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-white/30 text-white">
                            {batches.filter((b) => b.status === "IN_PROCESS" || b.testStatus === "NOT_TESTED").length} Active
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: PRODUCTION ORDERS */}
            {activeTab === "orders" && (
                <div className="space-y-4">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search Production Order #..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 text-sm bg-slate-50/50"
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
                                <SelectTrigger className="w-full sm:w-44 h-10 text-sm">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="PLANNED">Planned</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <Table>
                            <TableHeader className="bg-slate-50/75">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs text-slate-600">Production Order</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Work Order & Client</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Planned Length</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Actual Produced</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Schedule</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                                    <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                                                <span>Loading shopfloor orders...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : productionOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <Cpu className="w-7 h-7 text-slate-400" />
                                                <p className="font-medium text-slate-700">No active production runs</p>
                                                <p className="text-xs text-slate-400">
                                                    Release a confirmed work order to shopfloor production.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    productionOrders.map((po) => (
                                        <TableRow key={po._id} className="hover:bg-slate-50/60 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <div>
                                                        <span className="font-bold text-slate-900 text-sm">{po.productionOrderNumber}</span>
                                                        <p className="text-xs text-slate-400">{po.remarks || "Standard Run"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {po.workOrderId?.workOrderNumber || "Direct Order"}
                                                </div>
                                                <div className="text-xs text-slate-500">{po.customerId?.name || "Customer"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {po.plannedLengthMeters?.toLocaleString()} m
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-emerald-700 text-sm">
                                                    {po.actualProducedLengthMeters || 0} m
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {po.plannedLengthMeters
                                                        ? `${Math.round(((po.actualProducedLengthMeters || 0) / po.plannedLengthMeters) * 100)}% complete`
                                                        : ""}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-800">
                                                    {po.startDate ? new Date(po.startDate).toLocaleDateString() : "Immediate"}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    Target:{" "}
                                                    {po.targetCompletionDate
                                                        ? new Date(po.targetCompletionDate).toLocaleDateString()
                                                        : "N/A"}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(po.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            router.push(
                                                                `/dashboard/packing?workOrderId=${po.workOrderId?._id || po.workOrderId}&poId=${po._id}`,
                                                            )
                                                        }
                                                        className="h-8 text-xs font-semibold px-2.5 gap-1.5 text-orange-700 bg-orange-50/70 hover:bg-orange-100 border-orange-200 cursor-pointer shadow-xs"
                                                    >
                                                        <Package className="w-3.5 h-3.5 text-orange-600" />
                                                        Pack into Drums
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            render={(props) => (
                                                                <button
                                                                    {...props}
                                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        />
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/dashboard/packing?workOrderId=${po.workOrderId?._id || po.workOrderId}&poId=${po._id}`,
                                                                    )
                                                                }
                                                                className="cursor-pointer gap-2 text-orange-700 font-semibold"
                                                            >
                                                                <Package className="w-4 h-4 text-orange-600" /> Pack into Drums (Packaging)
                                                            </DropdownMenuItem>

                                                            {po.status === "PLANNED" && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleStartOrder(po._id)}
                                                                    className="cursor-pointer gap-2 text-amber-600 font-medium"
                                                                >
                                                                    <Play className="w-4 h-4 fill-amber-600" /> Start Production
                                                                </DropdownMenuItem>
                                                            )}

                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setActiveOrderId(po._id);
                                                                    setCreateIssueOpen(true);
                                                                }}
                                                                className="cursor-pointer gap-2 text-emerald-700"
                                                            >
                                                                <ArrowRightLeft className="w-4 h-4" /> Issue Raw Materials (MIN)
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setActiveOrderId(po._id);
                                                                    setCreateBatchOpen(true);
                                                                }}
                                                                className="cursor-pointer gap-2 text-indigo-700"
                                                            >
                                                                <Layers className="w-4 h-4" /> Add Machine Batch
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setBatchSearch(po.productionOrderNumber || "");
                                                                    setActiveTab("batches");
                                                                }}
                                                                className="cursor-pointer gap-2 text-blue-700"
                                                            >
                                                                <Workflow className="w-4 h-4" /> View Machine Batches &amp; QA
                                                            </DropdownMenuItem>

                                                            {po.status === "IN_PROGRESS" && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleCompleteOrder(po._id)}
                                                                    className="cursor-pointer gap-2 text-emerald-600 font-medium"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" /> Complete Production
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Bar */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-500">
                            <div>
                                Showing <span className="font-semibold text-slate-700">{productionOrders.length}</span> of{" "}
                                <span className="font-semibold text-slate-700">{totalCount}</span> Orders
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="h-8 text-xs"
                                >
                                    Previous
                                </Button>
                                <span className="px-2 text-slate-600 font-medium">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="h-8 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MACHINE BATCHES & LIVE QUALITY TESTING */}
            {activeTab === "batches" && (
                <div className="space-y-4">
                    {/* Shopfloor QA Workflow Banner */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200 text-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">Shopfloor Pass/Fail Machine Testing Workflow</h4>
                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                    Run custom QA tests on any machine batch. Clicking <strong>Pass Test</strong> saves inspection readings,
                                    completes the batch, and advances to the <strong>Next Machine</strong>. Clicking{" "}
                                    <strong>Fail Test</strong> keeps work on the <strong>SAME machine</strong> for rework.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (productionOrders.length > 0) {
                                        setActiveOrderId(productionOrders[0]._id);
                                        setCreateBatchOpen(true);
                                    } else {
                                        toast.error("No production orders found to start a batch");
                                    }
                                }}
                                className="h-9 text-xs border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 font-medium"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Start New Machine Batch
                            </Button>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search Batch #, Machine, Stage, PO..."
                                value={batchSearch}
                                onChange={(e) => setBatchSearch(e.target.value)}
                                className="pl-9 h-10 text-sm bg-slate-50/50"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            <Select
                                value={batchStatusFilter}
                                onValueChange={(val) => {
                                    setBatchStatusFilter(val);
                                    setBatchesPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-40 h-10 text-sm">
                                    <SelectValue placeholder="Batch Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Batch Status</SelectItem>
                                    <SelectItem value="IN_PROCESS">In Process (Running)</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={batchTestStatusFilter}
                                onValueChange={(val) => {
                                    setBatchTestStatusFilter(val);
                                    setBatchesPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-44 h-10 text-sm">
                                    <SelectValue placeholder="QA Test Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Test Statuses</SelectItem>
                                    <SelectItem value="NOT_TESTED">Pending QA Test</SelectItem>
                                    <SelectItem value="TEST_PASSED">Test Passed</SelectItem>
                                    <SelectItem value="TEST_FAILED">Test Failed (Rework)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Batches Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <Table>
                            <TableHeader className="bg-slate-50/75">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs text-slate-600">Batch & Rework #</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Process Stage</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Machine & Shift</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Production Order</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">Quantity (m)</TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-600">QA Inspection</TableHead>
                                    <TableHead className="text-right font-semibold text-xs text-slate-600">Action / Advance</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {batchesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                                <span>Loading machine line batches...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBatches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <Workflow className="w-7 h-7 text-slate-400" />
                                                <p className="font-medium text-slate-700">No machine batches found</p>
                                                <p className="text-xs text-slate-400">
                                                    Create a process batch under any Production Order to start floor operations.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBatches.map((b) => (
                                        <TableRow key={b._id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Batch & Rework */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-900 text-sm">{b.batchNumber}</span>
                                                        {b.reworkCount > 0 && (
                                                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px] px-1.5 py-0.2">
                                                                Rework #{b.reworkCount} (Same Machine)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {b.createdAt
                                                            ? new Date(b.createdAt).toLocaleTimeString([], {
                                                                  hour: "2-digit",
                                                                  minute: "2-digit",
                                                              })
                                                            : ""}
                                                        {b.remarks && ` • ${b.remarks}`}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Process Stage */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-[11px]">
                                                        {b.processStageId?.sequenceOrder || 1}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-900 text-sm">
                                                            {b.processStageId?.name || "Custom Stage"}
                                                        </span>
                                                        <p className="text-[11px] text-slate-400">
                                                            {b.processStageId?.category || "CABLE_MFG"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Machine & Shift */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Cog className="w-4 h-4 text-slate-500" />
                                                    <div>
                                                        <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {b.machineCode || b.machineId?.code || "N/A"}
                                                        </span>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {b.shift || "SHIFT_A"}
                                                            {b.operatorId?.firstName ? ` • Op: ${b.operatorId.firstName}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Production Order */}
                                            <TableCell>
                                                <div className="text-xs font-semibold text-slate-900">
                                                    {b.productionOrderId?.productionOrderNumber || "Direct Batch"}
                                                </div>
                                                <div className="text-[11px] text-slate-400">{getStatusBadge(b.status)}</div>
                                            </TableCell>

                                            {/* Quantity */}
                                            <TableCell>
                                                <div className="text-sm font-bold text-slate-900">
                                                    {b.completedQuantity
                                                        ? `${b.completedQuantity.toLocaleString()} m`
                                                        : `${b.plannedQuantity?.toLocaleString() || 0} m`}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Plan: {b.plannedQuantity?.toLocaleString()} m
                                                </div>
                                            </TableCell>

                                            {/* QA Inspection */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {getTestStatusBadge(b.testStatus)}
                                                    {b.testReportNumber && (
                                                        <div className="text-[10px] font-mono text-slate-500">
                                                            Rep: {b.testReportNumber}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Action / Next Machine */}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenTestDialog(b)}
                                                        className={`h-8 text-xs font-semibold gap-1.5 shadow-xs ${
                                                            b.testStatus === "TEST_PASSED"
                                                                ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                                                                : b.testStatus === "TEST_FAILED"
                                                                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                                                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                                                        }`}
                                                    >
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        {b.testStatus === "TEST_PASSED" ? "QA Passed / Next" : "Run QA Tests"}
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            render={(props) => (
                                                                <button
                                                                    {...props}
                                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        />
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuItem
                                                                onClick={() => handleOpenTestDialog(b)}
                                                                className="cursor-pointer gap-2 text-blue-700 font-medium"
                                                            >
                                                                <ClipboardCheck className="w-4 h-4" /> Machine Quality Tests
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setActiveBatchId(b._id);
                                                                    setRecordOutputOpen(true);
                                                                }}
                                                                className="cursor-pointer gap-2 text-emerald-700"
                                                            >
                                                                <Package className="w-4 h-4" /> Record Finished Output / Drum
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Batches Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-500">
                            <div>
                                Showing <span className="font-semibold text-slate-700">{filteredBatches.length}</span> of{" "}
                                <span className="font-semibold text-slate-700">{batchesTotal}</span> Batches
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={batchesPage <= 1}
                                    onClick={() => setBatchesPage((p) => Math.max(1, p - 1))}
                                    className="h-8 text-xs"
                                >
                                    Previous
                                </Button>
                                <span className="px-2 text-slate-600 font-medium">
                                    Page {batchesPage} of {batchesTotalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={batchesPage >= batchesTotalPages}
                                    onClick={() => setBatchesPage((p) => p + 1)}
                                    className="h-8 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <CreateProductionOrderDialog
                open={createOrderOpen}
                onOpenChange={setCreateOrderOpen}
                workOrders={workOrders}
                onSuccess={handleCreateOrder}
            />

            <CreateBatchDialog
                open={createBatchOpen}
                onOpenChange={setCreateBatchOpen}
                productionOrderId={activeOrderId}
                stages={stages}
                machines={machines}
                operators={operators}
                onSuccess={handleCreateBatch}
            />

            <CreateMaterialIssueDialog
                open={createIssueOpen}
                onOpenChange={setCreateIssueOpen}
                productionOrderId={activeOrderId}
                warehouses={warehouses}
                materials={materials}
                onSuccess={handleCreateMaterialIssue}
            />

            <RecordOutputDialog
                open={recordOutputOpen}
                onOpenChange={setRecordOutputOpen}
                batchId={activeBatchId}
                warehouses={warehouses}
                drums={drums}
                onSuccess={handleRecordOutput}
            />

            {/* Batch QA Inspection & Pass/Fail Workflow Dialog */}
            <BatchTestDialog
                open={testDialogOpen}
                onOpenChange={setTestDialogOpen}
                batch={selectedBatchForTest}
                onSuccess={() => {
                    fetchBatches();
                    fetchOrders();
                }}
                onMoveToNextMachine={handleMoveToNextMachine}
            />

            {/* Next Machine Advance Routing Dialog */}
            <NextMachineDialog
                open={nextMachineDialogOpen}
                onOpenChange={setNextMachineDialogOpen}
                nextStageInfo={nextStageInfo}
                previousBatch={selectedBatchForNext}
                onSuccess={() => {
                    fetchBatches();
                    fetchOrders();
                }}
            />
        </div>
    );
}
