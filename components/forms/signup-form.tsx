"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signupAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface SignupFormProps {
  signUp: string;
  creatingAccount: string;
  alreadyHaveAccount: string;
  signInLink: string;
  joinRescueTeam: string;
  fullName: string;
  minimumCharacters: string;
}

export function SignupForm({
  signUp,
  creatingAccount,
  alreadyHaveAccount,
  signInLink,
  joinRescueTeam,
  fullName,
  minimumCharacters,
}: SignupFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{signUp}</h1>
        <p className="text-sm text-slate-600">{joinRescueTeam}</p>
      </div>

      <form
        action={(formData) => {
          setMessage("");
          startTransition(async () => {
            const result = await signupAction(formData);
            setMessage(result.message);
          });
        }}
        className="grid gap-3"
      >
        <input
          name="full_name"
          required
          placeholder={fullName}
          className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          aria-label={fullName}
        />
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
          minLength={8}
          placeholder={minimumCharacters}
          className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
          aria-label="Password"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? creatingAccount : signUp}
        </Button>
      </form>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <p className="text-sm text-slate-600">
        {alreadyHaveAccount}{" "}
        <Link href="/login" className="text-teal-700 hover:underline">
          {signInLink}
        </Link>
      </p>
    </div>
  );
}
