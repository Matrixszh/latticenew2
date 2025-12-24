export type LeadRecord = {
  id: string;
  Name: string;
  Email?: string;
  Phone?: string;
  Status?: "New" | "Contacted" | "Qualified" | "Won" | "Lost";
  Source?: string;
  Notes?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};

export type EventRecord = {
  id: string;
  Title: string;
  Description?: string;
  Lead?: string | string[];
  StartDateTime?: string;
  EndDateTime?: string;
  Location?: string;
  Status?: "Scheduled" | "Completed" | "Cancelled";
  CalendarEventId?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};

export type AutomationRecord = {
  id: string;
  Name: string;
  Lead?: string | string[];
  Event?: string | string[];
  Channel?: "Email" | "SMS" | "Both";
  OffsetMinutes?: number;
  Active?: boolean;
  LastTriggeredAt?: string;
  TemplateSubject?: string;
  TemplateBody?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};

