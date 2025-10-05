import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface GasProduct {
  id: number;
  name: string;
  weight: string;
  description: string;
  priceWithCylinder: number;
  priceWithoutCylinder: number;
}

interface GasProductCardProps {
  product: GasProduct;
  onAddToCart: (product: GasProduct, quantity: number, includeCylinder: boolean) => void;
}

const GasProductCard = ({ product, onAddToCart }: GasProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [includeCylinder, setIncludeCylinder] = useState(false);

  const currentPrice = includeCylinder ? product.priceWithCylinder : product.priceWithoutCylinder;
  const totalPrice = currentPrice * quantity;

  const handleAddToCart = () => {
    onAddToCart(product, quantity, includeCylinder);
    toast.success(`Added ${quantity}x ${product.name} to cart`);
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.weight}</p>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id={`without-${product.id}`}
                name={`cylinder-${product.id}`}
                checked={!includeCylinder}
                onChange={() => setIncludeCylinder(false)}
                className="cursor-pointer"
              />
              <label htmlFor={`without-${product.id}`} className="cursor-pointer text-sm">
                Without Cylinder
              </label>
            </div>
            <span className="font-semibold">KSh {product.priceWithoutCylinder.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id={`with-${product.id}`}
                name={`cylinder-${product.id}`}
                checked={includeCylinder}
                onChange={() => setIncludeCylinder(true)}
                className="cursor-pointer"
              />
              <label htmlFor={`with-${product.id}`} className="cursor-pointer text-sm">
                With Cylinder
              </label>
            </div>
            <span className="font-semibold">KSh {product.priceWithCylinder.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-8 w-8"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-semibold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">KSh {totalPrice.toLocaleString()}</p>
          </div>
        </div>

        <Button onClick={handleAddToCart} className="w-full" size="lg">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
};

export default GasProductCard;
