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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Truck,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  Warehouse as WarehouseIcon,
  Calendar,
  FileText,
} from 'lucide-react';

export function EditInboundChallanDialog({
  challanId,
  open,
  onOpenChange,
  onSuccess,
  initialMode = 'view',
  customers = [],
  warehouses = [],
  materials = [],
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challan, setChallan] = useState(null);
  const [localMaterials, setLocalMaterials] = useState(materials);

  const [formData, setFormData] = useState({
    customerChallanNumber: '',
    customerChallanDate: '',
    vehicleNumber: '',
    transporterName: '',
    lrNumber: '',
    remarks: '',
    lines: [],
  });

  useEffect(() => {
    if (materials && materials.length > 0) {
      setLocalMaterials(materials);
    }
  }, [materials]);

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
      if (!materials || materials.length === 0) {
        api.get('/materials?limit=100').then((res) => {
          const list = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
          if (list.length > 0) setLocalMaterials(list);
        }).catch((e) => console.error(e));
      }
    }
  }, [open, initialMode, materials]);

  useEffect(() => {
    if (challanId && open) {
      setLoadingDetails(true);
      api.get(`/inbound-challans/${challanId}`)
        .then((res) => {
          if (res?.data) {
            const data = res.data;
            setChallan(data);
            setFormData({
              customerChallanNumber: data.customerChallanNumber || '',
              customerChallanDate: data.customerChallanDate
                ? new Date(data.customerChallanDate).toISOString().split('T')[0]
                : '',
              vehicleNumber: data.vehicleNumber || '',
              transporterName: data.transporterName || '',
              lrNumber: data.lrNumber || '',
              remarks: data.remarks || '',
              lines: (data.lines || []).map((l) => ({
                materialId: l.materialId?._id || l.materialId,
                declaredQuantity: l.declaredQuantity || '',
                receivedQuantity: l.receivedQuantity !== undefined ? l.receivedQuantity : l.declaredQuantity,
                unit: l.unit || 'KG',
                supplierLotNumber: l.supplierLotNumber || '',
                remarks: l.remarks || '',
              })),
            });
          }
        })
        .catch((err) => {
          toast.error('Failed to load challan details', { description: err.message });
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [challanId, open]);

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          materialId: '',
          declaredQuantity: '',
          receivedQuantity: '',
          unit: 'KG',
          supplierLotNumber: '',
          remarks: '',
        },
      ],
    }));
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length === 1) {
      toast.error('Challan must contain at least one line item');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const handleLineChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.lines];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'materialId') {
        const mat = materials.find((m) => m._id === value);
        if (mat?.baseUnit) {
          updated[index].unit = mat.baseUnit;
        }
      }
      return { ...prev, lines: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerChallanNumber.trim()) {
      toast.error('Customer Challan Number is required');
      return;
    }

    if (!formData.lines || formData.lines.length === 0) {
      toast.error('At least one raw material line is required');
      return;
    }

    for (let i = 0; i < formData.lines.length; i++) {
      const line = formData.lines[i];
      if (!line.materialId) {
        toast.error(`Please select a material on line #${i + 1}`);
        return;
      }
      const decQty = parseFloat(line.declaredQuantity);
      if (isNaN(decQty) || decQty <= 0) {
        toast.error(`Declared quantity on line #${i + 1} must be greater than 0`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerChallanNumber: formData.customerChallanNumber.trim(),
        customerChallanDate: formData.customerChallanDate ? new Date(formData.customerChallanDate) : undefined,
        vehicleNumber: formData.vehicleNumber.trim() || undefined,
        transporterName: formData.transporterName.trim() || undefined,
        lrNumber: formData.lrNumber.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
        lines: formData.lines.map((l) => ({
          materialId: l.materialId,
          declaredQuantity: parseFloat(l.declaredQuantity),
          receivedQuantity: l.receivedQuantity !== '' && l.receivedQuantity !== undefined
            ? parseFloat(l.receivedQuantity)
            : parseFloat(l.declaredQuantity),
          unit: l.unit || 'KG',
          supplierLotNumber: l.supplierLotNumber?.trim() || undefined,
          remarks: l.remarks?.trim() || undefined,
        })),
      };

      const res = await api.patch(`/inbound-challans/${challanId}`, payload);
      if (res?.success) {
        toast.success('Inbound challan updated successfully');
        setIsEditing(false);
        if (onSuccess) onSuccess();
        // Refresh details
        const refreshed = await api.get(`/inbound-challans/${challanId}`);
        if (refreshed?.data) setChallan(refreshed.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update inbound challan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this challan? This will generate unique Material Lots and increase warehouse inventory.')) return;
    try {
      const res = await api.post(`/inbound-challans/${challanId}/post`, {});
      if (res?.success) {
        toast.success('Challan posted! Material lots created and stock balances updated.');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to post challan to inventory');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this delivery challan?')) return;
    try {
      const res = await api.post(`/inbound-challans/${challanId}/cancel`, {});
      if (res?.success) {
        toast.success('Inbound challan cancelled');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel challan');
    }
  };

  const isDraft = challan?.status === 'DRAFT';

  const materialOptions = (localMaterials || []).map((m) => ({
    value: m._id,
    label: m.name,
    code: m.code,
    subLabel: `${m.category || 'RAW_MATERIAL'} • ${m.baseUnit || 'KG'}`,
  }));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'POSTED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Posted to Stock</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Draft (Pending Post)</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-rose-700 bg-rose-50 border-rose-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl font-bold text-slate-900">
                      {isEditing ? `Edit ${challan?.challanNumber || 'Challan'}` : (challan?.challanNumber || 'Delivery Challan')}
                    </SheetTitle>
                    {getStatusBadge(challan?.status)}
                  </div>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Customer DC Ref: <span className="font-semibold text-slate-800">{challan?.customerChallanNumber}</span> • Consignor: <span className="font-semibold text-slate-800">{challan?.customerId?.name || 'In-House'}</span>
                  </SheetDescription>
                </div>
              </div>

              {/* View / Edit Mode Toggle Button */}
              {!isEditing && isDraft && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Challan
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Content Body */}
        {loadingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Loading challan details...</p>
          </div>
        ) : isEditing ? (
          /* ================= EDIT MODE ================= */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Header Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Customer DC / Ref # <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={formData.customerChallanNumber}
                      onChange={(e) => setFormData({ ...formData, customerChallanNumber: e.target.value })}
                      placeholder="e.g. DC-2026-904"
                      className="h-9 text-sm font-semibold border-slate-200"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Challan Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.customerChallanDate}
                      onChange={(e) => setFormData({ ...formData, customerChallanDate: e.target.value })}
                      className="h-9 text-sm border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Vehicle #</Label>
                    <Input
                      placeholder="e.g. MH-12-AB-1234"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      className="h-9 text-sm uppercase border-slate-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Transporter</Label>
                    <Input
                      placeholder="Transporter Name"
                      value={formData.transporterName}
                      onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">LR / Bilty #</Label>
                    <Input
                      placeholder="LR-00982"
                      value={formData.lrNumber}
                      onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                      className="h-9 text-sm uppercase border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Remarks / Notes</Label>
                  <Textarea
                    placeholder="Gate inspection notes, seal numbers..."
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="text-sm resize-none border-slate-200"
                  />
                </div>
              </div>

              {/* Line Items Edit */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Line Items ({formData.lines.length})</h4>
                    <p className="text-xs text-slate-500">Incoming raw materials and received weights</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLine}
                    className="h-8 gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Material Line
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.lines.map((line, index) => {
                    const selectedMat = materials.find((m) => m._id === line.materialId);
                    return (
                      <div
                        key={index}
                        className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white text-slate-700 text-xs font-semibold flex items-center justify-center border border-slate-200">
                              {index + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {selectedMat ? `${selectedMat.name} (${selectedMat.code})` : `Item #${index + 1}`}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            onClick={() => handleRemoveLine(index)}
                            disabled={formData.lines.length === 1}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Raw Material <span className="text-rose-500">*</span>
                            </Label>
                            <SearchableSelect
                              options={materialOptions}
                              value={line.materialId}
                              onChange={(val) => handleLineChange(index, 'materialId', val)}
                              placeholder="Search and choose material..."
                              searchPlaceholder="Search material by name or code..."
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate block">
                                Declared Qty ({line.unit}) *
                              </Label>
                              <Input
                                type="number"
                                step="any"
                                min="0.001"
                                placeholder="0"
                                value={line.declaredQuantity}
                                onChange={(e) => handleLineChange(index, 'declaredQuantity', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate block">
                                Received Qty ({line.unit})
                              </Label>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder={line.declaredQuantity || 'Same as declared'}
                                value={line.receivedQuantity}
                                onChange={(e) => handleLineChange(index, 'receivedQuantity', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate block">
                                Supplier Lot #
                              </Label>
                              <Input
                                placeholder="Lot / Coil #"
                                value={line.supplierLotNumber}
                                onChange={(e) => handleLineChange(index, 'supplierLotNumber', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer shadow-xs"
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
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Customer</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{challan?.customerId?.name || 'In-House'}</p>
                  {challan?.customerId?.code && (
                    <p className="text-[11px] text-slate-400 font-mono">{challan.customerId.code}</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Warehouse</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{challan?.warehouseId?.name || 'Main Warehouse'}</p>
                  {challan?.warehouseId?.code && (
                    <p className="text-[11px] text-slate-400 font-mono">{challan.warehouseId.code}</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Challan Date</p>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {challan?.customerChallanDate ? new Date(challan.customerChallanDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Vehicle #</p>
                  <p className="font-medium text-slate-800 mt-0.5 font-mono">
                    {challan?.vehicleNumber || 'None'}
                  </p>
                </div>
              </div>

              {/* Transport Details if available */}
              {(challan?.transporterName || challan?.lrNumber) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold">Transporter:</span>{' '}
                    <span className="text-slate-800 font-medium">{challan.transporterName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">LR / Bilty #:</span>{' '}
                    <span className="text-slate-800 font-mono font-medium">{challan.lrNumber || '—'}</span>
                  </div>
                </div>
              )}

              {challan?.remarks && (
                <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs text-blue-900">
                  <span className="font-bold">Remarks: </span> {challan.remarks}
                </div>
              )}

              {/* Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Received Material Items ({challan?.lines?.length || 0})
                  </h4>
                  {isDraft && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Material lots not generated yet
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="w-10 text-center text-xs font-semibold text-slate-700">#</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Material Name & Code</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Declared</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Received</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Lot / Coil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(challan?.lines || []).map((line, idx) => (
                        <TableRow key={line._id || idx} className="hover:bg-slate-50/60">
                          <TableCell className="text-center font-bold text-slate-400 text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-900 text-xs">
                              {line.materialId?.name || 'Raw Material'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {line.materialId?.code}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-600 font-medium">
                            {line.declaredQuantity} {line.unit}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 text-xs">
                            {line.receivedQuantity} {line.unit}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">
                            {line.supplierLotNumber || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* View Drawer Footer with Post / Cancel Actions */}
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
                      Cancel Challan
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePost}
                      className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Post & Generate Lots
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
