"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Clock3,
  Download,
  History,
  LayoutGrid,
  Package,
  PanelLeftClose,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  products,
  filterProducts,
  isChanged,
  money,
  priceError,
  readDrafts,
  type Drafts,
  type Product,
} from "@/lib/products";

function ProductArt({ kind }: { kind: Product["kind"] }) {
  return (
    <div className={`product-art ${kind}`} aria-hidden="true">
      <div className="appliance">
        <i />
        <b />
        <span />
      </div>
    </div>
  );
}
import type { Account } from "@/lib/account";
import { TeamPanel } from "@/components/team-panel";
import { LogoutButton, PasswordForm } from "@/components/account-controls";

export function Dashboard({ account }: { account?: Account }) {
  const storageKey = account
    ? `price-desk:user:${account.id}:sample-drafts:v1`
    : "price-desk:demo-drafts:v1";
  const displayName = account?.name ?? "Daniyaal Zahid";
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [drafts, setDrafts] = useState<Drafts>({});
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [collection, setCollection] = useState("");
  const [status, setStatus] = useState("");
  const [editedOnly, setEditedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [review, setReview] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [section, setSection] = useState("Products");
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    try {
      setDrafts(readDrafts(localStorage.getItem(storageKey)));
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(drafts));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [drafts, ready, storageKey]);
  const changed = useMemo(
    () => products.filter((p) => isChanged(p, drafts)),
    [drafts],
  );
  const invalid = changed.filter((p) => priceError(drafts[p.id]));
  const filtered = useMemo(
    () =>
      filterProducts(
        products,
        { query, brand, collection, status, editedOnly },
        drafts,
      ),
    [query, brand, collection, status, editedOnly, drafts],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pages);
  const visible = filtered.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const hasFilters = !!(query || brand || collection || status || editedOnly);
  function resetFilters() {
    setQuery("");
    setBrand("");
    setCollection("");
    setStatus("");
    setEditedOnly(false);
    setPage(1);
  }
  function edit(id: string, value: string) {
    setDrafts((d) => ({ ...d, [id]: value }));
  }
  function exportChanges() {
    const rows = [
      ["Product", "Variant", "SKU", "Old price", "New price"],
      ...changed.map((p) => [
        p.name,
        p.variant,
        p.sku,
        String(p.price),
        drafts[p.id],
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "price-desk-demo-changes.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const nav = [
    { name: "Products", icon: Package },
    { name: "Update history", icon: History },
    { name: "Team members", icon: Users },
    { name: "Settings", icon: Settings2 },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="wordmark">
          <span className="logo-mark">
            <Tag size={21} />
          </span>
          price<span className="wordmark-light">desk</span>
          <span className="wordmark-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">BE</span>
          <div>
            <strong>Bismillah Electronics</strong>
            <small>Store workspace</small>
          </div>
          <ChevronsUpDown size={14} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav
            .filter(
              (item) =>
                item.name !== "Team members" ||
                !account ||
                account.role === "super_admin",
            )
            .map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => setSection(name)}
                className={section === name ? "nav-item active" : "nav-item"}
              >
                <Icon size={18} />
                {name}
                {name === "Products" && (
                  <span className="nav-count">{products.length}</span>
                )}
                {name === "Update history" && <span className="small-dot" />}
              </button>
            ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={20} />
          <strong>Your store, in control.</strong>
          <p>Review every price change before it reaches your customers.</p>
          <span>One store. One workspace.</span>
        </div>
        <div className="sidebar-bottom">
          <button className="help-link" onClick={() => setSection("Help")}>
            <CircleHelp size={17} /> Help & workflow
          </button>
          <div className="account">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{displayName}</strong>
              <small>
                {account
                  ? account.role === "super_admin"
                    ? "Super Admin"
                    : "Team member"
                  : "Super Admin · Preview"}
              </small>
            </div>
            <PanelLeftClose size={16} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <span className="preview-pill">
              <span />
              {account ? "Sample catalog" : "UI preview"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotice(!notice)}
            >
              <Bell size={19} />
            </button>
            <span className="topbar-divider" />
            <span className="avatar avatar-small">{initials}</span>
            {account && <LogoutButton />}
          </div>
          {notice && (
            <div className="notification-panel">
              <strong>Notifications</strong>
              <p>No live price updates yet.</p>
              <small>
                Account-wise update notifications will appear here after Shopify
                is connected.
              </small>
            </div>
          )}
        </header>
        <main>
          <div className="demo-banner">
            <span className="demo-icon">
              <LayoutGrid size={15} />
            </span>
            <p>
              <strong>
                {account
                  ? "You’re signed in. This is still a sample catalog."
                  : "You’re viewing a demo workspace."}
              </strong>{" "}
              Products and prices are sample data. Shopify is not connected.
            </p>
            <span className="demo-label">{account ? "Phase 02" : "Demo"}</span>
          </div>
          {section === "Products" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CATALOG MANAGEMENT</div>
                  <h1>
                    Product pricing<span>.</span>
                  </h1>
                  <p>
                    Find your products. Make your changes. Keep every price in
                    check.
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled
                  title="Available after Shopify connection"
                >
                  <Store size={16} /> Sync products
                </Button>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div>
                    <span>Sample variants</span>
                    <Package size={17} />
                  </div>
                  <strong>{products.length.toString().padStart(2, "0")}</strong>
                  <p>
                    <span className="stat-dot" />
                    {products.length - 2} active · 2 draft
                  </p>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Brands in catalog</span>
                    <Tag size={17} />
                  </div>
                  <strong>
                    {new Set(products.map((p) => p.brand)).size
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <p>
                    Across {new Set(products.map((p) => p.collection)).size}{" "}
                    collections
                  </p>
                </div>
                <div className="stat-card pending-stat">
                  <div>
                    <span>Pending price changes</span>
                    <Clock3 size={17} />
                  </div>
                  <strong>{changed.length.toString().padStart(2, "0")}</strong>
                  <p>
                    {invalid.length
                      ? `${invalid.length} need correction`
                      : changed.length
                        ? "Ready for your review"
                        : "No unsaved price changes"}
                  </p>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Shopify connection</span>
                    <Store size={17} />
                  </div>
                  <strong className="connection-text">Not connected</strong>
                  <p>
                    <span className="stat-dot muted-dot" />
                    Live updates are disabled
                  </p>
                </div>
              </div>
              <section className="catalog-card" aria-label="Product catalog">
                <div className="catalog-title">
                  <div>
                    <h2>
                      All products <span>{filtered.length}</span>
                    </h2>
                    <p>Enter a new price directly in the table below.</p>
                  </div>
                  <span className="draft-status">
                    <CheckCheck size={15} />
                    {!ready
                      ? "Loading drafts…"
                      : storageError
                        ? "Drafts not saved"
                        : "Drafts saved in this browser"}
                  </span>
                </div>
                <div className="filters">
                  <div className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Search products or SKU"
                      placeholder="Search product name or SKU…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => {
                          setQuery("");
                          setPage(1);
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <label className="sr-only" htmlFor="brand">
                    Brand
                  </label>
                  <select
                    id="brand"
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All brands</option>
                    {[...new Set(products.map((p) => p.brand))]
                      .sort()
                      .map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                  </select>
                  <label className="sr-only" htmlFor="collection">
                    Collection
                  </label>
                  <select
                    id="collection"
                    value={collection}
                    onChange={(e) => {
                      setCollection(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All collections</option>
                    {[...new Set(products.map((p) => p.collection))]
                      .sort()
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                  <label className="sr-only" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All statuses</option>
                    <option>Active</option>
                    <option>Draft</option>
                  </select>
                </div>
                <div className="filter-meta">
                  <label className="edited-toggle">
                    <input
                      type="checkbox"
                      checked={editedOnly}
                      onChange={(e) => {
                        setEditedOnly(e.target.checked);
                        setPage(1);
                      }}
                    />
                    Show edited only <span>{changed.length}</span>
                  </label>
                  <div>
                    {hasFilters && (
                      <button className="text-button" onClick={resetFilters}>
                        Clear filters
                      </button>
                    )}
                    <span className="currency-label">
                      <SlidersHorizontal size={13} />
                      Currency: PKR
                    </span>
                  </div>
                </div>
                {storageError && (
                  <div role="alert" className="storage-error">
                    Browser storage is unavailable. Keep this tab open or export
                    your changes before leaving.
                  </div>
                )}
                <p className="table-hint">
                  Scroll the table sideways to view and edit prices →
                </p>
                <div className="table-scroll">
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th className="product-col">Product / variant</th>
                        <th>Brand</th>
                        <th>
                          Current price <span>PKR</span>
                        </th>
                        <th>
                          Compare-at <span>PKR</span>
                        </th>
                        <th className="new-price-heading">
                          New price <span>PKR</span>
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((p) => {
                        const raw = drafts[p.id] ?? "";
                        const changedRow = isChanged(p, drafts);
                        const error = priceError(raw);
                        return (
                          <tr
                            key={p.id}
                            className={changedRow ? "edited-row" : ""}
                          >
                            <td>
                              <div className="product-cell">
                                <ProductArt kind={p.kind} />
                                <div>
                                  <strong>{p.name}</strong>
                                  <p>{p.variant}</p>
                                  <small>{p.sku}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="brand-name">{p.brand}</span>
                            </td>
                            <td className="price-cell">{money(p.price)}</td>
                            <td className="compare-cell">
                              {p.compareAt ? money(p.compareAt) : "—"}
                            </td>
                            <td>
                              <div
                                className={`price-input-wrap ${changedRow ? "changed" : ""} ${error ? "has-error" : ""}`}
                              >
                                <span>Rs.</span>
                                <input
                                  aria-label={`New price for ${p.sku}`}
                                  inputMode="decimal"
                                  value={raw}
                                  disabled={!ready}
                                  placeholder="Enter price"
                                  maxLength={20}
                                  aria-invalid={!!error}
                                  aria-describedby={
                                    error ? `error-${p.id}` : undefined
                                  }
                                  onChange={(e) => edit(p.id, e.target.value)}
                                />
                                {raw && (
                                  <button
                                    aria-label={`Reset price for ${p.sku}`}
                                    onClick={() =>
                                      setDrafts((d) => {
                                        const next = { ...d };
                                        delete next[p.id];
                                        return next;
                                      })
                                    }
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              {error ? (
                                <small
                                  className="price-error"
                                  id={`error-${p.id}`}
                                >
                                  {error}
                                </small>
                              ) : changedRow ? (
                                <small className="price-difference">
                                  {Number(raw) < p.price ? (
                                    <ArrowDown size={10} />
                                  ) : (
                                    <ArrowUpRight size={10} />
                                  )}{" "}
                                  {money(Math.abs(Number(raw) - p.price))}{" "}
                                  {Number(raw) < p.price ? "less" : "more"}
                                </small>
                              ) : null}
                            </td>
                            <td>
                              <span
                                className={`status-badge ${p.status === "Draft" ? "draft-badge" : ""}`}
                              >
                                <span />
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty-state">
                      <Search size={30} />
                      <h3>No matching products</h3>
                      <p>
                        Try a different name, SKU or combination of filters.
                      </p>
                      <Button variant="outline" onClick={resetFilters}>
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
                <div className="pagination">
                  <span>
                    {filtered.length
                      ? `${(activePage - 1) * pageSize + 1}–${Math.min(activePage * pageSize, filtered.length)}`
                      : "0"}{" "}
                    of {filtered.length} variants
                  </span>
                  <div>
                    <label htmlFor="page-size">Rows per page</label>
                    <select
                      id="page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <Button
                      variant="ghost"
                      aria-label="Previous page"
                      disabled={activePage === 1}
                      onClick={() => setPage(activePage - 1)}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="page-number">
                      {activePage} / {pages}
                    </span>
                    <Button
                      variant="ghost"
                      aria-label="Next page"
                      disabled={activePage >= pages}
                      onClick={() => setPage(activePage + 1)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </section>
              <div className="workflow-tip">
                <ShieldCheck size={16} />
                <p>
                  Only edited prices enter review. Compare-at prices stay
                  unchanged.
                </p>
                <span>Designed for careful changes.</span>
              </div>
              <div className="action-bar">
                <div>
                  <span className="action-icon">
                    <Tag size={18} />
                  </span>
                  <div>
                    <strong>
                      {changed.length
                        ? `${changed.length} price ${changed.length === 1 ? "change" : "changes"} pending`
                        : "Your prices are up to date"}
                    </strong>
                    <p>
                      {changed.length
                        ? `${invalid.length ? `${invalid.length} invalid entries · ` : ""}Review changes across all pages and filters.`
                        : "Enter a new price to start a change."}
                    </p>
                  </div>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    disabled={!Object.keys(drafts).length}
                    onClick={() => setDiscard(true)}
                  >
                    Discard drafts
                  </Button>
                  <Button
                    disabled={!changed.length || !!invalid.length}
                    onClick={() => setReview(true)}
                  >
                    Review changes{" "}
                    {changed.length > 0 && (
                      <span className="button-count">{changed.length}</span>
                    )}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <section className="secondary-view">
              <div className="eyebrow">WORKSPACE / {section.toUpperCase()}</div>
              <h1>{section}</h1>
              {section === "Update history" ? (
                <>
                  <p>
                    Every live update will record the account, product, old
                    price, new price and result.
                  </p>
                  <div className="placeholder-card">
                    <History size={34} />
                    <h2>No live updates yet</h2>
                    <p>
                      This preview has no Shopify connection. There are no
                      completed updates or notifications to display.
                    </p>
                  </div>
                </>
              ) : section === "Team members" ? (
                account?.role === "super_admin" ? (
                  <TeamPanel />
                ) : (
                  <div className="placeholder-card">
                    <Users size={34} />
                    <h2>Team management</h2>
                    <p>
                      {account
                        ? "Super Admin access is required."
                        : "Account management is unavailable in demo mode."}
                    </p>
                  </div>
                )
              ) : section === "Settings" ? (
                <>
                  <p>Store connection and workspace configuration.</p>
                  {account && <PasswordForm />}
                  <div className="placeholder-card">
                    <Store size={34} />
                    <h2>Shopify is not connected</h2>
                    <p>
                      Shopify authorization and product synchronization will be
                      added in the integration phase.
                    </p>
                    <Button disabled>Connect Shopify — coming next</Button>
                  </div>
                </>
              ) : (
                <div className="placeholder-card help-card">
                  <h2>How to use this preview</h2>
                  <ol>
                    <li>Find products by name, SKU, brand or collection.</li>
                    <li>Enter individual prices in the New price column.</li>
                    <li>Use Show edited only to check your drafts.</li>
                    <li>Open Review changes to inspect old and new prices.</li>
                    <li>Export your draft changes as CSV if needed.</li>
                  </ol>
                  <p>
                    Drafts stay in this browser and are separated by account
                    when signed in. Live publishing and shared price history are
                    not implemented yet.
                  </p>
                </div>
              )}
              <Button variant="outline" onClick={() => setSection("Products")}>
                Back to products
                <ArrowRight size={15} />
              </Button>
            </section>
          )}
          <footer className="page-footer">
            <span>
              price<span>desk</span>. <small>by Bismillah Electronics</small>
            </span>
            <p>Internal pricing workspace · UI preview</p>
          </footer>
        </main>
      </div>
      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent>
          <div className="dialog-eyebrow">
            <Tag size={17} />
            PRICE REVIEW
          </div>
          <DialogTitle className="dialog-title">
            Review your changes<span>.</span>
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {changed.length} variant prices across all pages and filters.
            Compare-at prices are excluded.
          </DialogDescription>
          <div className="review-info">
            <ShieldCheck size={17} />
            <span>Demo mode: nothing will be sent to Shopify.</span>
          </div>
          <div className="review-table-wrap">
            <table className="review-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current</th>
                  <th>New price</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {changed.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small>
                        {p.variant} · {p.sku}
                      </small>
                    </td>
                    <td>{money(p.price)}</td>
                    <td className="review-new">
                      {priceError(drafts[p.id])
                        ? "Invalid"
                        : money(Number(drafts[p.id]))}
                    </td>
                    <td>
                      {priceError(drafts[p.id])
                        ? "—"
                        : `${Number(drafts[p.id]) > p.price ? "+" : ""}${money(Number(drafts[p.id]) - p.price)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="review-footer">
            <Button
              variant="outline"
              onClick={exportChanges}
              disabled={!!invalid.length || !changed.length}
            >
              <Download size={16} />
              Export changes
            </Button>
            <Button disabled title="Shopify connection is required">
              Update Shopify
              <ArrowRight size={16} />
            </Button>
          </div>
          <p className="review-caption">
            Live publishing becomes available after store connection and backend
            setup.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            Discard all drafts?
          </DialogTitle>
          <DialogDescription className="dialog-description">
            This clears your saved demo entries across all pages and filters.
            Shopify prices will not change.
          </DialogDescription>
          <div className="review-footer">
            <Button variant="outline" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                setDrafts({});
                setDiscard(false);
              }}
            >
              Discard all drafts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
