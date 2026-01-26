import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOAnalyzerTool } from "@/components/seo-tools/seo-analyzer-tool";
import { AEOOptimizerTool } from "@/components/seo-tools/aeo-optimizer-tool";
import { SchemaGeneratorTool } from "@/components/seo-tools/schema-generator-tool";
import { ContentImprovementTool } from "@/components/seo-tools/content-improvement-tool";
import {
  Search,
  MessageSquare,
  Code,
  Sparkles,
} from "lucide-react";

export default async function SEOToolsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's organization and stores
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, url")
    .eq("organization_id", membership.organization_id)
    .eq("status", "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO Tools</h1>
        <p className="text-muted-foreground">
          Advanced AI-powered tools for SEO and Answer Engine Optimization
        </p>
      </div>

      <Tabs defaultValue="analyzer" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyzer" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">SEO Analyzer</span>
          </TabsTrigger>
          <TabsTrigger value="aeo" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AEO Tools</span>
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Schema</span>
          </TabsTrigger>
          <TabsTrigger value="improve" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Improve</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyzer">
          <SEOAnalyzerTool stores={stores || []} />
        </TabsContent>

        <TabsContent value="aeo">
          <AEOOptimizerTool stores={stores || []} />
        </TabsContent>

        <TabsContent value="schema">
          <SchemaGeneratorTool stores={stores || []} />
        </TabsContent>

        <TabsContent value="improve">
          <ContentImprovementTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}
