"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ClipboardPlus } from "lucide-react";

import { createFeedingLogAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import messages_es from "@/messages/es.json";

const feedingLogT = messages_es.feedingLogForm;

const feedingLogSchema = z.object({
  colonyId: z.uuid({ message: feedingLogT.selectColonyValidation }),
  catsSeenCount: z.number().min(0),
  hoursSpent: z.number().min(0).max(24),
  notes: z.string().max(500).optional(),
});

type FeedingLogValues = z.infer<typeof feedingLogSchema>;

interface ColonyOption {
  id: string;
  name: string;
}

export function FeedingLogForm({ colonies }: Readonly<{ colonies: ColonyOption[] }>) {
  const t = messages_es.feedingLogForm;
  const common = messages_es.common;
  const logs = messages_es.logs;

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeedingLogValues>({
    resolver: zodResolver(feedingLogSchema),
    defaultValues: {
      catsSeenCount: 0,
      hoursSpent: 0,
    },
  });

  const onSubmit = (values: FeedingLogValues) => {
    setMessage("");
    startTransition(async () => {
      const result = await createFeedingLogAction(values);
      setMessage(result.message);
      if (result.ok) {
        reset();
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)}>
          <ClipboardPlus className="mr-2 h-4 w-4" />
          {logs.addLog}
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <Card className="relative z-[2001] w-full max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{t.title}</CardTitle>
                <CardText className="mt-1">{t.subtitle}</CardText>
              </div>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                {common.cancel}
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{logs.colony}</span>
                <select
                  {...register("colonyId")}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="">{t.selectColony}</option>
                  {colonies.map((colony) => (
                    <option key={colony.id} value={colony.id}>
                      {colony.name}
                    </option>
                  ))}
                </select>
                {errors.colonyId && <span className="text-xs text-orange-700">{errors.colonyId.message}</span>}
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.catsSpotted}</span>
                <input
                  {...register("catsSeenCount", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.hoursDedicated}</span>
                <input
                  {...register("hoursSpent", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  max={24}
                  step={0.25}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
                {errors.hoursSpent && <span className="text-xs text-orange-700">{errors.hoursSpent.message}</span>}
              </label>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{logs.notes}</span>
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder={t.notesPlaceholder}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.notes && <span className="text-xs text-orange-700">{errors.notes.message}</span>}
              </label>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                  {common.cancel}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t.saving : t.logFeeding}
                </Button>
              </div>

              {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}
