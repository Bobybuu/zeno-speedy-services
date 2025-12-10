import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { vendorDashboardAPI } from '@/services/vendorService';
import { useQuery } from '@tanstack/react-query';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardOverview = () => {
  const { vendorProfile } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: async () => {
      const response = await vendorDashboardAPI.getDashboardOverview();
      return response; // ✅ REMOVED .data - response is already the data
    },
    enabled: !!vendorProfile,
  });

  const { data: statsData } = useQuery({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await vendorDashboardAPI.getVendorStats();
      return response; // ✅ REMOVED .data - response is already the data
    },
    enabled: !!vendorProfile,
  });

  // Safely extract data with fallbacks
  const gasProducts = statsData?.gas_products || { total: 0, available: 0, low_stock: 0 };
  const orders = statsData?.orders || { total: 0, pending: 0, completed: 0 };
  const financial = statsData?.financial || { available_balance: 0 };

  const stats = [
    {
      title: 'Total Products',
      value: gasProducts.total || 0,
      icon: Package,
      description: 'Active products',
      color: 'bg-blue-500',
      link: '/vendor/products'
    },
    {
      title: 'Pending Orders',
      value: orders.pending || 0,
      icon: ShoppingCart,
      description: 'Require attention',
      color: 'bg-orange-500',
      link: '/vendor/orders'
    },
    {
      title: 'Available Balance',
      value: `KES ${(financial.available_balance || 0).toLocaleString()}`,
      icon: DollarSign,
      description: 'Ready for payout',
      color: 'bg-green-500',
      link: '/vendor/analytics'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round((orders.completed / (orders.total || 1)) * 100)}%`,
      icon: TrendingUp,
      description: 'Order success rate',
      color: 'bg-purple-500',
      link: '/vendor/analytics'
    },
  ];

  const recentOrders = [
    { id: 1, customer: 'John Doe', amount: 2450, status: 'pending', time: '2 min ago' },
    { id: 2, customer: 'Jane Smith', amount: 1800, status: 'confirmed', time: '15 min ago' },
    { id: 3, customer: 'Mike Johnson', amount: 3200, status: 'completed', time: '1 hour ago' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {vendorProfile?.business_name}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.color} bg-opacity-10`}>
                  <Icon className={`h-4 w-4 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <Button variant="ghost" size="sm" className="mt-2 -ml-3" asChild>
                  <Link to={stat.link}>View details</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer orders requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="font-medium text-sm">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">KES {order.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">{order.status}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/vendor/orders">View All Orders</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your business efficiently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" asChild>
                <Link to="/vendor/products/new">
                  <Package className="mr-2 h-4 w-4" />
                  Add New Product
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/vendor/analytics">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/vendor/settings">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payout Settings
                </Link>
              </Button>
            </div>

            {/* Low Stock Alert */}
            {gasProducts.low_stock > 0 && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Low Stock Alert
                    </p>
                    <p className="text-sm text-orange-700">
                      {gasProducts.low_stock} products are running low
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link to="/vendor/products">Manage Stock</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;