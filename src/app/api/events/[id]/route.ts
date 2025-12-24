import { NextResponse } from "next/server";
import { getBase, TABLE_EVENTS } from "@/lib/airtable";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const base = getBase();
    const record = await base(TABLE_EVENTS).find(params.id);
    return NextResponse.json({ data: { id: record.id, ...record.fields } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const fields = { ...body };
    if (fields.Lead && typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    const base = getBase();
    const updated = await base(TABLE_EVENTS).update(
      [{ id: params.id, fields }],
      { typecast: true }
    );
    const data = updated.map((r) => ({ id: r.id, ...r.fields }))[0];
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const base = getBase();
    await base(TABLE_EVENTS).destroy([params.id]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
