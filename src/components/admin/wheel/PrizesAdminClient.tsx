"use client";

import { useEffect, useMemo, useState } from "react";

import type { WheelCampaignRow, WheelPrizeRow } from "@/lib/wheel/types";

type PrizeWithProbability = WheelPrizeRow & { probability: number };

type PrizeForm = {
  campaign_id: string;
  internal_name: string;
  display_label: string;
  description: string;
  weight: number;
  is_active: boolean;
  sort_order: number;
  segment_color: string;
  starts_at: string;
  ends_at: string;
  stock_limit: string;
};

const emptyForm: PrizeForm = {
  campaign_id: "",
  internal_name: "",
  display_label: "",
  description: "",
  weight: 1,
  is_active: true,
  sort_order: 0,
  segment_color: "",
  starts_at: "",
  ends_at: "",
  stock_limit: ""
};

export function PrizesAdminClient(props: { adminToken?: string }) {
  const [campaigns, setCampaigns] = useState<WheelCampaignRow[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [prizes, setPrizes] = useState<PrizeWithProbability[]>([]);
  const [form, setForm] = useState<PrizeForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = useMemo(
    () => (props.adminToken ? { "x-admin-secret": props.adminToken } : undefined),
    [props.adminToken]
  );

  async function loadPrizes() {
    if (!selectedCampaignId) {
      setPrizes([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/wheel/prizes?campaignId=${selectedCampaignId}`, { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load prizes");
      setPrizes(payload.prizes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load prizes");
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaigns() {
    setError("");
    try {
      const response = await fetch("/api/admin/wheel/campaigns", { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load campaigns");
      setCampaigns(payload.campaigns ?? []);
      if (!selectedCampaignId && payload.campaigns?.length) {
        const firstId = payload.campaigns[0].id as string;
        setSelectedCampaignId(firstId);
        setForm((current) => ({ ...current, campaign_id: firstId }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load campaigns");
    }
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    setForm((current) => ({ ...current, campaign_id: selectedCampaignId }));
    void loadPrizes();
  }, [selectedCampaignId]);

  async function createPrize() {
    setError("");
    const response = await fetch("/api/admin/wheel/prizes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(headers ?? {}) },
      body: JSON.stringify({
        ...form,
        description: form.description || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        stock_limit: form.stock_limit === "" ? null : Number(form.stock_limit)
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to create prize");
      return;
    }
    setForm(emptyForm);
    await loadPrizes();
  }

  function updateLocalPrize(id: string, key: keyof PrizeWithProbability, value: unknown) {
    setPrizes((current) => current.map((prize) => (prize.id === id ? { ...prize, [key]: value } : prize)));
  }

  async function savePrize(prize: PrizeWithProbability) {
    setError("");
    const response = await fetch("/api/admin/wheel/prizes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(headers ?? {}) },
      body: JSON.stringify({
        id: prize.id,
        internal_name: prize.internal_name,
        display_label: prize.display_label,
        description: prize.description,
        weight: prize.weight,
        is_active: prize.is_active,
        sort_order: prize.sort_order,
        segment_color: prize.segment_color,
        starts_at: prize.starts_at,
        ends_at: prize.ends_at,
        stock_limit: prize.stock_limit
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to save prize");
      return;
    }
    await loadPrizes();
  }

  async function deletePrize(id: string) {
    setError("");
    const response = await fetch(`/api/admin/wheel/prizes?id=${id}`, {
      method: "DELETE",
      headers
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to delete prize");
      return;
    }
    await loadPrizes();
  }

  async function createCampaign(formData: {
    name: string;
    starts_at: string;
    ends_at: string;
    total_prizes_limit: string;
  }) {
    setError("");
    const response = await fetch("/api/admin/wheel/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(headers ?? {}) },
      body: JSON.stringify({
        name: formData.name,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        total_prizes_limit: formData.total_prizes_limit === "" ? null : Number(formData.total_prizes_limit)
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to create campaign");
      return null;
    }
    await loadCampaigns();
    return payload.campaign as WheelCampaignRow;
  }

  async function createPrizesBySingleInput(input: string) {
    if (!selectedCampaignId) {
      setError("Select campaign first");
      return;
    }
    setError("");
    const lines = input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const [index, line] of lines.entries()) {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length < 2) {
        setError('Use format: "Display label | probability | max stock(optional)"');
        return;
      }
      const displayLabel = parts[0];
      const weight = Number(parts[1]);
      const maxStock = parts[2] ? Number(parts[2]) : null;
      if (!displayLabel || Number.isNaN(weight) || weight <= 0) {
        setError("Invalid line input");
        return;
      }
      await fetch("/api/admin/wheel/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers ?? {}) },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          internal_name: `prize_${index + 1}_${displayLabel.toLowerCase().replace(/\s+/g, "_")}`,
          display_label: displayLabel,
          description: null,
          weight,
          is_active: true,
          sort_order: index,
          segment_color: null,
          starts_at: null,
          ends_at: null,
          stock_limit: maxStock
        })
      });
    }

    await loadPrizes();
  }

  return (
    <main className="page-shell">
      <h1>Wheel CMS - Prizes</h1>
      {error ? <p style={{ color: "#b32525" }}>{error}</p> : null}

      <CampaignWizard
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        onSelectCampaign={setSelectedCampaignId}
        onCreateCampaign={createCampaign}
        onBulkCreatePrizes={createPrizesBySingleInput}
      />

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Add prize</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 8 }}>
          <select
            value={form.campaign_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, campaign_id: event.target.value }))
            }
          >
            <option value="">Select campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <div />
          <input
            placeholder="Internal name"
            value={form.internal_name}
            onChange={(event) => setForm((current) => ({ ...current, internal_name: event.target.value }))}
          />
          <input
            placeholder="Display label"
            value={form.display_label}
            onChange={(event) => setForm((current) => ({ ...current, display_label: event.target.value }))}
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Weight"
            value={form.weight}
            onChange={(event) => setForm((current) => ({ ...current, weight: Number(event.target.value) }))}
          />
          <input
            type="number"
            placeholder="Sort order"
            value={form.sort_order}
            onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))}
          />
          <input
            placeholder="Segment color"
            value={form.segment_color}
            onChange={(event) => setForm((current) => ({ ...current, segment_color: event.target.value }))}
          />
          <input
            type="datetime-local"
            placeholder="Starts at"
            value={form.starts_at}
            onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
          />
          <input
            type="datetime-local"
            placeholder="Ends at"
            value={form.ends_at}
            onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Stock limit"
            value={form.stock_limit}
            onChange={(event) => setForm((current) => ({ ...current, stock_limit: event.target.value }))}
          />
          <label>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
            Active
          </label>
        </div>
        <button style={{ marginTop: 12 }} onClick={() => void createPrize()}>
          Add prize
        </button>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Prizes</h2>
          <button onClick={() => void loadPrizes()} disabled={loading}>
            Refresh
          </button>
        </div>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Internal</th>
                <th>Label</th>
                <th>Weight</th>
                <th>Probability %</th>
                <th>Active</th>
                <th>Sort</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prizes.map((prize) => (
                <tr key={prize.id}>
                  <td style={{ fontSize: 12 }}>{prize.id.slice(0, 8)}...</td>
                  <td>
                    <input
                      value={prize.internal_name}
                      onChange={(event) => updateLocalPrize(prize.id, "internal_name", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={prize.display_label}
                      onChange={(event) => updateLocalPrize(prize.id, "display_label", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={prize.weight}
                      style={{ width: 80 }}
                      onChange={(event) => updateLocalPrize(prize.id, "weight", Number(event.target.value))}
                    />
                  </td>
                  <td>{prize.probability.toFixed(2)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={prize.is_active}
                      onChange={(event) => updateLocalPrize(prize.id, "is_active", event.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={prize.sort_order}
                      style={{ width: 80 }}
                      onChange={(event) => updateLocalPrize(prize.id, "sort_order", Number(event.target.value))}
                    />
                  </td>
                  <td>
                    {prize.stock_used}
                    {prize.stock_limit !== null ? `/${prize.stock_limit}` : ""}
                  </td>
                  <td>
                    <button onClick={() => void savePrize(prize)}>Save</button>{" "}
                    <button onClick={() => void deletePrize(prize.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function CampaignWizard(props: {
  campaigns: WheelCampaignRow[];
  selectedCampaignId: string;
  onSelectCampaign: (id: string) => void;
  onCreateCampaign: (formData: {
    name: string;
    starts_at: string;
    ends_at: string;
    total_prizes_limit: string;
  }) => Promise<WheelCampaignRow | null>;
  onBulkCreatePrizes: (input: string) => Promise<void>;
}) {
  const [campaignName, setCampaignName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [totalLimit, setTotalLimit] = useState("");
  const [bulkInput, setBulkInput] = useState("");

  return (
    <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>Step 1 - Create campaign</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 8 }}>
        <input
          placeholder="Campaign name"
          value={campaignName}
          onChange={(event) => setCampaignName(event.target.value)}
        />
        <input
          type="number"
          placeholder="Total campaign prizes limit (optional)"
          value={totalLimit}
          onChange={(event) => setTotalLimit(event.target.value)}
        />
        <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
      </div>
      <button
        style={{ marginTop: 12 }}
        onClick={async () => {
          if (!campaignName || !startsAt || !endsAt) return;
          const created = await props.onCreateCampaign({
            name: campaignName,
            starts_at: startsAt,
            ends_at: endsAt,
            total_prizes_limit: totalLimit
          });
          if (created) {
            props.onSelectCampaign(created.id);
            setCampaignName("");
            setStartsAt("");
            setEndsAt("");
            setTotalLimit("");
          }
        }}
      >
        Create campaign
      </button>

      <h2 style={{ marginBottom: 8, marginTop: 24 }}>Step 2 - Prize variables input</h2>
      <select
        value={props.selectedCampaignId}
        onChange={(event) => props.onSelectCampaign(event.target.value)}
        style={{ minWidth: 320 }}
      >
        <option value="">Select campaign</option>
        {props.campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
      <p style={{ marginTop: 8, marginBottom: 8, fontSize: 12 }}>
        One input format per line: <code>Prize display name | probability | max number(optional)</code>
      </p>
      <textarea
        value={bulkInput}
        onChange={(event) => setBulkInput(event.target.value)}
        rows={5}
        style={{ width: "100%" }}
        placeholder={"365 days | 5 | 100\n1 week promo | 10 | 50\n0% fee | 3"}
      />
      <button style={{ marginTop: 12 }} onClick={() => void props.onBulkCreatePrizes(bulkInput)}>
        Create prizes from input
      </button>
    </section>
  );
}
