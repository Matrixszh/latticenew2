import { NextResponse } from "next/server";
import { getBase, TABLE_LEADS } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const base = getBase();
    const records = await base(TABLE_LEADS).select({}).all();
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
    if (!body?.Name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const base = getBase();
    const created = await base(TABLE_LEADS).create(
      [{ fields: body }],
      { typecast: true }
    );
    const data = created.map((r) => ({ id: r.id, ...r.fields }));
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
