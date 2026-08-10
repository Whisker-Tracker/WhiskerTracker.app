"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";

import { createCatAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import messages_es from "@/messages/es.json";

interface ColonyOption {
  id: string;
  name: string;
}

export function AddCatForm({ colonies }: Readonly<{ colonies: ColonyOption[] }>) {
  const t = messages_es.addCatForm;
  const catsT = messages_es.cats;
  const common = messages_es.common;

  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createCatAction, { ok: false, message: "" });

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    formRef.current?.reset();
    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
      router.refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [router, state.ok]);

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t.addNewCat}
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <Card className="relative z-[2001] max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{t.addNewCat}</CardTitle>
                <CardText className="mt-1">{t.subtitle}</CardText>
              </div>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                {common.cancel}
              </Button>
            </div>

            <form ref={formRef} action={formAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <select name="colony_id" required className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">
                <option value="">{t.selectColony}</option>
                {colonies.map((colony) => (
                  <option key={colony.id} value={colony.id}>
                    {colony.name}
                  </option>
                ))}
              </select>
              <input
                name="name"
                required
                placeholder={t.catNamePlaceholder}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <select name="gender" defaultValue="unknown" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">
                <option value="male">{t.male}</option>
                <option value="female">{t.female}</option>
                <option value="unknown">{t.unknown}</option>
              </select>
              <select name="tnr_status" defaultValue="unaltered" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">
                <option value="unaltered">{catsT.tnrStatusUnaltered}</option>
                <option value="trapped">{catsT.tnrStatusTrapped}</option>
                <option value="neutered_spayed">{catsT.tnrStatusNeutered}</option>
                <option value="eartipped">{catsT.tnrStatusEartipped}</option>
              </select>
              <input
                name="microchip_id"
                placeholder={t.microchipPlaceholder}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                name="estimated_birth_date"
                type="date"
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                name="photo"
                type="file"
                accept="image/*"
                className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700">
                <input name="is_alive" type="checkbox" defaultChecked />
                <span>{t.alive}</span>
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700">
                <input name="is_adopted" type="checkbox" />
                <span>{t.adopted}</span>
              </label>
              <textarea
                name="distinctive_marks"
                placeholder={t.distinctiveMarks}
                className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              />
              <textarea
                name="notes"
                placeholder={t.healthNotes}
                className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              />
              {state.message ? (
                <p className={`text-sm md:col-span-2 ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
              ) : null}

              <Button type="submit" className="md:col-span-2" disabled={isPending}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isPending ? t.saving : t.saveProfile}
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}
