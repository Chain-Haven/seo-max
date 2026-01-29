"use client";

import { useState } from "react";
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
import { MessageSquarePlus, Loader2, Bug, Lightbulb, Sparkles, HelpCircle } from "lucide-react";
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

export function FeedbackForm({ storeId, trigger }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("improvement");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setLoading(true);
    try {
      const result = await submitFeedback(feedbackType, content, storeId);
      if (result.success) {
        toast.success("Feedback submitted! Our AI will review it.");
        setOpen(false);
        setContent("");
        setFeedbackType("improvement");
      } else {
        toast.error(result.error || "Failed to submit feedback");
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

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
      <DialogContent className="sm:max-w-[500px]">
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
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/2000
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !content.trim()}>
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
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floating feedback button that can be placed anywhere in the app.
 */
export function FloatingFeedbackButton({ storeId }: { storeId?: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <FeedbackForm
        storeId={storeId}
        trigger={
          <Button size="lg" className="rounded-full shadow-lg">
            <MessageSquarePlus className="h-5 w-5 mr-2" />
            Feedback
          </Button>
        }
      />
    </div>
  );
}
