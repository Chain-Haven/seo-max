import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImprovementsDashboard } from "@/components/dashboard/improvements-dashboard";
import { getSystemHealth, getImprovementQueue, getImprovementHistory } from "@/lib/actions/continuous-improvement";

export default async function ImprovementsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get data for the dashboard
  const [healthResult, queueResult, historyResult] = await Promise.all([
    getSystemHealth(),
    getImprovementQueue(),
    getImprovementHistory(30),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Autonomous Improvements</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered continuous improvement system for SEO Max
        </p>
      </div>

      <ImprovementsDashboard
        health={healthResult.data}
        queue={queueResult.data || []}
        history={historyResult.data || []}
      />
    </div>
  );
}
