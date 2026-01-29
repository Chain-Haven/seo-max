"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Sparkles,
  Loader2,
  Search,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Wand2,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import {
  scanStoreProducts,
  generateBlogTopics,
  generateBlogFromProduct,
  batchGenerateProductBlogs,
  getProductCategories,
  type ProductForBlog,
  type BlogTopicSuggestion,
  type GeneratedProductBlog,
} from "@/lib/actions/product-blog-generator";

interface Props {
  storeId: string;
  storeName: string;
  isWooCommerce: boolean;
}

export function ProductBlogGenerator({ storeId, storeName, isWooCommerce }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"scan" | "topics" | "generate" | "complete">("scan");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Products state
  const [products, setProducts] = useState<ProductForBlog[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Topics state
  const [topics, setTopics] = useState<BlogTopicSuggestion[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  // Generation state
  const [generatedBlogs, setGeneratedBlogs] = useState<GeneratedProductBlog[]>([]);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateImages, setGenerateImages] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [storeId]);

  const loadCategories = async () => {
    const result = await getProductCategories(storeId);
    if (result.data) {
      setCategories(result.data);
    }
  };

  const handleScanProducts = async () => {
    setIsLoading(true);
    setLoadingMessage("Scanning products...");

    try {
      const result = await scanStoreProducts(storeId, {
        limit: 50,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });

      if (result.data) {
        setProducts(result.data);
        // Pre-select first 5 products
        const initialSelection = new Set(result.data.slice(0, 5).map((p) => p.id));
        setSelectedProductIds(initialSelection);
        toast.success(`Found ${result.data.length} products`);
      } else {
        toast.error(result.error || "Failed to scan products");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleGenerateTopics = async () => {
    if (selectedProductIds.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Generating blog topic ideas...");

    try {
      const selectedProducts = products.filter((p) => selectedProductIds.has(p.id));
      const result = await generateBlogTopics(storeId, selectedProducts);

      if (result.data) {
        setTopics(result.data);
        // Pre-select high value topics
        const highValueIds = new Set(
          result.data.filter((t) => t.estimatedValue === "high").map((t) => t.id)
        );
        setSelectedTopicIds(highValueIds);
        setStep("topics");
        toast.success(`Generated ${result.data.length} blog ideas`);
      } else {
        toast.error(result.error || "Failed to generate topics");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleGenerateBlogs = async () => {
    if (selectedTopicIds.size === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    setIsLoading(true);
    setStep("generate");
    setGenerateProgress(0);
    setLoadingMessage("Generating blog posts...");

    try {
      const selectedTopics = topics.filter((t) => selectedTopicIds.has(t.id));
      const totalTopics = selectedTopics.length;

      const result = await batchGenerateProductBlogs(storeId, selectedTopics, {
        generateImages,
        autoSave,
        autoPublish: false,
      });

      const generated = result.results
        .filter((r) => r.blog)
        .map((r) => r.blog as GeneratedProductBlog);

      setGeneratedBlogs(generated);
      setGenerateProgress(100);
      setStep("complete");

      toast.success(
        `Generated ${result.totalGenerated} blogs${
          autoSave ? `, saved ${result.totalSaved} drafts` : ""
        }`
      );

      if (result.errors > 0) {
        toast.warning(`${result.errors} failed to generate`);
      }
    } catch {
      toast.error("An error occurred");
      setStep("topics");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleSelectAllTopics = () => {
    if (selectedTopicIds.size === topics.length) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(topics.map((t) => t.id)));
    }
  };

  const getTypeColor = (type: BlogTopicSuggestion["type"]) => {
    const colors: Record<string, string> = {
      review: "bg-purple-100 text-purple-800",
      guide: "bg-blue-100 text-blue-800",
      comparison: "bg-orange-100 text-orange-800",
      howto: "bg-green-100 text-green-800",
      listicle: "bg-pink-100 text-pink-800",
      benefits: "bg-cyan-100 text-cyan-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getValueColor = (value: BlogTopicSuggestion["estimatedValue"]) => {
    const colors: Record<string, string> = {
      high: "bg-green-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-gray-400 text-white",
    };
    return colors[value];
  };

  if (!isWooCommerce) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">WooCommerce Required</h3>
          <p className="text-muted-foreground">
            Product-based blog generation is only available for WooCommerce stores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {["scan", "topics", "generate", "complete"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["scan", "topics", "generate", "complete"].indexOf(step) > i
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {["scan", "topics", "generate", "complete"].indexOf(step) > i ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}
            >
              {s === "scan"
                ? "Select Products"
                : s === "topics"
                ? "Choose Topics"
                : s === "generate"
                ? "Generate"
                : "Complete"}
            </span>
            {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Scan Products */}
      {step === "scan" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Products for Blog Generation
            </CardTitle>
            <CardDescription>
              Choose which products to create blog posts about
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleScanProducts} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Scan Products
              </Button>
            </div>

            {/* Products Table */}
            {products.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedProductIds.size} of {products.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSelectAllProducts}>
                    {selectedProductIds.size === products.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="border rounded-md max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProductIds.has(product.id)}
                              onCheckedChange={(checked) => {
                                const newSelection = new Set(selectedProductIds);
                                if (checked) {
                                  newSelection.add(product.id);
                                } else {
                                  newSelection.delete(product.id);
                                }
                                setSelectedProductIds(newSelection);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {product.description?.substring(0, 60) || "No description"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.categories.length > 0 ? (
                              <Badge variant="secondary">{product.categories[0]}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.price ? `$${product.price}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleGenerateTopics}
                    disabled={selectedProductIds.size === 0 || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="mr-2 h-4 w-4" />
                    )}
                    Generate Topic Ideas ({selectedProductIds.size})
                  </Button>
                </div>
              </>
            )}

            {products.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Click "Scan Products" to load products from your store
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">{loadingMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Topics */}
      {step === "topics" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Select Blog Topics
            </CardTitle>
            <CardDescription>
              Choose which blog posts to generate. High-value topics are pre-selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedTopicIds.size} of {topics.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("scan")}>
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAllTopics}>
                  {selectedTopicIds.size === topics.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>

            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTopicIds.has(topic.id)}
                          onCheckedChange={(checked) => {
                            const newSelection = new Set(selectedTopicIds);
                            if (checked) {
                              newSelection.add(topic.id);
                            } else {
                              newSelection.delete(topic.id);
                            }
                            setSelectedTopicIds(newSelection);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{topic.title}</p>
                          <p className="text-xs text-muted-foreground">{topic.description}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {topic.targetKeyword}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{topic.productName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(topic.type)}>{topic.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getValueColor(topic.estimatedValue)}>
                          {topic.estimatedValue}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6 pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={generateImages}
                  onCheckedChange={(c) => setGenerateImages(!!c)}
                />
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">Generate Images</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={autoSave}
                  onCheckedChange={(c) => setAutoSave(!!c)}
                />
                <FileText className="h-4 w-4" />
                <span className="text-sm">Auto-save as Drafts</span>
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerateBlogs}
                disabled={selectedTopicIds.size === 0 || isLoading}
                className="bg-gradient-to-r from-primary to-purple-600"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate {selectedTopicIds.size} Blog Posts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generating */}
      {step === "generate" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Generating Blog Posts</h3>
              <p className="text-muted-foreground mb-4">{loadingMessage}</p>
              <Progress value={generateProgress} className="max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Generation Complete
            </CardTitle>
            <CardDescription>
              Successfully generated {generatedBlogs.length} blog posts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              {generatedBlogs.map((blog, i) => (
                <div key={i} className="p-4 border-b last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{blog.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Product: {blog.productName} • Keyword: {blog.keyword}
                      </p>
                      {blog.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {blog.images.map((img, j) => (
                            <img
                              key={j}
                              src={img.url}
                              alt={img.altText}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {autoSave && (
                      <Badge className="bg-green-100 text-green-800">Saved</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("scan");
                  setProducts([]);
                  setTopics([]);
                  setGeneratedBlogs([]);
                  setSelectedProductIds(new Set());
                  setSelectedTopicIds(new Set());
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate More
              </Button>
              <Button onClick={() => router.push(`/dashboard/stores/${storeId}/blog`)}>
                View All Blog Posts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
