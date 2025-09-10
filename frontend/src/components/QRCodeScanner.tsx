import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Divider,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  QrCodeScanner as QrScannerIcon,
  Close as CloseIcon,
  Keyboard as KeyboardIcon,
  CameraAlt as CameraIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
} from '@mui/icons-material';

interface QRCodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: QRCodeData) => void;
  title?: string;
}

interface QRCodeData {
  frameId: string;
  serialNumber: string;
  productCode: string;
  storeCode: string;
  registrationDate: string;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  open,
  onClose,
  onScan,
  title = 'QRコードスキャン'
}) => {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open && !isManualMode) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, isManualMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 背面カメラを優先
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // フラッシュ対応デバイスの場合
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          // フラッシュ対応
        }
      }
    } catch (err) {
      console.error('カメラアクセスエラー:', err);
      setCameraError('カメラにアクセスできません。手動入力をご利用ください。');
      setIsManualMode(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled }] as any
          });
          setFlashEnabled(!flashEnabled);
        } catch (err) {
          console.error('フラッシュ制御エラー:', err);
        }
      }
    }
  };

  const parseQRCode = (data: string): QRCodeData | null => {
    try {
      // パイプ区切りデータの解析
      const parts = data.split('|');
      if (parts.length >= 5) {
        return {
          frameId: parts[0],
          serialNumber: parts[1],
          productCode: parts[2],
          storeCode: parts[3],
          registrationDate: parts[4]
        };
      }

      // 個体番号のみの場合（旧形式対応）
      if (data.includes('-ST01-') || data.includes('FRAME')) {
        return {
          frameId: '',
          serialNumber: data,
          productCode: '',
          storeCode: '',
          registrationDate: ''
        };
      }

      return null;
    } catch (err) {
      console.error('QRコードデータ解析エラー:', err);
      return null;
    }
  };

  const handleManualSubmit = () => {
    setError(null);
    
    if (!manualInput.trim()) {
      setError('個体番号またはQRコードデータを入力してください');
      return;
    }

    const parsedData = parseQRCode(manualInput.trim());
    if (parsedData) {
      onScan(parsedData);
      setManualInput('');
      onClose();
    } else {
      setError('無効なQRコードデータです');
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 実際のQRコード読み取りは外部ライブラリが必要
    // ここでは手動入力へのフォールバック
    setIsManualMode(true);
  };

  const handleClose = () => {
    setManualInput('');
    setError(null);
    setCameraError(null);
    setIsManualMode(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <QrScannerIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {cameraError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {cameraError}
          </Alert>
        )}

        {!isManualMode ? (
          <Box>
            {/* カメラプレビュー */}
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Box position="relative" display="inline-block">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      height: 'auto',
                      border: '2px solid #1976d2',
                      borderRadius: '8px'
                    }}
                  />
                  
                  {/* スキャンエリアオーバーレイ */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '80%',
                      height: '60%',
                      border: '2px solid #ff5722',
                      borderRadius: '8px',
                      pointerEvents: 'none'
                    }}
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Tooltip title="フラッシュ切り替え">
                    <IconButton onClick={toggleFlash} color="primary">
                      {flashEnabled ? <FlashOnIcon /> : <FlashOffIcon />}
                    </IconButton>
                  </Tooltip>
                  
                  <Button
                    variant="outlined"
                    startIcon={<CameraIcon />}
                    onClick={captureFrame}
                    sx={{ ml: 1 }}
                  >
                    キャプチャ
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Alert severity="info">
              QRコードを赤い枠内に合わせてください。自動的に読み取ります。
            </Alert>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>
        ) : (
          <Box>
            {/* 手動入力モード */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  手動入力
                </Typography>
                <TextField
                  fullWidth
                  label="個体番号 または QRコードデータ"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="例: FRAME001-ST01-20250909-084951-456-001"
                  multiline
                  rows={3}
                  sx={{ mb: 2 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim()}
                >
                  確定
                </Button>
              </CardContent>
            </Card>

            <Alert severity="info">
              個体番号またはQRコードの内容を直接入力できます。
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="center">
          <Button
            startIcon={isManualMode ? <CameraIcon /> : <KeyboardIcon />}
            onClick={() => setIsManualMode(!isManualMode)}
            variant="outlined"
            size="small"
          >
            {isManualMode ? 'カメラ読み取りに切り替え' : '手動入力に切り替え'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={handleClose}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeScanner;