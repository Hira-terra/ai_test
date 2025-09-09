import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivateRoute from '@/components/PrivateRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import CustomerSearchPage from '@/pages/CustomerSearchPage';
import CustomerCreatePage from '@/pages/CustomerCreatePage';
import CustomerDetailPage from '@/pages/CustomerDetailPage';
import PrescriptionCreatePage from '@/pages/PrescriptionCreatePage';
import OrderListPage from '@/pages/OrderListPage';
import OrderEntryPage from '@/pages/OrderEntryPage';
import InventoryPage from '@/pages/InventoryPage';
import CashRegisterPage from '@/pages/CashRegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductMasterPage from '@/pages/ProductMasterPage';
import StoreListPage from '@/pages/stores/StoreListPage';
import UserMasterPage from '@/pages/UserMasterPage';
import PurchaseOrderListPage from '@/pages/PurchaseOrderListPage';
import PurchaseOrderHistoryPage from '@/pages/PurchaseOrderHistoryPage';
import { ReceivingManagementPage } from '@/pages/ReceivingManagementPage';
import { IndividualManagementPage } from '@/pages/IndividualManagementPage';

const App: React.FC = () => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="customers" element={<CustomerSearchPage />} />
              <Route path="customers/new" element={<CustomerCreatePage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="customers/:id/edit" element={<CustomerCreatePage />} />
              <Route path="customers/:id/prescriptions/new" element={<PrescriptionCreatePage />} />
              <Route path="orders" element={<OrderListPage />} />
              <Route path="orders/new" element={<OrderEntryPage />} />
              <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
              <Route path="purchase-orders/history" element={<PurchaseOrderHistoryPage />} />
              <Route path="receiving" element={<ReceivingManagementPage />} />
              <Route path="individual-management" element={<IndividualManagementPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="cash-register" element={<CashRegisterPage />} />
              <Route path="products" element={<ProductMasterPage />} />
              <Route path="stores" element={<StoreListPage />} />
              <Route path="users" element={<UserMasterPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </Box>
  );
};

export default App;