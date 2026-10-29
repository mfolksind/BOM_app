'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Scale,
  Layers,
  FileSpreadsheet,
  History,
} from 'lucide-react';

const SCRAP_TYPES = [
  { value: 'PROCESS_WASTE', label: 'Process Waste (Extrusion / Stranding)' },
  { value: 'STARTUP_LOSS', label: 'Startup Loss / Purge' },
  { value: 'DEFECTIVE_CORE', label: 'Defective Core / Insulation Patch' },
  { value: 'SETUP_SCRAP', label: 'Machine Setup & Die Tuning' },
  { value: 'END_PIECE', label: 'End Piece / Trim Waste' },
];

const SCRAP_CATEGORIES = [
  { value: 'SALEABLE', label: 'Saleable Scrap' },
  { value: 'RECYCLABLE', label: 'In-House Recyclable' },
  { value: 'NON_SALEABLE', label: 'Non-Saleable / Landfill' },
];

export function RecordWorkOrderScrapDialog({
  workOrderId,
  open,
  onOpenChange,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scrapData, setScrapData] = useState(null);

  // Form State
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [scrapQuantity, setScrapQuantity] = useState('');
  const [scrapType, setScrapType] = useState('PROCESS_WASTE');
  const [scrapCategory, setScrapCategory] = useState('SALEABLE');
  const [reason, setReason] = useState('');

  const loadScrapData = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const res = await api.get(`/work-orders/${workOrderId}/scrap`);
      if (res?.data) {
        setScrapData(res.data);
        if (res.data.materialBreakdown?.length > 0 && !selectedMaterialId) {
          setSelectedMaterialId(res.data.materialBreakdown[0].materialId);
        }
      }
    } catch (err) {
      console.error('Failed to load scrap details', err);
      toast.error('Could not load scrap tracking data');
    } finally {
      setLoading(false);
    }
  }, [workOrderId, selectedMaterialId]);

  useEffect(() => {
    if (open && workOrderId) {
      loadScrapData();
    }
  }, [open, workOrderId, loadScrapData]);

  const selectedMaterial = scrapData?.materialBreakdown?.find(
    (m) => m.materialId === selectedMaterialId,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      toast.error('Please select a material');
      return;
    }
    const qty = parseFloat(scrapQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Scrap quantity must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        materialId: selectedMaterialId,
        scrapQuantity: qty,
        scrapType,
        scrapCategory,
        unit: selectedMaterial?.unit || 'KG',
        reason: reason.trim() || undefined,
      };

      const res = await api.post(`/work-orders/${workOrderId}/scrap`, payload);
      if (res?.success || res?.data) {
        toast.success(
          `Recorded ${qty} ${selectedMaterial?.unit || 'KG'} scrap! Credited to customer scrap inventory.`,
        );
        setScrapQuantity('');
        setReason('');
        await loadScrapData();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Failed to record scrap', err);
      toast.error(err.message || 'Failed to record scrap');
    } finally {
      setSubmitting(false);
    }
  };

  const wo = scrapData?.workOrder;
  const summary = scrapData?.summary || {
    totalPlannedScrapKg: 0,
    totalActualScrapKg: 0,
    totalScrapRecords: 0,
  };
  const breakdown = scrapData?.materialBreakdown || [];
  const records = scrapData?.scrapRecords || [];

  const varianceKg = Number((summary.totalActualScrapKg - summary.totalPlannedScrapKg).toFixed(2));
  const isOverTolerance = summary.totalPlannedScrapKg > 0 && varianceKg > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Scrap & Process Loss Tracking
                {wo?.workOrderNumber && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {wo.workOrderNumber}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Customer: <strong className="text-slate-800">{wo?.customer?.name || 'Party'}</strong> • Product:{' '}
                <strong className="text-slate-800">{wo?.product?.name || 'Cable'}</strong> (
                {wo?.orderedLengthMeters?.toLocaleString()} m)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading && !scrapData ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-slate-900" />
            <p className="text-xs font-medium">Loading BOM scrap norms & history...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Planned Scrap Allowance
                </span>
                <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                  {summary.totalPlannedScrapKg} kg
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Calculated from BOM norms ({wo?.orderedLengthMeters?.toLocaleString()} m)
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Actual Recorded Scrap
                </span>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    isOverTolerance ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {summary.totalActualScrapKg} kg
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Across {summary.totalScrapRecords} recorded entries
                </span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  isOverTolerance
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-75">
                  Scrap Tolerance Status
                </span>
                <div className="text-lg font-bold mt-1 flex items-center gap-1.5">
                  {isOverTolerance ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      +{varianceKg} kg Over Norm
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Within Norm ({Math.abs(varianceKg)} kg left)
                    </>
                  )}
                </div>
                <span className="text-[10px] opacity-75 block mt-0.5">
                  Customer Party-Wise Accounting
                </span>
              </div>
            </div>

            {/* Record Scrap Form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Record Material Scrap Entry
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Material *</Label>
                  <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200 font-medium">
                      <SelectValue placeholder="Select Material" />
                    </SelectTrigger>
                    <SelectContent>
                      {breakdown.map((m) => (
                        <SelectItem key={m.materialId} value={m.materialId} className="text-xs">
                          {m.materialName} ({m.materialCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Scrap Qty ({selectedMaterial?.unit || 'KG'}) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={scrapQuantity}
                    onChange={(e) => setScrapQuantity(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="h-8 text-xs font-mono font-semibold bg-white border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Scrap Stage / Type</Label>
                  <Select value={scrapType} onValueChange={setScrapType}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCRAP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Category</Label>
                  <Select value={scrapCategory} onValueChange={setScrapCategory}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCRAP_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Specific remarks / batch / reason for process waste..."
                    className="h-8 text-xs bg-white border-slate-200"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Record & Credit Scrap
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Material Norm Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                BOM Norms vs Actual Scrap Comparison
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">
                        Planned Norm
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">
                        Scrap Allowance
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">
                        Actual Scrapped
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">
                        Variance
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-700">
                        Tolerance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-slate-400 py-4">
                          No BOM engineering items found for this work order.
                        </TableCell>
                      </TableRow>
                    ) : (
                      breakdown.map((m, idx) => {
                        const isOver = m.actualScrapQuantity > m.plannedScrapAllowance;
                        return (
                          <TableRow key={idx} className="hover:bg-slate-50/60">
                            <TableCell>
                              <div className="font-semibold text-slate-900 text-xs">
                                {m.materialName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {m.materialCode}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-700 font-medium">
                              {m.standardQuantity?.toFixed(2)} {m.unit}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-700 font-medium">
                              {m.plannedScrapAllowance?.toFixed(2)} {m.unit}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-bold text-slate-900">
                              {m.actualScrapQuantity?.toFixed(2)} {m.unit}
                            </TableCell>
                            <TableCell
                              className={`text-right text-xs font-mono font-semibold ${
                                isOver ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {m.scrapVariance > 0 ? `+${m.scrapVariance}` : m.scrapVariance} {m.unit}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  m.withinTolerance
                                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                    : 'border-rose-200 text-rose-700 bg-rose-50'
                                }`}
                              >
                                {m.withinTolerance ? 'Within Norm' : 'Norm Exceeded'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Historical Scrap Log Table */}
            {records.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  Historical Scrap Transactions ({records.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-700">Scrap #</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Quantity</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Type / Stage</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Warehouse</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r._id} className="hover:bg-slate-50/60">
                          <TableCell className="font-mono text-xs font-semibold text-slate-800">
                            {r.scrapNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-800">
                            {r.materialId?.name || 'Material'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                            {r.scrapQuantity} {r.unit}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            <span className="capitalize">{r.scrapType?.replace(/_/g, ' ').toLowerCase()}</span>
                            {r.scrapCategory && (
                              <span className="block text-[10px] text-slate-400">{r.scrapCategory}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {r.scrapWarehouseId?.name || 'Scrap Yard'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 font-mono">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
