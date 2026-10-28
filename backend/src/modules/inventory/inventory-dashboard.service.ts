import mongoose from 'mongoose';
import { InventoryBalanceModel } from './inventory-balance.model';
import { InventoryTransactionModel } from './inventory-transaction.model';
import { GlobalStockSummaryModel } from './global-stock-summary.model';
import { MaterialReorderRuleModel } from './material-reorder-rule.model';
import { MaterialModel } from '../materials/material.model';
import { NotFoundError } from '../../common/errors';
import {
  InventorySummaryQueryParams,
  InventoryTransactionQueryParams,
  InventoryBalanceQueryParams,
  DailySummaryQueryParams,
} from './inventory-dashboard.validation';

export class InventoryDashboardService {
  /**
   * Global Stock Summary & Analytics Dashboard
   */
  async getGlobalSummary(query: InventorySummaryQueryParams) {
    const balanceFilter: Record<string, unknown> = {};
    const txnFilter: Record<string, unknown> = { status: 'POSTED' };

    if (query.materialId) {
      balanceFilter.materialId = new mongoose.Types.ObjectId(query.materialId);
      txnFilter.materialId = new mongoose.Types.ObjectId(query.materialId);
    }
    if (query.warehouseId) {
      balanceFilter.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
      txnFilter.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
    }
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      balanceFilter.ownerType = owner;
      txnFilter.ownerType = owner;
    }
    if (query.customerId) {
      balanceFilter.customerId = new mongoose.Types.ObjectId(query.customerId);
      txnFilter.customerId = new mongoose.Types.ObjectId(query.customerId);
    }

    if (query.startDate || query.endDate) {
      txnFilter.postedAt = {};
      if (query.startDate) {
        (txnFilter.postedAt as Record<string, unknown>).$gte = query.startDate;
      }
      if (query.endDate) {
        (txnFilter.postedAt as Record<string, unknown>).$lte = query.endDate;
      }
    }

