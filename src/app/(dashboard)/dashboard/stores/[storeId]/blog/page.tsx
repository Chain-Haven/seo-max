import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreBlogPosts } from "@/lib/actions/seo";
import { getStore } from "@/lib/actions/stores";
import { getContentCalendar } from "@/lib/actions/blog";
import { BlogPostSEOTable } from "@/components/seo/blog-post-seo-table";
import { ContentCalendar } from "@/components/blog/content-calendar";
import { ProductBlogGenerator } from "@/components/blog/product-blog-generator";
import { SEOStats } from "@/components/seo/seo-stats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, RefreshCw, Sparkles, Calendar, List, Package } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function BlogSEOPage({ params }: Props) {
  const { storeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: store } = await getStore(storeId);
  if (!store) {
    redirect("/dashboard/stores");
  }

  const posts = await getStoreBlogPosts(storeId);
  const { calendar } = await getContentCalendar(storeId);

  // Calculate stats
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const draftPosts = posts.filter((p) => p.status === "draft").length;
  const withMetaDescription = posts.filter((p) => p.meta_description).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/stores/${storeId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blog Content</h1>
            <p className="text-muted-foreground">{store.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Posts
          </Button>
          <Link href={`/dashboard/stores/${storeId}/blog/new`}>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Create Post
            </Button>
          </Link>
        </div>
      </div>

      <SEOStats
        items={[
          {
            label: "Total Posts",
            value: totalPosts,
            description: "Blog posts in system",
          },
          {
            label: "Published",
            value: publishedPosts,
            total: totalPosts,
            description: "Live on site",
          },
          {
            label: "Drafts",
            value: draftPosts,
            description: "Ready to edit",
          },
          {
            label: "SEO Ready",
            value: withMetaDescription,
            total: totalPosts,
            description: "With meta descriptions",
          },
        ]}
      />

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" />
            Generate from Products
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Content Calendar
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            All Posts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <ProductBlogGenerator 
            storeId={storeId} 
            storeName={store.name}
            isWooCommerce={store.platform === "woocommerce"}
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          {calendar && <ContentCalendar calendar={calendar} />}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <BlogPostSEOTable posts={posts} storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
