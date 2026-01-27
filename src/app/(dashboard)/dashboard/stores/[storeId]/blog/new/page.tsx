import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { EnhancedBlogCreator } from "@/components/blog/enhanced-blog-creator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ product?: string }>;
}

export default async function NewBlogPostPage({ params, searchParams }: Props) {
  const { storeId } = await params;
  const { product: productId } = await searchParams;
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

  // Get product context if provided
  let productContext = undefined;
  if (productId) {
    const { data: product } = await supabase
      .from("products")
      .select("name, category, description")
      .eq("id", productId)
      .single();
    
    if (product) {
      productContext = {
        name: product.name,
        category: product.category || "General",
        description: product.description || "",
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/stores/${storeId}/blog`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Create Blog Post
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Enhanced
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              {store.name}
              {productContext && ` • About: ${productContext.name}`}
            </p>
          </div>
        </div>
      </div>

      <EnhancedBlogCreator 
        storeId={storeId} 
        storeName={store.name} 
        productContext={productContext}
      />
    </div>
  );
}
