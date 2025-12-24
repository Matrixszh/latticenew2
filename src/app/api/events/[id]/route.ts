import { NextResponse, NextRequest } from "next/server";
import { getBase, TABLE_EVENTS } from "@/lib/airtable";
import { FieldSet } from "airtable";

type ParamsPromise = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const base = getBase();
    const record = await base(TABLE_EVENTS).find(id);
    return NextResponse.json({ data: { id: record.id, ...record.fields } });
  } catch (e: unknown) {
    console.error("GET Error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Filter out read-only fields
    const { id: _id, CreatedAt, UpdatedAt, ...cleanBody } = body;
    const fields = { ...cleanBody };
    
    // Handle Lead field: empty string means clear, string means single ID
    if (fields.Lead === "") {
      fields.Lead = [];
    } else if (fields.Lead && typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }

    const base = getBase();
    const updated = await base(TABLE_EVENTS).update(
      [{ id, fields: fields as unknown as FieldSet }],
      { typecast: true }
    );
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
    await base(TABLE_EVENTS).destroy([id]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("DELETE Error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
