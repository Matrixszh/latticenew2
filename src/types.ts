export type LeadStatus = "New" | "Contacted" | "Qualified" | "Won" | "Lost";
export type EventStatus = "Scheduled" | "Completed" | "Cancelled";
export type Channel = "Email" | "SMS" | "Both";

export interface Lead {
  id: string;
  Name: string;
  Email?: string;
  Phone?: string;
  Status?: LeadStatus;
  Source?: string;
  Notes?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface EventRecord {
  id: string;
  Title: string;
  Description?: string;
  Lead?: string;
  StartDateTime?: string;
  EndDateTime?: string;
  Location?: string;
  Status?: EventStatus;
  CalendarEventId?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Automation {
  id: string;
  Name: string;
  Lead?: string;
  Event?: string;
  Channel?: Channel;
  OffsetMinutes?: number;
  Active?: boolean;
  LastTriggeredAt?: string;
  TemplateSubject?: string;
  TemplateBody?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

