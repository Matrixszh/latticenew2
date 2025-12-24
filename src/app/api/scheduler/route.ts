import { NextResponse } from "next/server";
import { getBase, TABLE_AUTOMATIONS, TABLE_EVENTS, TABLE_LEADS } from "@/lib/airtable";
import { getTransporter, getFromAddress } from "@/lib/mailer";

export const runtime = "nodejs";

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
    const sent: string[] = [];
    const transporter = getTransporter();
    const from = getFromAddress();

    for (const a of automations) {
      const fields = a.fields as Record<string, unknown>;
      const rawEvent = fields.Event as string | string[] | undefined;
      const eventIds: string[] = Array.isArray(rawEvent) ? rawEvent : rawEvent ? [rawEvent] : [];
      const channel = (fields.Channel as string | undefined) ?? "";
      const lastRaw = fields.LastTriggeredAt as string | undefined;
      const last = parseDate(lastRaw);
      if (eventIds.length === 0) {
        const rawLeadNoEvent = fields.Lead as string | string[] | undefined;
        const leadIdsNoEvent: string[] = Array.isArray(rawLeadNoEvent) ? rawLeadNoEvent : rawLeadNoEvent ? [rawLeadNoEvent] : [];
        if (leadIdsNoEvent.length === 0) continue;
        if (channel === "Email" || channel === "Both") {
          const lead = await base(TABLE_LEADS).find(leadIdsNoEvent[0]);
          const to = (lead.fields.Email as string | undefined) ?? "";
          if (to && from && (!last || last < now)) {
            await base(TABLE_AUTOMATIONS).update([{ id: a.id, fields: { LastTriggeredAt: now.toISOString() } }]);
            triggered.push(a.id);
            const subject = (fields.TemplateSubject as string | undefined) ?? "Reminder";
            const body = (fields.TemplateBody as string | undefined) ?? "Notification";
            await transporter.sendMail({ from, to, subject, text: body });
            sent.push(a.id);
          }
        }
        continue;
      }
      const eventId = eventIds[0];
      const event = await base(TABLE_EVENTS).find(eventId);
      const start = parseDate(event.fields.StartDateTime as string | undefined);
      if (!start) continue;
      const offsetRaw = fields.OffsetMinutes as number | string | undefined;
      const offset = typeof offsetRaw === "number" ? offsetRaw : Number(offsetRaw ?? 0);
      const triggerAt = new Date(start.getTime() - offset * 60000);
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
        if (channel === "Email" || channel === "Both") {
          const rawLead = (fields.Lead as string | string[] | undefined) ?? (event.fields.Lead as string | string[] | undefined);
          const leadIds: string[] = Array.isArray(rawLead) ? rawLead : rawLead ? [rawLead] : [];
          if (leadIds.length > 0) {
            const lead = await base(TABLE_LEADS).find(leadIds[0]);
            const to = (lead.fields.Email as string | undefined) ?? "";
            if (to && from) {
              const subject = (fields.TemplateSubject as string | undefined) ?? "Reminder";
              const body = (fields.TemplateBody as string | undefined) ?? `Upcoming event: ${(event.fields.Title as string | undefined) ?? ""}`;
              await transporter.sendMail({
                from,
                to,
                subject,
                text: body,
              });
              sent.push(a.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ triggered, sent });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
