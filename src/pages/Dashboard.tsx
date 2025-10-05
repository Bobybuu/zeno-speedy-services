import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, Menu, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ServiceCard from "@/components/ServiceCard";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const services = [
    {
      id: "gas",
      title: "Gas",
      description: "Find gas sellers near you",
      icon: "🔥",
      color: "bg-gas",
      route: "/services/gas"
    },
    {
      id: "roadside",
      title: "Roadside Services",
      description: "Mechanical, Fuel, Towing",
      icon: "🚗",
      color: "bg-roadside",
      route: "/services/roadside"
    },
    {
      id: "oxygen",
      title: "Trusted Oxygen Refill",
      description: "Hospital oxygen services",
      icon: "🏥",
      color: "bg-oxygen",
      route: "/services/oxygen"
    }
  ];

  const recentProviders = [
    { id: 1, name: "Gas Seller 1", rating: 4.5, distance: "1.2 km", price: "KSh 3,500" },
    { id: 2, name: "Gas Seller 2", rating: 4.8, distance: "2.5 km", price: "KSh 3,200" },
    { id: 3, name: "Gas Seller 3", rating: 4.2, distance: "3.1 km", price: "KSh 3,700" },
    { id: 4, name: "Gas Seller 4", rating: 4.9, distance: "4.0 km", price: "KSh 3,300" },
  ];

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
                <span>Location</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary text-white">U</AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white text-foreground"
            />
          </div>
        </div>
      </header>

      {/* Service Categories */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Services</h2>
          <span className="text-sm text-muted-foreground">All</span>
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
          <h2 className="text-lg font-semibold">Gas Services</h2>
          <Button 
            variant="link" 
            className="text-secondary p-0 h-auto font-semibold"
            onClick={() => navigate("/services/gas")}
          >
            View All
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {recentProviders.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-3 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                onClick={() => navigate(`/provider/${provider.id}`)}
              >
                <div className="aspect-square bg-gradient-to-br from-gas/20 to-gas/10 rounded-lg mb-2 flex items-center justify-center">
                  <span className="text-3xl">🔥</span>
                </div>
                <h3 className="font-medium text-sm truncate">{provider.name}</h3>
                <p className="text-xs text-muted-foreground">{provider.distance}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-semibold text-primary">{provider.price}</span>
                  <div className="flex items-center">
                    <span className="text-xs text-yellow-500">⭐</span>
                    <span className="text-xs ml-1">{provider.rating}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;