"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
export function LogoutButton() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/auth/logout", { method: "POST" });
            if (r.ok || r.status === 401) window.location.assign("/login");
            else setError("Sign-out failed. Try again.");
          } catch {
            setError("Unable to connect.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Sign out
      </Button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
export function PasswordForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: f.get("currentPassword"),
          password: f.get("password"),
        }),
      });
      const data = await r.json();
      if (r.ok) window.location.assign("/login");
      else if (r.status === 401) window.location.assign("/login");
      else setMessage(data.error);
    } catch {
      setMessage("Unable to connect.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-panel">
      <h2>Change your password</h2>
      <p>Changing your password signs you out on all devices.</p>
      <form className="account-form" onSubmit={submit}>
        <label>
          Current password
          <input
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        <small>12–128 characters. Use a unique password.</small>
        {message && (
          <p role="alert" className="form-error">
            {message}
          </p>
        )}
        <Button disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </Button>
      </form>
    </section>
  );
}
