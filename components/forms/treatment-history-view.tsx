"use client";

import { useMemo, useState, useTransition } from "react";

import { deleteDiseaseTreatmentAction, updateDiseaseTreatmentAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import messages_es from "@/messages/es.json";

type DiseaseRow = {
  id: string;
  cat_id: string;
  disease_name: string;
  resolved_at?: string | null;
};

type TreatmentRow = {
  id: string;
  cat_disease_id: string;
  treatment_name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
};

type EditingTreatment = {
  id: string;
  cat_name: string;
  disease_name: string;
  treatment_name: string;
  started_at: string;
  ended_at: string;
  notes: string;
};

export function TreatmentHistoryView({
  diseases,
  treatments,
  catNameById,
  title = messages_es.dashboard.treatments,
  emptyText = messages_es.dashboard.noData,
}: Readonly<{
  diseases: DiseaseRow[];
  treatments: TreatmentRow[];
  catNameById: Record<string, string>;
  title?: string;
  emptyText?: string;
}>) {
  const t = messages_es.treatmentManagement;
  const common = messages_es.common;

  const [catFilter, setCatFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [editingTreatment, setEditingTreatment] = useState<EditingTreatment | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const diseaseById = useMemo(() => Object.fromEntries(diseases.map((disease) => [disease.id, disease])), [diseases]);

  const catOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ id: string; name: string }> = [];

    treatments.forEach((treatment) => {
      const disease = diseaseById[treatment.cat_disease_id];
      if (!disease || seen.has(disease.cat_id)) {
        return;
      }

      seen.add(disease.cat_id);
      options.push({ id: disease.cat_id, name: catNameById[disease.cat_id] ?? t.unknownCat });
    });

    options.sort((a, b) => a.name.localeCompare(b.name));
    return options;
  }, [catNameById, diseaseById, t, treatments]);

  const filteredTreatments = useMemo(() => {
    return treatments.filter((treatment) => {
      const disease = diseaseById[treatment.cat_disease_id];
      if (!disease) {
        return false;
      }

      const matchesCat = catFilter === "all" || disease.cat_id === catFilter;
      const matchesFrom = !dateFromFilter || treatment.started_at >= dateFromFilter;
      const matchesTo = !dateToFilter || treatment.started_at <= dateToFilter;

      return matchesCat && matchesFrom && matchesTo;
    });
  }, [catFilter, dateFromFilter, dateToFilter, diseaseById, treatments]);

  const activeTreatments = filteredTreatments.filter((treatment) => {
    const disease = diseaseById[treatment.cat_disease_id];
    if (!disease) {
      return false;
    }

    const diseaseStillActive = !disease.resolved_at || disease.resolved_at > today;
    const treatmentStillActive = !treatment.ended_at || treatment.ended_at > today;

    return diseaseStillActive && treatmentStillActive;
  });

  const historicalTreatments = filteredTreatments.filter((treatment) => {
    const disease = diseaseById[treatment.cat_disease_id];
    if (!disease) {
      return false;
    }

    const diseaseEnded = Boolean(disease.resolved_at && disease.resolved_at <= today);
    const treatmentEnded = Boolean(treatment.ended_at && treatment.ended_at <= today);

    return diseaseEnded || treatmentEnded;
  });

  const openEditTreatmentModal = (treatment: TreatmentRow) => {
    const disease = diseaseById[treatment.cat_disease_id];
    setEditingTreatment({
      id: treatment.id,
      cat_name: catNameById[disease?.cat_id ?? ""] ?? t.unknownCat,
      disease_name: disease?.disease_name ?? t.unknownDisease,
      treatment_name: treatment.treatment_name,
      started_at: treatment.started_at,
      ended_at: treatment.ended_at ?? "",
      notes: treatment.notes ?? "",
    });
  };

  const saveTreatment = () => {
    if (!editingTreatment) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await updateDiseaseTreatmentAction({
        id: editingTreatment.id,
        treatment_name: editingTreatment.treatment_name,
        started_at: editingTreatment.started_at,
        ended_at: editingTreatment.ended_at,
        notes: editingTreatment.notes,
      });

      setMessage(result.message);
      if (result.ok) {
        setEditingTreatment(null);
      }
    });
  };

  const deleteTreatment = (treatmentId: string) => {
    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await deleteDiseaseTreatmentAction({ id: treatmentId });
      setMessage(result.message);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{title}</CardTitle>
        <CardText className="mt-1">{t.titleHint}</CardText>
        <div className="mt-2 text-xs text-slate-600">
          <p>{t.activeCount}: {activeTreatments.length}</p>
          <p>{t.historicalCount}: {historicalTreatments.length}</p>
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
            <span>{t.startedFrom}</span>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.startedTo}</span>
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

      <Card>
        <p className="mb-2 text-sm font-semibold text-slate-900">{t.activeTreatments}</p>
        <div className="space-y-2">
          {activeTreatments.length > 0 ? (
            activeTreatments.map((treatment) => {
              const disease = diseaseById[treatment.cat_disease_id];
              return (
                <div key={treatment.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{treatment.treatment_name}</p>
                      <p className="text-xs text-slate-500">
                        {t.catLabel}: {catNameById[disease?.cat_id ?? ""] ?? t.unknownCat} | {t.diseaseLabel}: {disease?.disease_name ?? t.unknownDisease}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.started}: {treatment.started_at}
                        {treatment.ended_at ? (treatment.ended_at > today ? ` | ${t.ends}: ${treatment.ended_at}` : ` | ${t.ended}: ${treatment.ended_at}`) : ` | ${t.ongoing}`}
                      </p>
                      {treatment.notes ? <p className="mt-1 text-sm text-slate-700">{treatment.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" variant="ghost" onClick={() => openEditTreatmentModal(treatment)}>
                        {common.edit}
                      </Button>
                      <Button type="button" variant="danger" onClick={() => deleteTreatment(treatment.id)} disabled={isPending}>
                        {common.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">{t.noActiveTreatments}</p>
          )}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-semibold text-slate-900">{t.historicalTreatments}</p>
        <div className="space-y-2">
          {historicalTreatments.length > 0 ? (
            historicalTreatments.map((treatment) => {
              const disease = diseaseById[treatment.cat_disease_id];
              return (
                <div key={treatment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{treatment.treatment_name}</p>
                      <p className="text-xs text-slate-500">
                        {t.catLabel}: {catNameById[disease?.cat_id ?? ""] ?? t.unknownCat} | {t.diseaseLabel}: {disease?.disease_name ?? t.unknownDisease}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.started}: {treatment.started_at}
                        {treatment.ended_at ? ` | ${t.ended}: ${treatment.ended_at}` : disease?.resolved_at ? ` | ${t.ended}: ${disease.resolved_at}` : ""}
                      </p>
                      {treatment.notes ? <p className="mt-1 text-sm text-slate-700">{treatment.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" variant="ghost" onClick={() => openEditTreatmentModal(treatment)}>
                        {common.edit}
                      </Button>
                      <Button type="button" variant="danger" onClick={() => deleteTreatment(treatment.id)} disabled={isPending}>
                        {common.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">{emptyText}</p>
          )}
        </div>
      </Card>

      {editingTreatment ? (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setEditingTreatment(null)} aria-hidden="true" />
          <Card className="relative z-[2101] w-full max-w-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{t.editTreatment}</CardTitle>
                <CardText className="mt-1">
                  {editingTreatment.cat_name} | {editingTreatment.disease_name}
                </CardText>
              </div>
              <Button type="button" variant="secondary" onClick={() => setEditingTreatment(null)}>
                {t.close}
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.treatmentName}</span>
                <input
                  value={editingTreatment.treatment_name}
                  onChange={(event) => setEditingTreatment({ ...editingTreatment, treatment_name: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.startedDate}</span>
                <input
                  type="date"
                  value={editingTreatment.started_at}
                  onChange={(event) => setEditingTreatment({ ...editingTreatment, started_at: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.endedDate}</span>
                <input
                  type="date"
                  value={editingTreatment.ended_at}
                  onChange={(event) => setEditingTreatment({ ...editingTreatment, ended_at: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.notes}</span>
                <textarea
                  rows={3}
                  value={editingTreatment.notes}
                  onChange={(event) => setEditingTreatment({ ...editingTreatment, notes: event.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingTreatment(null)} disabled={isPending}>
                {common.cancel}
              </Button>
              <Button type="button" onClick={saveTreatment} disabled={isPending}>
                {isPending ? t.saving : t.saveChanges}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
