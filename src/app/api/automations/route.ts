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
    const fields = { ...body };
    if (fields.Lead && typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    if (fields.Event && typeof fields.Event === "string") {
      fields.Event = [fields.Event];
    }
    const base = getBase();
    const created = await base(TABLE_AUTOMATIONS).create(
      [{ fields }],
      { typecast: true }
    );
    const data = created.map((r) => ({ id: r.id, ...r.fields }));
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
