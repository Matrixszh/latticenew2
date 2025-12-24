"use client";

import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
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
    
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="p-8">Loading calendar...</div>;
  }

  return (
    <div className="p-6 h-[calc(100vh-100px)]">
      <h1 className="text-2xl font-semibold mb-4">Calendar</h1>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onSelectEvent={(event) => alert(`Event: ${event.title}\nStatus: ${event.resource?.Status ?? "N/A"}`)}
      />
    </div>
  );
}
