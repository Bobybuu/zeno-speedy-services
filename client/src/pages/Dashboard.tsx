import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, Menu, Bell, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ServiceCard from "@/components/ServiceCard";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { servicesAPI, vendorsAPI } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
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
  average_rating: number;
  total_reviews: number;
  address: string;
  contact_number: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [gasServices, setGasServices] = useState<Service[]>([]);
  const [recentVendors, setRecentVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const services = [
    {
      id: "gas",
      title: "Gas",
      description: "Find gas sellers near you",
      icon: "🔥",
      color: "bg-orange-500",
      route: "/services/gas"
    },
    {
      id: "roadside",
      title: "Roadside Services",
      description: "Mechanical, Fuel, Towing",
      icon: "🚗",
      color: "bg-blue-500",
      route: "/services/roadside"
    },
    {
      id: "oxygen",
      title: "Trusted Oxygen Refill",
      description: "Hospital oxygen services",
      icon: "🏥",
      color: "bg-red-500",
      route: "/services/oxygen"
    }
  ];

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch gas services
        const gasFilters: any = {
          category__name: 'gas',
          available: true
        };

        if (userLocation) {
          gasFilters.lat = userLocation[0];
          gasFilters.lng = userLocation[1];
          gasFilters.radius = 10; // 10km radius
        }

        const servicesResponse = await servicesAPI.getServices(gasFilters);
        setGasServices(servicesResponse.data.slice(0, 4)); // Show only 4 services

        // Fetch recent vendors
        const vendorsResponse = await vendorsAPI.getVendors({
          business_type: 'gas_station',
          
        });
        setRecentVendors(vendorsResponse.data.slice(0, 4)); // Show only 4 vendors

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
        
        // Fallback mock data
        setGasServices([
          {
            id: 1,
            name: "6KG Gas Refill",
            description: "Premium quality 6KG gas refill",
            price: "3500.00",
            available: true,
            vendor_name: "Gas Refiller 1",
            vendor_type: "gas_station",
            vendor_contact: "+254712345678",
            vendor_address: "Westlands, Nairobi",
            vendor_latitude: -1.2921,
            vendor_longitude: 36.8219,
            images: [],
            created_at: "2024-01-01T00:00:00Z"
          },
          {
            id: 2,
            name: "13KG Gas Refill",
            description: "Standard 13KG gas cylinder refill",
            price: "5200.00",
            available: true,
            vendor_name: "Gas Refiller 2",
            vendor_type: "gas_station",
            vendor_contact: "+254712345679",
            vendor_address: "Kilimani, Nairobi",
            vendor_latitude: -1.2841,
            vendor_longitude: 36.8170,
            images: [],
            created_at: "2024-01-01T00:00:00Z"
          }
        ]);

        setRecentVendors([
          {
            id: 1,
            business_name: "Gas Refiller 1",
            business_type: "gas_station",
            average_rating: 4.5,
            total_reviews: 124,
            address: "Westlands, Nairobi",
            contact_number: "+254712345678"
          },
          {
            id: 2,
            business_name: "Gas Refiller 2",
            business_type: "gas_station",
            average_rating: 4.8,
            total_reviews: 89,
            address: "Kilimani, Nairobi",
            contact_number: "+254712345679"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    if (!lat1 || !lon1) return "Nearby";
    
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

  const getUserInitials = () => {
    if (!currentUser) return "U";
    if (currentUser.first_name && currentUser.last_name) {
      return `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase();
    }
    return currentUser.username?.[0]?.toUpperCase() || "U";
  };

  const getUserDisplayName = () => {
    if (!currentUser) return "User";
    if (currentUser.first_name && currentUser.last_name) {
      return `${currentUser.first_name} ${currentUser.last_name}`;
    }
    return currentUser.username || "User";
  };

  const handleServiceClick = (service: Service) => {
    navigate(`/provider/${service.id}`, { state: { service } });
  };

  const handleVendorClick = (vendor: Vendor) => {
    navigate(`/vendor/${vendor.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
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
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">zeNO</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1" />
                <span>
                  {userLocation ? "Current Location" : "Enable location for better results"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate("/account")}>
              <AvatarFallback className="bg-secondary text-white">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        {/* Welcome Message */}
        <div className="px-4 pb-3">
          <h2 className="text-lg font-semibold">
            Welcome back, {getUserDisplayName()}! 👋
          </h2>
          <p className="text-sm text-white/80 mt-1">
            What service do you need today?
          </p>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for services, vendors, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white text-foreground"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Service Categories */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Our Services</h2>
          <span className="text-sm text-muted-foreground">Trusted & Reliable</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ServiceCard
                {...service}
                onClick={() => navigate(service.route)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Gas Services Section */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Gas Services Near You</h2>
          <Button 
            variant="link" 
            className="text-secondary p-0 h-auto font-semibold"
            onClick={() => navigate("/services/gas")}
          >
            View All
          </Button>
        </div>

        {gasServices.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">🔥</div>
            <h3 className="text-lg font-semibold mb-2">No gas services found</h3>
            <p className="text-muted-foreground mb-4">
              {userLocation 
                ? "No gas services available in your area yet" 
                : "Enable location services to see nearby providers"
              }
            </p>
            <Button onClick={() => navigate("/services/gas")}>
              Browse All Gas Services
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gasServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-3 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-orange-200"
                  onClick={() => handleServiceClick(service)}
                >
                  <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-3xl">🔥</span>
                  </div>
                  <h3 className="font-medium text-sm truncate">{service.vendor_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{service.name}</p>
                  {userLocation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculateDistance(
                        userLocation[0], 
                        userLocation[1], 
                        service.vendor_latitude, 
                        service.vendor_longitude
                      )}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-primary">
                      {formatPrice(service.price)}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xs text-yellow-500">⭐</span>
                      <span className="text-xs ml-1">4.5</span>
                    </div>
                  </div>
                  {!service.available && (
                    <div className="mt-2">
                      <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                        Unavailable
                      </span>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Vendors Section */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trusted Vendors</h2>
          <Button 
            variant="link" 
            className="text-secondary p-0 h-auto font-semibold"
            onClick={() => navigate("/vendors")}
          >
            View All
          </Button>
        </div>

        {recentVendors.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-4xl mb-3">🏪</div>
            <p className="text-muted-foreground">No vendors available yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentVendors.map((vendor, index) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300"
                  onClick={() => handleVendorClick(vendor)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🏪</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{vendor.business_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{vendor.address}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-yellow-500">⭐</span>
                          <span className="text-xs font-medium">{vendor.average_rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({vendor.total_reviews})
                          </span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats for Vendors/Mechanics */}
      {(currentUser?.user_type === 'vendor' || currentUser?.user_type === 'mechanic') && (
        <section className="p-4">
          <Card className="p-4 bg-gradient-to-r from-primary to-primary/90 text-white">
            <h3 className="font-semibold mb-2">Your Business Dashboard</h3>
            <p className="text-sm opacity-90 mb-3">
              Manage your services and track orders
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate("/vendor/dashboard")}
            >
              Go to Dashboard
            </Button>
          </Card>
        </section>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;