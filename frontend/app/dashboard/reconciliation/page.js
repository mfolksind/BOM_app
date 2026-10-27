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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Scale,
  RefreshCw,
  Search,
  Filter,
  Building2,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle2,
  Boxes,
} from 'lucide-react';

export default function MaterialReconciliationPage() {
  const { user } = useAuth();
  const [reconciliationData, setReconciliationData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [cRes, mRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/materials?limit=100'),
      ]);
      const custList = Array.isArray(cRes?.data) ? cRes.data : (cRes?.data?.items || []);
      const matList = Array.isArray(mRes?.data) ? mRes.data : (mRes?.data?.items || []);
      setCustomers(custList);
      setMaterials(matList);
    } catch (err) {
      console.error('Failed to load reconciliation metadata', err);
    }
  }, []);

  const fetchReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (selectedCustomer && selectedCustomer !== 'ALL') {
        queryParams.append('customerId', selectedCustomer);
      }
      if (selectedMaterial && selectedMaterial !== 'ALL') {
        queryParams.append('materialId', selectedMaterial);
      }

      const res = await api.get(`/reports/customer-material-reconciliation?${queryParams.toString()}`);
      if (res?.data) {
        setReconciliationData(res.data.items || res.data.reconciliations || []);
        const pagination = res.data.pagination || {};
        setTotalPages(pagination.totalPages || res.data.totalPages || 1);
        setTotalCount(pagination.total || res.data.total || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch reconciliation statement');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCustomer, selectedMaterial]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Job-Work Material Reconciliation</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Audit customer raw materials: Received in delivery challans vs Consumed in cable production vs Scrap vs Warehouse Balance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReconciliation}
            className="h-10 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select value={selectedCustomer} onValueChange={(val) => { setSelectedCustomer(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-60 h-10 text-sm">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMaterial} onValueChange={(val) => { setSelectedMaterial(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-56 h-10 text-sm">
              <SelectValue placeholder="All Raw Materials" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Raw Materials</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.name} ({m.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reconciliation Statement Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="font-semibold text-xs text-slate-600">Client Customer</TableHead>
              <TableHead className="font-semibold text-xs text-slate-600">Raw Material</TableHead>
              <TableHead className="text-right font-semibold text-xs text-slate-600">Total Received</TableHead>
              <TableHead className="text-right font-semibold text-xs text-slate-600">Net Consumed</TableHead>
              <TableHead className="text-right font-semibold text-xs text-slate-600">Process Scrap</TableHead>
              <TableHead className="text-right font-semibold text-xs text-slate-600">Current Balance</TableHead>
              <TableHead className="text-center font-semibold text-xs text-slate-600">Audit Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                    <span>Calculating material reconciliation statements...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : reconciliationData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Scale className="w-7 h-7 text-slate-400" />
                    <p className="font-medium text-slate-700">No reconciliation records found</p>
                    <p className="text-xs text-slate-400">
                      Material statements automatically populate when inbound customer challans are consumed into cable batches.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reconciliationData.map((row, idx) => {
                const received = row.totalReceivedQuantity || row.receivedQty || 0;
                const consumed = row.totalConsumedQuantity || row.consumedQty || 0;
                const scrap = row.totalScrapQuantity || row.scrapQty || 0;
                const balance = row.currentBalanceQuantity || row.balanceQty || (received - consumed - scrap);
                const isBalanced = Math.abs(received - (consumed + scrap + balance)) < 0.01;

                return (
                  <TableRow key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-slate-900 text-sm">
                        {row.customerName || row.customerId?.name || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {row.customerCode || row.customerId?.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 text-sm">
                        {row.materialName || row.materialId?.name || 'Material Item'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {row.materialCode || row.materialId?.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 text-sm">
                      {received.toLocaleString()} <span className="text-xs font-normal text-slate-500">{row.unit || 'KG'}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-700 text-sm">
                      {consumed.toLocaleString()} <span className="text-xs font-normal text-slate-500">{row.unit || 'KG'}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-700 text-sm">
                      {scrap.toLocaleString()} <span className="text-xs font-normal text-slate-500">{row.unit || 'KG'}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 text-sm">
                      {balance.toLocaleString()} <span className="text-xs font-normal text-slate-500">{row.unit || 'KG'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {isBalanced ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          Reconciled (100%)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-xs">
                          Under Review
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{reconciliationData.length}</span> records
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
    </div>
  );
}
