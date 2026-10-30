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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Truck, ClipboardList, CheckCircle2, Layers } from 'lucide-react';
import { api } from '@/lib/api';

const STANDARD_DRUM_SIZES = [
  '44X16X24',
  '1400X700X900',
  '1200X600X800',
  '1600X800X1000',
  '1800X900X1100',
  '2000X1000X1200',
  '1000X500X600',
];

export function ReceiveCustomerDrumsDialog({
  open,
  onOpenChange,
  customers = [],
  warehouses = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerChallanNumber, setCustomerChallanNumber] = useState('');
  const [customerChallanDate, setCustomerChallanDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [warehouseId, setWarehouseId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporter, setTransporter] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // 2 Core Drum Fields as requested
  const [drumSize, setDrumSize] = useState('44X16X24');
  const [numberOfDrums, setNumberOfDrums] = useState('4');
  const [drumPrefix, setDrumPrefix] = useState('MF/');
  const [drumType, setDrumType] = useState('WOODEN');
  const [tareWeightKg, setTareWeightKg] = useState('150');

  // Mode: 'quick' (2-field: size + count) or 'detailed' (individual serial rows)
  const [entryMode, setEntryMode] = useState('quick');
  const [drumRows, setDrumRows] = useState([
    { drumNumber: 'MF/01', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
    { drumNumber: 'MF/02', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
    { drumNumber: 'MF/03', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
    { drumNumber: 'MF/06', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
  ]);

  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);

  useEffect(() => {
    if (customers?.length > 0) setLocalCustomers(customers);
  }, [customers]);

  useEffect(() => {
    if (warehouses?.length > 0) setLocalWarehouses(warehouses);
  }, [warehouses]);

  const fetchMasters = async () => {
    try {
      const [cRes, whRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/warehouses?limit=100'),
      ]);
      const custList = Array.isArray(cRes?.data) ? cRes.data : (cRes?.data?.items || cRes?.data?.customers || []);
      const whList = Array.isArray(whRes?.data) ? whRes.data : (whRes?.data?.items || whRes?.data?.warehouses || []);

      if (custList.length > 0) {
        setLocalCustomers(custList);
        setCustomerId((prev) => prev || custList[0]._id);
      }
      if (whList.length > 0) {
        setLocalWarehouses(whList);
        setWarehouseId((prev) => {
          if (prev) return prev;
          const preferred = whList.find((w) => w.type === 'FINISHED_GOODS' || w.type === 'RAW_MATERIALS') || whList[0];
          return preferred._id;
        });
      }
    } catch (err) {
      console.error('Failed to load masters in ReceiveCustomerDrumsDialog', err);
    }
  };

  useEffect(() => {
    if (open) {
      if (localCustomers.length === 0 || localWarehouses.length === 0) {
        fetchMasters();
      } else {
        if (!customerId && localCustomers.length > 0) {
          setCustomerId(localCustomers[0]._id);
        }
        if (!warehouseId && localWarehouses.length > 0) {
          const fg = localWarehouses.find((w) => w.type === 'FINISHED_GOODS' || w.type === 'RAW_MATERIALS') || localWarehouses[0];
          setWarehouseId(fg._id);
        }
      }
      if (!customerChallanNumber) {
        setCustomerChallanNumber('262740872');
      }
    }
  }, [open, localCustomers, localWarehouses]);

  const handleAddRow = () => {
    const nextNum = drumRows.length + 1;
    setDrumRows((prev) => [
      ...prev,
      {
        drumNumber: `${drumPrefix || 'MF/'}${String(nextNum).padStart(2, '0')}`,
        drumSize: drumSize || '44X16X24',
        drumType: drumType || 'WOODEN',
        tareWeightKg: parseFloat(tareWeightKg) || 150,
        remarks: 'STD.LENGTH',
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    setDrumRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    setDrumRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select the sending Customer');
      return;
    }
    if (!customerChallanNumber.trim()) {
      toast.error('Customer Challan / Ref RGP Number is required');
      return;
    }
    if (!warehouseId) {
      toast.error('Please select receiving warehouse');
      return;
    }

    const qty = parseInt(numberOfDrums, 10);
    if (entryMode === 'quick' && (isNaN(qty) || qty <= 0)) {
      toast.error('Please enter a valid number of drums');
      return;
    }
    if (entryMode === 'detailed' && drumRows.length === 0) {
      toast.error('At least one drum is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId,
        customerChallanNumber: customerChallanNumber.trim(),
        customerChallanDate,
        warehouseId,
        vehicleNumber: vehicleNumber.trim() || undefined,
        transporter: transporter.trim() || undefined,
        lrNumber: lrNumber.trim() || undefined,
        remarks: remarks.trim() || `Customer returnable drums against RGP ${customerChallanNumber.trim()}`,
      };

      if (entryMode === 'quick') {
        payload.quantity = qty;
        payload.drumSize = drumSize.trim() || '44X16X24';
        payload.drumType = drumType;
        payload.tareWeightKg = parseFloat(tareWeightKg) || 150;
        payload.prefix = drumPrefix.trim() || 'MF/';
      } else {
        payload.drums = drumRows.map((d) => ({
          drumNumber: d.drumNumber.trim(),
          drumSize: d.drumSize.trim() || drumSize.trim() || '44X16X24',
          drumType: d.drumType || drumType || 'WOODEN',
          tareWeightKg: parseFloat(d.tareWeightKg) || 150,
          remarks: d.remarks || 'STD.LENGTH',
        }));
      }

      const res = await api.post('/drums/receive-inbound', payload);
      if (res?.success || res?.data) {
        const count = entryMode === 'quick' ? qty : drumRows.length;
        toast.success(`Successfully received ${count} drums under Challan/RGP #${customerChallanNumber}!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to receive customer drums');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = entryMode === 'quick' ? parseInt(numberOfDrums, 10) || 0 : drumRows.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl lg:w-[58vw] lg:max-w-[960px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-orange-500/20 bg-gradient-to-r from-orange-600 to-amber-600 text-white shrink-0">
            <SheetHeader className="p-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-white">
                    Receive Customer Drums (Inbound Challan / RGP)
                  </SheetTitle>
                  <SheetDescription className="text-xs text-orange-100 mt-0.5">
                    Record returnable empty cable drums sent by customer with delivery challan / gate pass.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Challan & Customer Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Sending Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="bg-white text-xs h-9">
                    <SelectValue placeholder="Select Customer">
                      {(() => {
                        const c = (Array.isArray(localCustomers) ? localCustomers : []).find(
                          (item) => String(item._id) === String(customerId),
                        );
                        return c ? `${c.name} (${c.code || 'CUST'})` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(localCustomers) ? localCustomers : []).map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-xs">
                        {c.name} ({c.code || 'CUST'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Customer Challan / Ref RGP No. *
                </Label>
                <Input
                  value={customerChallanNumber}
                  onChange={(e) => setCustomerChallanNumber(e.target.value)}
                  placeholder="e.g. 262740872"
                  className="bg-white text-xs h-9 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Challan / RGP Date *</Label>
                <Input
                  type="date"
                  value={customerChallanDate}
                  onChange={(e) => setCustomerChallanDate(e.target.value)}
                  className="bg-white text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Receiving Warehouse / Yard *</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-white text-xs h-9">
                    <SelectValue placeholder="Select Warehouse">
                      {(() => {
                        const w = (Array.isArray(localWarehouses) ? localWarehouses : []).find(
                          (item) => String(item._id) === String(warehouseId),
                        );
                        return w ? `${w.name} (${w.code || 'WH'})` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(localWarehouses) ? localWarehouses : []).map((w) => (
                      <SelectItem key={w._id} value={w._id} className="text-xs">
                        {w.name} ({w.code || 'WH'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Core 2 Fields as Requested */}
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-orange-200">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-950 uppercase tracking-wide">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span>Drums Inward (Size &amp; Quantity)</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-orange-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEntryMode('quick')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      entryMode === 'quick'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Quick (2-Field Entry)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode('detailed')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      entryMode === 'detailed'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Individual Drum Serials
                  </button>
                </div>
              </div>

              {entryMode === 'quick' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      1. Size of Drums (Flange x Core x Trav) *
                    </Label>
                    <div className="space-y-1.5">
                      <Input
                        value={drumSize}
                        onChange={(e) => setDrumSize(e.target.value)}
                        placeholder="e.g. 44X16X24 or 1400X700X900"
                        className="bg-white text-xs h-9 font-mono font-bold"
                        required
                      />
                      <div className="flex flex-wrap gap-1">
                        {STANDARD_DRUM_SIZES.slice(0, 4).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setDrumSize(sz)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              drumSize === sz
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      2. Number of Drums Received *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={numberOfDrums}
                      onChange={(e) => setNumberOfDrums(e.target.value)}
                      placeholder="e.g. 4"
                      className="bg-white text-xs h-9 font-mono font-bold text-lg"
                      required
                    />
                    <span className="text-[11px] text-slate-500 block">
                      Will automatically create drums under RGP #{customerChallanNumber || '...'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Drum Identification Prefix</Label>
                    <Input
                      value={drumPrefix}
                      onChange={(e) => setDrumPrefix(e.target.value)}
                      placeholder="MF/"
                      className="bg-white text-xs h-8 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Construction &amp; Tare Wt</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={drumType} onValueChange={setDrumType}>
                        <SelectTrigger className="bg-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WOODEN">Wooden Reel</SelectItem>
                          <SelectItem value="STEEL">Corrugated Steel</SelectItem>
                          <SelectItem value="PLASTIC">Plastic Spool</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={tareWeightKg}
                        onChange={(e) => setTareWeightKg(e.target.value)}
                        placeholder="150 kg"
                        className="bg-white text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Detailed Table of Serials */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Individual Drum Identification ({drumRows.length} Drums)
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRow}
                      className="h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Drum Row
                    </Button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">Drum No.</th>
                          <th className="p-2">Size</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Tare Wt (Kg)</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {drumRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-1.5">
                              <Input
                                value={row.drumNumber}
                                onChange={(e) => handleRowChange(idx, 'drumNumber', e.target.value)}
                                className="h-7 text-xs font-mono font-bold"
                                required
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={row.drumSize}
                                onChange={(e) => handleRowChange(idx, 'drumSize', e.target.value)}
                                className="h-7 text-xs font-mono"
                              />
                            </td>
                            <td className="p-1.5">
                              <Select
                                value={row.drumType}
                                onValueChange={(val) => handleRowChange(idx, 'drumType', val)}
                              >
                                <SelectTrigger className="h-7 text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="WOODEN">Wooden</SelectItem>
                                  <SelectItem value="STEEL">Steel</SelectItem>
                                  <SelectItem value="PLASTIC">Plastic</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5">
                              <Input
                                type="number"
                                value={row.tareWeightKg}
                                onChange={(e) => handleRowChange(idx, 'tareWeightKg', e.target.value)}
                                className="h-7 text-xs font-mono w-20"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              {drumRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Logistics Details (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Vehicle Number</Label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. RJ-02-GB-5511"
                  className="bg-white text-xs h-8 font-mono uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Transporter / LR No.</Label>
                <Input
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  placeholder="e.g. LR-2627-991"
                  className="bg-white text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-1.5 shadow-sm text-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Receiving Drums...' : `Receive ${selectedCount} Drums in Yard`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
