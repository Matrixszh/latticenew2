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
  console.log("SCHEDULER RUNNING AT (UTC):", now.toISOString());
  
  const results: unknown[] = [];
  
  // Hardcoded Offset for IST (User's Timezone)
  // Airtable stores "Wall Clock" time as UTC.
  // We need to shift it back to get the Real UTC time for the event.
  // IST is UTC+5:30. So Real UTC = Wall Clock UTC - 5.5 hours.
  const USER_TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000; 

  try {
    const base = getBase();
    
    // 1. Fetch ALL automations
    const automations = await base(TABLE_AUTOMATIONS).select({}).all();
    console.log(`Found ${automations.length} total automations.`);

    for (const record of automations) {
      const automationId = record.id;
      const fields = record.fields as Record<string, unknown>;
      const name = (fields.Name as string) ?? "Unnamed Automation";
      
      console.log(`\nChecking Automation: "${name}" (${automationId})`);

      if (!fields.Active) {
        console.log("-> SKIP: Automation is inactive.");
        results.push({ name, status: "Skipped", reason: "Inactive" });
        continue;
      }

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

        // eventStartWallClock is e.g. 22:10 UTC (representing 22:10 IST)
        const eventStartWallClock = new Date(startStr);
        if (isNaN(eventStartWallClock.getTime())) {
          console.log("-> SKIP: Invalid Event StartDateTime.");
          results.push({ name, status: "Skipped", reason: "Invalid start time" });
          continue;
        }

        // Convert Wall Clock to Real UTC
        // Real UTC = Wall Clock - 5.5h
        const eventStartRealUTC = new Date(eventStartWallClock.getTime() - USER_TZ_OFFSET_MS);

        const offsetRaw = fields.OffsetMinutes as number | string | undefined;
        const offset = typeof offsetRaw === "number" ? offsetRaw : Number(offsetRaw ?? 0);
        
        // Trigger Time (Real UTC) = Event Start (Real UTC) - Offset (minutes)
        const triggerTime = new Date(eventStartRealUTC.getTime() - offset * 60 * 1000);

        console.log(`   Event Wall Clock: ${eventStartWallClock.toISOString().replace("Z", " (IST)")}`);
        console.log(`   Event Real UTC:   ${eventStartRealUTC.toISOString()}`);
        console.log(`   Trigger Time UTC: ${triggerTime.toISOString()}`);
        console.log(`   Current Time UTC: ${now.toISOString()}`);

        const diffMs = triggerTime.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);

        // 4. Check Trigger Condition
        if (now < triggerTime) {
          console.log(`-> WAIT: Too early. (Trigger in ${diffMins} mins)`);
          results.push({ name, status: "Waiting", triggerTime: triggerTime.toISOString(), minutesRemaining: diffMins });
          continue;
        }

        // 5. Check if already triggered
        const lastTriggeredRaw = fields.LastTriggeredAt as string | undefined;
        const lastTriggered = lastTriggeredRaw ? new Date(lastTriggeredRaw) : null;

        if (lastTriggered && lastTriggered >= triggerTime) {
           console.log("-> DONE: Already triggered.");
           results.push({ name, status: "Skipped", reason: "Already triggered" });
           continue;
        }

        console.log("-> ACTION: Triggering now!");

        // 6. Gather Leads
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

        // 7. Send Emails
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

                const vars: Record<string, string> = {
                    "{{Name}}": leadName,
                    "{{Event}}": (eventFields.Title as string) ?? "Event",
                    // Use Wall Clock time for email display
                    "{{Date}}": eventStartWallClock.toLocaleString('en-US', { timeZone: 'UTC' }),
                    "{{Location}}": (eventFields.Location as string) ?? "",
                };

                let subject = (fields.TemplateSubject as string) ?? "Reminder: {{Event}}";
                let body = (fields.TemplateBody as string) ?? "Hi {{Name}}, reminder for {{Event}}.";

                Object.keys(vars).forEach(key => {
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

        // 8. Update LastTriggeredAt
        if (sentCount > 0) {
            await base(TABLE_AUTOMATIONS).update([{
                id: automationId,
                fields: { LastTriggeredAt: now.toISOString() }
            }]);
            console.log(`-> SUCCESS: Sent ${sentCount} emails.`);
            results.push({ name, status: "Success", sent: sentCount });
        } else {
            console.log("-> FAILED: 0 emails sent.");
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
