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
    const supabaseAnonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const path = url.pathname.replace('/services/', '');
    const searchParams = url.searchParams;

    switch (path) {
      case 'gas': {
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const radius = searchParams.get('radius') || '10';

        let query = supabase
          .from('vendors')
          .select(`
            *,
            services(*)
          `)
          .eq('business_type', 'gas')
          .eq('is_active', true);

        // If location is provided, we can filter by distance (simplified for now)
        // In production, you'd use PostGIS for proper distance calculations
        if (lat && lng) {
          const minLat = parseFloat(lat) - parseFloat(radius) / 111;
          const maxLat = parseFloat(lat) + parseFloat(radius) / 111;
          const minLng = parseFloat(lng) - parseFloat(radius) / 111;
          const maxLng = parseFloat(lng) + parseFloat(radius) / 111;

          query = query
            .gte('lat', minLat)
            .lte('lat', maxLat)
            .gte('lng', minLng)
            .lte('lng', maxLng);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify(data || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'roadside': {
        const type = searchParams.get('type');
        
        let query = supabase
          .from('vendors')
          .select(`
            *,
            services(*)
          `)
          .eq('business_type', 'roadside')
          .eq('is_active', true);

        if (type) {
          query = query.contains('services.type', [type]);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify(data || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'oxygen': {
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        let query = supabase
          .from('vendors')
          .select(`
            *,
            services(*)
          `)
          .eq('business_type', 'oxygen')
          .eq('is_active', true);

        // Similar location filtering as gas services
        if (lat && lng) {
          const radius = 10; // Default 10km radius for oxygen services
          const minLat = parseFloat(lat) - radius / 111;
          const maxLat = parseFloat(lat) + radius / 111;
          const minLng = parseFloat(lng) - radius / 111;
          const maxLng = parseFloat(lng) + radius / 111;

          query = query
            .gte('lat', minLat)
            .lte('lat', maxLat)
            .gte('lng', minLng)
            .lte('lng', maxLng);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify(data || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Service type not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in services function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});