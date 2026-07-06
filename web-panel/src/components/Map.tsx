'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  altitude?: number | null;
  timestamp: string;
}

interface MapProps {
  locations: Location[];
  center?: [number, number];
}

export default function Map({ locations, center }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = center ?? [-23.5505, -46.6333];

    mapRef.current = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(defaultCenter, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return;

    const last = locations[locations.length - 1];
    const latlngs = locations.map((l) => [l.lat, l.lng] as [number, number]);

    if (markerRef.current) {
      markerRef.current.setLatLng([last.lat, last.lng]);
    } else {
      const icon = L.divIcon({
        html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.5)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current = L.marker([last.lat, last.lng], { icon }).addTo(map);
    }

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs);
    } else if (latlngs.length > 1) {
      polylineRef.current = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
      }).addTo(map);
    }

    map.setView([last.lat, last.lng], map.getZoom() || 15);
  }, [locations]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px]" />;
}
