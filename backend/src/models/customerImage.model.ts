import { Pool } from 'pg';
import { CustomerImage, UUID, DateString } from '../types';

export interface CustomerImageModel {
  id: UUID;
  customer_id: UUID;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  image_type: 'face' | 'glasses' | 'prescription' | 'other';
  title?: string;
  description?: string;
  captured_date?: DateString;
  has_annotations?: boolean;
  uploaded_by: UUID;
  created_at: DateString;
}

export class CustomerImageRepository {
  constructor(private db: Pool) {}

  private transformToCustomerImage(row: CustomerImageModel): CustomerImage {
    return {
      id: row.id,
      customerId: row.customer_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      imageType: row.image_type,
      title: row.title,
      description: row.description,
      capturedDate: row.captured_date,
      hasAnnotations: row.has_annotations,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at
    };
  }

  async create(
    image: Omit<CustomerImage, 'id' | 'createdAt' | 'hasAnnotations'>,
    uploadedBy: UUID
  ): Promise<CustomerImage> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO customer_images (
          customer_id, file_name, file_path, file_size, mime_type,
          image_type, title, description, captured_date, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        image.customerId,
        image.fileName,
        image.filePath,
        image.fileSize,
        image.mimeType,
        image.imageType,
        image.title,
        image.description,
        image.capturedDate,
        uploadedBy
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.transformToCustomerImage(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: UUID): Promise<CustomerImage[]> {
    const query = `
      SELECT * FROM customer_images 
      WHERE customer_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [customerId]);
    return result.rows.map(row => this.transformToCustomerImage(row));
  }

  async findById(id: UUID): Promise<CustomerImage | null> {
    const query = `
      SELECT * FROM customer_images WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.transformToCustomerImage(result.rows[0]) : null;
  }

  async delete(id: UUID): Promise<boolean> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 関連する注釈も削除
      await client.query('DELETE FROM image_annotations WHERE customer_image_id = $1', [id]);
      
      const result = await client.query('DELETE FROM customer_images WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateAnnotationStatus(id: UUID, hasAnnotations: boolean): Promise<void> {
    const query = `
      UPDATE customer_images 
      SET has_annotations = $2 
      WHERE id = $1
    `;

    await this.db.query(query, [id, hasAnnotations]);
  }

  async update(
    id: UUID,
    updates: Partial<Pick<CustomerImage, 'title' | 'description' | 'imageType'>>
  ): Promise<CustomerImage | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMap: Record<string, string> = {
        title: 'title',
        description: 'description',
        imageType: 'image_type'
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
        UPDATE customer_images 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0] ? this.transformToCustomerImage(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}