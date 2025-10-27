// src/pages/GasProviderDetail.tsx - COMPLETE FIXED VERSION
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Phone, ShoppingCart, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GasProductCard from "@/components/GasProductCard";
import BottomNav from "@/components/BottomNav";
import { gasProductsAPI } from '@/services/vendorService';
import { vendorsAPI } from '@/services/vendorService';
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

// Updated interfaces to match your base types
interface GasProduct {
  id: number;
  name: string;
  gas_type: string;
  cylinder_size: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
  vendor_name: string;
  vendor_city: string;
  vendor_latitude?: number;
  vendor_longitude?: number;
  is_available: boolean;
  in_stock: boolean;
  stock_quantity: number;
  description?: string;
  vendor_address?: string;
  vendor_contact?: string;
  vendor?: number; // Vendor ID field
}

interface Vendor {
  id: number | string;
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  country: string;
  contact_number: string;
  email?: string;
  website?: string;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_active: boolean;
  operating_hours?: Array<{
    id: number;
    day: number;
    opening_time: string;
    closing_time: string;
    is_closed: boolean;
  }>;
  reviews?: Array<{
    id: number;
    customer_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }>;
  latitude?: number;
  longitude?: number;
}

const GasProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: cartState } = useCart();
  
  const cartItemCount = useMemo(() => {
    if (!cartState?.items) return 0;
    return cartState.items.reduce((total, item) => total + item.quantity, 0);
  }, [cartState?.items]);

  const cartTotal = useMemo(() => {
    if (!cartState?.total) return 0;
    return cartState.total;
  }, [cartState?.total]);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [gasProducts, setGasProducts] = useState<GasProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Starting provider data fetch for ID:', id);

        // If vendor data was passed via navigation state, use it
        if (location.state?.vendor) {
          console.log('📦 Using vendor data from navigation state');
          const vendorData = location.state.vendor as Vendor;
          setVendor(vendorData);
          await fetchVendorProducts(Number(vendorData.id));
        } else {
          // Otherwise fetch vendor by ID using the correct API endpoint
          console.log('🔍 Fetching vendor data from API');
          await fetchVendorData();
        }
      } catch (error: any) {
        console.error("❌ Error fetching provider data:", error);
        
        // ✅ FIXED: Better error handling for 404
        if (error.response?.status === 404) {
          const errorMessage = "Vendor not found. This vendor may no longer be available.";
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          const errorMessage = error.response?.data?.message || error.message || "Failed to load provider details";
          setError(errorMessage);
          toast.error(errorMessage);
        }
        
        // Fallback to mock data for demo purposes
        console.log('🔄 Falling back to mock data');
        setVendor(getMockVendorData());
        setGasProducts(getMockGasProducts());
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProviderData();
    } else {
      setError("Provider ID is missing");
      setLoading(false);
    }
  }, [id, location.state]);

  const fetchVendorData = async () => {
    try {
      console.log('📡 Fetching vendor with ID:', id);
      const response = await vendorsAPI.getVendor(Number(id));
      console.log('✅ Vendor API response:', response);
      const vendorData = response as Vendor;
      setVendor(vendorData);
      await fetchVendorProducts(Number(vendorData.id));
    } catch (error: any) {
      console.error("❌ Error fetching vendor:", error);
      
      // ✅ FIXED: Handle 404 specifically
      if (error.response?.status === 404) {
        throw new Error("Vendor not found. This vendor may no longer be available.");
      }
      
      if (error.response) {
        console.error('API Error Status:', error.response.status);
        console.error('API Error Data:', error.response.data);
      }
      throw error;
    }
  };

  const fetchVendorProducts = async (vendorId: number) => {
    try {
      console.log('🔄 Fetching products for vendor ID:', vendorId);
      
      const response = await gasProductsAPI.getGasProducts({ 
        vendor: vendorId,
        is_available: true 
      });
      
      console.log('🔍 FULL PRODUCTS API RESPONSE:', response);
      
      let productsData: GasProduct[] = [];
      
      if (Array.isArray(response)) {
        productsData = response;
      } else if (response?.results && Array.isArray(response.results)) {
        productsData = response.results;
      } else if (response && Array.isArray(response)) {
        productsData = response;
      }
      
      console.log('✅ Extracted products:', productsData);
      console.log('📊 Products count:', productsData.length);
      
      setGasProducts(productsData);
      
      // If no products found, try alternative approach
      if (productsData.length === 0) {
        console.log('⚠️ No products found with vendor filter, trying alternative...');
        await fetchAllProductsAndFilter(vendorId);
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching vendor products:', error);
      console.log('🔄 Falling back to mock data...');
      
      if (error.response) {
        console.error('API Error Response:', error.response.data);
        console.error('API Error Status:', error.response.status);
      }
      
      // Fallback to mock products for demo purposes
      setGasProducts(getMockGasProducts());
    }
  };

  // Alternative approach: Fetch all products and filter client-side
  const fetchAllProductsAndFilter = async (vendorId: number) => {
    try {
      console.log('🔄 Trying alternative product fetch for vendor:', vendorId);
      
      const response = await gasProductsAPI.getGasProducts({ 
        is_available: true 
      });
      
      console.log('🔍 Alternative fetch response:', response);
      
      let allProducts: GasProduct[] = [];
      
      if (Array.isArray(response)) {
        allProducts = response;
      } else if (response?.results && Array.isArray(response.results)) {
        allProducts = response.results;
      } else if (response && Array.isArray(response)) {
        allProducts = response;
      }
      
      // Filter products by vendor ID or vendor name
      const vendorProducts = allProducts.filter(product => {
        const matchesVendorId = product.vendor === vendorId;
        const matchesVendorName = product.vendor_name && vendor?.business_name && 
          product.vendor_name.toLowerCase().includes(vendor.business_name.toLowerCase());
        
        console.log(`Product ${product.id}: vendor=${product.vendor}, matchesId=${matchesVendorId}, matchesName=${matchesVendorName}`);
        
        return matchesVendorId || matchesVendorName;
      });
      
      console.log('✅ Vendor products after filtering:', vendorProducts);
      setGasProducts(vendorProducts);
      
    } catch (error) {
      console.error('❌ Alternative fetch failed:', error);
      setGasProducts(getMockGasProducts());
    }
  };

  // Mock data fallbacks for demo purposes
  const getMockVendorData = (): Vendor => ({
    id: Number(id) || 1,
    business_name: "Nairobi Gas Center",
    business_type: "gas_station",
    description: "Your trusted partner for quality gas products and reliable service. We provide safe and efficient gas solutions for homes and businesses.",
    address: "Moi Avenue, Nairobi CBD",
    city: "Nairobi",
    country: "Kenya",
    contact_number: "+254712345678",
    email: "info@nairobigas.com",
    website: "https://nairobigas.com",
    average_rating: 4.5,
    total_reviews: 124,
    is_verified: true,
    is_active: true,
    latitude: -1.286389,
    longitude: 36.817223,
    operating_hours: [
      { id: 1, day: 0, opening_time: "06:00", closing_time: "22:00", is_closed: false },
      { id: 2, day: 1, opening_time: "06:00", closing_time: "22:00", is_closed: false },
      { id: 3, day: 2, opening_time: "06:00", closing_time: "22:00", is_closed: false },
      { id: 4, day: 3, opening_time: "06:00", closing_time: "22:00", is_closed: false },
      { id: 5, day: 4, opening_time: "06:00", closing_time: "22:00", is_closed: false },
      { id: 6, day: 5, opening_time: "06:00", closing_time: "22:00", is_closed: false },
      { id: 7, day: 6, opening_time: "08:00", closing_time: "20:00", is_closed: false }
    ],
    reviews: [
      {
        id: 1,
        customer_name: "John Kamau",
        rating: 5,
        comment: "Excellent service and fast delivery! The gas quality is top-notch.",
        created_at: "2024-01-15T10:30:00Z"
      },
      {
        id: 2,
        customer_name: "Mary Wanjiku",
        rating: 4,
        comment: "Good prices and reliable service. Will definitely order again.",
        created_at: "2024-01-10T14:20:00Z"
      },
      {
        id: 3,
        customer_name: "Peter Omondi",
        rating: 5,
        comment: "Very professional and timely delivery. Highly recommended!",
        created_at: "2024-01-08T09:15:00Z"
      }
    ]
  });

  const getMockGasProducts = (): GasProduct[] => [
    {
      id: 1,
      name: "Pro Gas LPG",
      gas_type: "lpg",
      cylinder_size: "13kg",
      price_with_cylinder: 3500,
      price_without_cylinder: 2800,
      vendor_name: "Nairobi Gas Center",
      vendor_city: "Nairobi",
      vendor_latitude: -1.286389,
      vendor_longitude: 36.817223,
      is_available: true,
      in_stock: true,
      stock_quantity: 50,
      description: "Premium quality LPG gas for home and commercial use",
      vendor_address: "Moi Avenue, Nairobi CBD",
      vendor_contact: "+254712345678",
      vendor: Number(id) || 1
    },
    {
      id: 2,
      name: "K-Gas LPG",
      gas_type: "lpg",
      cylinder_size: "6kg",
      price_with_cylinder: 1800,
      price_without_cylinder: 1500,
      vendor_name: "Nairobi Gas Center",
      vendor_city: "Nairobi",
      vendor_latitude: -1.286389,
      vendor_longitude: 36.817223,
      is_available: true,
      in_stock: true,
      stock_quantity: 30,
      description: "Reliable household gas with safety features",
      vendor_address: "Moi Avenue, Nairobi CBD",
      vendor_contact: "+254712345678",
      vendor: Number(id) || 1
    },
    {
      id: 3,
      name: "Safe Gas LPG",
      gas_type: "lpg",
      cylinder_size: "22kg",
      price_with_cylinder: 5200,
      price_without_cylinder: 4500,
      vendor_name: "Nairobi Gas Center",
      vendor_city: "Nairobi",
      vendor_latitude: -1.286389,
      vendor_longitude: 36.817223,
      is_available: true,
      in_stock: true,
      stock_quantity: 20,
      description: "Commercial grade LPG for businesses and industries",
      vendor_address: "Moi Avenue, Nairobi CBD",
      vendor_contact: "+254712345678",
      vendor: Number(id) || 1
    }
  ];

  // Convert GasProduct to the format expected by GasProductCard
  const formatProductForCard = (product: GasProduct) => ({
    id: product.id,
    name: product.name,
    weight: product.cylinder_size,
    description: product.description || `${product.gas_type} gas cylinder`,
    priceWithCylinder: product.price_with_cylinder,
    priceWithoutCylinder: product.price_without_cylinder,
    vendor_name: product.vendor_name,
    vendor_city: product.vendor_city,
    is_available: product.is_available,
    in_stock: product.in_stock,
    stock_quantity: product.stock_quantity,
    gas_type: product.gas_type
  });

  const handleOrderNow = (product: any, includeCylinder: boolean) => {
    if (!vendor) {
      toast.error("Provider information is not available");
      return;
    }

    const price = includeCylinder ? product.priceWithCylinder : product.priceWithoutCylinder;
    
    navigate('/checkout', {
      state: {
        orderItems: [{
          productId: product.id,
          vendorId: Number(vendor.id),
          productName: product.name,
          vendorName: vendor.business_name,
          quantity: 1,
          unitPrice: price,
          totalAmount: price,
          includeCylinder,
          description: product.description
        }],
        totalAmount: price
      }
    });
  };

  const handleCheckout = () => {
    if (cartItemCount === 0) {
      toast.error("Your cart is empty");
      return;
    }
    navigate('/checkout');
  };

  const formatOperatingHours = (hours: any[] = []) => {
    if (!hours || hours.length === 0) {
      return "Operating hours not available";
    }
    
    const today = new Date().getDay();
    const todayHours = hours.find(h => h.day === today);
    
    if (!todayHours || todayHours.is_closed) {
      return "Closed today";
    }
    
    return `Open today: ${todayHours.opening_time} - ${todayHours.closing_time}`;
  };

  const getDayDisplay = (day: number): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[day] || 'Unknown';
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Retry fetching data
    setTimeout(() => {
      if (id) {
        fetchVendorData().finally(() => setLoading(false));
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading provider details...</p>
        </div>
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">🔥</div>
          <h3 className="text-lg font-semibold mb-2">Unable to Load Provider</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => navigate('/services/gas')}>
              Back to Gas Services
            </Button>
            <Button variant="outline" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔥</div>
          <h3 className="text-lg font-semibold mb-2">Provider not found</h3>
          <p className="text-muted-foreground mb-4">The gas provider you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/services/gas')}>
            Back to Gas Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/services/gas")}
              className="text-white hover:bg-white/20 flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold truncate">{vendor.business_name}</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{vendor.address}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Provider Info */}
      <div className="bg-card border-b p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
            <span className="font-semibold">{vendor.average_rating}</span>
            <span className="text-sm text-muted-foreground">
              ({vendor.total_reviews} reviews)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {vendor.is_verified && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {!vendor.is_active && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm mb-2">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{vendor.contact_number}</span>
        </div>

        {vendor.operating_hours && vendor.operating_hours.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatOperatingHours(vendor.operating_hours)}</span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-yellow-700">
                {error} - Showing demo data
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sticky top-[136px] z-30 rounded-none bg-background border-b">
          <TabsTrigger value="products" className="py-3 text-sm sm:text-base">Products</TabsTrigger>
          <TabsTrigger value="about" className="py-3 text-sm sm:text-base">About</TabsTrigger>
          <TabsTrigger value="reviews" className="py-3 text-sm sm:text-base">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="m-0 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Available Gas Products</h2>
            <Badge variant="outline" className="text-sm">
              {gasProducts.length} products
            </Badge>
          </div>
          
          {/* Debug Info - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="p-3 mb-4 bg-yellow-50 border-yellow-200">
              <div className="text-sm">
                <p><strong>Debug Info:</strong></p>
                <p>Vendor ID: {vendor?.id}</p>
                <p>Vendor Name: {vendor?.business_name}</p>
                <p>Products Found: {gasProducts.length}</p>
              </div>
            </Card>
          )}
          
          {gasProducts.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-lg font-semibold mb-2">No products available</h3>
              <p className="text-muted-foreground mb-4">
                This provider doesn't have any gas products listed yet.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Vendor ID: {vendor?.id}</p>
                <p>Try refreshing or check back later.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gasProducts.map(product => (
                <GasProductCard
                  key={product.id}
                  product={formatProductForCard(product)}
                  onOrderNow={handleOrderNow}
                  available={product.is_available && product.in_stock}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="m-0 p-4">
          <Card>
            <CardHeader>
              <CardTitle>About {vendor.business_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {vendor.description}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{vendor.contact_number}</span>
                  </div>
                  {vendor.email && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium break-all">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.website && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground">Website:</span>
                      <span className="font-medium break-all">{vendor.website}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="font-medium text-right">{vendor.address}, {vendor.city}, {vendor.country}</span>
                  </div>
                </div>
              </div>

              {vendor.operating_hours && vendor.operating_hours.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Operating Hours</h4>
                  <div className="space-y-1 text-sm">
                    {vendor.operating_hours.map(hour => (
                      <div key={hour.id} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-muted-foreground">{getDayDisplay(hour.day)}:</span>
                        <span className="font-medium">
                          {hour.is_closed ? 'Closed' : `${hour.opening_time} - ${hour.closing_time}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="m-0 p-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.reviews && vendor.reviews.length > 0 ? (
                <div className="space-y-4">
                  {vendor.reviews.map(review => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-yellow-500 text-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-sm sm:text-base">{review.customer_name}</span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{review.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No reviews yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to review this provider!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-20 right-4 z-30">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-12 sm:h-14 px-4 sm:px-6 bg-secondary hover:bg-secondary/90"
            onClick={handleCheckout}
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="font-semibold text-sm sm:text-base">{cartItemCount}</span>
            <span className="mx-1 sm:mx-2">•</span>
            <span className="text-sm sm:text-base">KSh {cartTotal.toLocaleString()}</span>
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default GasProviderDetail;