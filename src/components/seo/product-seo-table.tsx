"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Sparkles,
  MoreHorizontal,
  Check,
  X,
  Image,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateProductSEO,
  generateProductMetaTitle,
  generateProductMetaDescription,
  bulkUpdateProductsSEO,
} from "@/lib/actions/seo";
import { Tables } from "@/types/database";

type Product = Tables<"products">;

interface ProductSEOTableProps {
  products: Product[];
  storeId: string;
}

export function ProductSEOTable({ products, storeId }: ProductSEOTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    meta_title: "",
    meta_description: "",
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      meta_title: product.meta_title || "",
      meta_description: product.meta_description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const result = await updateProductSEO(editingProduct.id, editForm);

      if (result.success) {
        toast.success("Product SEO updated successfully");
        setIsDialogOpen(false);
        setEditingProduct(null);
      } else {
        toast.error(result.error || "Failed to update product SEO");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (!editingProduct) return;

    setIsGenerating("title");
    try {
      const result = await generateProductMetaTitle(editingProduct.id);

      if (result.success && result.metaTitle) {
        setEditForm((prev) => ({ ...prev, meta_title: result.metaTitle! }));
        toast.success("Meta title generated!");
      } else {
        toast.error(result.error || "Failed to generate meta title");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateDescription = async () => {
    if (!editingProduct) return;

    setIsGenerating("description");
    try {
      const result = await generateProductMetaDescription(editingProduct.id);

      if (result.success && result.metaDescription) {
        setEditForm((prev) => ({
          ...prev,
          meta_description: result.metaDescription!,
        }));
        toast.success("Meta description generated!");
      } else {
        toast.error(result.error || "Failed to generate meta description");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleBulkGenerateTitles = async () => {
    const selectedIds = Array.from(selectedProducts);
    if (selectedIds.length === 0) {
      toast.error("Please select products first");
      return;
    }

    toast.info(`Generating meta titles for ${selectedIds.length} products...`);

    const updates = [];
    for (const id of selectedIds) {
      const result = await generateProductMetaTitle(id);
      if (result.success && result.metaTitle) {
        updates.push({ id, meta_title: result.metaTitle });
      }
    }

    if (updates.length > 0) {
      await bulkUpdateProductsSEO(updates);
      toast.success(`Generated titles for ${updates.length} products`);
    }
  };

  const getStatusBadge = (product: Product) => {
    const hasTitle = !!product.meta_title;
    const hasDescription = !!product.meta_description;

    if (hasTitle && hasDescription) {
      return <Badge variant="default">Complete</Badge>;
    }
    if (hasTitle || hasDescription) {
      return <Badge variant="secondary">Partial</Badge>;
    }
    return <Badge variant="destructive">Missing</Badge>;
  };

  const getImageCount = (product: Product) => {
    const images = product.images as Array<unknown> | null;
    return images?.length || 0;
  };

  return (
    <div className="space-y-4">
      {selectedProducts.size > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedProducts.size} selected
          </span>
          <Button size="sm" variant="outline" onClick={handleBulkGenerateTitles}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Titles
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedProducts(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedProducts.size === products.length &&
                    products.length > 0
                  }
                  onCheckedChange={(checked) =>
                    handleSelectAll(checked as boolean)
                  }
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Meta Title</TableHead>
              <TableHead>Meta Description</TableHead>
              <TableHead className="w-20">Images</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No products synced yet. Install the WordPress plugin to sync
                    your products.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={(checked) =>
                        handleSelectProduct(product.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {product.external_id}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {product.meta_title ? (
                      <span className="text-sm truncate block">
                        {product.meta_title}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {product.meta_description ? (
                      <span className="text-sm truncate block">
                        {product.meta_description}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getImageCount(product)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(product)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit SEO
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product SEO</DialogTitle>
            <DialogDescription>
              {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Meta Title</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateTitle}
                  disabled={isGenerating === "title"}
                >
                  {isGenerating === "title" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Input
                value={editForm.meta_title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, meta_title: e.target.value }))
                }
                placeholder="Enter meta title..."
              />
              <p className="text-xs text-muted-foreground">
                {editForm.meta_title.length}/60 characters
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Meta Description</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating === "description"}
                >
                  {isGenerating === "description" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={editForm.meta_description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    meta_description: e.target.value,
                  }))
                }
                placeholder="Enter meta description..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {editForm.meta_description.length}/160 characters
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Preview</p>
              <div className="text-blue-600 text-lg">
                {editForm.meta_title || editingProduct?.name || "Page Title"}
              </div>
              <div className="text-green-700 text-sm">
                example.com/product/{editingProduct?.external_id}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {editForm.meta_description ||
                  "Add a meta description to see how your product will appear in search results."}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
