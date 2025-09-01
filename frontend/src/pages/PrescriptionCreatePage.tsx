import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Container,
  Breadcrumbs,
  Link,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { Customer, Prescription } from '@/types';
import { customerService } from '@/services/customer.service';

const PrescriptionCreatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    measuredDate: new Date().toISOString().split('T')[0],
    rightEyeSphere: '',
    rightEyeCylinder: '',
    rightEyeAxis: '',
    rightEyeVision: '',
    leftEyeSphere: '',
    leftEyeCylinder: '',
    leftEyeAxis: '',
    leftEyeVision: '',
    pupilDistance: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchCustomerData(id);
    }
  }, [id]);

  const fetchCustomerData = async (customerId: string) => {
    setIsLoading(true);
    try {
      const response = await customerService.getCustomerById(customerId);
      if (response.success && response.data) {
        setCustomer(response.data);
      } else {
        setError('顧客データの取得に失敗しました');
      }
    } catch (error) {
      console.error('顧客データ取得エラー:', error);
      setError('顧客データの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !customer) return;

    setIsSaving(true);
    setError(null);

    try {
      const prescriptionData = {
        customerId: id,
        measuredDate: formData.measuredDate,
        rightEyeSphere: formData.rightEyeSphere ? parseFloat(formData.rightEyeSphere) : undefined,
        rightEyeCylinder: formData.rightEyeCylinder ? parseFloat(formData.rightEyeCylinder) : undefined,
        rightEyeAxis: formData.rightEyeAxis ? parseInt(formData.rightEyeAxis) : undefined,
        rightEyeVision: formData.rightEyeVision ? parseFloat(formData.rightEyeVision) : undefined,
        leftEyeSphere: formData.leftEyeSphere ? parseFloat(formData.leftEyeSphere) : undefined,
        leftEyeCylinder: formData.leftEyeCylinder ? parseFloat(formData.leftEyeCylinder) : undefined,
        leftEyeAxis: formData.leftEyeAxis ? parseInt(formData.leftEyeAxis) : undefined,
        leftEyeVision: formData.leftEyeVision ? parseFloat(formData.leftEyeVision) : undefined,
        pupilDistance: formData.pupilDistance ? parseFloat(formData.pupilDistance) : undefined,
        notes: formData.notes || undefined,
      };

      const response = await customerService.createPrescription(id, prescriptionData);
      
      if (response.success) {
        navigate(`/customers/${id}`);
      } else {
        setError(response.error?.message || '処方箋の作成に失敗しました');
      }
    } catch (error) {
      console.error('処方箋作成エラー:', error);
      setError('処方箋の作成中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          顧客が見つかりません
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" onClick={() => navigate('/customers')} sx={{ cursor: 'pointer' }}>
          顧客管理
        </Link>
        <Link color="inherit" onClick={() => navigate(`/customers/${id}`)} sx={{ cursor: 'pointer' }}>
          {customer.fullName}
        </Link>
        <Typography color="text.primary">新規測定</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" fontWeight="500" sx={{ mb: 1 }}>
              新規測定・処方箋作成
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {customer.fullName} さん（{customer.customerCode}）
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/customers/${id}`)}
          >
            戻る
          </Button>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            測定情報
          </Typography>
          
          <Grid container spacing={3}>
            {/* 測定日 */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="date"
                label="測定日"
                value={formData.measuredDate}
                onChange={handleInputChange('measuredDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            視力・度数データ
          </Typography>

          <Grid container spacing={3}>
            {/* 右眼データ */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom color="primary">
                  右眼 (R)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="S (球面度数)"
                      placeholder="-2.50"
                      value={formData.rightEyeSphere}
                      onChange={handleInputChange('rightEyeSphere')}
                      type="number"
                      inputProps={{ min: -20, max: 20, step: "0.25" }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="C (円柱度数)"
                      placeholder="-0.75"
                      value={formData.rightEyeCylinder}
                      onChange={handleInputChange('rightEyeCylinder')}
                      type="number"
                      inputProps={{ min: -20, max: 20, step: "0.25" }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="AX (軸)"
                      placeholder="180"
                      value={formData.rightEyeAxis}
                      onChange={handleInputChange('rightEyeAxis')}
                      type="number"
                      inputProps={{ min: 0, max: 180 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="矯正視力"
                      placeholder="1.0"
                      value={formData.rightEyeVision}
                      onChange={handleInputChange('rightEyeVision')}
                      type="number"
                      inputProps={{ min: 0, max: 2, step: "0.1" }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 左眼データ */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom color="secondary">
                  左眼 (L)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="S (球面度数)"
                      placeholder="-2.25"
                      value={formData.leftEyeSphere}
                      onChange={handleInputChange('leftEyeSphere')}
                      type="number"
                      inputProps={{ min: -20, max: 20, step: "0.25" }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="C (円柱度数)"
                      placeholder="-0.50"
                      value={formData.leftEyeCylinder}
                      onChange={handleInputChange('leftEyeCylinder')}
                      type="number"
                      inputProps={{ min: -20, max: 20, step: "0.25" }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="AX (軸)"
                      placeholder="170"
                      value={formData.leftEyeAxis}
                      onChange={handleInputChange('leftEyeAxis')}
                      type="number"
                      inputProps={{ min: 0, max: 180 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="矯正視力"
                      placeholder="1.0"
                      value={formData.leftEyeVision}
                      onChange={handleInputChange('leftEyeVision')}
                      type="number"
                      inputProps={{ min: 0, max: 2, step: "0.1" }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 瞳孔間距離 */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="瞳孔間距離 (PD)"
                placeholder="64.0"
                value={formData.pupilDistance}
                onChange={handleInputChange('pupilDistance')}
                type="number"
                inputProps={{ min: 50, max: 80, step: "0.5" }}
                helperText="mm単位で入力"
              />
            </Grid>

            {/* 備考 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="備考・特記事項"
                placeholder="測定時の特記事項、フィッティングの注意点など"
                value={formData.notes}
                onChange={handleInputChange('notes')}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/customers/${id}`)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '処方箋を保存'}
            </Button>
          </Box>
        </Card>
      </form>
    </Container>
  );
};

export default PrescriptionCreatePage;