    // 1. Current Balances Aggregation
    const balanceStats = await InventoryBalanceModel.aggregate([
      { $match: balanceFilter },
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

    const currentBalances = balanceStats[0] || {
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

    // 2. Period Movement Metrics from Immutable Ledger
    const txnStats = await InventoryTransactionModel.aggregate([
      { $match: txnFilter },
      {
        $group: {
          _id: '$transactionType',
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const movementSummary = {
      receipts: 0,
      openingBalances: 0,
      transfersIn: 0,
      transfersOut: 0,
      adjustmentsIn: 0,
      adjustmentsOut: 0,
      reservations: 0,
      reservationReleases: 0,
    };

    for (const stat of txnStats) {
      if (stat._id === 'RECEIPT') movementSummary.receipts = stat.totalQuantity;
      if (stat._id === 'OPENING_BALANCE') movementSummary.openingBalances = stat.totalQuantity;
      if (stat._id === 'TRANSFER_IN') movementSummary.transfersIn = stat.totalQuantity;
      if (stat._id === 'TRANSFER_OUT') movementSummary.transfersOut = stat.totalQuantity;
      if (stat._id === 'ADJUSTMENT_IN') movementSummary.adjustmentsIn = stat.totalQuantity;
      if (stat._id === 'ADJUSTMENT_OUT') movementSummary.adjustmentsOut = stat.totalQuantity;
      if (stat._id === 'RESERVATION') movementSummary.reservations = stat.totalQuantity;
      if (stat._id === 'RESERVATION_RELEASE')
        movementSummary.reservationReleases = stat.totalQuantity;
    }

    // 3. Count Low Stock Items
    const lowStockAlerts = await this.getLowStockAlerts();

    return {
      stock: currentBalances,
      summary: currentBalances,
      ownerTypeBreakdown: [
        {
          _id: 'FACTORY',
          totalOnHand: currentBalances.factoryOnHand,
          totalReserved: currentBalances.factoryReserved,
          totalAvailable: currentBalances.factoryAvailable,
        },
        {
          _id: 'CUSTOMER',
          totalOnHand: currentBalances.customerOnHand,
          totalReserved: currentBalances.customerReserved,
          totalAvailable: currentBalances.customerAvailable,
        },
      ],
      periodMovements: movementSummary,
      lowStockCount: lowStockAlerts.length,
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
    };
  }

  /**
   * Detailed Material Stock Breakdown
   */
  async getMaterialStock(materialId: string, query: { warehouseId?: string; ownerType?: string }) {
    const material = await MaterialModel.findById(materialId);
    if (!material) {
      throw new NotFoundError(`Material with ID '${materialId}' not found`);
    }

    const filter: Record<string, unknown> = {
      materialId: new mongoose.Types.ObjectId(materialId),
    };

    if (query.warehouseId) {
      filter.warehouseId = new mongoose.Types.ObjectId(query.warehouseId);
    }
    if (query.ownerType) {
      let owner = query.ownerType;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }

    const balances = await InventoryBalanceModel.find(filter)
      .populate('warehouseId', 'code name')
      .populate('customerId', 'code name')
      .populate('lotId', 'lotNumber supplierLotNumber initialQuantity currentBalance qualityStatus')
      .lean();

    let totalOnHand = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let factoryOnHand = 0;
    let customerOnHand = 0;

    for (const b of balances) {
      totalOnHand += b.quantityOnHand;
      totalReserved += b.quantityReserved;
      totalAvailable += b.quantityAvailable;
      if (b.ownerType === 'FACTORY') factoryOnHand += b.quantityOnHand;
      if (b.ownerType === 'CUSTOMER') customerOnHand += b.quantityOnHand;
    }

    return {
      material: {
        _id: material._id,
        code: material.code,
        name: material.name,
        category: material.category,
        baseUnit: material.baseUnit,
      },
      summary: {
        totalOnHand,
        totalReserved,
        totalAvailable,
        factoryOnHand,
        customerOnHand,
      },
      balances,
    };
  }

  /**
   * Paginated Transaction Ledger with filters
   */
  async getTransactions(query: InventoryTransactionQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.customerId) filter.customerId = query.customerId;
    if (query.transactionType) filter.transactionType = query.transactionType;
    if (query.sourceDocumentType) filter.sourceDocumentType = query.sourceDocumentType;
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }

    if (query.startDate || query.endDate) {
      filter.postedAt = {};
      if (query.startDate) {
        (filter.postedAt as Record<string, unknown>).$gte = query.startDate;
      }
      if (query.endDate) {
        (filter.postedAt as Record<string, unknown>).$lte = query.endDate;
      }
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      InventoryTransactionModel.find(filter)
        .sort({ postedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('materialId', 'code name category baseUnit')
        .populate('warehouseId', 'code name')
        .populate('customerId', 'code name')
        .populate('lotId', 'lotNumber')
        .populate('postedBy', 'firstName lastName employeeCode')
        .lean(),
      InventoryTransactionModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
      hasNext: query.page < Math.ceil(total / query.limit),
      hasPrev: query.page > 1,
    };
  }

  /**
   * Paginated Current Inventory Balances
   */
  async getBalances(query: InventoryBalanceQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.customerId) filter.customerId = query.customerId;
    if (query.lotId) filter.lotId = query.lotId;
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      InventoryBalanceModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('materialId', 'code name category baseUnit')
        .populate('warehouseId', 'code name')
        .populate('customerId', 'code name')
        .populate('lotId', 'lotNumber initialQuantity currentBalance')
        .lean(),
      InventoryBalanceModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
      hasNext: query.page < Math.ceil(total / query.limit),
      hasPrev: query.page > 1,
    };
  }

  /**
   * Daily Summary Reports from GlobalStockSummary
   */
  async getDailySummaries(query: DailySummaryQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }
    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      GlobalStockSummaryModel.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('materialId', 'code name category baseUnit')
        .populate('warehouseId', 'code name')
        .populate('customerId', 'code name')
        .lean(),
      GlobalStockSummaryModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
      hasNext: query.page < Math.ceil(total / query.limit),
      hasPrev: query.page > 1,
    };
  }

  /**
   * Rebuild or Refresh Daily Summaries from Authoritative Ledger for a given date.
   * Guarantees idempotent, authoritative daily summaries.
   */
  async rebuildDailySummary(targetDate: Date) {
    const reportDate = new Date(targetDate);
    reportDate.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Aggregate movements from authoritative immutable ledger
    const ledgerAgg = await InventoryTransactionModel.aggregate([
      {
        $match: {
          status: 'POSTED',
          postedAt: { $gte: reportDate, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: {
            materialId: '$materialId',
            warehouseId: '$warehouseId',
            ownerType: '$ownerType',
            customerId: '$customerId',
          },
          receipts: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'RECEIPT'] }, '$quantity', 0] },
          },
          transfersIn: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'TRANSFER_IN'] }, '$quantity', 0] },
          },
          transfersOut: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'TRANSFER_OUT'] }, '$quantity', 0] },
          },
          adjustments: {
            $sum: {
              $cond: [
                { $eq: ['$transactionType', 'ADJUSTMENT_IN'] },
                '$quantity',
                {
                  $cond: [
                    { $eq: ['$transactionType', 'ADJUSTMENT_OUT'] },
                    { $multiply: ['$quantity', -1] },
                    0,
                  ],
                },
              ],
            },
          },
          unit: { $first: '$unit' },
        },
      },
    ]);

    let scopesProcessed = 0;

    for (const group of ledgerAgg) {
      const scope = group._id;
      // Get current balance as closing snapshot
      const currentBalance = await InventoryBalanceModel.findOne({
        materialId: scope.materialId,
        warehouseId: scope.warehouseId,
        ownerType: scope.ownerType,
        customerId: scope.customerId || null,
      });

      const closingQuantity = currentBalance ? currentBalance.quantityOnHand : 0;
      const netChange = group.receipts + group.transfersIn - group.transfersOut + group.adjustments;
      const openingQuantity = Math.max(0, closingQuantity - netChange);

      await GlobalStockSummaryModel.findOneAndUpdate(
        {
          date: reportDate,
          materialId: scope.materialId,
          warehouseId: scope.warehouseId,
          ownerType: scope.ownerType,
          customerId: scope.customerId || null,
        },
        {
          $set: {
            openingQuantity,
            receiptsQuantity: group.receipts,
            transfersInQuantity: group.transfersIn,
            transfersOutQuantity: group.transfersOut,
            adjustmentsQuantity: group.adjustments,
            closingQuantity,
            unit: group.unit || currentBalance?.unit || 'KG',
          },
        },
        { upsert: true, new: true },
      );

      scopesProcessed++;
    }

    return {
      reportDate,
      scopesProcessed,
      message: `Daily summary successfully refreshed from authoritative ledger for ${reportDate.toISOString().split('T')[0]}`,
    };
  }

  /**
   * Low Stock Alerts
   * Evaluates active reorder rules against factory-owned eligible stock only.
   * Customer-owned stock is never combined into factory replenishment calculations.
   */
  async getLowStockAlerts() {
    const activeRules = await MaterialReorderRuleModel.find({ isActive: true })
      .populate('materialId', 'code name category baseUnit isActive')
      .populate('warehouseId', 'code name isActive');

    const alerts: Array<{
      ruleId: string;
      materialId: string;
      materialCode: string;
      materialName: string;
      warehouseId?: string | null;
      warehouseName?: string | null;
      minStockLevel: number;
      reorderPoint: number;
      reorderQuantity: number;
      targetQuantity?: number;
      currentAvailableQuantity: number;
      deficitQuantity: number;
      unit: string;
    }> = [];

    for (const rule of activeRules) {
      const material = rule.materialId as unknown as {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: string;
        baseUnit: string;
        isActive: boolean;
      };

      // Skip inactive materials
      if (!material || !material.isActive) continue;

      const warehouse = rule.warehouseId as unknown as {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: string;
        isActive: boolean;
      } | null;

      // Skip rule if warehouse-scoped and warehouse is inactive
      if (warehouse && !warehouse.isActive) continue;

      // Filter balances for FACTORY owned stock only
      const balanceFilter: Record<string, unknown> = {
        materialId: material._id,
        ownerType: 'FACTORY',
      };

      if (warehouse) {
        balanceFilter.warehouseId = warehouse._id;
      }

      const balances = await InventoryBalanceModel.find(balanceFilter);
      const availableQty = balances.reduce((sum, b) => sum + b.quantityAvailable, 0);

      // Check if stock has breached reorderPoint or minStockLevel
      if (availableQty <= rule.reorderPoint || availableQty <= rule.minStockLevel) {
        alerts.push({
          ruleId: rule._id.toString(),
          materialId: material._id.toString(),
          materialCode: material.code,
          materialName: material.name,
          warehouseId: warehouse ? warehouse._id.toString() : null,
          warehouseName: warehouse ? warehouse.name : 'ALL_WAREHOUSES',
          minStockLevel: rule.minStockLevel,
          reorderPoint: rule.reorderPoint,
          reorderQuantity: rule.reorderQuantity,
          targetQuantity: rule.targetQuantity,
          currentAvailableQuantity: availableQty,
          deficitQuantity: Math.max(0, rule.reorderPoint - availableQty),
          unit: material.baseUnit,
        });
      }
    }

    return alerts;
  }
}

export const inventoryDashboardService = new InventoryDashboardService();
