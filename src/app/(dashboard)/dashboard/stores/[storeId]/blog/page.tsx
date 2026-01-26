import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreBlogPosts } from "@/lib/actions/seo";
import { getStore } from "@/lib/actions/stores";
import { BlogPostSEOTable } from "@/components/seo/blog-post-seo-table";
import { SEOStats } from "@/components/seo/seo-stats";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
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

  // Calculate stats
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const withMetaTitle = posts.filter((p) => p.meta_title).length;
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
            <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
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
              <Plus className="mr-2 h-4 w-4" />
              Create Post
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
            description: "Published blog posts",
          },
          {
            label: "Meta Titles",
            value: withMetaTitle,
            total: totalPosts,
            description: "Posts with meta titles",
          },
          {
            label: "Meta Descriptions",
            value: withMetaDescription,
            total: totalPosts,
            description: "Posts with meta descriptions",
          },
        ]}
      />

      <BlogPostSEOTable posts={posts} storeId={storeId} />
    </div>
  );
}
