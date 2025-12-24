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
  console.log("Scheduler triggered at:", new Date().toISOString());
  try {
    const base = getBase();
    console.log("Fetching active automations...");
    const automations = await base(TABLE_AUTOMATIONS)
      .select({ filterByFormula: "Active" })
      .all();
    console.log(`Found ${automations.length} active automations.`);

    const now = new Date();
    const triggered: string[] = [];
    const sent: string[] = [];
    const transporter = getTransporter();
    const from = getFromAddress();

    for (const a of automations) {
      console.log(`Processing automation: ${a.id} (${a.fields.Name})`);
      const fields = a.fields as Record<string, unknown>;
      // Airtable field is named "Events" (plural), but code might expect "Event". Handle both.
      const rawEvent = (fields.Events ?? fields.Event) as string | string[] | undefined;
      const eventIds: string[] = Array.isArray(rawEvent) ? rawEvent : rawEvent ? [rawEvent] : [];
      const channel = (fields.Channel as string | undefined) ?? "";
      const lastRaw = fields.LastTriggeredAt as string | undefined;
      const last = parseDate(lastRaw);
      
      console.log(`- Channel: ${channel}`);
      console.log(`- Event IDs: ${JSON.stringify(eventIds)}`);
      console.log(`- Last Triggered: ${last?.toISOString() ?? "Never"}`);

      if (eventIds.length === 0) {
        console.log("- No event linked. Checking lead-only logic.");
        const rawLeadNoEvent = fields.Lead as string | string[] | undefined;
        const leadIdsNoEvent: string[] = Array.isArray(rawLeadNoEvent) ? rawLeadNoEvent : rawLeadNoEvent ? [rawLeadNoEvent] : [];
        if (leadIdsNoEvent.length === 0) {
          console.log("- No lead linked. Skipping.");
          continue;
        }
        
        if (channel === "Email" || channel === "Both") {
          console.log(`- Fetching Lead: ${leadIdsNoEvent[0]}`);
          const lead = await base(TABLE_LEADS).find(leadIdsNoEvent[0]);
          const to = (lead.fields.Email as string | undefined) ?? "";
          console.log(`- Lead Email: ${to}`);

          if (to && from && (!last || last < now)) {
             console.log("- Condition met: Sending immediate email.");
             // ... existing send logic ...
             await base(TABLE_AUTOMATIONS).update([{ id: a.id, fields: { LastTriggeredAt: now.toISOString() } }]);
             triggered.push(a.id);
             const subject = (fields.TemplateSubject as string | undefined) ?? "Reminder";
             const body = (fields.TemplateBody as string | undefined) ?? "Notification";
             try {
               await transporter.sendMail({ from, to, subject, text: body });
               console.log("- Email sent successfully.");
               sent.push(a.id);
             } catch (mailError) {
               console.error("- Failed to send email:", mailError);
             }
          } else {
             console.log("- Skipping: Already triggered or missing email info.");
          }
        }
        continue;
      }
      
      const eventId = eventIds[0];
      console.log(`- Fetching Event: ${eventId}`);
      const event = await base(TABLE_EVENTS).find(eventId);
      const start = parseDate(event.fields.StartDateTime as string | undefined);
      if (!start) {
        console.log("- Event has no StartDateTime. Skipping.");
        continue;
      }
      
      const offsetRaw = fields.OffsetMinutes as number | string | undefined;
      const offset = typeof offsetRaw === "number" ? offsetRaw : Number(offsetRaw ?? 0);
      const triggerAt = new Date(start.getTime() - offset * 60000);
      
      console.log(`- Event Start: ${start.toISOString()}`);
      console.log(`- Offset: ${offset} mins`);
      console.log(`- Trigger Time: ${triggerAt.toISOString()}`);
      console.log(`- Current Time: ${now.toISOString()}`);

      if (now >= triggerAt && (!last || last < triggerAt)) {
        console.log("- Condition met: Triggering event automation.");
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
            console.log(`- Fetching Lead (from Automation or Event): ${leadIds[0]}`);
            const lead = await base(TABLE_LEADS).find(leadIds[0]);
            const to = (lead.fields.Email as string | undefined) ?? "";
            console.log(`- Lead Email: ${to}`);
            
            if (to && from) {
              const subject = (fields.TemplateSubject as string | undefined) ?? "Reminder";
              const body = (fields.TemplateBody as string | undefined) ?? `Upcoming event: ${(event.fields.Title as string | undefined) ?? ""}`;
              try {
                  await transporter.sendMail({
                    from,
                    to,
                    subject,
                    text: body,
                  });
                  console.log("- Email sent successfully.");
                  sent.push(a.id);
              } catch (mailError) {
                  console.error("- Failed to send email:", mailError);
              }
            } else {
                 console.log("- Missing 'to' or 'from' address.");
            }
          } else {
             console.log("- No lead found for this event/automation.");
          }
        }
      } else {
         console.log("- Condition NOT met (Not time yet or already triggered).");
      }
    }

    return NextResponse.json({ triggered, sent });
  } catch (e: unknown) {
    console.error("Scheduler Error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
