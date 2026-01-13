"use client";

import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { motion } from "framer-motion";
import { RefreshCw, Calendar as CalendarIcon, Clock, MapPin, Info } from "lucide-react";
import clsx from "clsx";
import { apiFetch } from "@/lib/api";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: EventRecord;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/events", { cache: "no-store" });
      const json: { data?: EventRecord[] } = await res.json();
      const apiEvents = json.data ?? [];
      
      const mappedEvents: CalendarEvent[] = apiEvents
        .filter(e => e.StartDateTime) // Ensure start time exists
        .map(e => {
          const start = new Date(e.StartDateTime!);
          // If EndDateTime is missing, assume 1 hour duration
          const end = e.EndDateTime ? new Date(e.EndDateTime) : new Date(start.getTime() + 60 * 60 * 1000);
          return {
            id: e.id,
            title: e.Title,
            start,
            end,
            resource: e
          };
        });
        
      setEvents(mappedEvents);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Visualise your schedule.</p>
        </div>
        <button 
          onClick={fetchEvents} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-md hover:bg-muted transition-colors text-sm font-medium shadow-sm"
        >
          <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm p-6 overflow-hidden flex flex-col relative">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", minHeight: "500px" }}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          defaultView={Views.MONTH}
          onSelectEvent={(event) => setSelectedEvent(event.resource || null)}
          eventPropGetter={(event) => {
            const status = event.resource?.Status;
            let className = "bg-blue-500 text-white border-none rounded-md px-2 text-xs font-medium";
            if (status === "Completed") className = "bg-green-500 text-white border-none rounded-md px-2 text-xs font-medium";
            if (status === "Cancelled") className = "bg-red-500 text-white border-none rounded-md px-2 text-xs font-medium";
            return { className };
          }}
        />

        {selectedEvent && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold">{selectedEvent.Title}</h3>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {selectedEvent.StartDateTime && format(new Date(selectedEvent.StartDateTime), "PP p")}
                      {selectedEvent.EndDateTime && ` - ${format(new Date(selectedEvent.EndDateTime), "p")}`}
                    </span>
                  </div>
                  
                  {selectedEvent.Location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedEvent.Location}</span>
                    </div>
                  )}

                  {selectedEvent.Status && (
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4" />
                      <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", 
                        selectedEvent.Status === "Completed" ? "bg-green-100 text-green-700" :
                        selectedEvent.Status === "Cancelled" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {selectedEvent.Status}
                      </span>
                    </div>
                  )}

                  {selectedEvent.Description && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm">
                      {selectedEvent.Description}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
