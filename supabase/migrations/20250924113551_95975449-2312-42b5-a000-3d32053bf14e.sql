-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin', 'mechanic')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('gas', 'roadside', 'oxygen')),
  location JSONB,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  address TEXT,
  contact_phone VARCHAR(20),
  rating DECIMAL(3, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gas', 'roadside', 'oxygen')),
  type TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  availability BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id),
  vendor_id UUID REFERENCES public.vendors(id),
  service_id UUID REFERENCES public.services(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  total_amount DECIMAL(10, 2),
  delivery_location JSONB,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'mpesa',
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Vendors policies
CREATE POLICY "Vendors are viewable by everyone" 
ON public.vendors FOR SELECT 
USING (true);

CREATE POLICY "Vendors can update their own vendor profile" 
ON public.vendors FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = vendors.profile_id 
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Vendors can insert their vendor profile" 
ON public.vendors FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = profile_id 
  AND profiles.user_id = auth.uid()
));

-- Services policies
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT 
USING (true);

CREATE POLICY "Vendors can manage their own services" 
ON public.services FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.vendors v
  JOIN public.profiles p ON p.id = v.profile_id
  WHERE v.id = services.vendor_id 
  AND p.user_id = auth.uid()
));

-- Orders policies
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (
  customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  vendor_id IN (SELECT v.id FROM public.vendors v JOIN public.profiles p ON p.id = v.profile_id WHERE p.user_id = auth.uid())
);

CREATE POLICY "Users can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own orders" 
ON public.orders FOR UPDATE 
USING (
  customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  vendor_id IN (SELECT v.id FROM public.vendors v JOIN public.profiles p ON p.id = v.profile_id WHERE p.user_id = auth.uid())
);

-- Payments policies
CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can create payments for their orders" 
ON public.payments FOR INSERT 
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- OTP policies (public for registration)
CREATE POLICY "OTP can be created by anyone" 
ON public.otp_verifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "OTP can be verified by anyone" 
ON public.otp_verifications FOR UPDATE 
USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_vendors_location ON public.vendors(lat, lng);
CREATE INDEX idx_vendors_business_type ON public.vendors(business_type);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_otp_phone ON public.otp_verifications(phone);