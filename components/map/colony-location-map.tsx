"use client";

import { useEffect } from "react";
import { Icon, type LatLngTuple } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapCenterSync({
  onCenterChange,
}: Readonly<{
  onCenterChange?: (position: LatLngTuple) => void;
}>) {
  useMapEvents({
    moveend(event) {
      const center = event.target.getCenter();
      onCenterChange?.([center.lat, center.lng]);
    },
  });

  return null;
}

function RecenterMap({ position }: Readonly<{ position: LatLngTuple }>) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);

  return null;
}

export function ColonyLocationMap({
  position,
  onCenterChange,
  className = "h-[320px] w-full",
  interactive = false,
}: Readonly<{
  position: LatLngTuple;
  onCenterChange?: (position: LatLngTuple) => void;
  className?: string;
  interactive?: boolean;
}>) {
  return (
    <MapContainer center={position} zoom={13} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap position={position} />
      <MapCenterSync onCenterChange={onCenterChange} />
      <Marker icon={markerIcon} position={position} interactive={interactive} />
    </MapContainer>
  );
}
