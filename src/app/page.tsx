"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Calendar, Zap, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const [stats, setStats] = useState({ leads: 0, events: 0, automations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [leadsRes, eventsRes, autoRes] = await Promise.all([
          fetch("/api/leads"),
          fetch("/api/events"),
          fetch("/api/automations")
        ]);

        const leads = await leadsRes.json();
        const events = await eventsRes.json();
        const autos = await autoRes.json();

        setStats({
          leads: leads.data?.length || 0,
          events: events.data?.length || 0,
          automations: autos.data?.filter((a: any) => a.Active).length || 0
        });
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back to Lattice AI. Here's what's happening today.</p>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 md:grid-cols-3">
        <StatCard 
          title="Total Leads" 
          value={stats.leads} 
          icon={Users} 
          color="text-blue-600" 
          bg="bg-blue-50"
          loading={loading}
        />
        <StatCard 
          title="Upcoming Events" 
          value={stats.events} 
          icon={Calendar} 
          color="text-purple-600" 
          bg="bg-purple-50"
          loading={loading}
        />
        <StatCard 
          title="Active Automations" 
          value={stats.automations} 
          icon={Zap} 
          color="text-amber-600" 
          bg="bg-amber-50"
          loading={loading}
        />
      </motion.div>

      <motion.div variants={item} className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3">
            <QuickAction href="/leads" title="Add New Lead" />
            <QuickAction href="/events" title="Schedule Event" />
            <QuickAction href="/automations" title="Create Automation" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <h2 className="text-lg font-semibold mb-2">System Status</h2>
          <p className="text-slate-300 text-sm mb-6">
            All systems are running smoothly. The automation scheduler is active and processing tasks.
          </p>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Operational
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, loading }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold mt-1">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bg} ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, title }: { href: string; title: string }) {
  return (
    <Link 
      href={href}
      className="group flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
    >
      <span className="font-medium text-sm">{title}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}
