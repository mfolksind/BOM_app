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

import { CreateMachineDialog } from '@/components/machines/create-machine-dialog';
import { EditMachineDialog } from '@/components/machines/edit-machine-dialog';

import {
  Cog,
  Plus,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Activity,
  Layers,
  Gauge,
  MapPin,
  Pencil,
  Eye,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Wrench,
} from 'lucide-react';

export default function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [stages, setStages] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [dialogMode, setDialogMode] = useState('view');

  const fetchStages = useCallback(async () => {
    try {
      const res = await api.get('/process-stages?limit=100');
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      setStages(list);
    } catch (err) {
      console.error('Failed to load process stages', err);
    }
  }, []);

  const fetchMachines = useCallback(
    async (pageToFetch = pagination.page) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', pageToFetch.toString());
        params.append('limit', pagination.limit.toString());

        if (search.trim()) {
          params.append('search', search.trim());
        }
        if (statusFilter !== 'ALL') {
          params.append('status', statusFilter);
        }
        if (stageFilter !== 'ALL') {
          params.append('processStageId', stageFilter);
        }

        const res = await api.get(`/machines?${params.toString()}`);
        if (res?.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.machines || []);
          const total = res.pagination?.total !== undefined ? res.pagination.total : (res.data.total || list.length);
          const totalPages = res.pagination?.totalPages !== undefined ? res.pagination.totalPages : (res.data.totalPages || 1);

          setMachines(list);
          setPagination((prev) => ({
            ...prev,
            page: pageToFetch,
            total,
            totalPages,
          }));
        }
      } catch (err) {
        toast.error(err.message || 'Failed to fetch machines');
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, search, statusFilter, stageFilter]
  );

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleRowClick = (machine, mode = 'view') => {
    setSelectedMachine(machine);
    setDialogMode(mode);
    setEditOpen(true);
  };

  const handleStatusChange = async (machineId, newStatus) => {
    try {
      const res = await api.patch(`/machines/${machineId}`, { status: newStatus });
      if (res?.success || res?.data) {
        toast.success(`Machine status updated to ${newStatus}`);
        fetchMachines();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change machine status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Available</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Running Job</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Maintenance</Badge>;
      case 'BREAKDOWN':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Breakdown</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasActiveFilters = search || statusFilter !== 'ALL' || stageFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Shopfloor Machines & Equipment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure line machinery, rated throughput capacities, and real-time operational status.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Register Machine
        </Button>
      </div>

      {/* Main Unified Table Card */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Cog className="w-4 h-4 text-slate-800" />
                Equipment Inventory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} production machines registered in system
              </CardDescription>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search machine or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-white border-slate-200"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm w-36 bg-white border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">All Statuses</SelectItem>
                  <SelectItem value="AVAILABLE" className="text-sm">Available</SelectItem>
                  <SelectItem value="RUNNING" className="text-sm">Running</SelectItem>
                  <SelectItem value="MAINTENANCE" className="text-sm">Maintenance</SelectItem>
                  <SelectItem value="BREAKDOWN" className="text-sm">Breakdown</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-9 text-sm w-44 bg-white border-slate-200">
                  <SelectValue placeholder="Process Stage" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="ALL" className="text-sm">All Stages</SelectItem>
                  {stages.map((stg) => (
                    <SelectItem key={stg._id} value={stg._id} className="text-sm">
                      {stg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setStageFilter('ALL');
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
                onClick={() => fetchMachines()}
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
                    Machine Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Name & Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Operating Speed & Capacity
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Location / Bay
                  </TableHead>
                  <TableHead className="w-32 text-xs font-semibold text-slate-700 uppercase tracking-wider">
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
                    <TableCell colSpan={6} className="h-44 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-800" />
                        <span className="text-sm font-medium">Loading shopfloor machines...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : machines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Cog className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">No machines found</p>
                        <p className="text-xs text-slate-500 text-center">
                          {hasActiveFilters
                            ? 'No machines match your search filter criteria. Try clearing filters.'
                            : 'Register plant machinery to allocate batches and track production speeds.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  machines.map((m) => (
                    <TableRow
                      key={m._id}
                      onClick={() => handleRowClick(m, 'view')}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-100"
                    >
                      <TableCell className="py-3.5 font-mono font-bold text-slate-900 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            M
                          </div>
                          <span>{m.code}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="font-semibold text-slate-900 text-sm">{m.name}</div>
                        <p className="text-xs text-slate-400">{m.machineType || 'General Line Machinery'}</p>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="text-sm text-slate-800 font-medium">
                          {m.capacityPerShift ? `${m.capacityPerShift.toLocaleString()} m / shift` : 'Standard Capacity'}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          {m.speedMetersPerMinute ? `${m.speedMetersPerMinute} m/min speed` : 'Variable Speed'}
                        </p>
                      </TableCell>

                      <TableCell className="py-3.5 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.location || 'Shopfloor Main'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        {getStatusBadge(m.status)}
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
                              Machine Options
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleRowClick(m, 'view')}
                              className="cursor-pointer gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              View Specifications
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRowClick(m, 'edit')}
                              className="cursor-pointer gap-2"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              Edit Configuration
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Change Operational Status
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(m._id, 'AVAILABLE')}
                              className="cursor-pointer gap-2 text-emerald-700"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Set as Available (Idle)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(m._id, 'MAINTENANCE')}
                              className="cursor-pointer gap-2 text-amber-700"
                            >
                              <Wrench className="w-3.5 h-3.5 text-amber-600" />
                              Set to Maintenance
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(m._id, 'BREAKDOWN')}
                              className="cursor-pointer gap-2 text-rose-700"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Mark as Breakdown
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {machines.length} of {pagination.total} machines
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchMachines(pagination.page - 1)}
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
                onClick={() => fetchMachines(pagination.page + 1)}
                className="h-8 text-xs border-slate-200 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slide-over Create Machine Drawer */}
      <CreateMachineDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        stages={stages}
        onSuccess={() => fetchMachines(1)}
      />

      {/* Slide-over View & Edit Machine Drawer */}
      <EditMachineDialog
        machine={selectedMachine}
        open={editOpen}
        onOpenChange={setEditOpen}
        initialMode={dialogMode}
        stages={stages}
        onSuccess={() => fetchMachines(pagination.page)}
      />
    </div>
  );
}
