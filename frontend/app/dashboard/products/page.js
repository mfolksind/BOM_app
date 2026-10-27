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

import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { EditProductDialog } from '@/components/products/edit-product-dialog';

import {
  Cable,
  Plus,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Power,
  Zap,
  Pencil,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [voltageFilter, setVoltageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productMode, setProductMode] = useState('view');

  const fetchProducts = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', pagination.limit.toString());

        if (search.trim()) {
          params.append('search', search.trim());
        }
        if (voltageFilter !== 'ALL') {
          params.append('voltageGrade', voltageFilter);
        }
        if (statusFilter !== 'ALL') {
          params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');
        }

        const res = await apiClient(`/products?${params.toString()}`);
        if (res.data) {
          setProducts(res.data);
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
        toast.error('Failed to load cable products', {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, voltageFilter, statusFilter]
  );

  useEffect(() => {
    fetchProducts(1);
  }, [search, voltageFilter, statusFilter]);

  const handleToggleStatus = async (prod) => {
    try {
      const nextStatus = !prod.isActive;
      await apiClient(`/products/${prod._id}/status`, {
        method: 'PATCH',
        body: { isActive: nextStatus },
      });
      toast.success(`Product ${nextStatus ? 'Activated' : 'Deactivated'}`);
      fetchProducts(pagination.page);
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
            Cable Products Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manufactured cable products, core configurations, cross-sections, and insulation specifications.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Cable Product
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Cable Specifications
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} cable specifications registered
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search code or cable spec..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-white border-slate-200"
                />
              </div>

              <Select value={voltageFilter} onValueChange={setVoltageFilter}>
                <SelectTrigger className="h-9 text-sm w-36 bg-white border-slate-200">
                  <SelectValue placeholder="Voltage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">
                    All Voltages
                  </SelectItem>
                  <SelectItem value="1.1KV" className="text-sm">
                    1.1 kV (LT)
                  </SelectItem>
                  <SelectItem value="3.3KV" className="text-sm">
                    3.3 kV
                  </SelectItem>
                  <SelectItem value="11KV" className="text-sm">
                    11 kV (HT)
                  </SelectItem>
                  <SelectItem value="33KV" className="text-sm">
                    33 kV (HT)
                  </SelectItem>
                </SelectContent>
              </Select>

              {(search || voltageFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setVoltageFilter('ALL');
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
                onClick={() => fetchProducts(pagination.page)}
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
                    Cable Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Cable Description
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Voltage
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Cores &amp; Size
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Conductor &amp; Insulation
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
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Cable className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No cable products registered yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Cable Product" to define manufactured cable specs.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((prod) => {
                    return (
                      <TableRow
                        key={prod._id}
                        onClick={() => {
                          setSelectedProduct(prod);
                          setProductMode('view');
                          setEditOpen(true);
                        }}
                        className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer group"
                      >
                        {/* Code */}
                        <TableCell className="font-mono text-sm font-bold text-slate-900 py-4">
                          {prod.code}
                        </TableCell>

                        {/* Name */}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {prod.name}
                            </span>
                            {prod.standardSpecification && (
                              <span className="text-xs text-slate-400">
                                {prod.standardSpecification}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Voltage */}
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono font-semibold px-2 py-0.5 border bg-amber-50 text-amber-800 border-amber-200"
                          >
                            <Zap className="w-3 h-3 mr-1 text-amber-600" />
                            {prod.voltageGrade || '1.1KV'}
                          </Badge>
                        </TableCell>

                        {/* Cores & Size */}
                        <TableCell className="py-4 text-xs font-mono font-semibold text-slate-800">
                          {prod.coreCount || 1} Core x {prod.crossSectionSqMm} mm²
                        </TableCell>

                        {/* Conductor & Insulation */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-300"
                            >
                              {prod.conductorMaterial || 'AL'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium border bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {prod.insulationType || 'XLPE'}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4">
                          {prod.isActive ? (
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
                                Product Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedProduct(prod);
                                  setProductMode('edit');
                                  setEditOpen(true);
                                }}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Edit Specifications
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(prod)}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                {prod.isActive ? 'Deactivate Product' : 'Reactivate Product'}
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
              ({pagination.total} total products)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProducts(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-9 px-3 border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProducts(pagination.page + 1)}
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
      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => fetchProducts(1)}
      />

      {/* Edit / View Drawer */}
      <EditProductDialog
        product={selectedProduct}
        open={editOpen}
        onOpenChange={setEditOpen}
        initialMode={productMode}
        onSuccess={() => fetchProducts(pagination.page)}
      />
    </div>
  );
}
