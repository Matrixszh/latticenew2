import { NextResponse } from "next/server";
import { getBase, TABLE_EVENTS } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const base = getBase();
    const records = await base(TABLE_EVENTS).select({}).all();
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
    if (!body?.Title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const fields = { ...body };
    if (fields.Lead && typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    const base = getBase();
    const created = await base(TABLE_EVENTS).create(
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
