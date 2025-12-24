import { NextResponse } from "next/server";
import { getBase, TABLE_AUTOMATIONS } from "@/lib/airtable";
import { FieldSet, Records } from "airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const base = getBase();
    const records = await base(TABLE_AUTOMATIONS).select({}).all();
    const data = records.map((r) => {
      const f = r.fields as Record<string, unknown>;
      return { 
        id: r.id, 
        ...f,
        Event: f.Events ?? f.Event 
      };
    });
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fields: Record<string, unknown> = { ...body };
    
    // Handle Lead field
    if (fields.Lead === "") {
      fields.Lead = [];
    } else if (typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    
    // Handle Event field (map to "Events" for Airtable)
    if (fields.Event === "") {
      fields.Events = [];
      delete fields.Event;
    } else if (typeof fields.Event === "string") {
      fields.Events = [fields.Event];
      delete fields.Event;
    } else if (Array.isArray(fields.Event)) {
      fields.Events = fields.Event;
      delete fields.Event;
    }

    console.log("Creating Automation with fields:", JSON.stringify(fields, null, 2));
    
    const base = getBase();
    let created: Records<FieldSet>;
    try {
      created = await base(TABLE_AUTOMATIONS).create([{ fields: fields as unknown as FieldSet }], { typecast: true }) as Records<FieldSet>;
    } catch (err) {
      console.error("Creation failed with Events, retrying without:", err);
      if (fields.Events) {
        const fallback = { ...fields };
        delete fallback.Events;
        created = await base(TABLE_AUTOMATIONS).create([{ fields: fallback as unknown as FieldSet }], { typecast: true }) as Records<FieldSet>;
      } else {
        throw err;
      }
    }
    const data = created.map((r) => ({ id: r.id, ...r.fields }));
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
