import { useEffect, useRef } from 'react';
import type { Pole } from '../../types';

interface MapViewProps {
  poles: Pole[];
  selectedPoleId: string | null;
  onSelectPole: (id: string) => void;
}

export function MapView({ poles, selectedPoleId, onSelectPole }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<Map<string, import('leaflet').CircleMarker>>(new Map());

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const L = (window as unknown as { L: typeof import('leaflet') }).L;
    if (!L) return;

    const center = poles.length > 0
      ? [poles[Math.floor(poles.length / 2)].location.lat, poles[Math.floor(poles.length / 2)].location.lng] as [number, number]
      : [37.651, -97.329] as [number, number];

    const map = L.map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 20,
    }).addTo(map);

    leafletMapRef.current = map;

    poles.forEach(pole => {
      const results = pole.validationResults ?? [];
      const hasFail = results.some(r => r.status === 'fail');
      const hasWarn = results.some(r => r.status === 'warning');
      const isSelected = pole.id === selectedPoleId;

      const color = hasFail ? '#ef4444' : hasWarn ? '#f59e0b' : '#22c55e';
      const marker = L.circleMarker(
        [pole.location.lat, pole.location.lng],
        {
          radius: isSelected ? 10 : 7,
          fillColor: color,
          color: isSelected ? '#ffffff' : color,
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          fillOpacity: isSelected ? 1 : 0.85,
        }
      ).addTo(map);

      marker.bindTooltip(pole.poleNumber, {
        permanent: false,
        direction: 'top',
        className: 'text-xs font-semibold',
      });

      marker.on('click', () => onSelectPole(pole.id));
      markersRef.current.set(pole.id, marker);
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const L = (window as unknown as { L: typeof import('leaflet') }).L;
    if (!L || !leafletMapRef.current) return;

    markersRef.current.forEach((marker, poleId) => {
      const pole = poles.find(p => p.id === poleId);
      if (!pole) return;
      const results = pole.validationResults ?? [];
      const hasFail = results.some(r => r.status === 'fail');
      const hasWarn = results.some(r => r.status === 'warning');
      const isSelected = poleId === selectedPoleId;
      const color = hasFail ? '#ef4444' : hasWarn ? '#f59e0b' : '#22c55e';

      marker.setStyle({
        radius: isSelected ? 10 : 7,
        fillColor: color,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 3 : 1.5,
        fillOpacity: isSelected ? 1 : 0.85,
      });
    });
  }, [selectedPoleId, poles]);

  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />
    </div>
  );
}
