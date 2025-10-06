import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Phone, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GasProductCard from "@/components/GasProductCard";
import BottomNav from "@/components/BottomNav";
import { servicesAPI, vendorsAPI } from "@/services/api";
import { toast } from "sonner";

interface Service {
  id: number;
  name: string;
  description: string;
  price: string;
  available: boolean;
  vendor_name: string;
  vendor_type: string;
  vendor_contact: string;
  vendor_address: string;
  vendor_latitude: number;
  vendor_longitude: number;
  images: Array<{ id: number; image: string; is_primary: boolean }>;
  created_at: string;
}

interface Vendor {
  id: number;
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  country: string;
  contact_number: string;
  email: string;
  website: string;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_active: boolean;
  operating_hours: Array<{
    id: number;
    day: number;
    day_display: string;
    opening_time: string;
    closing_time: string;
    is_closed: boolean;
  }>;
  reviews: Array<{
    id: number;
    customer_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }>;
}

interface GasProduct {
  id: number;
  name: string;
  weight: string;
  description: string;
  priceWithCylinder: number;
  priceWithoutCylinder: number;
}

interface CartItem extends GasProduct {
  quantity: number;
  includeCylinder: boolean;
  serviceId: number;
  vendorId: number;
}

const GasProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  // Get service data from navigation state or fetch from API
  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        setLoading(true);

        // If service data was passed via navigation state, use it
        if (location.state?.service) {
          setService(location.state.service);
          await fetchVendorData(location.state.service.vendor);
          await fetchVendorServices(location.state.service.vendor);
        } else {
          // Otherwise fetch service by ID
          await fetchServiceData();
        }
      } catch (error: any) {
        console.error("Error fetching provider data:", error);
        toast.error("Failed to load provider details");
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [id, location.state]);

  const fetchServiceData = async () => {
    try {
      const response = await servicesAPI.getService(Number(id));
      setService(response.data);
      await fetchVendorData(response.data.vendor);
      await fetchVendorServices(response.data.vendor);
    } catch (error: any) {
      console.error("Error fetching service:", error);
      throw error;
    }
  };

  const fetchVendorData = async (vendorId: number) => {
    try {
      const response = await vendorsAPI.getVendor(vendorId);
      setVendor(response.data);
    } catch (error: any) {
      console.error("Error fetching vendor:", error);
      // Vendor data is not critical, so we can continue without it
    }
  };

  const fetchVendorServices = async (vendorId: number) => {
    try {
      const response = await vendorsAPI.getVendorServices(vendorId);
      setVendorServices(response.data);
    } catch (error: any) {
      console.error("Error fetching vendor services:", error);
    }
  };

  // Convert service data to gas product format
  const gasProducts: GasProduct[] = vendorServices.map(service => ({
    id: service.id,
    name: service.name,
    weight: extractWeightFromName(service.name),
    description: service.description,
    priceWithCylinder: parseFloat(service.price),
    priceWithoutCylinder: Math.round(parseFloat(service.price) * 0.7) // 30% discount without cylinder
  }));

  // Helper function to extract weight from service name
  const extractWeightFromName = (name: string): string => {
    const weightMatch = name.match(/(\d+)\s*(kg|KG|kilograms)/i);
    if (weightMatch) {
      return `${weightMatch[1]} Kilograms`;
    }
    return "Standard Size";
  };

  const handleAddToCart = (product: GasProduct, quantity: number, includeCylinder: boolean) => {
    if (!service || !vendor) return;

    setCart(prev => {
      const existingItem = prev.find(
        item => item.id === product.id && item.includeCylinder === includeCylinder
      );

      if (existingItem) {
        return prev.map(item =>
          item.id === product.id && item.includeCylinder === includeCylinder
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { 
        ...product, 
        quantity, 
        includeCylinder,
        serviceId: product.id,
        vendorId: vendor.id
      }];
    });

    toast.success(`Added ${quantity} ${product.name} to cart`);
  };

  const handleOrderNow = (product: GasProduct, includeCylinder: boolean) => {
    if (!service || !vendor) return;

    const price = includeCylinder ? product.priceWithCylinder : product.priceWithoutCylinder;
    
    navigate('/checkout', {
      state: {
        orderItems: [{
          serviceId: product.id,
          vendorId: vendor.id,
          serviceName: product.name,
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
    if (cart.length === 0) return;

    const orderItems = cart.map(item => ({
      serviceId: item.serviceId,
      vendorId: item.vendorId,
      serviceName: item.name,
      vendorName: vendor?.business_name || 'Gas Provider',
      quantity: item.quantity,
      unitPrice: item.includeCylinder ? item.priceWithCylinder : item.priceWithoutCylinder,
      totalAmount: (item.includeCylinder ? item.priceWithCylinder : item.priceWithoutCylinder) * item.quantity,
      includeCylinder: item.includeCylinder,
      description: item.description
    }));

    navigate('/checkout', {
      state: {
        orderItems,
        totalAmount: cartTotal
      }
    });
  };

  const cartTotal = cart.reduce((total, item) => {
    const price = item.includeCylinder ? item.priceWithCylinder : item.priceWithoutCylinder;
    return total + (price * item.quantity);
  }, 0);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const formatOperatingHours = (hours: any[]) => {
    const today = new Date().getDay();
    const todayHours = hours.find(h => h.day === today);
    
    if (!todayHours || todayHours.is_closed) {
      return "Closed today";
    }
    
    return `Open today: ${todayHours.opening_time} - ${todayHours.closing_time}`;
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

  if (!service) {
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
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/services/gas")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="max-w-[200px]">
              <h1 className="text-xl font-semibold truncate">{vendor?.business_name || service.vendor_name}</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{service.vendor_address}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Provider Info */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">{vendor?.average_rating || 4.5}</span>
            <span className="text-sm text-muted-foreground">
              ({vendor?.total_reviews || 0} reviews)
            </span>
          </div>
          {vendor?.is_verified && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Verified
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm mb-2">
          <Phone className="h-4 w-4" />
          <span>{service.vendor_contact}</span>
        </div>

        {vendor?.operating_hours && (
          <div className="text-sm text-muted-foreground">
            {formatOperatingHours(vendor.operating_hours)}
          </div>
        )}
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sticky top-[136px] z-30 rounded-none bg-background">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="m-0 p-4">
          <h2 className="text-xl font-semibold mb-4">Available Gas Products</h2>
          {gasProducts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-lg font-semibold mb-2">No products available</h3>
              <p className="text-muted-foreground">
                This provider doesn't have any gas products listed yet.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {gasProducts.map(product => (
                <GasProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onOrderNow={handleOrderNow}
                  available={service.available}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="m-0 p-4">
          <Card>
            <CardHeader>
              <CardTitle>About {vendor?.business_name || service.vendor_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">
                  {vendor?.description || "Professional gas services provider with quality products and reliable delivery."}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{service.vendor_contact}</span>
                  </div>
                  {vendor?.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{vendor.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right">{service.vendor_address}</span>
                  </div>
                </div>
              </div>

              {vendor?.operating_hours && (
                <div>
                  <h4 className="font-semibold mb-2">Operating Hours</h4>
                  <div className="space-y-1 text-sm">
                    {vendor.operating_hours.map(hour => (
                      <div key={hour.id} className="flex justify-between">
                        <span className="text-muted-foreground">{hour.day_display}:</span>
                        <span>
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
              {vendor?.reviews && vendor.reviews.length > 0 ? (
                <div className="space-y-4">
                  {vendor.reviews.map(review => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
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
                        <span className="font-semibold">{review.customer_name}</span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
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
            className="rounded-full shadow-lg h-14 px-6 bg-secondary hover:bg-secondary/90"
            onClick={handleCheckout}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            <span className="font-semibold">{cartItemCount}</span>
            <span className="mx-2">•</span>
            <span>KSh {cartTotal.toLocaleString()}</span>
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default GasProviderDetail;