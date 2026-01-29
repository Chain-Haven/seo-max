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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  HelpCircle,
  Image as ImageIcon,
  Target,
  TrendingUp,
  FileSearch,
  BarChart3,
  Layout,
  Zap,
  Plus,
  X,
  Rocket,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { saveBlogPost, publishToWordPress } from "@/lib/actions/blog";
import {
  analyzeKeyword,
  getSuggestedTemplate,
  getAvailableTemplates,
  generateEnhancedOutline,
  generateEnhancedArticle,
  scoreExistingContent,
  generateArticleImage,
  fetchPeopleAlsoAsk,
  improveArticle,
} from "@/lib/actions/enhanced-blog";
import { autoImproveToTargetScore } from "@/lib/actions/auto-improve-blog";
import { ultraOptimizeBlog } from "@/lib/actions/ultra-blog-optimizer";
import type { SerpAnalysis, ContentAnalysis } from "@/lib/ai/competitor-analysis";
import type { ContentScore } from "@/lib/ai/content-scoring";
import type { TemplateInfo, ArticleTemplate } from "@/lib/ai/content-templates";
import type { GeneratedImage } from "@/lib/ai/image-generation";

interface EnhancedBlogCreatorProps {
  storeId: string;
  storeName: string;
  productContext?: {
    name: string;
    category: string;
    description: string;
  };
}

type Step = "keyword" | "template" | "outline" | "content" | "review";

