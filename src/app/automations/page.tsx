"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Trash2, Edit2, Zap, Mail, MessageSquare, Clock, ToggleLeft, ToggleRight, FileText, User, Calendar, Save, X, Search, Check } from "lucide-react";
import clsx from "clsx";
import { apiFetch } from "@/lib/api";

type Automation = {
  id: string;
  Name: string;
  Lead?: string | string[]; // Can be single ID or array of IDs
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
  const [form, setForm] = useState<Partial<Automation>>({ Name: "", Active: true, Channel: "Email" });
  const [search, setSearch] = useState("");
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);

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
    try {
      const res = await apiFetch("/events", { cache: "no-store" });
      const json: { data?: EventRecord[] } = await res.json();
      setEvents((json.data ?? []).map((e) => ({ id: e.id, Title: e.Title })));
    } catch (e) {
      console.error("Failed to load events", e);
    }
  };

  const loadAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/automations", { cache: "no-store" });
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
      // Ensure Lead is an array if it's not already
      if (payload.Lead && typeof payload.Lead === "string") payload.Lead = [payload.Lead];
      
      const res = await apiFetch("/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Name: "", Active: true, Channel: "Email" });
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
      // Ensure Lead is an array if it's not already
      if (payload.Lead && typeof payload.Lead === "string") payload.Lead = [payload.Lead];

      const res = await apiFetch(`/automations/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      setForm({ Name: "", Active: true, Channel: "Email" });
      await loadAutomations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error updating";
      setError(msg);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/automations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j: { error?: string } = await res.json();
        throw new Error(j.error ?? "Error");
      }
      await loadAutomations();
      if (form.id === id) setForm({ Name: "", Active: true, Channel: "Email" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error deleting";
      setError(msg);
    }
  };

  // Helper to handle Lead selection (toggle ID in array)
  const toggleLead = (leadId: string) => {
    const currentLeads = Array.isArray(form.Lead) ? form.Lead : form.Lead ? [form.Lead] : [];
    if (currentLeads.includes(leadId)) {
      setForm(f => ({ ...f, Lead: currentLeads.filter(id => id !== leadId) }));
    } else {
      setForm(f => ({ ...f, Lead: [...currentLeads, leadId] }));
    }
  };

  const getSelectedLeadCount = () => {
    const currentLeads = Array.isArray(form.Lead) ? form.Lead : form.Lead ? [form.Lead] : [];
    return currentLeads.length;
  };

  const getSingleId = (val: string | string[] | undefined) => {
    if (Array.isArray(val)) return val[0] || "";
    return val || "";
  };

  const runScheduler = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/scheduler");
      const json: { results?: Array<{ status?: string }> } = await res.json();
      console.log("Scheduler result:", json);
      // Show a simple summary alert
      const triggered = json.results?.filter((r) => r.status === "Success").length ?? 0;
      alert(`Scheduler Finished.\nTriggered: ${triggered}\nCheck console for details.`);
      await loadAutomations();
    } catch (e) {
      console.error("Scheduler failed", e);
      alert("Failed to run scheduler.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAutomations = automations.filter(a => 
    a.Name.toLowerCase().includes(search.toLowerCase()) ||
    a.TemplateSubject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Automations</h1>
          <p className="text-muted-foreground">Configure automated workflows and notifications.</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={runScheduler} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors text-sm font-medium shadow-sm"
            >
              <Zap className={clsx("h-4 w-4", loading && "animate-pulse")} />
              Run Checks Now
            </button>
            <button 
              onClick={loadAutomations} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-md hover:bg-muted transition-colors text-sm font-medium shadow-sm"
            >
              <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search automations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {filteredAutomations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No automations found. Create one to get started.
                  </div>
                ) : (
                  filteredAutomations.map((automation) => (
                    <motion.div
                      key={automation.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          onClick={() => setForm(automation)}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{automation.Name}</h3>
                            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", automation.Active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>
                              {automation.Active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                            {automation.Channel && (
                              <div className="flex items-center gap-1">
                                {automation.Channel === "Email" ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                                {automation.Channel}
                              </div>
                            )}
                            {automation.OffsetMinutes !== undefined && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {automation.OffsetMinutes}m offset
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setForm(automation)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteAutomation(automation.id)}
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
              <h2 className="text-lg font-semibold">{form.id ? "Edit Automation" : "New Automation"}</h2>
              {form.id && (
                <button 
                  onClick={() => setForm({ Name: "", Active: true, Channel: "Email" })}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Event Reminder"
                    value={form.Name ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Event</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    value={getSingleId(form.Event)}
                    onChange={(e) => setForm((f) => ({ ...f, Event: e.target.value }))}
                  >
                    <option value="">Select Event...</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.Title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-muted-foreground">Leads ({getSelectedLeadCount()})</label>
                <button
                  onClick={() => setIsLeadDropdownOpen(!isLeadDropdownOpen)}
                  className="w-full text-left pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all relative"
                >
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <span className={getSelectedLeadCount() === 0 ? "text-muted-foreground" : "text-foreground"}>
                    {getSelectedLeadCount() === 0 ? "Select Leads..." : `${getSelectedLeadCount()} Leads Selected`}
                  </span>
                </button>
                
                {isLeadDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto p-1">
                    {leads.length === 0 ? (
                       <div className="p-2 text-xs text-muted-foreground">No leads available</div>
                    ) : (
                      leads.map((l) => {
                        const isSelected = (Array.isArray(form.Lead) ? form.Lead : form.Lead ? [form.Lead] : []).includes(l.id);
                        return (
                          <div 
                            key={l.id} 
                            onClick={() => toggleLead(l.id)}
                            className={clsx("flex items-center gap-2 p-2 text-sm rounded cursor-pointer hover:bg-muted transition-colors", isSelected && "bg-blue-50 text-blue-700")}
                          >
                            <div className={clsx("w-4 h-4 border rounded flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-muted-foreground")}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            {l.Name}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {/* Backdrop to close dropdown */}
                {isLeadDropdownOpen && (
                  <div className="fixed inset-0 z-0" onClick={() => setIsLeadDropdownOpen(false)} style={{ pointerEvents: "auto", background: "transparent" }} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Channel</label>
                  <select
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={form.Channel ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Channel: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    <option>Email</option>
                    <option>SMS</option>
                    <option>Both</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Offset (min)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="10"
                    value={form.OffsetMinutes?.toString() ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, OffsetMinutes: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Positive = before event</p>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <button 
                  onClick={() => setForm(f => ({ ...f, Active: !f.Active }))}
                  className={clsx("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20", form.Active ? "bg-primary" : "bg-muted")}
                >
                  <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", form.Active ? "translate-x-6" : "translate-x-1")} />
                </button>
                <span className="text-sm font-medium">{form.Active ? "Active" : "Inactive"}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Template Subject</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Reminder: {{Event}}"
                    value={form.TemplateSubject ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, TemplateSubject: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Template Body</label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y font-mono"
                  placeholder="Hi {{Name}}, Don't forget about {{Event}} on {{Date}} at {{Location}}."
                  value={form.TemplateBody ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, TemplateBody: e.target.value }))}
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-blue-700 px-4 py-2 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                disabled={!form.Name}
                onClick={form.id ? updateAutomation : createAutomation}
              >
                {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {form.id ? "Update Automation" : "Create Automation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
