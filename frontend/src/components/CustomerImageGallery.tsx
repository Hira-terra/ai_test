import React, { useState } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
  PhotoCamera as PhotoCameraIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { CustomerImage } from '@/types';

// 実API使用に統一済み - モック参照削除

interface CustomerImageGalleryProps {
  images: CustomerImage[];
  loading?: boolean;
  onImageUpload?: (file: File) => void;
  onImageDelete?: (imageId: string) => void;
  onImageEdit?: (imageId: string) => void;
  onImageView?: (image: CustomerImage) => void;
}


export const CustomerImageGallery: React.FC<CustomerImageGalleryProps> = ({
  images,
  loading = false,
  onImageUpload,
  onImageDelete,
  onImageEdit,
  onImageView,
}) => {
  const [selectedImage, setSelectedImage] = useState<CustomerImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleImageClick = (image: CustomerImage) => {
    setSelectedImage(image);
    onImageView?.(image);
  };

  const handleDeleteClick = (imageId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setImageToDelete(imageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (imageToDelete) {
      onImageDelete?.(imageToDelete);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const getImageTypeColor = (type: CustomerImage['imageType']) => {
    switch (type) {
      case 'face':
        return 'primary';
      case 'glasses':
        return 'secondary';
      case 'prescription':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getImageTypeLabel = (type: CustomerImage['imageType']) => {
    switch (type) {
      case 'face':
        return '顔写真';
      case 'glasses':
        return 'メガネ';
      case 'prescription':
        return '処方箋';
      default:
        return 'その他';
    }
  };

  const getImageIcon = (type: CustomerImage['imageType'], mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <DescriptionIcon sx={{ fontSize: 60, color: 'grey.400' }} />;
    }
    return <PhotoCameraIcon sx={{ fontSize: 60, color: 'grey.400' }} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>

      {/* アップロードボタン */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <input
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          id="image-upload-button"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="image-upload-button">
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            disabled={!onImageUpload}
          >
            画像をアップロード
          </Button>
        </label>
      </Box>

      {/* 画像グリッド */}
      {images.length > 0 ? (
        <Grid container spacing={2}>
          {images.map((image) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleImageClick(image)}
              >
                <CardMedia
                  component="div"
                  sx={{
                    height: 200,
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {/* 実API画像表示 */}
                  {image.filePath ? (
                    <img
                      src={`/api/customers/${image.customerId}/images/${image.id}/file`}
                      alt={image.title || image.fileName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    getImageIcon(image.imageType, image.mimeType)
                  )}

                  {/* 注釈ありバッジ */}
                  {image.hasAnnotations && (
                    <Chip
                      label="注釈あり"
                      size="small"
                      color="info"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                      }}
                    />
                  )}

                  {/* アクションボタン */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 0.5,
                    }}
                  >
                    <Tooltip title="編集">
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'background.paper' },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageEdit?.(image.id);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="削除">
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'background.paper' },
                        }}
                        onClick={(e) => handleDeleteClick(image.id, e)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardMedia>

                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="subtitle2" noWrap>
                      {image.title || image.fileName}
                    </Typography>
                    <Chip
                      label={getImageTypeLabel(image.imageType)}
                      size="small"
                      color={getImageTypeColor(image.imageType)}
                    />
                  </Box>
                  {image.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {image.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {new Date(image.capturedDate || image.createdAt).toLocaleDateString('ja-JP')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <PhotoCameraIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            画像がアップロードされていません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            顧客の顔写真、メガネ、処方箋などの画像をアップロードできます
          </Typography>
        </Card>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>画像を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            この画像を削除すると、関連する注釈も削除されます。この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};