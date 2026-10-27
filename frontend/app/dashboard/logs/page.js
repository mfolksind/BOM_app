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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  History,
  Search,
  FilterX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  Calendar,
  User,
  Activity,
  Layers,
} from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  APPROVE: 'bg-purple-50 text-purple-700 border-purple-200',
  REJECT: 'bg-amber-50 text-amber-700 border-amber-200',
  POST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CANCEL: 'bg-slate-100 text-slate-700 border-slate-200',
};

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      toast.error('Access Restricted', {
        description: 'Activity and audit logs are restricted to Super Admin only.',
      });
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(
    async (page = pagination.page) => {
      if (currentUser?.role !== 'SUPER_ADMIN') return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', pagination.limit.toString());

        if (actionFilter !== 'ALL') {
          params.append('action', actionFilter);
        }
        if (entityFilter !== 'ALL') {
          params.append('entityType', entityFilter);
        }

        const res = await apiClient(`/admins/audit-logs?${params.toString()}`);
        if (res.data) {
          setLogs(res.data);
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
        toast.error('Could not load activity logs', {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, actionFilter, entityFilter]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Activity &amp; Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track actions taken by administrators across users, inventory, production, and accounts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(pagination.page)}
          disabled={isLoading}
          className="h-10 text-sm border-slate-200 text-slate-700 gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Logged Events
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Total {pagination.total} audit trail records recorded
              </CardDescription>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-sm w-36 bg-white border-slate-200">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">
                    All Actions
                  </SelectItem>
                  <SelectItem value="CREATE" className="text-sm">
                    CREATE
                  </SelectItem>
                  <SelectItem value="UPDATE" className="text-sm">
                    UPDATE
                  </SelectItem>
                  <SelectItem value="DELETE" className="text-sm">
                    DELETE
                  </SelectItem>
                  <SelectItem value="APPROVE" className="text-sm">
                    APPROVE
                  </SelectItem>
                  <SelectItem value="POST" className="text-sm">
                    POST
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Entity Filter */}
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 text-sm w-40 bg-white border-slate-200">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm">
                    All Modules
                  </SelectItem>
                  <SelectItem value="User" className="text-sm">
                    User / Admin
                  </SelectItem>
                  <SelectItem value="Material" className="text-sm">
                    Material
                  </SelectItem>
                  <SelectItem value="Warehouse" className="text-sm">
                    Warehouse
                  </SelectItem>
                  <SelectItem value="WorkOrder" className="text-sm">
                    Work Order
                  </SelectItem>
                  <SelectItem value="ProductionBatch" className="text-sm">
                    Production Batch
                  </SelectItem>
                  <SelectItem value="PackingList" className="text-sm">
                    Packing List
                  </SelectItem>
                  <SelectItem value="Dispatch" className="text-sm">
                    Dispatch
                  </SelectItem>
                </SelectContent>
              </Select>

              {(actionFilter !== 'ALL' || entityFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActionFilter('ALL');
                    setEntityFilter('ALL');
                  }}
                  className="h-9 px-3 text-sm text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <FilterX className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-44 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Timestamp
                  </TableHead>
                  <TableHead className="w-28 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Action
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Module / Entity
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Performed By
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Details / Changes
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Inspect
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
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <History className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No activity logs recorded yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const actionClass =
                      ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const performer = log.performedBy;
                    const dateFormatted = new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    // Summary preview of changes
                    let preview = '';
                    if (log.newValues) {
                      preview = Object.entries(log.newValues)
                        .filter(([k]) => !['passwordHash', 'refreshTokenHash'].includes(k))
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                        .join(', ');
                    } else if (log.metadata) {
                      preview = JSON.stringify(log.metadata);
                    }

                    return (
                      <TableRow
                        key={log._id}
                        className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors"
                      >
                        {/* Timestamp */}
                        <TableCell className="text-xs text-slate-600 font-mono py-4">
                          {dateFormatted}
                        </TableCell>

                        {/* Action badge */}
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold px-2 py-0.5 border ${actionClass}`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>

                        {/* Entity */}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">
                              {log.entityType}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              ID: {log.entityId}
                            </span>
                          </div>
                        </TableCell>

                        {/* Performer */}
                        <TableCell className="py-4">
                          {performer ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">
                                {performer.firstName} {performer.lastName}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                {performer.role} ({performer.employeeCode})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">System / Setup</span>
                          )}
                        </TableCell>

                        {/* Details */}
                        <TableCell className="py-4 max-w-xs truncate text-xs text-slate-600">
                          {preview || 'Operation completed'}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
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
              ({pagination.total} total logs)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="h-9 px-3 border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.page + 1)}
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

      {/* Log Detail Inspector Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Audit Log Details
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-mono">
                  {selectedLog?._id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="py-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Action</span>
                  <Badge variant="outline" className={`mt-1 font-semibold ${ACTION_COLORS[selectedLog.action]}`}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Entity Type</span>
                  <span className="font-semibold text-slate-900 mt-1 block">
                    {selectedLog.entityType}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Recorded Date &amp; Time</span>
                  <span className="text-xs font-mono text-slate-700 mt-1 block">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Operator / Admin</span>
                  <span className="text-xs font-medium text-slate-900 mt-1 block">
                    {selectedLog.performedBy
                      ? `${selectedLog.performedBy.firstName} ${selectedLog.performedBy.lastName} (${selectedLog.performedBy.employeeCode})`
                      : 'System Internal'}
                  </span>
                </div>
              </div>

              {selectedLog.oldValues && Object.keys(selectedLog.oldValues).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Previous Values (Before Change)
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && Object.keys(selectedLog.newValues).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Updated / Created Values
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Additional Context / Note
                  </span>
                  <pre className="p-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
