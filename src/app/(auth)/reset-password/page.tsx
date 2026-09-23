"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Loader2
        aria-label="Checking reset link"
        className="size-6 animate-spin text-primary"
      />
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? "This reset link is invalid or has expired." : null,
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        setError("This reset link is invalid or has expired.");
      } else {
        setHasSession(true);
      }
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await supabase.auth.signOut();
    setComplete(true);
    setSaving(false);
  };

  if (complete) {
    return (
      <AuthShell>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <CheckCircle aria-hidden="true" className="size-6 text-primary" />
          </div>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            Your password has been changed. You can now sign in with the new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/login" />} className="w-full">
            Sign in
          </Button>
        </CardContent>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <KeyRound aria-hidden="true" className="size-6 text-primary" />
        </div>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Use at least {MIN_PASSWORD_LENGTH} characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {checking ? (
          <div className="flex min-h-28 items-center justify-center">
            <Loader2
              aria-label="Checking reset link"
              className="size-5 animate-spin text-primary"
            />
          </div>
        ) : !hasSession || searchParams.get("error") ? (
          <InvalidLink message={error ?? "This reset link is invalid or has expired."} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={saving}
                required
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Updating password…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">{children}</Card>
    </div>
  );
}

function InvalidLink({ message }: { message: string }) {
  return (
    <div className="space-y-4 text-center">
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {message}
      </p>
      <Button render={<Link href="/forgot-password" />} className="w-full">
        Request a new reset link
      </Button>
    </div>
  );
}
