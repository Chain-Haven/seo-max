import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  FileText,
  Image,
  MessageSquare,
  Wand2,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  PenTool,
  Settings,
  Activity,
} from "lucide-react";

export default async function AIAssistantPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard/stores/new");
  }

  // Get stores for AI actions
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, url")
    .eq("organization_id", membership.organization_id);

  const aiFeatures = [
    {
      title: "SEO Content Analyzer",
      description: "Analyze your content for SEO effectiveness and get AI-powered improvement suggestions",
      icon: Target,
      href: "/dashboard/seo",
      color: "text-blue-500",
    },
    {
      title: "Meta Generator",
      description: "Generate optimized meta titles and descriptions using AI",
      icon: FileText,
      href: "/dashboard/seo",
      color: "text-green-500",
    },
    {
      title: "Schema Markup Generator",
      description: "Create structured data schemas for rich search results",
      icon: Zap,
      href: "/dashboard/seo",
      color: "text-yellow-500",
    },
    {
      title: "Answer Engine Optimization",
      description: "Optimize content for AI search engines and featured snippets",
      icon: MessageSquare,
      href: "/dashboard/seo",
      color: "text-purple-500",
    },
    {
      title: "Internal Linking Tool",
      description: "AI-powered suggestions for internal link opportunities",
      icon: TrendingUp,
      href: "/dashboard/seo",
      color: "text-orange-500",
    },
    {
      title: "Blog Post Generator",
      description: "Generate full blog posts with AI, including images and FAQs",
      icon: PenTool,
      href: stores?.[0] ? `/dashboard/stores/${stores[0].id}/blog/new` : "/dashboard/stores",
      color: "text-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Leverage AI to supercharge your SEO efforts
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Powered by GPT-4 & Claude
        </Badge>
      </div>

      {/* Autonomous Improvements Banner */}
      <Link href="/dashboard/ai/improvements">
        <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 hover:border-primary/60 transition-colors cursor-pointer">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600">
                <Activity className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Autonomous Improvements</h3>
                  <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white">AI-Powered</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI continuously detects issues, prioritizes fixes, and implements improvements automatically every day
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* AI Capabilities */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {aiFeatures.map((feature) => (
          <Link key={feature.title} href={feature.href}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Quick AI Actions
            </CardTitle>
            <CardDescription>
              Common AI-powered tasks for your stores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/seo">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Generate Meta Descriptions</p>
                    <p className="text-xs text-muted-foreground">
                      Bulk generate optimized meta descriptions
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/dashboard/seo">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Image className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Generate Alt Texts</p>
                    <p className="text-xs text-muted-foreground">
                      AI-powered image alt text generation
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/dashboard/seo">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="font-medium text-sm">Analyze Content</p>
                    <p className="text-xs text-muted-foreground">
                      Get AI suggestions for content improvement
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/dashboard/seo">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm">Generate Schema</p>
                    <p className="text-xs text-muted-foreground">
                      Create structured data for rich snippets
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Create AI Content
            </CardTitle>
            <CardDescription>
              Generate blog posts for your stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stores && stores.length > 0 ? (
              <div className="space-y-2">
                {stores.map((store) => (
                  <Link
                    key={store.id}
                    href={`/dashboard/stores/${store.id}/blog/new`}
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{store.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Create AI blog post
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No stores connected</p>
                <Link href="/dashboard/stores/new">
                  <Button className="mt-4">Add Your First Store</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Tips */}
      <Card>
        <CardHeader>
          <CardTitle>AI Tips</CardTitle>
          <CardDescription>
            Get the most out of AI-powered SEO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Provide Context</h4>
              <p className="text-sm text-muted-foreground">
                The more context you provide (keywords, audience, tone), the better the AI output will be.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Review & Edit</h4>
              <p className="text-sm text-muted-foreground">
                AI-generated content is a starting point. Always review and add your unique perspective.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Iterate</h4>
              <p className="text-sm text-muted-foreground">
                Don't settle for the first result. Regenerate or adjust parameters for better results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
