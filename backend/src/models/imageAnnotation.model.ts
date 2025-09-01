import { Pool } from 'pg';
import { ImageAnnotation, FabricCanvasData, UUID, DateString } from '../types';

export interface ImageAnnotationModel {
  id: UUID;
  customer_image_id: UUID;
  annotation_data: FabricCanvasData;
  version: number;
  created_by: UUID;
  updated_by: UUID;
  created_at: DateString;
  updated_at: DateString;
}

export class ImageAnnotationRepository {
  constructor(private db: Pool) {}

  private transformToImageAnnotation(row: ImageAnnotationModel): ImageAnnotation {
    return {
      id: row.id,
      customerImageId: row.customer_image_id,
      annotationData: row.annotation_data,
      version: row.version,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(
    customerImageId: UUID,
    annotationData: FabricCanvasData,
    createdBy: UUID
  ): Promise<ImageAnnotation> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO image_annotations (
          customer_image_id, annotation_data, version, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *
      `;

      const values = [
        customerImageId,
        JSON.stringify(annotationData),
        1,
        createdBy
      ];

      const result = await client.query(query, values);

      // 画像の注釈フラグを更新
      await client.query(
        'UPDATE customer_images SET has_annotations = true WHERE id = $1',
        [customerImageId]
      );

      await client.query('COMMIT');

      const annotation = this.transformToImageAnnotation(result.rows[0]);
      annotation.annotationData = annotationData; // JSONパースされた状態を保持
      return annotation;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByImageId(customerImageId: UUID): Promise<ImageAnnotation | null> {
    const query = `
      SELECT * FROM image_annotations 
      WHERE customer_image_id = $1 
      ORDER BY version DESC 
      LIMIT 1
    `;

    const result = await this.db.query(query, [customerImageId]);
    
    if (result.rows[0]) {
      const annotation = this.transformToImageAnnotation(result.rows[0]);
      // JSON文字列をパース
      if (typeof annotation.annotationData === 'string') {
        annotation.annotationData = JSON.parse(annotation.annotationData as string);
      }
      return annotation;
    }
    
    return null;
  }

  async update(
    customerImageId: UUID,
    annotationData: FabricCanvasData,
    updatedBy: UUID
  ): Promise<ImageAnnotation | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 現在のバージョンを取得
      const versionQuery = `
        SELECT COALESCE(MAX(version), 0) + 1 as new_version 
        FROM image_annotations 
        WHERE customer_image_id = $1
      `;
      const versionResult = await client.query(versionQuery, [customerImageId]);
      const newVersion = versionResult.rows[0].new_version;

      // 新しいバージョンとして挿入
      const query = `
        INSERT INTO image_annotations (
          customer_image_id, annotation_data, version, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *
      `;

      const values = [
        customerImageId,
        JSON.stringify(annotationData),
        newVersion,
        updatedBy
      ];

      const result = await client.query(query, values);

      // 画像の注釈フラグを更新
      await client.query(
        'UPDATE customer_images SET has_annotations = true WHERE id = $1',
        [customerImageId]
      );

      await client.query('COMMIT');

      const annotation = this.transformToImageAnnotation(result.rows[0]);
      annotation.annotationData = annotationData; // JSONパースされた状態を保持
      return annotation;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getVersionHistory(customerImageId: UUID): Promise<ImageAnnotation[]> {
    const query = `
      SELECT * FROM image_annotations 
      WHERE customer_image_id = $1 
      ORDER BY version DESC
    `;

    const result = await this.db.query(query, [customerImageId]);
    return result.rows.map(row => {
      const annotation = this.transformToImageAnnotation(row);
      // JSON文字列をパース
      if (typeof annotation.annotationData === 'string') {
        annotation.annotationData = JSON.parse(annotation.annotationData as string);
      }
      return annotation;
    });
  }

  async delete(customerImageId: UUID): Promise<boolean> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM image_annotations WHERE customer_image_id = $1',
        [customerImageId]
      );

      // 画像の注釈フラグを更新
      await client.query(
        'UPDATE customer_images SET has_annotations = false WHERE id = $1',
        [customerImageId]
      );

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}