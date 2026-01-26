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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Sparkles,
  MoreHorizontal,
  Check,
  X,
  ExternalLink,
  Loader2,
  Send,
  Eye,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { updateBlogPostSEO } from "@/lib/actions/seo";
import { Tables } from "@/types/database";

type BlogPost = Tables<"blog_posts">;

interface BlogPostSEOTableProps {
  posts: BlogPost[];
  storeId: string;
}

export function BlogPostSEOTable({ posts, storeId }: BlogPostSEOTableProps) {
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    meta_title: "",
    meta_description: "",
    status: "draft" as "draft" | "pending" | "published",
  });

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setEditForm({
      title: post.title || "",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      status: post.status,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPost) return;

    setIsSaving(true);
    try {
      const result = await updateBlogPostSEO(editingPost.id, editForm);

      if (result.success) {
        toast.success("Blog post updated successfully");
        setIsDialogOpen(false);
        setEditingPost(null);
      } else {
        toast.error(result.error || "Failed to update blog post");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge variant="default" className="bg-green-600">
            <Check className="mr-1 h-3 w-3" />
            Published
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Eye className="mr-1 h-3 w-3" />
            Draft
          </Badge>
        );
    }
  };

  const getSEOBadge = (post: BlogPost) => {
    const hasTitle = !!post.meta_title;
    const hasDescription = !!post.meta_description;

    if (hasTitle && hasDescription) {
      return <Badge variant="default">SEO Ready</Badge>;
    }
    if (hasTitle || hasDescription) {
      return <Badge variant="secondary">Partial</Badge>;
    }
    return <Badge variant="destructive">Missing</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Meta Title</TableHead>
              <TableHead>Meta Description</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24">SEO</TableHead>
              <TableHead className="w-28">Published</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No blog posts yet. Create one or sync from your WordPress
                    site.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="font-medium max-w-[200px] truncate">
                      {post.title}
                    </div>
                    {post.external_id && (
                      <div className="text-xs text-muted-foreground">
                        ID: {post.external_id}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    {post.meta_title ? (
                      <span className="text-sm truncate block">
                        {post.meta_title}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {post.meta_description ? (
                      <span className="text-sm truncate block">
                        {post.meta_description}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(post.status)}</TableCell>
                  <TableCell>{getSEOBadge(post)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(post.published_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(post)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Post
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate SEO
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {post.status !== "published" && (
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Publish Now
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Post
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
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>Update post details and SEO</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter post title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    status: value as "draft" | "pending" | "published",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Meta Title</label>
                <Button type="button" variant="ghost" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
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
                <Button type="button" variant="ghost" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
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
                {editForm.meta_title || editForm.title || "Blog Post Title"}
              </div>
              <div className="text-green-700 text-sm">
                example.com/blog/{editingPost?.external_id || "post-slug"}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {editForm.meta_description ||
                  "Add a meta description to see how your post will appear in search results."}
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
