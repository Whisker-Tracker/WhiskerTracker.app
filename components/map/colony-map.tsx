"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, LatLngTuple, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { AlertTriangle, Cat, Clock3, MapPin } from "lucide-react";

import { Card, CardText, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ColonyMapItem {
  id: string;
  name: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  description?: string | null;
  photoUrl?: string | null;
  catCount: number;
  eartippedCount: number;
  tnrCounts: {
    unaltered: number;
    trapped: number;
    neutered_spayed: number;
    eartipped: number;
  };
  lastFedAt: string | null;
}

type ColonyMapLabels = {
  locationNotNamed: string;
  tapPinHint: string;
  tnrDistribution: string;
  lastFed: string;
  noRecentLogs: string;
  catsTracked: string;
  statusUnaltered: string;
  statusTrapped: string;
  statusNeuteredSpayed: string;
  statusEartipped: string;
};

const defaultLabels: ColonyMapLabels = {
  locationNotNamed: "Location not named",
  tapPinHint: "Tap a colony pin to open quick stats.",
  tnrDistribution: "TNR distribution",
  lastFed: "Last fed",
  noRecentLogs: "No recent logs",
  catsTracked: "Cats tracked",
  statusUnaltered: "Unaltered",
  statusTrapped: "Trapped",
  statusNeuteredSpayed: "Neutered/Spayed",
  statusEartipped: "Eartipped",
};

const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const defaultCenter: LatLngTuple = [40.73061, -73.935242];

function FitMapToColonies({ colonies }: Readonly<{ colonies: ColonyMapItem[] }>) {
  const map = useMap();

  useEffect(() => {
    if (colonies.length === 0) {
      map.setView(defaultCenter, 12);
      return;
    }

    if (colonies.length === 1) {
      map.setView([colonies[0].latitude, colonies[0].longitude], 15);
      return;
    }

    const bounds = latLngBounds(colonies.map((colony) => [colony.latitude, colony.longitude] as LatLngTuple));
    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [colonies, map]);

  return null;
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ColonyMap({
  colonies,
  labels,
}: Readonly<{
  colonies: ColonyMapItem[];
  labels?: Partial<ColonyMapLabels>;
}>) {
  const text = {
    ...defaultLabels,
    ...labels,
  };

  const [selectedColonyId, setSelectedColonyId] = useState<string | null>(null);

  const center = useMemo<LatLngTuple>(() => {
    if (!colonies.length) return defaultCenter;
    return [colonies[0].latitude, colonies[0].longitude];
  }, [colonies]);

  const selected = colonies.find((item) => item.id === selectedColonyId) ?? null;
  const donutSegments = useMemo(() => {
    if (!selected) {
      return [] as Array<{ key: string; label: string; value: number; color: string }>;
    }

    return [
      {
        key: "unaltered",
        label: text.statusUnaltered,
        value: selected.tnrCounts.unaltered,
        color: "#64748b",
      },
      {
        key: "trapped",
        label: text.statusTrapped,
        value: selected.tnrCounts.trapped,
        color: "#f59e0b",
      },
      {
        key: "neutered_spayed",
        label: text.statusNeuteredSpayed,
        value: selected.tnrCounts.neutered_spayed,
        color: "#06b6d4",
      },
      {
        key: "eartipped",
        label: text.statusEartipped,
        value: selected.tnrCounts.eartipped,
        color: "#0d9488",
      },
    ];
  }, [selected, text.statusEartipped, text.statusNeuteredSpayed, text.statusTrapped, text.statusUnaltered]);

  const donutBackground = useMemo(() => {
    if (!selected || selected.catCount <= 0) {
      return "conic-gradient(#e2e8f0 0% 100%)";
    }

    let cursor = 0;
    const parts: string[] = [];

    for (const segment of donutSegments) {
      if (segment.value <= 0) {
        continue;
      }

      const start = (cursor / selected.catCount) * 100;
      cursor += segment.value;
      const end = (cursor / selected.catCount) * 100;
      parts.push(`${segment.color} ${start}% ${end}%`);
    }

    return parts.length > 0 ? `conic-gradient(${parts.join(", ")})` : "conic-gradient(#e2e8f0 0% 100%)";
  }, [donutSegments, selected]);

  const formattedLastFed = formatDate(selected?.lastFedAt ?? null);

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <MapContainer center={center} zoom={12} className="h-[420px] w-full">
          <FitMapToColonies colonies={colonies} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {colonies.map((colony) => (
            <Marker
              key={colony.id}
              icon={markerIcon}
              position={[colony.latitude, colony.longitude]}
              eventHandlers={{
                click: () => setSelectedColonyId(colony.id),
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">{colony.name}</p>
                  <p className="text-xs text-slate-600">{colony.locationName ?? text.locationNotNamed}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <Card
        className={cn(
          "min-h-[220px] transition",
          selected ? "opacity-100" : "opacity-80",
        )}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{selected.name}</CardTitle>
                <CardText className="mt-1">{selected.locationName ?? text.locationNotNamed}</CardText>
              </div>
              <MapPin className="h-5 w-5 text-teal-700" />
            </div>

            <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-center">
              <div className="mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background: donutBackground }}>
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                  <p className="text-xl font-semibold text-slate-900">{selected.catCount}</p>
                  <p className="text-[11px] text-slate-500">{text.catsTracked}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-700">
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  {text.tnrDistribution}
                </p>
                <div className="grid gap-1">
                  {donutSegments.map((segment) => (
                    <p key={segment.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                        {segment.label}
                      </span>
                      <span className="font-semibold text-slate-800">{segment.value}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Cat className="h-4 w-4 text-teal-700" />
                {selected.catCount} {text.catsTracked}
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-500" />
                {text.lastFed}: {formattedLastFed ?? text.noRecentLogs}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center">
            <p className="text-sm text-slate-500">{text.tapPinHint}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
