"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileEdit, Image, Share2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateMeta, bulkGenerateAltText, bulkCreateRedirects, bulkGenerateSchema } from "@/lib/actions/bulk-operations";

interface BulkOperationsDashboardProps {
  storeId: string;
  productsNeedingMeta: Array<{ id: string; name: string; meta_title: string | null; meta_description: string | null }>;
  imagesNeedingAlt: string[];
}

export function BulkOperationsDashboard({
  storeId,
  productsNeedingMeta,
  imagesNeedingAlt,
}: BulkOperationsDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleBulkGenerateMeta = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Select products first");
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < selectedProducts.length; i += batchSize) {
        const batch = selectedProducts.slice(i, i + batchSize);
        
        // Generate meta for each
        const updates = batch.map((id) => ({
          entityId: id,
          metaTitle: "Generated title", // Would come from AI
          metaDescription: "Generated description",
        }));

        await bulkUpdateMeta(storeId, "product", updates);

        setProgress(((i + batch.length) / selectedProducts.length) * 100);
      }

      toast.success(`Generated meta for ${selectedProducts.length} products!`);
      setSelectedProducts([]);
    } catch {
      toast.error("Bulk generation failed");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleBulkGenerateAltText = async () => {
    if (selectedImages.length === 0) {
      toast.error("Select images first");
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const result = await bulkGenerateAltText(storeId, selectedImages);
      
      if (result.data) {
        toast.success(`Generated alt text for ${result.data.generated} images!`);
        setSelectedImages([]);
      } else {
        toast.error(result.error || "Generation failed");
      }
    } catch {
      toast.error("Bulk generation failed");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const toggleProduct = (id: string) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === productsNeedingMeta.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productsNeedingMeta.map((p) => p.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileEdit className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{productsNeedingMeta.length}</div>
                <div className="text-sm text-muted-foreground">Need Meta Data</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Image className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{imagesNeedingAlt.length}</div>
                <div className="text-sm text-muted-foreground">Need Alt Text</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{selectedProducts.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Meta Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Bulk Meta Data Generation
          </CardTitle>
          <CardDescription>
            Generate SEO-optimized titles and descriptions for multiple products at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {productsNeedingMeta.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllProducts}
                >
                  {selectedProducts.length === productsNeedingMeta.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  onClick={handleBulkGenerateMeta}
                  disabled={isLoading || selectedProducts.length === 0}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate for {selectedProducts.length} Products
                </Button>
              </div>

              {isLoading && progress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {productsNeedingMeta.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 border rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleProduct(product.id)}
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex gap-2 mt-1">
                          {!product.meta_title && (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              No Title
                            </Badge>
                          )}
                          {!product.meta_description && (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              No Description
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>All products have meta data!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Alt Text Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Bulk Alt Text Generation
          </CardTitle>
          <CardDescription>
            Generate descriptive alt text for product images
          </CardDescription>
        </CardHeader>
        <CardContent>
          {imagesNeedingAlt.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {imagesNeedingAlt.length} products have images without alt text
                </p>
                <Button
                  onClick={handleBulkGenerateAltText}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate All Alt Text
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>All images have alt text!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
