"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface ResetPasswordFormProps {
  passwordReset: string;
  enterYourEmail: string;
  sendingReset: string;
  backToSignIn: string;
}

export function ResetPasswordForm({
  passwordReset,
  enterYourEmail,
  sendingReset,
  backToSignIn,
}: ResetPasswordFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{passwordReset}</h1>
        <p className="text-sm text-slate-600">{enterYourEmail}</p>
      </div>

      <form
        action={(formData) => {
          setMessage("");
          startTransition(async () => {
            const result = await resetPasswordAction(formData);
            setMessage(result.message);
          });
        }}
        className="grid gap-3"
      >
        <input
          name="email"
          required
          type="email"
          placeholder="you@example.com"
          className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          aria-label="Email address"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? sendingReset : passwordReset}
        </Button>
      </form>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <Link href="/login" className="text-sm text-teal-700 hover:underline">
        {backToSignIn}
      </Link>
    </div>
  );
}
