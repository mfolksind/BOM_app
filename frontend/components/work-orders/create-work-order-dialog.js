'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { FileSpreadsheet, Calendar, DollarSign, Layers, Truck, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  customers = [],
  products = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localProducts, setLocalProducts] = useState(products);
  const [boms, setBoms] = useState([]);
  const [loadingBoms, setLoadingBoms] = useState(false);
  const [previewAvailability, setPreviewAvailability] = useState(null);
  const [autoAllocatedChallans, setAutoAllocatedChallans] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [freezeStock, setFreezeStock] = useState(true);
  const [customerChallans, setCustomerChallans] = useState([]);
  const [loadingChallans, setLoadingChallans] = useState(false);

  useEffect(() => {
    if (customers?.length > 0) setLocalCustomers(customers);
  }, [customers]);

  useEffect(() => {
    if (products?.length > 0) setLocalProducts(products);
  }, [products]);

  useEffect(() => {
    if (open) {
      if (!customers || customers.length === 0) {
        api.get('/customers?limit=100')
          .then((res) => {
            const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
            if (list.length > 0) setLocalCustomers(list);
          })
          .catch((e) => console.error(e));
      }
      if (!products || products.length === 0) {
        api.get('/products?limit=100')
          .then((res) => {
            const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
            if (list.length > 0) setLocalProducts(list);
          })
          .catch((e) => console.error(e));
      }
    }
  }, [open, customers, products]);

  const [formData, setFormData] = useState({
    customerId: '',
    inboundChallanId: '',
    inboundChallanNumber: '',
    productId: '',
    bomVersionId: '',
    orderedLengthMeters: '',
    customerPoNumber: '',
    customerPoDate: new Date().toISOString().split('T')[0],
    jobWorkRatePerMeter: '',
    targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    plannedStartDate: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    notes: '',
    customerSpecifications: '',
  });

  // Fetch posted inbound challans when customer changes
  useEffect(() => {
    if (formData.customerId) {
      setLoadingChallans(true);
      api.get(`/inbound-challans?customerId=${formData.customerId}&status=POSTED&limit=50`)
        .then((res) => {
          const items = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
          setCustomerChallans(items);
        })
        .catch((err) => {
          console.error('Failed to load customer inbound challans', err);
          setCustomerChallans([]);
        })
        .finally(() => setLoadingChallans(false));
    } else {
      setCustomerChallans([]);
      setFormData((prev) => ({ ...prev, inboundChallanId: '', inboundChallanNumber: '' }));
    }
  }, [formData.customerId]);

  const handleProductChange = async (productId) => {
    setFormData((prev) => ({ ...prev, productId, bomVersionId: '' }));
    if (!productId) {
      setBoms([]);
      return;
    }
    setLoadingBoms(true);
    try {
      let bomList = [];
      const res = await api.get(`/boms?productId=${productId}&limit=50`);
      if (Array.isArray(res?.data)) {
        bomList = res.data;
      } else if (Array.isArray(res?.data?.items)) {
        bomList = res.data.items;
      } else {
        const fallbackRes = await api.get(`/boms/product/${productId}`);
        if (Array.isArray(fallbackRes?.data)) {
          bomList = fallbackRes.data;
        } else if (Array.isArray(fallbackRes?.data?.items)) {
          bomList = fallbackRes.data.items;
        }
      }

      setBoms(bomList);

      const activeBom = bomList.find((b) => b.status === 'ACTIVE');
      if (activeBom) {
        setFormData((prev) => ({ ...prev, productId, bomVersionId: activeBom._id }));
      } else if (bomList.length > 0) {
        setFormData((prev) => ({ ...prev, productId, bomVersionId: bomList[0]._id }));
      }
    } catch (err) {
      console.error('Failed to fetch BOMs for product', err);
      try {
        const fallbackRes = await api.get(`/boms/product/${productId}`);
        const bomList = Array.isArray(fallbackRes?.data)
          ? fallbackRes.data
          : Array.isArray(fallbackRes?.data?.items)
            ? fallbackRes.data.items
            : [];
        setBoms(bomList);
        const activeBom = bomList.find((b) => b.status === 'ACTIVE');
        if (activeBom) {
          setFormData((prev) => ({ ...prev, productId, bomVersionId: activeBom._id }));
        } else if (bomList.length > 0) {
          setFormData((prev) => ({ ...prev, productId, bomVersionId: bomList[0]._id }));
        }
      } catch (fallbackErr) {
        console.error('Failed fallback BOM fetch', fallbackErr);
        toast.error('Could not load BOM versions for this product');
      }
    } finally {
      setLoadingBoms(false);
    }
  };

  useEffect(() => {
    const length = parseFloat(formData.orderedLengthMeters);
    if (formData.bomVersionId && !isNaN(length) && length > 0) {
      setLoadingPreview(true);
      api.post('/work-orders/preview/material-availability', {
        bomVersionId: formData.bomVersionId,
        orderedLengthMeters: length,
        customerId: formData.customerId || undefined,
        inboundChallanId: formData.inboundChallanId || undefined,
      })
        .then((res) => {
          if (res?.data?.materials) {
            setPreviewAvailability(res.data.materials);
            setAutoAllocatedChallans(res.data.autoAllocatedChallans || null);
          } else {
            setPreviewAvailability(null);
            setAutoAllocatedChallans(null);
          }
        })
        .catch((e) => {
          console.error('Failed to preview material availability', e);
          setPreviewAvailability(null);
          setAutoAllocatedChallans(null);
        })
        .finally(() => setLoadingPreview(false));
    } else {
      setPreviewAvailability(null);
      setAutoAllocatedChallans(null);
    }
  }, [formData.bomVersionId, formData.orderedLengthMeters, formData.customerId, formData.inboundChallanId]);

  // Check if any material is deficient for this customer
  const customerHasShortage = (previewAvailability || []).some(
    (m) => (m.customerShortage || 0) > 0 || (m.customerAvailableQuantity || 0) < (m.requiredQuantity || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error('Customer is required');
      return;
    }
    if (!formData.productId) {
      toast.error('Cable product is required');
      return;
    }
    if (!formData.bomVersionId) {
      toast.error('Active BOM recipe is required to freeze engineering norms');
      return;
    }

    const length = parseFloat(formData.orderedLengthMeters);
    if (isNaN(length) || length <= 0) {
      toast.error('Ordered length must be greater than 0 meters');
      return;
    }

    if (customerHasShortage) {
      toast.error('Cannot create Work Order: Customer has insufficient raw material stock. Borrowing global/other customer stock is prohibited.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: formData.customerId,
        inboundChallanId: formData.inboundChallanId || undefined,
        inboundChallanNumber: formData.inboundChallanNumber || undefined,
        productId: formData.productId,
        bomVersionId: formData.bomVersionId,
        orderedLengthMeters: length,
        customerPoNumber: formData.customerPoNumber.trim() || undefined,
        customerPoDate: formData.customerPoDate,
        jobWorkRatePerMeter: formData.jobWorkRatePerMeter ? parseFloat(formData.jobWorkRatePerMeter) : undefined,
        targetDeliveryDate: formData.targetDeliveryDate,
        plannedStartDate: formData.plannedStartDate,
        priority: formData.priority,
        notes: formData.notes.trim() || undefined,
        customerSpecifications: formData.customerSpecifications.trim() || undefined,
        confirmAndReserve: freezeStock,
      };

      const res = await api.post('/work-orders', payload);
      if (res?.success || res?.data) {
        toast.success(
          freezeStock
            ? 'Work Order created & customer stock reserved/frozen successfully'
            : 'Work Order created successfully in DRAFT state',
        );
        if (onSuccess) onSuccess(res?.data);
        onOpenChange(false);
        setFormData({
          customerId: '',
          inboundChallanId: '',
          inboundChallanNumber: '',
          productId: '',
          bomVersionId: '',
          orderedLengthMeters: '',
          customerPoNumber: '',
          customerPoDate: new Date().toISOString().split('T')[0],
          jobWorkRatePerMeter: '',
          targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          plannedStartDate: new Date().toISOString().split('T')[0],
          priority: 'NORMAL',
          notes: '',
          customerSpecifications: '',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create work order');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const customerOptions = (localCustomers || []).map((c) => ({
    value: c._id,
    label: c.name,
    code: c.code,
    subLabel: c.phone || c.email || '',
  }));

  const productOptions = (localProducts || []).map((p) => ({
    value: p._id,
    label: p.name,
    code: p.code,
    subLabel: `${p.cableCategory || 'CABLE'} • ${p.voltageGrade || '1.1KV'}`,
  }));

  const bomOptions = (boms || []).map((b) => ({
    value: b._id,
    label: `${b.bomNumber} (v${b.versionNumber || 1}.0)`,
    code: b.status,
    subLabel: b.status === 'ACTIVE' ? 'Active Approved Recipe' : `${b.status} Version`,
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl lg:w-[56vw] lg:max-w-[960px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">Create Production Work Order</SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Bind customer inbound challan materials, verify raw material sufficiency, and lock active BOM recipe.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Customer / Client <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  options={customerOptions}
                  value={formData.customerId}
                  onChange={(val) => setFormData({ ...formData, customerId: val, inboundChallanId: '', inboundChallanNumber: '' })}
                  placeholder="Search and choose customer..."
                  searchPlaceholder="Search customer by name or code..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target Cable Product <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  options={productOptions}
                  value={formData.productId}
                  onChange={handleProductChange}
                  placeholder="Search cable product..."
                  searchPlaceholder="Search product by name, code..."
                />
              </div>
            </div>
            {/* 
            {/* Automatic Inbound Challan Selection via LIFO Stock Exhaustion */}
            {/* <div className="space-y-2 p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/70 rounded-xl border border-indigo-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-indigo-600 text-white">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                      Auto Inbound Challan Allocation (LIFO)
                    </span>
                    <span className="text-[11px] text-indigo-700">
                      System automatically selects customer challans & exhausts stock chronologically
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 font-mono text-[10px] uppercase font-bold">
                  Auto-Pick Enabled
                </Badge>
              </div>

              {formData.customerId ? (
                <div className="mt-2 pt-2 border-t border-indigo-100">
                  {autoAllocatedChallans && autoAllocatedChallans.inboundChallanNumbers?.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <span>Allocated Challan(s):</span>
                        <span className="text-[11px] text-indigo-600 font-normal">
                          ({autoAllocatedChallans.inboundChallanNumbers.length} challan{autoAllocatedChallans.inboundChallanNumbers.length > 1 ? 's' : ''} covering order requirement)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {autoAllocatedChallans.inboundChallanNumbers.map((cNum, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 font-mono text-xs font-bold text-indigo-950 shadow-2xs"
                          >
                            <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{cNum}</span>
                            <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">#{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-indigo-800/80 leading-relaxed mt-1">
                        If quantity in one challan is exhausted, the system automatically pulls from subsequent challans.
                      </p>
                    </div>
                  ) : loadingPreview ? (
                    <div className="text-xs text-indigo-600 italic py-1 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Analyzing customer stock lots & matching challans...
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">
                      Enter ordered length to calculate auto-allocated customer challans.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-1">
                  Select customer and length to auto-allocate inbound challans.
                </div>
              )} */}
            {/* </div> */}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Active BOM Recipe Norm <span className="text-rose-500">*</span>
              </Label>
              {loadingBoms ? (
                <div className="h-9 border rounded-md px-3 flex items-center text-xs text-muted-foreground bg-muted/40 animate-pulse">
                  Loading active BOM formulas for selected product...
                </div>
              ) : (
                <SearchableSelect
                  options={bomOptions}
                  value={formData.bomVersionId}
                  onChange={(val) => setFormData({ ...formData, bomVersionId: val })}
                  placeholder={formData.productId ? 'Select BOM Version to lock...' : 'Choose product first...'}
                  searchPlaceholder="Search BOM version..."
                  disabled={!formData.productId}
                  emptyMessage="No active BOM recipes found for this cable. Please create or activate a BOM first."
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Ordered Length (Meters) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  value={formData.orderedLengthMeters}
                  onChange={(e) => setFormData({ ...formData, orderedLengthMeters: e.target.value })}
                  className="h-9 text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Job Work Rate / Meter (₹)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 12.50"
                  value={formData.jobWorkRatePerMeter}
                  onChange={(e) => setFormData({ ...formData, jobWorkRatePerMeter: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {loadingPreview && (
              <div className="text-xs text-slate-500 py-1 flex items-center gap-1.5 animate-pulse">
                <span>Checking customer stock sufficiency in yard...</span>
              </div>
            )}

            {/* Live Material Availability Preview Table */}
            {previewAvailability && previewAvailability.length > 0 && (
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Customer Material Stock Sufficiency Check
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-semibold ${customerHasShortage ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                      {customerHasShortage ? 'Insufficient Customer Stock' : 'Customer Stock Verified'}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Restricted strictly to selected customer's stock
                  </span>
                </div>

                {customerHasShortage && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Customer does not have enough material in yard:</div>
                      <div className="text-[11px] text-rose-800 mt-0.5">
                        Work order creation is restricted because borrowing global or other customer stock is not permitted. Please receive raw materials via Inbound Challan first.
                      </div>
                    </div>
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-xs">
                  <Table className="min-w-[620px]">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-700 py-2">Material</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700 py-2">Required Norm</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700 py-2">Customer Stock (Avail)</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700 py-2">Deficit / Surplus</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700 py-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewAvailability.map((m, idx) => {
                        const hasCustomer = Boolean(formData.customerId);
                        const custAvail = m.customerAvailableQuantity || 0;
                        const custOnHand = m.customerOnHandQuantity || 0;
                        const custFrozen = m.customerReservedQuantity || 0;
                        const reqQty = m.requiredQuantity || 0;
                        const isDeficient = custAvail < reqQty;
                        const diff = custAvail - reqQty;

                        return (
                          <TableRow key={idx} className="hover:bg-slate-50/50">
                            <TableCell className="py-2">
                              <div className="font-semibold text-slate-900 text-xs">{m.materialName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{m.materialCode}</div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-800 font-semibold py-2">
                              {reqQty.toFixed(2)} {m.unit}
                            </TableCell>
                            <TableCell className="text-right py-2">
                              {hasCustomer ? (
                                <div>
                                  <div className={`font-bold text-xs font-mono ${isDeficient ? 'text-rose-700' : 'text-slate-900'}`}>
                                    {custAvail.toFixed(2)} {m.unit}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5 space-x-1.5 font-mono">
                                    <span>On-Hand: <strong className="text-slate-800">{custOnHand.toFixed(1)}</strong></span>
                                    <span>|</span>
                                    <span>Frozen: <strong className="text-slate-800">{custFrozen.toFixed(1)}</strong></span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No customer</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-2 font-mono text-xs font-bold">
                              {diff >= 0 ? (
                                <span className="text-emerald-700">+{diff.toFixed(2)} {m.unit}</span>
                              ) : (
                                <span className="text-rose-700">{diff.toFixed(2)} {m.unit}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              {!isDeficient ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] whitespace-nowrap"
                                >
                                  Customer Stock OK
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-rose-200 text-rose-700 bg-rose-50 text-[10px] whitespace-nowrap font-bold"
                                >
                                  Deficient (-{Math.abs(diff).toFixed(1)})
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Customer PO Ref #</Label>
                <Input
                  placeholder="PO-2026-0089"
                  value={formData.customerPoNumber}
                  onChange={(e) => setFormData({ ...formData, customerPoNumber: e.target.value })}
                  className="h-9 text-sm uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Customer PO Date</Label>
                <Input
                  type="date"
                  value={formData.customerPoDate}
                  onChange={(e) => setFormData({ ...formData, customerPoDate: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Planned Start</Label>
                <Input
                  type="date"
                  value={formData.plannedStartDate}
                  onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Target Delivery</Label>
                <Input
                  type="date"
                  value={formData.targetDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, targetDeliveryDate: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent (Express)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Special Customer Specifications</Label>
              <Textarea
                placeholder="Specific drum lengths, continuous marking prints, special outer jacket color specs..."
                rows={2}
                value={formData.customerSpecifications}
                onChange={(e) => setFormData({ ...formData, customerSpecifications: e.target.value })}
                className="text-sm resize-none"
              />
            </div>

            {/* Auto-reserve and freeze customer stock */}
            <div className="flex items-start gap-3 p-3 bg-amber-50/70 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                id="freezeStock"
                checked={freezeStock}
                onChange={(e) => setFreezeStock(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="freezeStock" className="text-xs text-amber-950 font-medium cursor-pointer select-none">
                <span className="font-semibold">Freeze & Reserve Customer Stock Immediately</span>
                <span className="block text-[11px] text-amber-800/90 font-normal mt-0.5 leading-relaxed">
                  Locks the customer's raw materials so no other order can use them, and reserves them specifically for this Work Order.
                </span>
              </label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between -mx-6 -mb-5 sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 text-xs border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || customerHasShortage}
              className={`h-9 text-xs font-medium cursor-pointer shadow-xs ${customerHasShortage
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
            >
              {loading
                ? 'Creating...'
                : customerHasShortage
                  ? 'Stock Deficit (Creation Blocked)'
                  : freezeStock
                    ? 'Create & Freeze Stock'
                    : 'Create Draft Work Order'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