export function EnhancedBlogCreator({
  storeId,
  storeName,
  productContext,
}: EnhancedBlogCreatorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("keyword");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Step 1: Keyword Analysis
  const [keyword, setKeyword] = useState("");
  const [serpAnalysis, setSerpAnalysis] = useState<SerpAnalysis | null>(null);
  const [selectedPAA, setSelectedPAA] = useState<Set<string>>(new Set());

  // Step 2: Template Selection
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [suggestedTemplate, setSuggestedTemplate] = useState<{
    template: TemplateInfo;
    reason: string;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ArticleTemplate | null>(null);

  // Step 3: Outline
  const [outline, setOutline] = useState<string[]>([]);
  const [targetWordCount, setTargetWordCount] = useState(2000);

  // Step 4: Content
  const [content, setContent] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [contentScore, setContentScore] = useState<ContentScore | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Step 5: Review
  const [title, setTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");

  // Auto-Improve to 90+ state
  const [isAutoImproving, setIsAutoImproving] = useState(false);
  const [autoImproveProgress, setAutoImproveProgress] = useState(0);
  const [autoImproveIteration, setAutoImproveIteration] = useState(0);
  const [autoImproveCurrentScore, setAutoImproveCurrentScore] = useState(0);
  const [autoImproveMessage, setAutoImproveMessage] = useState("");

  // Ultra Optimize to 95+ state
  const [isUltraOptimizing, setIsUltraOptimizing] = useState(false);
  const [ultraOptimizeMessage, setUltraOptimizeMessage] = useState("");
  const [generatedFeatures, setGeneratedFeatures] = useState<string[]>([]);

  // Load templates on mount
  useEffect(() => {
    getAvailableTemplates().then(setTemplates);
  }, []);

  // Step 1: Analyze Keyword
  const handleAnalyzeKeyword = async () => {
    if (!keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Analyzing search results...");

    try {
      const result = await analyzeKeyword(keyword, productContext);
      if (result.data) {
        setSerpAnalysis(result.data);
        setSelectedPAA(new Set()); // Reset selections
        
        // Also get template suggestion
        const templateResult = await getSuggestedTemplate(keyword, result.data.searchIntent);
        if (templateResult.data) {
          setSuggestedTemplate(templateResult.data);
          setSelectedTemplate(templateResult.data.template.id);
          setTargetWordCount(templateResult.data.template.avgWordCount.max);
        }
        
        toast.success("Keyword analyzed!");
        setCurrentStep("template");
      } else {
        toast.error(result.error || "Failed to analyze keyword");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Toggle PAA question selection
  const togglePAA = (question: string) => {
    const newSelected = new Set(selectedPAA);
    if (newSelected.has(question)) {
      newSelected.delete(question);
    } else {
      newSelected.add(question);
    }
    setSelectedPAA(newSelected);
  };

  // Step 2: Generate Outline
  const handleGenerateOutline = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Creating outline...");

    try {
      const result = await generateEnhancedOutline(keyword, selectedTemplate, {
        productContext,
        paaQuestions: Array.from(selectedPAA),
        competitorTopics: serpAnalysis?.contentAnalysis.commonTopics,
      });

      if (result.data) {
        setOutline(result.data);
        toast.success("Outline generated!");
        setCurrentStep("outline");
      } else {
        toast.error(result.error || "Failed to generate outline");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Step 3: Generate Content
  const handleGenerateContent = async () => {
    setIsLoading(true);
    setLoadingMessage("Writing article...");

    try {
      const result = await generateEnhancedArticle(
        keyword,
        selectedTemplate!,
        outline,
        {
          productContext,
          paaQuestions: Array.from(selectedPAA).map((q) => ({ question: q })),
          competitorTopics: serpAnalysis?.contentAnalysis.commonTopics,
          targetWordCount,
          includeImages: true,
        }
      );

      if (result.data) {
        setContent(result.data.content);
        setMetaDescription(result.data.metaDescription);
        setContentScore(result.data.score);
        setGeneratedImages(result.data.images);
        
        // Extract title from content
        const titleMatch = result.data.content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          setTitle(titleMatch[1]);
          setMetaTitle(titleMatch[1].substring(0, 60));
        } else {
          setTitle(keyword);
          setMetaTitle(keyword);
        }
        
        toast.success("Article generated!");
        setCurrentStep("content");
      } else {
        toast.error(result.error || "Failed to generate article");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Generate additional image
  const handleGenerateImage = async (type: "hero" | "infographic" | "illustration") => {
    setIsGeneratingImage(true);
    try {
      const result = await generateArticleImage(
        title || keyword,
        keyword,
        type,
        productContext
      );
      if (result.data) {
        setGeneratedImages([...generatedImages, result.data]);
        toast.success("Image generated!");
      } else {
        toast.error(result.error || "Failed to generate image");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Recalculate content score
  const handleRecalculateScore = async () => {
    const result = await scoreExistingContent(content, title, keyword, metaDescription);
    if (result.data) {
      setContentScore(result.data);
    }
  };

  // Improve content based on suggestions (single pass)
  const handleImproveContent = async () => {
    if (!contentScore || contentScore.suggestions.length === 0) return;
    
    setIsLoading(true);
    setLoadingMessage("Improving content...");
    
    try {
      const result = await improveArticle(content, keyword, contentScore.suggestions);
      if (result.data) {
        setContent(result.data);
        await handleRecalculateScore();
        toast.success("Content improved!");
      } else {
        toast.error(result.error || "Failed to improve content");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Auto-Improve to 90+ SEO score
  const handleAutoImproveTo90 = async () => {
    if (!content || !keyword) {
      toast.error("Content and keyword are required");
      return;
    }

    setIsAutoImproving(true);
    setAutoImproveProgress(0);
    setAutoImproveIteration(0);
    setAutoImproveCurrentScore(contentScore?.overall || 0);
    setAutoImproveMessage("Starting optimization...");

    try {
      const result = await autoImproveToTargetScore(
        content,
        title,
        metaTitle,
        metaDescription,
        [keyword],
        {
          targetScore: 90,
          maxIterations: 10,
        }
      );

      if (result.success) {
        // Update all content
        setContent(result.content);
        setTitle(result.title);
        setMetaTitle(result.metaTitle);
        setMetaDescription(result.metaDescription);
        
        // Update score
        setContentScore({
          overall: result.finalScore.overall,
          grade: result.finalScore.grade,
          breakdown: result.finalScore.breakdown,
          suggestions: result.finalScore.prioritizedRecommendations,
        });

        toast.success(`SEO score optimized to ${result.finalScore.overall}!`, {
          description: `${result.improvements.length} improvements made in ${result.iterations} iterations.`,
        });

        // Show what was added
        if (result.addedFeatures.length > 0) {
          toast.info("New features added", {
            description: result.addedFeatures.join(", "),
          });
        }
      } else {
        toast.error("Could not reach target score", {
          description: `Best score achieved: ${result.finalScore.overall}. ${result.error || ""}`,
        });
        
        // Still update with the improved content
        setContent(result.content);
        setTitle(result.title);
        setMetaTitle(result.metaTitle);
        setMetaDescription(result.metaDescription);
        
        setContentScore({
          overall: result.finalScore.overall,
          grade: result.finalScore.grade,
          breakdown: result.finalScore.breakdown,
          suggestions: result.finalScore.prioritizedRecommendations,
        });
      }
    } catch (error) {
      console.error("Auto-improve error:", error);
      toast.error("Auto-improve failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsAutoImproving(false);
      setAutoImproveMessage("");
    }
  };

  // Ultra Optimize to 95+ SEO score with all features
  const handleUltraOptimize = async () => {
    if (!content || !keyword) {
      toast.error("Content and keyword are required");
      return;
    }

    setIsUltraOptimizing(true);
    setIsAutoImproving(true);
    setAutoImproveProgress(0);
    setAutoImproveCurrentScore(contentScore?.overall || 0);
    setUltraOptimizeMessage("Starting ultra optimization...");
    setGeneratedFeatures([]);

    const phases = [
      { progress: 10, message: "Optimizing title & meta..." },
      { progress: 20, message: "Expanding content..." },
      { progress: 30, message: "Optimizing keywords..." },
      { progress: 40, message: "Improving structure..." },
      { progress: 50, message: "Generating FAQ section..." },
      { progress: 60, message: "Adding key takeaways..." },
      { progress: 70, message: "Generating statistics..." },
      { progress: 80, message: "Creating images..." },
      { progress: 90, message: "Adding author & CTA..." },
      { progress: 95, message: "Final polish..." },
    ];

    // Simulate progress updates
    let phaseIndex = 0;
    const progressInterval = setInterval(() => {
      if (phaseIndex < phases.length) {
        setAutoImproveProgress(phases[phaseIndex].progress);
        setUltraOptimizeMessage(phases[phaseIndex].message);
        phaseIndex++;
      }
    }, 3000);

    try {
      const result = await ultraOptimizeBlog(
        content,
        title,
        metaTitle,
        metaDescription,
        [keyword],
        {
          targetScore: 95,
          generateImages: true,
          storeName: storeName,
        }
      );

      clearInterval(progressInterval);

      if (result.success) {
        // Update all content
        setContent(result.content);
        setTitle(result.title);
        setMetaTitle(result.metaTitle);
        setMetaDescription(result.metaDescription);
        
        // Update images
        if (result.images.length > 0) {
          setGeneratedImages(result.images);
        }
        
        // Update score
        setContentScore({
          overall: result.finalScore.overall,
          grade: result.finalScore.grade,
          breakdown: result.finalScore.breakdown,
          suggestions: result.finalScore.prioritizedRecommendations,
        });

        // Track generated features
        const features = [];
        if (result.generatedFeatures.faqSection) features.push("FAQ Section");
        if (result.generatedFeatures.keyTakeaways) features.push("Key Takeaways");
        if (result.generatedFeatures.proTips) features.push("Pro Tips");
        if (result.generatedFeatures.statistics) features.push("Statistics");
        if (result.generatedFeatures.comparisonTable) features.push("Comparison Table");
        if (result.generatedFeatures.authorBio) features.push("Author Bio");
        if (result.generatedFeatures.callToAction) features.push("Call-to-Action");
        if (result.images.length > 0) features.push(`${result.images.length} Images`);
        
        setGeneratedFeatures(features);

        toast.success(`Ultra optimized to ${result.finalScore.overall}! 🏆`, {
          description: `${result.improvements.length} improvements in ${result.iterations} phases.`,
        });

        if (features.length > 0) {
          toast.info("Generated features", {
            description: features.join(", "),
          });
        }
      } else {
        toast.error("Ultra optimization incomplete", {
          description: `Achieved ${result.finalScore.overall}/95. ${result.error || "Some features may not have been generated."}`,
        });
        
        // Still update with improved content
        setContent(result.content);
        setTitle(result.title);
        setMetaTitle(result.metaTitle);
        setMetaDescription(result.metaDescription);
        
        if (result.images.length > 0) {
          setGeneratedImages(result.images);
        }
        
        setContentScore({
          overall: result.finalScore.overall,
          grade: result.finalScore.grade,
          breakdown: result.finalScore.breakdown,
          suggestions: result.finalScore.prioritizedRecommendations,
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Ultra optimize error:", error);
      toast.error("Ultra optimization failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsUltraOptimizing(false);
      setIsAutoImproving(false);
      setUltraOptimizeMessage("");
      setAutoImproveProgress(100);
    }
  };

  // Save as draft
  const handleSaveAsDraft = async () => {
    setIsLoading(true);
    try {
      const result = await saveBlogPost(storeId, {
        title,
        content,
        meta_title: metaTitle,
        meta_description: metaDescription,
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

  // Publish
  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const saveResult = await saveBlogPost(storeId, {
        title,
        content,
        meta_title: metaTitle,
        meta_description: metaDescription,
        status: "pending",
      });

      if (!saveResult.success || !saveResult.post) {
        toast.error(saveResult.error || "Failed to save");
        return;
      }

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500";
      case "B": return "bg-blue-500";
      case "C": return "bg-yellow-500";
      case "D": return "bg-orange-500";
      default: return "bg-red-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        <div className="flex items-center gap-2">
          {[
            { key: "keyword", label: "Keyword", icon: Search },
            { key: "template", label: "Template", icon: Layout },
            { key: "outline", label: "Outline", icon: ListChecks },
            { key: "content", label: "Content", icon: PenTool },
            { key: "review", label: "Review", icon: Eye },
          ].map((step, index) => (
            <div key={step.key} className="flex items-center">
              {index > 0 && <div className="w-8 h-px bg-border mx-2" />}
              <button
                onClick={() => {
                  const steps: Step[] = ["keyword", "template", "outline", "content", "review"];
                  const currentIndex = steps.indexOf(currentStep);
                  const targetIndex = steps.indexOf(step.key as Step);
                  if (targetIndex <= currentIndex) {
                    setCurrentStep(step.key as Step);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  currentStep === step.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && loadingMessage && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">{loadingMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Keyword Analysis */}
      {currentStep === "keyword" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Target Keyword
              </CardTitle>
              <CardDescription>
                Enter your target keyword to analyze competition and search intent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="keyword">Keyword / Topic</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., best running shoes 2024, how to start a blog"
                  className="mt-1"
                />
              </div>
              
              {productContext && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Product Context</p>
                  <p className="text-sm text-muted-foreground">
                    {productContext.name} ({productContext.category})
                  </p>
                </div>
              )}

              <Button
                onClick={handleAnalyzeKeyword}
                disabled={isLoading || !keyword.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSearch className="mr-2 h-4 w-4" />
                )}
                Analyze Keyword
              </Button>
            </CardContent>
          </Card>

          {serpAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Search Intent</p>
                    <Badge className="mt-1">{serpAnalysis.searchIntent}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended Length</p>
                    <p className="font-medium">
                      {serpAnalysis.contentAnalysis.recommendedWordCount.min}-
                      {serpAnalysis.contentAnalysis.recommendedWordCount.max} words
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Key Topics to Cover</p>
                  <div className="flex flex-wrap gap-1">
                    {serpAnalysis.contentAnalysis.commonTopics.slice(0, 8).map((topic, i) => (
                      <Badge key={i} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>

                {serpAnalysis.contentAnalysis.contentGaps.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Content Gaps (Opportunities)</p>
                    <ul className="text-sm space-y-1">
                      {serpAnalysis.contentAnalysis.contentGaps.slice(0, 3).map((gap, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {serpAnalysis && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  People Also Ask
                </CardTitle>
                <CardDescription>
                  Select questions to include in your article (recommended for featured snippets)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {serpAnalysis.peopleAlsoAsk.map((paa, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPAA.has(paa.question)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => togglePAA(paa.question)}
                    >
                      <Checkbox
                        checked={selectedPAA.has(paa.question)}
                        onCheckedChange={() => togglePAA(paa.question)}
                      />
                      <p className="text-sm">{paa.question}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {selectedPAA.size} questions selected
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Template Selection */}
      {currentStep === "template" && (
        <div className="space-y-6">
          {suggestedTemplate && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Recommended: {suggestedTemplate.template.name}</p>
                    <p className="text-sm text-muted-foreground">{suggestedTemplate.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  setTargetWordCount(template.avgWordCount.max);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span>{template.icon}</span>
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.bestFor.slice(0, 3).map((use, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {use}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.avgWordCount.min}-{template.avgWordCount.max} words
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="wordCount">Target Word Count</Label>
              <Input
                id="wordCount"
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 2000)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateOutline}
                disabled={!selectedTemplate || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ListChecks className="mr-2 h-4 w-4" />
                )}
                Generate Outline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Outline */}
      {currentStep === "outline" && outline.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Article Outline
                </CardTitle>
                <CardDescription>
                  Review the outline before generating content
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateOutline}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {outline.map((item, i) => {
                  const isH2 = item.startsWith("H2:");
                  const isH3 = item.startsWith("H3:");
                  const isH4 = item.startsWith("H4:");
                  const text = item.replace(/^H[234]:\s*/, "");
                  
                  return (
                    <div
                      key={i}
                      className={`p-2 rounded ${
                        isH2 ? "bg-muted font-medium" :
                        isH3 ? "ml-4 text-muted-foreground" :
                        isH4 ? "ml-8 text-sm text-muted-foreground" :
                        ""
                      }`}
                    >
                      {isH2 && <span className="text-xs text-primary mr-2">H2</span>}
                      {isH3 && <span className="text-xs text-muted-foreground mr-2">H3</span>}
                      {isH4 && <span className="text-xs text-muted-foreground mr-2">H4</span>}
                      {text}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedPAA.size > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Included PAA Questions ({selectedPAA.size})</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedPAA).slice(0, 3).map((q, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {q.substring(0, 40)}...
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleGenerateContent} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PenTool className="mr-2 h-4 w-4" />
                )}
                Generate Article ({targetWordCount} words)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Content Editor */}
      {currentStep === "content" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Article Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Input
                      id="metaTitle"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {metaTitle.length}/60
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="metaDesc">Meta Description</Label>
                    <Input
                      id="metaDesc"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {metaDescription.length}/160
                    </p>
                  </div>
                </div>

                <Tabs defaultValue="edit">
                  <TabsList>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        // Debounced score recalculation could go here
                      }}
                      className="font-mono text-sm min-h-[500px]"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="prose prose-sm max-w-none p-4 bg-white rounded-lg border min-h-[500px] overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br />") }} />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* SEO Score */}
            {contentScore && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      SEO Score
                    </span>
                    <Badge className={getGradeColor(contentScore.grade)}>
                      {contentScore.grade}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${getScoreColor(contentScore.overall)}`}>
                      {contentScore.overall}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                  <Progress value={contentScore.overall} className="h-2" />

                  <div className="space-y-2">
                    {Object.entries(contentScore.breakdown).slice(0, 5).map(([key, data]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className={getScoreColor(data.score)}>{data.score}</span>
                      </div>
                    ))}
                  </div>

                  {contentScore.suggestions.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Suggestions</p>
                      <ul className="text-sm space-y-1">
                        {contentScore.suggestions.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={handleImproveContent}
                        disabled={isLoading || isAutoImproving}
                      >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Quick Improve
                      </Button>
                    </div>
                  )}

                  {/* Auto-Improve Buttons */}
                  {contentScore.overall < 95 && (
                    <div className="pt-2 border-t space-y-2">
                      {contentScore.overall < 90 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={handleAutoImproveTo90}
                          disabled={isLoading || isAutoImproving || isUltraOptimizing}
                        >
                          {isAutoImproving && !isUltraOptimizing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {autoImproveMessage}
                            </>
                          ) : (
                            <>
                              <Rocket className="mr-2 h-4 w-4" />
                              Auto-Improve to 90+
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-500/90 hover:to-orange-600/90 text-white"
                        onClick={handleUltraOptimize}
                        disabled={isLoading || isAutoImproving || isUltraOptimizing}
                      >
                        {isUltraOptimizing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {ultraOptimizeMessage}
                          </>
                        ) : (
                          <>
                            <Crown className="mr-2 h-4 w-4" />
                            Ultra Optimize to 95+
                          </>
                        )}
                      </Button>
                      
                      {(isAutoImproving || isUltraOptimizing) && (
                        <div className="mt-2">
                          <Progress value={autoImproveProgress} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {isUltraOptimizing ? "Generating features..." : `Iteration ${autoImproveIteration}`} • Score: {Math.round(autoImproveCurrentScore)}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Ultra adds FAQ, images, stats, author bio & more
                      </p>
                    </div>
                  )}

                  {contentScore.overall >= 95 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-amber-600 justify-center p-2 bg-amber-500/10 rounded-lg">
                        <Crown className="h-4 w-4" />
                        <span className="text-sm font-medium">Ultra Optimized! 🏆</span>
                      </div>
                    </div>
                  )}
                  
                  {contentScore.overall >= 90 && contentScore.overall < 95 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-green-600 justify-center p-2 bg-green-500/10 rounded-lg mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">SEO Optimized!</span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={handleRecalculateScore}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recalculate Score
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Images */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {generatedImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.url}
                      alt={img.altText}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                      {img.altText.substring(0, 50)}...
                    </div>
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      {img.type}
                    </Badge>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleGenerateImage("hero")}
                    disabled={isGeneratingImage}
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Hero
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleGenerateImage("infographic")}
                    disabled={isGeneratingImage}
                  >
                    Infographic
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Button className="w-full" onClick={handlePublish} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Publish to WordPress
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSaveAsDraft}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
