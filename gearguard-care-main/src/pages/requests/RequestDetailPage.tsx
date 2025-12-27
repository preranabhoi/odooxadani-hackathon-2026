import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { STATUS_TRANSITIONS, RequestStatus } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { ErrorState } from '@/components/ui/empty-state';
import { StatusBadge, TypeBadge, UsableBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Play,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Clock,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);
  const [showScrapWarning, setShowScrapWarning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RequestStatus | null>(null);

  const { data: request, isLoading, error, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequestById(Number(id)),
    enabled: !!id,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRequest(Number(id)),
    onSuccess: () => {
      toast({ title: 'Request deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate('/requests');
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to delete',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: RequestStatus) => api.updateRequestStatus(Number(id), status),
    onSuccess: (data) => {
      toast({ title: `Status updated to ${data.status}` });
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setShowScrapWarning(false);
      setPendingStatus(null);
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to update status',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (technicianId: number) => api.assignTechnician(Number(id), technicianId),
    onSuccess: () => {
      toast({ title: 'Technician assigned successfully' });
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to assign technician',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
    },
  });

  if (isLoading) return <LoadingState message="Loading request..." />;
  if (error || !request) return <ErrorState retry={() => refetch()} />;

  const allowedTransitions = STATUS_TRANSITIONS[request.status];
  const team = teams?.find((t) => t.id === request.team);
  const teamMembers = team?.members || [];

  const handleStatusChange = (status: RequestStatus) => {
    if (status === 'SCRAP') {
      setPendingStatus(status);
      setShowScrapWarning(true);
    } else {
      statusMutation.mutate(status);
    }
  };

  const confirmScrap = () => {
    if (pendingStatus) {
      statusMutation.mutate(pendingStatus);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={request.subject}
        description={`Request #${request.id}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/requests')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={() => navigate(`/requests/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Status and Type */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <StatusBadge status={request.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <TypeBadge type={request.request_type} />
          </div>
        </div>

        {/* Status Actions */}
        {allowedTransitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.includes('IN_PROGRESS') && (
                  <Button
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={statusMutation.isPending}
                    className="bg-status-in-progress text-status-in-progress-foreground hover:bg-status-in-progress/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Work
                  </Button>
                )}
                {allowedTransitions.includes('REPAIRED') && (
                  <Button
                    onClick={() => handleStatusChange('REPAIRED')}
                    disabled={statusMutation.isPending}
                    className="bg-status-repaired text-status-repaired-foreground hover:bg-status-repaired/90"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Repaired
                  </Button>
                )}
                {allowedTransitions.includes('SCRAP') && (
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusChange('SCRAP')}
                    disabled={statusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Scrap
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                to={`/equipment/${request.equipment}`}
                className="text-lg font-medium hover:underline"
              >
                {request.equipment_name || `Equipment #${request.equipment}`}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {format(new Date(request.scheduled_date), 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(request.scheduled_date), 'HH:mm')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium font-mono">{request.duration}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{request.team_name || '—'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Technician Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Technician Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                {request.technician_name ? (
                  <p className="text-sm">
                    Currently assigned to: <strong>{request.technician_name}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No technician assigned</p>
                )}
              </div>
              {request.team && teamMembers.length > 0 && (
                <Select
                  value={request.technician?.toString() || ''}
                  onValueChange={(value) => assignMutation.mutate(Number(value))}
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Assign technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!request.team && (
                <p className="text-sm text-muted-foreground">
                  Assign a team to this request first
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Created By</dt>
                <dd className="font-medium">{request.created_by_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created At</dt>
                <dd className="font-medium">
                  {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">
                  {format(new Date(request.updated_at), 'MMM d, yyyy HH:mm')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Request"
        description="Are you sure you want to delete this maintenance request? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={showScrapWarning}
        onOpenChange={setShowScrapWarning}
        title="Mark as Scrap"
        description="Marking this request as SCRAP will automatically set the associated equipment as UNUSABLE. This action cannot be reversed. Are you sure?"
        confirmLabel="Mark as Scrap"
        variant="warning"
        onConfirm={confirmScrap}
        loading={statusMutation.isPending}
      />
    </div>
  );
}
