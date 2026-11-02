"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Account } from "@/lib/account";
type TeamUser = Account & { active: number; created_at: number };
type Event = {
  id: number;
  actor_name: string;
  target_name: string | null;
  action: string;
  created_at: number;
};
const date = (value: number) =>
  new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export function TeamPanel() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<TeamUser | null>(null);
  const [action, setAction] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/team", { cache: "no-store" });
      const data = await r.json();
      if (r.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!r.ok) {
        setError(data.error);
        return;
      }
      setUsers(data.users);
      setEvents(data.events);
    } catch {
      setError("Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          password: f.get("password"),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error);
        return;
      }
      form.reset();
      await load();
    } catch {
      setError("Unable to create account.");
    } finally {
      setBusy(false);
    }
  }
  async function change(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/team/" + target.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, password: f.get("password") }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error);
        return;
      }
      setTarget(null);
      await load();
    } catch {
      setError("Unable to update account.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        Team members may edit prices and publish after Shopify is connected.
        Only you manage accounts.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <section className="account-panel">
        <h2>Create team account</h2>
        <form onSubmit={submit} className="team-create-form">
          <label>
            Name
            <input name="name" required minLength={2} maxLength={100} />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={190} />
          </label>
          <label>
            Initial password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <Button disabled={busy}>{busy ? "Saving…" : "Create account"}</Button>
        </form>
        <small>
          Share the initial password privately. The member can change it in
          Settings.
        </small>
      </section>
      <section className="account-panel">
        <h2>Workspace accounts</h2>
        {loading ? (
          <p>Loading accounts…</p>
        ) : (
          <div className="table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </td>
                    <td>{u.role === "super_admin" ? "Super Admin" : "Team"}</td>
                    <td>{u.active ? "Active" : "Inactive"}</td>
                    <td>
                      {u.role === "team" ? (
                        <div className="team-actions">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setTarget(u);
                              setAction(u.active ? "deactivate" : "activate");
                            }}
                          >
                            {u.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setTarget(u);
                              setAction("reset_password");
                            }}
                          >
                            Reset password
                          </Button>
                        </div>
                      ) : (
                        "Protected account"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="account-panel">
        <h2>Account activity</h2>
        <p>
          Latest 50 account events · Pakistan time. Shopify price updates will
          have a separate history.
        </p>
        <div className="table-scroll">
          <table className="team-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Action</th>
                <th>Target</th>
                <th>Time (PKT)</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.actor_name || "System"}</td>
                  <td>{e.action.replaceAll("_", " ")}</td>
                  <td>{e.target_name || "—"}</td>
                  <td>{date(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!busy && !open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle className="dialog-title">
            {action === "reset_password"
              ? "Reset password"
              : action === "deactivate"
                ? "Deactivate account"
                : "Activate account"}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {target?.name} · {target?.email}. Existing sessions will be revoked.
          </DialogDescription>
          <form onSubmit={change} className="account-form">
            {action === "reset_password" && (
              <label>
                New password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? "Saving…" : "Confirm change"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
