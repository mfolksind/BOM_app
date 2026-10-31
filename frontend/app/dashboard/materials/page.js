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

import { CreateMaterialDialog } from '@/components/materials/create-material-dialog';
import { EditMaterialDialog } from '@/components/materials/edit-material-dialog';
import { DataImportModal } from '@/components/shared/data-import-modal';

import {
  Boxes,
  Plus,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Power,
  Pencil,
  Layers,
  UploadCloud,
} from 'lucide-react';

const CATEGORY_COLORS = {
  COPPER: 'bg-amber-50 text-amber-800 border-amber-300',
  ALUMINUM: 'bg-slate-100 text-slate-800 border-slate-300',
  PVC_COMPOUND: 'bg-blue-50 text-blue-700 border-blue-200',
  XLPE_COMPOUND: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GI_WIRE_STRIP: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  TAPE_BINDING: 'bg-purple-50 text-purple-700 border-purple-200',
  MASTERBATCH: 'bg-pink-50 text-pink-700 border-pink-200',
  PACKING_MATERIAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialMode, setMaterialMode] = useState('view');

  const fetchMaterials = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', pagination.limit.toString());

        if (search.trim()) {
          params.append('search', search.trim());
        }
        if (categoryFilter !== 'ALL') {
          params.append('category', categoryFilter);
        }
        if (statusFilter !== 'ALL') {
          params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');
        }

        const res = await apiClient(`/materials?${params.toString()}`);
        if (res.data) {
          setMaterials(res.data);
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
        toast.error('Failed to load materials', {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, categoryFilter, statusFilter]
  );

  useEffect(() => {
    fetchMaterials(1);
  }, [search, categoryFilter, statusFilter]);

  const handleToggleStatus = async (mat) => {
    try {
      const nextStatus = !mat.isActive;
      await apiClient(`/materials/${mat._id}/status`, {
        method: 'PATCH',
        body: { isActive: nextStatus },
      });
      toast.success(`Material ${nextStatus ? 'Activated' : 'Deactivated'}`);
      fetchMaterials(pagination.page);
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
            Raw Materials Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Raw material norms, conductor metals, insulation polymers, armour wires, and binding tapes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="h-10 px-3.5 border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm gap-2 cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            Import Materials
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Raw Material
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Material Items
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} raw items cataloged
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

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-sm w-44 bg-white border-slate-200">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">
                    All Categories
                  </SelectItem>
                  <SelectItem value="COPPER" className="text-sm">
                    Copper (Cu)
                  </SelectItem>
                  <SelectItem value="ALUMINUM" className="text-sm">
                    Aluminum (Al)
                  </SelectItem>
                  <SelectItem value="PVC_COMPOUND" className="text-sm">
                    PVC Compound
                  </SelectItem>
                  <SelectItem value="XLPE_COMPOUND" className="text-sm">
                    XLPE Compound
                  </SelectItem>
                  <SelectItem value="GI_WIRE_STRIP" className="text-sm">
                    GI Wire / Strip
                  </SelectItem>
                  <SelectItem value="TAPE_BINDING" className="text-sm">
                    Binding Tape
                  </SelectItem>
                  <SelectItem value="PACKING_MATERIAL" className="text-sm">
                    Packing Material
                  </SelectItem>
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
                  className="h-9 px-3 text-sm text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <FilterX className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMaterials(pagination.page)}
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
                    Material Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Material Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Base Unit
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    HSN Code
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
                      <TableCell colSpan={7} className="h-16">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Boxes className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No raw materials registered yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Raw Material" to define metals, compounds, or tapes.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((mat) => {
                    const catColor =
                      CATEGORY_COLORS[mat.category] || 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <TableRow
                        key={mat._id}
                        onClick={() => {
                          setEditingMaterial(mat);
                          setMaterialMode('view');
                        }}
                        className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer group"
                      >
                        {/* Code */}
                        <TableCell className="font-mono text-sm font-bold text-slate-900 py-4 group-hover:text-blue-600 transition-colors">
                          {mat.code}
                        </TableCell>

                        {/* Name & desc */}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {mat.name}
                            </span>
                            {mat.description && (
                              <span className="text-xs text-slate-400 truncate max-w-xs">
                                {mat.description}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold px-2 py-0.5 border ${catColor}`}
                          >
                            {mat.category}
                          </Badge>
                        </TableCell>

                        {/* Unit */}
                        <TableCell className="py-4 text-xs font-mono font-semibold text-slate-800">
                          {mat.baseUnit || 'KG'}
                        </TableCell>

                        {/* HSN */}
                        <TableCell className="py-4 text-xs font-mono text-slate-600">
                          {mat.hsnCode || '—'}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4">
                          {mat.isActive ? (
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
                                Material Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMaterial(mat);
                                  setMaterialMode('edit');
                                }}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Edit Raw Material
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(mat)}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                {mat.isActive ? 'Deactivate Item' : 'Reactivate Item'}
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
              ({pagination.total} total items)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMaterials(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-9 px-3 border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMaterials(pagination.page + 1)}
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
      <CreateMaterialDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => fetchMaterials(1)}
      />

      {/* Edit / View Dialog */}
      <EditMaterialDialog
        material={editingMaterial}
        open={!!editingMaterial}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingMaterial(null);
        }}
        initialMode={materialMode}
        onSuccess={() => fetchMaterials(pagination.page)}
      />

      {/* Bulk Data Import Modal */}
      <DataImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        initialTemplateKey="RAW_MATERIALS"
        onSuccess={() => fetchMaterials(1)}
      />
    </div>
  );
}
