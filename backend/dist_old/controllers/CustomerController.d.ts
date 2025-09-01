import { Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
export declare class CustomerController {
    getCustomers(req: AuthenticatedRequest, res: Response): Promise<void>;
    getCustomer(req: AuthenticatedRequest, res: Response): Promise<void>;
    createCustomer(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateCustomer(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteCustomer(req: AuthenticatedRequest, res: Response): Promise<void>;
    private generateCustomerCode;
    private toCamelCase;
}
//# sourceMappingURL=CustomerController.d.ts.map