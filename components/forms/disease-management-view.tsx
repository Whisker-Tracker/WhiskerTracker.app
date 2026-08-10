"use client";

import { useMemo, useState, useTransition } from "react";

import {
  addDiseaseTreatmentAction,
  deleteCatDiseaseAction,
  resolveCatDiseaseAction,
  updateCatDiseaseAction,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import messages_es from "@/messages/es.json";

type DiseaseRow = {
  id: string;
  cat_id: string;
  disease_name: string;
  diagnosed_at: string;
  resolved_at: string | null;
  notes: string | null;
};

type TreatmentRow = {
  id: string;
  cat_disease_id: string;
  treatment_name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

type EditingDisease = {
  id: string;
  cat_name: string;
  disease_name: string;
  diagnosed_at: string;
  resolved_at: string;
  notes: string;
};

export function DiseaseManagementView({
  diseases,
  treatments,
  catNameById,
  title = messages_es.dashboard.diseases,
  emptyText = messages_es.dashboard.noData,
}: Readonly<{
  diseases: DiseaseRow[];
  treatments: TreatmentRow[];
  catNameById: Record<string, string>;
  title?: string;
  emptyText?: string;
}>) {
  const t = messages_es.diseaseManagement;
  const common = messages_es.common;

  const [treatmentModalDisease, setTreatmentModalDisease] = useState<DiseaseRow | null>(null);
  const [editingDisease, setEditingDisease] = useState<EditingDisease | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [catFilter, setCatFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const catOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ id: string; name: string }> = [];

    diseases.forEach((disease) => {
      if (seen.has(disease.cat_id)) {
        return;
      }

      seen.add(disease.cat_id);
      options.push({ id: disease.cat_id, name: catNameById[disease.cat_id] ?? t.unknownCat });
    });

    options.sort((a, b) => a.name.localeCompare(b.name));
    return options;
  }, [catNameById, diseases, t]);

  const filteredDiseases = useMemo(() => {
    return diseases.filter((disease) => {
      const matchesCat = catFilter === "all" || disease.cat_id === catFilter;
      const matchesFrom = !dateFromFilter || disease.diagnosed_at >= dateFromFilter;
      const matchesTo = !dateToFilter || disease.diagnosed_at <= dateToFilter;

      return matchesCat && matchesFrom && matchesTo;
    });
  }, [catFilter, dateFromFilter, dateToFilter, diseases]);

  const activeDiseases = filteredDiseases.filter((disease) => !disease.resolved_at);
  const historicalDiseases = filteredDiseases.filter((disease) => Boolean(disease.resolved_at));

  const treatmentsByDiseaseId = treatments.reduce<Record<string, TreatmentRow[]>>((acc, treatment) => {
    acc[treatment.cat_disease_id] ??= [];
    acc[treatment.cat_disease_id].push(treatment);
    return acc;
  }, {});

  const openEditDiseaseModal = (disease: DiseaseRow) => {
    setEditingDisease({
      id: disease.id,
      cat_name: catNameById[disease.cat_id] ?? t.unknownCat,
      disease_name: disease.disease_name,
      diagnosed_at: disease.diagnosed_at,
      resolved_at: disease.resolved_at ?? "",
      notes: disease.notes ?? "",
    });
  };

  const saveDiseaseChanges = () => {
    if (!editingDisease) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await updateCatDiseaseAction({
        id: editingDisease.id,
        disease_name: editingDisease.disease_name,
        diagnosed_at: editingDisease.diagnosed_at,
        resolved_at: editingDisease.resolved_at,
        notes: editingDisease.notes,
      });

      setMessage(result.message);
      if (result.ok) {
        setEditingDisease(null);
      }
    });
  };

  const deleteDisease = (id: string) => {
    if (!window.confirm(t.confirmDeleteDisease)) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await deleteCatDiseaseAction({ id });
      setMessage(result.message);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{title}</CardTitle>
        <CardText className="mt-1">{t.titleHint}</CardText>
        <div className="mt-2 text-xs text-slate-600">
          <p>{t.activeCount}: {activeDiseases.length}</p>
          <p>{t.historicalCount}: {historicalDiseases.length}</p>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.filterByCat}</span>
            <select
              value={catFilter}
              onChange={(event) => setCatFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="all">{t.allCats}</option>
              {catOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.diagnosedFrom}</span>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.diagnosedTo}</span>
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>
        </div>

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </Card>

      {filteredDiseases.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">{emptyText}</p>
        </Card>
      ) : null}

      {activeDiseases.length > 0 ? <p className="text-sm font-semibold text-slate-900">{t.activeDiseases}</p> : null}
      <div className="grid gap-3">
        {activeDiseases.map((disease) => {
          const diseaseTreatments = treatmentsByDiseaseId[disease.id] ?? [];
          const catName = catNameById[disease.cat_id] ?? t.unknownCat;

          return (
            <Card key={disease.id}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-slate-500">{t.catLabel}: <span className="font-bold text-slate-900">{catName}</span></p>
                <p className="text-sm font-semibold text-slate-500">{t.diseaseLabel}: <span className="font-bold text-slate-900">{disease.disease_name}</span></p>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">{t.active}</span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <p>{t.diagnosed}: {disease.diagnosed_at}</p>
                {disease.notes ? <p>{t.notes}: {disease.notes}</p> : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <form action={resolveCatDiseaseAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="disease_id" value={disease.id} />
                <input name="resolved_at" type="date" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
                <Button type="submit" variant="secondary">
                  {t.markHealthy}
                </Button>
                </form>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={() => setTreatmentModalDisease(disease)}>
                    {t.addTreatment}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => openEditDiseaseModal(disease)} disabled={isPending}>
                    {t.editDisease}
                  </Button>
                  <Button type="button" variant="danger" onClick={() => deleteDisease(disease.id)} disabled={isPending}>
                    {t.deleteDisease}
                  </Button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{t.treatments}</p>
                <div className="mt-2 space-y-1">
                  {diseaseTreatments.length > 0 ? (
                    diseaseTreatments.map((treatment) => (
                      <p key={treatment.id} className="text-xs text-slate-600">
                        {treatment.treatment_name} ({treatment.started_at})
                        {treatment.ended_at ? ` - ${t.ended} ${treatment.ended_at}` : ` - ${t.ongoing}`}
                        {treatment.notes ? `: ${treatment.notes}` : ""}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">{t.noTreatments}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {historicalDiseases.length > 0 ? (
        <Card>
          <p className="text-sm font-semibold text-slate-900">{t.historicalDiseases}</p>
          <div className="mt-2 space-y-2">
            {historicalDiseases.map((disease) => (
              <div key={disease.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold text-slate-500">{t.catLabel}: <span className="font-bold text-slate-900">{catNameById[disease.cat_id] ?? t.unknownCat}</span></p>
                      <p className="text-sm font-semibold text-slate-500">{t.diseaseLabel}: <span className="font-bold text-slate-900">{disease.disease_name}</span></p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{t.historical}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <p>{t.diagnosed}: {disease.diagnosed_at}</p>
                      <p>{t.resolved}: {disease.resolved_at}</p>
                      {disease.notes ? <p>{t.notes}: {disease.notes}</p> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => openEditDiseaseModal(disease)} disabled={isPending}>
                      {t.editDisease}
                    </Button>
                    <Button type="button" variant="danger" onClick={() => deleteDisease(disease.id)} disabled={isPending}>
                      {t.deleteDisease}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {treatmentModalDisease ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setTreatmentModalDisease(null)} aria-hidden="true" />
          <Card className="relative z-[2001] w-full max-w-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{t.addTreatmentTitle}</CardTitle>
                <CardText className="mt-1">
                  {catNameById[treatmentModalDisease.cat_id] ?? t.unknownCat} | {treatmentModalDisease.disease_name}
                </CardText>
              </div>
              <Button type="button" variant="secondary" onClick={() => setTreatmentModalDisease(null)}>
                {common.cancel}
              </Button>
            </div>

            <form action={addDiseaseTreatmentAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="cat_disease_id" value={treatmentModalDisease.id} />
              <input
                name="treatment_name"
                required
                placeholder={t.treatmentName}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm md:col-span-2"
              />
              <input name="started_at" type="date" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
              <input name="ended_at" type="date" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
              <textarea
                name="notes"
                rows={3}
                placeholder={t.treatmentNotes}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setTreatmentModalDisease(null)}>
                  {common.cancel}
                </Button>
                <Button type="submit">{t.saveTreatment}</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {editingDisease ? (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setEditingDisease(null)} aria-hidden="true" />
          <Card className="relative z-[2101] w-full max-w-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{t.editDisease}</CardTitle>
                <CardText className="mt-1">
                  {editingDisease.cat_name} | {editingDisease.disease_name}
                </CardText>
              </div>
              <Button type="button" variant="secondary" onClick={() => setEditingDisease(null)}>
                {common.cancel}
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.diseaseName}</span>
                <input
                  value={editingDisease.disease_name}
                  onChange={(event) => setEditingDisease({ ...editingDisease, disease_name: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.diagnosedDate}</span>
                <input
                  type="date"
                  value={editingDisease.diagnosed_at}
                  onChange={(event) => setEditingDisease({ ...editingDisease, diagnosed_at: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.resolved}</span>
                <input
                  type="date"
                  value={editingDisease.resolved_at}
                  onChange={(event) => setEditingDisease({ ...editingDisease, resolved_at: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.notes}</span>
                <textarea
                  rows={3}
                  value={editingDisease.notes}
                  onChange={(event) => setEditingDisease({ ...editingDisease, notes: event.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingDisease(null)} disabled={isPending}>
                {common.cancel}
              </Button>
              <Button type="button" onClick={saveDiseaseChanges} disabled={isPending}>
                {isPending ? t.saving : t.saveChanges}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
