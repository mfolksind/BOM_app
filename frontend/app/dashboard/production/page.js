'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
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
} from 'lucide-react';
import { CreateProductionOrderDialog } from '@/components/production/create-production-order-dialog';
import { CreateBatchDialog } from '@/components/production/create-batch-dialog';
import { CreateMaterialIssueDialog } from '@/components/production/create-material-issue-dialog';
import { RecordOutputDialog } from '@/components/production/record-output-dialog';

export default function ProductionOrdersPage() {
  const { user } = useAuth();
  const [productionOrders, setProductionOrders] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [stages, setStages] = useState([]);
  const [machines, setMachines] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [operators, setOperators] = useState([]);
  const [drums, setDrums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [recordOutputOpen, setRecordOutputOpen] = useState(false);

  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeBatchId, setActiveBatchId] = useState(null);

  const fetchDropdownData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/work-orders?limit=100'),
        api.get('/process-stages?limit=50'),
        api.get('/machines?limit=50'),
        api.get('/warehouses?limit=50'),
        api.get('/materials?limit=100'),
        api.get('/admins?limit=50'),
        api.get('/drums?limit=50'),
      ]);

      const [woRes, stgRes, mchRes, whRes, matRes, usrRes, drmRes] = results;

      if (woRes.status === 'fulfilled' && woRes.value?.data) {
        setWorkOrders(woRes.value.data.workOrders || woRes.value.data.items || (Array.isArray(woRes.value.data) ? woRes.value.data : []));
      }
      if (stgRes.status === 'fulfilled' && stgRes.value?.data) {
        setStages(Array.isArray(stgRes.value.data) ? stgRes.value.data : (stgRes.value.data.items || []));
      }
      if (mchRes.status === 'fulfilled' && mchRes.value?.data) {
        setMachines(Array.isArray(mchRes.value.data) ? mchRes.value.data : (mchRes.value.data.items || []));
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : (whRes.value.data.items || []));
      }
      if (matRes.status === 'fulfilled' && matRes.value?.data) {
        setMaterials(Array.isArray(matRes.value.data) ? matRes.value.data : (matRes.value.data.items || []));
      }
      if (usrRes.status === 'fulfilled' && usrRes.value?.data) {
        setOperators(Array.isArray(usrRes.value.data) ? usrRes.value.data : (usrRes.value.data.items || []));
      }
      if (drmRes.status === 'fulfilled' && drmRes.value?.data) {
        setDrums(Array.isArray(drmRes.value.data) ? drmRes.value.data : (drmRes.value.data.items || []));
      }
    } catch (err) {
      console.error('Failed to load shopfloor metadata', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (selectedStatus && selectedStatus !== 'ALL') {
        queryParams.append('status', selectedStatus);
      }
      if (search.trim()) {
        queryParams.append('search', search.trim());
      }

      const res = await api.get(`/production-orders?${queryParams.toString()}`);
      if (res?.data) {
        setProductionOrders(res.data.productionOrders || res.data.items || []);
        const pagination = res.data.pagination || {};
        setTotalPages(pagination.totalPages || res.data.totalPages || 1);
        setTotalCount(pagination.total || res.data.total || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch production orders');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, search]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreateOrder = async (workOrderId, payload) => {
    const res = await api.post(`/work-orders/${workOrderId}/production-orders`, payload);
    if (res?.success) {
      toast.success('Production order released to shopfloor');
      fetchOrders();
    }
  };

  const handleStartOrder = async (orderId) => {
    try {
      const res = await api.post(`/production-orders/${orderId}/start`, {});
      if (res?.success) {
        toast.success('Production order started');
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start production order');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    if (!confirm('Mark this production run as completed?')) return;
    try {
      const res = await api.post(`/production-orders/${orderId}/complete`, {});
      if (res?.success) {
        toast.success('Production order completed successfully');
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete production order');
    }
  };

  const handleCreateBatch = async (orderId, payload) => {
    const res = await api.post(`/production-orders/${orderId}/batches`, payload);
    if (res?.success) {
      toast.success('WIP process stage batch created');
      fetchOrders();
    }
  };

  const handleCreateMaterialIssue = async (orderId, payload) => {
    const res = await api.post(`/production-orders/${orderId}/material-issues`, payload);
    if (res?.success) {
      toast.success('Raw materials issued to shopfloor WIP');
      fetchOrders();
    }
  };

  const handleRecordOutput = async (batchId, payload) => {
    const res = await api.post(`/production-batches/${batchId}/outputs`, payload);
    if (res?.success) {
      toast.success('Quality inspected output logged to inventory');
      fetchOrders();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200">In Progress (Floor)</Badge>;
      case 'PLANNED':
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Planned</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-slate-500 bg-slate-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Shopfloor WIP & Production</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor real-time machine line runs, WIP batches, material issue notes, and QA outputs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="h-10 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
          <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); setPage(1); }}>
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

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="font-semibold text-xs text-slate-600">Production Order #</TableHead>
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
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                        PO
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {po.productionOrderNumber}
                        </span>
                        <p className="text-xs text-slate-400">
                          {po.remarks || 'Standard Run'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 text-sm">
                      {po.workOrderId?.workOrderNumber || 'Direct Order'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {po.customerId?.name || 'Customer'}
                    </div>
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
                        : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-800">
                      {po.startDate ? new Date(po.startDate).toLocaleDateString() : 'Immediate'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Target: {po.targetCompletionDate ? new Date(po.targetCompletionDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(po.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        nativeButton={false}
                        render={(props) => (
                          <div
                            {...props}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </div>
                        )}
                      />
                      <DropdownMenuContent align="end" className="w-56">
                        {po.status === 'PLANNED' && (
                          <DropdownMenuItem onClick={() => handleStartOrder(po._id)} className="cursor-pointer gap-2 text-amber-600 font-medium">
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
                          <Layers className="w-4 h-4" /> Add Process Batch
                        </DropdownMenuItem>

                        {po.status === 'IN_PROGRESS' && (
                          <DropdownMenuItem onClick={() => handleCompleteOrder(po._id)} className="cursor-pointer gap-2 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Complete Production
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{productionOrders.length}</span> of{' '}
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
    </div>
  );
}
