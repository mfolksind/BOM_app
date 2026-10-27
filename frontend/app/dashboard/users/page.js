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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Dialogs & subcomponents
import { CreateAdminDialog } from '@/components/admins/create-admin-dialog';
import { EditAdminDialog } from '@/components/admins/edit-admin-dialog';
import { ResetPasswordDialog } from '@/components/admins/reset-password-dialog';
import { DeleteAdminDialog } from '@/components/admins/delete-admin-dialog';
import { ToggleStatusDialog } from '@/components/admins/toggle-status-dialog';
import { ChangePasswordDialog } from '@/components/profile/change-password-dialog';
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog';

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
  Cpu,
  UserCheck,
  CheckCircle2,
  Clock,
  UserCog,
} from 'lucide-react';

const DEPARTMENT_COLORS = {
  PRODUCTION: 'bg-amber-50 text-amber-700 border-amber-200',
  QUALITY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200',
  STORES: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISPATCH: 'bg-purple-50 text-purple-700 border-purple-200',
  MANAGEMENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACCOUNTS: 'bg-rose-50 text-rose-700 border-rose-200',
};

import { useRouter } from 'next/navigation';

export default function OperatorProfilesPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  // Guard: Only SUPER_ADMIN can view or manage users & operators
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      toast.error('Access Restricted', {
        description: 'User management is restricted to Super Admin only.',
      });
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  // State
  const [operators, setOperators] = useState([]);
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
  const [resetAdmin, setResetAdmin] = useState(null);
  const [deleteAdmin, setDeleteAdmin] = useState(null);
  const [toggleAdmin, setToggleAdmin] = useState(null);
  const [changeMyPasswordOpen, setChangeMyPasswordOpen] = useState(false);
  const [editMyProfileOpen, setEditMyProfileOpen] = useState(false);

  // Fetch operator profiles
  const fetchOperators = useCallback(
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
        if (deptFilter !== 'ALL') {
          params.append('department', deptFilter);
        }

        const res = await apiClient(`/admins?${params.toString()}`);
        if (res.data) {
          // If viewing operators, prioritize production, quality, maintenance & stores
          setOperators(res.data);
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
        toast.error('Failed to load operators', {
          description: err.message || 'Error communicating with backend.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter, deptFilter]
  );

  useEffect(() => {
    fetchOperators(1);
  }, [search, statusFilter, deptFilter]);

  const activeCount = operators.filter((o) => o.isActive).length;
  const productionCount = operators.filter((o) => o.department === 'PRODUCTION').length;
  const qualityCount = operators.filter((o) => o.department === 'QUALITY').length;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Plant &amp; Operator Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Production line supervisors, machine operators, quality inspectors, and shift staff
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick self-control buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMyProfileOpen(true)}
            className="h-9 px-3 text-xs border-slate-200 text-slate-700 gap-1.5 cursor-pointer"
          >
            <UserCog className="w-3.5 h-3.5 text-slate-500" />
            My Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setChangeMyPasswordOpen(true)}
            className="h-9 px-3 text-xs border-slate-200 text-slate-700 gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            Change Password
          </Button>

          {isSuperAdmin && (
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Operator / Staff
            </Button>
          )}
        </div>
      </div>

      {/* Production & Shift Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/90 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Plant Staff
              </p>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {isLoading ? '...' : operators.length}
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Assigned across operations</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
              <Cpu className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active On Duty
              </p>
              <span className="text-2xl font-bold tracking-tight text-emerald-700">
                {isLoading ? '...' : activeCount}
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Shift authorization valid</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Production Floor
              </p>
              <span className="text-2xl font-bold tracking-tight text-amber-700">
                {isLoading ? '...' : productionCount}
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Extrusion &amp; cable line</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Quality Assurance
              </p>
              <span className="text-2xl font-bold tracking-tight text-cyan-700">
                {isLoading ? '...' : qualityCount}
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Inspection &amp; sign-off</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-50 text-cyan-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory Table */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Operator &amp; Staff Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Line personnel linked to batch manufacturing outputs and work orders
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search code, name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-200"
                />
              </div>

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
                    Suspended
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 text-xs w-36 bg-white border-slate-200">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Depts
                  </SelectItem>
                  <SelectItem value="PRODUCTION" className="text-xs">
                    PRODUCTION
                  </SelectItem>
                  <SelectItem value="QUALITY" className="text-xs">
                    QUALITY
                  </SelectItem>
                  <SelectItem value="MAINTENANCE" className="text-xs">
                    MAINTENANCE
                  </SelectItem>
                  <SelectItem value="STORES" className="text-xs">
                    STORES
                  </SelectItem>
                  <SelectItem value="DISPATCH" className="text-xs">
                    DISPATCH
                  </SelectItem>
                  <SelectItem value="MANAGEMENT" className="text-xs">
                    MANAGEMENT
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
                onClick={() => fetchOperators(pagination.page)}
                disabled={isLoading}
                className="h-8 px-2.5 text-xs border-slate-200"
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
                  <TableHead className="w-28 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Operator ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Name &amp; Work Area
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Department
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contact &amp; Credentials
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Last Session
                  </TableHead>
                  <TableHead className="w-20 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-14">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : operators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <ShieldAlert className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600">No operator profiles found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  operators.map((op) => {
                    const isSelf = op.id === currentUser?.id;
                    const isSuperAdminUser = op.role === 'SUPER_ADMIN';
                    const deptClass =
                      DEPARTMENT_COLORS[op.department] ||
                      'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <TableRow
                        key={op.id}
                        className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors"
                      >
                        {/* Operator code */}
                        <TableCell className="font-mono text-xs font-semibold text-slate-900 py-3.5">
                          {op.employeeCode}
                        </TableCell>

                        {/* Name & Avatar */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 rounded-md border border-slate-200 bg-slate-800 text-white flex items-center justify-center text-[10px] font-semibold">
                              <AvatarFallback className="bg-slate-800 text-white rounded-md">
                                {op.firstName[0]}
                                {op.lastName ? op.lastName[0] : ''}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                {op.firstName} {op.lastName}
                                {isSelf && (
                                  <span className="text-[10px] text-indigo-600 bg-indigo-50 font-normal px-1 rounded border border-indigo-200">
                                    You
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Role: {op.role}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="py-3.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold border ${deptClass}`}
                          >
                            {op.department || 'MANAGEMENT'}
                          </Badge>
                        </TableCell>

                        {/* Email & Phone */}
                        <TableCell className="py-3.5">
                          <div className="flex flex-col text-xs text-slate-600 space-y-0.5">
                            <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              {op.email}
                            </span>
                            {op.phone && (
                              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                {op.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5">
                          {op.isActive ? (
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

                        {/* Last Seen */}
                        <TableCell className="py-3.5 text-[11px] text-slate-500">
                          {op.lastLoginAt
                            ? new Date(op.lastLoginAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'No logins recorded'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 text-right">
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
                                Operator Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Super Admin can edit anyone; Admin can edit self */}
                              {(isSuperAdmin || isSelf) && (
                                <DropdownMenuItem
                                  onClick={() => setEditAdmin(op)}
                                  className="text-xs cursor-pointer text-slate-700"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                  Edit Operator Profile
                                </DropdownMenuItem>
                              )}

                              {/* Super Admin can reset anyone's password */}
                              {isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => setResetAdmin(op)}
                                  className="text-xs cursor-pointer text-slate-700"
                                >
                                  <KeyRound className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                  Force Password Reset
                                </DropdownMenuItem>
                              )}

                              {/* Deactivate/Reactivate if Super Admin */}
                              {isSuperAdmin && !isSuperAdminUser && !isSelf && (
                                <DropdownMenuItem
                                  onClick={() => setToggleAdmin(op)}
                                  className="text-xs cursor-pointer text-slate-700"
                                >
                                  <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                  {op.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                </DropdownMenuItem>
                              )}

                              {isSuperAdmin && !isSuperAdminUser && !isSelf && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteAdmin(op)}
                                    className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete Operator
                                  </DropdownMenuItem>
                                </>
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
                onClick={() => fetchOperators(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOperators(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => fetchOperators(1)}
      />

      <EditAdminDialog
        admin={editAdmin}
        open={!!editAdmin}
        onOpenChange={(open) => !open && setEditAdmin(null)}
        onSuccess={() => fetchOperators(pagination.page)}
      />

      <ResetPasswordDialog
        admin={resetAdmin}
        open={!!resetAdmin}
        onOpenChange={(open) => !open && setResetAdmin(null)}
        onSuccess={() => fetchOperators(pagination.page)}
      />

      <ToggleStatusDialog
        admin={toggleAdmin}
        open={!!toggleAdmin}
        onOpenChange={(open) => !open && setToggleAdmin(null)}
        onSuccess={() => fetchOperators(pagination.page)}
      />

      <DeleteAdminDialog
        admin={deleteAdmin}
        open={!!deleteAdmin}
        onOpenChange={(open) => !open && setDeleteAdmin(null)}
        onSuccess={() => fetchOperators(pagination.page)}
      />

      <ChangePasswordDialog
        open={changeMyPasswordOpen}
        onOpenChange={setChangeMyPasswordOpen}
      />

      <EditProfileDialog
        open={editMyProfileOpen}
        onOpenChange={setEditMyProfileOpen}
      />
    </div>
  );
}
