import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Clock, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import Map from "@/components/Map";

const ProviderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock provider data
  const provider = {
    id: id,
    name: "Gas Refiller 1",
    businessType: "Gas Distribution",
    location: "Westlands, Nairobi",
    address: "Waiyaki Way, Westlands Shopping Mall",
    lat: -1.2921,
    lng: 36.8219,
    phone: "+254 712 345 678",
    email: "info@gasrefiller1.co.ke",
    rating: 4.5,
    totalReviews: 124,
    distance: "1.2 km",
    openingHours: "Mon-Sat: 7:00 AM - 8:00 PM, Sun: 9:00 AM - 6:00 PM",
    description: "Leading gas supplier in Nairobi with fast delivery and quality service. We offer both refills and new cylinders.",
    services: [
      "6kg Gas Cylinders",
      "13kg Gas Cylinders", 
      "Gas Refills",
      "New Cylinder Sales",
      "Free Delivery (orders above KSh 2000)",
      "Emergency Service Available"
    ],
    termsOfService: [
      "Payment on delivery accepted",
      "Refund available for defective cylinders within 24 hours",
      "Delivery within 2 hours for urgent orders",
      "Minimum order: KSh 500",
      "Cylinders must be returned within 30 days for deposit refund"
    ]
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Provider Details</h1>
        </div>
      </header>

      <div className="space-y-4">
        {/* Provider Header */}
        <Card className="rounded-none border-x-0">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{provider.name}</h2>
                <p className="text-muted-foreground">{provider.businessType}</p>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold">{provider.rating}</span>
              <span className="text-muted-foreground text-sm">
                ({provider.totalReviews} reviews)
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{provider.location} • {provider.distance} away</span>
            </div>

            <p className="text-sm text-muted-foreground mt-3">
              {provider.description}
            </p>
          </div>
        </Card>

        {/* Location Map */}
        <Card className="rounded-none border-x-0 overflow-hidden">
          <div className="h-[250px]">
            <Map providers={[{
              id: Number(id),
              name: provider.name,
              location: provider.location,
              coords: [provider.lat, provider.lng] as [number, number]
            }]} />
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="mx-4">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{provider.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Phone</p>
                  <a href={`tel:${provider.phone}`} className="text-sm text-primary">
                    {provider.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Email</p>
                  <a href={`mailto:${provider.email}`} className="text-sm text-primary">
                    {provider.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Opening Hours</p>
                  <p className="text-sm text-muted-foreground">{provider.openingHours}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Services Offered */}
        <Card className="mx-4">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Services Offered</h3>
            <div className="space-y-2">
              {provider.services.map((service, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Terms of Service */}
        <Card className="mx-4 mb-4">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Terms of Service</h3>
            <div className="space-y-2">
              {provider.termsOfService.map((term, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{term}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="px-4 pb-4 space-y-2">
          <Button 
            className="w-full bg-secondary hover:bg-secondary/90"
            size="lg"
            onClick={() => navigate(`/services/gas/${id}`)}
          >
            Browse Products
          </Button>
          <Button 
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => window.open(`tel:${provider.phone}`)}
          >
            Call Now
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProviderDetail;
