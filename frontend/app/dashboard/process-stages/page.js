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

import { CreateProcessStageDialog } from '@/components/process-stages/create-process-stage-dialog';
import { EditProcessStageDialog } from '@/components/process-stages/edit-process-stage-dialog';

import {
  Workflow,
  Plus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Layers,
  Activity,
  FilterX,
} from 'lucide-react';

export default function ProcessStagesPage() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const fetchStages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      const res = await api.get(`/process-stages?${params.toString()}`);
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      setStages(list);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch process stages');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/process-stages/seed-defaults', {});
      if (res?.success) {
        toast.success(res.message || 'Default cable process stages seeded successfully!');
        fetchStages();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to seed process stages');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleStatus = async (stage) => {
    const nextStatus = !stage.isActive;
    try {
      const res = await api.patch(`/process-stages/${stage._id}/status`, {
        isActive: nextStatus,
        reason: nextStatus ? 'Reactivated by administrator' : 'Deactivated by administrator',
      });
      if (res?.success) {
        toast.success(`Stage ${stage.name} is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}`);
        fetchStages();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (stage) => {
    if (!confirm(`Are you sure you want to permanently delete stage "${stage.name}" (${stage.code})?`)) {
      return;
    }
    try {
      const res = await api.delete(`/process-stages/${stage._id}`);
      if (res?.success) {
        toast.success(`Stage ${stage.name} deleted successfully`);
        fetchStages();
      }
    } catch (err) {
      toast.error(err.message || 'Cannot delete stage (in use by BOM or production)');
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'CONDUCTOR_PREPARATION':
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200">Conductor Prep</Badge>;
      case 'INSULATION':
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">Insulation</Badge>;
      case 'ASSEMBLY':
        return <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200">Assembly / Laying</Badge>;
      case 'SHEATHING':
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Sheathing</Badge>;
      case 'ARMOURING':
        return <Badge className="bg-purple-50 text-purple-800 border-purple-200">Armouring</Badge>;
      case 'TESTING_PACKING':
        return <Badge className="bg-rose-50 text-rose-800 border-rose-200">Testing & Packing</Badge>;
      default:
        return <Badge variant="outline">{category || 'General'}</Badge>;
    }
  };

  const activeCount = stages.filter((s) => s.isActive).length;
  const highestSequence = stages.reduce((max, s) => Math.max(max, s.sequenceOrder || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <Workflow className="w-6 h-6" />
            </div>
            Manufacturing Process Stages
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Define cable production sequence, routing stages, quality checkpoints, and machine assignments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStages}
            disabled={loading}
            className="h-10 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {stages.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="h-10 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              {seeding ? 'Seeding...' : 'Seed Standard Cable Stages'}
            </Button>
          )}

          <Button
            onClick={() => setCreateOpen(true)}
            className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            New Process Stage
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Stages</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stages.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active in Routing</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Highest Sequence Step</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">Step {highestSequence}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ArrowUpDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search stage code, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-sm w-44 bg-white border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="CONDUCTOR_PREPARATION">Conductor Prep</SelectItem>
              <SelectItem value="INSULATION">Insulation</SelectItem>
              <SelectItem value="ASSEMBLY">Assembly</SelectItem>
              <SelectItem value="SHEATHING">Sheathing</SelectItem>
              <SelectItem value="ARMOURING">Armouring</SelectItem>
              <SelectItem value="TESTING_PACKING">Testing & Packing</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm w-32 bg-white border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {(search || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
            >
              <FilterX className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Stages Table Card */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-24 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Seq #
              </TableHead>
              <TableHead className="w-44 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Stage Code
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Stage Name
              </TableHead>
              <TableHead className="w-48 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Process Category
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Description
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
                <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Loading process stages...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : stages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Workflow className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">No Process Stages Found</p>
                    <p className="text-xs text-slate-500 text-center">
                      Create manufacturing stages or click below to populate all 8 standard cable production steps.
                    </p>
                    <Button
                      onClick={handleSeedDefaults}
                      size="sm"
                      disabled={seeding}
                      className="mt-2 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Seed Standard Cable Stages
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stages.map((stage) => (
                <TableRow key={stage._id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell>
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-100 font-bold text-xs text-amber-900">
                      {stage.sequenceOrder}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-900">
                    {stage.code}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 text-sm">
                    {stage.name}
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(stage.category)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                    {stage.description || '—'}
                  </TableCell>
                  <TableCell>
                    {stage.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-slate-400 bg-slate-100">
                        Inactive
                      </Badge>
                    )}
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
                            <MoreHorizontal className="w-4 h-4" />
                          </div>
                        )}
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedStage(stage);
                            setEditOpen(true);
                          }}
                          className="cursor-pointer gap-2"
                        >
                          <Pencil className="w-4 h-4 text-slate-500" />
                          Edit Stage
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(stage)}
                          className="cursor-pointer gap-2"
                        >
                          {stage.isActive ? (
                            <>
                              <XCircle className="w-4 h-4 text-amber-600" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Reactivate
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(stage)}
                          className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          Delete Stage
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <CreateProcessStageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextSequence={highestSequence + 1}
        onSuccess={fetchStages}
      />

      {selectedStage && (
        <EditProcessStageDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          stage={selectedStage}
          onSuccess={fetchStages}
        />
      )}
    </div>
  );
}
