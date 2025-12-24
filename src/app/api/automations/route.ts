import { NextResponse } from "next/server";
import { getBase, TABLE_AUTOMATIONS } from "@/lib/airtable";

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
    let created;
    try {
      created = await base(TABLE_AUTOMATIONS).create([{ fields }], { typecast: true });
    } catch (err) {
      if (fields.Event) {
        const { Event, ...fallback } = fields;
        created = await base(TABLE_AUTOMATIONS).create([{ fields: fallback }], { typecast: true });
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
