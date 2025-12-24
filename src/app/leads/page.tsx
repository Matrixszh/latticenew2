"use client";
import { useEffect, useState } from "react";

type Lead = {
  id: string;
  Name: string;
  Email?: string;
  Phone?: string;
  Status?: string;
  Source?: string;
  Notes?: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({ Name: "" });
  const [error, setError] = useState<string | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      const json: { data?: Lead[] } = await res.json();
      setLeads(json.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error loading";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const createLead = async () => {
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Name: "" });
      await loadLeads();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error creating";
      setError(msg);
    }
  };

  const updateLead = async () => {
    if (!form.id) return;
    setError(null);
    try {
      const res = await fetch(`/api/leads/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: form.Name,
          Email: form.Email,
          Phone: form.Phone,
          Status: form.Status,
          Source: form.Source,
          Notes: form.Notes,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Name: "" });
      await loadLeads();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error updating";
      setError(msg);
    }
  };

  const deleteLead = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      await loadLeads();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error deleting";
      setError(msg);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="rounded-lg border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Name"
              value={form.Name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Name: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={form.Email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Email: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Phone"
              value={form.Phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Phone: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={form.Status ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Status: e.target.value }))}
            >
              <option value="">Status</option>
              <option>New</option>
              <option>Contacted</option>
              <option>Qualified</option>
              <option>Won</option>
              <option>Lost</option>
            </select>
            <input
              className="border rounded px-3 py-2"
              placeholder="Source"
              value={form.Source ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Source: e.target.value }))}
            />
            <textarea
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Notes"
              value={form.Notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Notes: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            {!form.id && (
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!form.Name}
                onClick={createLead}
              >
                Create
              </button>
            )}
            {form.id && (
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!form.Name}
                onClick={updateLead}
              >
                Update
              </button>
            )}
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">All Leads</h2>
            <button
              className="text-sm underline"
              onClick={loadLeads}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <ul className="mt-3 divide-y">
            {leads.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between">
                <div onClick={() => setForm(l)} className="cursor-pointer">
                  <div className="font-medium">{l.Name}</div>
                  <div className="text-sm text-zinc-600">
                    {l.Email} {l.Phone ? `• ${l.Phone}` : ""}{" "}
                    {l.Status ? `• ${l.Status}` : ""}
                  </div>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={() => deleteLead(l.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            {leads.length === 0 && (
              <li className="py-2 text-zinc-600">No leads</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
