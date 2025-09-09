import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as OrderIcon,
  LocalShipping as PurchaseOrderIcon,
  PointOfSale as CashRegisterIcon,
  Inventory as InventoryIcon,
  BarChart as AnalyticsIcon,
  ManageAccounts as UserIcon,
  Store as StoreIcon,
  LocalShipping as ReceivingIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationItem } from '@/types';

const SIDEBAR_WIDTH = 240;

const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'ダッシュボード',
    icon: DashboardIcon,
  },
  {
    path: '/customers',
    label: '顧客管理',
    icon: PeopleIcon,
  },
  {
    path: '/orders',
    label: '受注管理',
    icon: OrderIcon,
  },
  {
    path: '/cash-register',
    label: 'レジ精算',
    icon: CashRegisterIcon,
  },
  {
    path: '/purchase-orders',
    label: '発注管理',
    icon: PurchaseOrderIcon,
  },
  {
    path: '/purchase-orders/history',
    label: '発注履歴',
    icon: PurchaseOrderIcon,
  },
  {
    path: '/individual-management',
    label: '個体管理',
    icon: QrCodeIcon,
    requiredPermissions: ['staff', 'manager', 'admin'],
  },
  {
    path: '/receiving',
    label: '入庫管理',
    icon: ReceivingIcon,
  },
  {
    path: '/inventory',
    label: '在庫管理',
    icon: InventoryIcon,
    requiredPermissions: ['manager', 'admin'],
  },
  {
    path: '/analytics',
    label: '分析・レポート',
    icon: AnalyticsIcon,
    requiredPermissions: ['manager', 'admin'],
  },
  {
    path: '/products',
    label: '商品マスタ管理',
    icon: InventoryIcon,
    requiredPermissions: ['manager', 'admin'],
  },
  {
    path: '/stores',
    label: '店舗マスタ管理',
    icon: StoreIcon,
    requiredPermissions: ['manager', 'admin'],
  },
  {
    path: '/users',
    label: '担当者マスタ管理',
    icon: UserIcon,
    requiredPermissions: ['manager', 'admin'],
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredItems = navigationItems.filter(item => {
    if (!item.requiredPermissions) return true;
    if (!user) return false;
    return item.requiredPermissions.includes(user.role);
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
            メニュー
          </Typography>
        </Box>
        <Divider />
        
        <List>
          {filteredItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  {IconComponent && (
                    <ListItemIcon>
                      <IconComponent />
                    </ListItemIcon>
                  )}
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;