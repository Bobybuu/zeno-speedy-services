import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Phone, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GasProductCard from "@/components/GasProductCard";
import BottomNav from "@/components/BottomNav";

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
}

const GasProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Mock provider data - in production this would come from API/database
  const provider = {
    id: Number(id),
    name: "Gas Refiller 1",
    location: "Westlands, Nairobi",
    rating: 4.5,
    reviews: 124,
    phone: "+254 700 000 000",
    distance: "1.2 km"
  };

  const gasProducts: GasProduct[] = [
    {
      id: 1,
      name: "LPG Gas 6kg",
      weight: "6 Kilograms",
      description: "Perfect for small households and cooking needs",
      priceWithCylinder: 3500,
      priceWithoutCylinder: 1800
    },
    {
      id: 2,
      name: "LPG Gas 13kg",
      weight: "13 Kilograms",
      description: "Most popular choice for regular home use",
      priceWithCylinder: 5200,
      priceWithoutCylinder: 3200
    },
    {
      id: 3,
      name: "LPG Gas 25kg",
      weight: "25 Kilograms",
      description: "Ideal for large families and commercial use",
      priceWithCylinder: 8500,
      priceWithoutCylinder: 5800
    },
    {
      id: 4,
      name: "LPG Gas 50kg",
      weight: "50 Kilograms",
      description: "Commercial grade for restaurants and hotels",
      priceWithCylinder: 15000,
      priceWithoutCylinder: 11000
    }
  ];

  const handleAddToCart = (product: GasProduct, quantity: number, includeCylinder: boolean) => {
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

      return [...prev, { ...product, quantity, includeCylinder }];
    });
  };

  const cartTotal = cart.reduce((total, item) => {
    const price = item.includeCylinder ? item.priceWithCylinder : item.priceWithoutCylinder;
    return total + (price * item.quantity);
  }, 0);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

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
            <div>
              <h1 className="text-xl font-semibold">{provider.name}</h1>
              <div className="flex items-center text-xs text-white/80">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{provider.location}</span>
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
            <span className="font-semibold">{provider.rating}</span>
            <span className="text-sm text-muted-foreground">({provider.reviews} reviews)</span>
          </div>
          <Badge variant="outline">{provider.distance} away</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4" />
          <span>{provider.phone}</span>
        </div>
      </div>

      {/* Products Grid */}
      <main className="p-4">
        <h2 className="text-xl font-semibold mb-4">Available Gas Products</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {gasProducts.map(product => (
            <GasProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </main>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-20 right-4 z-30">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 px-6"
            onClick={() => {
              // Navigate to cart page or show cart modal
              console.log("Cart:", cart);
            }}
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
