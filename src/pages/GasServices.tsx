import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Map from "@/components/Map";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const GasServices = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("map");

  const gasProviders = [
    { 
      id: 1, 
      name: "Gas Refiller 1", 
      location: "Location 1", 
      price: "KSh 3,500", 
      rating: 4.5,
      distance: "1.2 km",
      coords: [-1.2921, 36.8219] as [number, number]
    },
    { 
      id: 2, 
      name: "Gas Refiller 2", 
      location: "Location 2", 
      price: "KSh 3,200", 
      rating: 4.8,
      distance: "2.5 km",
      coords: [-1.2841, 36.8170] as [number, number]
    },
    { 
      id: 3, 
      name: "Gas Station 1", 
      location: "Location 3", 
      price: "KSh 3,700", 
      rating: 4.2,
      distance: "3.1 km",
      coords: [-1.2980, 36.8150] as [number, number]
    },
    { 
      id: 4, 
      name: "Gas Station 2", 
      location: "Location 4", 
      price: "KSh 3,300", 
      rating: 4.9,
      distance: "4.0 km",
      coords: [-1.2750, 36.8280] as [number, number]
    },
  ];

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
              <h1 className="text-xl font-semibold">Gas Listing Page</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Near you</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search gas providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white text-foreground"
            />
          </div>
        </div>
      </header>

      {/* Tabs for Map/List View */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-[136px] z-30 rounded-none">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="m-0">
          <div className="h-[400px] relative">
            <Map providers={gasProviders} />
          </div>
          {/* Provider cards below map */}
          <div className="p-4 space-y-3">
            {gasProviders.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300"
                  onClick={() => navigate(`/services/gas/${provider.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{provider.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{provider.location}</span>
                        <span>•</span>
                        <span>{provider.distance}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg font-bold text-primary">{provider.price}</span>
                        <div className="flex items-center ml-auto">
                          <span className="text-yellow-500">⭐</span>
                          <span className="text-sm ml-1">{provider.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-4xl ml-4">🔥</div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="m-0 p-4">
          <div className="space-y-3">
            {gasProviders.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300"
                  onClick={() => navigate(`/services/gas/${provider.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{provider.location}</span>
                        <span>•</span>
                        <span>{provider.distance}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xl font-bold text-primary">{provider.price}</span>
                        <div className="flex items-center">
                          <span className="text-yellow-500">⭐</span>
                          <span className="text-sm ml-1 font-medium">{provider.rating}</span>
                          <span className="text-xs text-muted-foreground ml-1">(124 reviews)</span>
                        </div>
                      </div>
                      <Button 
                        className="mt-3 bg-secondary hover:bg-secondary/90 text-white"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/services/gas/${provider.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                    <div className="text-5xl ml-4">🔥</div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default GasServices;