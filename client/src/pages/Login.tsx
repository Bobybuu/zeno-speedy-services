import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, ChevronRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Define local error type to fix TypeScript issues
interface LoginError {
  message?: string;
  phone_number?: string[];
  password?: string[];
  detail?: string;
  field_errors?: Record<string, string[]>;
  code?: string;
}

// Define the proper login result type that matches what AuthContext returns
interface LoginResult {
  success: boolean;
  data?: {
    user: any;
    refresh: string;
    access: string;
    message: string;
    vendor_profile?: any;
    redirectPath?: string;
  };
  error?: LoginError;
  redirectPath?: string; // Add redirectPath at the root level
}

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    phone_number: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation
    if (!formData.phone_number.trim() || !formData.password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Enhanced phone number validation
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(formData.phone_number.trim())) {
      toast.error("Please enter a valid phone number with country code (e.g., +254712345678)");
      return;
    }

    // Password length validation
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting login with:", { 
        phone_number: formData.phone_number,
        password_length: formData.password.length 
      });

      const result = await login(formData.phone_number, formData.password) as LoginResult;
      
      if (result.success) {
        console.log("Login successful, result:", result);
        
        const successMessage = result.data?.message || "Login successful!";
        toast.success(successMessage);
        
        // Use redirect path from response (either in data or at root level) or default to dashboard
        const redirectPath = result.data?.redirectPath || result.redirectPath || '/dashboard';
        console.log("Redirecting to:", redirectPath);
        
        // Small delay to show success message
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1000);
        
      } else {
        // Enhanced error handling with local error type
        const error = result.error as LoginError;
        console.error("Login failed with error:", error);
        
        // Handle different error formats
        if (error?.field_errors) {
          // Handle field-specific errors from API
          const fieldErrors = error.field_errors;
          
          if (fieldErrors.phone_number) {
            toast.error(`Phone number: ${fieldErrors.phone_number[0]}`);
          } else if (fieldErrors.password) {
            toast.error(`Password: ${fieldErrors.password[0]}`);
          } else {
            // Show first field error found
            const firstErrorKey = Object.keys(fieldErrors)[0];
            const firstError = fieldErrors[firstErrorKey];
            toast.error(`${firstErrorKey}: ${Array.isArray(firstError) ? firstError[0] : firstError}`);
          }
        } else if (error?.phone_number) {
          // Handle array or string phone number errors
          toast.error(Array.isArray(error.phone_number) ? error.phone_number[0] : error.phone_number);
        } else if (error?.password) {
          // Handle array or string password errors
          toast.error(Array.isArray(error.password) ? error.password[0] : error.password);
        } else if (error?.detail) {
          // Handle detail field (common in DRF)
          toast.error(error.detail);
        } else if (error?.message) {
          // Handle general message
          toast.error(error.message);
        } else if (error?.code) {
          // Handle error codes
          switch (error.code) {
            case 'INVALID_CREDENTIALS':
              toast.error("Invalid phone number or password");
              break;
            case 'USER_NOT_FOUND':
              toast.error("No account found with this phone number");
              break;
            case 'ACCOUNT_DISABLED':
              toast.error("Account is disabled. Please contact support");
              break;
            default:
              toast.error("Login failed. Please try again.");
          }
        } else {
          toast.error("Login failed. Please check your credentials and try again.");
        }
      }
    } catch (error: any) {
      console.error("Login catch error:", error);
      
      // Handle network errors or unexpected errors
      if (error.response?.data) {
        const errorData = error.response.data as LoginError;
        
        if (errorData.field_errors) {
          const fieldErrors = errorData.field_errors;
          const firstErrorKey = Object.keys(fieldErrors)[0];
          const firstError = fieldErrors[firstErrorKey];
          toast.error(`${firstErrorKey}: ${Array.isArray(firstError) ? firstError[0] : firstError}`);
        } else if (errorData.detail) {
          toast.error(errorData.detail);
        } else if (errorData.message) {
          toast.error(errorData.message);
        } else {
          toast.error("Login failed. Please try again.");
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          toast.error("Network error. Please check your internet connection and try again.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Auto-format phone number for better UX
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + if it doesn't have it
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
      return '+' + cleaned;
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setFormData({
      ...formData,
      phone_number: formattedValue,
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
              <h1 className="text-4xl font-bold text-primary">ZENO</h1>
              <p className="text-sm text-muted-foreground">Services You Can Count On</p>
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
                    onChange={handlePhoneChange}
                    className="pl-10"
                    required
                    disabled={isLoading}
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
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

            {/* Demo credentials hint for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-3 bg-muted rounded-lg border">
                <p className="text-xs text-muted-foreground font-medium mb-2">Demo Credentials:</p>
                <p className="text-xs text-muted-foreground">Phone: +254712345678</p>
                <p className="text-xs text-muted-foreground">Password: password123</p>
              </div>
            )}
          </CardContent>
          
          <div className="px-6 pb-6">
            <div className="text-center text-sm mb-4">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link 
                to="/register" 
                className="text-secondary hover:underline font-semibold"
                onClick={(e) => isLoading && e.preventDefault()}
              >
                Register
              </Link>
            </div>
            
            
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;