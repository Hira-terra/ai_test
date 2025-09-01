import { Pool } from 'pg';
import { Prescription, UUID, DateString } from '../types';

export interface PrescriptionModel {
  id: UUID;
  customer_id: UUID;
  measured_date: DateString;
  right_eye_sphere?: number;
  right_eye_cylinder?: number;
  right_eye_axis?: number;
  right_eye_vision?: number;
  left_eye_sphere?: number;
  left_eye_cylinder?: number;
  left_eye_axis?: number;
  left_eye_vision?: number;
  pupil_distance?: number;
  notes?: string;
  created_by: UUID;
  created_at: DateString;
}

export class PrescriptionRepository {
  constructor(private db: Pool) {}

  private transformToPrescription(row: PrescriptionModel): Prescription {
    return {
      id: row.id,
      customerId: row.customer_id,
      measuredDate: row.measured_date,
      rightEyeSphere: row.right_eye_sphere,
      rightEyeCylinder: row.right_eye_cylinder,
      rightEyeAxis: row.right_eye_axis,
      rightEyeVision: row.right_eye_vision,
      leftEyeSphere: row.left_eye_sphere,
      leftEyeCylinder: row.left_eye_cylinder,
      leftEyeAxis: row.left_eye_axis,
      leftEyeVision: row.left_eye_vision,
      pupilDistance: row.pupil_distance,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  async create(
    prescription: Omit<Prescription, 'id' | 'createdAt'>,
    createdBy: UUID
  ): Promise<Prescription> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO prescriptions (
          customer_id, measured_date, right_eye_sphere, right_eye_cylinder,
          right_eye_axis, right_eye_vision, left_eye_sphere, left_eye_cylinder,
          left_eye_axis, left_eye_vision, pupil_distance, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        prescription.customerId,
        prescription.measuredDate,
        prescription.rightEyeSphere,
        prescription.rightEyeCylinder,
        prescription.rightEyeAxis,
        prescription.rightEyeVision,
        prescription.leftEyeSphere,
        prescription.leftEyeCylinder,
        prescription.leftEyeAxis,
        prescription.leftEyeVision,
        prescription.pupilDistance,
        prescription.notes,
        createdBy
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.transformToPrescription(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: UUID): Promise<Prescription[]> {
    const query = `
      SELECT * FROM prescriptions 
      WHERE customer_id = $1 
      ORDER BY measured_date DESC, created_at DESC
    `;

    const result = await this.db.query(query, [customerId]);
    return result.rows.map(row => this.transformToPrescription(row));
  }

  async findById(id: UUID): Promise<Prescription | null> {
    const query = `
      SELECT * FROM prescriptions WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.transformToPrescription(result.rows[0]) : null;
  }

  async update(
    id: UUID, 
    updates: Partial<Prescription>
  ): Promise<Prescription | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMap: Record<string, string> = {
        measuredDate: 'measured_date',
        rightEyeSphere: 'right_eye_sphere',
        rightEyeCylinder: 'right_eye_cylinder',
        rightEyeAxis: 'right_eye_axis',
        rightEyeVision: 'right_eye_vision',
        leftEyeSphere: 'left_eye_sphere',
        leftEyeCylinder: 'left_eye_cylinder',
        leftEyeAxis: 'left_eye_axis',
        leftEyeVision: 'left_eye_vision',
        pupilDistance: 'pupil_distance',
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

      values.push(id);

      const query = `
        UPDATE prescriptions 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0] ? this.transformToPrescription(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLatestPrescription(customerId: UUID): Promise<Prescription | null> {
    const query = `
      SELECT * FROM prescriptions 
      WHERE customer_id = $1 
      ORDER BY measured_date DESC, created_at DESC 
      LIMIT 1
    `;

    const result = await this.db.query(query, [customerId]);
    return result.rows[0] ? this.transformToPrescription(result.rows[0]) : null;
  }
}