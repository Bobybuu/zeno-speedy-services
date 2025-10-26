// src/pages/vendor/VendorDashboard.tsx
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Update the VendorDashboard to accept children OR use Outlet
interface VendorDashboardProps {
  children?: React.ReactNode;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ children }) => {
  const { currentUser, vendorProfile, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/vendor/products', icon: Package },
    { name: 'Orders', href: '/vendor/orders', icon: ShoppingCart },
    { name: 'Analytics', href: '/vendor/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/vendor/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h1 className="text-2xl font-bold text-primary">ZENO</h1>
              <p className="text-xs text-muted-foreground">Vendor Portal</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {vendorProfile?.business_name || currentUser?.first_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {vendorProfile?.business_type?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-secondary text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h1>
            <div className="w-9"></div> {/* Spacer for balance */}
          </div>
        </header>

        {/* Page content - Use children if provided, otherwise use Outlet for nested routes */}
        <main className="p-4 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default VendorDashboard;