import React, { useState } from 'react';
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
  Collapse,
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
  Business as BusinessIcon,
  Build as ProductionIcon,
  Percent as DiscountIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationItem } from '@/types';

const SIDEBAR_WIDTH = 240;

// グループ化されたメニュー構造
interface MenuGroup {
  label: string;
  icon: React.ComponentType;
  items: NavigationItem[];
}

const menuGroups: MenuGroup[] = [
  // メイン業務
  {
    label: '業務管理',
    icon: OrderIcon,
    items: [
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
    ]
  },
  // 発注・入庫管理
  {
    label: '発注・入庫管理',
    icon: PurchaseOrderIcon,
    items: [
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
        path: '/receiving',
        label: '入庫管理',
        icon: ReceivingIcon,
      },
      {
        path: '/receiving/history',
        label: '入庫済み一覧',
        icon: ReceivingIcon,
        requiredPermissions: ['manager', 'admin'],
      },
    ]
  },
  // 在庫・製作管理
  {
    label: '在庫・製作管理',
    icon: InventoryIcon,
    items: [
      {
        path: '/stock-replenishment',
        label: '在庫発注',
        icon: InventoryIcon,
        requiredPermissions: ['manager', 'admin'],
      },
      {
        path: '/individual-management',
        label: '個体管理',
        icon: QrCodeIcon,
        requiredPermissions: ['staff', 'manager', 'admin'],
      },
      {
        path: '/production',
        label: '製作進捗管理',
        icon: ProductionIcon,
        requiredPermissions: ['staff', 'manager', 'admin'],
      },
      {
        path: '/inventory',
        label: '在庫管理',
        icon: InventoryIcon,
        requiredPermissions: ['manager', 'admin'],
      },
    ]
  },
  // マスタ管理
  {
    label: 'マスタ管理',
    icon: StoreIcon,
    items: [
      {
        path: '/products',
        label: '商品マスタ',
        icon: InventoryIcon,
        requiredPermissions: ['manager', 'admin'],
      },
      {
        path: '/stores',
        label: '店舗マスタ',
        icon: StoreIcon,
        requiredPermissions: ['manager', 'admin'],
      },
      {
        path: '/suppliers',
        label: '仕入先マスタ',
        icon: BusinessIcon,
        requiredPermissions: ['manager', 'admin'],
      },
      {
        path: '/users',
        label: '担当者マスタ',
        icon: UserIcon,
        requiredPermissions: ['manager', 'admin'],
      },
      {
        path: '/discount-master',
        label: '値引きマスタ',
        icon: DiscountIcon,
        requiredPermissions: ['manager', 'admin'],
      },
    ]
  },
  // 分析・レポート
  {
    label: '分析・レポート',
    icon: AnalyticsIcon,
    items: [
      {
        path: '/analytics',
        label: '分析・レポート',
        icon: AnalyticsIcon,
        requiredPermissions: ['manager', 'admin'],
      },
    ]
  }
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '業務管理': true, // 業務管理は初期状態で展開
    'マスタ管理': false,
    '発注・入庫管理': false,
    '在庫・製作管理': false,
    '分析・レポート': false,
  });

  // 権限をチェックして表示可能なアイテムのみをフィルタリング
  const filterItems = (items: NavigationItem[]) => {
    return items.filter(item => {
      if (!item.requiredPermissions) return true;
      if (!user) return false;
      return item.requiredPermissions.includes(user.role);
    });
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleGroupToggle = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  // 現在のパスがどのグループに含まれるかをチェック
  const isGroupActive = (group: MenuGroup) => {
    const filteredItems = filterItems(group.items);
    return filteredItems.some(item => 
      location.pathname === item.path || 
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
    );
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
          {menuGroups.map((group) => {
            const filteredItems = filterItems(group.items);
            if (filteredItems.length === 0) return null;

            const GroupIcon = group.icon;
            const isExpanded = expandedGroups[group.label];
            const groupActive = isGroupActive(group);

            return (
              <React.Fragment key={group.label}>
                {/* グループヘッダー */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleGroupToggle(group.label)}
                    sx={{
                      backgroundColor: groupActive ? 'action.selected' : 'transparent',
                      fontWeight: 'bold',
                    }}
                  >
                    <ListItemIcon>
                      <GroupIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={group.label} 
                      sx={{ 
                        '& .MuiTypography-root': { 
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        } 
                      }} 
                    />
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>

                {/* グループ内のアイテム */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
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
                              pl: 4, // インデント
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
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <IconComponent sx={{ fontSize: '1.2rem' }} />
                              </ListItemIcon>
                            )}
                            <ListItemText 
                              primary={item.label} 
                              sx={{ 
                                '& .MuiTypography-root': { 
                                  fontSize: '0.85rem'
                                } 
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;