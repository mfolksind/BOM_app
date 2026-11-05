'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';

import { CustomerStockOverviewDialog } from '@/components/customers/customer-stock-overview-dialog';
import { MaterialStockDetailsDialog } from '@/components/stock/material-stock-details-dialog';

import {
  Warehouse,
  Boxes,
  Layers,
  Search,
  RefreshCw,
  FilterX,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Recycle,
  Eye,
} from 'lucide-react';

export default function StockDashboardPage() {
  // Master lists
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Data
  const [balances, setBalances] = useState([]);
  const [inboundChallans, setInboundChallans] = useState([]);
  const [outboundChallans, setOutboundChallans] = useState([]);
  const [scrapRecords, setScrapRecords] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  // Loaders
  const [isLoading, setIsLoading] = useState(true);

  // Multi-Filter States
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [challanTypeFilter, setChallanTypeFilter] = useState('ALL'); // 'ALL' | 'INBOUND' | 'OUTBOUND'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Dialog states for click-to-open
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedMaterialForStock, setSelectedMaterialForStock] = useState(null);

  // Helper to extract items array safely from any API response structure
  const extractItems = (res) => {
    if (!res) return [];
    const payload = res.data !== undefined ? res.data : res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.challans)) return payload.challans;
    if (Array.isArray(payload?.customers)) return payload.customers;
    if (Array.isArray(payload?.materials)) return payload.materials;
    return [];
  };

  // Fetch initial master lists and stock data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchAllPages = async (endpoint) => {
        const allItems = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await apiClient(`${endpoint}?limit=100&page=${page}`);
          allItems.push(...extractItems(response));
          totalPages = Number(response.meta?.totalPages || 1);
          page += 1;
        } while (page <= totalPages);

        return allItems;
      };

      const [
        custRes,
        matRes,
        whRes,
        balRes,
        inChallanRes,
        outChallanRes,
        scrapRes,
        lowStockRes,
      ] = await Promise.allSettled([
        fetchAllPages('/customers'),
        fetchAllPages('/materials'),
        apiClient('/warehouses?limit=50'),
        apiClient('/inventory/balances?limit=100'),
        fetchAllPages('/inbound-challans'),
        apiClient('/outbound-challans?limit=100'),
        apiClient('/reports/dashboard'),
        apiClient('/inventory/low-stock'),
      ]);

      if (custRes.status === 'fulfilled') {
        const custList = extractItems(custRes.value);
        setCustomers(custList);
      }
      if (matRes.status === 'fulfilled') {
        const matList = extractItems(matRes.value);
        setMaterials(matList);
      }
      if (whRes.status === 'fulfilled') {
        const whList = extractItems(whRes.value);
        setWarehouses(whList);
      }
      if (balRes.status === 'fulfilled') {
        const balList = extractItems(balRes.value);
        setBalances(balList);
      }
      if (inChallanRes.status === 'fulfilled') {
        const inList = extractItems(inChallanRes.value);
        setInboundChallans(inList);
      }
      if (outChallanRes.status === 'fulfilled') {
        const outList = extractItems(outChallanRes.value);
        setOutboundChallans(outList);
      }
      if (scrapRes.status === 'fulfilled') {
        const repData = scrapRes.value?.data || scrapRes.value;
        const scraps = repData?.scrapRecords || extractItems(scrapRes.value);
        setScrapRecords(scraps);
      }
      if (lowStockRes.status === 'fulfilled') {
        const lowList = extractItems(lowStockRes.value);
        setLowStockAlerts(lowList);
      }
    } catch (err) {
      console.error('Error loading stock inventory data:', err);
      toast.error('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set of low stock material IDs for fast lookup
  const lowStockMaterialIdSet = useMemo(() => {
    const s = new Set();
    for (const a of lowStockAlerts) {
      const mid = a.materialId?._id || a.materialId;
      if (mid) s.add(String(mid));
    }
    return s;
  }, [lowStockAlerts]);

  // Helper to safely extract id string
  const toIdStr = (val) => {
    if (!val) return '';
    if (typeof val === 'object') {
      if (val._id) return toIdStr(val._id);
      if (val.id) return toIdStr(val.id);
      if (val.$oid) return String(val.$oid);
      if (typeof val.toHexString === 'function') return val.toHexString();
      return '';
    }
    return String(val);
  };

  // Unify and build stock rows
  const unifiedStockRows = useMemo(() => {
    const rows = [];
    const challanById = new Map(
      inboundChallans
        .map((challan) => [toIdStr(challan), challan])
        .filter(([id]) => id),
    );

    // A. Current Warehouse Balances (with linked Inbound Challans via lots)
    for (const b of balances) {
      const mat = b.materialId;
      const lot = b.lotId;
      const linkedChallan =
        challanById.get(toIdStr(lot?.inboundChallanId)) ||
        (typeof lot?.inboundChallanId === 'object' ? lot.inboundChallanId : null);
      const cust =
        b.customerId ||
        lot?.customerId ||
        linkedChallan?.customerId ||
        null;

      const dateStr =
        linkedChallan?.customerChallanDate ||
        lot?.receivedDate ||
        b.updatedAt ||
        b.createdAt;

      rows.push({
        id: `bal-${b._id}`,
        sourceType: 'INVENTORY_LOT',
        challanType: 'INBOUND',
        challanNumber:
          linkedChallan?.customerChallanNumber ||
          linkedChallan?.challanNumber ||
          lot?.lotNumber ||
          'STOCK-LOT',
        challanDate: dateStr ? new Date(dateStr) : null,
        companyName: cust?.name || (b.ownerType === 'FACTORY' ? 'In-House Factory' : 'Party Stock'),
        customerId: toIdStr(cust),
        materialId: toIdStr(mat),
        materialName: mat?.name || 'Raw Material',
        materialCode: mat?.code || '',
        unit: mat?.baseUnit || b.unit || 'KG',
        warehouseName: b.warehouseId?.name || 'Main Warehouse',
        receivedQuantity: lot?.initialQuantity || 0,
        totalQuantity: b.quantityOnHand || 0,
        frozenQuantity: b.quantityReserved || 0,
        freeAvailableQuantity: b.quantityAvailable || 0,
        scrapQuantity: 0,
        status: b.quantityAvailable > 0 ? 'AVAILABLE' : 'RESERVED',
        rawRecord: b,
        customerObj: cust && typeof cust === 'object' ? cust : null,
        materialObj: mat && typeof mat === 'object' ? mat : null,
      });
    }

    // B. Outbound Challans (cable drums / material returns / dispatches)
    for (const oc of outboundChallans) {
      const cust = oc.customerId;
      const dateVal = oc.challanDate || oc.createdAt;
      const totalQty = oc.totalLengthMeters || oc.totalNetWeightKg || 0;
      const item0 = oc.items?.[0];

      rows.push({
        id: `out-${oc._id}`,
        sourceType: 'OUTBOUND_DISPATCH',
        challanType: 'OUTBOUND',
        challanNumber: oc.challanNumber,
        challanDate: dateVal ? new Date(dateVal) : null,
        companyName: cust?.name || 'Party Delivery',
        customerId: toIdStr(cust),
        materialId: toIdStr(item0?.productId),
        materialName: item0?.productName || oc.sizeDescription || 'Cable Dispatch',
        materialCode: item0?.productCode || oc.workOrderNumber || '',
        unit: oc.totalLengthMeters ? 'MTR' : 'KG',
        warehouseName: 'Dispatch Yard',
        totalQuantity: totalQty,
        frozenQuantity: 0,
        freeAvailableQuantity: 0,
        scrapQuantity: 0,
        status: oc.status || 'ISSUED',
        rawRecord: oc,
        customerObj: cust && typeof cust === 'object' ? cust : null,
        materialObj: item0?.productId ? { _id: item0.productId, name: item0.productName, code: item0.productCode } : null,
      });
    }

    return rows;
  }, [balances, inboundChallans, outboundChallans]);

  // Apply User Multi-Filters
  const filteredRows = useMemo(() => {
    return unifiedStockRows.filter((row) => {
      // 1. Low stock filter toggle
      if (lowStockOnly) {
        if (!row.materialId || !lowStockMaterialIdSet.has(row.materialId)) {
          return false;
        }
      }

      // 2. Company / Customer filter
      if (customerFilter && customerFilter !== 'ALL') {
        if (customerFilter === 'FACTORY') {
          if (row.customerId) return false;
        } else if (toIdStr(row.customerId) !== toIdStr(customerFilter)) {
          return false;
        }
      }

      // 3. Material filter
      if (materialFilter && materialFilter !== 'ALL') {
        if (toIdStr(row.materialId) !== toIdStr(materialFilter)) return false;
      }

      // 4. Challan Type (Inbound vs Outbound)
      if (challanTypeFilter && challanTypeFilter !== 'ALL') {
        if (row.challanType !== challanTypeFilter) return false;
      }

      // 5. Date Range
      if (startDate && row.challanDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (row.challanDate < s) return false;
      }
      if (endDate && row.challanDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (row.challanDate > e) return false;
      }

      // 6. Text Search (Material, Code, Challan Number, Company)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesChallan = row.challanNumber?.toLowerCase().includes(q);
        const matchesMat =
          row.materialName?.toLowerCase().includes(q) ||
          row.materialCode?.toLowerCase().includes(q);
        const matchesComp = row.companyName?.toLowerCase().includes(q);
        if (!matchesChallan && !matchesMat && !matchesComp) return false;
      }

      return true;
    });
  }, [
    unifiedStockRows,
    customerFilter,
    materialFilter,
    challanTypeFilter,
    startDate,
    endDate,
    lowStockOnly,
    search,
    lowStockMaterialIdSet,
  ]);

  // Calculate Aggregates for filtered result
  const aggregates = useMemo(() => {
    let totalMaterial = 0;
    let freezeMaterial = 0;
    let freeAvailableMaterial = 0;

    for (const r of filteredRows) {
      if (r.challanType === 'INBOUND') {
        totalMaterial += r.totalQuantity || 0;
        freezeMaterial += r.frozenQuantity || 0;
        freeAvailableMaterial += r.freeAvailableQuantity || 0;
      }
    }

    // Scrap records calculation filtered by company and date if specified
    let scrapMaterial = 0;
    for (const sc of scrapRecords) {
      if (customerFilter && customerFilter !== 'ALL' && customerFilter !== 'FACTORY') {
        const cId = toIdStr(sc.customerId);
        if (cId !== toIdStr(customerFilter)) continue;
      }
      if (materialFilter && materialFilter !== 'ALL') {
        const mId = toIdStr(sc.materialId);
        if (mId !== toIdStr(materialFilter)) continue;
      }
      if (startDate && sc.recordedAt) {
        if (new Date(sc.recordedAt) < new Date(startDate)) continue;
      }
      if (endDate && sc.recordedAt) {
        if (new Date(sc.recordedAt) > new Date(endDate)) continue;
      }
      scrapMaterial += sc.scrapQuantity || 0;
    }

    return {
      totalMaterial: Number(totalMaterial.toFixed(2)),
      freezeMaterial: Number(freezeMaterial.toFixed(2)),
      freeAvailableMaterial: Number(freeAvailableMaterial.toFixed(2)),
      scrapMaterial: Number(scrapMaterial.toFixed(2)),
    };
  }, [filteredRows, scrapRecords, customerFilter, materialFilter, startDate, endDate]);

  // Handle clicking a row to open details modal
  const handleRowClick = (row) => {
    if (row.materialId) {
      const mat =
        row.materialObj ||
        materials.find((m) => toIdStr(m) === toIdStr(row.materialId)) || {
          _id: row.materialId,
          name: row.materialName,
          code: row.materialCode,
          baseUnit: row.unit,
        };
      setSelectedMaterialForStock({
        ...mat,
        stockContext: {
          lotId: toIdStr(row.rawRecord?.lotId),
          challanNumber: row.challanNumber,
        },
      });
    } else if (row.customerId) {
      const cust =
        row.customerObj ||
        customers.find((c) => toIdStr(c) === toIdStr(row.customerId)) || {
          _id: row.customerId,
          name: row.companyName,
        };
      setSelectedCustomer(cust);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setCustomerFilter('ALL');
    setMaterialFilter('ALL');
    setChallanTypeFilter('ALL');
    setStartDate('');
    setEndDate('');
    setLowStockOnly(false);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    customerFilter !== 'ALL' ||
    materialFilter !== 'ALL' ||
    challanTypeFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    lowStockOnly;

  // Derive unique customer options directly from master customers and active stock
  const customerOptions = useMemo(() => {
    const list = [
      { value: 'ALL', label: 'All Companies / Customers' },
      { value: 'FACTORY', label: 'Factory / In-House Stock' },
    ];
    const seen = new Set();

    // From master customers
    for (const c of customers) {
      const id = toIdStr(c);
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          value: id,
          label: c.name || 'Customer',
          subLabel: c.code ? `Code: ${c.code}` : undefined,
        });
      }
    }

    // From rows if not in master
    for (const r of unifiedStockRows) {
      if (r.customerId && !seen.has(r.customerId)) {
        seen.add(r.customerId);
        list.push({
          value: r.customerId,
          label: r.companyName || 'Customer',
        });
      }
    }

    // Inbound challans are the source of ownership when a balance has no
    // direct customer reference.
    for (const challan of inboundChallans) {
      const id = toIdStr(challan.customerId);
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          value: id,
          label: challan.customerId?.name || 'Customer',
          subLabel: challan.customerId?.code
            ? `Code: ${challan.customerId.code}`
            : undefined,
        });
      }
    }

    return list;
  }, [customers, inboundChallans, unifiedStockRows]);

  // Derive unique material options directly from master materials and active stock
  const materialOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Raw Materials' }];
    const seen = new Set();

    // From master materials
    for (const m of materials) {
      const id = toIdStr(m);
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          value: id,
          label: `${m.name || 'Material'} (${m.code || 'NO-CODE'})`,
          subLabel: `${m.category || 'MATERIAL'} • ${m.baseUnit || 'KG'}`,
        });
      }
    }

    // From rows if not in master
    for (const r of unifiedStockRows) {
      if (r.materialId && !seen.has(r.materialId)) {
        seen.add(r.materialId);
        list.push({
          value: r.materialId,
          label: `${r.materialName} (${r.materialCode || 'STOCK'})`,
          subLabel: r.unit,
        });
      }
    }

    return list;
  }, [materials, unifiedStockRows]);

  return (
    <div className="space-y-5 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-indigo-600" />
            Stock &amp; Challan Inventory Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time material stock, active inward/outward challans, and yard balances. Click any row to view breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Low Stock Toggle Button */}
          <Button
            type="button"
            variant={lowStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLowStockOnly((prev) => !prev)}
            className={`h-9 px-3 gap-1.5 text-xs font-semibold cursor-pointer ${lowStockOnly
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'border-rose-200 text-rose-700 hover:bg-rose-50 bg-white'
              }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Low Stock
            {lowStockAlerts.length > 0 && (
              <Badge
                variant="outline"
                className={`ml-1 text-[10px] px-1.5 py-0 ${lowStockOnly
                    ? 'bg-white text-rose-700 border-white'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
              >
                {lowStockAlerts.length}
              </Badge>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 px-3 gap-1.5 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards: Dynamic based on applied filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Total Material</span>
              <Boxes className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {aggregates.totalMaterial.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total stock on hand</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Freeze / Reserved</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
              {aggregates.freezeMaterial.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Committed in Work Orders</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Free Available</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {aggregates.freeAvailableMaterial.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Ready for production</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Scrap Material</span>
              <Recycle className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-purple-700 mt-1">
              {aggregates.scrapMaterial.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Process loss &amp; scrap logged</div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Filter Bar */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-visible relative z-30">
        <CardContent className="p-4 space-y-3 overflow-visible">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Inventory &amp; Challan Filters
            </span>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Quick Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Challan #, material..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            {/* Company / Customer */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Company / Customer</label>
              <SearchableSelect
                options={customerOptions}
                value={customerFilter}
                onChange={(val) => setCustomerFilter(val || 'ALL')}
                placeholder="All Companies"
                searchPlaceholder="Search company..."
                className="h-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* Material */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Material</label>
              <SearchableSelect
                options={materialOptions}
                value={materialFilter}
                onChange={(val) => setMaterialFilter(val || 'ALL')}
                placeholder="All Materials"
                searchPlaceholder="Search material..."
                className="h-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* Challan Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Challan Direction</label>
              <Select value={challanTypeFilter} onValueChange={setChallanTypeFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200 text-slate-800">
                  <SelectValue placeholder="All Challans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Challans</SelectItem>
                  <SelectItem value="INBOUND" className="text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Inbound Challans
                    </span>
                  </SelectItem>
                  <SelectItem value="OUTBOUND" className="text-xs">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Outbound Challans
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stock & Challan Inventory Table */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Inventory Records ({filteredRows.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Click any record to inspect detailed lots, warehouse balances, or customer stock overview.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-700 py-3">Challan &amp; Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 py-3">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 py-3">Company / Party</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 py-3">Material Name &amp; Code</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right py-3">Received Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right py-3">Total Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right py-3">Freeze Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right py-3">Free Available</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-center py-3">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-xs text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                        Loading stock &amp; challan records...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-xs text-slate-500">
                      No matching stock or challan records found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      {/* Challan & Date */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                          <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{row.challanNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {row.challanDate ? row.challanDate.toLocaleDateString() : 'Active Stock'}
                        </div>
                      </TableCell>

                      {/* Direction */}
                      <TableCell className="py-3">
                        {row.challanType === 'INBOUND' ? (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                            <ArrowDownLeft className="w-3 h-3" />
                            Inbound
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            Outbound
                          </Badge>
                        )}
                      </TableCell>

                      {/* Company */}
                      <TableCell className="py-3">
                        <div className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{row.companyName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pl-5">
                          {row.warehouseName}
                        </div>
                      </TableCell>

                      {/* Material */}
                      <TableCell className="py-3">
                        <div className="text-xs font-semibold text-slate-900">
                          {row.materialName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {row.materialCode}
                        </div>
                      </TableCell>

                      {/* Received Qty */}
                      <TableCell className="py-3 text-right font-mono font-bold text-xs text-indigo-700">
                        {row.receivedQuantity > 0 ? (
                          <>
                            {row.receivedQuantity.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-indigo-600/70">{row.unit}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </TableCell>

                      {/* Total Qty */}
                      <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                        {row.totalQuantity.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">{row.unit}</span>
                      </TableCell>

                      {/* Freeze Qty */}
                      <TableCell className="py-3 text-right font-mono text-xs text-amber-700 font-semibold">
                        {row.frozenQuantity > 0 ? (
                          <>
                            {row.frozenQuantity.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-amber-600/70">{row.unit}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </TableCell>

                      {/* Free Available Qty */}
                      <TableCell className="py-3 text-right font-mono font-bold text-xs text-emerald-700">
                        {row.freeAvailableQuantity > 0 ? (
                          <>
                            {row.freeAvailableQuantity.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-emerald-600/70">{row.unit}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${row.freeAvailableQuantity > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.frozenQuantity > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Stock Overview Dialog */}
      {selectedCustomer && (
        <CustomerStockOverviewDialog
          customer={selectedCustomer}
          open={Boolean(selectedCustomer)}
          onOpenChange={(val) => !val && setSelectedCustomer(null)}
        />
      )}

      {/* Specific Material Stock Details Slide-over Drawer */}
      {selectedMaterialForStock && (
        <MaterialStockDetailsDialog
          material={selectedMaterialForStock}
          open={Boolean(selectedMaterialForStock)}
          onOpenChange={(val) => !val && setSelectedMaterialForStock(null)}
        />
      )}
    </div>
  );
}
