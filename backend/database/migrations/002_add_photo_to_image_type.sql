-- Migration: Add 'photo' to image_type enum
-- Date: 2025-10-03
-- Description: 顧客画像管理機能で'photo'タイプを使用するため、image_type enumに追加

-- 'photo'がまだ存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'photo'
        AND enumtypid = 'image_type'::regtype
    ) THEN
        ALTER TYPE image_type ADD VALUE 'photo';
        RAISE NOTICE 'Added photo to image_type enum';
    ELSE
        RAISE NOTICE 'photo already exists in image_type enum';
    END IF;
END$$;
