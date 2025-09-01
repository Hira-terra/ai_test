import { Pool } from 'pg';
import { 
  Customer, 
  UUID, 
  DateString, 
  Gender,
  CustomerSearchParams,
  PaginationInfo 
} from '../types';

export interface CustomerModel {
  id: UUID;
  customer_code: string;
  last_name: string;
  first_name: string;
  last_name_kana?: string;
  first_name_kana?: string;
  full_name: string;
  full_name_kana?: string;
  gender?: Gender;
  birth_date?: DateString;
  age?: number;
  phone?: string;
  mobile?: string;
  email?: string;
  postal_code?: string;
  address?: string;
  first_visit_date?: DateString;
  last_visit_date?: DateString;
  visit_count: number;
  total_purchase_amount: number;
  notes?: string;
  created_at: DateString;
  updated_at: DateString;
}

export interface CustomerSearchResult {
  customers: Customer[];
  pagination: PaginationInfo;
}

export class CustomerRepository {
  constructor(private db: Pool) {}

  private transformToCustomer(row: CustomerModel): Customer {
    return {
      id: row.id,
      customerCode: row.customer_code,
      lastName: row.last_name,
      firstName: row.first_name,
      lastNameKana: row.last_name_kana,
      firstNameKana: row.first_name_kana,
      fullName: row.full_name,
      fullNameKana: row.full_name_kana,
      gender: row.gender,
      birthDate: row.birth_date,
      age: row.age,
      phone: row.phone,
      mobile: row.mobile,
      email: row.email,
      postalCode: row.postal_code,
      address: row.address,
      firstVisitDate: row.first_visit_date,
      lastVisitDate: row.last_visit_date,
      visitCount: row.visit_count,
      totalPurchaseAmount: row.total_purchase_amount,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const customerCode = await this.generateCustomerCode(client);
      
      const query = `
        INSERT INTO customers (
          customer_code, last_name, first_name, last_name_kana, first_name_kana,
          full_name, full_name_kana, gender, birth_date, age, phone, mobile,
          email, postal_code, address, first_visit_date, visit_count,
          total_purchase_amount, notes
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `;

      const values = [
        customerCode,
        customer.lastName,
        customer.firstName,
        customer.lastNameKana,
        customer.firstNameKana,
        customer.fullName,
        customer.fullNameKana,
        customer.gender,
        customer.birthDate,
        customer.age,
        customer.phone,
        customer.mobile,
        customer.email,
        customer.postalCode,
        customer.address,
        customer.firstVisitDate || new Date().toISOString(),
        customer.visitCount || 1,
        customer.totalPurchaseAmount || 0,
        customer.notes
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.transformToCustomer(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: UUID): Promise<Customer | null> {
    const query = `
      SELECT * FROM customers WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.transformToCustomer(result.rows[0]) : null;
  }

  async update(id: UUID, updates: Partial<Customer>): Promise<Customer | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMap: Record<string, string> = {
        lastName: 'last_name',
        firstName: 'first_name',
        lastNameKana: 'last_name_kana',
        firstNameKana: 'first_name_kana',
        fullName: 'full_name',
        fullNameKana: 'full_name_kana',
        gender: 'gender',
        birthDate: 'birth_date',
        age: 'age',
        phone: 'phone',
        mobile: 'mobile',
        email: 'email',
        postalCode: 'postal_code',
        address: 'address',
        lastVisitDate: 'last_visit_date',
        visitCount: 'visit_count',
        totalPurchaseAmount: 'total_purchase_amount',
        notes: 'notes'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (key in fieldMap && value !== undefined) {
          setClauses.push(`${fieldMap[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        await client.query('ROLLBACK');
        return await this.findById(id);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE customers 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0] ? this.transformToCustomer(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(params: CustomerSearchParams): Promise<CustomerSearchResult> {
    const { 
      search, 
      phone, 
      address, 
      page = 1, 
      limit = 20, 
      sort = 'name' 
    } = params;

    const offset = (page - 1) * limit;
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        full_name ILIKE $${paramIndex} OR 
        full_name_kana ILIKE $${paramIndex} OR
        customer_code ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (phone) {
      whereConditions.push(`(phone LIKE $${paramIndex} OR mobile LIKE $${paramIndex})`);
      queryParams.push(`%${phone}%`);
      paramIndex++;
    }

    if (address) {
      whereConditions.push(`address ILIKE $${paramIndex}`);
      queryParams.push(`%${address}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sortMap: Record<string, string> = {
      name: 'full_name',
      kana: 'full_name_kana',
      last_visit_date: 'last_visit_date DESC'
    };

    const orderBy = sortMap[sort] || 'full_name';

    // 総件数取得
    const countQuery = `
      SELECT COUNT(*) as total
      FROM customers
      ${whereClause}
    `;

    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // データ取得
    const dataQuery = `
      SELECT *
      FROM customers
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await this.db.query(dataQuery, queryParams);

    const customers = dataResult.rows.map(row => this.transformToCustomer(row)) as Customer[];

    const totalPages = Math.ceil(total / limit);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async updateLastVisitDate(id: UUID): Promise<void> {
    const query = `
      UPDATE customers 
      SET last_visit_date = NOW(), visit_count = visit_count + 1, updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [id]);
  }

  async updateTotalPurchaseAmount(id: UUID, additionalAmount: number): Promise<void> {
    const query = `
      UPDATE customers 
      SET total_purchase_amount = total_purchase_amount + $2, updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [id, additionalAmount]);
  }

  private async generateCustomerCode(client: any): Promise<string> {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    const query = `
      SELECT customer_code 
      FROM customers 
      WHERE customer_code LIKE $1
      ORDER BY customer_code DESC 
      LIMIT 1
    `;

    const result = await client.query(query, [`${datePrefix}%`]);
    
    if (result.rows.length === 0) {
      return `${datePrefix}001`;
    }

    const lastCode = result.rows[0].customer_code;
    const sequence = parseInt(lastCode.slice(-3)) + 1;
    
    return `${datePrefix}${sequence.toString().padStart(3, '0')}`;
  }
}