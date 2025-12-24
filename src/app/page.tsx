import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">CRM</h1>
        <div className="mt-6 grid gap-3">
          <Link className="underline" href="/leads">Leads</Link>
          <Link className="underline" href="/events">Events</Link>
          <Link className="underline" href="/calendar">Calendar</Link>
          <Link className="underline" href="/automations">Automations</Link>
        </div>
      </main>
    </div>
  );
}
