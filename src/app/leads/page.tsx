"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Trash2, Edit2, User, Mail, Phone, Tag, Search, Save, X } from "lucide-react";
import clsx from "clsx";
import { apiFetch } from "@/lib/api";

type Lead = {
  id: string;
  Name: string;
  Email?: string;
  Phone?: string;
  Status?: string;
  Source?: string;
  Notes?: string;
};

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Qualified: "bg-purple-100 text-purple-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({ Name: "" });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/leads", { cache: "no-store" });
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
      const res = await apiFetch("/leads", {
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
      const res = await apiFetch(`/leads/${form.id}`, {
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
    if (!confirm("Are you sure you want to delete this lead?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      await loadLeads();
      if (form.id === id) setForm({ Name: "" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error deleting";
      setError(msg);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.Name.toLowerCase().includes(search.toLowerCase()) || 
    l.Email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Leads</h1>
          <p className="text-muted-foreground">Manage and track your potential customers.</p>
        </div>
        <button 
          onClick={loadLeads} 
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
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {filteredLeads.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No leads found. Create one to get started.
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          onClick={() => setForm(lead)}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{lead.Name}</h3>
                            {lead.Status && (
                              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[lead.Status] || "bg-gray-100 text-gray-700")}>
                                {lead.Status}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {lead.Email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {lead.Email}
                              </div>
                            )}
                            {lead.Phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {lead.Phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setForm(lead)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteLead(lead.id)}
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
              <h2 className="text-lg font-semibold">{form.id ? "Edit Lead" : "New Lead"}</h2>
              {form.id && (
                <button 
                  onClick={() => setForm({ Name: "" })}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="John Doe"
                    value={form.Name ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="john@example.com"
                    value={form.Email ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="+1 (555) 000-0000"
                    value={form.Phone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <select
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={form.Status ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Status: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    <option>New</option>
                    <option>Contacted</option>
                    <option>Qualified</option>
                    <option>Won</option>
                    <option>Lost</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <input
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="LinkedIn, Web..."
                    value={form.Source ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, Source: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                  placeholder="Additional details..."
                  value={form.Notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, Notes: e.target.value }))}
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
                onClick={form.id ? updateLead : createLead}
              >
                {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {form.id ? "Update Lead" : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
