import { useViewerCount } from "@/hooks/useViewerCount";
import { Users, Wifi, WifiOff } from "lucide-react";

interface ViewerCountProps {
  streamId: string;
  className?: string;
  showConnection?: boolean;
}

export function ViewerCount({ streamId, className = "", showConnection = false }: ViewerCountProps) {
  const { viewerCount, isConnected } = useViewerCount(streamId);

  return (
    <div className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}>
      <Users className="h-4 w-4" />
      <span className="tabular-nums" data-testid={`text-viewers-${streamId}`}>
        {viewerCount}
      </span>
      {showConnection && (
        isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )
      )}
    </div>
  );
}