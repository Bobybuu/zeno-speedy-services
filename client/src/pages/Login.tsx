import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, ChevronRight, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast.success("Login successful!");
        navigate("/dashboard");
      } else {
        // Handle specific error cases
        if (result.error?.email) {
          toast.error(result.error.email[0]);
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

  const handlePhoneLogin = () => {
    // For phone login, we'll use the phone number as username/email
    // This assumes your backend can handle phone number login
    toast.info("Please use email for login, or enter your phone number as username");
    setShowEmailLogin(true);
  };

  const switchToEmail = () => {
    setShowEmailLogin(true);
    setFormData({ email: "", password: "" });
  };

  const switchToPhone = () => {
    setShowEmailLogin(false);
    setFormData({ email: "", password: "" });
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
              {showEmailLogin 
                ? "Enter your email to access your account" 
                : "Enter your phone number to access your account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Method Toggle */}
            <div className="flex border border-gray-200 rounded-lg p-1 mb-4 bg-muted/50">
              <button
                type="button"
                onClick={switchToPhone}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  !showEmailLogin 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Phone
              </button>
              <button
                type="button"
                onClick={switchToEmail}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  showEmailLogin 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Email
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {!showEmailLogin ? (
                // Phone Login Form
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254712345678"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your registered phone number
                  </p>
                </div>
              ) : (
                // Email Login Form
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

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
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
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

            {/* Demo Credentials Hint */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
              <h4 className="text-sm font-semibold mb-2 text-center">Demo Access</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Use the email you registered with</p>
                <p>Or try with phone number as username</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm">
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
                    email: "test@example.com",
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
                onClick={() => setFormData({ email: "", password: "" })}
              >
                Clear
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;