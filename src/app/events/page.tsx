"use client";
import { useEffect, useState } from "react";

type EventRecord = {
  id: string;
  Title: string;
  Description?: string;
  Lead?: string | string[];
  StartDateTime?: string;
  EndDateTime?: string;
  Location?: string;
  Status?: string;
};

type Lead = { id: string; Name: string };

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<EventRecord>>({ Title: "" });

  const loadLeads = async () => {
    const res = await fetch("/api/leads", { cache: "no-store" });
    const json: { data?: Lead[] } = await res.json();
    setLeads((json.data ?? []).map((l) => ({ id: l.id, Name: l.Name })));
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const json: { data?: EventRecord[] } = await res.json();
      setEvents(json.data ?? []);
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
  }, []);

  const createEvent = async () => {
    setError(null);
    try {
      const payload: Partial<EventRecord> = { ...form };
      if (payload.Lead && typeof payload.Lead === "string") payload.Lead = payload.Lead;
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Title: "" });
      await loadEvents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error creating";
      setError(msg);
    }
  };

  const updateEvent = async () => {
    if (!form.id) return;
    setError(null);
    try {
      const payload: Partial<EventRecord> = { ...form };
      if (payload.Lead && typeof payload.Lead === "string") payload.Lead = payload.Lead;
      const res = await fetch(`/api/events/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Title: "" });
      await loadEvents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error updating";
      setError(msg);
    }
  };

  const deleteEvent = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      await loadEvents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error deleting";
      setError(msg);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Events</h1>
      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="rounded-lg border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Title"
              value={form.Title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={typeof form.Lead === "string" ? form.Lead : ""}
              onChange={(e) => setForm((f) => ({ ...f, Lead: e.target.value }))}
            >
              <option value="">Lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.Name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="border rounded px-3 py-2"
              placeholder="Start"
              value={form.StartDateTime ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, StartDateTime: e.target.value }))}
            />
            <input
              type="datetime-local"
              className="border rounded px-3 py-2"
              placeholder="End"
              value={form.EndDateTime ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, EndDateTime: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Location"
              value={form.Location ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Location: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={form.Status ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Status: e.target.value }))}
            >
              <option value="">Status</option>
              <option>Scheduled</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
            <textarea
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Description"
              value={form.Description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, Description: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            {!form.id && (
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!form.Title}
                onClick={createEvent}
              >
                Create
              </button>
            )}
            {form.id && (
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!form.Title}
                onClick={updateEvent}
              >
                Update
              </button>
            )}
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">All Events</h2>
            <button
              className="text-sm underline"
              onClick={loadEvents}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <ul className="mt-3 divide-y">
            {events.map((ev) => (
              <li key={ev.id} className="py-2 flex items-center justify-between">
                <div onClick={() => setForm(ev)} className="cursor-pointer">
                  <div className="font-medium">{ev.Title}</div>
                  <div className="text-sm text-zinc-600">
                    {ev.StartDateTime} {ev.EndDateTime ? `→ ${ev.EndDateTime}` : ""}{" "}
                    {ev.Status ? `• ${ev.Status}` : ""}
                  </div>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={() => deleteEvent(ev.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            {events.length === 0 && (
              <li className="py-2 text-zinc-600">No events</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
