import { Pool } from 'pg';
import { CustomerMemo, UUID, DateString } from '../types';

export interface CustomerMemoModel {
  id: UUID;
  customer_id: UUID;
  memo_text: string;
  memo_type: 'handwritten' | 'text';
  created_by: UUID;
  created_at: DateString;
}

export class CustomerMemoRepository {
  constructor(private db: Pool) {}

  private transformToCustomerMemo(row: CustomerMemoModel): CustomerMemo {
    return {
      id: row.id,
      customerId: row.customer_id,
      memoText: row.memo_text,
      memoType: row.memo_type,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  async create(
    memo: Omit<CustomerMemo, 'id' | 'createdAt'>,
    createdBy: UUID
  ): Promise<CustomerMemo> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO customer_memos (
          customer_id, memo_text, memo_type, created_by
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [
        memo.customerId,
        memo.memoText,
        memo.memoType,
        createdBy
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.transformToCustomerMemo(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: UUID, limit = 50): Promise<CustomerMemo[]> {
    const query = `
      SELECT * FROM customer_memos 
      WHERE customer_id = $1 
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [customerId, limit]);
    return result.rows.map(row => this.transformToCustomerMemo(row));
  }

  async findById(id: UUID): Promise<CustomerMemo | null> {
    const query = `
      SELECT * FROM customer_memos WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.transformToCustomerMemo(result.rows[0]) : null;
  }

  async update(
    id: UUID, 
    memoText: string
  ): Promise<CustomerMemo | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE customer_memos 
        SET memo_text = $2
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, [id, memoText]);
      await client.query('COMMIT');

      return result.rows[0] ? this.transformToCustomerMemo(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: UUID): Promise<boolean> {
    const result = await this.db.query('DELETE FROM customer_memos WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByCustomerId(customerId: UUID): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM customer_memos WHERE customer_id = $1', 
      [customerId]
    );
    return result.rowCount || 0;
  }
}