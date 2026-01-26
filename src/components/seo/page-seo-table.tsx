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
  Home,
  FileText,
  Phone,
  Shield,
  Tag,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  updatePageSEO,
  generatePageMetaTitle,
  generatePageMetaDescription,
} from "@/lib/actions/seo";
import { Tables } from "@/types/database";

type Page = Tables<"pages">;

interface PageSEOTableProps {
  pages: Page[];
  storeId: string;
}

const pageTypeIcons: Record<string, React.ReactNode> = {
  homepage: <Home className="h-4 w-4" />,
  about: <FileText className="h-4 w-4" />,
  contact: <Phone className="h-4 w-4" />,
  policy: <Shield className="h-4 w-4" />,
  category: <Tag className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

export function PageSEOTable({ pages, storeId }: PageSEOTableProps) {
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    meta_title: "",
    meta_description: "",
  });

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setEditForm({
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPage) return;

    setIsSaving(true);
    try {
      const result = await updatePageSEO(editingPage.id, editForm);

      if (result.success) {
        toast.success("Page SEO updated successfully");
        setIsDialogOpen(false);
        setEditingPage(null);
      } else {
        toast.error(result.error || "Failed to update page SEO");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (!editingPage) return;

    setIsGenerating("title");
    try {
      const result = await generatePageMetaTitle(editingPage.id);

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
    if (!editingPage) return;

    setIsGenerating("description");
    try {
      const result = await generatePageMetaDescription(editingPage.id);

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

  const getStatusBadge = (page: Page) => {
    const hasTitle = !!page.meta_title;
    const hasDescription = !!page.meta_description;

    if (hasTitle && hasDescription) {
      return <Badge variant="default">Complete</Badge>;
    }
    if (hasTitle || hasDescription) {
      return <Badge variant="secondary">Partial</Badge>;
    }
    return <Badge variant="destructive">Missing</Badge>;
  };

  const getPageTypeBadge = (pageType: string) => {
    const colors: Record<string, string> = {
      homepage: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      about: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      contact: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      policy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      category: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[pageType] || colors.other}`}
      >
        {pageTypeIcons[pageType]}
        {pageType}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead>Meta Title</TableHead>
              <TableHead>Meta Description</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No pages synced yet. Install the WordPress plugin to sync
                    your pages.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <div className="font-medium">{page.title}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {page.external_id}
                    </div>
                  </TableCell>
                  <TableCell>{getPageTypeBadge(page.page_type)}</TableCell>
                  <TableCell className="max-w-[200px]">
                    {page.meta_title ? (
                      <span className="text-sm truncate block">
                        {page.meta_title}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {page.meta_description ? (
                      <span className="text-sm truncate block">
                        {page.meta_description}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(page)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(page)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit SEO
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Page
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
            <DialogTitle>Edit Page SEO</DialogTitle>
            <DialogDescription>{editingPage?.title}</DialogDescription>
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
              <p className="text-sm font-medium mb-2">Search Preview</p>
              <div className="text-blue-600 text-lg">
                {editForm.meta_title || editingPage?.title || "Page Title"}
              </div>
              <div className="text-green-700 text-sm">
                example.com/page/{editingPage?.external_id}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {editForm.meta_description ||
                  "Add a meta description to see how your page will appear in search results."}
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
