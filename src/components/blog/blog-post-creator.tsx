"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Loader2,
  Wand2,
  FileText,
  Eye,
  Save,
  Send,
  RefreshCw,
  Lightbulb,
  ListChecks,
  PenTool,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateTopicIdeas,
  generateOutlineFromTopic,
  generateBlogPostContent,
  saveBlogPost,
  publishToWordPress,
} from "@/lib/actions/blog";
import type { BlogOutline, GeneratedBlogPost } from "@/lib/ai/blog";

interface BlogPostCreatorProps {
  storeId: string;
  storeName: string;
}

type Step = "topics" | "outline" | "content" | "review";

interface BlogTopic {
  title: string;
  description: string;
  targetKeywords: string[];
  searchIntent: string;
  estimatedDifficulty: string;
  relevanceScore: number;
}

export function BlogPostCreator({ storeId, storeName }: BlogPostCreatorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("topics");
  const [isLoading, setIsLoading] = useState(false);

  // Topic discovery
  const [niche, setNiche] = useState("");
  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(null);

  // Outline
  const [outline, setOutline] = useState<BlogOutline | null>(null);
  const [customKeywords, setCustomKeywords] = useState("");

  // Content
  const [generatedPost, setGeneratedPost] = useState<GeneratedBlogPost | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedMetaTitle, setEditedMetaTitle] = useState("");
  const [editedMetaDescription, setEditedMetaDescription] = useState("");

  // Generate topic ideas
  const handleGenerateTopics = async () => {
    if (!niche.trim()) {
      toast.error("Please enter your store's niche or industry");
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateTopicIdeas(storeId, niche, 5);
      if (result.success && result.topics) {
        setTopics(result.topics);
        toast.success(`Generated ${result.topics.length} topic ideas!`);
      } else {
        toast.error(result.error || "Failed to generate topics");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Select topic and generate outline
  const handleSelectTopic = async (topic: BlogTopic) => {
    setSelectedTopic(topic);
    setIsLoading(true);

    try {
      const keywords = customKeywords
        ? customKeywords.split(",").map((k) => k.trim())
        : topic.targetKeywords;

      const result = await generateOutlineFromTopic(storeId, topic.title, keywords);

      if (result.success && result.outline) {
        setOutline(result.outline);
        setCurrentStep("outline");
        toast.success("Outline generated!");
      } else {
        toast.error(result.error || "Failed to generate outline");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate full content
  const handleGenerateContent = async () => {
    if (!outline) return;

    setIsLoading(true);
    try {
      const result = await generateBlogPostContent(storeId, outline);

      if (result.success && result.post) {
        setGeneratedPost(result.post);
        setEditedContent(result.post.content + "\n\n" + result.post.faqSection);
        setEditedTitle(result.post.title);
        setEditedMetaTitle(result.post.metaTitle);
        setEditedMetaDescription(result.post.metaDescription);
        setCurrentStep("content");
        toast.success("Blog post generated!");
      } else {
        toast.error(result.error || "Failed to generate content");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Save as draft
  const handleSaveAsDraft = async () => {
    setIsLoading(true);
    try {
      const result = await saveBlogPost(storeId, {
        title: editedTitle,
        content: editedContent,
        meta_title: editedMetaTitle,
        meta_description: editedMetaDescription,
        schema_markup: generatedPost?.faqSchema,
        status: "draft",
      });

      if (result.success) {
        toast.success("Saved as draft!");
        router.push(`/dashboard/stores/${storeId}/blog`);
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Publish to WordPress
  const handlePublish = async () => {
    setIsLoading(true);
    try {
      // First save
      const saveResult = await saveBlogPost(storeId, {
        title: editedTitle,
        content: editedContent,
        meta_title: editedMetaTitle,
        meta_description: editedMetaDescription,
        schema_markup: generatedPost?.faqSchema,
        status: "pending",
      });

      if (!saveResult.success || !saveResult.post) {
        toast.error(saveResult.error || "Failed to save");
        return;
      }

      // Then publish
      const publishResult = await publishToWordPress(storeId, saveResult.post.id);

      if (publishResult.success) {
        toast.success("Published to WordPress!");
        router.push(`/dashboard/stores/${storeId}/blog`);
      } else {
        toast.error(publishResult.error || "Failed to publish");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { key: "topics", label: "Topics", icon: Lightbulb },
            { key: "outline", label: "Outline", icon: ListChecks },
            { key: "content", label: "Content", icon: PenTool },
            { key: "review", label: "Review", icon: Eye },
          ].map((step, index) => (
            <div key={step.key} className="flex items-center">
              {index > 0 && <div className="w-8 h-px bg-border mx-2" />}
              <button
                onClick={() => {
                  // Allow going back but not forward past current progress
                  const steps: Step[] = ["topics", "outline", "content", "review"];
                  const currentIndex = steps.indexOf(currentStep);
                  const targetIndex = steps.indexOf(step.key as Step);
                  if (targetIndex <= currentIndex) {
                    setCurrentStep(step.key as Step);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  currentStep === step.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{step.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Topic Discovery */}
      {currentStep === "topics" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Discover Blog Topics
            </CardTitle>
            <CardDescription>
              Enter your store&apos;s niche to generate AI-powered topic ideas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="niche">Store Niche / Industry</Label>
                <Input
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., Organic skincare, Home fitness equipment, Pet accessories"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerateTopics} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Ideas
                </Button>
              </div>
            </div>

            {topics.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Topic Ideas</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateTopics}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
                {topics.map((topic, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedTopic?.title === topic.title
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedTopic(topic)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{topic.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {topic.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {topic.targetKeywords.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getDifficultyColor(topic.estimatedDifficulty)}>
                          {topic.estimatedDifficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(topic.relevanceScore * 100)}% relevant
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedTopic && (
                  <div className="pt-4 space-y-4">
                    <div>
                      <Label htmlFor="keywords">Custom Keywords (optional)</Label>
                      <Input
                        id="keywords"
                        value={customKeywords}
                        onChange={(e) => setCustomKeywords(e.target.value)}
                        placeholder="Enter comma-separated keywords to override suggestions"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={() => handleSelectTopic(selectedTopic)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Generate Outline for &quot;{selectedTopic.title}&quot;
                    </Button>
                  </div>
                )}
              </div>
            )}

            {topics.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter your niche and click Generate Ideas to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Outline Review */}
      {currentStep === "outline" && outline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Blog Post Outline
            </CardTitle>
            <CardDescription>
              Review and adjust the outline before generating content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Title</Label>
              <p className="text-lg font-semibold mt-1">{outline.title}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Meta Title</Label>
                <p className="text-sm mt-1">{outline.metaTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {outline.metaTitle.length}/60 chars
                </p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <p className="text-sm mt-1">{outline.metaDescription}</p>
                <p className="text-xs text-muted-foreground">
                  {outline.metaDescription.length}/155 chars
                </p>
              </div>
            </div>

            <div>
              <Label>Introduction</Label>
              <p className="text-sm mt-1 italic">{outline.introduction}</p>
            </div>

            <div>
              <Label>Sections</Label>
              <div className="space-y-3 mt-2">
                {outline.sections.map((section, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium">{section.heading}</h4>
                    {section.subheadings && section.subheadings.length > 0 && (
                      <ul className="ml-4 mt-1 text-sm text-muted-foreground">
                        {section.subheadings.map((sh, i) => (
                          <li key={i}>• {sh}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      ~{section.estimatedWordCount} words
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>FAQ Items ({outline.faqItems.length})</Label>
              <div className="space-y-2 mt-2">
                {outline.faqItems.map((faq, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">Q: {faq.question}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A: {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Estimated read time: {outline.estimatedReadTime} min
              </p>
              <Button onClick={handleGenerateContent} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PenTool className="mr-2 h-4 w-4" />
                )}
                Generate Full Content
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Content Editor */}
      {currentStep === "content" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Edit Content
            </CardTitle>
            <CardDescription>
              Review and edit the generated content before publishing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit">
                  <FileText className="mr-2 h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Input
                      id="metaTitle"
                      value={editedMetaTitle}
                      onChange={(e) => setEditedMetaTitle(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {editedMetaTitle.length}/60
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="metaDesc">Meta Description</Label>
                    <Input
                      id="metaDesc"
                      value={editedMetaDescription}
                      onChange={(e) => setEditedMetaDescription(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {editedMetaDescription.length}/155
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Content (HTML)</Label>
                  <Textarea
                    id="content"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="mt-1 font-mono text-sm"
                    rows={20}
                  />
                </div>

                {generatedPost && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{generatedPost.wordCount} words</span>
                    <span>{generatedPost.readTime} min read</span>
                    <Badge variant="secondary">
                      <Check className="mr-1 h-3 w-3" />
                      FAQ Schema included
                    </Badge>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview">
                <div className="prose prose-sm max-w-none p-4 bg-white rounded-lg border">
                  <h1>{editedTitle}</h1>
                  <div dangerouslySetInnerHTML={{ __html: editedContent }} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleSaveAsDraft} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save as Draft
              </Button>
              <Button onClick={handlePublish} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Publish to WordPress
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
