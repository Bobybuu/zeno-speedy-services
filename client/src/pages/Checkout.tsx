// src/pages/Checkout.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderItems, totalAmount } = location.state || {};

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
          <h1 className="text-xl font-semibold">Checkout</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
          {orderItems?.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity} • {item.includeCylinder ? 'With Cylinder' : 'Without Cylinder'}
                </p>
              </div>
              <p className="font-semibold">KSh {item.totalAmount.toLocaleString()}</p>
            </div>
          ))}
          
          <div className="flex justify-between items-center pt-3 font-bold text-lg">
            <span>Total</span>
            <span>KSh {totalAmount?.toLocaleString() || '0'}</span>
          </div>
        </Card>

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => navigate('/payment', { state: { orderItems, totalAmount } })}
        >
          Proceed to Payment
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Checkout;