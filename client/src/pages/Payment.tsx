import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CreditCard, Phone, Loader2, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import BottomNav from "@/components/BottomNav";

interface Order {
  id: number;
  service_details: {
    name: string;
    vendor_name: string;
    price: string;
  };
  quantity: number;
  total_amount: string;
  delivery_address: string;
}

interface PaymentResponse {
  message: string;
  checkout_request_id: string;
  payment_id: number;
}

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [currentPayment, setCurrentPayment] = useState<PaymentResponse | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Get orders from location state or fetch from backend
  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Check if orders are passed via navigation state
        if (location.state?.orders) {
          setOrders(location.state.orders);
        } else {
          // Fetch pending orders from backend
          await fetchPendingOrders();
        }
      } catch (error) {
        console.error('Error initializing payment:', error);
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [location.state]);

  const fetchPendingOrders = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/orders/my-orders/?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const ordersData = await response.json();
        setOrders(ordersData);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  };

  const formatPhoneNumber = (number: string): string => {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Convert to 254 format
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (number: string): boolean => {
    const formatted = formatPhoneNumber(number);
    return formatted.length === 12; // 254 followed by 9 digits
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678)",
        variant: "destructive"
      });
      return;
    }

    if (orders.length === 0) {
      toast({
        title: "No Orders",
        description: "No pending orders found for payment",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const token = localStorage.getItem('access_token');
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Process payment for each order
      const paymentPromises = orders.map(order => 
        fetch('/api/payments/initiate/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: order.id,
            phone_number: formattedPhone,
            payment_method: 'mpesa'
          })
        })
      );

      const responses = await Promise.all(paymentPromises);
      const results = await Promise.all(responses.map(r => r.json()));

      // Check if all payments were initiated successfully
      const successfulPayments = results.filter(result => !result.error);
      
      if (successfulPayments.length > 0) {
        setCurrentPayment(successfulPayments[0]);
        toast({
          title: "Payment Initiated",
          description: "Check your phone to complete the M-Pesa payment",
        });

        // Start polling for payment status
        startPaymentPolling(successfulPayments[0].payment_id);
      } else {
        throw new Error(results[0]?.error || 'Failed to initiate payment');
      }

    } catch (error) {
      console.error('Payment initiation failed:', error);
      setPaymentStatus('failed');
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentPolling = (paymentId: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/payments/status/${paymentId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const paymentStatus = await response.json();
          
          if (paymentStatus.status === 'completed') {
            clearInterval(pollInterval);
            setPaymentStatus('success');
            toast({
              title: "Payment Successful!",
              description: "Your payment has been confirmed",
            });
            
            // Navigate to success page after a delay
            setTimeout(() => {
              navigate("/orders/confirmation", { 
                state: { 
                  orders: orders,
                  payment: paymentStatus 
                } 
              });
            }, 2000);
          } else if (paymentStatus.status === 'failed') {
            clearInterval(pollInterval);
            setPaymentStatus('failed');
            toast({
              title: "Payment Failed",
              description: "The payment was not completed. Please try again.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'processing') {
        setPaymentStatus('failed');
        toast({
          title: "Payment Timeout",
          description: "Payment took too long to complete. Please check your phone and try again if needed.",
          variant: "destructive"
        });
      }
    }, 120000);
  };

  const retryPayment = () => {
    setPaymentStatus('idle');
    setCurrentPayment(null);
  };

  const calculateTotal = (): number => {
    return orders.reduce((total, order) => total + parseFloat(order.total_amount), 0);
  };

  const total = calculateTotal();
  const deliveryFee = 200; // Fixed delivery fee
  const grandTotal = total + deliveryFee;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

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
            disabled={isProcessing}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Payment</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Payment Status Display */}
        {paymentStatus === 'processing' && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Processing Payment</h3>
                <p className="text-sm text-blue-700">
                  Check your phone for M-Pesa prompt. Enter your PIN to complete payment.
                </p>
              </div>
            </div>
          </Card>
        )}

        {paymentStatus === 'success' && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Payment Successful!</h3>
                <p className="text-sm text-green-700">
                  Your payment has been confirmed. Redirecting...
                </p>
              </div>
            </div>
          </Card>
        )}

        {paymentStatus === 'failed' && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Payment Failed</h3>
                <p className="text-sm text-red-700">
                  The payment was not completed. Please try again.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={retryPayment}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-3">
            {orders.map((order, index) => (
              <div key={order.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{order.service_details.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.service_details.vendor_name} × {order.quantity}
                  </p>
                </div>
                <span className="font-semibold">
                  KSh {parseFloat(order.total_amount).toLocaleString()}
                </span>
              </div>
            ))}
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>KSh {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>KSh {deliveryFee.toLocaleString()}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary">KSh {grandTotal.toLocaleString()}</span>
              </div>
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
              <div>
                <span className="font-medium">M-Pesa</span>
                <p className="text-sm text-muted-foreground">
                  Pay securely with M-Pesa
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Form - Only show when not processing */}
        {paymentStatus === 'idle' && (
          <Card className="p-4">
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={10}
                  required
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the phone number registered with M-Pesa. We'll convert it to 254 format.
                </p>
                {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                  <p className="text-xs text-destructive">
                    Please enter a valid Kenyan phone number
                  </p>
                )}
              </div>

              <Button 
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90"
                size="lg"
                disabled={isProcessing || !validatePhoneNumber(phoneNumber) || orders.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Initiating Payment...
                  </>
                ) : (
                  `Pay KSh ${grandTotal.toLocaleString()}`
                )}
              </Button>
            </form>
          </Card>
        )}

        {/* Order Details */}
        {orders.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Delivery Information</h3>
            {orders.map((order, index) => (
              <div key={order.id} className="text-sm space-y-1 mb-3 last:mb-0">
                <p><strong>Order #{order.id}:</strong> {order.delivery_address}</p>
              </div>
            ))}
          </Card>
        )}

        {/* Security Notice */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">
                <strong>Secure Payment:</strong> Your payment is encrypted and secure. 
                We use M-Pesa's secure payment gateway. No card details are stored on our servers.
              </p>
            </div>
          </div>
        </Card>

        {/* Help Text */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">How to complete payment:</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Enter your M-Pesa registered phone number</li>
            <li>Click "Pay" to receive an M-Pesa prompt</li>
            <li>Enter your M-Pesa PIN when prompted on your phone</li>
            <li>Wait for confirmation (automatic)</li>
          </ol>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Payment;