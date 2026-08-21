import { redirect } from "next/navigation";

export default async function DeadlinesCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  redirect(month ? `/juridico/prazos?month=${encodeURIComponent(month)}` : "/juridico/prazos");
}
