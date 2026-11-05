'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Truck, ClipboardList, CheckCircle2, Layers } from 'lucide-react';
import { api } from '@/lib/api';

const STANDARD_DRUM_SIZES = [
  '44X16X24',
  '44X22X20',
  '46X22X20',
  '48X20X28',
  '48X24X24',
  '48X28X24',
  '36X18X20',
  '36X22X18',
  '40X20X20',
  '40X22X20',
  '52X26X28',
  '52X28X24',
  '56X28X24',
  '56X30X30',
  '60X28X28',
  '60X32X32',
  '64X34X34',
  '68X34X34',
  '72X34X34',
  '72X38X36',
  '80X40X40',
  '90X48X48',
  '1000X500X600',
  '1200X600X800',
  '1400X700X900',
  '1600X800X1000',
  '1800X900X1100',
  '2000X1000X1200',
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
  const [availableSizes, setAvailableSizes] = useState(STANDARD_DRUM_SIZES);
  const [isCustomSize, setIsCustomSize] = useState(false);
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
      const [cRes, whRes, drumsRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/warehouses?limit=100'),
        api.get('/drums?limit=200').catch(() => null),
      ]);
      const custList = Array.isArray(cRes?.data) ? cRes.data : (cRes?.data?.items || cRes?.data?.customers || []);
      const whList = Array.isArray(whRes?.data) ? whRes.data : (whRes?.data?.items || whRes?.data?.warehouses || []);

      if (drumsRes?.data) {
        const dList = Array.isArray(drumsRes.data) ? drumsRes.data : (drumsRes.data?.drums || []);
        const dbSizes = dList
          .map((d) => d.drumSize?.trim())
          .filter(Boolean);
        const merged = Array.from(new Set([...STANDARD_DRUM_SIZES, ...dbSizes]));
        setAvailableSizes(merged);
      }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-4xl max-h-[90vh] sm:max-w-4xl bg-white p-0 flex flex-col overflow-hidden rounded-xl shadow-2xl border border-slate-200">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-white shrink-0">
            <DialogHeader className="p-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-slate-900">
                    Receive Customer Drums
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Record empty drums received from customer gate entry
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Challan & Customer Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Customer *</Label>
                <SearchableSelect
                  options={(Array.isArray(localCustomers) ? localCustomers : []).map((c) => ({
                    value: c._id,
                    label: c.name,
                    code: c.code || 'CUST',
                    subLabel: c.phone || c.email || '',
                  }))}
                  value={customerId}
                  onChange={setCustomerId}
                  placeholder="Select Customer"
                  searchPlaceholder="Search customer by name or code..."
                  className="bg-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Challan / RGP No. *
                </Label>
                <Input
                  value={customerChallanNumber}
                  onChange={(e) => setCustomerChallanNumber(e.target.value)}
                  placeholder="e.g. RGP-2627-01"
                  className="bg-white text-xs h-9 font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Challan Date *</Label>
                <Input
                  type="date"
                  value={customerChallanDate}
                  onChange={(e) => setCustomerChallanDate(e.target.value)}
                  className="bg-white text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Receiving Warehouse *</Label>
                <SearchableSelect
                  options={(Array.isArray(localWarehouses) ? localWarehouses : []).map((w) => ({
                    value: w._id,
                    label: w.name,
                    code: w.code || 'WH',
                    subLabel: w.type || 'Warehouse',
                  }))}
                  value={warehouseId}
                  onChange={setWarehouseId}
                  placeholder="Select Warehouse"
                  searchPlaceholder="Search warehouse..."
                  className="bg-white text-xs h-9"
                />
              </div>
            </div>

            {/* Drums Inward Section */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">
                  Drums Inward
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setEntryMode('quick')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${entryMode === 'quick'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Quick Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode('detailed')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${entryMode === 'detailed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Individual Serials
                  </button>
                </div>
              </div>

              {entryMode === 'quick' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-700">
                        Drum Size *
                      </Label>
                      <button
                        type="button"
                        onClick={() => setIsCustomSize((prev) => !prev)}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        {isCustomSize ? 'Select from list' : '+ Custom size'}
                      </button>
                    </div>

                    {!isCustomSize ? (
                      <Select
                        value={drumSize}
                        onValueChange={(val) => {
                          if (val === '__CUSTOM__') {
                            setIsCustomSize(true);
                          } else {
                            setDrumSize(val);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-white text-xs h-9 font-mono border-slate-200">
                          <SelectValue placeholder="Select Size">
                            {drumSize || 'Select Size'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {availableSizes.map((sz) => (
                            <SelectItem key={sz} value={sz} className="text-xs font-mono">
                              {sz}
                            </SelectItem>
                          ))}
                          <SelectItem value="__CUSTOM__" className="text-xs font-medium text-indigo-600">
                            + Enter Custom Size...
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={drumSize}
                        onChange={(e) => setDrumSize(e.target.value)}
                        placeholder="e.g. 44X16X24"
                        className="bg-white text-xs h-9 font-mono border-slate-300"
                        required
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">
                      Quantity Received *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={numberOfDrums}
                      onChange={(e) => setNumberOfDrums(e.target.value)}
                      placeholder="e.g. 4"
                      className="bg-white text-xs h-9 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Serial Prefix</Label>
                    <Input
                      value={drumPrefix}
                      onChange={(e) => setDrumPrefix(e.target.value)}
                      placeholder="MF/"
                      className="bg-white text-xs h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Material &amp; Tare Wt (kg)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={drumType} onValueChange={setDrumType}>
                        <SelectTrigger className="bg-white text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WOODEN" className="text-xs">Wooden</SelectItem>
                          <SelectItem value="STEEL" className="text-xs">Steel</SelectItem>
                          <SelectItem value="PLASTIC" className="text-xs">Plastic</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={tareWeightKg}
                        onChange={(e) => setTareWeightKg(e.target.value)}
                        placeholder="150"
                        className="bg-white text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Detailed Table of Serials */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      {drumRows.length} {drumRows.length === 1 ? 'drum' : 'drums'} configured
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRow}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Drum
                    </Button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium text-[11px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">Drum No.</th>
                          <th className="p-2">Size</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Tare (kg)</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {drumRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-1.5 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-1.5">
                              <Input
                                value={row.drumNumber}
                                onChange={(e) => handleRowChange(idx, 'drumNumber', e.target.value)}
                                className="h-7 text-xs font-mono"
                                required
                              />
                            </td>
                            <td className="p-1.5 w-36">
                              <Select
                                value={row.drumSize}
                                onValueChange={(val) => handleRowChange(idx, 'drumSize', val)}
                              >
                                <SelectTrigger className="h-7 text-xs bg-white font-mono border-slate-200">
                                  <SelectValue placeholder="Size">
                                    {row.drumSize || 'Size'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {Array.from(new Set([...availableSizes, row.drumSize].filter(Boolean))).map((sz) => (
                                    <SelectItem key={sz} value={sz} className="text-xs font-mono">
                                      {sz}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                                  <SelectItem value="WOODEN" className="text-xs">Wooden</SelectItem>
                                  <SelectItem value="STEEL" className="text-xs">Steel</SelectItem>
                                  <SelectItem value="PLASTIC" className="text-xs">Plastic</SelectItem>
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

            {/* Optional Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
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

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5 text-xs h-9 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Receiving...' : `Receive ${selectedCount} Drums`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
