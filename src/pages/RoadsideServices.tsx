import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Wrench, Fuel, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Map from "@/components/Map";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const RoadsideServices = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    {
      id: "mechanical",
      title: "Mechanical Services",
      icon: Wrench,
      color: "bg-blue-500",
      providers: [
        { id: 1, name: "AutoFix Garage", location: "Westlands", distance: "0.8 km", rating: 4.7, price: "From KSh 2,000", coords: [-1.2921, 36.8219] as [number, number] },
        { id: 2, name: "Quick Repair", location: "Kilimani", distance: "1.5 km", rating: 4.5, price: "From KSh 1,500", coords: [-1.2841, 36.8170] as [number, number] },
      ]
    },
    {
      id: "fuel",
      title: "Fuel Refill",
      icon: Fuel,
      color: "bg-green-500",
      providers: [
        { id: 3, name: "Mobile Fuel", location: "Parklands", distance: "2.0 km", rating: 4.8, price: "KSh 180/L", coords: [-1.2980, 36.8150] as [number, number] },
        { id: 4, name: "Fuel Express", location: "Karen", distance: "3.2 km", rating: 4.6, price: "KSh 175/L", coords: [-1.2750, 36.8280] as [number, number] },
      ]
    },
    {
      id: "towing",
      title: "Towing Services",
      icon: Truck,
      color: "bg-red-500",
      providers: [
        { id: 5, name: "Quick Tow", location: "CBD", distance: "1.2 km", rating: 4.9, price: "From KSh 3,000", coords: [-1.2850, 36.8200] as [number, number] },
        { id: 6, name: "SafeTow Kenya", location: "Lavington", distance: "2.8 km", rating: 4.7, price: "From KSh 3,500", coords: [-1.2900, 36.8250] as [number, number] },
      ]
    }
  ];

  const allProviders = services.flatMap(s => s.providers);

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
              <h1 className="text-xl font-semibold">Roadside Services</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Emergency assistance near you</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Map Section */}
      <div className="h-[300px] relative">
        <Map providers={allProviders} />
      </div>

      {/* Service Categories */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Select Service Type</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    selectedService === service.id 
                      ? 'ring-2 ring-secondary shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full ${service.color} flex items-center justify-center mb-2`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium">{service.title}</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Provider List */}
        <div className="space-y-3">
          <h3 className="font-semibold">
            {selectedService 
              ? services.find(s => s.id === selectedService)?.title 
              : "All Providers"}
          </h3>
          {(selectedService 
            ? services.find(s => s.id === selectedService)?.providers || []
            : allProviders
          ).map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-4 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate(`/provider/${provider.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{provider.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{provider.distance}</span>
                      <span>•</span>
                      <div className="flex items-center">
                        <span className="text-yellow-500">⭐</span>
                        <span className="ml-1">{provider.rating}</span>
                      </div>
                    </div>
                    <p className="text-primary font-semibold mt-2">{provider.price}</p>
                  </div>
                  <Button 
                    className="bg-secondary hover:bg-secondary/90 text-white"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle contact action
                    }}
                  >
                    Contact
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RoadsideServices;