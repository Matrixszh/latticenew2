import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY ?? "";
const baseId = process.env.AIRTABLE_BASE_ID ?? "";

export const TABLE_LEADS = process.env.AIRTABLE_TABLE_LEADS ?? "Leads";
export const TABLE_EVENTS = process.env.AIRTABLE_TABLE_EVENTS ?? "Events";
export const TABLE_AUTOMATIONS = process.env.AIRTABLE_TABLE_AUTOMATIONS ?? "Automations";

export function getBase() {
  if (!apiKey || !baseId) {
    throw new Error("Missing Airtable configuration: set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local");
  }
  const airtable = new Airtable({ apiKey });
  return airtable.base(baseId);
}
