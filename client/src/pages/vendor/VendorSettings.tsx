// src/pages/vendor/VendorSettings.tsx - COMPLETE FIXED VERSION
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorDashboardAPI, vendorsAPI, vendorPayoutsAPI } from '@/services/vendorService';
import { 
  Save,
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  CreditCard,
  Bell,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Define the payout form type to match the expected structure
interface PayoutFormData {
  payout_method: 'mpesa' | 'bank_transfer' | 'cash';
  mobile_money_number: string;
  mobile_money_name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  auto_payout: boolean;
  payout_threshold: number;
}

const VendorSettings = () => {
  const { vendorProfile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: payoutPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['vendor-payout-preferences'],
    queryFn: async () => {
      const response = await vendorPayoutsAPI.getPayoutPreferences();
      return response;
    },
    enabled: !!vendorProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => vendorsAPI.updateVendor(vendorProfile?.id || 0, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const updatePayoutMutation = useMutation({
    mutationFn: (data: any) => vendorPayoutsAPI.updatePayoutPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payout-preferences'] });
      toast.success('Payout preferences updated');
    },
    onError: () => {
      toast.error('Failed to update payout preferences');
    },
  });

  // Safely extract payout preferences data
  const payoutData = payoutPreferences || {
    id: 0,
    payout_method: 'mpesa' as const,
    mobile_money_number: '',
    mobile_money_name: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    auto_payout: false,
    payout_threshold: 1000
  };

  const [profileForm, setProfileForm] = useState({
    business_name: vendorProfile?.business_name || '',
    business_type: vendorProfile?.business_type || '',
    description: vendorProfile?.description || '',
    address: vendorProfile?.address || '',
    city: vendorProfile?.city || '',
    contact_number: vendorProfile?.contact_number || '',
    email: vendorProfile?.email || '',
    website: vendorProfile?.website || '', 
    delivery_radius_km: vendorProfile?.delivery_radius_km || 10,
    min_order_amount: vendorProfile?.min_order_amount || 0,
    delivery_fee: vendorProfile?.delivery_fee || 0,
  });

  const [payoutForm, setPayoutForm] = useState<PayoutFormData>({
    payout_method: payoutData.payout_method || 'mpesa',
    mobile_money_number: payoutData.mobile_money_number || '',
    mobile_money_name: payoutData.mobile_money_name || '',
    bank_name: payoutData.bank_name || '',
    account_number: payoutData.account_number || '',
    account_name: payoutData.account_name || '',
    auto_payout: payoutData.auto_payout || false,
    payout_threshold: payoutData.payout_threshold || 1000,
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayoutMutation.mutate(payoutForm);
  };

  // Type-safe handler for payout method changes
  const handlePayoutMethodChange = (method: 'mpesa' | 'bank_transfer' | 'cash') => {
    setPayoutForm(prev => ({
      ...prev,
      payout_method: method
    }));
  };

  // Type-safe handler for payout form changes
  const handlePayoutFormChange = (field: keyof PayoutFormData, value: string | boolean | number) => {
    setPayoutForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building },
    { id: 'payout', label: 'Payout Settings', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (!vendorProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your business profile and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:w-64">
          <CardContent className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-secondary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1">
          {/* Business Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>
                  Update your business information and service details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Business Name *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="business_name"
                          value={profileForm.business_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, business_name: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business_type">Business Type</Label>
                      <select
                        id="business_type"
                        value={profileForm.business_type}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, business_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        <option value="gas_services">Gas Services</option>
                        <option value="auto_repair">Auto Repair</option>
                        <option value="roadside_assistance">Roadside Assistance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Business Description</Label>
                    <Textarea
                      id="description"
                      value={profileForm.description}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your services and expertise..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_number">Contact Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contact_number"
                          value={profileForm.contact_number}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, contact_number: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Business Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                        className="pl-10"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="delivery_radius_km">Delivery Radius (km)</Label>
                      <Input
                        id="delivery_radius_km"
                        type="number"
                        value={profileForm.delivery_radius_km}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, delivery_radius_km: parseInt(e.target.value) }))}
                        min="1"
                        max="50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_order_amount">Minimum Order (KES)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="min_order_amount"
                          type="number"
                          value={profileForm.min_order_amount}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) }))}
                          className="pl-10"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delivery_fee">Delivery Fee (KES)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="delivery_fee"
                          type="number"
                          value={profileForm.delivery_fee}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, delivery_fee: parseFloat(e.target.value) }))}
                          className="pl-10"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Payout Settings Tab */}
          {activeTab === 'payout' && (
            <Card>
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>
                  Configure how you receive payments from Zeno
                </CardDescription>
              </CardHeader>
              <CardContent>
                {preferencesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form onSubmit={handlePayoutSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <Label>Payout Method</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="relative">
                          <input
                            type="radio"
                            name="payout_method"
                            value="mpesa"
                            checked={payoutForm.payout_method === 'mpesa'}
                            onChange={() => handlePayoutMethodChange('mpesa')}
                            className="sr-only"
                          />
                          <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            payoutForm.payout_method === 'mpesa' 
                              ? 'border-secondary bg-secondary bg-opacity-5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="font-medium">M-Pesa</div>
                            <div className="text-sm text-muted-foreground">Mobile Money</div>
                          </div>
                        </label>

                        <label className="relative">
                          <input
                            type="radio"
                            name="payout_method"
                            value="bank_transfer"
                            checked={payoutForm.payout_method === 'bank_transfer'}
                            onChange={() => handlePayoutMethodChange('bank_transfer')}
                            className="sr-only"
                          />
                          <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            payoutForm.payout_method === 'bank_transfer' 
                              ? 'border-secondary bg-secondary bg-opacity-5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="font-medium">Bank Transfer</div>
                            <div className="text-sm text-muted-foreground">Direct to bank account</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {payoutForm.payout_method === 'mpesa' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="mobile_money_number">M-Pesa Number *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="mobile_money_number"
                              value={payoutForm.mobile_money_number}
                              onChange={(e) => handlePayoutFormChange('mobile_money_number', e.target.value)}
                              className="pl-10"
                              placeholder="+254712345678"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mobile_money_name">Account Name *</Label>
                          <Input
                            id="mobile_money_name"
                            value={payoutForm.mobile_money_name}
                            onChange={(e) => handlePayoutFormChange('mobile_money_name', e.target.value)}
                            placeholder="Name as registered with M-Pesa"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {payoutForm.payout_method === 'bank_transfer' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bank_name">Bank Name *</Label>
                            <Input
                              id="bank_name"
                              value={payoutForm.bank_name}
                              onChange={(e) => handlePayoutFormChange('bank_name', e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="account_number">Account Number *</Label>
                            <Input
                              id="account_number"
                              value={payoutForm.account_number}
                              onChange={(e) => handlePayoutFormChange('account_number', e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="account_name">Account Name *</Label>
                          <Input
                            id="account_name"
                            value={payoutForm.account_name}
                            onChange={(e) => handlePayoutFormChange('account_name', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <Label>Payout Preferences</Label>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="auto_payout"
                          checked={payoutForm.auto_payout}
                          onChange={(e) => handlePayoutFormChange('auto_payout', e.target.checked)}
                          className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        />
                        <Label htmlFor="auto_payout" className="font-normal">
                          Enable automatic payouts
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payout_threshold">Payout Threshold (KES)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="payout_threshold"
                            type="number"
                            value={payoutForm.payout_threshold}
                            onChange={(e) => handlePayoutFormChange('payout_threshold', parseInt(e.target.value))}
                            className="pl-10"
                            min="100"
                            step="100"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Automatic payouts will be processed when your balance reaches this amount
                        </p>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updatePayoutMutation.isPending}
                      className="bg-secondary hover:bg-secondary/90"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updatePayoutMutation.isPending ? 'Saving...' : 'Save Payout Settings'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Other tabs can be implemented similarly */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
                  <p className="text-muted-foreground">
                    Configure your notification preferences for orders, payments, and updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Security Settings</h3>
                  <p className="text-muted-foreground">
                    Update your password and manage account security settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorSettings;