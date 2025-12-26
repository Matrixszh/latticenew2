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
      
      // Handle Event mapping (singular/plural)
      const rawEvent = (fields.Events ?? fields.Event) as string | string[] | undefined;
      const eventIds: string[] = Array.isArray(rawEvent) ? rawEvent : rawEvent ? [rawEvent] : [];
      
      const channel = (fields.Channel as string | undefined) ?? "";
      const lastRaw = fields.LastTriggeredAt as string | undefined;
      const last = parseDate(lastRaw);
      
      // Calculate Trigger Logic
      let shouldTrigger = false;
      let eventRecord: any = null;

      if (eventIds.length > 0) {
        // EVENT-BASED TRIGGER
        const eventId = eventIds[0];
        try {
          eventRecord = await base(TABLE_EVENTS).find(eventId);
          const start = parseDate(eventRecord.fields.StartDateTime as string | undefined);
          
          if (start) {
            const offsetRaw = fields.OffsetMinutes as number | string | undefined;
            const offset = typeof offsetRaw === "number" ? offsetRaw : Number(offsetRaw ?? 0);
            
            // Logic: Trigger Time = Event Start - Offset
            // e.g. Event @ 10:00, Offset 120 (2h) -> Trigger @ 08:00
            const triggerAt = new Date(start.getTime() - offset * 60000);
            
            console.log(`- Event: ${eventRecord.fields.Title}`);
            console.log(`- Start: ${start.toISOString()}`);
            console.log(`- Trigger At: ${triggerAt.toISOString()}`);
            
            // Check if we passed the trigger time AND haven't triggered it *after* the trigger time yet
            // (or never triggered)
            if (now >= triggerAt) {
               if (!last || last < triggerAt) {
                 shouldTrigger = true;
                 console.log("- Trigger condition met!");
               } else {
                 console.log("- Already triggered for this event instance.");
               }
            } else {
               console.log("- Too early to trigger.");
            }
          }
        } catch (err) {
          console.error(`- Failed to fetch event ${eventId}`, err);
        }
      } else {
        // IMMEDIATE / MANUAL TRIGGER (No event linked)
        // If it's active and has never been triggered (or explicit logic), run it.
        // For now, let's assume if no event, we rely on some other trigger or manual run.
        // But user specifically asked for Event logic.
        // We'll skip if no event for this specific "Event Automation" fix.
        console.log("- No event linked. Skipping.");
      }

      if (shouldTrigger && (channel === "Email" || channel === "Both")) {
        // GATHER LEADS
        const automationLeadsRaw = fields.Lead as string | string[] | undefined;
        const automationLeadIds = Array.isArray(automationLeadsRaw) ? automationLeadsRaw : automationLeadsRaw ? [automationLeadsRaw] : [];
        
        const eventLeadsRaw = eventRecord?.fields?.Lead as string | string[] | undefined;
        const eventLeadIds = Array.isArray(eventLeadsRaw) ? eventLeadsRaw : eventLeadsRaw ? [eventLeadsRaw] : [];
        
        // Combine unique IDs
        const allLeadIds = Array.from(new Set([...automationLeadIds, ...eventLeadIds]));
        
        console.log(`- Found ${allLeadIds.length} leads to contact.`);

        if (allLeadIds.length > 0) {
          // Fetch all lead emails
          // Optimization: If list is small, fetch individually. If large, use filterByFormula.
          // For safety/simplicity with Airtable rate limits, we'll process serially or in small batches.
          
          let emailsSentCount = 0;
          
          for (const leadId of allLeadIds) {
             try {
               const lead = await base(TABLE_LEADS).find(leadId);
               const to = lead.fields.Email as string | undefined;
               const leadName = (lead.fields.Name as string | undefined) ?? "Valued Customer";

               if (to && from) {
                 // Template Replacement
                 let subject = (fields.TemplateSubject as string | undefined) ?? "Reminder";
                 let body = (fields.TemplateBody as string | undefined) ?? "Upcoming event notification.";
                 
                 // Simple variable replacement
                 const vars: Record<string, string> = {
                   "{{Name}}": leadName,
                   "{{Event}}": eventRecord?.fields?.Title ?? "Event",
                   "{{Date}}": eventRecord?.fields?.StartDateTime ? new Date(eventRecord.fields.StartDateTime).toLocaleString() : "",
                   "{{Location}}": (eventRecord?.fields?.Location as string) ?? "",
                 };

                 Object.keys(vars).forEach(key => {
                   subject = subject.replace(new RegExp(key, 'g'), vars[key]);
                   body = body.replace(new RegExp(key, 'g'), vars[key]);
                 });

                 console.log(`- Sending to ${to}...`);
                 await transporter.sendMail({ from, to, subject, text: body });
                 emailsSentCount++;
               }
             } catch (err) {
               console.error(`- Failed to process lead ${leadId}`, err);
             }
          }

          if (emailsSentCount > 0) {
            sent.push(a.id);
            // Update LastTriggeredAt
            await base(TABLE_AUTOMATIONS).update([{ 
              id: a.id, 
              fields: { LastTriggeredAt: now.toISOString() } 
            }]);
            triggered.push(a.id);
            console.log(`- Automation completed. Sent ${emailsSentCount} emails.`);
          }
        }
      }
    }

    return NextResponse.json({ triggered, sent });
  } catch (e: unknown) {
    console.error("Scheduler Error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
