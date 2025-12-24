"use client";
import { useEffect, useState } from "react";

type Automation = {
  id: string;
  Name: string;
  Lead?: string | string[];
  Event?: string | string[];
  Channel?: string;
  OffsetMinutes?: number;
  Active?: boolean;
  TemplateSubject?: string;
  TemplateBody?: string;
};

type Lead = { id: string; Name: string };
type EventRecord = { id: string; Title: string };

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Automation>>({ Name: "" });

  const loadLeads = async () => {
    const res = await fetch("/api/leads", { cache: "no-store" });
    const json: { data?: Lead[] } = await res.json();
    setLeads((json.data ?? []).map((l) => ({ id: l.id, Name: l.Name })));
  };

  const loadEvents = async () => {
    const res = await fetch("/api/events", { cache: "no-store" });
    const json: { data?: EventRecord[] } = await res.json();
    setEvents((json.data ?? []).map((e) => ({ id: e.id, Title: e.Title })));
  };

  const loadAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/automations", { cache: "no-store" });
      const json: { data?: Automation[] } = await res.json();
      setAutomations(json.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error loading";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    loadEvents();
    loadAutomations();
  }, []);

  const createAutomation = async () => {
    setError(null);
    try {
      const payload: Partial<Automation> = { ...form };
      if (payload.Lead && typeof payload.Lead === "string") payload.Lead = payload.Lead;
      if (payload.Event && typeof payload.Event === "string") payload.Event = payload.Event;
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Name: "" });
      await loadAutomations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error creating";
      setError(msg);
    }
  };

  const updateAutomation = async () => {
    if (!form.id) return;
    setError(null);
    try {
      const payload: Partial<Automation> = { ...form };
      if (payload.Lead && typeof payload.Lead === "string") payload.Lead = payload.Lead;
      if (payload.Event && typeof payload.Event === "string") payload.Event = payload.Event;
      const res = await fetch(`/api/automations/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Name: "" });
      await loadAutomations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error updating";
      setError(msg);
    }
  };

  const deleteAutomation = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      await loadAutomations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error deleting";
      setError(msg);
    }
  };

  const getSingleId = (val: string | string[] | undefined) => {
    if (Array.isArray(val)) return val[0] || "";
    return val || "";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Automations</h1>
      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="rounded-lg border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Name"
              value={form.Name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Name: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={getSingleId(form.Lead)}
              onChange={(e) => setForm((f) => ({ ...f, Lead: e.target.value }))}
            >
              <option value="">Lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.Name}
                </option>
              ))}
            </select>
            <select
              className="border rounded px-3 py-2"
              value={getSingleId(form.Event)}
              onChange={(e) => setForm((f) => ({ ...f, Event: e.target.value }))}
            >
              <option value="">Event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.Title}
                </option>
              ))}
            </select>
            <select
              className="border rounded px-3 py-2"
              value={form.Channel ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Channel: e.target.value }))}
            >
              <option value="">Channel</option>
              <option>Email</option>
              <option>SMS</option>
              <option>Both</option>
            </select>
            <input
              type="number"
              className="border rounded px-3 py-2"
              placeholder="Offset minutes"
              value={form.OffsetMinutes?.toString() ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, OffsetMinutes: Number(e.target.value) }))
              }
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.Active}
                onChange={(e) => setForm((f) => ({ ...f, Active: e.target.checked }))}
              />
              Active
            </label>
            <input
              className="border rounded px-3 py-2"
              placeholder="Template subject"
              value={form.TemplateSubject ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, TemplateSubject: e.target.value }))
              }
            />
            <textarea
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Template body"
              value={form.TemplateBody ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, TemplateBody: e.target.value }))
              }
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            {!form.id && (
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!form.Name}
                onClick={createAutomation}
              >
                Create
              </button>
            )}
            {form.id && (
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!form.Name}
                onClick={updateAutomation}
              >
                Update
              </button>
            )}
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">All Automations</h2>
            <button
              className="text-sm underline"
              onClick={loadAutomations}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <ul className="mt-3 divide-y">
            {automations.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <div onClick={() => setForm(a)} className="cursor-pointer">
                  <div className="font-medium">{a.Name}</div>
                  <div className="text-sm text-zinc-600">
                    {a.Channel} {a.OffsetMinutes ? `• ${a.OffsetMinutes}m` : ""}{" "}
                    {a.Active ? "• Active" : "• Inactive"}
                  </div>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={() => deleteAutomation(a.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            {automations.length === 0 && (
              <li className="py-2 text-zinc-600">No automations</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
