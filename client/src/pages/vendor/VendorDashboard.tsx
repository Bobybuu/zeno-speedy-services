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
import { useState, useEffect } from 'react';

// Update the VendorDashboard to accept children OR use Outlet
interface VendorDashboardProps {
  children?: React.ReactNode;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ children }) => {
  const { currentUser, vendorProfile, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size and auto-close sidebar on mobile when navigating
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

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
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 lg:bg-opacity-0 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-all duration-300 ease-in-out lg:static lg:inset-0 lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "lg:w-64 xl:w-72" // Responsive sidebar width
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b sm:px-6">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-primary sm:text-2xl">ZENO</h1>
              <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hidden sm:inline-block">
                Vendor
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b sm:px-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 sm:w-10 sm:h-10">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {vendorProfile?.business_name || currentUser?.first_name || 'Vendor'}
                </p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {vendorProfile?.business_type?.replace('_', ' ') || 'Business'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 sm:px-4 sm:py-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 sm:px-3",
                    isActive
                      ? "bg-secondary text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-2 h-4 w-4 sm:mr-3 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-2 border-t sm:p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50 text-sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4 sm:mr-3 sm:h-5 sm:w-5" />
              <span className="truncate">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 xl:ml-72 flex-1 min-w-0">
        {/* Mobile header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30 lg:hidden">
          <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <div className="flex-1 min-w-0 px-2">
              <h1 className="text-base font-semibold text-gray-900 truncate sm:text-lg">
                {navigation.find(item => location.pathname.startsWith(item.href))?.name || 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground truncate sm:text-sm">
                {vendorProfile?.business_name || currentUser?.first_name}
              </p>
            </div>

            <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center sm:w-10 sm:h-10">
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VendorDashboard;