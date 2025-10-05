import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const Payment = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Payment Initiated",
        description: "Check your phone to complete the payment"
      });
      // Navigate to orders or success page
      setTimeout(() => navigate("/dashboard"), 2000);
    }, 2000);
  };

  const total = 5100; // This would come from cart state or route params

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
          <h1 className="text-xl font-semibold">Payment</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Payment Summary */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>KSh 4,900</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>KSh 200</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-primary">KSh {total.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Payment Method</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5 border-primary">
              <Phone className="h-5 w-5 text-primary" />
              <span className="font-medium">M-Pesa</span>
            </div>
          </div>
        </Card>

        {/* Payment Form */}
        <Card className="p-4">
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07XX XXX XXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={10}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number registered with M-Pesa
              </p>
            </div>

            <Button 
              type="submit"
              className="w-full bg-secondary hover:bg-secondary/90"
              size="lg"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : `Pay KSh ${total.toLocaleString()}`}
            </Button>
          </form>
        </Card>

        {/* Security Notice */}
        <Card className="p-4 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            🔒 Your payment is secure and encrypted. You will receive an M-Pesa prompt on your phone to complete the transaction.
          </p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Payment;
