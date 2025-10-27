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
  User,
  Eye,
  Plus,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface VendorDashboardProps {
  children?: React.ReactNode;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ children }) => {
  const { currentUser, vendorProfile, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">ZENO</h1>
                <p className="text-xs text-gray-500">Vendor Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-sm">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {vendorProfile?.business_name || currentUser?.first_name || 'Vendor'}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {vendorProfile?.business_type?.replace(/_/g, ' ') || 'Business'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 mx-2",
                    isActive
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn(
                    "mr-3 h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 sticky bottom-0 bg-white">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50 py-3 rounded-lg transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <section className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                    Welcome back, {vendorProfile?.business_name || currentUser?.first_name}!
                  </h2>
                  <p className="text-primary-50 text-sm sm:text-base">
                    Here's what's happening with your business today.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 bg-white/20 rounded-lg px-4 py-2 text-sm backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <span>20°C</span>
                    <span>•</span>
                    <span>Mostly cloudy</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">0</h3>
                    <p className="text-xs text-gray-500 mt-1">Active products</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <Button variant="link" className="p-0 h-auto text-xs text-blue-600 mt-3 hover:text-blue-700">
                  View details →
                </Button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">0</h3>
                    <p className="text-xs text-gray-500 mt-1">Require attention</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <Button variant="link" className="p-0 h-auto text-xs text-orange-600 mt-3 hover:text-orange-700">
                  View details →
                </Button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available Balance</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">KES 0</h3>
                    <p className="text-xs text-gray-500 mt-1">Ready for payout</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <Button variant="link" className="p-0 h-auto text-xs text-green-600 mt-3 hover:text-green-700">
                  View details →
                </Button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">0%</h3>
                    <p className="text-xs text-gray-500 mt-1">Order success rate</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <Button variant="link" className="p-0 h-auto text-xs text-purple-600 mt-3 hover:text-purple-700">
                  View details →
                </Button>
              </div>
            </section>

            {/* Two Column Layout */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                  <span className="text-xs text-gray-500">Latest orders requiring attention</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">John Doe</p>
                        <p className="text-sm text-gray-500">2 min ago</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">KES 2,450</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                  </div>
                  
                  {/* Empty state for other orders */}
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">No other orders at the moment</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
                <div className="space-y-3">
                  <Button className="w-full justify-start h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-md transition-all duration-200">
                    <Plus className="mr-3 h-5 w-5" />
                    Add New Product
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 border-gray-300 hover:bg-gray-50 transition-colors duration-200">
                    <Eye className="mr-3 h-5 w-5" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 border-gray-300 hover:bg-gray-50 transition-colors duration-200">
                    <ShoppingCart className="mr-3 h-5 w-5" />
                    Manage Orders
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 border-gray-300 hover:bg-gray-50 transition-colors duration-200">
                    <Settings className="mr-3 h-5 w-5" />
                    Store Settings
                  </Button>
                </div>
                
                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Store Performance</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">0</p>
                      <p className="text-xs text-blue-600">Today's Views</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">0</p>
                      <p className="text-xs text-green-600">Conversions</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VendorDashboard;