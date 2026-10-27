'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  FileSpreadsheet,
  Pencil,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  PauseCircle,
  PlayCircle,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

const PRIORITIES = [
  { label: 'Low', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

export function EditWorkOrderDialog({
  workOrderId,
  open,
  onOpenChange,
  onSuccess,
  initialMode = 'view',
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workOrder, setWorkOrder] = useState(null);
  const [availability, setAvailability] = useState(null);

  const [formData, setFormData] = useState({
    orderedLengthMeters: '',
    customerPoNumber: '',
    customerPoDate: '',
    jobWorkRatePerMeter: '',
    targetDeliveryDate: '',
    plannedStartDate: '',
    priority: 'NORMAL',
    notes: '',
    customerSpecifications: '',
  });

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
    }
  }, [open, initialMode]);

  const loadData = async (id) => {
    setLoadingDetails(true);
    try {
      const [woRes, availRes] = await Promise.allSettled([
        api.get(`/work-orders/${id}`),
        api.get(`/work-orders/${id}/material-availability`),
      ]);

      if (woRes.status === 'fulfilled' && woRes.value?.data) {
        const data = woRes.value.data;
        setWorkOrder(data);
        setFormData({
          orderedLengthMeters: data.orderedLengthMeters ? String(data.orderedLengthMeters) : '',
          customerPoNumber: data.customerPoNumber || '',
          customerPoDate: data.customerPoDate
            ? new Date(data.customerPoDate).toISOString().split('T')[0]
            : '',
          jobWorkRatePerMeter: data.jobWorkRatePerMeter !== undefined ? String(data.jobWorkRatePerMeter) : '',
          targetDeliveryDate: data.targetDeliveryDate
            ? new Date(data.targetDeliveryDate).toISOString().split('T')[0]
            : '',
          plannedStartDate: data.plannedStartDate
            ? new Date(data.plannedStartDate).toISOString().split('T')[0]
            : '',
          priority: data.priority || 'NORMAL',
          notes: data.notes || '',
          customerSpecifications: data.customerSpecifications || '',
        });
      }

      if (availRes.status === 'fulfilled' && availRes.value?.data) {
        setAvailability(availRes.value.data);
      } else {
        setAvailability(null);
      }
    } catch (err) {
      toast.error('Failed to load work order', { description: err.message });
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (workOrderId && open) {
      loadData(workOrderId);
    }
  }, [workOrderId, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const length = parseFloat(formData.orderedLengthMeters);
    if (isNaN(length) || length <= 0) {
      toast.error('Ordered length must be greater than 0 meters');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        orderedLengthMeters: length,
        customerPoNumber: formData.customerPoNumber.trim() || undefined,
        customerPoDate: formData.customerPoDate ? new Date(formData.customerPoDate).toISOString() : undefined,
        jobWorkRatePerMeter: formData.jobWorkRatePerMeter !== '' ? parseFloat(formData.jobWorkRatePerMeter) : undefined,
        targetDeliveryDate: formData.targetDeliveryDate ? new Date(formData.targetDeliveryDate).toISOString() : undefined,
        plannedStartDate: formData.plannedStartDate ? new Date(formData.plannedStartDate).toISOString() : undefined,
        priority: formData.priority,
        notes: formData.notes.trim() || undefined,
        customerSpecifications: formData.customerSpecifications.trim() || undefined,
      };

      const res = await api.patch(`/work-orders/${workOrderId}`, payload);
      if (res?.success) {
        toast.success('Work order updated successfully');
        setIsEditing(false);
        if (onSuccess) onSuccess();
        loadData(workOrderId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm('Confirm this Work Order? This permanently freezes the active BOM recipe into an immutable snapshot for production.')) return;
    try {
      const res = await api.post(`/work-orders/${workOrderId}/confirm`, {});
      if (res?.success) {
        toast.success('Work Order confirmed and BOM snapshot frozen');
        loadData(workOrderId);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to confirm work order');
    }
  };

  const handleHold = async () => {
    const reason = prompt('Please enter reason for putting on hold:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.post(`/work-orders/${workOrderId}/hold`, { reason: reason.trim() });
      if (res?.success) {
        toast.success('Work order placed on hold');
        loadData(workOrderId);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to hold work order');
    }
  };

  const handleResume = async () => {
    try {
      const res = await api.post(`/work-orders/${workOrderId}/resume`, {});
      if (res?.success) {
        toast.success('Work order resumed');
        loadData(workOrderId);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resume work order');
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.post(`/work-orders/${workOrderId}/cancel`, { reason: reason.trim() });
      if (res?.success) {
        toast.success('Work order cancelled');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel work order');
    }
  };

  const isDraft = workOrder?.status === 'DRAFT';
  const isConfirmed = workOrder?.status === 'CONFIRMED';
  const isOnHold = workOrder?.status === 'ON_HOLD';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Confirmed (BOM Frozen)</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Draft Order</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">In Production</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Completed</Badge>;
      case 'ON_HOLD':
        return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200">On Hold</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-slate-500 bg-slate-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const snapshotItems = workOrder?.bomSnapshot?.items || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:w-[48vw] lg:max-w-[840px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl font-bold text-slate-900">
                      {isEditing ? `Edit ${workOrder?.workOrderNumber || 'Order'}` : (workOrder?.workOrderNumber || 'Work Order')}
                    </SheetTitle>
                    {getStatusBadge(workOrder?.status)}
                  </div>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Client: <span className="font-semibold text-slate-800">{workOrder?.customerId?.name}</span> • Target: <span className="font-semibold text-slate-800">{workOrder?.orderedLengthMeters?.toLocaleString()} meters</span>
                  </SheetDescription>
                </div>
              </div>

              {!isEditing && isDraft && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Order
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Content Body */}
        {loadingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-slate-900" />
            <p className="text-sm font-medium">Loading work order details...</p>
          </div>
        ) : isEditing ? (
          /* ================= EDIT MODE ================= */
          <form id="editWorkOrderForm" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Ordered Length (Meters) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.orderedLengthMeters}
                      onChange={(e) => setFormData({ ...formData, orderedLengthMeters: e.target.value })}
                      placeholder="e.g. 5000"
                      className="h-9 text-sm font-semibold border-slate-200"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Priority Level
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(val) => setFormData({ ...formData, priority: val })}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value} className="text-sm">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Customer PO #
                    </Label>
                    <Input
                      value={formData.customerPoNumber}
                      onChange={(e) => setFormData({ ...formData, customerPoNumber: e.target.value })}
                      placeholder="e.g. PO-HAV-2026-09"
                      className="h-9 text-sm border-slate-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Customer PO Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.customerPoDate}
                      onChange={(e) => setFormData({ ...formData, customerPoDate: e.target.value })}
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Target Delivery Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.targetDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, targetDeliveryDate: e.target.value })}
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Job-Work Rate (₹ / Meter)
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.jobWorkRatePerMeter}
                      onChange={(e) => setFormData({ ...formData, jobWorkRatePerMeter: e.target.value })}
                      placeholder="e.g. 12.50"
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Customer Specific Technical Instructions
                  </Label>
                  <Textarea
                    placeholder="Specific reel size, sequential meter stamping text, packaging notes..."
                    rows={2}
                    value={formData.customerSpecifications}
                    onChange={(e) => setFormData({ ...formData, customerSpecifications: e.target.value })}
                    className="text-sm resize-none border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Internal Production Notes
                  </Label>
                  <Textarea
                    placeholder="Plant internal notes..."
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="text-sm resize-none border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Edit Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-9 text-xs border-slate-200 cursor-pointer"
              >
                Cancel Edit
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* ================= VIEW MODE ================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl text-sm">
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Cable Product</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{workOrder?.productId?.name || 'Cable'}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{workOrder?.productId?.code}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Target Length</p>
                  <p className="font-bold text-slate-900 mt-0.5">{workOrder?.orderedLengthMeters?.toLocaleString()} m</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Produced</p>
                  <p className="font-bold text-emerald-700 mt-0.5">{workOrder?.producedLengthMeters || 0} m</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Target Date</p>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {workOrder?.targetDeliveryDate ? new Date(workOrder.targetDeliveryDate).toLocaleDateString() : 'Immediate'}
                  </p>
                </div>
              </div>

              {/* Frozen BOM Snapshot Card */}
              {workOrder?.bomSnapshot ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5 text-slate-700" />
                    Frozen BOM Recipe: {workOrder.bomSnapshot.bomNumber} (v{workOrder.bomSnapshot.versionNumber}.0)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Active engineering norm frozen on{' '}
                    {workOrder.bomSnapshot.frozenAt ? new Date(workOrder.bomSnapshot.frozenAt).toLocaleString() : 'Confirmation'}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Order is in DRAFT state. Confirm order to freeze engineering norms for production.</span>
                </div>
              )}

              {/* Technical Specifications */}
              {workOrder?.customerSpecifications && (
                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold text-slate-700">Client Specification: </span>
                  <span className="text-slate-600">{workOrder.customerSpecifications}</span>
                </div>
              )}

              {/* Material Availability & Allocation Section */}
              {availability?.materials && availability.materials.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Material Availability Analysis
                    </h4>
                    <span className="text-xs text-slate-500">
                      Warehouse stock vs required norm
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow>
                          <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-700">Required</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-700">Available</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-700">Shortage</TableHead>
                          <TableHead className="text-center text-xs font-semibold text-slate-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availability.materials.map((m, idx) => {
                          const isShort = m.shortage > 0;
                          return (
                            <TableRow key={idx} className="hover:bg-slate-50/60">
                              <TableCell>
                                <div className="font-semibold text-slate-900 text-xs">{m.materialName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{m.materialCode}</div>
                              </TableCell>
                              <TableCell className="text-right text-xs text-slate-700 font-medium">
                                {m.requiredQuantity?.toFixed(2)} {m.unit}
                              </TableCell>
                              <TableCell className="text-right text-xs text-slate-700 font-medium">
                                {m.availableStock?.toFixed(2)} {m.unit}
                              </TableCell>
                              <TableCell className={`text-right text-xs font-bold ${isShort ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {isShort ? `-${m.shortage.toFixed(2)}` : '0.00'} {m.unit}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={isShort ? 'border-rose-200 text-rose-700 bg-rose-50 text-[10px]' : 'border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px]'}
                                >
                                  {isShort ? 'Shortage' : 'Available'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Frozen Norm Lines */}
              {snapshotItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Frozen Engineering Items ({snapshotItems.length})
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow>
                          <TableHead className="w-10 text-center text-xs font-semibold text-slate-700">#</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-700">Rate / Unit</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-700">Scrap %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {snapshotItems.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/60">
                            <TableCell className="text-center font-bold text-slate-400 text-xs">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-slate-900 text-xs">{item.materialName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{item.materialCode}</div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-700 font-medium">
                              {item.quantityPerUnit} {item.unit}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-500">
                              {item.scrapTolerancePercentage || 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* View Drawer Footer with Action Triggers */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs border-slate-200 cursor-pointer"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {isDraft && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="h-9 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Cancel Order
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirm}
                      className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Confirm & Freeze BOM
                    </Button>
                  </>
                )}

                {isConfirmed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHold}
                    className="h-9 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5 mr-1" />
                    Place On Hold
                  </Button>
                )}

                {isOnHold && (
                  <Button
                    size="sm"
                    onClick={handleResume}
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5 mr-1" />
                    Resume Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
