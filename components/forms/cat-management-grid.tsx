"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";

import { addCatDiseaseAction, updateCatProfileAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import messages_es from "@/messages/es.json";
import type { CatGender, TnrStatus } from "@/types/database.types";

type CatDiseaseHistory = {
  id: string;
  disease_name: string;
  diagnosed_at: string;
  resolved_at: string | null;
  notes: string | null;
};

type CatView = {
  id: string;
  name: string;
  tnr_status: TnrStatus;
  gender: CatGender | null;
  photo_url: string | null;
  microchip_id: string | null;
  notes: string | null;
  colony_id: string | null;
  estimated_birth_date: string | null;
  is_alive: boolean;
  is_adopted: boolean;
  diseases: CatDiseaseHistory[];
};

type EditingCat = {
  id: string;
  name: string;
  tnr_status: TnrStatus;
  gender: CatGender;
  microchip_id: string;
  notes: string;
  estimated_birth_date: string;
  is_alive: boolean;
  is_adopted: boolean;
};

type AddDiseaseModal = {
  cat_id: string;
  cat_name: string;
  disease_name: string;
  diagnosed_at: string;
  notes: string;
};

export function CatManagementGrid({
  cats,
  colonyNameById,
  initialColonyFilter,
}: Readonly<{
  cats: CatView[];
  colonyNameById: Record<string, string>;
  initialColonyFilter?: string;
}>) {
  const t = messages_es.catManagement;
  const catsT = messages_es.cats;
  const common = messages_es.common;
  const coloniesT = messages_es.colonies;

  const [editingCat, setEditingCat] = useState<EditingCat | null>(null);
  const [previewDiseasesCat, setPreviewDiseasesCat] = useState<CatView | null>(null);
  const [addDiseaseModal, setAddDiseaseModal] = useState<AddDiseaseModal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDiseasePending, startDiseaseTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [colonyFilter, setColonyFilter] = useState(initialColonyFilter ?? "all");
  const [aliveFilter, setAliveFilter] = useState("all");
  const [adoptedFilter, setAdoptedFilter] = useState("all");
  const [tnrFilter, setTnrFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  const colonyOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ id: string; label: string }> = [];

    cats.forEach((cat) => {
      const colonyId = cat.colony_id;
      if (!colonyId || seen.has(colonyId)) {
        return;
      }

      seen.add(colonyId);
      options.push({
        id: colonyId,
        label: colonyNameById[colonyId] ?? t.unassigned,
      });
    });

    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }, [cats, colonyNameById, t]);

  const visibleCats = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase();

    return cats.filter((cat) => {
      const matchesName = !normalizedName || cat.name.toLowerCase().includes(normalizedName);
      const matchesColony = colonyFilter === "all" || (cat.colony_id ?? "") === colonyFilter;
      const matchesTnr = tnrFilter === "all" || cat.tnr_status === tnrFilter;
      const matchesGender = genderFilter === "all" || (cat.gender ?? "unknown") === genderFilter;
      const matchesAlive = aliveFilter === "all" || (aliveFilter === "alive" ? cat.is_alive : !cat.is_alive);
      const matchesAdopted = adoptedFilter === "all" || (adoptedFilter === "adopted" ? cat.is_adopted : !cat.is_adopted);

      return matchesName && matchesColony && matchesAlive && matchesAdopted && matchesTnr && matchesGender;
    });
  }, [adoptedFilter, aliveFilter, cats, colonyFilter, genderFilter, nameFilter, tnrFilter]);

  const clearFilters = () => {
    setNameFilter("");
    setColonyFilter("all");
    setAliveFilter("all");
    setAdoptedFilter("all");
    setTnrFilter("all");
    setGenderFilter("all");
  };

  const openEditModal = (cat: CatView) => {
    setEditingCat({
      id: cat.id,
      name: cat.name,
      tnr_status: cat.tnr_status,
      gender: (cat.gender ?? "unknown") as CatGender,
      microchip_id: cat.microchip_id ?? "",
      notes: cat.notes ?? "",
      estimated_birth_date: cat.estimated_birth_date ?? "",
      is_alive: cat.is_alive,
      is_adopted: cat.is_adopted,
    });
  };

  const openAddDiseaseModal = (cat: { id: string; name: string }) => {
    const today = new Date().toISOString().slice(0, 10);
    setAddDiseaseModal({
      cat_id: cat.id,
      cat_name: cat.name,
      disease_name: "",
      diagnosed_at: today,
      notes: "",
    });
  };

  const saveCat = () => {
    if (!editingCat) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await updateCatProfileAction({
        id: editingCat.id,
        name: editingCat.name,
        tnr_status: editingCat.tnr_status,
        gender: editingCat.gender,
        microchip_id: editingCat.microchip_id,
        notes: editingCat.notes,
        estimated_birth_date: editingCat.estimated_birth_date,
        is_alive: editingCat.is_alive,
        is_adopted: editingCat.is_adopted,
      });

      setMessage(result.message);
      if (result.ok) {
        setEditingCat(null);
      }
    });
  };

  const saveDisease = () => {
    if (!addDiseaseModal) {
      return;
    }

    setMessage("");
    startDiseaseTransition(async () => {
      const result = await addCatDiseaseAction({
        cat_id: addDiseaseModal.cat_id,
        disease_name: addDiseaseModal.disease_name,
        diagnosed_at: addDiseaseModal.diagnosed_at,
        notes: addDiseaseModal.notes,
      });

      setMessage(result.message);
      if (result.ok) {
        setAddDiseaseModal(null);
      }
    });
  };

  return (
    <>
      <Card>
        <p className="text-sm font-semibold text-slate-900">{t.filterCats}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder={t.searchByName}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm xl:col-span-2"
          />

          <select
            value={colonyFilter}
            onChange={(event) => setColonyFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="all">{t.allColonies}</option>
            {colonyOptions.map((colony) => (
              <option key={colony.id} value={colony.id}>
                {colony.label}
              </option>
            ))}
          </select>

          <select
            value={aliveFilter}
            onChange={(event) => setAliveFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="all">{t.aliveAndDeceased}</option>
            <option value="alive">{t.aliveOnly}</option>
            <option value="deceased">{t.deceasedOnly}</option>
          </select>

          <select
            value={adoptedFilter}
            onChange={(event) => setAdoptedFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="all">{t.adoptedAndNot}</option>
            <option value="adopted">{t.adoptedOnly}</option>
            <option value="not_adopted">{t.notAdoptedOnly}</option>
          </select>

          <select
            value={tnrFilter}
            onChange={(event) => setTnrFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="all">{t.allTnr}</option>
            <option value="unaltered">{catsT.tnrStatusUnaltered}</option>
            <option value="trapped">{catsT.tnrStatusTrapped}</option>
            <option value="neutered_spayed">{catsT.tnrStatusNeutered}</option>
            <option value="eartipped">{catsT.tnrStatusEartipped}</option>
          </select>

          <select
            value={genderFilter}
            onChange={(event) => setGenderFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="all">{t.allGenders}</option>
            <option value="female">{t.female}</option>
            <option value="male">{t.male}</option>
            <option value="unknown">{t.unknown}</option>
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            {t.showing} {visibleCats.length} {t.of} {cats.length} {t.catsWord}
          </p>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            {t.clearFilters}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleCats.map((cat) => {
          const activeDiseases = cat.diseases.filter((entry) => !entry.resolved_at);
          const historicalDiseases = cat.diseases.filter((entry) => Boolean(entry.resolved_at));

          let cardClassName: string | undefined;
          if (!cat.is_alive) {
            cardClassName = "border-slate-300 bg-slate-100";
          } else if (cat.is_adopted) {
            cardClassName = "border-emerald-200 bg-emerald-50";
          }

          return (
            <Card key={cat.id} className={cardClassName}>
            {cat.photo_url ? (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
                <Image src={cat.photo_url} alt={cat.name} width={640} height={360} className="h-[17.5rem] w-full object-cover" />
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-semibold text-slate-900">{cat.name}</p>
              <div className="flex gap-1">
                {!cat.is_alive ? (
                  <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{coloniesT.deceased}</span>
                ) : null}
                {cat.is_adopted ? (
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{coloniesT.adopted}</span>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t.colonyLabel}: {colonyNameById[cat.colony_id ?? ""] ?? t.unassigned}</p>
            <p className="text-xs text-slate-500">{t.genderLabel}: {cat.gender ?? t.unknown}</p>
            {cat.estimated_birth_date ? <p className="text-xs text-slate-500">{t.estimatedBirth}: {cat.estimated_birth_date}</p> : null}
            <div className="mt-2">
              <StatusBadge status={cat.tnr_status} />
            </div>
            {cat.microchip_id ? <p className="mt-2 text-xs text-slate-500">{t.microchip}: {cat.microchip_id}</p> : null}
            {activeDiseases.length > 0 ? (
              <p className="mt-2 text-xs text-orange-700">{t.activeDiseases}: {activeDiseases.map((entry) => entry.disease_name).join(", ")}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">{t.activeDiseases}: {t.none}</p>
            )}
            {historicalDiseases.length > 0 ? (
              <p className="mt-1 text-xs text-slate-600">{t.historicalDiseases}: {historicalDiseases.length}</p>
            ) : null}
            {cat.notes ? <p className="mt-2 text-sm text-slate-700">{cat.notes}</p> : null}
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setPreviewDiseasesCat(cat)}>
                  {t.viewDiseases}
                </Button>
                <Button type="button" variant="secondary" onClick={() => openEditModal(cat)}>
                  {common.edit}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {visibleCats.length === 0 ? <p className="text-sm text-slate-500">{t.noCatsToDisplay}</p> : null}
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      {addDiseaseModal ? (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setAddDiseaseModal(null)} aria-hidden="true" />
          <div className="relative z-[2101] w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.addDisease}</h3>
                <p className="text-sm text-slate-600">{addDiseaseModal.cat_name}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setAddDiseaseModal(null)}>
                {t.close}
              </Button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.diseaseName}</span>
                <input
                  value={addDiseaseModal.disease_name}
                  onChange={(event) => setAddDiseaseModal({ ...addDiseaseModal, disease_name: event.target.value })}
                  placeholder={t.diseaseExample}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.diagnosedDate}</span>
                <input
                  type="date"
                  value={addDiseaseModal.diagnosed_at}
                  onChange={(event) => setAddDiseaseModal({ ...addDiseaseModal, diagnosed_at: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.notesOptional}</span>
                <textarea
                  rows={3}
                  value={addDiseaseModal.notes}
                  onChange={(event) => setAddDiseaseModal({ ...addDiseaseModal, notes: event.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddDiseaseModal(null)} disabled={isDiseasePending}>
                {common.cancel}
              </Button>
              <Button type="button" onClick={saveDisease} disabled={isDiseasePending}>
                {isDiseasePending ? t.saving : t.saveDisease}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {previewDiseasesCat ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setPreviewDiseasesCat(null)} aria-hidden="true" />
          <div className="relative z-[2001] w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.diseasePreview}</h3>
                <p className="text-sm text-slate-600">{previewDiseasesCat.name}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setPreviewDiseasesCat(null)}>
                {t.close}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm font-semibold text-orange-900">{t.activeDiseases}</p>
                <div className="mt-2 space-y-1">
                  {previewDiseasesCat.diseases.filter((entry) => !entry.resolved_at).length > 0 ? (
                    previewDiseasesCat.diseases
                      .filter((entry) => !entry.resolved_at)
                      .map((entry) => (
                        <p key={entry.id} className="text-xs text-orange-800">
                          {entry.disease_name} ({entry.diagnosed_at}){entry.notes ? ` - ${entry.notes}` : ""}
                        </p>
                      ))
                  ) : (
                    <p className="text-xs text-orange-700">{t.noActiveDiseases}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{t.historicalDiseases}</p>
                <div className="mt-2 space-y-1">
                  {previewDiseasesCat.diseases.filter((entry) => Boolean(entry.resolved_at)).length > 0 ? (
                    previewDiseasesCat.diseases
                      .filter((entry) => Boolean(entry.resolved_at))
                      .map((entry) => (
                        <p key={entry.id} className="text-xs text-slate-700">
                          {entry.disease_name} ({entry.diagnosed_at} - {entry.resolved_at}){entry.notes ? ` - ${entry.notes}` : ""}
                        </p>
                      ))
                  ) : (
                    <p className="text-xs text-slate-600">{t.noHistoricalDiseases}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingCat ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="relative z-[2001] w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.editCat}</h3>
                <p className="text-sm text-slate-600">{t.editHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                {t.close}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.name}</span>
                <input
                  value={editingCat.name}
                  onChange={(event) => setEditingCat({ ...editingCat, name: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.birthDate}</span>
                <input
                  type="date"
                  value={editingCat.estimated_birth_date}
                  onChange={(event) => setEditingCat({ ...editingCat, estimated_birth_date: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.genderLabel}</span>
                <select
                  value={editingCat.gender}
                  onChange={(event) => setEditingCat({ ...editingCat, gender: event.target.value as CatGender })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                  <option value="unknown">{t.unknown}</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.tnrStatus}</span>
                <select
                  value={editingCat.tnr_status}
                  onChange={(event) => setEditingCat({ ...editingCat, tnr_status: event.target.value as TnrStatus })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="unaltered">{catsT.tnrStatusUnaltered}</option>
                  <option value="trapped">{catsT.tnrStatusTrapped}</option>
                  <option value="neutered_spayed">{catsT.tnrStatusNeutered}</option>
                  <option value="eartipped">{catsT.tnrStatusEartipped}</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.microchip}</span>
                <input
                  value={editingCat.microchip_id}
                  onChange={(event) => setEditingCat({ ...editingCat, microchip_id: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editingCat.is_alive}
                  onChange={(event) => setEditingCat({ ...editingCat, is_alive: event.target.checked })}
                />
                <span>{t.alive}</span>
              </label>

              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={editingCat.is_adopted}
                  onChange={(event) => setEditingCat({ ...editingCat, is_adopted: event.target.checked })}
                />
                <span>{t.adoptedHideHint}</span>
              </label>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{t.notes}</span>
                <textarea
                  rows={3}
                  value={editingCat.notes}
                  onChange={(event) => setEditingCat({ ...editingCat, notes: event.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="md:col-span-2">
                <Button type="button" variant="secondary" onClick={() => openAddDiseaseModal({ id: editingCat.id, name: editingCat.name })}>
                  {t.addDisease}
                </Button>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCat(null)} disabled={isPending}>
                {common.cancel}
              </Button>
              <Button type="button" onClick={saveCat} disabled={isPending}>
                {isPending ? t.saving : t.saveChanges}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
