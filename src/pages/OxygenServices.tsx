import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const OxygenServices = () => {
  const navigate = useNavigate();

  const oxygenProviders = [
    { id: 1, name: "Nairobi Hospital", location: "Argwings Kodhek", distance: "2.1 km", price: "KSh 5,000", contact: "0720-123456" },
    { id: 2, name: "Aga Khan Hospital", location: "Parklands", distance: "3.5 km", price: "KSh 4,500", contact: "0722-234567" },
    { id: 3, name: "MP Shah Hospital", location: "Westlands", distance: "4.2 km", price: "KSh 4,800", contact: "0733-345678" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
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
              <h1 className="text-xl font-semibold">Oxygen Refill Services</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Hospital Services</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {oxygenProviders.map((provider, index) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{provider.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{provider.location}</span>
                    <span>•</span>
                    <span>{provider.distance}</span>
                  </div>
                  <p className="text-xl font-bold text-primary mt-2">{provider.price}</p>
                  <div className="flex items-center gap-1 text-sm mt-2">
                    <Phone className="h-3 w-3" />
                    <span>{provider.contact}</span>
                  </div>
                </div>
                <span className="text-4xl">🏥</span>
              </div>
              <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90 text-white">
                Contact Hospital
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default OxygenServices;