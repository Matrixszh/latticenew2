import { NextResponse, NextRequest } from "next/server";
import { getBase, TABLE_EVENTS } from "@/lib/airtable";

type ParamsPromise = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const base = getBase();
    const record = await base(TABLE_EVENTS).find(id);
    return NextResponse.json({ data: { id: record.id, ...record.fields } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const fields = { ...body };
    if (fields.Lead && typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    const base = getBase();
    const updated = await base(TABLE_EVENTS).update(
      [{ id, fields }],
      { typecast: true }
    );
    const data = updated.map((r) => ({ id: r.id, ...r.fields }))[0];
    return NextResponse.json({ data });
  } catch (e: unknown) {
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
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
