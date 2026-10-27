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
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  Boxes,
  Pencil,
} from 'lucide-react';
import { CreateDrumDialog } from '@/components/packing/create-drum-dialog';
import { EditDrumDialog } from '@/components/packing/edit-drum-dialog';

export default function PackingPage() {
  const { user } = useAuth();
  const [drums, setDrums] = useState([]);
  const [packingLists, setPackingLists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [createDrumOpen, setCreateDrumOpen] = useState(false);
  const [editingDrum, setEditingDrum] = useState(null);
  const [drumMode, setDrumMode] = useState('view');

  const fetchDropdownData = useCallback(async () => {
    try {
      const custRes = await api.get('/customers?limit=100');
      if (custRes?.data?.items) setCustomers(custRes.data.items);
    } catch (err) {
      console.error('Failed to load customers for drums', err);
    }
  }, []);

  const fetchDrums = useCallback(async () => {
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

      const res = await api.get(`/drums?${queryParams.toString()}`);
      if (res?.data) {
        setDrums(res.data.items || res.data.drums || []);
        const pagination = res.data.pagination || {};
        setTotalPages(pagination.totalPages || res.data.totalPages || 1);
        setTotalCount(pagination.total || res.data.total || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch drum inventory');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, search]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchDrums();
  }, [fetchDrums]);

  const handleCreateDrum = async (payload) => {
    const res = await api.post('/drums', payload);
    if (res?.success) {
      toast.success('Drum registered in inventory');
      fetchDrums();
    }
  };

  const getDrumStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Available Empty</Badge>;
      case 'IN_USE':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Wound with Cable</Badge>;
      case 'DISPATCHED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Dispatched (At Client)</Badge>;
      case 'DAMAGED':
        return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200">Damaged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Cable Drums & Packing Lists</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage returnable cable reels, tare weights, packing slips, and drum traceability.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDrums}
            className="h-10 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateDrumOpen(true)}
            className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Cable Drum
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search Drum Serial #..."
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
              <SelectItem value="AVAILABLE">Available Empty</SelectItem>
              <SelectItem value="IN_USE">Wound with Cable</SelectItem>
              <SelectItem value="DISPATCHED">Dispatched to Client</SelectItem>
              <SelectItem value="DAMAGED">Damaged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="font-semibold text-xs text-slate-600">Drum Identification #</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Drum Type</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Ownership</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Dimensions (Flange / Barrel)</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Tare Weight</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
              <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                    <span>Loading drums...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : drums.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Package className="w-7 h-7 text-slate-400" />
                    <p className="font-medium text-slate-700">No cable drums found</p>
                    <p className="text-xs text-slate-400">
                      Register your factory wooden reels or customer returnable drums to begin packing cable lengths.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              drums.map((drum) => (
                <TableRow
                  key={drum._id}
                  onClick={() => {
                    setEditingDrum(drum);
                    setDrumMode('view');
                  }}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        DR
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm font-mono group-hover:text-orange-600 transition-colors">
                          {drum.drumNumber}
                        </span>
                        <p className="text-xs text-slate-400">
                          {drum.remarks || 'Standard Drum'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium text-xs bg-slate-50">
                      {drum.drumType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-800">
                      {drum.ownership === 'CUSTOMER' ? 'Customer Supplied' : 'Factory Owned'}
                    </div>
                    {drum.customerId && (
                      <div className="text-xs text-slate-500">
                        {drum.customerId.name || drum.customerId.code}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-700 text-sm">
                      {drum.flangeDiameterMm ? `Ø ${drum.flangeDiameterMm}mm` : 'Standard'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-800 text-sm">
                      {drum.tareWeightKg ? `${drum.tareWeightKg} kg` : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getDrumStatusBadge(drum.status)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingDrum(drum);
                            setDrumMode('edit');
                          }}
                          className="cursor-pointer gap-2 text-xs text-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" /> Edit Drum Specs
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingDrum(drum);
                            setDrumMode('view');
                          }}
                          className="cursor-pointer gap-2 text-xs text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> View Drum Details
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
            Showing <span className="font-semibold text-slate-700">{drums.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalCount}</span> Drums
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

      {/* Creation Modal */}
      <CreateDrumDialog
        open={createDrumOpen}
        onOpenChange={setCreateDrumOpen}
        customers={customers}
        onSuccess={handleCreateDrum}
      />

      {/* Edit / View Modal */}
      <EditDrumDialog
        drum={editingDrum}
        open={!!editingDrum}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingDrum(null);
        }}
        customers={customers}
        initialMode={drumMode}
        onSuccess={() => fetchDrums()}
      />
    </div>
  );
}
