'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { CreateWorkOrderDialog } from '@/components/work-orders/create-work-order-dialog';
import { EditWorkOrderDialog } from '@/components/work-orders/edit-work-order-dialog';
import { RecordWorkOrderScrapDialog } from '@/components/work-orders/record-work-order-scrap-dialog';

import {
  FileSpreadsheet,
  Plus,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Eye,
  Pencil,
  Lock,
  Scale,
} from 'lucide-react';

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Slide-over drawers state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeWorkOrderId, setActiveWorkOrderId] = useState(null);
  const [dialogMode, setDialogMode] = useState('view');
  const [scrapDialogOpen, setScrapDialogOpen] = useState(false);
  const [scrapWorkOrderId, setScrapWorkOrderId] = useState(null);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/products?limit=100'),
      ]);
      const custList = Array.isArray(custRes?.data) ? custRes.data : (custRes?.data?.items || []);
      const prodList = Array.isArray(prodRes?.data) ? prodRes.data : (prodRes?.data?.items || []);
      setCustomers(custList);
      setProducts(prodList);
    } catch (err) {
      console.error('Failed to load metadata for work orders', err);
    }
  }, []);

  const fetchWorkOrders = useCallback(
    async (pageToFetch = pagination.page) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(pageToFetch),
          limit: String(pagination.limit),
        });

        if (selectedCustomer && selectedCustomer !== 'ALL') {
          queryParams.append('customerId', selectedCustomer);
        }
        if (selectedStatus && selectedStatus !== 'ALL') {
          queryParams.append('status', selectedStatus);
        }
        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        const res = await api.get(`/work-orders?${queryParams.toString()}`);
        if (res?.data) {
          const list = res.data.workOrders || res.data.items || [];
          const meta = res.data.pagination || {};
          setWorkOrders(list);
          setPagination((prev) => ({
            ...prev,
            page: pageToFetch,
            total: meta.total || res.data.total || list.length,
            totalPages: meta.totalPages || res.data.totalPages || 1,
          }));
        }
      } catch (err) {
        toast.error('Failed to load work orders', { description: err.message });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, selectedCustomer, selectedStatus]
  );

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchWorkOrders(1);
  }, [search, selectedCustomer, selectedStatus]);

  const handleRowClick = (wo, mode = 'view') => {
    setActiveWorkOrderId(wo._id);
    setDialogMode(mode);
    setEditOpen(true);
  };

  const handleConfirmWorkOrder = async (woId) => {
    if (!confirm('Confirm this Work Order? This permanently freezes the active BOM recipe and reserves/freezes required material stock.')) return;
    try {
      const res = await api.post(`/work-orders/${woId}/confirm`, { autoReserve: true });
      if (res?.success) {
        toast.success('Work Order confirmed and customer stock reserved/frozen successfully');
        fetchWorkOrders(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to confirm work order');
    }
  };

  const handleCancelWorkOrder = async (woId) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.post(`/work-orders/${woId}/cancel`, { reason: reason.trim() });
      if (res?.success) {
        toast.success('Work order cancelled');
        fetchWorkOrders(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel work order');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Confirmed</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Draft</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">In Production</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Completed</Badge>;
      case 'ON_HOLD':
        return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200">On Hold</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-slate-500 bg-slate-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasActiveFilters = search || selectedCustomer !== 'ALL' || selectedStatus !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Work Orders (WO)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Client manufacturing contracts, frozen BOM snapshots, and material allocations.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Work Order
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Production Orders
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} manufacturing work orders registered
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search WO or PO number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-white border-slate-200"
                />
              </div>

              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
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

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-sm w-36 bg-white border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">
                    All Status
                  </SelectItem>
                  <SelectItem value="CONFIRMED" className="text-sm">
                    Confirmed
                  </SelectItem>
                  <SelectItem value="DRAFT" className="text-sm">
                    Draft
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS" className="text-sm">
                    In Production
                  </SelectItem>
                  <SelectItem value="COMPLETED" className="text-sm">
                    Completed
                  </SelectItem>
                  <SelectItem value="ON_HOLD" className="text-sm">
                    On Hold
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
                    setSearch('');
                    setSelectedCustomer('ALL');
                    setSelectedStatus('ALL');
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
                onClick={() => fetchWorkOrders(pagination.page)}
                disabled={isLoading}
                className="h-9 px-3 text-sm border-slate-200 cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-36 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    WO Number
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Customer & PO
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Target Cable Product
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Ordered / Produced
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    BOM Snapshot
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                        <span className="text-sm font-medium">Loading work orders...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : workOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">No work orders found</p>
                        <p className="text-xs text-slate-500 text-center">
                          {hasActiveFilters
                            ? 'No orders match your filter criteria. Try resetting filters.'
                            : 'Create a client work order to freeze BOM recipes and schedule production.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  workOrders.map((wo) => {
                    const pct = wo.orderedLengthMeters
                      ? Math.min(100, Math.round(((wo.producedLengthMeters || 0) / wo.orderedLengthMeters) * 100))
                      : 0;

                    return (
                      <TableRow
                        key={wo._id}
                        onClick={() => handleRowClick(wo, 'view')}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-100"
                      >
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm hover:text-slate-700">
                              {wo.workOrderNumber}
                            </span>
                            {wo.priority && wo.priority !== 'NORMAL' && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase px-1.5 py-0 ${
                                  wo.priority === 'URGENT'
                                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                                    : 'border-amber-300 bg-amber-50 text-amber-700'
                                }`}
                              >
                                {wo.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            {wo.targetDeliveryDate ? new Date(wo.targetDeliveryDate).toLocaleDateString() : 'Immediate'}
                          </p>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="font-semibold text-slate-900 text-sm">
                            {wo.customerId?.name || 'In-House'}
                          </div>
                          {wo.customerPoNumber && (
                            <div className="text-xs text-slate-500 font-mono">
                              PO: {wo.customerPoNumber}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="font-medium text-slate-800 text-sm">
                            {wo.productId?.name || 'Cable'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {wo.productId?.code}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="text-sm font-semibold text-slate-900">
                            {wo.orderedLengthMeters?.toLocaleString()} m
                          </div>
                          <div className="text-xs text-slate-500">
                            Produced: <span className="text-emerald-700 font-medium">{wo.producedLengthMeters || 0} m</span> ({pct}%)
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          {wo.bomSnapshot ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span className="font-medium">{wo.bomSnapshot.bomNumber}</span>
                              <span className="text-slate-400">(v{wo.bomSnapshot.versionNumber}.0)</span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">Unfrozen Draft</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5">
                          {getStatusBadge(wo.status)}
                        </TableCell>

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
                                onClick={() => handleRowClick(wo, 'view')}
                                className="cursor-pointer gap-2"
                              >
                                <Eye className="w-4 h-4 text-slate-500" />
                                View Details & Norms
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setScrapWorkOrderId(wo._id);
                                  setScrapDialogOpen(true);
                                }}
                                className="cursor-pointer gap-2 text-rose-700 font-medium"
                              >
                                <Scale className="w-4 h-4 text-rose-600" />
                                Record / View Scrap
                              </DropdownMenuItem>

                              {wo.status === 'DRAFT' && (
                                <DropdownMenuItem
                                  onClick={() => handleRowClick(wo, 'edit')}
                                  className="cursor-pointer gap-2 text-slate-900"
                                >
                                  <Pencil className="w-4 h-4 text-slate-500" />
                                  Edit Order
                                </DropdownMenuItem>
                              )}

                              {wo.status === 'DRAFT' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmWorkOrder(wo._id)}
                                    className="cursor-pointer gap-2 text-emerald-600 font-medium"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Confirm & Freeze BOM
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCancelWorkOrder(wo._id)}
                                    className="cursor-pointer gap-2 text-rose-600"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{workOrders.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.total}</span> Work Orders
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchWorkOrders(pagination.page - 1)}
                className="h-8 text-xs border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 text-slate-700 font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchWorkOrders(pagination.page + 1)}
                className="h-8 text-xs border-slate-200 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slide-over Create Work Order Drawer */}
      <CreateWorkOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        customers={customers}
        products={products}
        onSuccess={() => fetchWorkOrders(pagination.page)}
      />

      {/* Slide-over View & Edit Work Order Drawer */}
      <EditWorkOrderDialog
        workOrderId={activeWorkOrderId}
        open={editOpen}
        onOpenChange={setEditOpen}
        initialMode={dialogMode}
        onSuccess={() => fetchWorkOrders(pagination.page)}
      />

      {/* Record Scrap & Tolerance Comparison Dialog */}
      <RecordWorkOrderScrapDialog
        workOrderId={scrapWorkOrderId}
        open={scrapDialogOpen}
        onOpenChange={setScrapDialogOpen}
        onSuccess={() => fetchWorkOrders(pagination.page)}
      />
    </div>
  );
}
