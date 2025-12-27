import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Equipment } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { DataPagination } from '@/components/ui/data-pagination';
import { UsableBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Eye, Wrench } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function EquipmentListPage() {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['equipment', page],
    queryFn: () => api.getEquipment(page),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteEquipment(id),
    onSuccess: () => {
      toast({ title: 'Equipment deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeleteId(null);
    },
    onError: (error: ApiError) => {
      toast({ 
        title: 'Failed to delete equipment', 
        description: error.getAllErrors().join(', '),
        variant: 'destructive' 
      });
    },
  });

  const totalPages = data ? Math.ceil(data.count / 10) : 1;

  if (isLoading) return <LoadingState message="Loading equipment..." />;
  if (error) return <ErrorState retry={() => refetch()} />;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Equipment"
        description="Manage company equipment and assets"
        actions={
          <Button onClick={() => navigate('/equipment/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        {data?.results.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-10 w-10" />}
            title="No equipment found"
            description="Get started by adding your first piece of equipment."
            action={
              <Button onClick={() => navigate('/equipment/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Department/Owner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default Team</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((equipment) => (
                <TableRow key={equipment.id}>
                  <TableCell className="font-medium">
                    <Link 
                      to={`/equipment/${equipment.id}`}
                      className="hover:underline"
                    >
                      {equipment.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {equipment.serial_number}
                  </TableCell>
                  <TableCell>{equipment.department_or_owner}</TableCell>
                  <TableCell>{equipment.location}</TableCell>
                  <TableCell>
                    <UsableBadge isUsable={equipment.is_usable} />
                  </TableCell>
                  <TableCell>{equipment.default_team_name || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/equipment/${equipment.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/equipment/${equipment.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(equipment.id)}
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
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
