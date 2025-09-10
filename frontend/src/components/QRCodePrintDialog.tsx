import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Print as PrintIcon,
  QrCode2 as QrCodeIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import QRCode from 'qrcode';
import { Frame } from '../types';

interface QRCodePrintDialogProps {
  open: boolean;
  onClose: () => void;
  frames: Frame[];
  storeCode?: string;
}

interface QRCodeData {
  frameId: string;
  serialNumber: string;
  productCode: string;
  storeCode: string;
  registrationDate: string;
  qrCodeDataURL: string;
}

const QRCodePrintDialog: React.FC<QRCodePrintDialogProps> = ({
  open,
  onClose,
  frames,
  storeCode = 'ST01'
}) => {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProductInfo, setShowProductInfo] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QRコードラベル_${new Date().toISOString().slice(0, 10)}`,
    pageStyle: `
      @media print {
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          font-family: 'Noto Sans JP', sans-serif;
        }
        .qr-label {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `
  });

  useEffect(() => {
    if (open && frames.length > 0) {
      generateQRCodes();
    }
  }, [open, frames]);

  const generateQRCodes = async () => {
    setLoading(true);
    try {
      const qrPromises = frames.map(async (frame) => {
        // QRコードに含める情報
        const qrData = {
          frameId: frame.id,
          serialNumber: frame.serialNumber,
          productCode: frame.product?.productCode || 'UNKNOWN',
          storeCode: storeCode,
          registrationDate: new Date().toISOString()
        };

        // QRコード用文字列（パイプ区切り）
        const qrString = `${qrData.frameId}|${qrData.serialNumber}|${qrData.productCode}|${qrData.storeCode}|${qrData.registrationDate}`;
        
        // QRコード画像生成
        const qrCodeDataURL = await QRCode.toDataURL(qrString, {
          width: 128,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        return {
          ...qrData,
          qrCodeDataURL
        };
      });

      const generatedQRCodes = await Promise.all(qrPromises);
      setQrCodes(generatedQRCodes);
    } catch (error) {
      console.error('QRコード生成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];
      const link = document.createElement('a');
      link.download = `QR_${qrCode.serialNumber}.png`;
      link.href = qrCode.qrCodeDataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // ダウンロード間隔を少し空ける
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <QrCodeIcon color="primary" />
          <Typography variant="h6">QRコードラベル印刷</Typography>
          <Typography variant="body2" color="textSecondary">
            ({frames.length}個の個体)
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              QRコードを生成中...
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  • QRコードには個体ID、個体番号、商品コード、店舗コード、登録日が含まれます<br/>
                  • ラベルサイズ: 40mm × 30mm（推奨）<br/>
                  • 印刷設定: A4用紙、マージン10mm
                </Typography>
              </Alert>

              <FormControlLabel
                control={
                  <Switch
                    checked={showProductInfo}
                    onChange={(e) => setShowProductInfo(e.target.checked)}
                  />
                }
                label="商品情報を表示"
              />
            </Box>

            {/* 印刷用コンテンツ */}
            <div ref={printRef} style={{ backgroundColor: 'white' }}>
              <Grid container spacing={1}>
                {qrCodes.map((qrCode, index) => (
                  <Grid item xs={6} sm={4} md={3} key={qrCode.frameId}>
                    <Paper 
                      className="qr-label"
                      sx={{ 
                        p: 1.5, 
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        minHeight: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      {/* QRコード画像 */}
                      <Box>
                        <img 
                          src={qrCode.qrCodeDataURL} 
                          alt={`QR Code for ${qrCode.serialNumber}`}
                          style={{ width: '80px', height: '80px' }}
                        />
                      </Box>

                      {/* 個体番号 */}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          wordBreak: 'break-all'
                        }}
                      >
                        {qrCode.serialNumber}
                      </Typography>

                      {/* 商品情報（オプション） */}
                      {showProductInfo && (
                        <Box>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                            {qrCode.productCode}
                          </Typography>
                          <br />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                            {formatDate(qrCode.registrationDate)}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </div>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="textSecondary">
              印刷プレビュー: {qrCodes.length}個のQRコードラベル
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          閉じる
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownloadAll}
          disabled={loading || qrCodes.length === 0}
        >
          一括ダウンロード
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={loading || qrCodes.length === 0}
        >
          印刷
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodePrintDialog;