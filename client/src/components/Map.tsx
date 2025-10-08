import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Provider {
  id: number;
  name: string;
  location: string;
  coords: [number, number];
  price: string;
}

interface MapProps {
  providers?: Provider[];
  center?: [number, number];
  userLocation?: [number, number]; // now optional
}

const Map = ({
  providers = [],
  center = [36.8219, -1.2921], // [lng, lat] (Nairobi default)
  userLocation,
}: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(
    userLocation || null
  );
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

    if (!mapContainer.current) return;

    try {
      // Initialize Map
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: userCoords || center,
        zoom: 13,
      });

      mapRef.current = map;

      // Add controls
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Detect user location
      if (!userCoords) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const coords: [number, number] = [longitude, latitude];
            setUserCoords(coords);
            map.flyTo({ center: coords, zoom: 14 });

            // Add user marker
            new mapboxgl.Marker({ color: "blue" })
              .setLngLat(coords)
              .setPopup(new mapboxgl.Popup().setText("You are here"))
              .addTo(map);
          },
          (err) => {
            console.warn("Geolocation error:", err);
          },
          { enableHighAccuracy: true }
        );
      } else {
        new mapboxgl.Marker({ color: "blue" })
          .setLngLat(userCoords)
          .setPopup(new mapboxgl.Popup().setText("You are here"))
          .addTo(map);
      }

      // Add provider markers
      providers.forEach((provider) => {
        const marker = new mapboxgl.Marker({ color: "red" })
          .setLngLat(provider.coords)
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <div>
                <strong>${provider.name}</strong><br />
                ${provider.location}<br />
                ${provider.price ? `<em>${provider.price}</em>` : ""}
              </div>
            `)
          )
          .addTo(map);
      });

      return () => map.remove();
    } catch (error) {
      console.error("Mapbox init error:", error);
      setMapError(true);
    }
  }, [providers, userCoords]);

  if (mapError) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">⚠️ Map could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
