import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorDashboardAPI } from '@/services/api';
import { 
  BarChart3, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Users,
  Package,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const VendorAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['vendor-analytics', timeRange],
    queryFn: async () => {
      const response = await vendorDashboardAPI.getOrderAnalytics(timeRange.replace('d', ''));
      return response.data; // ✅ Access the data property
    },
  });

  const { data: dashboardAnalytics } = useQuery({
    queryKey: ['vendor-dashboard-analytics'],
    queryFn: async () => {
      const response = await vendorDashboardAPI.getDashboardAnalytics();
      return response.data; // ✅ Access the data property
    },
  });

  // Safely extract data with fallbacks
  const analyticsData = analytics || {
    total_revenue: 0,
    total_orders: 0,
    average_order_value: 0,
    order_completion_rate: 0,
    total_commission: 0,
    net_earnings: 0,
    completed_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0
  };

  const dashboardData = dashboardAnalytics || {
    available_balance: 0,
    pending_payouts: 0,
    total_paid_out: 0,
    active_customers_count: 0,
    order_completion_rate: 0
  };

  const stats = [
    {
      title: 'Total Revenue',
      value: `KES ${(analyticsData.total_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      change: '+12.5%',
      trend: 'up',
      description: 'From last period'
    },
    {
      title: 'Total Orders',
      value: analyticsData.total_orders || 0,
      icon: ShoppingCart,
      change: '+8.2%',
      trend: 'up',
      description: 'Completed orders'
    },
    {
      title: 'Average Order Value',
      value: `KES ${Math.round(analyticsData.average_order_value || 0).toLocaleString()}`,
      icon: TrendingUp,
      change: '+5.1%',
      trend: 'up',
      description: 'Per order average'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(analyticsData.order_completion_rate || 0)}%`,
      icon: BarChart3,
      change: '+3.4%',
      trend: 'up',
      description: 'Successful orders'
    },
  ];

  const timeRanges = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track your business performance and growth
          </p>
        </div>
        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  <span className="ml-1">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>Revenue distribution and commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Total Revenue</p>
                  <p className="text-sm text-muted-foreground">Gross sales amount</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">KES {(analyticsData.total_revenue || 0).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Commission</p>
                  <p className="text-sm text-muted-foreground">Platform fees</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    - KES {(analyticsData.total_commission || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">Net Earnings</p>
                  <p className="text-sm text-muted-foreground">Your take-home</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    KES {(analyticsData.net_earnings || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Order Statistics</CardTitle>
            <CardDescription>Order status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Completed</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(analyticsData.completed_orders / (analyticsData.total_orders || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{analyticsData.completed_orders || 0}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(analyticsData.pending_orders / (analyticsData.total_orders || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{analyticsData.pending_orders || 0}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cancelled</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(analyticsData.cancelled_orders / (analyticsData.total_orders || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{analyticsData.cancelled_orders || 0}</span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(analyticsData.order_completion_rate || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardData.active_customers_count || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Active Customers</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {(dashboardData.available_balance || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {(dashboardData.pending_payouts || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              In processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {(dashboardData.total_paid_out || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time earnings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorAnalytics;