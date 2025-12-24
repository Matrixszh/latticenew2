import { NextResponse } from "next/server";
import { getBase, TABLE_AUTOMATIONS, TABLE_EVENTS } from "@/lib/airtable";

function parseDate(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST() {
  try {
    const base = getBase();
    const automations = await base(TABLE_AUTOMATIONS)
      .select({ filterByFormula: "Active" })
      .all();
    const now = new Date();
    const triggered: string[] = [];

    for (const a of automations) {
      const fields = a.fields as Record<string, unknown>;
      const rawEvent = fields.Event as string | string[] | undefined;
      const eventIds: string[] = Array.isArray(rawEvent) ? rawEvent : rawEvent ? [rawEvent] : [];
      if (eventIds.length === 0) continue;
      const eventId = eventIds[0];
      const event = await base(TABLE_EVENTS).find(eventId);
      const start = parseDate(event.fields.StartDateTime as string | undefined);
      if (!start) continue;
      const offsetRaw = fields.OffsetMinutes as number | string | undefined;
      const offset = typeof offsetRaw === "number" ? offsetRaw : Number(offsetRaw ?? 0);
      const triggerAt = new Date(start.getTime() - offset * 60000);
      const lastRaw = fields.LastTriggeredAt as string | undefined;
      const last = parseDate(lastRaw);
      if (now >= triggerAt && (!last || last < triggerAt)) {
        await base(TABLE_AUTOMATIONS).update([
          {
            id: a.id,
            fields: {
              LastTriggeredAt: now.toISOString(),
            },
          },
        ]);
        triggered.push(a.id);
      }
    }

    return NextResponse.json({ triggered });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
