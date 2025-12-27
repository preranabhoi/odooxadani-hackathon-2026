import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { MaintenanceTeam } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function TeamsListPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teams, isLoading, error, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTeam(id),
    onSuccess: () => {
      toast({ title: 'Team deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setDeleteId(null);
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to delete team',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
    },
  });

  if (isLoading) return <LoadingState message="Loading teams..." />;
  if (error) return <ErrorState retry={() => refetch()} />;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Maintenance Teams"
        description="Manage maintenance teams and their members"
        actions={
          <Button onClick={() => navigate('/teams/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {teams?.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No teams found"
            description="Get started by creating your first maintenance team."
            action={
              <Button onClick={() => navigate('/teams/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams?.map((team) => (
              <Card key={team.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/teams/${team.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {team.members.slice(0, 5).map((member) => (
                      <Badge key={member.id} variant="secondary" className="text-xs">
                        {member.first_name} {member.last_name}
                      </Badge>
                    ))}
                    {team.members.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{team.members.length - 5} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Team"
        description="Are you sure you want to delete this team? Equipment and requests assigned to this team will have their team set to none."
        confirmLabel="Delete"
        variant="warning"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
