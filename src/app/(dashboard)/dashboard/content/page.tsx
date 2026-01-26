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
  FileText,
  Newspaper,
  Image,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle,
  Edit,
} from "lucide-react";

export default async function ContentPage() {
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

  // Get all stores for the organization
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, url")
    .eq("organization_id", membership.organization_id);

  // Get recent blog posts across all stores
  const { data: recentPosts } = await supabase
    .from("blog_posts")
    .select(`
      id,
      title,
      status,
      created_at,
      store_id,
      stores (name)
    `)
    .in("store_id", stores?.map(s => s.id) || [])
    .order("created_at", { ascending: false })
    .limit(10);

  // Get content counts
  const { count: blogCount } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })
    .in("store_id", stores?.map(s => s.id) || []);

  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .in("store_id", stores?.map(s => s.id) || []);

  const { count: pageCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .in("store_id", stores?.map(s => s.id) || []);

  const { count: draftCount } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })
    .in("store_id", stores?.map(s => s.id) || [])
    .eq("status", "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content</h1>
          <p className="text-muted-foreground">
            Manage all content across your stores
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blogCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all stores
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              With SEO data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Optimized pages
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Content */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Blog Posts</CardTitle>
            <CardDescription>
              Latest content across all your stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPosts && recentPosts.length > 0 ? (
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="font-medium line-clamp-1">{post.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(post.stores as unknown as { name: string })?.name}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge
                      variant={post.status === "published" ? "default" : "secondary"}
                    >
                      {post.status === "published" ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {post.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No blog posts yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first blog post from a store
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Create and manage content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Create New Content</p>
              <p className="text-sm text-muted-foreground">
                Select a store to create new blog posts with AI assistance
              </p>
            </div>
            
            {stores && stores.length > 0 ? (
              <div className="space-y-2">
                {stores.slice(0, 5).map((store) => (
                  <Link
                    key={store.id}
                    href={`/dashboard/stores/${store.id}/blog/new`}
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Plus className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{store.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Create blog post
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No stores connected yet
                </p>
                <Link href="/dashboard/stores/new">
                  <Button variant="outline" className="mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Store
                  </Button>
                </Link>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Store Content</p>
              <div className="grid grid-cols-2 gap-2">
                {stores?.slice(0, 4).map((store) => (
                  <Link key={store.id} href={`/dashboard/stores/${store.id}/blog`}>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Newspaper className="mr-2 h-3 w-3" />
                      {store.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content by Store */}
      <Card>
        <CardHeader>
          <CardTitle>Content by Store</CardTitle>
          <CardDescription>
            Manage content for each connected store
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stores && stores.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <Link key={store.id} href={`/dashboard/stores/${store.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {store.url}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No stores connected</p>
              <Link href="/dashboard/stores/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Store
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
