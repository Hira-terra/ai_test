// @MOCK_UI: モック使用時のバナー表示コンポーネント
import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface MockBannerProps {
  message?: string;
  variant?: 'warning' | 'info';
}

const MockBanner: React.FC<MockBannerProps> = ({ 
  message = 'モックデータ使用中 - 本番環境では使用不可', 
  variant = 'warning' 
}) => {
  // @MOCK_UI: 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Alert 
      severity={variant}
      icon={<WarningIcon />}
      sx={{ 
        mb: 2,
        borderRadius: 0,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" fontWeight="bold">
          ⚠️ {message}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          開発環境のみ表示
        </Typography>
      </Box>
    </Alert>
  );
};

export default MockBanner;