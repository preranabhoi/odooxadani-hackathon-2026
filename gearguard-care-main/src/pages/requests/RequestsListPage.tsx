import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { MaintenanceRequest, RequestStatus, RequestType } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { DataPagination } from '@/components/ui/data-pagination';
import { StatusBadge, TypeBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Eye, Trash2, ClipboardList } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Fixed Select empty value issue
export default function RequestsListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['requests', page, statusFilter, typeFilter],
    queryFn: () =>
      api.getRequests({
        page,
        status: statusFilter === 'all' ? undefined : statusFilter,
        request_type: typeFilter === 'all' ? undefined : typeFilter,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteRequest(id),
    onSuccess: () => {
      toast({ title: 'Request deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setDeleteId(null);
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to delete request',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
    },
  });

  const totalPages = data ? Math.ceil(data.count / 10) : 1;

  if (isLoading) return <LoadingState message="Loading requests..." />;
  if (error) return <ErrorState retry={() => refetch()} />;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Maintenance Requests"
        description="View and manage all maintenance work orders"
        actions={
          <Button onClick={() => navigate('/requests/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as RequestStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="REPAIRED">Repaired</SelectItem>
              <SelectItem value="SCRAP">Scrap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as RequestType | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PREVENTIVE">Preventive</SelectItem>
              <SelectItem value="CORRECTIVE">Corrective</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'all' || typeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {data?.results.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="No requests found"
            description={
              statusFilter || typeFilter
                ? 'Try adjusting your filters.'
                : 'Get started by creating your first maintenance request.'
            }
            action={
              !statusFilter && !typeFilter ? (
                <Button onClick={() => navigate('/requests/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/requests/${request.id}`}
                      className="hover:underline"
                    >
                      {request.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{request.equipment_name || '—'}</TableCell>
                  <TableCell>
                    <TypeBadge type={request.request_type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.scheduled_date), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{request.team_name || '—'}</TableCell>
                  <TableCell>{request.technician_name || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/requests/${request.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.count > 0 && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={data.count}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Request"
        description="Are you sure you want to delete this maintenance request? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
