import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/auth/', '');
    const body = await req.json();

    switch (path) {
      case 'login': {
        const { phone, password } = body;
        
        // Find user by phone
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .single();

        if (profileError || !profile) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profile.user_id);

        if (authError || !authData.user) {
          return new Response(
            JSON.stringify({ error: 'Authentication failed' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate session token
        const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: authData.user.email!,
          options: {
            redirectTo: `${url.origin}/dashboard`,
          },
        });

        return new Response(
          JSON.stringify({ 
            user: authData.user,
            profile,
            message: 'Login successful'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'register': {
        const { phone, password, firstName, lastName } = body;

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: `${phone}@zeno.app`,
          password,
          email_confirm: true,
          phone,
        });

        if (authError) {
          console.error('Auth error:', authError);
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            phone,
            first_name: firstName,
            last_name: lastName,
            role: 'customer'
          })
          .select()
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          // Clean up auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id);
          return new Response(
            JSON.stringify({ error: 'Failed to create profile' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            user: authData.user,
            profile,
            message: 'Registration successful'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify-otp': {
        const { phone, otp } = body;

        // Verify OTP
        const { data: otpRecord, error: otpError } = await supabase
          .from('otp_verifications')
          .select()
          .eq('phone', phone)
          .eq('otp', otp)
          .eq('verified', false)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (otpError || !otpRecord) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired OTP' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark OTP as verified
        await supabase
          .from('otp_verifications')
          .update({ verified: true })
          .eq('id', otpRecord.id);

        return new Response(
          JSON.stringify({ message: 'OTP verified successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'logout': {
        // Since we're using JWT, logout is handled client-side
        return new Response(
          JSON.stringify({ message: 'Logout successful' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in auth function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});