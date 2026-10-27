'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

// Shadcn UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// Dialogs & subcomponents
import { AdminStats } from '@/components/admins/admin-stats';
import { CreateAdminDialog } from '@/components/admins/create-admin-dialog';
import { EditAdminDialog } from '@/components/admins/edit-admin-dialog';
import { ResetPasswordDialog } from '@/components/admins/reset-password-dialog';
import { DeleteAdminDialog } from '@/components/admins/delete-admin-dialog';
import { ToggleStatusDialog } from '@/components/admins/toggle-status-dialog';

// Icons
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Edit,
  KeyRound,
  Trash2,
  Power,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Mail,
  Phone,
  Building,
  RefreshCw,
} from 'lucide-react';

const DEPARTMENT_COLORS = {
  MANAGEMENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PRODUCTION: 'bg-amber-50 text-amber-700 border-amber-200',
  STORES: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  QUALITY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DISPATCH: 'bg-purple-50 text-purple-700 border-purple-200',
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200',
  ACCOUNTS: 'bg-rose-50 text-rose-700 border-rose-200',
};

import { useRouter } from 'next/navigation';

export default function AdminsManagementPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  // Guard: Only SUPER_ADMIN can view or manage admins
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      toast.error('Access Restricted', {
        description: 'Administrator management is restricted to Super Admin only.',
      });
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  // State
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [adminMode, setAdminMode] = useState('view');
  const [resetAdmin, setResetAdmin] = useState(null);
  const [deleteAdmin, setDeleteAdmin] = useState(null);
  const [toggleAdmin, setToggleAdmin] = useState(null);

  // Fetch admins
  const fetchAdmins = useCallback(
    async (page = pagination.page) => {
      if (currentUser?.role !== 'SUPER_ADMIN') return;
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
        if (deptFilter !== 'ALL') {
          params.append('department', deptFilter);
        }

        const res = await apiClient(`/admins?${params.toString()}`);
        if (res.data) {
          setAdmins(res.data);
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
        toast.error('Failed to load admins', {
          description: err.message || 'Error communicating with backend.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter, deptFilter]
  );

  useEffect(() => {
    fetchAdmins(1);
  }, [search, statusFilter, deptFilter]);

  // Derived stats
  const activeCount = admins.filter((a) => a.isActive).length;
  const uniqueDepts = new Set(admins.map((a) => a.department).filter(Boolean)).size;

  const stats = {
    total: pagination.total || admins.length,
    active: activeCount,
    inactive: admins.length - activeCount,
    departments: uniqueDepts || 7,
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Page Title & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Administrators &amp; Staff
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your company managers and administrative accounts.
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-2 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add New Admin
          </Button>
        )}
      </div>

      {/* Metric Stat Cards */}
      <AdminStats stats={stats} isLoading={isLoading && admins.length === 0} />

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Active Staff List
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {pagination.total} total administrators registered
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search code, name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-200"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32 bg-white border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Status
                  </SelectItem>
                  <SelectItem value="ACTIVE" className="text-xs">
                    Active Only
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-xs">
                    Deactivated
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Department filter */}
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 text-xs w-36 bg-white border-slate-200">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Depts
                  </SelectItem>
                  <SelectItem value="MANAGEMENT" className="text-xs">
                    MANAGEMENT
                  </SelectItem>
                  <SelectItem value="PRODUCTION" className="text-xs">
                    PRODUCTION
                  </SelectItem>
                  <SelectItem value="STORES" className="text-xs">
                    STORES
                  </SelectItem>
                  <SelectItem value="QUALITY" className="text-xs">
                    QUALITY
                  </SelectItem>
                  <SelectItem value="DISPATCH" className="text-xs">
                    DISPATCH
                  </SelectItem>
                  <SelectItem value="MAINTENANCE" className="text-xs">
                    MAINTENANCE
                  </SelectItem>
                  <SelectItem value="ACCOUNTS" className="text-xs">
                    ACCOUNTS
                  </SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setDeptFilter('ALL');
                  }}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
                >
                  <FilterX className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAdmins(pagination.page)}
                disabled={isLoading}
                className="h-8 px-2.5 text-xs border-slate-200"
                title="Refresh Table"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`}
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
                  <TableHead className="w-[120px] text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Emp Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Full Name &amp; Role
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contact &amp; Email
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Department
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Last Seen
                  </TableHead>
                  <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-14">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ShieldAlert className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600">
                          No administrator accounts found
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try adjusting search filters or create a new admin.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => {
                    const isSelf = admin.id === currentUser?.id;
                    const isProtectedSuperAdmin = admin.role === 'SUPER_ADMIN';
                    const deptClass =
                      DEPARTMENT_COLORS[admin.department] ||
                      'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <TableRow
                        key={admin.id}
                        onClick={() => {
                          setEditAdmin(admin);
                          setAdminMode('view');
                        }}
                        className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer group"
                      >
                        {/* Emp Code */}
                        <TableCell className="font-mono text-xs font-semibold text-slate-900 py-3.5 group-hover:text-blue-600 transition-colors">
                          {admin.employeeCode}
                        </TableCell>

                        {/* Name & Role */}
                        <TableCell className="py-3.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                              {admin.firstName} {admin.lastName}
                              {isSelf && (
                                <span className="text-[10px] text-indigo-600 bg-indigo-50 font-normal px-1 rounded border border-indigo-200">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {admin.role}
                            </span>
                          </div>
                        </TableCell>

                        {/* Contact & Email */}
                        <TableCell className="py-3.5">
                          <div className="flex flex-col text-xs text-slate-600 space-y-0.5">
                            <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              {admin.email}
                            </span>
                            {admin.phone && (
                              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                {admin.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="py-3.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold border ${deptClass}`}
                          >
                            {admin.department || 'MANAGEMENT'}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5">
                          {admin.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </TableCell>

                        {/* Last seen */}
                        <TableCell className="py-3.5 text-[11px] text-slate-500">
                          {admin.lastLoginAt
                            ? new Date(admin.lastLoginAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never logged in'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
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
                              <DropdownMenuLabel className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                                {isSuperAdmin ? 'Super Admin Controls' : 'Account Actions'}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Only SUPER_ADMIN can edit other admin accounts */}
                              {isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditAdmin(admin);
                                    setAdminMode('edit');
                                  }}
                                  className="text-xs cursor-pointer text-slate-700"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                  Edit Account
                                </DropdownMenuItem>
                              )}

                              {/* Only SUPER_ADMIN can force reset passwords */}
                              {isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => setResetAdmin(admin)}
                                  className="text-xs cursor-pointer text-slate-700"
                                >
                                  <KeyRound className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                  Force Reset Password
                                </DropdownMenuItem>
                              )}

                              {/* Only SUPER_ADMIN can activate/deactivate accounts */}
                              {isSuperAdmin && !isProtectedSuperAdmin && !isSelf && (
                                <DropdownMenuItem
                                  onClick={() => setToggleAdmin(admin)}
                                  className="text-xs cursor-pointer text-slate-700"
                                >
                                  <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                  {admin.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                </DropdownMenuItem>
                              )}

                              {/* Only SUPER_ADMIN can delete an account */}
                              {isSuperAdmin && !isProtectedSuperAdmin && !isSelf && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteAdmin(admin)}
                                    className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete Account
                                  </DropdownMenuItem>
                                </>
                              )}

                              {!isSuperAdmin && (
                                <div className="px-2 py-1.5 text-[11px] text-slate-400 italic">
                                  Restricted to Super Admin
                                </div>
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

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30 text-xs text-slate-500">
            <span>
              Showing Page <span className="font-semibold text-slate-800">{pagination.page}</span>{' '}
              of <span className="font-semibold text-slate-800">{pagination.totalPages || 1}</span>{' '}
              ({pagination.total} records total)
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAdmins(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAdmins(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => fetchAdmins(1)}
      />

      <EditAdminDialog
        admin={editAdmin}
        open={!!editAdmin}
        onOpenChange={(open) => !open && setEditAdmin(null)}
        initialMode={adminMode}
        onSuccess={() => fetchAdmins(pagination.page)}
      />

      <ResetPasswordDialog
        admin={resetAdmin}
        open={!!resetAdmin}
        onOpenChange={(open) => !open && setResetAdmin(null)}
        onSuccess={() => fetchAdmins(pagination.page)}
      />

      <ToggleStatusDialog
        admin={toggleAdmin}
        open={!!toggleAdmin}
        onOpenChange={(open) => !open && setToggleAdmin(null)}
        onSuccess={() => fetchAdmins(pagination.page)}
      />

      <DeleteAdminDialog
        admin={deleteAdmin}
        open={!!deleteAdmin}
        onOpenChange={(open) => !open && setDeleteAdmin(null)}
        onSuccess={() => fetchAdmins(pagination.page)}
      />
    </div>
  );
}
