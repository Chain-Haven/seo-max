"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  RefreshCw,
  Loader2,
  Check,
  X,
  HelpCircle,
  Sparkles,
  Search,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  discoverQuestionOpportunities,
  generateFAQAnswers,
  getSuggestedFAQs,
  publishFAQs,
  dismissFAQs,
} from "@/lib/actions/faq-generation";

interface FAQGenerationTabProps {
  storeId: string;
}

interface QuestionOpportunity {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}

interface GeneratedFAQ {
  id?: string;
  question: string;
  answer: string;
  sourceQuery: string;
  impressions: number;
}

export function FAQGenerationTab({ storeId }: FAQGenerationTabProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [questions, setQuestions] = useState<QuestionOpportunity[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFAQs, setGeneratedFAQs] = useState<GeneratedFAQ[]>([]);
  const [selectedFAQs, setSelectedFAQs] = useState<Set<string>>(new Set());
  const [showFAQs, setShowFAQs] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    const result = await discoverQuestionOpportunities(storeId);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setQuestions(result.data);
      setSelectedQuestions(new Set());
      
      if (result.data.length === 0) {
        toast.info("No question-based queries found");
      } else {
        toast.success(`Found ${result.data.length} question opportunities`);
      }
    }
    setIsDiscovering(false);
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map((q) => q.query)));
    }
  };

  const handleToggleQuestion = (query: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(query)) {
      newSelected.delete(query);
    } else {
      newSelected.add(query);
    }
    setSelectedQuestions(newSelected);
  };

  const handleGenerateFAQs = async () => {
    if (selectedQuestions.size === 0) {
      toast.error("Select at least one question");
      return;
    }

    setIsGenerating(true);
    const selectedQs = questions.filter((q) => selectedQuestions.has(q.query));
    
    const result = await generateFAQAnswers(
      storeId,
      selectedQs.map((q) => ({
        query: q.query,
        impressions: q.impressions,
      }))
    );

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setGeneratedFAQs(result.data);
      setSelectedFAQs(new Set(result.data.map((f) => f.id || f.question)));
      setShowFAQs(true);
      toast.success(`Generated ${result.data.length} FAQ answers`);
    }
    setIsGenerating(false);
  };

  const handleToggleFAQ = (id: string) => {
    const newSelected = new Set(selectedFAQs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFAQs(newSelected);
  };

  const handlePublish = async () => {
    const toPublish = generatedFAQs.filter((f) => selectedFAQs.has(f.id || f.question));
    if (toPublish.length === 0) {
      toast.error("Select at least one FAQ to publish");
      return;
    }

    setIsPublishing(true);
    const result = await publishFAQs(
      storeId,
      toPublish.map((f) => f.id!).filter(Boolean)
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Published ${result.publishedCount} FAQs with schema markup!`);
      setShowFAQs(false);
      setGeneratedFAQs([]);
      setSelectedFAQs(new Set());
      // Remove published questions from the list
      setQuestions((prev) => 
        prev.filter((q) => !toPublish.some((f) => f.sourceQuery === q.query))
      );
      setSelectedQuestions(new Set());
    }
    setIsPublishing(false);
  };

  const handleDismiss = async () => {
    const toDismiss = generatedFAQs.filter((f) => selectedFAQs.has(f.id || f.question));
    if (toDismiss.length === 0) return;

    const result = await dismissFAQs(toDismiss.map((f) => f.id!).filter(Boolean));
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("FAQs dismissed");
      setGeneratedFAQs((prev) => prev.filter((f) => !selectedFAQs.has(f.id || f.question)));
      setSelectedFAQs(new Set());
      if (generatedFAQs.length === toDismiss.length) {
        setShowFAQs(false);
      }
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                FAQ Auto-Generation
              </CardTitle>
              <CardDescription>
                Discover questions from search queries and generate FAQ answers with schema markup
              </CardDescription>
            </div>
            <Button onClick={handleDiscover} disabled={isDiscovering}>
              {isDiscovering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Discover Questions
            </Button>
          </div>
        </CardHeader>

        {questions.length > 0 && (
          <CardContent>
            <div className="flex gap-6 mb-6">
              <div>
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions Found</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {formatNumber(questions.reduce((sum, q) => sum + q.impressions, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {formatNumber(questions.reduce((sum, q) => sum + q.clicks, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Question Opportunities</CardTitle>
                <CardDescription>
                  Select questions to generate FAQ answers with Schema markup
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAllQuestions}>
                  {selectedQuestions.size === questions.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  onClick={handleGenerateFAQs}
                  disabled={selectedQuestions.size === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate FAQs ({selectedQuestions.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {questions.slice(0, 20).map((q) => (
                <div
                  key={q.query}
                  className={`flex items-center gap-4 p-3 border rounded-lg transition-colors cursor-pointer ${
                    selectedQuestions.has(q.query) ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                  }`}
                  onClick={() => handleToggleQuestion(q.query)}
                >
                  <Checkbox
                    checked={selectedQuestions.has(q.query)}
                    onCheckedChange={() => handleToggleQuestion(q.query)}
                  />
                  
                  <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{q.query}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatNumber(q.impressions)}
                    </div>
                    <Badge variant="secondary">
                      Pos {Math.round(q.position)}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {questions.length > 20 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing top 20 of {questions.length} questions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated FAQs Dialog */}
      <Dialog open={showFAQs} onOpenChange={setShowFAQs}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generated FAQ Answers
            </DialogTitle>
            <DialogDescription>
              Review and select FAQs to publish. They will include FAQPage Schema markup.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4 pr-4">
              {generatedFAQs.map((faq, i) => (
                <div
                  key={faq.id || i}
                  className={`p-4 border rounded-lg transition-colors ${
                    selectedFAQs.has(faq.id || faq.question) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedFAQs.has(faq.id || faq.question)}
                      onCheckedChange={() => handleToggleFAQ(faq.id || faq.question)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">Q: {faq.question}</p>
                        <Badge variant="secondary" className="shrink-0">
                          {formatNumber(faq.impressions)} imp
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        A: {faq.answer}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Source: "{faq.sourceQuery}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Publishing will add FAQPage Schema markup for rich search results
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFAQs(false)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              disabled={selectedFAQs.size === 0}
            >
              <X className="mr-2 h-4 w-4" />
              Dismiss Selected
            </Button>
            <Button
              onClick={handlePublish}
              disabled={selectedFAQs.size === 0 || isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Publish FAQs ({selectedFAQs.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
