import mongoose from 'mongoose';
import {
  InventoryTransactionModel,
  InventoryBalanceModel,
  InboundChallanModel,
  InboundChallanLineModel,
  MaterialReservationModel,
  MaterialReorderRuleModel,
} from '../inventory';
import { WorkOrderModel } from '../work-orders';
import {
  ProductionBatchModel,
  MaterialIssueLineModel,
  MaterialConsumptionModel,
  MaterialReturnModel,
  ScrapRecordModel,
  ProductionOutputModel,
} from '../production';
import { DrumModel, PackingListModel } from '../packing';
import { DispatchModel, DispatchLineModel, OutboundChallanModel } from '../dispatch';
import { MaterialLotModel } from '../materials';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationFilter {
  page?: number;
  limit?: number;
}

export class ReportsService {
  // =========================================================================
  // 1. GLOBAL INVENTORY DASHBOARD
  // =========================================================================
  async getGlobalDashboard(query: {
    startDate?: Date;
    endDate?: Date;
    warehouseId?: string;
    materialId?: string;
    ownerType?: string;
    customerId?: string;
  }) {
    const balanceMatch: Record<string, unknown> = {};
    const txnMatch: Record<string, unknown> = { status: 'POSTED' };

    if (query.materialId) {
      balanceMatch.materialId = new mongoose.Types.ObjectId(query.materialId);
      txnMatch.materialId = new mongoose.Types.ObjectId(query.materialId);
    }
    if (query.warehouseId) {
      balanceMatch.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
      txnMatch.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
    }
    if (query.ownerType) {
      let normalized = query.ownerType;
      if (normalized === 'FACTORY_OWNED') normalized = 'FACTORY';
      if (normalized === 'CUSTOMER_OWNED') normalized = 'CUSTOMER';
      balanceMatch.ownerType = normalized;
      txnMatch.ownerType = normalized;
    }
    if (query.customerId) {
      balanceMatch.customerId = new mongoose.Types.ObjectId(query.customerId);
      txnMatch.customerId = new mongoose.Types.ObjectId(query.customerId);
    }

    if (query.startDate || query.endDate) {
      txnMatch.postedAt = {};
      if (query.startDate) {
        (txnMatch.postedAt as Record<string, unknown>).$gte = query.startDate;
      }
      if (query.endDate) {
        (txnMatch.postedAt as Record<string, unknown>).$lte = query.endDate;
      }
    }

    // 1. Current Balances Summary (Segregating Units: RM/WIP in KG vs FG in METER)
    const [balanceTotals] = await InventoryBalanceModel.aggregate([
      { $match: balanceMatch },
      {
        $group: {
          _id: null,
          totalOnHand: { $sum: '$quantityOnHand' },
          totalReserved: { $sum: '$quantityReserved' },
          totalAvailable: { $sum: '$quantityAvailable' },
          factoryOnHand: {
            $sum: { $cond: [{ $eq: ['$ownerType', 'FACTORY'] }, '$quantityOnHand', 0] },
          },
          factoryReserved: {
            $sum: { $cond: [{ $eq: ['$ownerType', 'FACTORY'] }, '$quantityReserved', 0] },
          },
          factoryAvailable: {
            $sum: { $cond: [{ $eq: ['$ownerType', 'FACTORY'] }, '$quantityAvailable', 0] },
          },
          customerOnHand: {
            $sum: { $cond: [{ $eq: ['$ownerType', 'CUSTOMER'] }, '$quantityOnHand', 0] },
          },
          customerReserved: {
            $sum: { $cond: [{ $eq: ['$ownerType', 'CUSTOMER'] }, '$quantityReserved', 0] },
          },
          customerAvailable: {
            $sum: { $cond: [{ $eq: ['$ownerType', 'CUSTOMER'] }, '$quantityAvailable', 0] },
          },
        },
      },
    ]);

    const stockSummary = balanceTotals || {
      totalOnHand: 0,
      totalReserved: 0,
      totalAvailable: 0,
      factoryOnHand: 0,
      factoryReserved: 0,
      factoryAvailable: 0,
      customerOnHand: 0,
      customerReserved: 0,
      customerAvailable: 0,
    };

    // 2. Unit-segregated totals (Never sum KG and METERS together!)
    const unitBreakdown = await InventoryBalanceModel.aggregate([
      { $match: balanceMatch },
      {
        $group: {
          _id: '$unit',
          unit: { $first: '$unit' },
          onHand: { $sum: '$quantityOnHand' },
          reserved: { $sum: '$quantityReserved' },
          available: { $sum: '$quantityAvailable' },
        },
      },
    ]);

    // 3. Period Movements from Immutable Inventory Ledger
    const movementsAgg = await InventoryTransactionModel.aggregate([
      { $match: txnMatch },
      {
        $group: {
          _id: '$transactionType',
          totalQuantity: { $sum: '$quantity' },
          unit: { $first: '$unit' },
        },
      },
    ]);

    const periodMovements: Record<string, number> = {
      stockReceived: 0,
      issuedToProduction: 0,
      actualConsumption: 0,
      unusedReturned: 0,
      scrapAndLoss: 0,
      transfersBetweenWarehouses: 0,
      finishedGoodsProduced: 0,
      finishedGoodsDispatched: 0,
    };

    for (const m of movementsAgg) {
      if (m._id === 'RECEIPT') periodMovements.stockReceived += m.totalQuantity;
      if (m._id === 'ISSUE_TO_PRODUCTION') periodMovements.issuedToProduction += m.totalQuantity;
      if (m._id === 'CONSUMPTION') periodMovements.actualConsumption += m.totalQuantity;
      if (m._id === 'RETURN_TO_STORE') periodMovements.unusedReturned += m.totalQuantity;
      if (m._id === 'SCRAP') periodMovements.scrapAndLoss += m.totalQuantity;
      if (m._id === 'TRANSFER_IN' || m._id === 'TRANSFER_OUT' || m._id === 'STOCK_TRANSFER') {
        if (m._id === 'TRANSFER_IN') {
          periodMovements.transfersBetweenWarehouses += m.totalQuantity;
        }
      }
      if (m._id === 'PRODUCTION_RECEIPT') periodMovements.finishedGoodsProduced += m.totalQuantity;
      if (m._id === 'DISPATCH') periodMovements.finishedGoodsDispatched += m.totalQuantity;
    }

    // 4. Finished Goods Packed in Period (from Packing Lists)
    const packingMatch: Record<string, unknown> = {
      status: { $in: ['PACKED', 'COMPLETED', 'DISPATCHED'] },
    };
    if (query.startDate || query.endDate) {
      packingMatch.packingDate = {};
      if (query.startDate) (packingMatch.packingDate as Record<string, unknown>).$gte = query.startDate;
      if (query.endDate) (packingMatch.packingDate as Record<string, unknown>).$lte = query.endDate;
    }
    const [packingStats] = await PackingListModel.aggregate([
      { $match: packingMatch },
      {
        $group: {
          _id: null,
          totalPackedMeters: { $sum: '$totalLengthMeters' },
          totalPackedDrums: { $sum: '$totalDrums' },
        },
      },
    ]);
    const finishedGoodsPacked = packingStats?.totalPackedMeters || 0;

    // 5. Materials Below Reorder Level & Zero Stock Count
    const activeRules = await MaterialReorderRuleModel.find({ isActive: true }).lean();
    let belowReorderCount = 0;
    let zeroAvailableCount = 0;

    for (const rule of activeRules) {
      const balances = await InventoryBalanceModel.find({
        materialId: rule.materialId,
        ownerType: 'FACTORY',
        ...(rule.warehouseId ? { warehouseId: rule.warehouseId } : {}),
      }).lean();
      const available = balances.reduce((sum, b) => sum + b.quantityAvailable, 0);
      if (available <= 0) zeroAvailableCount++;
      if (available <= rule.reorderPoint || available <= rule.minStockLevel) belowReorderCount++;
    }

    // 6. Material-wise & Warehouse-wise top aggregations
    const materialBreakdown = await InventoryBalanceModel.aggregate([
      { $match: balanceMatch },
      {
        $group: {
          _id: '$materialId',
          onHand: { $sum: '$quantityOnHand' },
          reserved: { $sum: '$quantityReserved' },
          available: { $sum: '$quantityAvailable' },
          unit: { $first: '$unit' },
        },
      },
      { $sort: { onHand: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'material',
        },
      },
      { $unwind: '$material' },
      {
        $project: {
          _id: 1,
          code: '$material.code',
          name: '$material.name',
          category: '$material.category',
          unit: 1,
          onHand: 1,
          reserved: 1,
          available: 1,
        },
      },
    ]);

    const warehouseBreakdown = await InventoryBalanceModel.aggregate([
      { $match: balanceMatch },
      {
        $group: {
          _id: '$warehouseId',
          onHand: { $sum: '$quantityOnHand' },
          reserved: { $sum: '$quantityReserved' },
          available: { $sum: '$quantityAvailable' },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          _id: 1,
          code: '$warehouse.code',
          name: '$warehouse.name',
          type: '$warehouse.type',
          onHand: 1,
          reserved: 1,
          available: 1,
        },
      },
    ]);

    const totalLots = await MaterialLotModel.countDocuments(
      query.customerId ? { customerId: new mongoose.Types.ObjectId(query.customerId) } : {},
    );

    return {
      stockPosition: {
        totalOnHand: stockSummary.totalOnHand,
        totalReserved: stockSummary.totalReserved,
        totalBlocked: 0, // In this ERP schema, blocked stock is reserved/quarantine, available = onHand - reserved
        totalAvailable: stockSummary.totalAvailable,
        factoryOwned: {
          onHand: stockSummary.factoryOnHand,
          reserved: stockSummary.factoryReserved,
          available: stockSummary.factoryAvailable,
        },
        customerOwned: {
          onHand: stockSummary.customerOnHand,
          reserved: stockSummary.customerReserved,
          available: stockSummary.customerAvailable,
        },
        unitBreakdown,
      },
      periodMovements: {
        ...periodMovements,
        finishedGoodsPacked,
      },
      alerts: {
        materialsBelowReorderLevel: belowReorderCount,
        materialsZeroOrNegativeAvailable: zeroAvailableCount,
        totalLotsTracked: totalLots,
      },
      breakdowns: {
        materialWise: materialBreakdown,
        warehouseWise: warehouseBreakdown,
      },
      filtersApplied: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
        warehouseId: query.warehouseId || null,
        materialId: query.materialId || null,
        ownerType: query.ownerType || null,
        customerId: query.customerId || null,
      },
    };
  }

  // =========================================================================
  // 2. INVENTORY SUMMARY REPORT
  // =========================================================================
  async getInventorySummary(query: {
    page?: number;
    limit?: number;
    warehouseId?: string;
    materialId?: string;
    ownerType?: string;
    customerId?: string;
    search?: string;
    belowReorderOnly?: boolean;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};

    if (query.warehouseId) match.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
    if (query.materialId) match.materialId = new mongoose.Types.ObjectId(query.materialId);
    if (query.customerId) match.customerId = new mongoose.Types.ObjectId(query.customerId);
    if (query.ownerType) {
      let normalized = query.ownerType;
      if (normalized === 'FACTORY_OWNED') normalized = 'FACTORY';
      if (normalized === 'CUSTOMER_OWNED') normalized = 'CUSTOMER';
      match.ownerType = normalized;
    }

    const [items, total] = await Promise.all([
      InventoryBalanceModel.find(match)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('materialId', 'code name category baseUnit defaultReorderThreshold')
        .populate('warehouseId', 'code name type')
        .populate('customerId', 'code name gstin')
        .populate('lotId', 'lotNumber initialQuantity currentBalance qualityStatus')
        .lean(),
      InventoryBalanceModel.countDocuments(match),
    ]);

    // Format items and compute shortage against threshold
    const formatted = items.map((b) => {
      const mat = b.materialId as unknown as {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: string;
        category: string;
        baseUnit: string;
        defaultReorderThreshold?: number;
      } | null;
      const threshold = mat?.defaultReorderThreshold || 0;
      const shortage = Math.max(0, threshold - b.quantityAvailable);
      const isLowStock = b.ownerType === 'FACTORY' && threshold > 0 && b.quantityAvailable <= threshold;

      return {
        _id: b._id,
        material: mat
          ? { _id: mat._id, code: mat.code, name: mat.name, category: mat.category, baseUnit: mat.baseUnit }
          : null,
        warehouse: b.warehouseId,
        lot: b.lotId,
        ownerType: b.ownerType,
        customer: b.customerId,
        quantityOnHand: b.quantityOnHand,
        quantityReserved: b.quantityReserved,
        quantityBlocked: 0,
        quantityAvailable: b.quantityAvailable,
        unit: b.unit,
        reorderThreshold: threshold,
        shortageQuantity: shortage,
        isLowStock,
        updatedAt: b.updatedAt,
      };
    });

    const filtered = query.belowReorderOnly ? formatted.filter((item) => item.isLowStock) : formatted;

    return {
      items: filtered,
      pagination: {
        page,
        limit,
        total: query.belowReorderOnly ? filtered.length : total,
        totalPages: Math.ceil((query.belowReorderOnly ? filtered.length : total) / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 3. DAILY STOCK AND MATERIAL MOVEMENT REPORT
  // =========================================================================
  async getDailyStockMovementReport(query: {
    startDate?: Date;
    endDate?: Date;
    date?: Date;
    materialId?: string;
    warehouseId?: string;
    ownerType?: string;
    customerId?: string;
    lotId?: string;
    page?: number;
    limit?: number;
  }) {
    let start: Date;
    let end: Date;

    if (query.date) {
      start = new Date(query.date);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(query.date);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      start = query.startDate ? new Date(query.startDate) : new Date(0);
      end = query.endDate ? new Date(query.endDate) : new Date();
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    // Filter scope
    const scopeMatch: Record<string, unknown> = {};
    if (query.materialId) scopeMatch.materialId = new mongoose.Types.ObjectId(query.materialId);
    if (query.warehouseId) scopeMatch.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
    if (query.customerId) scopeMatch.customerId = new mongoose.Types.ObjectId(query.customerId);
    if (query.ownerType) {
      let normalized = query.ownerType;
      if (normalized === 'FACTORY_OWNED') normalized = 'FACTORY';
      if (normalized === 'CUSTOMER_OWNED') normalized = 'CUSTOMER';
      scopeMatch.ownerType = normalized;
    }
    if (query.lotId) scopeMatch.lotId = new mongoose.Types.ObjectId(query.lotId);

    // 1. Get Distinct Stock Buckets (material, warehouse, ownerType, customerId, lotId)
    const distinctBuckets = await InventoryBalanceModel.find(scopeMatch)
      .skip(skip)
      .limit(limit)
      .populate('materialId', 'code name category baseUnit')
      .populate('warehouseId', 'code name')
      .populate('customerId', 'code name')
      .populate('lotId', 'lotNumber')
      .lean();

    const totalBuckets = await InventoryBalanceModel.countDocuments(scopeMatch);

    const reportLines = [];

    for (const bucket of distinctBuckets) {
      const bucketFilter: Record<string, unknown> = {
        materialId: (bucket.materialId as unknown as { _id: mongoose.Types.ObjectId })._id,
        warehouseId: (bucket.warehouseId as unknown as { _id: mongoose.Types.ObjectId })._id,
        ownerType: bucket.ownerType,
        customerId: bucket.customerId ? (bucket.customerId as unknown as { _id: mongoose.Types.ObjectId })._id : null,
        lotId: bucket.lotId ? (bucket.lotId as unknown as { _id: mongoose.Types.ObjectId })._id : null,
        status: 'POSTED',
      };

      // 2. Opening Stock: Net ledger movements posted BEFORE `start`
      const [openingAgg] = await InventoryTransactionModel.aggregate([
        {
          $match: {
            ...bucketFilter,
            postedAt: { $lt: start },
          },
        },
        {
          $group: {
            _id: null,
            inward: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$transactionType',
                      ['RECEIPT', 'OPENING_BALANCE', 'TRANSFER_IN', 'RETURN_TO_STORE', 'ADJUSTMENT_IN', 'PRODUCTION_RECEIPT'],
                    ],
                  },
                  '$quantity',
                  0,
                ],
              },
            },
            outward: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$transactionType',
                      ['ISSUE_TO_PRODUCTION', 'CONSUMPTION', 'DISPATCH', 'SCRAP', 'TRANSFER_OUT', 'ADJUSTMENT_OUT'],
                    ],
                  },
                  '$quantity',
                  0,
                ],
              },
            },
          },
        },
      ]);

      const openingStock = Math.max(0, (openingAgg?.inward || 0) - (openingAgg?.outward || 0));

      // 3. Movements DURING period [start, end]
      const periodTxns = await InventoryTransactionModel.aggregate([
        {
          $match: {
            ...bucketFilter,
            postedAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: '$transactionType',
            totalQuantity: { $sum: '$quantity' },
          },
        },
      ]);

      let quantityReceived = 0;
      let quantityTransferredIn = 0;
      let quantityTransferredOut = 0;
      let quantityIssuedToProduction = 0;
      let actualQuantityConsumed = 0;
      let unusedMaterialReturned = 0;
      let scrapQuantity = 0;
      let processLossQuantity = 0;
      let adjustmentsIn = 0;
      let adjustmentsOut = 0;

      for (const t of periodTxns) {
        if (t._id === 'RECEIPT' || t._id === 'OPENING_BALANCE') quantityReceived += t.totalQuantity;
        if (t._id === 'TRANSFER_IN') quantityTransferredIn += t.totalQuantity;
        if (t._id === 'TRANSFER_OUT') quantityTransferredOut += t.totalQuantity;
        if (t._id === 'ISSUE_TO_PRODUCTION') quantityIssuedToProduction += t.totalQuantity;
        if (t._id === 'CONSUMPTION') actualQuantityConsumed += t.totalQuantity;
        if (t._id === 'RETURN_TO_STORE') unusedMaterialReturned += t.totalQuantity;
        if (t._id === 'SCRAP') scrapQuantity += t.totalQuantity;
        if (t._id === 'ADJUSTMENT_IN') adjustmentsIn += t.totalQuantity;
        if (t._id === 'ADJUSTMENT_OUT') adjustmentsOut += t.totalQuantity;
      }

      // If consumption occurred in WIP warehouse, report actual consumption for this material separately
      if (actualQuantityConsumed === 0) {
        const [consumeAgg] = await MaterialConsumptionModel.aggregate([
          {
            $match: {
              materialId: (bucket.materialId as unknown as { _id: mongoose.Types.ObjectId })._id,
              ownerType: bucket.ownerType,
              ...(bucket.customerId
                ? { customerId: (bucket.customerId as unknown as { _id: mongoose.Types.ObjectId })._id }
                : {}),
              status: 'POSTED',
              consumedAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, totalConsumed: { $sum: '$consumedQuantity' } } },
        ]);
        if (consumeAgg?.totalConsumed) {
          actualQuantityConsumed = consumeAgg.totalConsumed;
        }
      }

      // If scrap occurred in WIP warehouse, report scrap quantity for this material separately
      if (scrapQuantity === 0) {
        const [scrapSumAgg] = await ScrapRecordModel.aggregate([
          {
            $match: {
              materialId: (bucket.materialId as unknown as { _id: mongoose.Types.ObjectId })._id,
              ownerType: bucket.ownerType,
              ...(bucket.customerId
                ? { customerId: (bucket.customerId as unknown as { _id: mongoose.Types.ObjectId })._id }
                : {}),
              status: 'POSTED',
              $or: [{ postedAt: { $gte: start, $lte: end } }, { recordedAt: { $gte: start, $lte: end } }],
            },
          },
          { $group: { _id: null, totalScrap: { $sum: '$scrapQuantity' } } },
        ]);
        if (scrapSumAgg?.totalScrap) {
          scrapQuantity = scrapSumAgg.totalScrap;
        }
      }

      // Check scrap records for process loss breakdown
      const [scrapAgg] = await ScrapRecordModel.aggregate([
        {
          $match: {
            materialId: (bucket.materialId as unknown as { _id: mongoose.Types.ObjectId })._id,
            ownerType: bucket.ownerType,
            status: 'POSTED',
            scrapCategory: 'PROCESS_LOSS',
            $or: [{ postedAt: { $gte: start, $lte: end } }, { recordedAt: { $gte: start, $lte: end } }],
          },
        },
        { $group: { _id: null, totalLoss: { $sum: '$scrapQuantity' } } },
      ]);
      processLossQuantity = scrapAgg?.totalLoss || 0;

      // 4. Closing Stock & Reconciled Available Stock
      // For store buckets, material is deducted via issue to production. Scrap/consumption in WIP are reported
      // separately to prevent double deduction.
      const netMovement =
        quantityReceived +
        quantityTransferredIn -
        quantityTransferredOut -
        quantityIssuedToProduction +
        unusedMaterialReturned +
        adjustmentsIn -
        adjustmentsOut;

      const closingStock = Math.max(0, openingStock + netMovement);
      const reservedQuantity = bucket.quantityReserved || 0;
      const blockedQuantity = 0;
      const availableQuantity = Math.max(0, closingStock - reservedQuantity - blockedQuantity);

      reportLines.push({
        material: bucket.materialId,
        warehouse: bucket.warehouseId,
        ownerType: bucket.ownerType,
        customer: bucket.customerId,
        lot: bucket.lotId,
        unit: bucket.unit,
        openingStock,
        quantityReceived,
        quantityTransferredIn,
        quantityTransferredOut,
        quantityIssuedToProduction, // Reported separately from consumption!
        actualQuantityConsumed, // Reported separately from issue!
        unusedMaterialReturned,
        scrapQuantity,
        processLossQuantity,
        otherStockAdjustments: adjustmentsIn - adjustmentsOut,
        closingStock,
        reservedQuantity,
        blockedQuantity,
        availableQuantity,
        reconciled: Math.abs(closingStock - (openingStock + netMovement)) < 0.0001,
      });
    }

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      rulesDocumentation: {
        openingStock: 'Total posted inward minus outward ledger movements prior to selected startDate',
        issueVsConsumption:
          'Material issued transfers ownership from store to WIP. Actual consumption reflects physical input into batches.',
        closingFormula:
          'Closing Stock = Opening Stock + Received + Transfers In - Transfers Out - Issued To Production + Unused Returned - Scrap + Net Adjustments',
        availableFormula: 'Available Stock = Closing Stock - Reserved Quantity - Blocked Quantity',
      },
      items: reportLines,
      pagination: {
        page,
        limit,
        total: totalBuckets,
        totalPages: Math.ceil(totalBuckets / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 4. CUSTOMER-OWNED MATERIAL RECONCILIATION
  // =========================================================================
  async getCustomerMaterialReconciliation(query: {
    customerId?: string;
    materialId?: string;
    startDate?: Date;
    endDate?: Date;
    inboundChallanId?: string;
    workOrderId?: string;
    productionOrderId?: string;
    productionBatchId?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const matchCustomer: Record<string, unknown> = { ownerType: 'CUSTOMER' };
    if (query.customerId) matchCustomer.customerId = new mongoose.Types.ObjectId(query.customerId);
    if (query.materialId) matchCustomer.materialId = new mongoose.Types.ObjectId(query.materialId);
    if (query.warehouseId) matchCustomer.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);

    // Get Customer Stock Buckets
    const buckets = await InventoryBalanceModel.find(matchCustomer)
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'code name gstin contactPerson')
      .populate('materialId', 'code name category baseUnit')
      .populate('warehouseId', 'code name')
      .lean();

    const totalBuckets = await InventoryBalanceModel.countDocuments(matchCustomer);

    const reconciliationRows = [];

    for (const bucket of buckets) {
      if (!bucket.customerId || !bucket.materialId) {
        continue;
      }
      const custId =
        (bucket.customerId as unknown as { _id?: mongoose.Types.ObjectId })._id ||
        (bucket.customerId as unknown as mongoose.Types.ObjectId);
      const matId =
        (bucket.materialId as unknown as { _id?: mongoose.Types.ObjectId })._id ||
        (bucket.materialId as unknown as mongoose.Types.ObjectId);

      // 1. Inbound Challan Receipts Grouping
      const challanLinesMatch: Record<string, unknown> = {
        materialId: matId,
      };
      if (query.inboundChallanId) {
        challanLinesMatch.inboundChallanId = new mongoose.Types.ObjectId(query.inboundChallanId);
      }

      const inboundChallanLines = await InboundChallanLineModel.find(challanLinesMatch)
        .populate({
          path: 'inboundChallanId',
          match: { customerId: custId, status: 'POSTED' },
          select: 'challanNumber customerChallanNumber customerChallanDate postedAt warehouseId',
        })
        .populate('lotId', 'lotNumber initialQuantity currentBalance qualityStatus')
        .lean();

      // Filter out lines where challan didn't match customer or wasn't posted
      const validInboundLines = inboundChallanLines.filter((l) => l.inboundChallanId != null);

      let totalReceived = 0;
      const receiptsByChallan = validInboundLines.map((l) => {
        const ch = l.inboundChallanId as unknown as {
          _id: mongoose.Types.ObjectId;
          challanNumber: string;
          customerChallanNumber: string;
          customerChallanDate: Date;
          postedAt: Date;
        };
        const lot = l.lotId as unknown as {
          _id: mongoose.Types.ObjectId;
          lotNumber: string;
          initialQuantity: number;
          currentBalance: number;
        } | null;
        totalReceived += l.receivedQuantity;
        return {
          challanNumber: ch.challanNumber,
          customerChallanNumber: ch.customerChallanNumber,
          receiptDate: ch.customerChallanDate || ch.postedAt,
          lotNumber: lot?.lotNumber || 'N/A',
          declaredQuantity: l.declaredQuantity,
          receivedQuantity: l.receivedQuantity,
          currentLotBalance: lot?.currentBalance || 0,
          unit: l.unit,
        };
      });

      // 2. Active Reservations for this customer & material
      const reservations = await MaterialReservationModel.find({
        customerId: custId,
        materialId: matId,
        status: 'ACTIVE',
      }).lean();
      const reservedQuantity = reservations.reduce((sum, r) => sum + r.reservedQuantity, 0);

      // 3. Production movements (Issue, Consumption, Return, Scrap)
      const issueLines = await MaterialIssueLineModel.find({
        customerId: custId,
        materialId: matId,
      })
        .populate({
          path: 'materialIssueId',
          match: { status: 'ISSUED' },
          select: 'issueNumber issueDate workOrderId productionOrderId',
        })
        .lean();
      const validIssueLines = issueLines.filter((il) => il.materialIssueId != null);
      const totalIssued = validIssueLines.reduce((sum, il) => sum + il.issuedQuantity, 0);

      // Consumptions
      const consumptions = await MaterialConsumptionModel.find({
        customerId: custId,
        materialId: matId,
        status: 'POSTED',
      }).lean();
      const totalConsumed = consumptions.reduce((sum, c) => sum + c.consumedQuantity, 0);

      // Returns
      const returns = await MaterialReturnModel.find({
        customerId: custId,
        materialId: matId,
        status: 'POSTED',
      }).lean();
      const totalReturned = returns.reduce((sum, r) => sum + r.returnQuantity, 0);

      // Scrap
      const scraps = await ScrapRecordModel.find({
        customerId: custId,
        materialId: matId,
        status: 'POSTED',
      }).lean();
      const totalScrap = scraps.reduce((sum, s) => sum + s.scrapQuantity, 0);

      // 4. Mathematical WIP & Balance Reconciliation
      // WIP = Issued - Consumed - Returned - Scrap
      const currentWipBalance = Math.max(0, totalIssued - totalConsumed - totalReturned - totalScrap);
      const storeOnHand = bucket.quantityOnHand;
      const storeAvailable = bucket.quantityAvailable;

      // Expected balance = Total Received - Total Consumed - Total Scrap + Returns - WIP
      // Or: Total In Store + Total in WIP must equal Total Received - Total Consumed - Total Scrap
      const expectedTotalRemaining = Math.max(0, totalReceived - totalConsumed - totalScrap);
      const actualTotalRemaining = storeOnHand + currentWipBalance;
      const discrepancy = actualTotalRemaining - expectedTotalRemaining;

      reconciliationRows.push({
        customer: bucket.customerId,
        material: bucket.materialId,
        warehouse: bucket.warehouseId,
        unit: bucket.unit,
        inboundReceipts: receiptsByChallan,
        summary: {
          totalReceived,
          materialReservedForWorkOrders: reservedQuantity,
          materialIssuedToProduction: totalIssued,
          actualMaterialConsumption: totalConsumed,
          unusedMaterialReturnedToStores: totalReturned,
          scrapAndProcessLoss: totalScrap,
          currentStoreOnHand: storeOnHand,
          currentWipBalance,
          totalCustomerMaterialRemaining: actualTotalRemaining,
          reservedBalance: bucket.quantityReserved,
          availableBalance: storeAvailable,
        },
        reconciliation: {
          expectedTotalRemaining,
          actualTotalRemaining,
          discrepancy,
          isBalanced: Math.abs(discrepancy) < 0.0001,
          formula:
            'Store On-Hand + WIP Balance == Total Received - Actual Consumed - Total Scrap (Strict Customer Segregation)',
        },
      });
    }

    return {
      items: reconciliationRows,
      pagination: {
        page,
        limit,
        total: totalBuckets,
        totalPages: Math.ceil(totalBuckets / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 5. WORK ORDER AND PRODUCTION REPORTS
  // =========================================================================
  async getWorkOrderReport(query: {
    workOrderId?: string;
    customerId?: string;
    productId?: string;
    status?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (query.workOrderId) match._id = new mongoose.Types.ObjectId(query.workOrderId);
    if (query.customerId) match.customerId = new mongoose.Types.ObjectId(query.customerId);
    if (query.productId) match.productId = new mongoose.Types.ObjectId(query.productId);
    if (query.status) match.status = query.status;
    if (query.priority) match.priority = query.priority;

    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) (match.createdAt as Record<string, unknown>).$gte = query.startDate;
      if (query.endDate) (match.createdAt as Record<string, unknown>).$lte = query.endDate;
    }

    if (query.search) {
      match.$or = [
        { workOrderNumber: { $regex: query.search, $options: 'i' } },
        { customerPoNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [workOrders, total] = await Promise.all([
      WorkOrderModel.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'code name gstin')
        .populate('productId', 'code name cableCategory voltageGrade standardSpecification baseUnit')
        .lean(),
      WorkOrderModel.countDocuments(match),
    ]);

    const report = [];

    for (const wo of workOrders) {
      const woId = wo._id;

      // 1. Planned Material Requirements from Saved BOM Snapshot
      const plannedRequirements = (wo.bomSnapshot?.items || []).map((item) => {
        const batchMultiplier = wo.bomSnapshot?.batchSize ? wo.orderedLengthMeters / wo.bomSnapshot.batchSize : 1;
        const plannedQty = item.quantityPerUnit * batchMultiplier;
        return {
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          unit: item.unit,
          quantityPerUnit: item.quantityPerUnit,
          plannedQuantity: plannedQty,
          scrapTolerancePercentage: item.scrapTolerancePercentage,
        };
      });

      // 2. Material Reserved for this Work Order
      const reservations = await MaterialReservationModel.find({
        workOrderId: woId,
        status: { $in: ['ACTIVE', 'FULFILLED'] },
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      // 3. Actual Material Issues & Consumption
      const issues = await MaterialIssueLineModel.find()
        .populate({
          path: 'materialIssueId',
          match: { workOrderId: woId, status: 'ISSUED' },
          select: '_id',
        })
        .populate('materialId', 'code name baseUnit')
        .lean();
      const validIssues = issues.filter((i) => i.materialIssueId != null);

      const consumptions = await MaterialConsumptionModel.find({
        workOrderId: woId,
        status: 'POSTED',
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      const returns = await MaterialReturnModel.find({
        workOrderId: woId,
        status: 'POSTED',
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      const scraps = await ScrapRecordModel.find({
        workOrderId: woId,
        status: 'POSTED',
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      // 4. Good Output Produced (in meters)
      const outputs = await ProductionOutputModel.find({
        workOrderId: woId,
        qualityStatus: 'PASSED',
        status: 'POSTED',
      }).lean();
      const actualGoodLengthMeters = outputs.reduce((sum, o) => sum + o.outputLengthMeters, 0);

      // 5. Finished Goods Packed & Dispatched
      const drums = await DrumModel.find({ workOrderId: woId }).lean();
      const totalPackedMeters = drums
        .filter((d) => ['PACKED', 'IN_TRANSIT', 'DISPATCHED'].includes(d.status))
        .reduce((sum, d) => sum + d.cableLengthMeters, 0);
      const totalDispatchedMeters = drums
        .filter((d) => ['DISPATCHED', 'CUSTOMER_SITE'].includes(d.status))
        .reduce((sum, d) => sum + d.cableLengthMeters, 0);

      const remainingToProduce = Math.max(0, wo.orderedLengthMeters - actualGoodLengthMeters);
      const completionPercentage =
        wo.orderedLengthMeters > 0
          ? Math.min(100, Math.round((actualGoodLengthMeters / wo.orderedLengthMeters) * 1000) / 10)
          : 0;

      report.push({
        workOrderId: wo._id,
        workOrderNumber: wo.workOrderNumber,
        customer: wo.customerId,
        product: wo.productId,
        orderQuantity: wo.orderedLengthMeters,
        orderUnit: 'METER',
        status: wo.status,
        priority: wo.priority,
        targetDeliveryDate: wo.targetDeliveryDate,
        plannedRequirements,
        actualMovements: {
          materialReserved: reservations.map((r) => ({
            material: r.materialId,
            quantity: r.reservedQuantity,
            unit: r.unit,
          })),
          materialIssued: validIssues.map((i) => ({
            material: i.materialId,
            quantity: i.issuedQuantity,
            unit: i.unit,
          })),
          actualConsumption: consumptions.map((c) => ({
            material: c.materialId,
            quantity: c.consumedQuantity,
            unit: c.unit,
          })),
          unusedReturned: returns.map((r) => ({
            material: r.materialId,
            quantity: r.returnQuantity,
            unit: r.unit,
          })),
          scrapAndProcessLoss: scraps.map((s) => ({
            material: s.materialId,
            quantity: s.scrapQuantity,
            unit: s.unit,
            scrapType: s.scrapType,
          })),
        },
        productionProgress: {
          plannedProductionQuantity: wo.orderedLengthMeters,
          actualGoodProductionQuantity: actualGoodLengthMeters,
          remainingQuantityToProduce: remainingToProduce,
          productionCompletionPercentage: completionPercentage,
          totalPackedMeters,
          totalDispatchedMeters,
          pendingDispatchMeters: Math.max(0, actualGoodLengthMeters - totalDispatchedMeters),
        },
      });
    }

    return {
      items: report,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 6. PRODUCTION BATCH REPORT
  // =========================================================================
  async getProductionBatchReport(query: {
    batchId?: string;
    workOrderId?: string;
    productionOrderId?: string;
    processStageId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (query.batchId) match._id = new mongoose.Types.ObjectId(query.batchId);
    if (query.workOrderId) match.workOrderId = new mongoose.Types.ObjectId(query.workOrderId);
    if (query.productionOrderId) match.productionOrderId = new mongoose.Types.ObjectId(query.productionOrderId);
    if (query.processStageId) match.processStageId = new mongoose.Types.ObjectId(query.processStageId);
    if (query.status) match.status = query.status;

    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) (match.createdAt as Record<string, unknown>).$gte = query.startDate;
      if (query.endDate) (match.createdAt as Record<string, unknown>).$lte = query.endDate;
    }

    if (query.search) {
      match.$or = [
        { batchNumber: { $regex: query.search, $options: 'i' } },
        { machineCode: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [batches, total] = await Promise.all([
      ProductionBatchModel.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workOrderId', 'workOrderNumber customerId productId')
        .populate('productionOrderId', 'productionOrderNumber')
        .populate('processStageId', 'code name sequence')
        .populate('operatorId', 'firstName lastName employeeCode')
        .lean(),
      ProductionBatchModel.countDocuments(match),
    ]);

    const report = [];

    for (const b of batches) {
      const batchId = b._id;

      // Actual Consumptions
      const consumptions = await MaterialConsumptionModel.find({
        productionBatchId: batchId,
        status: 'POSTED',
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      // Returns
      const returns = await MaterialReturnModel.find({
        productionBatchId: batchId,
        status: 'POSTED',
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      // Scrap Records
      const scraps = await ScrapRecordModel.find({
        productionBatchId: batchId,
        status: 'POSTED',
      })
        .populate('materialId', 'code name baseUnit')
        .lean();

      // Good Output
      const outputs = await ProductionOutputModel.find({
        productionBatchId: batchId,
        status: 'POSTED',
      }).lean();

      const totalGoodMeters = outputs
        .filter((o) => o.qualityStatus === 'PASSED')
        .reduce((sum, o) => sum + o.outputLengthMeters, 0);

      const totalConsumedKg = consumptions.reduce((sum, c) => sum + c.consumedQuantity, 0);
      const totalReturnedKg = returns.reduce((sum, r) => sum + r.returnQuantity, 0);
      const totalScrapKg = scraps.reduce((sum, s) => sum + s.scrapQuantity, 0);

      // Specific consumption: actual kg consumed per meter produced (strictly keeping meters separate from kg)
      const specificConsumptionKgPerMeter =
        totalGoodMeters > 0 ? Math.round((totalConsumedKg / totalGoodMeters) * 10000) / 10000 : 0;

      // Related Inventory Transactions
      const txns = await InventoryTransactionModel.find({
        sourceDocumentId: {
          $in: [
            ...consumptions.map((c) => c._id),
            ...returns.map((r) => r._id),
            ...scraps.map((s) => s._id),
            ...outputs.map((o) => o._id),
          ],
        },
      })
        .select('transactionNumber transactionType quantity unit postedAt')
        .lean();

      report.push({
        batchId: b._id,
        batchNumber: b.batchNumber,
        workOrder: b.workOrderId,
        productionOrder: b.productionOrderId,
        processStage: b.processStageId,
        machineCode: b.machineCode,
        operator: b.operatorId,
        status: b.status,
        plannedQuantity: b.plannedQuantity,
        completedQuantity: b.completedQuantity,
        unit: b.unit,
        productionDates: {
          startedAt: b.startedAt,
          completedAt: b.completedAt,
        },
        materials: {
          consumptions: consumptions.map((c) => ({
            material: c.materialId,
            consumedQuantity: c.consumedQuantity,
            unit: c.unit,
          })),
          returns: returns.map((r) => ({
            material: r.materialId,
            returnQuantity: r.returnQuantity,
            unit: r.unit,
          })),
          scraps: scraps.map((s) => ({
            material: s.materialId,
            scrapQuantity: s.scrapQuantity,
            scrapType: s.scrapType,
            category: s.scrapCategory,
            unit: s.unit,
          })),
          totalConsumedKg,
          totalReturnedKg,
          totalScrapKg,
        },
        output: {
          goodOutputMeters: totalGoodMeters,
          specificConsumptionKgPerMeter,
          measurementNotice:
            'Cable length in meters is reported separately from material weight in kilograms. No cross-unit arithmetic applied.',
        },
        relatedTransactions: txns,
      });
    }

    return {
      items: report,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 7. FINISHED GOODS REPORT
  // =========================================================================
  async getFinishedGoodsReport(query: {
    workOrderId?: string;
    customerId?: string;
    productId?: string;
    drumStatus?: string;
    warehouseId?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (query.workOrderId) match.workOrderId = new mongoose.Types.ObjectId(query.workOrderId);
    if (query.customerId) match.customerId = new mongoose.Types.ObjectId(query.customerId);
    if (query.productId) match.currentProductId = new mongoose.Types.ObjectId(query.productId);
    if (query.drumStatus) match.status = query.drumStatus;
    if (query.warehouseId) match.currentWarehouseId = new mongoose.Types.ObjectId(query.warehouseId);

    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) (match.createdAt as Record<string, unknown>).$gte = query.startDate;
      if (query.endDate) (match.createdAt as Record<string, unknown>).$lte = query.endDate;
    }

    if (query.search) {
      match.$or = [
        { drumNumber: { $regex: query.search, $options: 'i' } },
        { serialNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [drums, total] = await Promise.all([
      DrumModel.find(match)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workOrderId', 'workOrderNumber customerId orderedLengthMeters')
        .populate('customerId', 'code name')
        .populate('currentProductId', 'code name cableCategory voltageGrade')
        .populate('currentWarehouseId', 'code name type')
        .populate('packingListId', 'packingListNumber packingDate status')
        .populate('dispatchId', 'dispatchNumber dispatchedAt status vehicleNumber lrNumber')
        .lean(),
      DrumModel.countDocuments(match),
    ]);

    const items = [];

    for (const d of drums) {
      // Find outbound challan if dispatched
      let outboundChallan = null;
      if (d.dispatchId) {
        const challan = await OutboundChallanModel.findOne({
          dispatchId: (d.dispatchId as unknown as { _id: mongoose.Types.ObjectId })._id,
        })
          .select('challanNumber challanDate status')
          .lean();
        outboundChallan = challan;
      }

      items.push({
        drumId: d._id,
        drumNumber: d.drumNumber,
        drumType: d.drumType,
        ownership: d.ownership,
        status: d.status,
        workOrder: d.workOrderId,
        customer: d.customerId,
        product: d.currentProductId,
        measurements: {
          cableLengthMeters: d.cableLengthMeters,
          tareWeightKg: d.tareWeightKg,
          netWeightKg: d.netWeightKg,
          grossWeightKg: d.grossWeightKg,
        },
        packing: d.packingListId,
        dispatch: d.dispatchId,
        outboundChallan,
        warehouse: d.currentWarehouseId,
        location: d.location,
        updatedAt: d.updatedAt,
      });
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 8. PACKING & DISPATCH REPORT
  // =========================================================================
  async getPackingDispatchReport(query: {
    customerId?: string;
    workOrderId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const dispatchMatch: Record<string, unknown> = {};
    if (query.customerId) dispatchMatch.customerId = new mongoose.Types.ObjectId(query.customerId);
    if (query.workOrderId) dispatchMatch.workOrderId = new mongoose.Types.ObjectId(query.workOrderId);
    if (query.status) dispatchMatch.status = query.status;

    if (query.startDate || query.endDate) {
      dispatchMatch.createdAt = {};
      if (query.startDate) (dispatchMatch.createdAt as Record<string, unknown>).$gte = query.startDate;
      if (query.endDate) (dispatchMatch.createdAt as Record<string, unknown>).$lte = query.endDate;
    }

    const [dispatches, total] = await Promise.all([
      DispatchModel.find(dispatchMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workOrderId', 'workOrderNumber orderedLengthMeters')
        .populate('customerId', 'code name gstin')
        .populate('sourceWarehouseId', 'code name')
        .lean(),
      DispatchModel.countDocuments(dispatchMatch),
    ]);

    const report = [];

    for (const d of dispatches) {
      // Lines and Outbound Challan
      const [lines, challan] = await Promise.all([
        DispatchLineModel.find({ dispatchId: d._id })
          .populate('drumId', 'drumNumber drumType tareWeightKg netWeightKg grossWeightKg cableLengthMeters status')
          .populate('productId', 'code name')
          .lean(),
        OutboundChallanModel.findOne({ dispatchId: d._id })
          .select('challanNumber challanDate status totalDrums totalLengthMeters vehicleNumber')
          .lean(),
      ]);

      report.push({
        dispatchId: d._id,
        dispatchNumber: d.dispatchNumber,
        workOrder: d.workOrderId,
        customer: d.customerId,
        status: d.status,
        logistics: {
          vehicleNumber: d.vehicleNumber,
          transporter: d.transporter,
          driverName: d.driverName,
          driverPhone: d.driverPhone,
          lrNumber: d.lrNumber,
          eWayBillNumber: d.eWayBillNumber,
          eWayBillDate: d.eWayBillDate,
          destinationAddress: d.destinationAddress,
        },
        totals: {
          totalDrums: d.totalDrums,
          totalLengthMeters: d.totalLengthMeters,
          totalNetWeightKg: d.totalNetWeightKg,
          totalTareWeightKg: d.totalTareWeightKg,
          totalGrossWeightKg: d.totalGrossWeightKg,
        },
        lines: lines.map((l) => ({
          drum: l.drumId,
          product: l.productId,
          lengthMeters: l.lengthMeters,
          netWeightKg: l.netWeightKg,
          tareWeightKg: l.tareWeightKg,
          grossWeightKg: l.grossWeightKg,
        })),
        outboundChallan: challan,
        dispatchedAt: d.dispatchedAt,
      });
    }

    return {
      items: report,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 9. LOW-STOCK AND REORDER REPORT
  // =========================================================================
  async getLowStockReport(query: {
    materialId?: string;
    warehouseId?: string;
    ownerType?: string;
    customerId?: string;
    status?: 'ALL' | 'BELOW_REORDER' | 'OUT_OF_STOCK';
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const filterStatus = query.status || 'ALL';

    const ruleMatch: Record<string, unknown> = { isActive: true };
    if (query.materialId) ruleMatch.materialId = new mongoose.Types.ObjectId(query.materialId);
    if (query.warehouseId) ruleMatch.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
    if (query.ownerType) {
      let normalized = query.ownerType;
      if (normalized === 'FACTORY_OWNED') normalized = 'FACTORY';
      if (normalized === 'CUSTOMER_SUPPLIED') normalized = 'CUSTOMER';
      ruleMatch.ownerType = normalized;
    }

    const rules = await MaterialReorderRuleModel.find(ruleMatch)
      .populate('materialId', 'code name category baseUnit isActive defaultReorderThreshold')
      .populate('warehouseId', 'code name isActive')
      .lean();

    const lowStockItems = [];

    for (const rule of rules) {
      const mat = rule.materialId as unknown as {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: string;
        baseUnit: string;
        isActive: boolean;
        defaultReorderThreshold?: number;
      };
      if (!mat || !mat.isActive) continue;

      const wh = rule.warehouseId as unknown as {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: string;
        isActive: boolean;
      } | null;
      if (wh && !wh.isActive) continue;

      // Filter strictly by ownership (Preserve ownership separation!)
      const balanceMatch: Record<string, unknown> = {
        materialId: mat._id,
        ownerType: rule.ownerType,
      };
      if (wh) balanceMatch.warehouseId = wh._id;
      if (query.customerId && rule.ownerType === 'CUSTOMER') {
        balanceMatch.customerId = new mongoose.Types.ObjectId(query.customerId);
      }

      const balances = await InventoryBalanceModel.find(balanceMatch).lean();
      const onHand = balances.reduce((sum, b) => sum + b.quantityOnHand, 0);
      const reserved = balances.reduce((sum, b) => sum + b.quantityReserved, 0);
      const available = balances.reduce((sum, b) => sum + b.quantityAvailable, 0);

      const threshold = rule.reorderPoint || rule.minStockLevel;
      const shortage = Math.max(0, threshold - available);

      let stockStatus: 'OUT_OF_STOCK' | 'BELOW_REORDER' | 'ADEQUATE' = 'ADEQUATE';
      if (available <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (available < threshold) {
        stockStatus = 'BELOW_REORDER';
      }

      if (filterStatus === 'OUT_OF_STOCK' && stockStatus !== 'OUT_OF_STOCK') continue;
      if (filterStatus === 'BELOW_REORDER' && stockStatus === 'ADEQUATE') continue;

      lowStockItems.push({
        materialId: mat._id,
        materialCode: mat.code,
        materialName: mat.name,
        unit: mat.baseUnit,
        warehouse: wh ? { _id: wh._id, code: wh.code, name: wh.name } : { name: 'ALL_WAREHOUSES' },
        ownerType: rule.ownerType,
        onHandQuantity: onHand,
        reservedQuantity: reserved,
        blockedQuantity: 0,
        availableQuantity: available,
        reorderThreshold: threshold,
        minStockLevel: rule.minStockLevel,
        reorderQuantity: rule.reorderQuantity,
        targetQuantity: rule.targetQuantity,
        shortageQuantity: shortage,
        stockStatus,
      });
    }

    const skip = (page - 1) * limit;
    const paginatedItems = lowStockItems.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: lowStockItems.length,
        totalPages: Math.ceil(lowStockItems.length / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 10. MATERIAL AND DOCUMENT TRACEABILITY
  // =========================================================================
  async getTraceability(query: {
    search?: string;
    materialCode?: string;
    lotNumber?: string;
    lotId?: string;
    inboundChallanNumber?: string;
    inboundChallanId?: string;
    customerId?: string;
    workOrderNumber?: string;
    workOrderId?: string;
    productionOrderNumber?: string;
    productionOrderId?: string;
    productionBatchNumber?: string;
    productionBatchId?: string;
    drumNumber?: string;
    drumId?: string;
    dispatchNumber?: string;
    dispatchId?: string;
    outboundChallanNumber?: string;
    outboundChallanId?: string;
    transactionNumber?: string;
    transactionId?: string;
  }) {
    // 1. Identify primary anchor
    let foundLot = null;
    let foundChallan = null;
    let foundWorkOrder = null;
    let foundBatch = null;
    let foundDrum = null;
    let foundDispatch = null;
    let foundOutboundChallan = null;

    if (query.lotId || query.lotNumber || query.search) {
      foundLot = await MaterialLotModel.findOne({
        $or: [
          ...(query.lotId ? [{ _id: new mongoose.Types.ObjectId(query.lotId) }] : []),
          ...(query.lotNumber ? [{ lotNumber: query.lotNumber.toUpperCase() }] : []),
          ...(query.search ? [{ lotNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('materialId', 'code name baseUnit category')
        .populate('customerId', 'code name')
        .lean();
    }

    if (!foundLot && (query.inboundChallanId || query.inboundChallanNumber || query.search)) {
      foundChallan = await InboundChallanModel.findOne({
        $or: [
          ...(query.inboundChallanId ? [{ _id: new mongoose.Types.ObjectId(query.inboundChallanId) }] : []),
          ...(query.inboundChallanNumber ? [{ challanNumber: query.inboundChallanNumber.toUpperCase() }] : []),
          ...(query.search ? [{ challanNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('customerId', 'code name')
        .populate('warehouseId', 'code name')
        .lean();
    }

    if (query.workOrderId || query.workOrderNumber || query.search) {
      foundWorkOrder = await WorkOrderModel.findOne({
        $or: [
          ...(query.workOrderId ? [{ _id: new mongoose.Types.ObjectId(query.workOrderId) }] : []),
          ...(query.workOrderNumber ? [{ workOrderNumber: query.workOrderNumber.toUpperCase() }] : []),
          ...(query.search ? [{ workOrderNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('customerId', 'code name')
        .populate('productId', 'code name cableCategory')
        .lean();
    }

    if (query.productionBatchId || query.productionBatchNumber || query.search) {
      foundBatch = await ProductionBatchModel.findOne({
        $or: [
          ...(query.productionBatchId ? [{ _id: new mongoose.Types.ObjectId(query.productionBatchId) }] : []),
          ...(query.productionBatchNumber ? [{ batchNumber: query.productionBatchNumber.toUpperCase() }] : []),
          ...(query.search ? [{ batchNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('workOrderId', 'workOrderNumber')
        .populate('productionOrderId', 'productionOrderNumber')
        .populate('processStageId', 'code name')
        .lean();
    }

    if (query.drumId || query.drumNumber || query.search) {
      foundDrum = await DrumModel.findOne({
        $or: [
          ...(query.drumId ? [{ _id: new mongoose.Types.ObjectId(query.drumId) }] : []),
          ...(query.drumNumber ? [{ drumNumber: query.drumNumber.toUpperCase() }] : []),
          ...(query.search ? [{ drumNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('workOrderId', 'workOrderNumber')
        .populate('customerId', 'code name')
        .populate('currentProductId', 'code name')
        .populate('packingListId', 'packingListNumber')
        .populate('dispatchId', 'dispatchNumber')
        .lean();
    }

    if (query.dispatchId || query.dispatchNumber || query.search) {
      foundDispatch = await DispatchModel.findOne({
        $or: [
          ...(query.dispatchId ? [{ _id: new mongoose.Types.ObjectId(query.dispatchId) }] : []),
          ...(query.dispatchNumber ? [{ dispatchNumber: query.dispatchNumber.toUpperCase() }] : []),
          ...(query.search ? [{ dispatchNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('workOrderId', 'workOrderNumber')
        .populate('customerId', 'code name')
        .lean();
    }

    if (query.outboundChallanId || query.outboundChallanNumber || query.search) {
      foundOutboundChallan = await OutboundChallanModel.findOne({
        $or: [
          ...(query.outboundChallanId ? [{ _id: new mongoose.Types.ObjectId(query.outboundChallanId) }] : []),
          ...(query.outboundChallanNumber ? [{ challanNumber: query.outboundChallanNumber.toUpperCase() }] : []),
          ...(query.search ? [{ challanNumber: query.search.toUpperCase() }] : []),
        ],
      })
        .populate('workOrderId', 'workOrderNumber')
        .populate('dispatchId', 'dispatchNumber')
        .lean();
    }

    // Assemble the complete verified chain
    // 1. Inbound Challans & Lots
    let inboundLots: unknown[] = [];
    let inboundChallans: unknown[] = [];

    if (foundLot) {
      inboundLots = [foundLot];
      if (foundLot.inboundChallanId) {
        const ch = await InboundChallanModel.findById(foundLot.inboundChallanId)
          .populate('customerId', 'code name')
          .lean();
        if (ch) inboundChallans = [ch];
      }
    } else if (foundChallan) {
      inboundChallans = [foundChallan];
      inboundLots = await MaterialLotModel.find({ inboundChallanId: foundChallan._id })
        .populate('materialId', 'code name baseUnit')
        .lean();
    }

    // 2. Inventory Ledger Transactions related to the lots or document
    const lotIds = inboundLots.map((l: unknown) => (l as { _id: mongoose.Types.ObjectId })._id);
    const relatedTxns = await InventoryTransactionModel.find({
      $or: [
        ...(lotIds.length > 0 ? [{ lotId: { $in: lotIds } }] : []),
        ...(foundWorkOrder ? [{ sourceDocumentId: foundWorkOrder._id }] : []),
        ...(foundDispatch ? [{ sourceDocumentId: foundDispatch._id }] : []),
      ],
    })
      .select('transactionNumber transactionType movementType quantity unit postedAt status')
      .lean();

    // 3. Work Orders
    let workOrders: unknown[] = [];
    if (foundWorkOrder) {
      workOrders = [foundWorkOrder];
    } else if (foundDrum?.workOrderId) {
      const wo = await WorkOrderModel.findById(
        (foundDrum.workOrderId as unknown as { _id: mongoose.Types.ObjectId })._id || foundDrum.workOrderId,
      )
        .populate('customerId', 'code name')
        .populate('productId', 'code name')
        .lean();
      if (wo) workOrders = [wo];
    } else if (foundBatch?.workOrderId) {
      const wo = await WorkOrderModel.findById(
        (foundBatch.workOrderId as unknown as { _id: mongoose.Types.ObjectId })._id || foundBatch.workOrderId,
      )
        .populate('customerId', 'code name')
        .lean();
      if (wo) workOrders = [wo];
    }

    // 4. Batches & Consumptions
    let productionBatches: unknown[] = [];
    if (foundBatch) {
      productionBatches = [foundBatch];
    } else if (workOrders.length > 0) {
      const woIds = workOrders.map((w: unknown) => (w as { _id: mongoose.Types.ObjectId })._id);
      productionBatches = await ProductionBatchModel.find({ workOrderId: { $in: woIds } })
        .populate('processStageId', 'code name')
        .lean();
    }

    // 5. Drums & Packing
    let drumsList: unknown[] = [];
    if (foundDrum) {
      drumsList = [foundDrum];
    } else if (workOrders.length > 0) {
      const woIds = workOrders.map((w: unknown) => (w as { _id: mongoose.Types.ObjectId })._id);
      drumsList = await DrumModel.find({ workOrderId: { $in: woIds } })
        .populate('packingListId', 'packingListNumber packingDate')
        .populate('dispatchId', 'dispatchNumber')
        .lean();
    }

    // 6. Dispatches & Outbound Challans
    let dispatchesList: unknown[] = [];
    let outboundChallansList: unknown[] = [];

    if (foundDispatch) {
      dispatchesList = [foundDispatch];
      const obc = await OutboundChallanModel.find({ dispatchId: foundDispatch._id }).lean();
      outboundChallansList = obc;
    } else if (foundOutboundChallan) {
      outboundChallansList = [foundOutboundChallan];
      if (foundOutboundChallan.dispatchId) {
        const dsp = await DispatchModel.findById(
          (foundOutboundChallan.dispatchId as unknown as { _id: mongoose.Types.ObjectId })._id ||
            foundOutboundChallan.dispatchId,
        ).lean();
        if (dsp) dispatchesList = [dsp];
      }
    } else if (drumsList.length > 0) {
      const dspIds = drumsList
        .map((d: unknown) => (d as { dispatchId?: { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId }).dispatchId)
        .filter(Boolean)
        .map((d) => (typeof d === 'object' && '_id' in (d as Record<string, unknown>) ? (d as { _id: mongoose.Types.ObjectId })._id : d));

      if (dspIds.length > 0) {
        dispatchesList = await DispatchModel.find({ _id: { $in: dspIds } }).lean();
        outboundChallansList = await OutboundChallanModel.find({ dispatchId: { $in: dspIds } }).lean();
      }
    }

    return {
      traceabilityChain: {
        inboundChallans,
        materialLots: inboundLots,
        inventoryTransactions: relatedTxns,
        workOrders,
        productionBatches,
        drums: drumsList,
        dispatches: dispatchesList,
        outboundChallans: outboundChallansList,
      },
      verifiedLinksCount: {
        challans: inboundChallans.length,
        lots: inboundLots.length,
        transactions: relatedTxns.length,
        workOrders: workOrders.length,
        batches: productionBatches.length,
        drums: drumsList.length,
        dispatches: dispatchesList.length,
        outboundChallans: outboundChallansList.length,
      },
      queryContext: query,
    };
  }

  // =========================================================================
  // 11. DISCREPANCY AND RECONCILIATION REPORT (READ-ONLY)
  // =========================================================================
  async getDiscrepancyReport(query: {
    type?: string;
    severity?: 'CRITICAL' | 'WARNING' | 'INFO';
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const discrepancies = [];
    const now = new Date();

    // CHECK 1: Negative Stock Balances (CRITICAL)
    const negativeBalances = await InventoryBalanceModel.find({
      $or: [{ quantityOnHand: { $lt: 0 } }, { quantityAvailable: { $lt: 0 } }, { quantityReserved: { $lt: 0 } }],
    })
      .populate('materialId', 'code name')
      .populate('warehouseId', 'code name')
      .lean();

    for (const b of negativeBalances) {
      const mat = b.materialId as unknown as { code: string; name: string } | null;
      discrepancies.push({
        discrepancyId: `DISC-NEG-${b._id}`,
        type: 'NEGATIVE_STOCK',
        severity: 'CRITICAL',
        entity: 'InventoryBalance',
        entityId: b._id.toString(),
        expectedValue: '>= 0',
        actualValue: {
          onHand: b.quantityOnHand,
          available: b.quantityAvailable,
          reserved: b.quantityReserved,
        },
        difference: Math.min(b.quantityOnHand, b.quantityAvailable),
        detectedAt: now,
        explanation: `Stock balance for material ${mat?.code || b.materialId} has fallen below zero (${b.quantityOnHand} ${b.unit}). Prohibited by system policy.`,
        resolutionStatus: 'UNRESOLVED',
      });
    }

    // CHECK 2: Over-reserved Stock (quantityReserved > quantityOnHand) (CRITICAL)
    const overReserved = await InventoryBalanceModel.find({
      $expr: { $gt: ['$quantityReserved', '$quantityOnHand'] },
    })
      .populate('materialId', 'code name')
      .lean();

    for (const b of overReserved) {
      const mat = b.materialId as unknown as { code: string } | null;
      discrepancies.push({
        discrepancyId: `DISC-OVERRES-${b._id}`,
        type: 'OVER_RESERVED_STOCK',
        severity: 'CRITICAL',
        entity: 'InventoryBalance',
        entityId: b._id.toString(),
        expectedValue: `Reserved <= ${b.quantityOnHand}`,
        actualValue: `Reserved = ${b.quantityReserved}`,
        difference: b.quantityReserved - b.quantityOnHand,
        detectedAt: now,
        explanation: `Material ${mat?.code} has ${b.quantityReserved} units reserved against only ${b.quantityOnHand} on-hand.`,
        resolutionStatus: 'UNRESOLVED',
      });
    }

    // CHECK 3: Customer-owned material without customer reference (WARNING)
    const invalidCustomerOwnership = await InventoryBalanceModel.find({
      ownerType: 'CUSTOMER',
      $or: [{ customerId: null }, { customerId: { $exists: false } }],
    }).lean();

    for (const b of invalidCustomerOwnership) {
      discrepancies.push({
        discrepancyId: `DISC-NOCUST-${b._id}`,
        type: 'INVALID_CUSTOMER_OWNERSHIP',
        severity: 'WARNING',
        entity: 'InventoryBalance',
        entityId: b._id.toString(),
        expectedValue: 'Valid Customer ObjectId',
        actualValue: null,
        difference: null,
        detectedAt: now,
        explanation: `Inventory balance record is flagged as CUSTOMER-owned but has a missing or null customer reference.`,
        resolutionStatus: 'UNRESOLVED',
      });
    }

    // CHECK 4: Ledger vs Balance Projection Drift (WARNING)
    // Sample top 50 active balances and compute ledger sum vs projected onHand
    const sampleBalances = await InventoryBalanceModel.find().limit(50).lean();
    for (const b of sampleBalances) {
      const [ledgerSum] = await InventoryTransactionModel.aggregate([
        {
          $match: {
            materialId: b.materialId,
            warehouseId: b.warehouseId,
            ownerType: b.ownerType,
            customerId: b.customerId || null,
            lotId: b.lotId || null,
            status: 'POSTED',
          },
        },
        {
          $group: {
            _id: null,
            inward: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$transactionType',
                      ['RECEIPT', 'OPENING_BALANCE', 'TRANSFER_IN', 'RETURN_TO_STORE', 'ADJUSTMENT_IN', 'PRODUCTION_RECEIPT'],
                    ],
                  },
                  '$quantity',
                  0,
                ],
              },
            },
            outward: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$transactionType',
                      ['ISSUE_TO_PRODUCTION', 'CONSUMPTION', 'DISPATCH', 'SCRAP', 'TRANSFER_OUT', 'ADJUSTMENT_OUT'],
                    ],
                  },
                  '$quantity',
                  0,
                ],
              },
            },
          },
        },
      ]);

      const computedLedgerOnHand = Math.max(0, (ledgerSum?.inward || 0) - (ledgerSum?.outward || 0));
      const diff = Math.abs(computedLedgerOnHand - b.quantityOnHand);

      if (diff > 0.001) {
        discrepancies.push({
          discrepancyId: `DISC-DRIFT-${b._id}`,
          type: 'LEDGER_BALANCE_DRIFT',
          severity: 'WARNING',
          entity: 'InventoryBalance',
          entityId: b._id.toString(),
          expectedValue: computedLedgerOnHand,
          actualValue: b.quantityOnHand,
          difference: diff,
          detectedAt: now,
          explanation: `Projection drift detected: InventoryBalance on-hand (${b.quantityOnHand}) differs from immutable transaction ledger sum (${computedLedgerOnHand}).`,
          resolutionStatus: 'UNRESOLVED',
        });
      }
    }

    // CHECK 5: Drum Dispatched Status Inconsistency (WARNING)
    const inconsistentDrums = await DrumModel.find({
      status: 'DISPATCHED',
      dispatchId: null,
    }).lean();

    for (const d of inconsistentDrums) {
      discrepancies.push({
        discrepancyId: `DISC-DRUM-${d._id}`,
        type: 'DRUM_DISPATCH_INCONSISTENCY',
        severity: 'WARNING',
        entity: 'Drum',
        entityId: d._id.toString(),
        expectedValue: 'Valid Dispatch ObjectId',
        actualValue: null,
        difference: null,
        detectedAt: now,
        explanation: `Drum ${d.drumNumber} is marked as DISPATCHED but has no associated dispatchId reference.`,
        resolutionStatus: 'UNRESOLVED',
      });
    }

    // CHECK 6: Dispatch marked DISPATCHED without posted inventory movement (CRITICAL)
    const dispatches = await DispatchModel.find({ status: 'DISPATCHED' }).limit(30).lean();
    for (const d of dispatches) {
      const hasMovement = await InventoryTransactionModel.exists({
        sourceDocumentId: d._id,
        transactionType: 'DISPATCH',
        status: 'POSTED',
      });

      if (!hasMovement) {
        discrepancies.push({
          discrepancyId: `DISC-DSP-TXN-${d._id}`,
          type: 'DISPATCH_UNPOSTED_MOVEMENT',
          severity: 'CRITICAL',
          entity: 'Dispatch',
          entityId: d._id.toString(),
          expectedValue: 'POSTED InventoryTransaction with type DISPATCH',
          actualValue: 'Missing',
          difference: null,
          detectedAt: now,
          explanation: `Dispatch ${d.dispatchNumber} is finalized (DISPATCHED) but has no corresponding posted DISPATCH transaction in inventory ledger.`,
          resolutionStatus: 'UNRESOLVED',
        });
      }
    }

    // Filter by requested severity and type
    let filtered = discrepancies;
    if (query.severity) {
      filtered = filtered.filter((d) => d.severity === query.severity);
    }
    if (query.type) {
      filtered = filtered.filter((d) => d.type === query.type);
    }

    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      discrepancies: paginated,
      summary: {
        totalDetected: filtered.length,
        criticalCount: filtered.filter((d) => d.severity === 'CRITICAL').length,
        warningCount: filtered.filter((d) => d.severity === 'WARNING').length,
        infoCount: filtered.filter((d) => d.severity === 'INFO').length,
      },
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    };
  }
}

export const reportsService = new ReportsService();
