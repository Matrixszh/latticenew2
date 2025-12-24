import { NextResponse, NextRequest } from "next/server";
import { getBase, TABLE_AUTOMATIONS } from "@/lib/airtable";

type ParamsPromise = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    const base = getBase();
    const record = await base(TABLE_AUTOMATIONS).find(id);
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
    const fields: Record<string, unknown> = { ...body };
    if (typeof fields.Lead === "string") {
      fields.Lead = [fields.Lead];
    }
    if (typeof fields.Event === "string") {
      fields.Event = [fields.Event];
    }
    const base = getBase();
    let updated;
    try {
      updated = await base(TABLE_AUTOMATIONS).update([{ id, fields }], { typecast: true });
    } catch (err) {
      if (fields.Event) {
        const { Event, ...fallback } = fields;
        updated = await base(TABLE_AUTOMATIONS).update([{ id, fields: fallback }], { typecast: true });
      } else {
        throw err;
      }
    }
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
    await base(TABLE_AUTOMATIONS).destroy([id]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
