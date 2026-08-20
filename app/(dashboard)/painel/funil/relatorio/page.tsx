import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { sellerSalesHrefWithParams } from "@/lib/seller/seller-sales";
import { PipelineReportView } from "../PipelineReportView";

export default async function PipelineReportPage(
  props: {
    searchParams?: Promise<{ months?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, is_admin")
    .eq("id", user!.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  if (workspaceKey === "autonomous_seller") {
    redirect(sellerSalesHrefWithParams("numeros", { months: searchParams?.months }));
  }

  return <PipelineReportView months={searchParams?.months} />;
}
