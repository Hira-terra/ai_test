import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

const CashRegisterPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        レジ精算
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            レジ精算機能は今後実装予定です
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CashRegisterPage;