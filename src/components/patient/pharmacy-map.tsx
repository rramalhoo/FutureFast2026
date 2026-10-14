"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

export type MapPharmacy = { id: string; name: string; lat: number; lng: number; available: boolean };

const pin = (color: string) =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 4px 10px rgba(47,26,61,.35)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

export default function PharmacyMap({ pharmacies, center }: { pharmacies: MapPharmacy[]; center: { lat: number; lng: number } | null }) {
  const first = pharmacies[0];
  const c = center ?? (first ? { lat: first.lat, lng: first.lng } : { lat: -23.5505, lng: -46.6333 });
  return (
    <MapContainer center={[c.lat, c.lng]} zoom={13} scrollWheelZoom={false} className="h-full w-full" aria-label="Mapa de farmácias">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {center ? (
        <Marker position={[center.lat, center.lng]} icon={pin("#3b7bd1")}>
          <Popup>Você está aqui</Popup>
        </Marker>
      ) : null}
      {pharmacies.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pin(p.available ? "#45ad59" : "#9448bd")}>
          <Popup>{p.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
