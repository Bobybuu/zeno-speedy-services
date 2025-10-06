import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Clock, Star, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import Map from "@/components/Map";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface OperatingHours {
  id: number;
  day: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
}

interface Provider {
  id: number;
  name: string;
  location: string;
  coords: [number, number];
}

interface VendorReview {
  id: number;
  customer_name: string;
  customer_username: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Vendor {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  contact_number: string;
  email: string;
  website: string;
  opening_hours: string;
  is_verified: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
  operating_hours: OperatingHours[];
  reviews: VendorReview[];
  owner_name: string;
  owner_email: string;
}

// Mock services based on business type
const getServicesByBusinessType = (businessType: string): string[] => {
  switch (businessType) {
    case 'gas_station':
      return [
        "6kg Gas Cylinders",
        "13kg Gas Cylinders", 
        "Gas Refills",
        "New Cylinder Sales",
        "Free Delivery (orders above KSh 2000)",
        "Emergency Service Available"
      ];
    case 'mechanic':
      return [
        "Engine Repair",
        "Brake Services",
        "Oil Change",
        "Tire Replacement",
        "Electrical System Repair",
        "24/7 Emergency Service"
      ];
    case 'hospital':
      return [
        "Emergency Care",
        "Outpatient Services",
        "Laboratory Tests",
        "Pharmacy",
        "Ambulance Services",
        "24/7 Emergency Care"
      ];
    case 'roadside_assistance':
      return [
        "Tire Change",
        "Jump Start",
        "Fuel Delivery",
        "Lockout Service",
        "Towing",
        "24/7 Roadside Assistance"
      ];
    default:
      return [
        "Professional Services",
        "Quality Assurance",
        "Customer Support",
        "Emergency Services"
      ];
  }
};

// Mock terms of service based on business type
const getTermsByBusinessType = (businessType: string): string[] => {
  switch (businessType) {
    case 'gas_station':
      return [
        "Payment on delivery accepted",
        "Refund available for defective cylinders within 24 hours",
        "Delivery within 2 hours for urgent orders",
        "Minimum order: KSh 500",
        "Cylinders must be returned within 30 days for deposit refund"
      ];
    case 'mechanic':
      return [
        "Payment upon completion of service",
        "Warranty on parts and labor",
        "Free estimates provided",
        "24/7 emergency service available",
        "Quality guaranteed on all repairs"
      ];
    case 'hospital':
      return [
        "Emergency cases prioritized",
        "Insurance accepted",
        "Payment plans available",
        "24/7 emergency services",
        "Confidentiality guaranteed"
      ];
    case 'roadside_assistance':
      return [
        "24/7 availability",
        "Response within 30 minutes",
        "Transparent pricing",
        "Multiple payment options",
        "Service area coverage clearly defined"
      ];
    default:
      return [
        "Professional service guaranteed",
        "Customer satisfaction priority",
        "Transparent pricing",
        "Quality assurance"
      ];
  }
};

// Format operating hours for display
const formatOperatingHours = (operatingHours: OperatingHours[]): string => {
  if (!operatingHours || operatingHours.length === 0) {
    return "24/7 Available";
  }

  const daysMap = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Group by time slots
  const timeSlots: { [key: string]: string[] } = {};
  
  operatingHours.forEach(hour => {
    if (hour.is_closed) {
      const key = 'Closed';
      if (!timeSlots[key]) timeSlots[key] = [];
      timeSlots[key].push(daysMap[hour.day]);
    } else {
      const timeKey = `${hour.opening_time} - ${hour.closing_time}`;
      if (!timeSlots[timeKey]) timeSlots[timeKey] = [];
      timeSlots[timeKey].push(daysMap[hour.day]);
    }
  });

  // Format the display string
  const formatted = Object.entries(timeSlots).map(([time, days]) => {
    if (days.length === 7) {
      return `Daily: ${time}`;
    } else if (days.length === 1) {
      return `${days[0]}: ${time}`;
    } else {
      return `${days[0]} - ${days[days.length - 1]}: ${time}`;
    }
  });

  return formatted.join('; ');
};

const VendorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendorDetails = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Use absolute URL to your Django backend
    const response = await fetch(`http://localhost:8000/api/vendors/${id}/`);
    
    console.log('Response status:', response.status);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log('Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned HTML instead of JSON. Check if API endpoint exists.');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setVendor(data);
  } catch (err) {
    console.error("Error fetching vendor details:", err);
    setError(err instanceof Error ? err.message : "Failed to load vendor details");
    toast({
      title: "Error",
      description: "Cannot connect to vendor API. Make sure the backend server is running.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

    if (id) {
      fetchVendorDetails();
    }
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
            <h1 className="text-xl font-semibold">Vendor Details</h1>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vendor details...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
            <h1 className="text-xl font-semibold">Vendor Details</h1>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">Failed to load vendor details</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const services = getServicesByBusinessType(vendor.business_type);
  const termsOfService = getTermsByBusinessType(vendor.business_type);
  const formattedHours = vendor.operating_hours 
    ? formatOperatingHours(vendor.operating_hours) 
    : vendor.opening_hours || "24/7 Available";

  // Get appropriate emoji based on business type
  const getBusinessEmoji = (businessType: string) => {
    switch (businessType) {
      case 'gas_station': return '🔥';
      case 'mechanic': return '🔧';
      case 'hospital': return '🏥';
      case 'roadside_assistance': return '🛟';
      default: return '🏢';
    }
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
          <h1 className="text-xl font-semibold">Vendor Details</h1>
        </div>
      </header>

      <div className="space-y-4">
        {/* Vendor Header */}
        <Card className="rounded-none border-x-0">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{vendor.business_name}</h2>
                  {vendor.is_verified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground capitalize">
                  {vendor.business_type.replace('_', ' ')}
                </p>
              </div>
              <div className="text-4xl">{getBusinessEmoji(vendor.business_type)}</div>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold">{vendor.average_rating}</span>
              <span className="text-muted-foreground text-sm">
                ({vendor.total_reviews} reviews)
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{vendor.city}, {vendor.country}</span>
            </div>

            <p className="text-sm text-muted-foreground mt-3">
              {vendor.description}
            </p>
          </div>
        </Card>

        {/* Location Map */}
        {vendor.latitude && vendor.longitude && (
          <Card className="rounded-none border-x-0 overflow-hidden">
            <div className="h-[250px]">
              <Map providers={[{
                id: Number(vendor.id),
                name: vendor.business_name,
                location: vendor.address,
                coords: [Number(vendor.latitude), Number(vendor.longitude)] as [number, number]
              }]} />
            </div>
          </Card>
        )}

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
                  <p className="text-sm text-muted-foreground">{vendor.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Phone</p>
                  <a href={`tel:${vendor.contact_number}`} className="text-sm text-primary">
                    {vendor.contact_number}
                  </a>
                </div>
              </div>

              {vendor.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email</p>
                    <a href={`mailto:${vendor.email}`} className="text-sm text-primary">
                      {vendor.email}
                    </a>
                  </div>
                </div>
              )}

              {vendor.website && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Website</p>
                    <a 
                      href={vendor.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary"
                    >
                      {vendor.website}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Opening Hours</p>
                  <p className="text-sm text-muted-foreground">{formattedHours}</p>
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
              {services.map((service, index) => (
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
              {termsOfService.map((term, index) => (
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
            onClick={() => navigate(`/services/${vendor.business_type}/${vendor.id}`)}
          >
            Browse Services
          </Button>
          <Button 
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => window.open(`tel:${vendor.contact_number}`)}
          >
            Call Now
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default VendorDetail;