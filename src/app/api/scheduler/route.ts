import { NextResponse } from "next/server";
import { getBase, TABLE_AUTOMATIONS, TABLE_EVENTS, TABLE_LEADS } from "@/lib/airtable";
import { getTransporter, getFromAddress } from "@/lib/mailer";

export const runtime = "nodejs";

// Allow GET requests to trigger the scheduler (easier for manual testing/cron)
export async function GET() {
  return POST();
}

export async function POST() {
  const now = new Date();
  console.log("----------------------------------------");
  console.log("SCHEDULER RUNNING AT:", now.toISOString());
  
  const results: any[] = [];

  try {
    const base = getBase();
    
    // 1. Fetch ALL automations (removed "Active" filter to prevent silent skips)
    const automations = await base(TABLE_AUTOMATIONS).select({}).all();
    console.log(`Found ${automations.length} total automations.`);

    for (const record of automations) {
      const automationId = record.id;
      const fields = record.fields as Record<string, unknown>;
      const name = (fields.Name as string) ?? "Unnamed Automation";
      
      console.log(`\nChecking Automation: "${name}" (${automationId})`);

      try {
        // 2. Resolve Event
        const rawEvent = (fields.Events ?? fields.Event) as string[] | string | undefined;
        const eventIds = Array.isArray(rawEvent) ? rawEvent : rawEvent ? [rawEvent] : [];

        if (eventIds.length === 0) {
          console.log("-> SKIP: No event linked.");
          results.push({ name, status: "Skipped", reason: "No event linked" });
          continue;
        }

        const eventId = eventIds[0];
        const eventRecord = await base(TABLE_EVENTS).find(eventId);
        const eventFields = eventRecord.fields as Record<string, unknown>;
        
        // 3. Resolve Times
        const startStr = eventFields.StartDateTime as string | undefined;
        if (!startStr) {
          console.log("-> SKIP: Event has no StartDateTime.");
          results.push({ name, status: "Skipped", reason: "Event missing start time" });
          continue;
        }

        const eventStart = new Date(startStr);
        if (isNaN(eventStart.getTime())) {
          console.log("-> SKIP: Invalid Event StartDateTime.");
          results.push({ name, status: "Skipped", reason: "Invalid start time" });
          continue;
        }

        const offsetRaw = fields.OffsetMinutes as number | string | undefined;
        const offset = typeof offsetRaw === "number" ? offsetRaw : Number(offsetRaw ?? 0);
        
        // Trigger Time = Event Start - Offset (minutes)
        // e.g. Event 10:00, Offset 60 => Trigger 09:00
        const triggerTime = new Date(eventStart.getTime() - offset * 60 * 1000);

        console.log(`   Event Start: ${eventStart.toISOString()}`);
        console.log(`   Offset: ${offset} mins`);
        console.log(`   Trigger Time: ${triggerTime.toISOString()}`);
        console.log(`   Current Time: ${now.toISOString()}`);

        const diffMs = triggerTime.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);

        // 4. Check Trigger Condition
        // Condition A: We are PAST the trigger time (Now >= Trigger)
        // Condition B: We haven't triggered it recently (LastTriggeredAt < TriggerTime OR null)
        
        const lastTriggeredRaw = fields.LastTriggeredAt as string | undefined;
        const lastTriggered = lastTriggeredRaw ? new Date(lastTriggeredRaw) : null;

        if (now < triggerTime) {
          console.log(`-> WAIT: Too early. (Trigger in ${diffMins} mins)`);
          results.push({ name, status: "Waiting", triggerTime: triggerTime.toISOString(), minutesRemaining: diffMins });
          continue;
        }

        // If we have triggered before, was it for THIS event instance?
        // Simple heuristic: If LastTriggered was AFTER the calculated TriggerTime, we assume it's done.
        // (This assumes 1 event = 1 trigger. If event time changes, we might re-trigger, which is acceptable).
        if (lastTriggered && lastTriggered >= triggerTime) {
           console.log("-> DONE: Already triggered.");
           results.push({ name, status: "Skipped", reason: "Already triggered" });
           continue;
        }

        console.log("-> ACTION: Triggering now!");

        // 5. Gather Leads (Automation Leads + Event Leads)
        const autoLeadsRaw = (fields.Lead as string[] | string) ?? [];
        const autoLeadIds = Array.isArray(autoLeadsRaw) ? autoLeadsRaw : autoLeadsRaw ? [autoLeadsRaw] : [];
        
        const eventLeadsRaw = (eventFields.Lead as string[] | string) ?? [];
        const evtLeadIds = Array.isArray(eventLeadsRaw) ? eventLeadsRaw : eventLeadsRaw ? [eventLeadsRaw] : [];

        const allLeadIds = Array.from(new Set([...autoLeadIds, ...evtLeadIds]));
        
        if (allLeadIds.length === 0) {
          console.log("-> WARNING: No leads found to contact.");
          results.push({ name, status: "Failed", reason: "No leads found" });
          continue;
        }

        // 6. Send Emails
        const transporter = getTransporter();
        const from = getFromAddress();
        let sentCount = 0;

        for (const leadId of allLeadIds) {
            try {
                const lead = await base(TABLE_LEADS).find(leadId);
                const lFields = lead.fields as Record<string, unknown>;
                const email = lFields.Email as string;
                const leadName = (lFields.Name as string) ?? "Valued Customer";

                if (!email) continue;

                // Variables
                const vars: Record<string, string> = {
                    "{{Name}}": leadName,
                    "{{Event}}": (eventFields.Title as string) ?? "Event",
                    "{{Date}}": eventStart.toLocaleString(),
                    "{{Location}}": (eventFields.Location as string) ?? "",
                };

                let subject = (fields.TemplateSubject as string) ?? "Reminder: {{Event}}";
                let body = (fields.TemplateBody as string) ?? "Hi {{Name}}, reminder for {{Event}}.";

                // Replace all occurrences
                Object.keys(vars).forEach(key => {
                    // Escape special chars for regex just in case, though simple keys are safe
                    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    subject = subject.replace(new RegExp(safeKey, 'g'), vars[key]);
                    body = body.replace(new RegExp(safeKey, 'g'), vars[key]);
                });

                console.log(`   Sending email to ${email}...`);
                await transporter.sendMail({ from, to: email, subject, text: body });
                sentCount++;

            } catch (err) {
                console.error(`   Error sending to lead ${leadId}`, err);
            }
        }

        // 7. Update LastTriggeredAt
        if (sentCount > 0) {
            await base(TABLE_AUTOMATIONS).update([{
                id: automationId,
                fields: { LastTriggeredAt: now.toISOString() }
            }]);
            console.log(`-> SUCCESS: Sent ${sentCount} emails.`);
            results.push({ name, status: "Success", sent: sentCount });
        } else {
            console.log("-> FAILED: 0 emails sent (check lead emails).");
            results.push({ name, status: "Failed", reason: "0 emails sent" });
        }

      } catch (err) {
        console.error(`Error processing automation ${name}:`, err);
        results.push({ name, status: "Error", error: String(err) });
      }
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString(), results });

  } catch (e: unknown) {
    console.error("Scheduler Fatal Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
