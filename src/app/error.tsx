"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="login-shell">
      <div className="login-card">
        <h1>Workspace unavailable</h1>
        <p>
          Check the database connection, migrations and APP_ORIGIN
          configuration. No account data has been loaded.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
