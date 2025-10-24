// src/pages/Register.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, User, ChevronRight, Shield, MessageCircle, PhoneCall, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Register = () => {
  const navigate = useNavigate();
  const { register, verifyOTP, resendOTP, requiresOTP, pendingUser } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    userType: "customer",
    preferred_otp_channel: "whatsapp"
  });

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpResent, setOtpResent] = useState(false);
  const [selectedOTPChannel, setSelectedOTPChannel] = useState("whatsapp");

  const OTP_CHANNELS = [
    { value: "voice", label: "Voice Call", icon: PhoneCall, description: "Get OTP via voice call" },
    { value: "sms", label: "SMS", icon: MessageCircle, description: "Get OTP via text message" },
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

    setIsLoading(true);

    try {
      const registrationData = {
        email: "",
        username: formData.phoneNumber,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        user_type: formData.userType,
        phone_number: formData.phoneNumber,
        location: "",
        first_name: formData.firstName,
        last_name: formData.lastName,
        preferred_otp_channel: formData.preferred_otp_channel
      };

      const result = await register(registrationData);
      
      if (result.success) {
        if (result.requiresOTP) {
          const channelUsed = result.preferredChannelUsed || formData.preferred_otp_channel;
          const channelName = OTP_CHANNELS.find(c => c.value === channelUsed)?.label || channelUsed;
          toast.success(`Registration successful! OTP sent via ${channelName}. Please verify your phone number.`);
        } else {
          toast.success("Registration successful!");
          navigate("/dashboard");
        }
      } else {
        if (result.error?.phone_number) {
          toast.error(result.error.phone_number[0]);
        } else if (result.error?.username) {
          toast.error(result.error.username[0]);
        } else {
          toast.error(result.error?.message || "Registration failed");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyOTP(pendingUser?.phone_number || formData.phoneNumber, otp);
      
      if (result.success) {
        toast.success("Phone number verified successfully!");
        navigate("/dashboard");
      } else {
        toast.error(result.error?.message || "OTP verification failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async (preferredChannel?: string) => {
    setIsLoading(true);
    
    try {
      const result = await resendOTP(
        pendingUser?.phone_number || formData.phoneNumber, 
        preferredChannel || selectedOTPChannel
      );
      
      if (result.success) {
        const channelUsed = result.channelUsed || preferredChannel || selectedOTPChannel;
        const channelName = OTP_CHANNELS.find(c => c.value === channelUsed)?.label || channelUsed;
        toast.success(`OTP sent via ${channelName}!`);
        setOtpResent(true);
        setTimeout(() => setOtpResent(false), 30000);
      } else {
        toast.error(result.error?.message || "Failed to resend OTP");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getChannelDisplayName = (channel: string) => {
    return OTP_CHANNELS.find(c => c.value === channel)?.label || channel;
  };

  // OTP Verification Form
  if (requiresOTP && pendingUser) {
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
              <CardTitle className="text-2xl">Verify Phone Number</CardTitle>
              <CardDescription>
                Enter the 6-digit OTP sent to {pendingUser.phone_number}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 text-center text-lg font-mono"
                      maxLength={6}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code sent to your phone
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold"
                  size="lg"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>

                {/* OTP Channel Selection for Resend */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Resend via:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {OTP_CHANNELS.map((channel) => (
                      <Button
                        key={channel.value}
                        type="button"
                        variant={selectedOTPChannel === channel.value ? "default" : "outline"}
                        onClick={() => {
                          setSelectedOTPChannel(channel.value);
                          handleResendOTP(channel.value);
                        }}
                        disabled={isLoading || otpResent}
                        className="flex flex-col items-center h-auto py-2 px-1 text-xs"
                        size="sm"
                      >
                        <channel.icon className="h-4 w-4 mb-1" />
                        <span>{channel.label}</span>
                      </Button>
                    ))}
                  </div>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => handleResendOTP()}
                      disabled={isLoading || otpResent}
                      className="text-secondary text-xs"
                    >
                      {otpResent ? `Resend available in 30s` : "Resend with current method"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
            <div className="px-6 pb-6">
              <div className="text-center text-sm w-full">
                <span className="text-muted-foreground">Wrong number? </span>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => window.location.reload()}
                  className="text-secondary hover:underline font-semibold p-0 h-auto"
                >
                  Go back
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Main Registration Form
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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Join thousands of users trusting ZENO services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
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
                  <Label htmlFor="lastName">Last Name</Label>
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
                <Label htmlFor="phoneNumber">Phone Number</Label>
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
                <Label htmlFor="userType">Account Type</Label>
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
              </div>

              {/* OTP Channel Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Preferred OTP Method</Label>
                <div className="grid grid-cols-1 gap-2">
                  {OTP_CHANNELS.map((channel) => (
                    <div
                      key={channel.value}
                      onClick={() => setFormData(prev => ({ ...prev, preferred_otp_channel: channel.value }))}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.preferred_otp_channel === channel.value
                          ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          formData.preferred_otp_channel === channel.value
                            ? 'border-secondary bg-secondary'
                            : 'border-gray-400'
                        }`}>
                          {formData.preferred_otp_channel === channel.value && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-1">
                          <channel.icon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">{channel.label}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-8">{channel.description}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be your preferred method for receiving verification codes.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
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