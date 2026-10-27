'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
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

import { CreateWarehouseDialog } from '@/components/warehouses/create-warehouse-dialog';
import { EditWarehouseDialog } from '@/components/warehouses/edit-warehouse-dialog';

import {
  Warehouse,
  Plus,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MapPin,
  Boxes,
  Power,
  Pencil,
  Layers,
  Cpu,
  Package,
} from 'lucide-react';

const WAREHOUSE_TYPE_LABELS = {
  RAW_MATERIAL: { label: 'Raw Material Store', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CUSTOMER_SUPPLIED: { label: 'Customer Supplied', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  WORK_IN_PROGRESS: { label: 'Shopfloor WIP', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  FINISHED_GOODS: { label: 'Finished Goods', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  SCRAP: { label: 'Scrap & Waste', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  PACKING_MATERIAL: { label: 'Packing Material', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  QUARANTINE: { label: 'Quarantine Hold', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseMode, setWarehouseMode] = useState('view');

  const fetchWarehouses = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', pagination.limit.toString());

        if (search.trim()) {
          params.append('search', search.trim());
        }
        if (typeFilter !== 'ALL') {
          params.append('type', typeFilter);
        }
        if (statusFilter !== 'ALL') {
          params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');
        }

        const res = await apiClient(`/warehouses?${params.toString()}`);
        if (res.data) {
          setWarehouses(res.data);
          if (res.meta) {
            setPagination((prev) => ({
              ...prev,
              page: res.meta.page,
              total: res.meta.total,
              totalPages: res.meta.totalPages,
            }));
          }
        }
      } catch (err) {
        toast.error('Failed to load warehouses', {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, typeFilter, statusFilter]
  );

  useEffect(() => {
    fetchWarehouses(1);
  }, [search, typeFilter, statusFilter]);

  const handleToggleStatus = async (wh) => {
    try {
      const nextStatus = !wh.isActive;
      await apiClient(`/warehouses/${wh._id}/status`, {
        method: 'PATCH',
        body: { isActive: nextStatus },
      });
      toast.success(`Warehouse ${nextStatus ? 'Activated' : 'Deactivated'}`);
      fetchWarehouses(pagination.page);
    } catch (err) {
      toast.error('Status update failed', { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Warehouses &amp; Plant Locations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Storage locations for Raw Materials, Customer Stock, Shopfloor WIP, Finished Cables, and Scrap.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Storage Locations
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} storage facilities registered
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-white border-slate-200"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-sm w-44 bg-white border-slate-200">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">
                    All Storage Types
                  </SelectItem>
                  <SelectItem value="RAW_MATERIAL" className="text-sm">
                    Raw Material Store
                  </SelectItem>
                  <SelectItem value="CUSTOMER_SUPPLIED" className="text-sm">
                    Customer Supplied
                  </SelectItem>
                  <SelectItem value="WORK_IN_PROGRESS" className="text-sm">
                    Shopfloor WIP
                  </SelectItem>
                  <SelectItem value="FINISHED_GOODS" className="text-sm">
                    Finished Goods
                  </SelectItem>
                  <SelectItem value="SCRAP" className="text-sm">
                    Scrap Yard
                  </SelectItem>
                </SelectContent>
              </Select>

              {(search || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
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
                onClick={() => fetchWarehouses(pagination.page)}
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
                    Warehouse Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Name &amp; Location
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Storage Purpose / Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Capacity
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-20 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-16">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Warehouse className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No warehouses registered yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Warehouse" to create your raw material stores and shopfloor WIP.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((wh) => {
                    const typeConfig =
                      WAREHOUSE_TYPE_LABELS[wh.type] || {
                        label: wh.type,
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                      };

                    return (
                      <TableRow
                        key={wh._id}
                        onClick={() => {
                          setEditingWarehouse(wh);
                          setWarehouseMode('view');
                        }}
                        className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer group"
                      >
                        {/* Code */}
                        <TableCell className="font-mono text-sm font-bold text-slate-900 py-4 group-hover:text-blue-600 transition-colors">
                          {wh.code}
                        </TableCell>

                        {/* Name & Location */}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {wh.name}
                            </span>
                            {wh.location && (
                              <span className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {wh.location}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Type badge */}
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold px-2.5 py-0.5 border ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </Badge>
                        </TableCell>

                        {/* Capacity */}
                        <TableCell className="py-4 text-xs font-mono text-slate-700">
                          {wh.capacity ? `${wh.capacity.toLocaleString()} units` : 'No limit'}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4">
                          {wh.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={(props) => (
                                <Button
                                  {...props}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-800 cursor-pointer"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              )}
                            />

                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                Warehouse Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingWarehouse(wh);
                                  setWarehouseMode('edit');
                                }}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Edit Warehouse
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(wh)}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                {wh.isActive ? 'Deactivate Warehouse' : 'Reactivate Warehouse'}
                              </DropdownMenuItem>
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

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40 text-sm text-slate-600">
            <span>
              Showing Page <span className="font-semibold text-slate-900">{pagination.page}</span>{' '}
              of <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span>{' '}
              ({pagination.total} total warehouses)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchWarehouses(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-9 px-3 border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchWarehouses(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="h-9 px-3 border-slate-200 cursor-pointer"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateWarehouseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => fetchWarehouses(1)}
      />

      {/* Edit / View Dialog */}
      <EditWarehouseDialog
        warehouse={editingWarehouse}
        open={!!editingWarehouse}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingWarehouse(null);
        }}
        initialMode={warehouseMode}
        onSuccess={() => fetchWarehouses(pagination.page)}
      />
    </div>
  );
}
