import { cn } from "@/lib/utils";

type Status = "approved" | "pending" | "rejected" | "active" | "inactive" | "completed" | "unknown";

const statusStyles: Record<Status, string> = {
  approved: "bg-primary/10 text-primary",
  completed: "bg-primary/10 text-primary",
  active: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground",
  unknown: "bg-gray-500 text-white",
};

const StatusBadge = ({ status }: { status: string }) => {
  const safeStatus = (status.toLowerCase() as Status) || 'unknown';
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", statusStyles[safeStatus])}>
      {safeStatus}
    </span>
  );
};

export default StatusBadge;

