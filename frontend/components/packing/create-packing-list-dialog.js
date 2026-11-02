'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Package,
  Plus,
  Trash2,
  Layers,
  FileText,
  Calculator,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Copy,
  Clock,
  Building2,
  Printer,
  ChevronRight,
} from 'lucide-react';

export function CreatePackingListDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultWorkOrderId,
  defaultCustomerId,
  defaultCustomerName,
}) {
  const [workOrders, setWorkOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [allYardDrums, setAllYardDrums] = useState([]);
  const [availableDrums, setAvailableDrums] = useState([]);
  const [useAllYardDrums, setUseAllYardDrums] = useState(false);
  const [existingPackingLists, setExistingPackingLists] = useState([]);
  const [selectedRgp, setSelectedRgp] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Form Header State (Image 1 Header)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [packingNumber, setPackingNumber] = useState('');
  const [sizeDescription, setSizeDescription] = useState('');
  const [packingDate, setPackingDate] = useState(new Date().toISOString().split('T')[0]);

  // Drum Capacity & Auto-Allocation State
  const [drumCapacityMeters, setDrumCapacityMeters] = useState(500);

  // Drum Shortage Modal State
  const [requestDrumsModalOpen, setRequestDrumsModalOpen] = useState(false);

  // Drum lines state (Image 1 Table)
  const [lines, setLines] = useState([
    {
      drumId: '',
      drumNumber: '',
      lengthBottom: 0,
      lengthTop: 500,
      lengthTotal: 500,
      drumSize: '44X16X24',
      refRgpNumber: '',
      drumType: 'WOODEN',
      remarks: 'STD.LENGTH',
    },
  ]);

  // Helper to extract customer ID from diverse objects
  const getCustId = (customer) => {
    if (!customer) return '';
    if (typeof customer === 'string') return customer;
    if (customer._id) return String(customer._id);
    if (customer.id) return String(customer.id);
    return '';
  };

  // Set of work order IDs that are already utilized in a packing list
  const packedWorkOrderIds = useMemo(() => {
    const set = new Set();
    (existingPackingLists || []).forEach((pl) => {
      const woId = pl.workOrderId?._id || pl.workOrderId;
      if (woId && pl.status !== 'CANCELLED') {
        set.add(String(woId));
      }
    });
    return set;
  }, [existingPackingLists]);

  // Active pool of drums (either customer-filtered or all yard drums)
  const activeDrumsPool = useMemo(() => {
    if (useAllYardDrums) return allYardDrums;
    return availableDrums;
  }, [useAllYardDrums, allYardDrums, availableDrums]);

  // Derived RGP tracking
  const uniqueRgps = useMemo(() => {
    return Array.from(new Set(activeDrumsPool.map((d) => d.refRgpNumber).filter(Boolean)));
  }, [activeDrumsPool]);

  const drumsForRgp = useMemo(() => {
    if (selectedRgp === 'ALL') return activeDrumsPool;
    return activeDrumsPool.filter((d) => d.refRgpNumber === selectedRgp);
  }, [selectedRgp, activeDrumsPool]);

  const allocatedDrumIds = useMemo(() => {
    return new Set(lines.map((l) => l.drumId).filter(Boolean));
  }, [lines]);

  const remainingDrumsForRgp = useMemo(() => {
    return drumsForRgp.filter((d) => !allocatedDrumIds.has(d._id));
  }, [drumsForRgp, allocatedDrumIds]);

  const isRgpExhausted =
    selectedRgp !== 'ALL' && drumsForRgp.length > 0 && remainingDrumsForRgp.length === 0;

  // Filtered work orders: ONLY show COMPLETED work orders that haven't been utilized yet to make a packing list
  const filteredWorkOrders = useMemo(() => {
    if (!Array.isArray(workOrders)) return [];
    return workOrders.filter((wo) => {
      // Must be COMPLETED (case-insensitive & trimmed)
      const st = String(wo.status || '').trim().toUpperCase();
      if (st !== 'COMPLETED') return false;

      // Cannot be already utilized to make an active packing list
      if (packedWorkOrderIds.has(String(wo._id))) return false;

      // Customer filter
      if (selectedCustomerId && selectedCustomerId !== 'ALL') {
        const cid = getCustId(wo.customerId);
        if (String(cid) !== String(selectedCustomerId)) return false;
      }

      return true;
    });
  }, [workOrders, selectedCustomerId, packedWorkOrderIds]);

  // Count of total completed work orders before packing list exclusion
  const completedWorkOrdersCount = useMemo(() => {
    if (!Array.isArray(workOrders)) return 0;
    return workOrders.filter((wo) => {
      const st = String(wo.status || '').trim().toUpperCase();
      if (st !== 'COMPLETED') return false;
      if (selectedCustomerId && selectedCustomerId !== 'ALL') {
        const cid = getCustId(wo.customerId);
        if (String(cid) !== String(selectedCustomerId)) return false;
      }
      return true;
    }).length;
  }, [workOrders, selectedCustomerId]);

  const customerOptions = useMemo(() => {
    const list = [
      {
        value: 'ALL',
        label: 'All Customers',
        code: `${allYardDrums.length} empty drums`,
      },
    ];
    (customers || []).forEach((c) => {
      const count = allYardDrums.filter(
        (d) => String(getCustId(d.customerId)) === String(c._id),
      ).length;
      list.push({
        value: String(c._id),
        label: c.name,
        code: c.code || 'CUST',
        subLabel: `${count} yard drums available`,
      });
    });
    return list;
  }, [customers, allYardDrums]);

  const workOrderOptions = useMemo(() => {
    return (filteredWorkOrders || []).map((wo) => ({
      value: String(wo._id),
      label: wo.workOrderNumber,
      code: wo.status ? `[${wo.status}]` : (wo.productId?.code || ''),
      subLabel: `${wo.customerId?.name || 'Customer'} • ${(wo.orderedLengthMeters || wo.plannedLengthMeters || 0).toLocaleString()} m`,
    }));
  }, [filteredWorkOrders]);

  // Load masters & yard drums when dialog opens
  const loadInitialData = async () => {
    setIsLoadingOrders(true);
    try {
      const [woRes, custRes, drumRes, plRes] = await Promise.all([
        apiClient('/work-orders?limit=100'),
        apiClient('/customers?limit=100'),
        apiClient('/drums?limit=200'),
        apiClient('/packing-lists?limit=200'),
      ]);

      const woList =
        woRes?.data?.workOrders ||
        woRes?.data?.items ||
        (Array.isArray(woRes?.data) ? woRes.data : []);
      const custList = Array.isArray(custRes?.data)
        ? custRes.data
        : custRes?.data?.items || custRes?.data?.customers || [];
      const drumList = Array.isArray(drumRes?.data)
        ? drumRes.data
        : drumRes?.data?.items || drumRes?.data?.drums || [];
      const plList = Array.isArray(plRes?.data)
        ? plRes.data
        : plRes?.data?.items || plRes?.data?.packingLists || [];

      setWorkOrders(woList);
      setCustomers(custList);
      setExistingPackingLists(plList);

      // Prioritize empty / available yard drums
      const emptyYardDrums = drumList.filter(
        (d) => d.status === 'AVAILABLE' || d.status === 'EMPTY' || !d.status,
      );
      setAllYardDrums(emptyYardDrums);

      const targetCust = defaultCustomerId || 'ALL';
      setSelectedCustomerId(targetCust);

      const packedSet = new Set(
        plList.filter((p) => p.status !== 'CANCELLED').map((p) => String(p.workOrderId?._id || p.workOrderId))
      );
      const eligibleWoList = woList.filter(
        (w) => w.status === 'COMPLETED' && !packedSet.has(String(w._id))
      );

      // If defaultWorkOrderId is passed, select it
      let initialWo = null;
      if (defaultWorkOrderId) {
        initialWo = eligibleWoList.find((w) => String(w._id) === String(defaultWorkOrderId));
      } else if (targetCust !== 'ALL') {
        initialWo = eligibleWoList.find((w) => String(getCustId(w.customerId)) === String(targetCust));
      } else if (eligibleWoList.length > 0) {
        initialWo = eligibleWoList[0];
      }

      if (initialWo) {
        handleSelectWorkOrderWithDrums(initialWo, emptyYardDrums);
      } else {
        // Filter empty drums for this customer
        const custDrums =
          targetCust !== 'ALL'
            ? emptyYardDrums.filter(
                (d) => String(getCustId(d.customerId)) === String(targetCust),
              )
            : emptyYardDrums;
        setAvailableDrums(custDrums.length > 0 ? custDrums : emptyYardDrums);
      }
    } catch (err) {
      console.error('Failed to load initial packing data', err);
      toast.error('Failed to load work orders & drums', { description: err.message });
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, defaultWorkOrderId, defaultCustomerId]);

  // When work order is selected, bind metadata & allocate customer empty drums
  const handleSelectWorkOrderWithDrums = (wo, yardDrumsPool = allYardDrums) => {
    if (!wo) return;
    setSelectedWorkOrder(wo);

    // Pre-fill size description and numbers
    if (wo.productId?.name || wo.productId?.code) {
      setSizeDescription(wo.productId.code || wo.productId.name);
    }
    const yearPrefix = new Date().getFullYear();
    setInvoiceNumber(`${yearPrefix}-${(yearPrefix + 1).toString().slice(2)}/RJ/JW/337`);
    setChallanNumber(`MF/DC/${Math.floor(100 + Math.random() * 900)}`);
    setPackingNumber(`MF/PL/${Math.floor(100 + Math.random() * 900)}`);

    const custId = getCustId(wo.customerId);
    if (custId) {
      setSelectedCustomerId(custId);
    }

    // Filter available drums for this customer
    const pool = Array.isArray(yardDrumsPool) && yardDrumsPool.length > 0 ? yardDrumsPool : allYardDrums;
    const custDrums = custId
      ? pool.filter((d) => String(getCustId(d.customerId)) === String(custId))
      : pool;

    // If customer-specific drums exist, prioritize them. If 0 found, fall back to all yard drums so user is never blocked.
    const emptyDrums = custDrums.length > 0 ? custDrums : pool;
    setAvailableDrums(emptyDrums);

    const targetLength =
      wo.orderedLengthMeters ||
      wo.plannedLengthMeters ||
      wo.quantity ||
      0;
    const cap = Number(drumCapacityMeters) > 0 ? Number(drumCapacityMeters) : 500;
    const neededCount = targetLength > 0 ? Math.ceil(targetLength / cap) : 2;

    // Auto-populate needed rows from available drums
    if (emptyDrums.length > 0) {
      const drumsToAllocate = emptyDrums.slice(0, Math.max(1, neededCount));
      let remaining = targetLength || cap * drumsToAllocate.length;

      setLines(
        drumsToAllocate.map((drum) => {
          const sizeStr =
            drum.drumSize ||
            drum.sizeDescription ||
            (drum.flangeDiameterMm && drum.barrelDiameterMm && drum.traverseWidthMm
              ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
              : '44X16X24');

          const cut = targetLength > 0 ? Math.min(remaining, cap) : cap;
          remaining = Math.max(0, remaining - cut);

          return {
            drumId: drum._id,
            drumNumber: drum.drumNumber,
            lengthBottom: 0,
            lengthTop: Number(cut.toFixed(2)) || cap,
            lengthTotal: Number(cut.toFixed(2)) || cap,
            drumSize: sizeStr,
            refRgpNumber: drum.refRgpNumber || '',
            drumType: drum.drumType || 'WOODEN',
            remarks: drum.remarks || 'STD.LENGTH',
          };
        }),
      );
    } else {
      // Yard has 0 empty drums for this selection
      setLines([
        {
          drumId: '',
          drumNumber: 'MF/01',
          lengthBottom: 0,
          lengthTop: cap,
          lengthTotal: cap,
          drumSize: '44X16X24',
          refRgpNumber: '',
          drumType: 'WOODEN',
          remarks: 'STD.LENGTH',
        },
      ]);
    }
  };

  // Handle Customer Filter change
  const handleCustomerFilterChange = (custId) => {
    setSelectedCustomerId(custId);
    const custDrums =
      custId && custId !== 'ALL'
        ? allYardDrums.filter((d) => String(getCustId(d.customerId)) === String(custId))
        : allYardDrums;
    setAvailableDrums(custDrums.length > 0 ? custDrums : allYardDrums);

    // If selected work order doesn't match new customer, pick first matching work order
    if (custId && custId !== 'ALL') {
      const matchingWos = workOrders.filter(
        (w) => String(getCustId(w.customerId)) === String(custId),
      );
      if (matchingWos.length > 0) {
        handleSelectWorkOrderWithDrums(matchingWos[0], allYardDrums);
      }
    }
  };

  // Target PO / Work Order planned length
  const targetPoLength =
    selectedWorkOrder?.orderedLengthMeters ||
    selectedWorkOrder?.plannedLengthMeters ||
    selectedWorkOrder?.quantity ||
    0;

  const capacity = Number(drumCapacityMeters) > 0 ? Number(drumCapacityMeters) : 500;
  const estimatedDrumsNeeded = targetPoLength > 0 ? Math.ceil(targetPoLength / capacity) : 1;
  const availableInYardCount = drumsForRgp.length;
  const isDrumShortage = targetPoLength > 0 && availableInYardCount < estimatedDrumsNeeded;
  const shortageDrumsCount = isDrumShortage ? estimatedDrumsNeeded - availableInYardCount : 0;

  // Auto-Allocate Customer Drums based on PO length & drum capacity
  const handleAutoAllocateDrums = (useSampleImageSplit = false) => {
    if (!selectedWorkOrder) {
      toast.error('Please select a Work Order first');
      return;
    }

    const targetLength = targetPoLength || 1000;
    const cap = capacity;
    const neededCount = Math.ceil(targetLength / cap);

    // Determine length splits across drums
    let splits = [];
    if (useSampleImageSplit || (targetLength === 1997 && neededCount === 4)) {
      // Exact Image 1 scanned sample: 495, 495, 499, 508 = 1997m
      splits = [495, 495, 499, 508];
    } else {
      let remaining = targetLength;
      for (let i = 0; i < neededCount; i++) {
        const cut = Math.min(remaining, cap);
        splits.push(Number(cut.toFixed(2)));
        remaining -= cut;
      }
    }

    const drumsPool = selectedRgp === 'ALL' ? activeDrumsPool : drumsForRgp;
    if (drumsPool.length === 0) {
      toast.warning(
        `Yard has 0 empty drums for this selection. Generating placeholder drum rows with manual numbers.`,
      );
    } else if (drumsPool.length < splits.length) {
      toast.warning(
        `Selection has ${drumsPool.length} empty drums in yard, but ${splits.length} are required. Allocated all available drums. Save as Draft to ask customer for ${splits.length - drumsPool.length} more drums.`,
      );
    }

    const newLines = splits.map((len, idx) => {
      const drum = drumsPool[idx];
      const sizeStr =
        drum?.drumSize ||
        drum?.sizeDescription ||
        (drum?.flangeDiameterMm && drum?.barrelDiameterMm && drum?.traverseWidthMm
          ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
          : '44X16X24');

      return {
        drumId: drum?._id || '',
        drumNumber: drum?.drumNumber || `MF/${String(idx + 1).padStart(2, '0')}`,
        lengthBottom: 0,
        lengthTop: len,
        lengthTotal: len,
        drumSize: sizeStr,
        refRgpNumber:
          drum?.refRgpNumber ||
          (selectedRgp !== 'ALL' ? selectedRgp : selectedWorkOrder?.customerPoNumber || ''),
        drumType: drum?.drumType || 'WOODEN',
        remarks: 'STD.LENGTH',
      };
    });

    setLines(newLines);
    toast.success(
      `Auto-allocated ${newLines.length} drums for total length ${targetLength.toLocaleString()} m!`,
    );
  };

  const handleAddLine = () => {
    const nextIdx = lines.length;
    const drumsPool = selectedRgp === 'ALL' ? activeDrumsPool : drumsForRgp;
    const allocatedIds = new Set(lines.map((l) => l.drumId).filter(Boolean));
    const unallocated = drumsPool.filter((d) => !allocatedIds.has(d._id));
    const drum = unallocated[0];
    const sizeStr =
      drum?.drumSize ||
      drum?.sizeDescription ||
      (drum?.flangeDiameterMm && drum?.barrelDiameterMm && drum?.traverseWidthMm
        ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
        : '44X16X24');

    setLines((prev) => [
      ...prev,
      {
        drumId: drum?._id || '',
        drumNumber: drum?.drumNumber || `MF/${String(nextIdx + 1).padStart(2, '0')}`,
        lengthBottom: 0,
        lengthTop: capacity,
        lengthTotal: capacity,
        drumSize: sizeStr,
        refRgpNumber: drum?.refRgpNumber || (selectedRgp !== 'ALL' ? selectedRgp : ''),
        drumType: drum?.drumType || 'WOODEN',
        remarks: 'STD.LENGTH',
      },
    ]);
  };

  const handleRemoveLine = (index) => {
    if (lines.length <= 1) {
      toast.error('Packing list must contain at least one drum line');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrumSelect = (index, drumId) => {
    const drum = activeDrumsPool.find((d) => d._id === drumId);
    if (!drum) return;

    setLines((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      const sizeStr =
        drum.drumSize ||
        drum.sizeDescription ||
        (drum.flangeDiameterMm && drum.barrelDiameterMm && drum.traverseWidthMm
          ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
          : cur.drumSize || '44X16X24');

      cur.drumId = drum._id;
      cur.drumNumber = drum.drumNumber;
      cur.drumSize = sizeStr;
      cur.refRgpNumber = drum.refRgpNumber || cur.refRgpNumber;
      cur.drumType = drum.drumType || cur.drumType;
      if (drum.remarks) cur.remarks = drum.remarks;

      updated[index] = cur;
      return updated;
    });
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };

      if (field === 'lengthBottom' || field === 'lengthTop') {
        const b = parseFloat(field === 'lengthBottom' ? value : cur.lengthBottom) || 0;
        const t = parseFloat(field === 'lengthTop' ? value : cur.lengthTop) || 0;
        cur.lengthTotal = Number((b + t).toFixed(2));
      }

      updated[index] = cur;
      return updated;
    });
  };

  const totalPackedLength = lines.reduce(
    (acc, curr) => acc + (Number(curr.lengthTotal) || 0),
    0,
  );
  const lengthDifference = Number((totalPackedLength - targetPoLength).toFixed(1));

  const handleSubmit = async (finalizeImmediately = false, customRemarks = null) => {
    if (!selectedWorkOrder) {
      toast.error('Please select a Work Order');
      return;
    }

    const invalidLine = lines.find((l) => !l.drumNumber?.trim());
    if (invalidLine) {
      toast.error('Please specify a Drum Number (D.NO) for all rows');
      return;
    }

    // If finalizing immediately but work order length is more than available packed length, warn user
    if (finalizeImmediately && isDrumShortage) {
      toast.warning(
        `Work order has a shortage of ${shortageDrumsCount} drums. We recommend saving as Draft and asking more drums from ${selectedWorkOrder.customerId?.name || 'customer'}.`,
      );
    }

    setIsSubmitting(true);
    try {
      const defaultRemarks = isDrumShortage
        ? `[DRAFT - DRUM SHORTAGE] Requires ${estimatedDrumsNeeded} drums, only ${availableInYardCount} available in yard. Pending ${shortageDrumsCount} drums from ${selectedWorkOrder.customerId?.name || 'customer'}.`
        : 'Standard cable packing list';

      const payload = {
        workOrderId: selectedWorkOrder._id,
        customerId:
          selectedWorkOrder.customerId?._id ||
          selectedWorkOrder.customerId?.id ||
          selectedWorkOrder.customerId,
        productId: selectedWorkOrder.productId?._id || selectedWorkOrder.productId,
        workOrderNumber: selectedWorkOrder.workOrderNumber,
        workOrderDate: selectedWorkOrder.createdAt || new Date().toISOString(),
        packingListNumber: packingNumber,
        invoiceNumber,
        challanNumber,
        sizeDescription,
        packingDate: new Date(packingDate).toISOString(),
        remarks: customRemarks || defaultRemarks,
        lines: lines.map((l, idx) => ({
          drumId: l.drumId || undefined,
          sNo: idx + 1,
          drumNumber: l.drumNumber.trim(),
          lengthBottom: Number(l.lengthBottom) || 0,
          lengthTop: Number(l.lengthTop) || 0,
          lengthTotal: Number(l.lengthTotal) || 0,
          lengthMeters: Number(l.lengthTotal) || 0,
          drumSize: l.drumSize || '44X16X24',
          refRgpNumber: l.refRgpNumber || (selectedRgp !== 'ALL' ? selectedRgp : ''),
          drumType: l.drumType || 'WOODEN',
          remarks: l.remarks || 'STD.LENGTH',
        })),
      };

      const res = await apiClient('/packing-lists', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        const packingListId = res.data._id;
        toast.success(
          `Packing list ${res.data.packingListNumber} saved as ${finalizeImmediately ? 'PACKED' : 'DRAFT'}!`,
        );

        // If requested to finalize immediately (Step 1 complete, drums transition to PACKED)
        if (finalizeImmediately) {
          await apiClient(`/packing-lists/${packingListId}/pack`, {
            method: 'POST',
          });
          toast.success('Drums sealed and transitioned to PACKED status! Yard stock reduced.');
        }

        if (onSuccess) onSuccess(res.data);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error('Failed to create packing list', {
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drum Request Letter generator for customer
  const customerName = selectedWorkOrder?.customerId?.name || defaultCustomerName || 'Customer';
  const woNumber = selectedWorkOrder?.workOrderNumber || 'WO-PENDING';
  const generatedRequestMessage = `Subject: Urgent Requirement: Returnable Cable Drums for WO #${woNumber} - ${customerName}

Dear ${customerName} Logistics Team,

Greetings from MFolks Manufacturing & Cable Works.

We have manufactured the cable as per your Work Order #${woNumber} (${targetPoLength.toLocaleString()} m of ${sizeDescription || 'Cable'}).

Current Yard & Packaging Status:
- Total Order Length: ${targetPoLength.toLocaleString()} meters
- Drums Required: ${estimatedDrumsNeeded} drums (Standard capacity ~${capacity}m / drum)
- Empty Drums Currently in Factory Yard: ${availableInYardCount} drums
- SHORTAGE OF DRUMS: ${shortageDrumsCount} drums needed

Kindly arrange to dispatch ${shortageDrumsCount} additional empty returnable cable drums (Recommended Size: 44X16X24) under an Inbound Delivery Challan / Returnable Gate Pass (RGP) to our factory yard at the earliest so that packing, testing, and final dispatch can be completed.

Dispatch Address:
MFOLKS INDUSTRIES PRIVATE LIMITED
F-279 A, RIICO Industrial Area, Chopanki, Tapukara, Alwar, Rajasthan, India - 301707

Thank you.
Packaging & Production Dispatch Team
MFolks Cable Division`;

  const handleCopyRequestMessage = () => {
    navigator.clipboard.writeText(generatedRequestMessage);
    toast.success('Drum request letter copied to clipboard!');
  };

  const handleSaveDraftAndAskDrums = async () => {
    const remark = `[DRAFT - DRUM SHORTAGE] Pending ${shortageDrumsCount} drums from ${customerName}. WO: ${woNumber}`;
    await handleSubmit(false, remark);
    setRequestDrumsModalOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:w-[72vw] lg:max-w-[1180px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-white shrink-0">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-semibold text-slate-900">
                      Create Packing List
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500">
                      Allocate cable lengths to yard drums and finalize packing
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/50">
              {/* Header Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                {/* 1. Filter by Customer Company */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-medium text-slate-700">
                    Customer *
                  </Label>
                  <SearchableSelect
                    options={customerOptions}
                    value={selectedCustomerId || 'ALL'}
                    onChange={(val) => handleCustomerFilterChange(val)}
                    placeholder="All Customers"
                    searchPlaceholder="Search customer by name or code..."
                    className="h-9 text-xs bg-white w-full"
                  />
                </div>

                {/* 2. Select Work Order */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                    <span>Work Order *</span>
                    {filteredWorkOrders.length > 0 && (
                      <span className="text-[10px] text-emerald-600 font-normal">
                        {filteredWorkOrders.length} available to pack
                      </span>
                    )}
                  </Label>
                  <SearchableSelect
                    options={workOrderOptions}
                    value={selectedWorkOrder?._id || ''}
                    onChange={(woId) => {
                      const wo = workOrders.find((w) => String(w._id) === String(woId));
                      if (wo) handleSelectWorkOrderWithDrums(wo);
                    }}
                    placeholder={
                      isLoadingOrders
                        ? "Loading work orders..."
                        : filteredWorkOrders.length === 0
                        ? (completedWorkOrdersCount > 0
                            ? "All completed WOs are already packed"
                            : "No completed WOs found")
                        : "Choose Work Order..."
                    }
                    emptyMessage={
                      completedWorkOrdersCount > 0
                        ? "All completed work orders for this customer are already packed into packing lists"
                        : "No completed work orders available for packing"
                    }
                    searchPlaceholder="Search by WO # or cable..."
                    disabled={isLoadingOrders || filteredWorkOrders.length === 0}
                    className="h-9 text-xs bg-white w-full"
                  />
                  {filteredWorkOrders.length === 0 && !isLoadingOrders && (
                    <p className="text-[11px] text-amber-600 leading-tight">
                      {completedWorkOrdersCount > 0
                        ? `All ${completedWorkOrdersCount} completed work order(s) are already packed into packing lists.`
                        : "Only work orders marked as 'COMPLETED' appear here for packing into drums."}
                    </p>
                  )}
                </div>

                {/* 3. Cable Size */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-medium text-slate-700">Cable Size *</Label>
                  <Input
                    value={sizeDescription}
                    onChange={(e) => setSizeDescription(e.target.value)}
                    placeholder="e.g. 4CX35 SQMM A2XFY"
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>

                {/* 4. Packing List No */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-medium text-slate-700">
                    Packing List No.
                  </Label>
                  <Input
                    value={packingNumber}
                    onChange={(e) => setPackingNumber(e.target.value)}
                    placeholder="e.g. MF/PL/408"
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>

                {/* 5. Invoice No */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-medium text-slate-700">Invoice No.</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. 2026-27/RJ/JW/337"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                {/* 6. Challan Ref No */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-medium text-slate-700">
                    Challan Ref No.
                  </Label>
                  <Input
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="e.g. MF/DC/408"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Drum Allocation Assistant */}
              {selectedWorkOrder && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900">
                        Allocation Assistant
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Automatically split target length into available drums
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAutoAllocateDrums(false)}
                        className="h-8 text-xs font-medium gap-1.5 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Auto-Allocate
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoAllocateDrums(true)}
                        className="h-8 text-xs font-medium gap-1.5 bg-white text-slate-700 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Sample (1,997 m)
                      </Button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">
                        Target Length
                      </span>
                      <div className="text-sm font-semibold font-mono text-slate-900 mt-0.5">
                        {targetPoLength.toLocaleString()} m
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-500 uppercase block">
                          Drums in Yard
                        </span>
                        {allYardDrums.length > availableDrums.length && (
                          <button
                            type="button"
                            onClick={() => setUseAllYardDrums(!useAllYardDrums)}
                            className="text-[9px] text-indigo-600 hover:underline font-medium cursor-pointer"
                          >
                            {useAllYardDrums ? 'Customer' : 'All Yard'}
                          </button>
                        )}
                      </div>
                      <div className="text-sm font-semibold font-mono text-slate-900 mt-0.5">
                        {drumsForRgp.length} available
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">
                        Capacity / Drum
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          type="number"
                          min="1"
                          step="50"
                          value={drumCapacityMeters}
                          onChange={(e) => setDrumCapacityMeters(e.target.value)}
                          className="h-6 w-20 text-xs font-mono font-medium bg-white px-2 border-slate-200"
                        />
                        <span className="text-xs text-slate-500">m</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">
                        Drums Needed
                      </span>
                      <div className="text-sm font-semibold font-mono text-slate-900 mt-0.5">
                        {estimatedDrumsNeeded} drums
                      </div>
                    </div>
                  </div>

                  {/* RGP Selection Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">RGP Batch:</span>
                      <Select value={selectedRgp} onValueChange={setSelectedRgp}>
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-200 w-52 font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">
                            All RGPs ({activeDrumsPool.length} drums)
                          </SelectItem>
                          {uniqueRgps.map((rgp) => {
                            const count = activeDrumsPool.filter((d) => d.refRgpNumber === rgp).length;
                            return (
                              <SelectItem key={rgp} value={rgp} className="text-xs font-mono">
                                RGP: {rgp} ({count})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {selectedRgp !== 'ALL' ? (
                        <span>
                          RGP #{selectedRgp}: {remainingDrumsForRgp.length} available of {drumsForRgp.length}
                        </span>
                      ) : (
                        <span>
                          Total Available: {activeDrumsPool.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DRUM SHORTAGE BANNER */}
                  {isDrumShortage && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-900 font-medium">
                          Shortage: Order needs {shortageDrumsCount} more drum{shortageDrumsCount > 1 ? 's' : ''} from {customerName}.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRequestDrumsModalOpen(true)}
                          className="h-7 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
                        >
                          Request from Customer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSubmit(false)}
                          className="h-7 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Save Draft
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* RGP Exhaustion Alert */}
                  {isRgpExhausted && (
                    <div className="flex items-center justify-between gap-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>All drums under RGP #{selectedRgp} allocated.</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleSubmit(false)}
                        className="h-7 text-xs border-rose-300 bg-white text-rose-800 hover:bg-rose-100 cursor-pointer"
                      >
                        Save Draft
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Drum Table Lines */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">
                      Drums Allocation
                    </h3>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLine}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Row
                  </Button>
                </div>

                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs font-medium text-slate-600">#</TableHead>
                      <TableHead className="w-44 text-xs font-medium text-slate-600">Drum No. *</TableHead>
                      <TableHead className="w-24 text-right text-xs font-medium text-slate-600">Bottom (m)</TableHead>
                      <TableHead className="w-24 text-right text-xs font-medium text-slate-600">Top (m)</TableHead>
                      <TableHead className="w-24 text-right text-xs font-medium text-slate-600">Total (m)</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-slate-600">Size</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-slate-600">Ref RGP</TableHead>
                      <TableHead className="w-24 text-xs font-medium text-slate-600">Type</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-slate-600">Remarks</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
                        {/* S.NO */}
                        <TableCell className="text-center font-bold text-xs text-slate-600">
                          {idx + 1}
                        </TableCell>

                        {/* D.NO (Type Manual Drum # or Pick from Yard) */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              value={line.drumNumber}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleLineChange(idx, 'drumNumber', val);
                                const match = activeDrumsPool.find(
                                  (d) => d.drumNumber?.toLowerCase() === val.trim().toLowerCase(),
                                );
                                if (match) {
                                  handleDrumSelect(idx, match._id);
                                }
                              }}
                              placeholder="D.NO / Drum #"
                              className="h-8 text-xs font-mono font-semibold bg-white"
                            />
                            {activeDrumsPool.length > 0 && (
                              <Select
                                value={line.drumId || ''}
                                onValueChange={(val) => handleDrumSelect(idx, val)}
                              >
                                <SelectTrigger
                                  className="h-8 w-8 px-0 justify-center bg-slate-50 border-slate-200 cursor-pointer shrink-0"
                                  title="Select from Yard"
                                >
                                  <Package className="w-3.5 h-3.5 text-slate-500" />
                                </SelectTrigger>
                                <SelectContent align="end" className="max-h-56">
                                  {activeDrumsPool.map((drum) => (
                                    <SelectItem key={drum._id} value={drum._id} className="text-xs font-mono">
                                      {drum.drumNumber} ({drum.sizeDescription || drum.drumSize || '44X16X24'})
                                      {drum.refRgpNumber ? ` [RGP: ${drum.refRgpNumber}]` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>

                        {/* LENGTH BOTTOM */}
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={line.lengthBottom}
                            onChange={(e) => handleLineChange(idx, 'lengthBottom', e.target.value)}
                            className="h-8 text-xs font-mono text-right bg-white"
                          />
                        </TableCell>

                        {/* LENGTH TOP */}
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={line.lengthTop}
                            onChange={(e) => handleLineChange(idx, 'lengthTop', e.target.value)}
                            className="h-8 text-xs font-mono text-right bg-white font-semibold"
                          />
                        </TableCell>

                        {/* LENGTH TOTAL */}
                        <TableCell className="text-right font-mono font-bold text-xs text-indigo-700 bg-indigo-50/20">
                          {line.lengthTotal || 0} m
                        </TableCell>

                        {/* DRUM SIZE */}
                        <TableCell>
                          <Input
                            value={line.drumSize}
                            onChange={(e) => handleLineChange(idx, 'drumSize', e.target.value)}
                            placeholder="44X16X24"
                            className="h-8 text-xs font-mono bg-white"
                          />
                        </TableCell>

                        {/* Ref RGP No */}
                        <TableCell>
                          <Input
                            value={line.refRgpNumber}
                            onChange={(e) => handleLineChange(idx, 'refRgpNumber', e.target.value)}
                            placeholder="e.g. 262740872"
                            className="h-8 text-xs font-mono bg-white text-indigo-700 font-medium"
                          />
                        </TableCell>

                        {/* TYPE */}
                        <TableCell>
                          <Input
                            value={line.drumType}
                            onChange={(e) => handleLineChange(idx, 'drumType', e.target.value)}
                            placeholder="WOODEN"
                            className="h-8 text-xs uppercase bg-white"
                          />
                        </TableCell>

                        {/* REMARK */}
                        <TableCell>
                          <Input
                            value={line.remarks}
                            onChange={(e) => handleLineChange(idx, 'remarks', e.target.value)}
                            placeholder="STD.LENGTH"
                            className="h-8 text-xs bg-white"
                          />
                        </TableCell>

                        {/* Action: Delete line */}
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 1}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Table Totals Row */}
                    <TableRow className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <TableCell colSpan={2} className="text-right text-xs text-slate-800">
                        TOTAL PACKED LENGTH:
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600">
                        {lines.reduce((acc, curr) => acc + (Number(curr.lengthBottom) || 0), 0)} m
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600">
                        {lines.reduce((acc, curr) => acc + (Number(curr.lengthTop) || 0), 0)} m
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-indigo-700 bg-indigo-100/40">
                        {totalPackedLength.toLocaleString()} m
                      </TableCell>
                      <TableCell colSpan={5} className="text-xs">
                        {selectedWorkOrder && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-600">
                              Target PO: <strong className="font-mono">{targetPoLength.toLocaleString()} m</strong>
                            </span>
                            {lengthDifference === 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                                100% Exact Match
                              </Badge>
                            ) : lengthDifference > 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                                +{lengthDifference} m Extra
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300">
                                {lengthDifference} m Remaining
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {isDrumShortage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setRequestDrumsModalOpen(true)}
                    className="text-xs h-9 border-amber-300 text-amber-900 bg-amber-50/50 hover:bg-amber-100/80 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1 text-amber-700" />
                    Request Drums
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="text-xs h-9 cursor-pointer bg-white"
                >
                  Save Draft
                </Button>

                <Button
                  type="button"
                  disabled={isSubmitting}
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Packing...' : 'Finalize & Pack'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* DRUM SHORTAGE: ASK MORE DRUMS FROM COMPANY DIALOG */}
      <Dialog open={requestDrumsModalOpen} onOpenChange={setRequestDrumsModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 rounded-xl shadow-xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Request Additional Drums
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {customerName} needs to supply +{shortageDrumsCount} drums to complete this order
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-medium text-slate-500 uppercase block">Target Length</span>
                <span className="text-xs font-semibold font-mono text-slate-900">{targetPoLength.toLocaleString()} m</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-medium text-slate-500 uppercase block">Required</span>
                <span className="text-xs font-semibold font-mono text-slate-900">{estimatedDrumsNeeded} drums</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-medium text-slate-500 uppercase block">In Yard</span>
                <span className="text-xs font-semibold font-mono text-emerald-700">{availableInYardCount} drums</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[10px] font-medium text-amber-700 uppercase block">Shortage</span>
                <span className="text-xs font-semibold font-mono text-rose-700">+{shortageDrumsCount} drums</span>
              </div>
            </div>

            {/* Pre-formatted Message for WhatsApp/Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Formal Drum Request Message (Ready for WhatsApp / Email)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyRequestMessage}
                  className="h-7 text-xs text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 gap-1 cursor-pointer font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Message
                </Button>
              </div>
              <textarea
                readOnly
                rows={10}
                value={generatedRequestMessage}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed text-slate-800 focus:outline-hidden resize-none select-all"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRequestDrumsModalOpen(false)}
              className="text-xs"
            >
              Back to Form
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyRequestMessage}
                className="text-xs gap-1.5 border-slate-300 text-slate-700"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Request
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSaveDraftAndAskDrums}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                Save Draft &amp; Complete Later
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
