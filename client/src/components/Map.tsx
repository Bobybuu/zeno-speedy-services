import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface Provider {
  id: number;
  name: string;
  location: string;
  coords: [number, number];
  price?: string;
}

interface MapProps {
  providers?: Provider[];
  center?: [number, number];
}

const Map = ({ providers = [], center = [-1.2921, 36.8219] }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // For now, we'll create a placeholder map
    // In production, this would integrate with Mapbox GL JS
    if (!mapContainer.current) return;

    // Placeholder for map initialization
    const initMap = () => {
      // This is where Mapbox would be initialized
      console.log("Map initialized with providers:", providers);
    };

    initMap();
  }, [providers, center]);

  if (mapError) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Map requires API key</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Placeholder map with provider markers */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-4xl max-h-[600px] p-8">
          {/* Center marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <MapPin className="h-8 w-8 text-primary relative z-10" />
            </div>
          </div>
          
          {/* Provider markers */}
          {providers.map((provider, index) => {
            const angle = (index * 360) / providers.length;
            const radius = 120;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            return (
              <div
                key={provider.id}
                className="absolute top-1/2 left-1/2 z-10"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <div className="group cursor-pointer">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-secondary/30 rounded-full group-hover:bg-secondary/50 transition-colors" />
                    <span className="relative text-2xl">🔥</span>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap">
                      <p className="font-semibold">{provider.name}</p>
                      {provider.price && <p className="text-primary">{provider.price}</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Map overlay gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-white/10 to-transparent" />
    </div>
  );
};

export default Map;