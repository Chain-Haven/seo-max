"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  CheckCircle,
  Calendar,
} from "lucide-react";

interface Post {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentCalendarProps {
  calendar: {
    drafts: Post[];
    pending: Post[];
    published: Post[];
    total: number;
  };
}

export function ContentCalendar({ calendar }: ContentCalendarProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Drafts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Drafts
          </CardTitle>
          <CardDescription>{calendar.drafts.length} posts</CardDescription>
        </CardHeader>
        <CardContent>
          {calendar.drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts</p>
          ) : (
            <div className="space-y-2">
              {calendar.drafts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {post.title}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatDate(post.updated_at)}
                  </Badge>
                </div>
              ))}
              {calendar.drafts.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{calendar.drafts.length - 5} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Review
          </CardTitle>
          <CardDescription>{calendar.pending.length} posts</CardDescription>
        </CardHeader>
        <CardContent>
          {calendar.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending posts</p>
          ) : (
            <div className="space-y-2">
              {calendar.pending.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {post.title}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {formatDate(post.updated_at)}
                  </Badge>
                </div>
              ))}
              {calendar.pending.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{calendar.pending.length - 5} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Published
          </CardTitle>
          <CardDescription>{calendar.published.length} posts</CardDescription>
        </CardHeader>
        <CardContent>
          {calendar.published.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published posts</p>
          ) : (
            <div className="space-y-2">
              {calendar.published.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {post.title}
                  </span>
                  <Badge variant="default" className="text-xs bg-green-600">
                    {formatDate(post.published_at || post.updated_at)}
                  </Badge>
                </div>
              ))}
              {calendar.published.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{calendar.published.length - 5} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
