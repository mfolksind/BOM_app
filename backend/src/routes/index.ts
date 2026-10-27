import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from '../modules/auth';
import { adminsRoutes } from '../modules/admins';
import { customerRoutes } from '../modules/customers';
import { materialRoutes } from '../modules/materials';
import { productRoutes } from '../modules/products';
import { bomRoutes } from '../modules/bom';
import { warehouseRoutes } from '../modules/warehouses';
import { processStageRoutes } from '../modules/process-stages';
import { machineRoutes } from '../modules/machines';
import {
  inventoryRoutes,
  inboundChallanRoutes,
  openingBalanceRoutes,
  stockTransferRoutes,
  materialReservationRoutes,
  materialReorderRuleRoutes,
  stockReconciliationRoutes,
} from '../modules/inventory';
import { workOrderRoutes } from '../modules/work-orders';
import {
  productionOrderRoutes,
  productionBatchRoutes,
  materialIssueRoutes,
  productionOutputRoutes,
} from '../modules/production';
import { drumRoutes, packingListRoutes } from '../modules/packing';
import { dispatchRoutes, outboundChallanRoutes } from '../modules/dispatch';
import { reportRoutes } from '../modules/reports';

const router = Router();

// System health & readiness
router.use('/', healthRoutes);

// Authentication & Session
router.use('/auth', authRoutes);

// Super Admin Account Management
router.use('/admins', adminsRoutes);

// Master Data Modules (Prompt 4)
router.use('/customers', customerRoutes);
router.use('/materials', materialRoutes);
router.use('/products', productRoutes);
router.use('/boms', bomRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/process-stages', processStageRoutes);
router.use('/machines', machineRoutes);

// Inventory Management & Stock Ledger (Prompt 5)
router.use('/inventory', inventoryRoutes);
router.use('/inbound-challans', inboundChallanRoutes);
router.use('/opening-balances', openingBalanceRoutes);
router.use('/stock-transfers', stockTransferRoutes);
router.use('/material-reservations', materialReservationRoutes);
router.use('/material-reorder-rules', materialReorderRuleRoutes);
router.use('/stock-reconciliations', stockReconciliationRoutes);

// Work Orders & Production (Prompt 6)
router.use('/work-orders', workOrderRoutes);
router.use('/production-orders', productionOrderRoutes);
router.use('/production-batches', productionBatchRoutes);
router.use('/material-issues', materialIssueRoutes);
router.use('/production-outputs', productionOutputRoutes);

// Packing & Drums (Prompt 7)
router.use('/drums', drumRoutes);
router.use('/packing-lists', packingListRoutes);

// Dispatch & Outbound Challans (Prompt 7)
router.use('/dispatches', dispatchRoutes);
router.use('/outbound-challans', outboundChallanRoutes);

// Global Stock Dashboard, Reports, Reconciliation & Traceability (Prompt 8)
router.use('/reports', reportRoutes);

export const appRouter = router;
