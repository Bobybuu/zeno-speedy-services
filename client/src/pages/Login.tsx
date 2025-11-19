import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, ChevronRight, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Enhanced type definitions with strict typing
interface LoginError {
  message?: string;
  phone_number?: string[];
  password?: string[];
  detail?: string;
  field_errors?: Record<string, string[]>;
  code?: string;
}

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
  redirectPath?: string;
}

// UI state type for better loading management
type UIStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

interface UIState {
  status: UIStatus;
  fieldErrors: Record<string, string>;
}

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    phone_number: "",
    password: ""
  });
  
  const [uiState, setUiState] = useState<UIState>({ 
    status: 'idle', 
    fieldErrors: {} 
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Enhanced login handler with proper state management
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Set validating state
    setUiState({ status: 'validating', fieldErrors: {} });

    // Enhanced validation
    const fieldErrors: Record<string, string> = {};

    if (!formData.phone_number.trim()) {
      fieldErrors.phone_number = "Phone number is required";
    } else {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(formData.phone_number.trim())) {
        fieldErrors.phone_number = "Please enter a valid phone number with country code (e.g., +254712345678)";
      }
    }

    if (!formData.password.trim()) {
      fieldErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      fieldErrors.password = "Password must be at least 6 characters long";
    }

    // If validation errors, show them and return
    if (Object.keys(fieldErrors).length > 0) {
      setUiState({ status: 'error', fieldErrors });
      
      // Show the first error as toast
      const firstError = Object.values(fieldErrors)[0];
      toast.error(firstError);
      return;
    }

    // Set submitting state
    setUiState({ status: 'submitting', fieldErrors: {} });

    try {
      // ✅ SECURE LOGGING - No password exposure
      console.log("Login attempt for:", { 
        phone_number: formData.phone_number.substring(0, 5) + '***',
        has_password: !!formData.password
      });

      const result = await login(formData.phone_number, formData.password) as LoginResult;
      
      if (result.success) {
        // ✅ SECURE LOGGING
        console.log("Login successful for user:", result.data?.user?.user_type);
        
        setUiState({ status: 'success', fieldErrors: {} });
        
        const successMessage = result.data?.message || "Login successful!";
        toast.success(successMessage);
        
        // Use redirect path from response or default to dashboard
        const redirectPath = result.data?.redirectPath || result.redirectPath || '/dashboard';
        
        // Small delay to show success message and animation
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1500);
        
      } else {
        // Enhanced error handling with local error type
        const error = result.error as LoginError;
        
        // ✅ SECURE LOGGING
        console.error("Login failed with error code:", error?.code);
        
        const fieldErrors: Record<string, string> = {};
        
        // Handle different error formats
        if (error?.field_errors) {
          Object.entries(error.field_errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[field] = messages[0];
            }
          });
        } else if (error?.phone_number) {
          fieldErrors.phone_number = Array.isArray(error.phone_number) ? error.phone_number[0] : error.phone_number;
        } else if (error?.password) {
          fieldErrors.password = Array.isArray(error.password) ? error.password[0] : error.password;
        } else if (error?.detail) {
          toast.error(error.detail);
        } else if (error?.message) {
          toast.error(error.message);
        } else if (error?.code) {
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
        
        setUiState({ status: 'error', fieldErrors });
      }
    } catch (error: any) {
      console.error("Login catch error:", error);
      
      // Handle network errors or unexpected errors
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.response?.data) {
        const errorData = error.response.data as LoginError;
        
        if (errorData.field_errors) {
          const fieldErrors = errorData.field_errors;
          const firstErrorKey = Object.keys(fieldErrors)[0];
          const firstError = fieldErrors[firstErrorKey];
          errorMessage = `${firstErrorKey}: ${Array.isArray(firstError) ? firstError[0] : firstError}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setUiState({ status: 'error', fieldErrors: {} });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(name));

    // Clear field error when user starts typing
    if (uiState.fieldErrors[name]) {
      setUiState(prev => ({
        ...prev,
        fieldErrors: {
          ...prev.fieldErrors,
          [name]: ''
        }
      }));
    }
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
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add('phone_number'));

    // Clear field error when user starts typing
    if (uiState.fieldErrors.phone_number) {
      setUiState(prev => ({
        ...prev,
        fieldErrors: {
          ...prev.fieldErrors,
          phone_number: ''
        }
      }));
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  const isLoading = uiState.status === 'validating' || uiState.status === 'submitting';
  const isSuccess = uiState.status === 'success';

  // Animation variants
  const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const // Add type assertion
    }
  }
};

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  const successVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
      duration: 0.6
    }
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4 md:p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center pb-8 pt-10 px-8">
            <motion.div
              variants={itemVariants}
              className="mb-6"
            >
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">Z</span>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                  ZENO
                </h1>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Services You Can Count On
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Welcome back
              </CardTitle>
              <CardDescription className="text-base mt-3 text-gray-600 dark:text-gray-300">
                Enter your phone number to access your account
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="pb-8 px-8">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success-state"
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-center py-12 space-y-6"
                >
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Login Successful!
                  </h3>
                  <p className="text-muted-foreground">
                    Redirecting you to your dashboard...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="login-form"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  onSubmit={handleLogin}
                  className="space-y-6"
                >
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div className="space-y-3">
                      <Label 
                        htmlFor="phone_number" 
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone_number"
                          name="phone_number"
                          type="tel"
                          placeholder="+254712345678"
                          value={formData.phone_number}
                          onChange={handlePhoneChange}
                          onBlur={() => handleFieldBlur('phone_number')}
                          className={`pl-10 pr-4 h-12 transition-all duration-200 ${
                            uiState.fieldErrors.phone_number 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 focus:border-secondary focus:ring-secondary'
                          } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                          required
                          disabled={isLoading}
                        />
                        <AnimatePresence>
                          {uiState.fieldErrors.phone_number && touchedFields.has('phone_number') && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <AnimatePresence>
                        {uiState.fieldErrors.phone_number && touchedFields.has('phone_number') && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-red-600 dark:text-red-400 flex items-center space-x-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            <span>{uiState.fieldErrors.phone_number}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <p className="text-xs text-muted-foreground">
                        Enter your registered phone number with country code
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label 
                          htmlFor="password" 
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Password
                        </Label>
                        <Link 
                          to="/forgot-password" 
                          className="text-xs text-secondary hover:text-secondary/80 hover:underline font-medium transition-colors"
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
                          onBlur={() => handleFieldBlur('password')}
                          className={`pl-10 pr-12 h-12 transition-all duration-200 ${
                            uiState.fieldErrors.password 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 focus:border-secondary focus:ring-secondary'
                          } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                          required
                          disabled={isLoading}
                          minLength={6}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                          <AnimatePresence>
                            {uiState.fieldErrors.password && touchedFields.has('password') && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                              >
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {uiState.fieldErrors.password && touchedFields.has('password') && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-red-600 dark:text-red-400 flex items-center space-x-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            <span>{uiState.fieldErrors.password}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 6 characters long
                      </p>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100"
                      size="lg"
                      disabled={isLoading}
                    >
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center space-x-2"
                          >
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>
                              {uiState.status === 'validating' ? 'Validating...' : 'Logging in...'}
                            </span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="login"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center space-x-2"
                          >
                            <span>Login</span>
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Demo credentials hint for development */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Demo Credentials
                </p>
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <p>Phone: <span className="font-mono">+254712345678</span></p>
                  <p>Password: <span className="font-mono">password123</span></p>
                </div>
              </motion.div>
            )}
          </CardContent>
          
          <div className="px-8 pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-sm"
            >
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link 
                to="/register" 
                className="text-secondary hover:text-secondary/80 hover:underline font-semibold transition-colors"
                onClick={(e) => isLoading && e.preventDefault()}
              >
                Register
              </Link>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;