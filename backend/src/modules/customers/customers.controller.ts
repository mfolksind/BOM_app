import { Request, Response } from 'express';
import { customersService } from './customers.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpdateCustomerStatusInput,
  CustomerQueryParams,
} from './customers.validation';

export class CustomersController {
  createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateCustomerInput;
    const customer = await customersService.createCustomer(input, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.created(res, customer, 'Customer created successfully');
  });

  listCustomers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as CustomerQueryParams;
    const result = await customersService.listCustomers(query);
    return ApiResponseUtil.success(res, result.items, 'Customers retrieved successfully', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    });
  });

  getCustomerById = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersService.getCustomerById(req.params.id);
    return ApiResponseUtil.success(res, customer, 'Customer retrieved successfully');
  });

  updateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateCustomerInput;
    const updated = await customersService.updateCustomer(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Customer updated successfully');
  });

  updateCustomerStatus = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateCustomerStatusInput;
    const updated = await customersService.updateCustomerStatus(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Customer status updated successfully');
  });

  deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
    await customersService.deleteCustomer(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, null, 'Customer deleted successfully');
  });
}

export const customersController = new CustomersController();
