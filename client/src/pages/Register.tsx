// src/pages/Register.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Phone, 
  Lock, 
  User, 
  ChevronRight, 
  Building, 
  MapPin, 
  Mail, 
  Globe, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Enhanced type definitions with strict typing
interface RegisterResponse {
  success: boolean;
  data?: {
    user: any;
    refresh: string;
    access: string;
    message: string;
    requires_otp_verification: boolean;
    remaining_otp_attempts?: number;
    preferred_channel_used: string;
    vendor_profile?: any;
    redirectPath?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    field_errors?: Record<string, string[]>;
  };
  message?: string;
  redirectPath?: string;
}

// UI state type for better loading management
type UIStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

interface UIState {
  status: UIStatus;
  fieldErrors: Record<string, string>;
}

// ✅ CORRECTED business types to match backend
const BUSINESS_TYPES = [
  { value: "gas_station", label: "Gas Services & Delivery" },
  { value: "mechanic", label: "Auto Repair & Maintenance" },
  { value: "roadside_assistance", label: "Roadside Assistance" },
  { value: "mechanic", label: "Tire Services" },
  { value: "mechanic", label: "Battery Services" },
  { value: "mechanic", label: "General Mechanic" },
  { value: "mechanic", label: "Other Services" },
];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    userType: "customer",
    
    // Vendor Business Information (shown only for vendor/mechanic)
    businessName: "",
    businessType: "gas_station",
    businessDescription: "",
    businessAddress: "",
    businessCity: "",
    businessCountry: "Kenya",
    businessEmail: "",
    businessWebsite: "",
    contactNumber: "",
    deliveryRadius: "10",
    minOrderAmount: "0",
    deliveryFee: "0",
  });

  const [uiState, setUiState] = useState<UIState>({ 
    status: 'idle', 
    fieldErrors: {} 
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const isVendorType = formData.userType === "vendor" || formData.userType === "mechanic";
  const isLoading = uiState.status === 'validating' || uiState.status === 'submitting';
  const isSuccess = uiState.status === 'success';

  // ✅ FIXED: Helper function to get business type label for description
  const getBusinessTypeLabel = (businessType: string): string => {
    const businessTypeMap: Record<string, string> = {
      'gas_station': 'gas services',
      'mechanic': 'mechanic services',
      'roadside_assistance': 'roadside assistance'
    };
    return businessTypeMap[businessType] || 'services';
  };

  // Enhanced validation schema
  const validateStep1 = (): boolean => {
    const fieldErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      fieldErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      fieldErrors.lastName = "Last name is required";
    }

    if (!formData.phoneNumber.trim()) {
      fieldErrors.phoneNumber = "Phone number is required";
    } else {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        fieldErrors.phoneNumber = "Please enter a valid phone number with country code (e.g., +254712345678)";
      }
    }

    if (!formData.password) {
      fieldErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      fieldErrors.password = "Password must be at least 6 characters long";
    }

    if (!formData.confirmPassword) {
      fieldErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      fieldErrors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setUiState({ status: 'error', fieldErrors });
      const firstError = Object.values(fieldErrors)[0];
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!isVendorType) return true;

    const fieldErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      fieldErrors.businessName = "Business name is required";
    }

    if (!formData.businessAddress.trim()) {
      fieldErrors.businessAddress = "Business address is required";
    }

    if (!formData.businessCity.trim()) {
      fieldErrors.businessCity = "Business city is required";
    }

    if (!formData.contactNumber.trim()) {
      fieldErrors.contactNumber = "Contact number is required";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setUiState({ status: 'error', fieldErrors });
      const firstError = Object.values(fieldErrors)[0];
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateStep2()) return;

  setUiState({ status: 'submitting', fieldErrors: {} });

  try {
    // ✅ FIXED: Prepare registration data according to backend expectations
    const registrationData: any = {
      email: formData.businessEmail || '',
      username: formData.phoneNumber,
      password: formData.password,
      password_confirm: formData.confirmPassword,
      user_type: formData.userType,
      phone_number: formData.phoneNumber,
      location: formData.businessCity || "Nairobi",
      first_name: formData.firstName,
      last_name: formData.lastName,
      preferred_otp_channel: "whatsapp"
    };

    // Only include vendor data for vendor/mechanic users
    if (isVendorType) {
      registrationData.vendor_data = {
        business_name: formData.businessName,
        business_type: formData.businessType,
        description: formData.businessDescription || `Professional ${getBusinessTypeLabel(formData.businessType)} provider`,
        address: formData.businessAddress,
        city: formData.businessCity,
        country: formData.businessCountry,
        contact_number: formData.contactNumber || formData.phoneNumber,
        email: formData.businessEmail || '',
        website: formData.businessWebsite || '',
        delivery_radius_km: parseInt(formData.deliveryRadius) || 10,
        min_order_amount: parseFloat(formData.minOrderAmount) || 0,
        delivery_fee: parseFloat(formData.deliveryFee) || 0,
      };
    }

    console.log("Registration data being sent:", { 
      ...registrationData, 
      password: '***', 
      password_confirm: '***' 
    });

    const result = await register(registrationData);
      
      if (result.success) {
        setUiState({ status: 'success', fieldErrors: {} });
        
        const successMessage = isVendorType 
          ? "Vendor account created successfully! Setting up your dashboard..." 
          : "Account created successfully! Welcome to Zeno Services.";
        
        toast.success(successMessage);
        
        // Determine redirect path
        let redirectPath = '/dashboard';
        if (result.redirectPath) {
          redirectPath = result.redirectPath;
        } else if (isVendorType) {
          redirectPath = '/vendor/dashboard';
        }

        // Small delay to show success message before redirect
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 2000);
        
      } else {
        // Handle different error types
        const error = result.error;
        
        const fieldErrors: Record<string, string> = {};
        
        if (error?.field_errors) {
          Object.entries(error.field_errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[field] = messages[0];
            }
          });
        } else if (error?.message) {
          toast.error(error.message);
        } else {
          toast.error("Registration failed. Please try again.");
        }
        
        setUiState({ status: 'error', fieldErrors });
      }
    } catch (error: any) {
      console.error("Registration catch error:", error);
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.field_errors) {
          const fieldErrors = errorData.field_errors;
          const firstErrorKey = Object.keys(fieldErrors)[0];
          const firstError = fieldErrors[firstErrorKey];
          errorMessage = `${firstErrorKey}: ${Array.isArray(firstError) ? firstError[0] : firstError}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setUiState({ status: 'error', fieldErrors: {} });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    // Auto-fill contact number with phone number for vendors if contact number is empty
    if (name === 'phoneNumber' && isVendorType && !formData.contactNumber) {
      setFormData(prev => ({
        ...prev,
        contactNumber: value
      }));
    }

    // Auto-fill business city with location if empty
    if (name === 'businessCity' && !formData.businessCity) {
      setFormData(prev => ({
        ...prev,
        businessCity: value
      }));
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  // Auto-format phone number for better UX
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
      return '+' + cleaned;
    }
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      phoneNumber: formattedValue,
    }));
    handleFieldBlur('phoneNumber');
  };

  // Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const
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
      damping: 20
    }
  }
};

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                currentStep >= step
                  ? "bg-gradient-to-r from-secondary to-primary border-transparent text-white shadow-lg"
                  : "bg-white border-gray-300 text-gray-500"
              }`}
            >
              {step}
            </div>
            {step < 2 && (
              <div
                className={`w-16 h-1 mx-2 transition-all duration-300 ${
                  currentStep > step ? "bg-gradient-to-r from-secondary to-primary" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <motion.div
      key="step-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            First Name *
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              name="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={() => handleFieldBlur('firstName')}
              className={`pl-10 h-12 ${
                uiState.fieldErrors.firstName && touchedFields.has('firstName') 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-secondary'
              }`}
              required
            />
            <AnimatePresence>
              {uiState.fieldErrors.firstName && touchedFields.has('firstName') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {uiState.fieldErrors.firstName && touchedFields.has('firstName') && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-600 flex items-center space-x-1"
              >
                <AlertCircle className="h-3 w-3" />
                <span>{uiState.fieldErrors.firstName}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Name *
          </Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={() => handleFieldBlur('lastName')}
            className={`h-12 ${
              uiState.fieldErrors.lastName && touchedFields.has('lastName') 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-secondary'
            }`}
            required
          />
          <AnimatePresence>
            {uiState.fieldErrors.lastName && touchedFields.has('lastName') && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-600 flex items-center space-x-1"
              >
                <AlertCircle className="h-3 w-3" />
                <span>{uiState.fieldErrors.lastName}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Phone Number *
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            placeholder="+254712345678"
            value={formData.phoneNumber}
            onChange={handlePhoneChange}
            onBlur={() => handleFieldBlur('phoneNumber')}
            className={`pl-10 h-12 ${
              uiState.fieldErrors.phoneNumber && touchedFields.has('phoneNumber') 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-secondary'
            }`}
            required
          />
          <AnimatePresence>
            {uiState.fieldErrors.phoneNumber && touchedFields.has('phoneNumber') && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {uiState.fieldErrors.phoneNumber && touchedFields.has('phoneNumber') && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{uiState.fieldErrors.phoneNumber}</span>
            </motion.p>
          )}
        </AnimatePresence>
        <p className="text-xs text-muted-foreground">
          Include country code. This will be your login ID.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="userType" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Account Type *
        </Label>
        <select
          id="userType"
          name="userType"
          value={formData.userType}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary text-gray-900 bg-white transition-all duration-200"
        >
          <option value="customer">Customer</option>
          <option value="vendor">Service Vendor</option>
          <option value="mechanic">Mechanic</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {formData.userType === "vendor" || formData.userType === "mechanic" 
            ? "You'll be able to offer services and manage your business through our vendor dashboard."
            : "Browse services, book appointments, and get roadside assistance."}
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password *
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create password (min. 6 characters)"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleFieldBlur('password')}
            className={`pl-10 pr-12 h-12 ${
              uiState.fieldErrors.password && touchedFields.has('password') 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-secondary'
            }`}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <AnimatePresence>
          {uiState.fieldErrors.password && touchedFields.has('password') && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{uiState.fieldErrors.password}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Confirm Password *
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleFieldBlur('confirmPassword')}
            className={`pl-10 pr-12 h-12 ${
              uiState.fieldErrors.confirmPassword && touchedFields.has('confirmPassword') 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-secondary'
            }`}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <AnimatePresence>
          {uiState.fieldErrors.confirmPassword && touchedFields.has('confirmPassword') && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{uiState.fieldErrors.confirmPassword}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Button 
        type="button"
        onClick={nextStep}
        className="w-full h-12 bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
        size="lg"
      >
        Continue to {isVendorType ? "Business Details" : "Complete Registration"}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="space-y-6"
    >
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success-state"
            variants={successVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-8 space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              {isVendorType ? "Vendor Account Created!" : "Account Created!"}
            </h3>
            <p className="text-muted-foreground">
              {isVendorType 
                ? "Setting up your vendor dashboard..." 
                : "Welcome to Zeno Services! Redirecting..."
              }
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
            </div>
          </motion.div>
        ) : isVendorType ? (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="businessName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Business Name *
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="businessName"
                  name="businessName"
                  placeholder="Your Business Name"
                  value={formData.businessName}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur('businessName')}
                  className={`pl-10 h-12 ${
                    uiState.fieldErrors.businessName && touchedFields.has('businessName') 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-secondary'
                  }`}
                  required
                />
                <AnimatePresence>
                  {uiState.fieldErrors.businessName && touchedFields.has('businessName') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {uiState.fieldErrors.businessName && touchedFields.has('businessName') && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-600 flex items-center space-x-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    <span>{uiState.fieldErrors.businessName}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Other vendor fields with similar enhanced styling... */}
            {/* Business Type, Description, Address, etc. */}

            <div className="flex space-x-3">
              <Button 
                type="button"
                onClick={prevStep}
                variant="outline"
                className="flex-1 h-12 border-2"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                type="submit"
                className="flex-1 h-12 bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none"
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
                      <span>Creating Vendor Account...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="submit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Complete Vendor Registration
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Ready to Get Started!</h3>
            <p className="text-muted-foreground">
              You're all set! Complete your registration to start using Zeno Services.
            </p>
            <div className="flex space-x-3">
              <Button 
                type="button"
                onClick={prevStep}
                variant="outline"
                className="flex-1 h-12 border-2"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                type="submit"
                className="flex-1 h-12 bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none"
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
                      <span>Creating Account...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="submit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Complete Registration
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4 md:p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl"
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
                {isVendorType ? "Vendor Registration" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-base mt-3 text-gray-600 dark:text-gray-300">
                {isVendorType 
                  ? "Join our network of trusted service providers"
                  : "Join thousands of users trusting ZENO services"
                }
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="pb-8 px-8">
            {isVendorType && renderStepIndicator()}
            <form onSubmit={handleRegister}>
              <AnimatePresence mode="wait">
                {currentStep === 1 ? renderStep1() : renderStep2()}
              </AnimatePresence>
            </form>
          </CardContent>
          
          <div className="px-8 pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-sm"
            >
              <span className="text-muted-foreground">Already have an account? </span>
              <Link 
                to="/login" 
                className="text-secondary hover:text-secondary/80 hover:underline font-semibold transition-colors"
              >
                Login
              </Link>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;