import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  Alert
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  FlipCameraAndroid as FlipCameraIcon,
  PhotoCamera as CaptureIcon
} from '@mui/icons-material';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ open, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // カメラの起動
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setError(null);

      // 既存のストリームを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // 複数カメラの確認
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

    } catch (err) {
      console.error('カメラ起動エラー:', err);
      setError('カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。');
    }
  };

  // カメラの切り替え
  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // 写真の撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // キャンバスのサイズをビデオに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // キャンバスを画像データURLに変換
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
  };

  // 撮り直し
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // 保存
  const savePhoto = () => {
    if (!capturedImage) return;

    // Data URLをBlobに変換
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        handleClose();
      })
      .catch(err => {
        console.error('画像保存エラー:', err);
        setError('画像の保存に失敗しました');
      });
  };

  // ダイアログを閉じる
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  // ダイアログが開いたときにカメラを起動
  useEffect(() => {
    if (open) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <CameraIcon />
            <Typography variant="h6">カメラで撮影</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            bgcolor: 'black',
            borderRadius: 1,
            overflow: 'hidden',
            aspectRatio: '4/3'
          }}
        >
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />

              {/* カメラ切り替えボタン */}
              {hasMultipleCameras && (
                <IconButton
                  onClick={switchCamera}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    bgcolor: 'rgba(255,255,255,0.8)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                  }}
                >
                  <FlipCameraIcon />
                </IconButton>
              )}

              {/* 撮影ボタン */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}
              >
                <IconButton
                  onClick={capturePhoto}
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'white',
                    border: '4px solid #1976d2',
                    '&:hover': { bgcolor: '#f0f0f0' }
                  }}
                >
                  <CaptureIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                </IconButton>
              </Box>
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          )}
        </Box>

        {/* 非表示のキャンバス（撮影用） */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>

      <DialogActions>
        {!capturedImage ? (
          <Button onClick={handleClose}>キャンセル</Button>
        ) : (
          <>
            <Button onClick={retakePhoto} color="secondary">
              撮り直し
            </Button>
            <Button onClick={savePhoto} variant="contained">
              この写真を使用
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
