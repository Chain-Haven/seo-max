import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe } from "lucide-react";

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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  connected: "bg-green-500/10 text-green-500 border-green-500/20",
  disconnected: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  error: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Link href={`/dashboard/stores/${store.id}`}>
      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{store.name}</CardTitle>
          <Badge variant="outline" className={statusColors[store.status]}>
            {store.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="truncate">{store.url}</span>
            <ExternalLink className="h-3 w-3" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {store.platform}
            </Badge>
            {store.last_sync_at && (
              <span className="text-xs text-muted-foreground">
                Last sync: {new Date(store.last_sync_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
