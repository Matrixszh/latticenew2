import { NextResponse } from "next/server";
import { getBase, TABLE_AUTOMATIONS } from "@/lib/airtable";
import { FieldSet, Records } from "airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const base = getBase();
    const records = await base(TABLE_AUTOMATIONS).select({}).all();
    const data = records.map((r) => ({ id: r.id, ...r.fields }));
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
    if (typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    if (typeof fields.Event === "string") {
      fields.Event = [fields.Event];
    }
    const base = getBase();
    let created: Records<FieldSet>;
    try {
      created = await base(TABLE_AUTOMATIONS).create([{ fields: fields as unknown as FieldSet }], { typecast: true }) as Records<FieldSet>;
    } catch (err) {
      if (fields.Event) {
        const fallback = { ...fields };
        delete fallback.Event;
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
