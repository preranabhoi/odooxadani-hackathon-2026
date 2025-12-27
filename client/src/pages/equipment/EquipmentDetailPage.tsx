import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { ErrorState } from '@/components/ui/empty-state';
import { UsableBadge, StatusBadge, TypeBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Pencil, Trash2, ArrowLeft, Calendar, User, MapPin, Building } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: equipment, isLoading, error, refetch } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => api.getEquipmentById(Number(id)),
    enabled: !!id,
  });

  const { data: requests } = useQuery({
    queryKey: ['equipment', id, 'requests'],
    queryFn: () => api.getEquipmentRequests(Number(id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteEquipment(Number(id)),
    onSuccess: () => {
      toast({ title: 'Equipment deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      navigate('/equipment');
    },
    onError: (error: ApiError) => {
      toast({ 
        title: 'Failed to delete', 
        description: error.getAllErrors().join(', '),
        variant: 'destructive' 
      });
    },
  });

  if (isLoading) return <LoadingState message="Loading equipment..." />;
  if (error || !equipment) return <ErrorState retry={() => refetch()} />;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={equipment.name}
        description={`Serial: ${equipment.serial_number}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/equipment')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={() => navigate(`/equipment/${id}/edit`)}>
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
        {/* Equipment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4" />
                Department/Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{equipment.department_or_owner}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{equipment.location}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Purchase Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {format(new Date(equipment.purchase_date), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UsableBadge isUsable={equipment.is_usable} />
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Warranty End</dt>
                <dd className="font-medium">
                  {equipment.warranty_end 
                    ? format(new Date(equipment.warranty_end), 'MMM d, yyyy')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Default Team</dt>
                <dd className="font-medium">{equipment.default_team_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Default Technician</dt>
                <dd className="font-medium">{equipment.default_technician_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {format(new Date(equipment.created_at), 'MMM d, yyyy HH:mm')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Maintenance History */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {requests && requests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Technician</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link 
                          to={`/requests/${request.id}`}
                          className="font-medium hover:underline"
                        >
                          {request.subject}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={request.request_type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.scheduled_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{request.technician_name || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No maintenance requests for this equipment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This will not delete associated maintenance requests."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
