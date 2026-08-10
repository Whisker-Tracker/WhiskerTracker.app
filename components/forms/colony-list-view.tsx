"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { LatLngTuple } from "leaflet";
import { Loader2, MapPin, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { deleteColonyAction, updateColonyAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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

type ColonyListItem = {
  id: string;
  name: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  photoUrl: string | null;
  catCount: number;
  eartippedCount: number;
  aliveLinkedCatsCount?: number;
};

type EditingColony = {
  id: string;
  name: string;
  locationName: string;
  latitude: string;
  longitude: string;
  description: string;
  photoUrl: string | null;
};

type DeleteModalState =
  | {
      mode: "blocked";
      colonyId: string;
      colonyName: string;
    }
  | {
      mode: "confirm";
      colonyId: string;
      colonyName: string;
    };

function DeleteColonyModal({
  deleteModal,
  isDeletePending,
  moveCatsHref,
  onClose,
  onConfirm,
}: Readonly<{
  deleteModal: DeleteModalState;
  isDeletePending: boolean;
  moveCatsHref: string;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative z-[2101] w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        {deleteModal.mode === "blocked" ? (
          <>
            <h3 className="text-lg font-semibold text-slate-900">No se puede eliminar la colonia</h3>
            <p className="mt-2 text-sm text-slate-700">
              This colony cannot be removed if alive cats are linked to the colony. Move the cats of this colony to another colony to proceed with the colony deletion.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link
                href={moveCatsHref}
                className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Move cats
              </Link>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-slate-900">Eliminar colonia</h3>
            <p className="mt-2 text-sm text-slate-700">
              ¿Seguro que deseas eliminar <span className="font-semibold">{deleteModal.colonyName}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isDeletePending}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={onConfirm} disabled={isDeletePending}>
                {isDeletePending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ColonyListView({
  colonies,
  locale,
  labels,
}: Readonly<{
  colonies: ColonyListItem[];
  locale?: string;
  labels?: {
    view: string;
    edit: string;
    save: string;
    cancel: string;
    noLocation: string;
    catsTracked: string;
    eartipped: string;
    editTitle: string;
    editHint: string;
    name: string;
    location: string;
    latitude: string;
    longitude: string;
    description: string;
  };
}>) {
  const [editingColony, setEditingColony] = useState<EditingColony | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<LatLngTuple>(defaultCenter);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);

  const text = useMemo(
    () => ({
      view: labels?.view ?? "View",
      edit: labels?.edit ?? "Edit",
      save: labels?.save ?? "Save changes",
      cancel: labels?.cancel ?? "Cancel",
      noLocation: labels?.noLocation ?? "No location label",
      catsTracked: labels?.catsTracked ?? "Cats tracked",
      eartipped: labels?.eartipped ?? "Eartipped",
      editTitle: labels?.editTitle ?? "Edit Colony",
      editHint: labels?.editHint ?? "Update colony details.",
      name: labels?.name ?? "Name",
      location: labels?.location ?? "Location",
      latitude: labels?.latitude ?? "Latitude",
      longitude: labels?.longitude ?? "Longitude",
      description: labels?.description ?? "Description",
    }),
    [labels],
  );

  const colonyHrefBase = locale ? `/${locale}/dashboard/colonies` : "/dashboard/colonies";
  const catsHrefBase = locale ? `/${locale}/dashboard/cats` : "/dashboard/cats";

  const openDeleteModal = (colony: ColonyListItem) => {
    setMessage("");
    if ((colony.aliveLinkedCatsCount ?? 0) > 0) {
      setDeleteModal({
        mode: "blocked",
        colonyId: colony.id,
        colonyName: colony.name,
      });
      return;
    }

    setDeleteModal({
      mode: "confirm",
      colonyId: colony.id,
      colonyName: colony.name,
    });
  };

  const confirmDeleteColony = () => {
    if (deleteModal?.mode !== "confirm") {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteColonyAction({ id: deleteModal.colonyId });
      setMessage(result.message);
      if (result.ok) {
        setDeleteModal(null);
      }
    });
  };

  const openEditModal = (colony: ColonyListItem) => {
    setMessage("");
    setSelectedPhoto(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    const nextPosition: LatLngTuple = [Number(colony.latitude) || defaultCenter[0], Number(colony.longitude) || defaultCenter[1]];
    setSelectedPosition(nextPosition);
    setEditingColony({
      id: colony.id,
      name: colony.name,
      locationName: colony.locationName ?? "",
      latitude: String(colony.latitude),
      longitude: String(colony.longitude),
      description: colony.description ?? "",
      photoUrl: colony.photoUrl,
    });
  };

  const updateEditingCoordinates = (field: "latitude" | "longitude", value: string) => {
    setEditingColony((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, [field]: value };
      const lat = field === "latitude" ? Number(value) : Number(current.latitude);
      const lng = field === "longitude" ? Number(value) : Number(current.longitude);

      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setSelectedPosition([lat, lng]);
      }

      return next;
    });
  };

  const handleMapPositionChange = (position: LatLngTuple) => {
    setSelectedPosition(position);
    setEditingColony((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        latitude: String(position[0]),
        longitude: String(position[1]),
      };
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
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Could not search places.");
      }

      const data = (await response.json()) as GeocodeResult[];
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError("No locations found. Try a different city, street or address.");
      }
    } catch {
      setSearchResults([]);
      setSearchError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const pickSearchResult = (result: GeocodeResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    setSelectedPosition([lat, lng]);
    setEditingColony((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        latitude: String(lat),
        longitude: String(lng),
        locationName: result.display_name,
      };
    });
    setSearchResults([]);
  };

  const saveColony = () => {
    if (!editingColony) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", editingColony.id);
      formData.append("name", editingColony.name);
      formData.append("location_name", editingColony.locationName);
      formData.append("latitude", editingColony.latitude);
      formData.append("longitude", editingColony.longitude);
      formData.append("description", editingColony.description);

      if (selectedPhoto) {
        try {
          const photoUrl = await uploadColonyPhoto(selectedPhoto);
          formData.append("photo_url", photoUrl);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Unable to upload colony photo.");
          return;
        }
      }

      const result = await updateColonyAction(formData);

      setMessage(result.message);
      if (result.ok) {
        setEditingColony(null);
        setSelectedPhoto(null);
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {colonies.map((colony) => (
          <div key={colony.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <Image
                src={colony.photoUrl ?? "/no-image.svg"}
                alt={colony.name}
                width={640}
                height={360}
                className="h-[17.25rem] w-full object-cover"
              />
            </div>
            <p className="text-base font-semibold text-slate-900">{colony.name}</p>
            <p className="mt-1 text-sm text-slate-500">{colony.locationName ?? text.noLocation}</p>
            <p className="mt-3 text-sm text-slate-700">{text.catsTracked}: {colony.catCount}</p>
            <p className="text-sm text-slate-700">{text.eartipped}: {colony.eartippedCount}</p>
            <div className="mt-3 flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => openEditModal(colony)}>
                {text.edit}
              </Button>
              <Link
                href={`${colonyHrefBase}/${colony.id}?tab=cats`}
                className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white"
              >
                {text.view}
              </Link>
              <Button type="button" variant="danger" onClick={() => openDeleteModal(colony)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      {editingColony ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="relative z-[2001] w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{text.editTitle}</h3>
                <p className="text-sm text-slate-600">{text.editHint}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingColony(null);
                  setSelectedPhoto(null);
                }}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{text.name}</span>
                <input
                  value={editingColony.name}
                  onChange={(event) => setEditingColony({ ...editingColony, name: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{text.location}</span>
                <input
                  value={editingColony.locationName}
                  onChange={(event) => setEditingColony({ ...editingColony, locationName: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search city, street or address"
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
                <Button type="button" variant="secondary" onClick={searchPlaces} disabled={isSearching}>
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Search
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

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{text.latitude}</span>
                <input
                  value={editingColony.latitude}
                  onChange={(event) => updateEditingCoordinates("latitude", event.target.value)}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{text.longitude}</span>
                <input
                  value={editingColony.longitude}
                  onChange={(event) => updateEditingCoordinates("longitude", event.target.value)}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <div className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200">
                <ColonyLocationMap position={selectedPosition} onCenterChange={handleMapPositionChange} className="h-[280px] w-full" />
              </div>

              <p className="md:col-span-2 inline-flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-4 w-4 text-teal-700" />
                Selected coordinates: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}. Drag or search to reposition.
              </p>

              <div className="md:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <Image
                  src={editingColony.photoUrl ?? "/no-image.svg"}
                  alt={editingColony.name}
                  width={640}
                  height={360}
                  className="h-32 w-full object-cover"
                />
              </div>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>Colony photo</span>
                <input type="file" accept="image/*" onChange={(event) => setSelectedPhoto(event.target.files?.[0] ?? null)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{text.description}</span>
                <textarea
                  rows={3}
                  value={editingColony.description}
                  onChange={(event) => setEditingColony({ ...editingColony, description: event.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingColony(null);
                  setSelectedPhoto(null);
                }}
                disabled={isPending}
              >
                {text.cancel}
              </Button>
              <Button type="button" onClick={saveColony} disabled={isPending}>
                {isPending ? "Saving..." : text.save}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModal ? (
        <DeleteColonyModal
          deleteModal={deleteModal}
          isDeletePending={isDeletePending}
          moveCatsHref={`${catsHrefBase}?colonyId=${encodeURIComponent(deleteModal.colonyId)}`}
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDeleteColony}
        />
      ) : null}
    </>
  );
}
