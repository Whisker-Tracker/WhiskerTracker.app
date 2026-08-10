"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import type { LatLngTuple } from "leaflet";
import { Loader2, MapPin, PlusCircle, Search } from "lucide-react";

import { createColonyAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import messages_es from "@/messages/es.json";

const defaultCenter: LatLngTuple = [40.73061, -73.935242];

const ColonyLocationMap = dynamic(
  () => import("@/components/map/colony-location-map").then((mod) => mod.ColonyLocationMap),
  { ssr: false },
);

async function uploadColonyPhoto(file: File) {
  const supabase = createClient();
  const safeName = file.name.replace(/\s+/g, "-");
  const filePath = `colonies/${crypto.randomUUID()}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from("cat-photos").upload(filePath, file, {
    upsert: false,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("cat-photos").getPublicUrl(filePath);

  return publicUrl;
}

type GeocodeResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export function AddColonyForm() {
  const t = messages_es.addColonyForm;
  const common = messages_es.common;

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedPosition, setSelectedPosition] = useState<LatLngTuple>(defaultCenter);
  const [locationName, setLocationName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");

  const latitude = selectedPosition[0].toFixed(6);
  const longitude = selectedPosition[1].toFixed(6);

  const onCreateColony = (formData: FormData) => {
    startTransition(async () => {
      setSubmitError("");

      const photo = formData.get("photo");
      if (photo instanceof File && photo.size > 0) {
        try {
          const photoUrl = await uploadColonyPhoto(photo);
          formData.delete("photo");
          formData.append("photo_url", photoUrl);
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : t.uploadPhotoError);
          return;
        }
      }

      await createColonyAction(formData);
      setIsOpen(false);
      setSelectedPosition(defaultCenter);
      setLocationName("");
      setSearchQuery("");
      setSearchResults([]);
      setSearchError("");
    });
  };

  const searchPlaces = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(t.searchPlacesError);
      }

      const data = (await response.json()) as GeocodeResult[];
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError(t.noLocationsFound);
      }
    } catch {
      setSearchResults([]);
      setSearchError(t.searchFailed);
    } finally {
      setIsSearching(false);
    }
  };

  const pickSearchResult = (result: GeocodeResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    setSelectedPosition([lat, lng]);
    setLocationName(result.display_name);
    setSearchResults([]);
  };

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t.addColony}
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="relative z-[2001] w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.addColony}</h3>
                <p className="text-sm text-slate-600">{t.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t.closeModal}
              >
                {common.cancel}
              </button>
            </div>

            <form action={onCreateColony} className="grid gap-3 md:grid-cols-2">
              <input
                name="name"
                required
                placeholder={t.namePlaceholder}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                name="location_name"
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                placeholder={t.locationPlaceholder}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
              />

              <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
                <Button type="button" variant="secondary" onClick={searchPlaces} disabled={isSearching}>
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  {t.search}
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="md:col-span-2 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 last:border-b-0"
                      onClick={() => pickSearchResult(result)}
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              ) : null}

              {searchError ? <p className="md:col-span-2 text-xs text-orange-700">{searchError}</p> : null}

              <input name="latitude" readOnly value={latitude} className="hidden" />
              <input name="longitude" readOnly value={longitude} className="hidden" />

              <div className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200">
                <ColonyLocationMap position={selectedPosition} onCenterChange={setSelectedPosition} />
              </div>

              <p className="md:col-span-2 inline-flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-4 w-4 text-teal-700" />
                {t.selectedCoordinates}: {latitude}, {longitude}. {t.moveMapHint}
              </p>

              {submitError ? <p className="md:col-span-2 text-sm text-rose-700">{submitError}</p> : null}

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{t.colonyPhoto}</span>
                <input name="photo" type="file" accept="image/*" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <textarea
                name="description"
                placeholder={t.descriptionPlaceholder}
                className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              />

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                  {common.cancel}
                </Button>
                <Button type="submit" disabled={isPending}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {isPending ? t.saving : t.saveColony}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
