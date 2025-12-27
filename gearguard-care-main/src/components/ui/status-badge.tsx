import { cn } from '@/lib/utils';
import { RequestStatus, RequestType, STATUS_LABELS, TYPE_LABELS } from '@/types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles: Record<RequestStatus, string> = {
    NEW: 'bg-status-new text-status-new-foreground',
    IN_PROGRESS: 'bg-status-in-progress text-status-in-progress-foreground',
    REPAIRED: 'bg-status-repaired text-status-repaired-foreground',
    SCRAP: 'bg-status-scrap text-status-scrap-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface TypeBadgeProps {
  type: RequestType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const typeStyles: Record<RequestType, string> = {
    PREVENTIVE: 'bg-type-preventive text-type-preventive-foreground',
    CORRECTIVE: 'bg-type-corrective text-type-corrective-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        typeStyles[type],
        className
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

interface UsableBadgeProps {
  isUsable: boolean;
  className?: string;
}

export function UsableBadge({ isUsable, className }: UsableBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        isUsable 
          ? 'bg-success/10 text-success' 
          : 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {isUsable ? 'Usable' : 'Unusable'}
    </span>
  );
}
