"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { MessageSquarePlus, Loader2, Bug, Lightbulb, Sparkles, HelpCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback, type FeedbackType } from "@/lib/actions/feedback";

interface FeedbackFormProps {
  storeId?: string;
  trigger?: React.ReactNode;
}

const FEEDBACK_TYPES: Array<{ value: FeedbackType; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: "bug",
    label: "Bug Report",
    icon: <Bug className="h-4 w-4" />,
    description: "Something isn't working correctly",
  },
  {
    value: "feature",
    label: "Feature Request",
    icon: <Lightbulb className="h-4 w-4" />,
    description: "Suggest a new feature or capability",
  },
  {
    value: "improvement",
    label: "Improvement",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Suggest an enhancement to existing features",
  },
  {
    value: "other",
    label: "Other",
    icon: <HelpCircle className="h-4 w-4" />,
    description: "General feedback or questions",
  },
];

const MIN_FEEDBACK_LENGTH = 10;
const MAX_FEEDBACK_LENGTH = 2000;

export function FeedbackForm({ storeId, trigger }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("improvement");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset submitted state when dialog closes
  useEffect(() => {
    if (!open && submitted) {
      setTimeout(() => {
        setSubmitted(false);
        setContent("");
        setFeedbackType("improvement");
      }, 300); // Wait for dialog close animation
    }
  }, [open, submitted]);

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      toast.error("Please enter your feedback");
      return;
    }

    if (trimmedContent.length < MIN_FEEDBACK_LENGTH) {
      toast.error(`Feedback must be at least ${MIN_FEEDBACK_LENGTH} characters`);
      return;
    }

    setLoading(true);
    try {
      const result = await submitFeedback(feedbackType, trimmedContent, storeId);
      if (result.success) {
        setSubmitted(true);
        toast.success("Thank you for your feedback!", {
          description: "Our AI will review it and implement improvements.",
        });
        
        // Close dialog after showing success state
        setTimeout(() => {
          setOpen(false);
        }, 1500);
      } else {
        toast.error(result.error || "Failed to submit feedback");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const characterCount = content.length;
  const characterPercentage = (characterCount / MAX_FEEDBACK_LENGTH) * 100;
  const isValidLength = characterCount >= MIN_FEEDBACK_LENGTH && characterCount <= MAX_FEEDBACK_LENGTH;

  if (submitted && open) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground">
              Your feedback has been submitted. Our AI will review it and implement improvements.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Send Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve SEO Max. Our AI reviews feedback and
            automatically implements improvements.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Feedback Type</Label>
            <Select
              value={feedbackType}
              onValueChange={(v) => setFeedbackType(v as FeedbackType)}
              disabled={loading}
            >
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {FEEDBACK_TYPES.find((t) => t.value === feedbackType)?.description}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-content">Your Feedback</Label>
            <Textarea
              id="feedback-content"
              placeholder={
                feedbackType === "bug"
                  ? "Describe what happened, what you expected, and steps to reproduce..."
                  : feedbackType === "feature"
                    ? "Describe the feature you'd like to see and how it would help you..."
                    : "Tell us how we can improve SEO Max..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
              disabled={loading}
              rows={5}
              className="resize-none"
            />
            <div className="space-y-1">
              <Progress 
                value={characterPercentage} 
                className={`h-1.5 transition-colors ${
                  characterCount > MAX_FEEDBACK_LENGTH * 0.9
                    ? "bg-orange-100"
                    : characterCount < MIN_FEEDBACK_LENGTH
                      ? "bg-gray-100"
                      : "bg-green-100"
                }`}
              />
              <div className="flex justify-between items-center">
                <p className={`text-xs ${
                  characterCount < MIN_FEEDBACK_LENGTH
                    ? "text-muted-foreground"
                    : characterCount > MAX_FEEDBACK_LENGTH * 0.9
                      ? "text-orange-600"
                      : "text-green-600"
                }`}>
                  {characterCount < MIN_FEEDBACK_LENGTH && (
                    <span>{MIN_FEEDBACK_LENGTH - characterCount} more characters needed</span>
                  )}
                  {characterCount >= MIN_FEEDBACK_LENGTH && characterCount <= MAX_FEEDBACK_LENGTH * 0.9 && (
                    <span>Looking good!</span>
                  )}
                  {characterCount > MAX_FEEDBACK_LENGTH * 0.9 && characterCount <= MAX_FEEDBACK_LENGTH && (
                    <span>{MAX_FEEDBACK_LENGTH - characterCount} characters remaining</span>
                  )}
                </p>
                <span className={`text-xs tabular-nums ${
                  characterCount > MAX_FEEDBACK_LENGTH * 0.9
                    ? "text-orange-600 font-medium"
                    : "text-muted-foreground"
                }`}>
                  {characterCount}/{MAX_FEEDBACK_LENGTH}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isValidLength || !content.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
        <p className="text-xs text-center text-muted-foreground">
          Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> to submit
        </p>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floating feedback button that can be placed anywhere in the app.
 * Now with better positioning and responsive behavior.
 */
export function FloatingFeedbackButton({ storeId }: { storeId?: string }) {
  const [isVisible, setIsVisible] = useState(true);

  // Hide button when scrolling down, show when scrolling up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      }`}
    >
      <FeedbackForm
        storeId={storeId}
        trigger={
          <Button 
            size="lg" 
            className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Send feedback"
          >
            <MessageSquarePlus className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
        }
      />
    </div>
  );
}