import { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Filter, Search, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Map from "@/components/Map";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { servicesAPI } from "@/services/api";
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

const GasServices = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("map");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          fetchGasServices(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          fetchGasServices(); // Fetch without location
        }
      );
    } else {
      fetchGasServices(); // Fetch without location
    }
  }, []);

  const fetchGasServices = async (lat?: number, lng?: number) => {
    try {
      setLoading(true);
      const filters: any = {
        category__name: 'gas',
      };

      // Add location filters if available
      if (lat && lng) {
        filters.lat = lat;
        filters.lng = lng;
        filters.radius = 20; // 20km radius
      }

      const response = await servicesAPI.getServices(filters);
      setServices(response.data);
    } catch (error: any) {
      console.error("Error fetching gas services:", error);
      toast.error("Failed to load gas services");
      
      // Fallback to mock data if API fails
      
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.vendor_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    if (!lat1 || !lon1) return "Unknown";
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const formatPrice = (price: string) => {
    return `KSh ${parseFloat(price).toLocaleString()}`;
  };

  const handleProviderClick = (service: Service) => {
    navigate(`/provider/${service.id}`, { state: { service } });
  };

  const handleRefresh = () => {
    if (userLocation) {
      fetchGasServices(userLocation[0], userLocation[1]);
    } else {
      fetchGasServices();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading gas services...</p>
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
              onClick={() => navigate("/dashboard")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Gas Services</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1" />
                <span>
                  {userLocation ? "Near you" : "Gas services nearby"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              className="text-white hover:bg-white/20"
              disabled={loading}
            >
              <Loader2 className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search gas providers or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white text-foreground"
            />
          </div>
        </div>
      </header>

      {/* Tabs for Map/List View */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-[136px] z-30 rounded-none bg-background">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="m-0">
          <div className="h-[400px] relative">
            <Map 
              providers={filteredServices.map(service => ({
                id: service.id,
                name: service.vendor_name,
                location: service.vendor_address,
                price: service.price,
                rating: 4.5, // You can add ratings to your Service model
                distance: userLocation 
                  ? calculateDistance(
                      userLocation[0], 
                      userLocation[1], 
                      service.vendor_latitude, 
                      service.vendor_longitude
                    )
                  : "Unknown",
                coords: [service.vendor_latitude, service.vendor_longitude] as [number, number]
              }))}
              userLocation={userLocation}
            />
          </div>
          
          {/* Provider cards below map */}
          <div className="p-4 space-y-3">
            {filteredServices.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-lg font-semibold mb-2">No gas services found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search terms" : "No gas services available in your area"}
                </p>
              </Card>
            ) : (
              filteredServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20"
                    onClick={() => handleProviderClick(service)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{service.vendor_name}</h3>
                          {!service.available && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              Closed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{service.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="flex-1">{service.vendor_address}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-lg font-bold text-primary">
                            {formatPrice(service.price)}
                          </div>
                          {userLocation && (
                            <div className="text-sm text-muted-foreground">
                              {calculateDistance(
                                userLocation[0], 
                                userLocation[1], 
                                service.vendor_latitude, 
                                service.vendor_longitude
                              )} away
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">4.5</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            • {service.vendor_contact}
                          </span>
                        </div>
                      </div>
                      <div className="text-4xl ml-4">🔥</div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="list" className="m-0 p-4">
          <div className="space-y-3">
            {filteredServices.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-lg font-semibold mb-2">No gas services found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search terms" : "No gas services available in your area"}
                </p>
              </Card>
            ) : (
              filteredServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20"
                    onClick={() => handleProviderClick(service)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{service.vendor_name}</h3>
                          {!service.available && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              Closed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{service.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{service.vendor_address}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-lg font-bold text-primary">
                            {formatPrice(service.price)}
                          </div>
                          {userLocation && (
                            <div className="text-sm text-muted-foreground">
                              {calculateDistance(
                                userLocation[0], 
                                userLocation[1], 
                                service.vendor_latitude, 
                                service.vendor_longitude
                              )} away
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">4.5</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            • {service.vendor_contact}
                          </span>
                        </div>
                        <Button 
                          className="mt-3 bg-secondary hover:bg-secondary/90 text-white w-full"
                          size="sm"
                          disabled={!service.available}
                        >
                          {service.available ? "View Details & Order" : "Currently Unavailable"}
                        </Button>
                      </div>
                      <div className="text-5xl ml-4">🔥</div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default GasServices;