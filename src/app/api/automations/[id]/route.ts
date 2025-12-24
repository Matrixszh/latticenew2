import { NextResponse, NextRequest } from "next/server";
import { getBase, TABLE_AUTOMATIONS } from "@/lib/airtable";
import { FieldSet, Records } from "airtable";

type ParamsPromise = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const base = getBase();
    const record = await base(TABLE_AUTOMATIONS).find(id);
    const f = record.fields as Record<string, unknown>;
    return NextResponse.json({ 
      data: { 
        id: record.id, 
        ...f,
        Event: f.Events ?? f.Event
      } 
    });
  } catch (e: unknown) {
    console.error("PUT Error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Filter out read-only fields or fields that shouldn't be updated directly
    const { id: _id, CreatedAt, UpdatedAt, ...cleanBody } = body;
    const fields: Record<string, unknown> = { ...cleanBody };
    
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
    
    const base = getBase();
    let updated: Records<FieldSet>;
    try {
      updated = await base(TABLE_AUTOMATIONS).update([{ id, fields: fields as unknown as FieldSet }], { typecast: true }) as Records<FieldSet>;
    } catch (err) {
      console.error("Update failed with Events, retrying without:", err);
      if (fields.Events) {
        const fallback = { ...fields };
        delete fallback.Events;
        updated = await base(TABLE_AUTOMATIONS).update([{ id, fields: fallback as unknown as FieldSet }], { typecast: true }) as Records<FieldSet>;
      } else {
        throw err;
      }
    }
    const data = updated.map((r) => ({ id: r.id, ...r.fields }))[0];
    return NextResponse.json({ data });
  } catch (e: unknown) {
    console.error("PUT Error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const base = getBase();
    await base(TABLE_AUTOMATIONS).destroy([id]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
