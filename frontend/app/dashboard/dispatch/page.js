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
  Truck,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  Send,
  XCircle,
} from 'lucide-react';
import { CreateDispatchDialog } from '@/components/dispatch/create-dispatch-dialog';

export default function DispatchManagementPage() {
  const { user } = useAuth();
  const [dispatches, setDispatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [createDispatchOpen, setCreateDispatchOpen] = useState(false);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [cRes, woRes, whRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/work-orders?limit=100'),
        api.get('/warehouses?limit=100'),
      ]);
      if (cRes?.data?.items) setCustomers(cRes.data.items);
      if (woRes?.data) setWorkOrders(woRes.data.workOrders || woRes.data.items || []);
      if (whRes?.data?.items) setWarehouses(whRes.data.items);
    } catch (err) {
      console.error('Failed to load dispatch metadata', err);
    }
  }, []);

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (selectedStatus && selectedStatus !== 'ALL') {
        queryParams.append('status', selectedStatus);
      }
      if (search.trim()) {
        queryParams.append('search', search.trim());
      }

      const res = await api.get(`/dispatches?${queryParams.toString()}`);
      if (res?.data) {
        setDispatches(res.data.items || res.data.dispatches || []);
        const pagination = res.data.pagination || {};
        setTotalPages(pagination.totalPages || res.data.totalPages || 1);
        setTotalCount(pagination.total || res.data.total || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch dispatches');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, search]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

  const handleCreateDispatch = async (payload) => {
    const res = await api.post('/dispatches', payload);
    if (res?.success) {
      toast.success('Outbound dispatch record created');
      fetchDispatches();
    }
  };

  const handlePostDispatch = async (dispatchId) => {
    if (!confirm('Confirm and post this dispatch? This will deduct finished goods stock and update drum statuses.')) return;
    try {
      const res = await api.post(`/dispatches/${dispatchId}/dispatch`, {});
      if (res?.success) {
        toast.success('Dispatch posted! Stock deducted and outbound transaction logged.');
        fetchDispatches();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to post dispatch');
    }
  };

  const handleGenerateChallan = async (dispatchId) => {
    try {
      const res = await api.post(`/dispatches/${dispatchId}/generate-outbound-challan`, {});
      if (res?.success) {
        toast.success('Official Outbound Delivery Challan generated');
        fetchDispatches();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate delivery challan');
    }
  };

  const getDispatchStatusBadge = (status) => {
    switch (status) {
      case 'DISPATCHED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Dispatched & Left Gate</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300">Draft (Loading)</Badge>;
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Outbound Dispatch & Challans</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Finished cable delivery challans, truck consignments, and customer delivery receipts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDispatches}
            className="h-10 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateDispatchOpen(true)}
            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Outbound Dispatch
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search Dispatch # or Vehicle..."
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="DISPATCHED">Dispatched</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="font-semibold text-xs text-slate-600">Dispatch Order #</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Customer</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Source Warehouse</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Vehicle & LR #</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
              <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Loading dispatches...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : dispatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Truck className="w-7 h-7 text-slate-400" />
                    <p className="font-medium text-slate-700">No dispatch shipments found</p>
                    <p className="text-xs text-slate-400">
                      Create an outbound dispatch to generate official delivery challans and gate passes.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              dispatches.map((disp) => (
                <TableRow key={disp._id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                        DSP
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {disp.dispatchNumber}
                        </span>
                        <p className="text-xs text-slate-400">
                          {disp.createdAt ? new Date(disp.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 text-sm">
                      {disp.customerId?.name || 'Customer Consignee'}
                    </div>
                    {disp.customerId?.code && (
                      <div className="text-xs text-slate-500">
                        {disp.customerId.code}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-800 text-sm">
                      {disp.sourceWarehouseId?.name || 'Finished Goods'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 text-sm">
                      {disp.vehicleNumber || 'No truck entered'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {disp.lrNumber ? `LR: ${disp.lrNumber}` : disp.transporterName || ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDispatchStatusBadge(disp.status)}
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
                      <DropdownMenuContent align="end" className="w-52">
                        {disp.status === 'DRAFT' && (
                          <DropdownMenuItem onClick={() => handlePostDispatch(disp._id)} className="cursor-pointer gap-2 text-emerald-600 font-medium">
                            <Send className="w-4 h-4" /> Post & Release Gate Pass
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={() => handleGenerateChallan(disp._id)} className="cursor-pointer gap-2 text-blue-600">
                          <FileText className="w-4 h-4" /> Generate Delivery Challan
                        </DropdownMenuItem>
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
            Showing <span className="font-semibold text-slate-700">{dispatches.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalCount}</span> Dispatches
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

      {/* Create Dialog */}
      <CreateDispatchDialog
        open={createDispatchOpen}
        onOpenChange={setCreateDispatchOpen}
        customers={customers}
        workOrders={workOrders}
        warehouses={warehouses}
        onSuccess={handleCreateDispatch}
      />
    </div>
  );
}
