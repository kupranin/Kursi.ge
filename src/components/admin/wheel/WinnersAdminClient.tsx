"use client";

import { useEffect, useMemo, useState } from "react";

import type { WheelPrizeRow } from "@/lib/wheel/types";
import type { WheelWinRow } from "@/lib/wheel/types";

type WinnerFilters = {
  dateFrom: string;
  dateTo: string;
  prizeId: string;
  q: string;
};

export function WinnersAdminClient(props: { adminToken?: string }) {
  const [winners, setWinners] = useState<WheelWinRow[]>([]);
  const [prizes, setPrizes] = useState<WheelPrizeRow[]>([]);
  const [filters, setFilters] = useState<WinnerFilters>({
    dateFrom: "",
    dateTo: "",
    prizeId: "",
    q: ""
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = useMemo(
    () => (props.adminToken ? { "x-admin-secret": props.adminToken } : undefined),
    [props.adminToken]
  );

  async function loadWinners() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.prizeId) params.set("prizeId", filters.prizeId);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    try {
      const response = await fetch(`/api/admin/wheel/winners?${params.toString()}`, { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load winners");
      setWinners(payload.winners);
      setTotalPages(payload.pagination?.totalPages ?? 1);
      setTotalRows(payload.pagination?.total ?? payload.winners.length ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load winners");
    } finally {
      setLoading(false);
    }
  }

  async function loadPrizesForFilter() {
    try {
      const response = await fetch("/api/admin/wheel/prizes", { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load prizes");
      setPrizes(payload.prizes ?? []);
    } catch {
      // Filters can still work with free-text search if prizes fail.
    }
  }

  useEffect(() => {
    void loadPrizesForFilter();
  }, []);

  useEffect(() => {
    void loadWinners();
  }, [page]);

  async function updateWinner(row: WheelWinRow, updates: Partial<WheelWinRow>) {
    setError("");
    const response = await fetch("/api/admin/wheel/winners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(headers ?? {}) },
      body: JSON.stringify({ id: row.id, ...updates })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to update winner");
      return;
    }
    await loadWinners();
  }

  async function exportXlsx() {
    setError("");
    try {
      const response = await fetch("/api/admin/wheel/winners/export", { headers });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Failed to export");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `wheel-winners-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export");
    }
  }

  return (
    <main className="page-shell">
      <h1>Wheel CMS - Winners</h1>
      {error ? <p style={{ color: "#b32525" }}>{error}</p> : null}

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Filters</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 8 }}>
          <input
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
          />
          <input
            type="datetime-local"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
          />
          <select
            value={filters.prizeId}
            onChange={(event) => setFilters((current) => ({ ...current, prizeId: event.target.value }))}
          >
            <option value="">All prizes</option>
            {prizes.map((prize) => (
              <option key={prize.id} value={prize.id}>
                {prize.display_label} ({prize.internal_name})
              </option>
            ))}
          </select>
          <input
            placeholder="Search phone/email"
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setPage(1);
              void loadWinners();
            }}
            disabled={loading}
          >
            Apply filters
          </button>
          <button onClick={() => void exportXlsx()}>Export XLSX</button>
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <small>
            Showing page {page} of {totalPages} ({totalRows} total winners)
          </small>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Prev
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Won At</th>
              <th>User/Contact</th>
              <th>Prize</th>
              <th>Redeemed</th>
              <th>Admin note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((winner) => (
              <tr key={winner.id}>
                <td>{new Date(winner.won_at).toLocaleString()}</td>
                <td>
                  <div>{winner.user_id ?? "-"}</div>
                  <div>{winner.phone ?? "-"}</div>
                  <div>{winner.email ?? "-"}</div>
                </td>
                <td>
                  <div>{winner.prize_name_snapshot}</div>
                  <small>{winner.prize_label_snapshot}</small>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={winner.is_redeemed}
                    onChange={(event) =>
                      setWinners((current) =>
                        current.map((row) =>
                          row.id === winner.id ? { ...row, is_redeemed: event.target.checked } : row
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    value={winner.admin_note ?? ""}
                    onChange={(event) =>
                      setWinners((current) =>
                        current.map((row) => (row.id === winner.id ? { ...row, admin_note: event.target.value } : row))
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    onClick={() =>
                      void updateWinner(winner, {
                        is_redeemed: winner.is_redeemed,
                        admin_note: winner.admin_note
                      })
                    }
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
