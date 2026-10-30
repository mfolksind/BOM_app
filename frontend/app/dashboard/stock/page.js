'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

import { CustomerStockOverviewDialog } from '@/components/customers/customer-stock-overview-dialog';
import { MaterialStockDetailsDialog } from '@/components/stock/material-stock-details-dialog';

import {
  Warehouse,
  Boxes,
  Package,
  Layers,
  Search,
  RefreshCw,
  FilterX,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';

export default function GlobalStockDashboardPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [activeTab, setActiveTab] = useState('materials');
  const [isLoading, setIsLoading] = useState(true);
  const [isBalancesLoading, setIsBalancesLoading] = useState(true);
  const [materialSummaries, setMaterialSummaries] = useState([]);
  const [isMaterialSummariesLoading, setIsMaterialSummariesLoading] = useState(true);

  // Filters for Balances
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [materials, setMaterials] = useState([]);

  // Filters for Material-Wise Global Stock
  const [matSearch, setMatSearch] = useState('');
  const [matCategoryFilter, setMatCategoryFilter] = useState('ALL');

  // Pagination for Balances
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  // Modal for Customer Stock & Material Details
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedMaterialForStock, setSelectedMaterialForStock] = useState(null);

  // Fetch Master Data (Warehouses, Customers, Materials)
  const fetchMasters = async () => {
    try {
      const [whRes, custRes, matRes] = await Promise.all([
        apiClient('/warehouses?limit=100'),
        apiClient('/customers?limit=100'),
        apiClient('/materials?limit=100'),
      ]);
      if (whRes.data) setWarehouses(whRes.data);
      if (custRes.data) setCustomers(custRes.data);
      if (matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : (matRes.data.items || []));
      }
    } catch (err) {
      console.error('Failed to load masters for stock dashboard', err);
    }
  };

  // Fetch Material-wise Global Stock Aggregation
  const fetchMaterialSummaries = async () => {
    setIsMaterialSummariesLoading(true);
    try {
      const res = await apiClient('/inventory/material-summary');
      if (res.data) {
        setMaterialSummaries(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to load material global summaries', err);
    } finally {
      setIsMaterialSummariesLoading(false);
    }
  };

  // Fetch Global Summary KPIs
  const fetchSummary = async () => {
    try {
      const res = await apiClient('/inventory/summary');
      if (res.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error('Failed to load inventory summary', err);
    }
  };

  // Fetch Balances with pagination and filters
  const fetchBalances = useCallback(
    async (page = pagination.page) => {
      setIsBalancesLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', pagination.limit.toString());

        if (warehouseFilter !== 'ALL') params.append('warehouseId', warehouseFilter);
        if (ownerFilter !== 'ALL') params.append('ownerType', ownerFilter);
        if (customerFilter !== 'ALL') params.append('customerId', customerFilter);
        if (materialFilter !== 'ALL') params.append('materialId', materialFilter);

        const res = await apiClient(`/inventory/balances?${params.toString()}`);
        if (res.data) {
          let items = res.data.items || [];
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            items = items.filter(
              (b) =>
                b.materialId?.name?.toLowerCase().includes(q) ||
                b.materialId?.code?.toLowerCase().includes(q) ||
                b.customerId?.name?.toLowerCase().includes(q)
            );
          }
          setBalances(items);
          if (res.data.total !== undefined) {
            setPagination((prev) => ({
              ...prev,
              page: res.data.page,
              total: res.data.total,
              totalPages: res.data.totalPages,
            }));
          }
        }
      } catch (err) {
        toast.error('Failed to load stock balances', {
          description: err.message,
        });
      } finally {
        setIsBalancesLoading(false);
      }
    },
    [pagination.limit, pagination.page, warehouseFilter, ownerFilter, customerFilter, materialFilter, search]
  );

  // Fetch Recent Transactions Ledger
  const fetchTransactions = async () => {
    try {
      const res = await apiClient('/inventory/transactions?limit=25');
      if (res.data && res.data.items) {
        setTransactions(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load inventory transactions', err);
    }
  };

  // Fetch Low Stock Alerts
  const fetchLowStock = async () => {
    try {
      const res = await apiClient('/inventory/low-stock');
      if (res.data) {
        setLowStockAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to load low stock alerts', err);
    }
  };

  useEffect(() => {
    fetchMasters();
    fetchSummary();
    fetchMaterialSummaries();
    fetchLowStock();
  }, []);

  useEffect(() => {
    fetchBalances(1);
  }, [warehouseFilter, ownerFilter, customerFilter, materialFilter, search]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchTransactions();
    }
  }, [activeTab]);

  const summary = summaryData?.summary || summaryData?.stock || {};
  const ownerBreakdown = summaryData?.ownerTypeBreakdown || [];
  const factoryStock = summary.factoryOnHand ?? (ownerBreakdown.find((b) => b._id === 'FACTORY')?.totalOnHand || 0);
  const customerStock = summary.customerOnHand ?? (ownerBreakdown.find((b) => b._id === 'CUSTOMER')?.totalOnHand || 0);

  const filteredMaterialSummaries = materialSummaries.filter((m) => {
    const matchesSearch =
      !matSearch.trim() ||
      m.material?.name?.toLowerCase().includes(matSearch.trim().toLowerCase()) ||
      m.material?.code?.toLowerCase().includes(matSearch.trim().toLowerCase());
    const matchesCategory =
      matCategoryFilter === 'ALL' ||
      m.material?.category === matCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-indigo-600" />
            Global Stock &amp; Warehouse Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time warehouse material balances, customer-owned job work stocks, reserved WIP allocations, and inventory movements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSummary();
              fetchBalances(pagination.page);
              if (activeTab === 'ledger') fetchTransactions();
              toast.success('Inventory balances updated');
            }}
            disabled={isBalancesLoading}
            className="h-9 px-3 gap-1.5 border-slate-200 text-slate-700 bg-white shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBalancesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards (Clean, Professional, Unified Numbers) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Total Stock On-Hand
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {summary.totalOnHand ? summary.totalOnHand.toLocaleString('en-IN') : '0.00'}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">All materials across all plants</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Customer Job-Work Stock
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {customerStock ? customerStock.toLocaleString('en-IN') : '0.00'}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Received on Inbound Challans</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Factory Owned Stock
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {factoryStock ? factoryStock.toLocaleString('en-IN') : '0.00'}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Internal factory purchases</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Reserved in Production
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {summary.totalReserved ? summary.totalReserved.toLocaleString('en-IN') : '0.00'}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Committed to active Work Orders</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Free Available Stock
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {summary.totalAvailable ? summary.totalAvailable.toLocaleString('en-IN') : '0.00'}
              <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Ready for new production</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'materials'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Material-Wise Global Stock ({materialSummaries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'balances'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Warehouse Balances ({pagination.total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'customers'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Customer Job-Work Stocks ({customers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Live Ledger &amp; Movements
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low-stock')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'low-stock'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          Low Stock Alerts ({lowStockAlerts.length})
        </button>
      </div>

      {/* Tab 0: Material-Wise Global Stock Aggregation */}
      {activeTab === 'materials' && (
        <Card className="border-t-0 rounded-t-none shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search material name or code..."
                  value={matSearch}
                  onChange={(e) => setMatSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Select value={matCategoryFilter} onValueChange={setMatCategoryFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
                    <SelectItem value="RAW_MATERIAL" className="text-xs">Raw Material</SelectItem>
                    <SelectItem value="CONDUCTOR" className="text-xs">Conductor</SelectItem>
                    <SelectItem value="INSULATION" className="text-xs">Insulation</SelectItem>
                    <SelectItem value="SHEATHING" className="text-xs">Sheathing</SelectItem>
                    <SelectItem value="PACKING" className="text-xs">Packing Material</SelectItem>
                    <SelectItem value="FINISHED_GOODS" className="text-xs">Finished Goods</SelectItem>
                  </SelectContent>
                </Select>

                {(matSearch || matCategoryFilter !== 'ALL') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMatSearch('');
                      setMatCategoryFilter('ALL');
                    }}
                    className="h-9 px-2 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <FilterX className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700">Material Details</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Category</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Base Unit</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Global On-Hand</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Reserved in WIP</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Free Available</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Ownership Breakdown</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isMaterialSummariesLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8} className="py-4 text-center text-xs text-slate-400">
                          Loading global material stocks...
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredMaterialSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        No materials found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterialSummaries.map((item) => (
                      <TableRow key={item._id} className="hover:bg-slate-50/60">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">
                            {item.material?.name || 'Material'}
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {item.material?.code}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.material?.category || 'RAW_MATERIAL'}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 text-xs font-mono font-medium text-slate-700">
                          {item.material?.baseUnit || 'KG'}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                          {item.totalOnHand?.toLocaleString('en-IN')}{' '}
                          <span className="text-slate-500 font-normal">{item.material?.baseUnit || 'KG'}</span>
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-medium text-xs text-slate-900">
                          {item.totalReserved > 0 ? (
                            <span>
                              {item.totalReserved?.toLocaleString('en-IN')}{' '}
                              <span className="text-slate-500 font-normal">{item.material?.baseUnit || 'KG'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">0.00</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                          {item.totalAvailable?.toLocaleString('en-IN')}{' '}
                          <span className="text-slate-500 font-normal">{item.material?.baseUnit || 'KG'}</span>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <span className="text-slate-700">
                              <span className="text-slate-500">Customer:</span>{' '}
                              <span className="font-mono font-bold text-slate-900">{item.customerOnHand?.toLocaleString('en-IN') || '0'}</span>
                            </span>
                            <span className="text-slate-700">
                              <span className="text-slate-500">Factory:</span>{' '}
                              <span className="font-mono font-bold text-slate-900">{item.factoryOnHand?.toLocaleString('en-IN') || '0'}</span>
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedMaterialForStock(item)}
                            className="h-8 px-2.5 text-xs font-medium gap-1 text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Specifics
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Material Balances Table */}
      {activeTab === 'balances' && (
        <Card className="border-t-0 rounded-t-none shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search material code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Warehouse */}
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-[170px] h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Warehouses</SelectItem>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh._id} value={wh._id} className="text-xs">
                        {wh.name} ({wh.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Owner Type */}
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Ownership</SelectItem>
                    <SelectItem value="CUSTOMER" className="text-xs">Customer Job-Work</SelectItem>
                    <SelectItem value="FACTORY" className="text-xs">Factory Owned</SelectItem>
                  </SelectContent>
                </Select>

                {/* Customer Filter */}
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Material Filter */}
                <Select value={materialFilter} onValueChange={setMaterialFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Materials</SelectItem>
                    {materials.map((m) => (
                      <SelectItem key={m._id} value={m._id} className="text-xs">
                        {m.name} ({m.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(search || warehouseFilter !== 'ALL' || ownerFilter !== 'ALL' || customerFilter !== 'ALL' || materialFilter !== 'ALL') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setWarehouseFilter('ALL');
                      setOwnerFilter('ALL');
                      setCustomerFilter('ALL');
                      setMaterialFilter('ALL');
                    }}
                    className="h-9 px-2 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <FilterX className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Category</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Warehouse</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Ownership / Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">On-Hand</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Reserved</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Available Free</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isBalancesLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="py-4 text-center text-xs text-slate-400">
                          Loading inventory balances...
                        </TableCell>
                      </TableRow>
                    ))
                  ) : balances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                        No material stock balances match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    balances.map((b, idx) => (
                      <TableRow key={b._id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">
                            {b.materialId?.name || 'Raw Material'}
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {b.materialId?.code}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-600">
                          {b.materialId?.category || 'RAW_MATERIAL'}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-700 font-medium">
                          {b.warehouseId?.name || 'Main Warehouse'}
                        </TableCell>

                        <TableCell className="py-3">
                          {b.ownerType === 'CUSTOMER' ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full w-fit">
                                <Building2 className="w-3 h-3" />
                                {b.customerId?.name || 'Customer Job-Work'}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full w-fit">
                              Factory Owned
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                          {b.quantityOnHand?.toLocaleString('en-IN')}{' '}
                          <span className="text-slate-500 font-normal">{b.materialId?.baseUnit || 'KG'}</span>
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-medium text-xs text-slate-900">
                          {b.quantityReserved > 0 ? (
                            <span>
                              {b.quantityReserved?.toLocaleString('en-IN')}{' '}
                              <span className="text-slate-500 font-normal">{b.materialId?.baseUnit || 'KG'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">0.00</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                          {b.quantityAvailable?.toLocaleString('en-IN')}{' '}
                          <span className="text-slate-500 font-normal">{b.materialId?.baseUnit || 'KG'}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-600">
              <span>
                Showing Page <span className="font-semibold text-slate-900">{pagination.page}</span>{' '}
                of <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span>{' '}
                ({pagination.total} total items)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBalances(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isBalancesLoading}
                  className="h-8 px-2.5 border-slate-200 cursor-pointer text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBalances(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isBalancesLoading}
                  className="h-8 px-2.5 border-slate-200 cursor-pointer text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Customer Job-Work Stocks */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Card key={c._id} className="border-slate-200 hover:border-indigo-300 transition-all shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">{c.name}</CardTitle>
                  <CardDescription className="text-xs font-mono text-slate-500">{c.code}</CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono text-slate-600">
                  GSTIN: {c.gstin || 'N/A'}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-3 space-y-3">
                <div className="text-xs text-slate-600 flex justify-between">
                  <span>Contact:</span>
                  <span className="font-medium text-slate-900">{c.contactPerson || '—'} ({c.phone || '—'})</span>
                </div>
                <div className="text-xs text-slate-600 flex justify-between">
                  <span>City / State:</span>
                  <span className="text-slate-800">{c.billingAddress?.city || '—'}, {c.billingAddress?.state || '—'}</span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Button
                    size="sm"
                    onClick={() => setSelectedCustomer(c)}
                    className="w-full h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    View Customer Stock &amp; Challans
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Recent Transactions Ledger */}
      {activeTab === 'ledger' && (
        <Card className="border-t-0 rounded-t-none shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800">
              Live Material Transaction Movements
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Complete audit trail of receipts (Inbound Challans), batch WIP issues, and dispatches.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-700">Date &amp; Ref</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Warehouse</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Ownership / Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No material movements recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx, idx) => (
                    <TableRow key={tx._id || idx} className="hover:bg-slate-50/50">
                      <TableCell className="py-2.5">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {tx.transactionNumber || tx.sourceDocumentNumber || 'TXN'}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {tx.postedAt ? new Date(tx.postedAt).toLocaleString('en-IN') : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-900 font-medium">
                        {tx.materialId?.name || 'Raw Material'}
                        <div className="font-mono text-[10px] text-slate-400">{tx.materialId?.code}</div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            tx.transactionType === 'INBOUND_RECEIPT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.transactionType === 'PRODUCTION_ISSUE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {tx.transactionType}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {tx.warehouseId?.name || 'Warehouse'}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {tx.customerId?.name || 'Factory'}
                      </TableCell>
                      <TableCell
                        className={`py-2.5 text-right font-mono font-bold text-xs ${
                          tx.quantity > 0 ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.materialId?.baseUnit || 'KG'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Low Stock Alerts */}
      {activeTab === 'low-stock' && (
        <Card className="border-t-0 rounded-t-none shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Safety Stock &amp; Reorder Level Breaches
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Materials whose current on-hand quantity is below the minimum threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-700">Material Name &amp; Code</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Warehouse</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right">Current Available</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right">Min Threshold</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 text-right">Deficit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-xs text-emerald-700 font-medium">
                      All material balances are healthy above safety reorder thresholds!
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockAlerts.map((alert, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50">
                      <TableCell className="py-3 text-xs font-medium text-slate-900">
                        {alert.materialName || alert.materialId?.name}
                        <div className="font-mono text-[10px] text-slate-400">{alert.materialCode}</div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-700">
                        {alert.warehouseName || 'All Warehouses'}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono font-bold text-xs text-rose-700">
                        {alert.currentStock} {alert.baseUnit || 'KG'}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-slate-600">
                        {alert.minStockThreshold} {alert.baseUnit || 'KG'}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono font-bold text-xs text-rose-600">
                        -{alert.shortageQuantity} {alert.baseUnit || 'KG'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
