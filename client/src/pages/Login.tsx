import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    phone_number: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone_number || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(formData.phone_number)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.phone_number, formData.password);
      
      if (result.success) {
        toast.success("Login successful!");
        navigate("/dashboard");
      } else {
        // Handle specific error cases
        if (result.error?.phone_number) {
          toast.error(result.error.phone_number[0]);
        } else if (result.error?.password) {
          toast.error(result.error.password[0]);
        } else if (result.error?.detail) {
          toast.error(result.error.detail);
        } else {
          toast.error(result.error?.message || "Login failed");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-primary">zeNO</h1>
              <p className="text-sm text-muted-foreground">Trusted Reliable Services</p>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Enter your phone number to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    placeholder="+254712345678"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your registered phone number with country code
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-secondary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Logging in...
                  </>
                ) : (
                  <>
                    Login
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Phone Login Info */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
              <h4 className="text-sm font-semibold mb-2 text-center">Phone Login Only</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Use your registered phone number</p>
                <p>• Include country code (e.g., +254...)</p>
                <p>• OTP will be sent to your phone</p>
              </div>
            </div>
          </CardContent>
          
          <div className="px-6 pb-6">
            <div className="text-center text-sm mb-4">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/register" className="text-secondary hover:underline font-semibold">
                Register
              </Link>
            </div>
            
            {/* Quick Test Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setFormData({
                    phone_number: "+254712345678",
                    password: "password123"
                  });
                  toast.info("Demo credentials filled. Click Login to test.");
                }}
              >
                Fill Demo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setFormData({ phone_number: "", password: "" })}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;