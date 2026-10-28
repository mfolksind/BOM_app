'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Truck, Send, Building2, Warehouse } from 'lucide-react';
import { api } from '@/lib/api';

export function CreateDispatchDialog({
  open,
  onOpenChange,
  customers = [],
  workOrders = [],
  warehouses = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localWorkOrders, setLocalWorkOrders] = useState(workOrders);
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);

  useEffect(() => {
    if (customers?.length > 0) setLocalCustomers(customers);
  }, [customers]);

  useEffect(() => {
    if (workOrders?.length > 0) setLocalWorkOrders(workOrders);
  }, [workOrders]);

  useEffect(() => {
    if (warehouses?.length > 0) setLocalWarehouses(warehouses);
  }, [warehouses]);

  const fetchMasters = async () => {
    try {
      const [cRes, woRes, whRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/work-orders?limit=100'),
        api.get('/warehouses?limit=100'),
      ]);
      const custList = Array.isArray(cRes?.data) ? cRes.data : (cRes?.data?.items || cRes?.data?.customers || []);
      const woList = woRes?.data?.workOrders || woRes?.data?.items || (Array.isArray(woRes?.data) ? woRes?.data : []);
      const whList = Array.isArray(whRes?.data) ? whRes.data : (whRes?.data?.items || whRes?.data?.warehouses || []);

      if (custList.length > 0) setLocalCustomers(custList);
      if (woList.length > 0) setLocalWorkOrders(woList);
      if (whList.length > 0) {
        setLocalWarehouses(whList);
        setFormData((prev) => {
          if (prev.sourceWarehouseId) return prev;
          const preferred = whList.find((w) => w.type === 'FINISHED_GOODS') || whList[0];
          return { ...prev, sourceWarehouseId: preferred?._id || '' };
        });
      }
    } catch (err) {
      console.error('Failed to load masters in CreateDispatchDialog', err);
    }
  };

  useEffect(() => {
    if (open) {
      if (localCustomers.length === 0 || localWarehouses.length === 0) {
        fetchMasters();
      } else if (!formData.sourceWarehouseId && localWarehouses.length > 0) {
        const preferred = localWarehouses.find((w) => w.type === 'FINISHED_GOODS') || localWarehouses[0];
        setFormData((prev) => ({ ...prev, sourceWarehouseId: preferred?._id || '' }));
      }
    }
  }, [open, localCustomers.length, localWarehouses.length]);

  const [formData, setFormData] = useState({
    customerId: '',
    workOrderId: '',
    sourceWarehouseId: '',
    vehicleNumber: '',
    transporterName: '',
    lrNumber: '',
    driverName: '',
    driverPhone: '',
    remarks: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error('Customer / Consignee is required');
      return;
    }
    if (!formData.sourceWarehouseId) {
      toast.error('Source dispatch warehouse is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: formData.customerId,
        workOrderId: formData.workOrderId || undefined,
        sourceWarehouseId: formData.sourceWarehouseId,
        vehicleNumber: formData.vehicleNumber.trim() || undefined,
        transporterName: formData.transporterName.trim() || undefined,
        lrNumber: formData.lrNumber.trim() || undefined,
        driverName: formData.driverName.trim() || undefined,
        driverPhone: formData.driverPhone.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
        lines: [],
      };

      await onSuccess(payload);
      onOpenChange(false);
      setFormData({
        customerId: '',
        workOrderId: '',
        sourceWarehouseId: '',
        vehicleNumber: '',
        transporterName: '',
        lrNumber: '',
        driverName: '',
        driverPhone: '',
        remarks: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Initiate Cable Dispatch
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Generate delivery challan and dispatch finished cable reels to customer site.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createDispatchForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Customer & Work Order */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Consignee & Work Order
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Customer / Consignee <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                options={(Array.isArray(localCustomers) ? localCustomers : []).map((c) => ({
                  value: c._id,
                  label: c.name,
                  code: c.code,
                }))}
                value={formData.customerId}
                onChange={(val) => setFormData({ ...formData, customerId: val })}
                placeholder="Select client company..."
                searchPlaceholder="Search customer by name or code..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Linked Work Order (Optional)
                </Label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Direct Stock Dispatch (No WO)' },
                    ...(Array.isArray(localWorkOrders) ? localWorkOrders : []).map((w) => ({
                      value: w._id,
                      label: w.workOrderNumber,
                      code: w.productId?.code,
                      subLabel: w.customerId?.name,
                    })),
                  ]}
                  value={formData.workOrderId}
                  onChange={(val) => setFormData({ ...formData, workOrderId: val })}
                  placeholder="Optional Work Order ref..."
                  searchPlaceholder="Search work order..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Dispatch Warehouse <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  options={(Array.isArray(localWarehouses) ? localWarehouses : []).map((w) => ({
                    value: w._id,
                    label: w.name,
                    code: w.code,
                    subLabel: w.type || 'FINISHED_GOODS',
                  }))}
                  value={formData.sourceWarehouseId}
                  onChange={(val) => setFormData({ ...formData, sourceWarehouseId: val })}
                  placeholder="From FG warehouse..."
                  searchPlaceholder="Search warehouse..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Logistics & Transporter Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Truck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Logistics & Transporter Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Vehicle / Truck Number
                </Label>
                <Input
                  placeholder="e.g. MH-12-CD-5678"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="h-10 text-sm font-mono uppercase bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Transporter Name
                </Label>
                <Input
                  placeholder="e.g. TCI Freight / SafeXpress"
                  value={formData.transporterName}
                  onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  LR / Bilty Number
                </Label>
                <Input
                  placeholder="e.g. LR-448102"
                  value={formData.lrNumber}
                  onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Driver Contact Phone
                </Label>
                <Input
                  placeholder="e.g. +91 9876543210"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Security Gate Pass & Dispatch Notes
              </Label>
              <Textarea
                placeholder="Add security seal numbers, tarp covering verification, or driver instructions..."
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="text-sm bg-white"
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-sm h-10 border-slate-200 cursor-pointer bg-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="createDispatchForm"
            disabled={loading}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Outbound Dispatch'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
