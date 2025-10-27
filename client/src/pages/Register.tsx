// src/pages/Register.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, User, ChevronRight, Building, MapPin, Mail, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Define local types to fix the TypeScript errors
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
    businessType: "gas_station", // ✅ FIXED: Changed default to backend value
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

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const isVendorType = formData.userType === "vendor" || formData.userType === "mechanic";

  // ✅ FIXED: Updated business types to match backend expectations
  const businessTypes = [
    { value: "gas_station", label: "Gas Services & Delivery" }, // ✅ FIXED: gas_station instead of gas_services
    { value: "mechanic", label: "Auto Repair & Maintenance" }, // ✅ FIXED: mechanic instead of auto_repair
    { value: "roadside_assistance", label: "Roadside Assistance" }, // ✅ FIXED: matches backend
    { value: "mechanic", label: "Tire Services" }, // ✅ FIXED: mechanic instead of tire_services
    { value: "mechanic", label: "Battery Services" }, // ✅ FIXED: mechanic instead of battery_services
    { value: "mechanic", label: "General Mechanic" }, // ✅ FIXED: matches backend
    { value: "mechanic", label: "Other Services" }, // ✅ FIXED: mechanic instead of other
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number format
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error("Please enter a valid phone number with country code");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    // Validate vendor-specific fields if applicable
    if (isVendorType) {
      if (!formData.businessName.trim()) {
        toast.error("Business name is required for vendors");
        return;
      }
      if (!formData.businessAddress.trim()) {
        toast.error("Business address is required for vendors");
        return;
      }
      if (!formData.businessCity.trim()) {
        toast.error("Business city is required for vendors");
        return;
      }
      if (!formData.contactNumber.trim()) {
        toast.error("Contact number is required for vendors");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Prepare registration data according to backend expectations
      const registrationData: any = {
        email: formData.businessEmail || `${formData.phoneNumber}@zenoservices.com`, // Provide fallback email
        username: formData.phoneNumber, // Use phone as username
        password: formData.password,
        password_confirm: formData.confirmPassword,
        user_type: formData.userType,
        phone_number: formData.phoneNumber,
        location: formData.businessCity || "Nairobi", // Provide default location
        first_name: formData.firstName,
        last_name: formData.lastName,
        preferred_otp_channel: "whatsapp" // Default to whatsapp for better UX
      };

      // Add vendor-specific data if registering as vendor/mechanic
      if (isVendorType) {
        registrationData.vendor_data = {
          business_name: formData.businessName,
          business_type: formData.businessType, // ✅ FIXED: Now sends correct backend values
          description: formData.businessDescription || `Professional ${getBusinessTypeLabel(formData.businessType)} services`,
          address: formData.businessAddress,
          city: formData.businessCity,
          country: formData.businessCountry,
          contact_number: formData.contactNumber || formData.phoneNumber,
          email: formData.businessEmail || `${formData.phoneNumber}@zenoservices.com`,
          website: formData.businessWebsite || "",
          delivery_radius_km: parseInt(formData.deliveryRadius) || 10,
          min_order_amount: parseFloat(formData.minOrderAmount) || 0,
          delivery_fee: parseFloat(formData.deliveryFee) || 0,
        };
      }

      console.log("Registration data being sent:", registrationData);

      const result = await register(registrationData) as RegisterResponse;
      
      if (result.success) {
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
        } else {
          redirectPath = '/dashboard';
        }

        console.log("Registration successful, redirecting to:", redirectPath);
        
        // Small delay to show success message before redirect
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1500);
        
      } else {
        // Handle different error types
        const error = result.error;
        console.error("Registration error details:", error);
        
        if (error?.field_errors) {
          // Handle field-specific errors
          const fieldErrors = error.field_errors;
          
          if (fieldErrors.phone_number) {
            toast.error(`Phone number: ${fieldErrors.phone_number[0]}`);
          } else if (fieldErrors.email) {
            toast.error(`Email: ${fieldErrors.email[0]}`);
          } else if (fieldErrors.username) {
            toast.error(`Username: ${fieldErrors.username[0]}`);
          } else if (fieldErrors.password) {
            toast.error(`Password: ${fieldErrors.password[0]}`);
          } else if (fieldErrors.vendor_data) {
            // ✅ FIXED: Better handling of nested vendor_data errors
            if (typeof fieldErrors.vendor_data === 'string') {
              toast.error(fieldErrors.vendor_data);
            } else if (Array.isArray(fieldErrors.vendor_data)) {
              // Handle array of vendor_data errors
              fieldErrors.vendor_data.forEach((errorMsg: string) => {
                toast.error(`Vendor data: ${errorMsg}`);
              });
            } else if (typeof fieldErrors.vendor_data === 'object') {
              // Handle nested vendor_data field errors (e.g., vendor_data.business_type)
              Object.keys(fieldErrors.vendor_data).forEach(field => {
                const fieldError = fieldErrors.vendor_data[field];
                if (Array.isArray(fieldError)) {
                  fieldError.forEach((errorMsg: string) => {
                    toast.error(`${field}: ${errorMsg}`);
                  });
                } else {
                  toast.error(`${field}: ${fieldError}`);
                }
              });
            } else {
              toast.error("Please check your business information");
            }
          } else {
            // Show first field error found
            const firstErrorKey = Object.keys(fieldErrors)[0];
            const firstError = fieldErrors[firstErrorKey];
            if (Array.isArray(firstError)) {
              toast.error(`${firstErrorKey}: ${firstError[0]}`);
            } else {
              toast.error(String(firstError));
            }
          }
        } else if (error?.message) {
          // Handle general error message
          toast.error(error.message);
        } else {
          toast.error("Registration failed. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("Registration catch error:", error);
      
      // Handle network errors or unexpected errors
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.field_errors) {
          const fieldErrors = errorData.field_errors;
          const firstErrorKey = Object.keys(fieldErrors)[0];
          const firstError = fieldErrors[firstErrorKey];
          
          if (Array.isArray(firstError)) {
            toast.error(`${firstErrorKey}: ${firstError[0]}`);
          } else {
            toast.error(String(firstError));
          }
        } else if (errorData.message) {
          toast.error(errorData.message);
        } else if (errorData.detail) {
          toast.error(errorData.detail);
        } else {
          toast.error("Registration failed. Please check your information.");
        }
      } else if (error.message) {
        toast.error(error.message);
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: Helper function to get business type label for description
  const getBusinessTypeLabel = (businessType: string): string => {
    const businessTypeMap: Record<string, string> = {
      'gas_station': 'gas services',
      'mechanic': 'mechanic',
      'roadside_assistance': 'roadside assistance'
    };
    return businessTypeMap[businessType] || 'services';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

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
    // Validate step 1 before proceeding
    if (currentStep === 1) {
      if (!formData.firstName.trim()) {
        toast.error("First name is required");
        return;
      }
      if (!formData.lastName.trim()) {
        toast.error("Last name is required");
        return;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error("Phone number is required");
        return;
      }
      
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        toast.error("Please enter a valid phone number");
        return;
      }
      
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {[1, 2].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step
                  ? "bg-secondary text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step}
            </div>
            {step < 2 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  currentStep > step ? "bg-secondary" : "bg-gray-200"
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              name="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            placeholder="+254712345678"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="pl-10"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Include country code. This will be your login ID.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="userType">Account Type *</Label>
        <select
          id="userType"
          name="userType"
          value={formData.userType}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-gray-900"
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

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create password (min. 6 characters)"
            value={formData.password}
            onChange={handleChange}
            className="pl-10"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="pl-10"
            required
            minLength={6}
          />
        </div>
      </div>

      <Button 
        type="button"
        onClick={nextStep}
        className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold"
        size="lg"
      >
        Continue to {isVendorType ? "Business Details" : "Complete Registration"}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {isVendorType ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessName"
                name="businessName"
                placeholder="Your Business Name"
                value={formData.businessName}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type *</Label>
            <select
              id="businessType"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-gray-900"
            >
              {businessTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Select the category that best describes your business
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessDescription">Business Description</Label>
            <textarea
              id="businessDescription"
              name="businessDescription"
              placeholder="Briefly describe your services..."
              value={formData.businessDescription}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessAddress"
                name="businessAddress"
                placeholder="Street address, area"
                value={formData.businessAddress}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessCity">City *</Label>
              <Input
                id="businessCity"
                name="businessCity"
                placeholder="Nairobi"
                value={formData.businessCity}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessCountry">Country</Label>
              <Input
                id="businessCountry"
                name="businessCountry"
                value={formData.businessCountry}
                onChange={handleChange}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Business Contact Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="contactNumber"
                name="contactNumber"
                type="tel"
                placeholder="+254712345678"
                value={formData.contactNumber}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be displayed to customers for business inquiries
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessEmail">Business Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessEmail"
                name="businessEmail"
                type="email"
                placeholder="business@example.com"
                value={formData.businessEmail}
                onChange={handleChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessWebsite">Website (Optional)</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessWebsite"
                name="businessWebsite"
                type="url"
                placeholder="https://yourbusiness.com"
                value={formData.businessWebsite}
                onChange={handleChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryRadius">Delivery Radius (km)</Label>
              <Input
                id="deliveryRadius"
                name="deliveryRadius"
                type="number"
                min="1"
                max="50"
                value={formData.deliveryRadius}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Min Order (KES)</Label>
              <Input
                id="minOrderAmount"
                name="minOrderAmount"
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Delivery Fee (KES)</Label>
              <Input
                id="deliveryFee"
                name="deliveryFee"
                type="number"
                min="0"
                value={formData.deliveryFee}
                onChange={handleChange}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ready to Get Started!</h3>
          <p className="text-muted-foreground mb-6">
            You're all set! Click the button below to complete your registration and start using Zeno Services.
          </p>
        </div>
      )}

      <div className="flex space-x-3">
        {currentStep > 1 && (
          <Button 
            type="button"
            onClick={prevStep}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Back
          </Button>
        )}
        <Button 
          type="submit"
          className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-semibold"
          size="lg"
          disabled={isLoading}
        >
          {isLoading 
            ? (isVendorType ? "Creating Vendor Account..." : "Creating Account...")
            : (isVendorType ? "Complete Vendor Registration" : "Complete Registration")
          }
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-primary">ZENO</h1>
              <p className="text-sm text-muted-foreground">Services You Can Count On</p>
            </div>
            <CardTitle className="text-2xl">
              {isVendorType ? "Vendor Registration" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isVendorType 
                ? "Join our network of trusted service providers"
                : "Join thousands of users trusting ZENO services"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isVendorType && renderStepIndicator()}
            <form onSubmit={handleRegister}>
              <AnimatePresence mode="wait">
                {currentStep === 1 ? renderStep1() : renderStep2()}
              </AnimatePresence>
            </form>
          </CardContent>
          <div className="px-6 pb-6">
            <div className="text-center text-sm w-full">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-secondary hover:underline font-semibold">
                Login
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;