import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

interface StoreStatusBadgeProps {
  status: string;
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
  },
  connected: {
    label: "Connected",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle,
  },
  disconnected: {
    label: "Disconnected",
    className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    icon: XCircle,
  },
  error: {
    label: "Error",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertTriangle,
  },
};

export function StoreStatusBadge({ status }: StoreStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
