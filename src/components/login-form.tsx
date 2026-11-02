"use client";
import { useState, type FormEvent } from "react";
import { Tag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
export function LoginForm({ unavailable }: { unavailable: boolean }) {
  const [error, setError] = useState(
    unavailable
      ? "Workspace configuration is incomplete. Ask your administrator to check the server setup."
      : "",
  );
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Sign-in failed.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Unable to connect. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <div className="login-brand">
        <span className="logo-mark">
          <Tag size={22} />
        </span>
        pricedesk.
      </div>
      <section className="login-card">
        <div className="eyebrow">BISMILLAH ELECTRONICS</div>
        <h1>
          Sign in to your workspace<span>.</span>
        </h1>
        <p>Manage prices with your own team account.</p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={190}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}{" "}
          </Button>
        </form>
        <div className="login-note">
          <ShieldCheck size={16} />
          <span>
            Accounts are created by your Super Admin. There is no public
            registration.
          </span>
        </div>
      </section>
      <small className="login-bottom">
        Bismillah Electronics · Internal workspace
      </small>
    </main>
  );
}
