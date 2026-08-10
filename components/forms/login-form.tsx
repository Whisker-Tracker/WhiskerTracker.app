"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  signIn: string;
  accessYourDashboard: string;
  password: string;
  signingIn: string;
  dontHaveAccount: string;
  passwordReset: string;
}

export function LoginForm({
  signIn,
  accessYourDashboard,
  password,
  signingIn,
  dontHaveAccount,
  passwordReset,
}: LoginFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{signIn}</h1>
        <p className="text-sm text-slate-600">{accessYourDashboard}</p>
      </div>

      <form
        action={(formData) => {
          setMessage("");
          startTransition(async () => {
            const result = await loginAction(formData);
            if (result?.message) setMessage(result.message);
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
        <input
          name="password"
          required
          type="password"
          placeholder={password}
          className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          aria-label="Password"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? signingIn : signIn}
        </Button>
      </form>

      {message ? <p className="text-sm text-orange-700">{message}</p> : null}

      <div className="flex justify-between text-sm text-slate-600">
        <Link href="/signup" className="text-teal-700 hover:underline">
          {dontHaveAccount}
        </Link>
        <Link href="/reset-password" className="text-teal-700 hover:underline">
          {passwordReset}
        </Link>
      </div>
    </div>
  );
}
