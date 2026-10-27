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
import { toast } from 'sonner';
import { FileSpreadsheet, Calendar, DollarSign, Layers } from 'lucide-react';
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

  const handleProductChange = async (productId) => {
    setFormData((prev) => ({ ...prev, productId, bomVersionId: '' }));
    if (!productId) {
      setBoms([]);
      return;
    }
    setLoadingBoms(true);
    try {
      // First try standard list endpoint with productId filter
      let bomList = [];
      const res = await api.get(`/boms?productId=${productId}&limit=50`);
      if (Array.isArray(res?.data)) {
        bomList = res.data;
      } else if (Array.isArray(res?.data?.items)) {
        bomList = res.data.items;
      } else {
        // Fallback to product-specific endpoint
        const fallbackRes = await api.get(`/boms/product/${productId}`);
        if (Array.isArray(fallbackRes?.data)) {
          bomList = fallbackRes.data;
        } else if (Array.isArray(fallbackRes?.data?.items)) {
          bomList = fallbackRes.data.items;
        }
      }

      setBoms(bomList);

      // Prefer ACTIVE BOM, otherwise pick newest version
      const activeBom = bomList.find((b) => b.status === 'ACTIVE');
      if (activeBom) {
        setFormData((prev) => ({ ...prev, productId, bomVersionId: activeBom._id }));
      } else if (bomList.length > 0) {
        setFormData((prev) => ({ ...prev, productId, bomVersionId: bomList[0]._id }));
      }
    } catch (err) {
      console.error('Failed to fetch BOMs for product', err);
      // Try fallback route
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

    setLoading(true);
    try {
      const payload = {
        customerId: formData.customerId,
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
      };

      const res = await api.post('/work-orders', payload);
      if (res?.success || res?.data) {
        toast.success('Work Order created successfully in DRAFT state');
        if (onSuccess) onSuccess(res?.data);
        onOpenChange(false);
        setFormData({
          customerId: '',
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
        className="w-full sm:max-w-xl md:max-w-2xl lg:w-[48vw] lg:max-w-[840px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
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
                  Lock customer job order requirements and freeze active BOM manufacturing norms.
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
                  onChange={(val) => setFormData({ ...formData, customerId: val })}
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
              disabled={loading}
              className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer shadow-xs"
            >
              {loading ? 'Generating...' : 'Create Draft Work Order'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
