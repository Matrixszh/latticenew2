"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Trash2, Edit2, Calendar, MapPin, Clock, User, AlignLeft, Save, X, Search } from "lucide-react";
import clsx from "clsx";
import { apiFetch } from "@/lib/api";

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

const statusColors: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<EventRecord>>({ Title: "" });
  const [search, setSearch] = useState("");

  // Helper: Format UTC string (from API) to Local datetime-local string (YYYY-MM-DDTHH:mm)
  // We treat the stored UTC string as "Wall Clock" time (ignoring timezone)
  const toLocalInputFormat = (utcStr?: string) => {
    if (!utcStr) return "";
    // utcStr is like "2025-01-03T21:25:00.000Z"
    // We want "2025-01-03T21:25"
    return utcStr.slice(0, 16);
  };

  // Helper: Convert Local datetime-local string to UTC ISO string (for API)
  // We store the "Wall Clock" time directly as UTC
  const toUTCISOString = (localStr?: string) => {
    if (!localStr) return undefined;
    // localStr is "2025-01-03T21:25"
    // We append ":00.000Z" to make it a valid UTC ISO string that visually matches the input
    return `${localStr}:00.000Z`;
  };

  const loadLeads = async () => {
    try {
      const res = await apiFetch("/leads", { cache: "no-store" });
      const json: { data?: Lead[] } = await res.json();
      setLeads((json.data ?? []).map((l) => ({ id: l.id, Name: l.Name })));
    } catch (e) {
      console.error("Failed to load leads", e);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/events", { cache: "no-store" });
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
      
      // Convert Local Input Strings to UTC for Storage
      if (payload.StartDateTime) payload.StartDateTime = toUTCISOString(payload.StartDateTime);
      if (payload.EndDateTime) payload.EndDateTime = toUTCISOString(payload.EndDateTime);

      const res = await apiFetch("/events", {
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
      
      // Convert Local Input Strings to UTC for Storage
      if (payload.StartDateTime) payload.StartDateTime = toUTCISOString(payload.StartDateTime);
      if (payload.EndDateTime) payload.EndDateTime = toUTCISOString(payload.EndDateTime);

      const res = await apiFetch(`/events/${form.id}`, {
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
    if (!confirm("Are you sure you want to delete this event?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      await loadEvents();
      if (form.id === id) setForm({ Title: "" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error deleting";
      setError(msg);
    }
  };

  const getSingleId = (val: string | string[] | undefined) => {
    if (Array.isArray(val)) return val[0] || "";
    return val || "";
  };

  const handleEdit = (ev: EventRecord) => {
    setForm({
      ...ev,
      StartDateTime: toLocalInputFormat(ev.StartDateTime),
      EndDateTime: toLocalInputFormat(ev.EndDateTime),
    });
  };

  const filteredEvents = events.filter(e => 
    e.Title.toLowerCase().includes(search.toLowerCase()) ||
    e.Description?.toLowerCase().includes(search.toLowerCase()) ||
    e.Location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
          <p className="text-muted-foreground">Schedule and manage your appointments.</p>
        </div>
        <button 
          onClick={loadEvents} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-md hover:bg-muted transition-colors text-sm font-medium shadow-sm"
        >
          <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No events found. Schedule one to get started.
                  </div>
                ) : (
                  filteredEvents.map((ev) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          onClick={() => handleEdit(ev)}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{ev.Title}</h3>
                            {ev.Status && (
                              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[ev.Status] || "bg-gray-100 text-gray-700")}>
                                {ev.Status}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                            {ev.StartDateTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(ev.StartDateTime).toLocaleString(undefined, { timeZone: "UTC" })}
                              </div>
                            )}
                            {ev.Location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {ev.Location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(ev)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteEvent(ev.id)}
                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-card border border-border rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{form.id ? "Edit Event" : "New Event"}</h2>
              {form.id && (
                <button 
                  onClick={() => setForm({ Title: "" })}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Meeting with client"
                    value={form.Title ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Lead</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    value={getSingleId(form.Lead)}
                    onChange={(e) => setForm((f) => ({ ...f, Lead: e.target.value }))}
                  >
                    <option value="">Select Lead...</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={form.StartDateTime ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, StartDateTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">End</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={form.EndDateTime ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, EndDateTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Office, Zoom..."
                    value={form.Location ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Location: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <select
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={form.Status ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, Status: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                    placeholder="Agenda..."
                    value={form.Description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Description: e.target.value }))}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-blue-700 px-4 py-2 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                disabled={!form.Title}
                onClick={form.id ? updateEvent : createEvent}
              >
                {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {form.id ? "Update Event" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
