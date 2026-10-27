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

import { CreateCustomerDialog } from '@/components/customers/create-customer-dialog';
import { EditCustomerDialog } from '@/components/customers/edit-customer-dialog';

import {
  Building2,
  Plus,
  Edit2,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Power,
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerMode, setCustomerMode] = useState('view');

  const fetchCustomers = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', pagination.limit.toString());

        if (search.trim()) {
          params.append('search', search.trim());
        }
        if (statusFilter !== 'ALL') {
          params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');
        }

        const res = await apiClient(`/customers?${params.toString()}`);
        if (res.data) {
          setCustomers(res.data);
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
        toast.error('Failed to load customers', {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter]
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [search, statusFilter]);

  const handleToggleStatus = async (customer) => {
    try {
      const nextStatus = !customer.isActive;
      await apiClient(`/customers/${customer._id}/status`, {
        method: 'PATCH',
        body: { isActive: nextStatus },
      });
      toast.success(`Customer ${nextStatus ? 'Activated' : 'Deactivated'}`);
      fetchCustomers(pagination.page);
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
            Customers Master
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Register clients for cable job-work contracts, purchase orders, and inventory allocation.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Client Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} total customers registered
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search code, company, GSTIN..."
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
                  <SelectItem value="ALL" className="text-sm">
                    All Status
                  </SelectItem>
                  <SelectItem value="ACTIVE" className="text-sm">
                    Active Clients
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-sm">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
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
                onClick={() => fetchCustomers(pagination.page)}
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
                    Customer Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Company Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    GSTIN / PAN
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contact &amp; Location
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Credit Terms
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
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Building2 className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No customers registered yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Customer" to register your first client.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((cust) => {
                    const city = cust.billingAddress?.city;
                    const state = cust.billingAddress?.state;

                    return (
                      <TableRow
                        key={cust._id}
                        onClick={() => {
                          setEditingCustomer(cust);
                          setCustomerMode('view');
                        }}
                        className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer group"
                      >
                        {/* Code */}
                        <TableCell className="font-mono text-sm font-bold text-slate-900 py-4 group-hover:text-blue-600 transition-colors">
                          {cust.code}
                        </TableCell>

                        {/* Company Name */}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {cust.name}
                            </span>
                            {cust.legalName && (
                              <span className="text-xs text-slate-400">
                                {cust.legalName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* GSTIN / PAN */}
                        <TableCell className="py-4">
                          <div className="flex flex-col font-mono text-xs">
                            <span className="text-slate-800 font-semibold">
                              {cust.gstin || '—'}
                            </span>
                            {cust.pan && (
                              <span className="text-slate-400">
                                PAN: {cust.pan}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Contact & Location */}
                        <TableCell className="py-4">
                          <div className="flex flex-col text-xs text-slate-600 space-y-0.5">
                            <span className="font-medium text-slate-800">
                              {cust.contactPerson} ({cust.phone})
                            </span>
                            <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {city ? `${city}, ${state}` : 'India'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Credit Terms */}
                        <TableCell className="py-4 text-xs font-mono text-slate-700">
                          {cust.creditDays ? `${cust.creditDays} Days` : 'Immediate'}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4">
                          {cust.isActive ? (
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
                                Customer Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCustomer(cust);
                                  setCustomerMode('edit');
                                }}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Edit Customer Details
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(cust)}
                                className="text-xs cursor-pointer text-slate-700"
                              >
                                <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                {cust.isActive ? 'Deactivate Customer' : 'Reactivate Customer'}
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
              ({pagination.total} total customers)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCustomers(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-9 px-3 border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCustomers(pagination.page + 1)}
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
      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => fetchCustomers(1)}
      />

      {/* Edit / View Dialog */}
      <EditCustomerDialog
        open={Boolean(editingCustomer)}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
        initialMode={customerMode}
        onSuccess={() => fetchCustomers(pagination.page)}
      />
    </div>
  );
}
