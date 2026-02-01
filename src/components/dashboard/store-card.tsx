import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe, Clock, AlertCircle } from "lucide-react";

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    url: string;
    platform: string;
    status: string;
    last_sync_at: string | null;
  };
}

const statusConfig: Record<string, { colors: string; label: string; icon?: React.ReactNode }> = {
  pending: {
    colors: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
  },
  connected: {
    colors: "bg-green-500/10 text-green-500 border-green-500/20",
    label: "Connected",
  },
  disconnected: {
    colors: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    label: "Disconnected",
  },
  error: {
    colors: "bg-red-500/10 text-red-500 border-red-500/20",
    label: "Error",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function StoreCard({ store }: StoreCardProps) {
  const statusInfo = statusConfig[store.status] || statusConfig.disconnected;
  
  // Format the last sync date with better error handling
  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      // Show relative time for recent syncs
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return "Less than an hour ago";
      } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
      } else if (diffInHours < 168) { // 7 days
        const days = Math.floor(diffInHours / 24);
        return `${days} ${days === 1 ? "day" : "days"} ago`;
      }
      
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      console.error("Invalid date format:", dateString, error);
      return null;
    }
  };

  const lastSyncText = formatLastSync(store.last_sync_at);

  return (
    <Link 
      href={`/dashboard/stores/${store.id}`}
      className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
      aria-label={`View ${store.name} store details`}
    >
      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium line-clamp-1">{store.name}</CardTitle>
          <Badge 
            variant="outline" 
            className={`${statusInfo.colors} flex items-center gap-1`}
            aria-label={`Store status: ${statusInfo.label}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate" title={store.url}>{store.url}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs capitalize">
              {store.platform}
            </Badge>
            {lastSyncText && store.status === "connected" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Last sync: {lastSyncText}</span>
              </div>
            )}
            {store.status === "error" && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Check connection
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}