import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { TeamFormData, User } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

const teamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  member_ids: z.array(z.number()),
});

export default function TeamFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const { data: team, isLoading: loadingTeam } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.getTeamById(Number(id)),
    enabled: isEditing,
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      member_ids: [],
    },
  });

  const selectedMembers = watch('member_ids');

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        member_ids: team.member_ids,
      });
    }
  }, [team, reset]);

  const mutation = useMutation({
    mutationFn: (data: TeamFormData) =>
      isEditing ? api.updateTeam(Number(id), data) : api.createTeam(data),
    onSuccess: () => {
      toast({ title: `Team ${isEditing ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      navigate('/teams');
    },
    onError: (error: ApiError) => {
      const fieldErrors: Record<string, string> = {};
      Object.entries(error.errors).forEach(([key, messages]) => {
        fieldErrors[key] = messages[0];
      });
      setApiErrors(fieldErrors);
      toast({
        title: 'Validation error',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: TeamFormData) => {
    setApiErrors({});
    mutation.mutate(data);
  };

  const toggleMember = (userId: number) => {
    const current = selectedMembers || [];
    if (current.includes(userId)) {
      setValue(
        'member_ids',
        current.filter((id) => id !== userId)
      );
    } else {
      setValue('member_ids', [...current, userId]);
    }
  };

  if ((isEditing && loadingTeam) || loadingUsers) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? 'Edit Team' : 'New Team'}
        description={isEditing ? `Editing ${team?.name}` : 'Create a new maintenance team'}
        actions={
          <Button variant="outline" onClick={() => navigate('/teams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g. HVAC Team"
                />
                {(errors.name || apiErrors.name) && (
                  <p className="text-sm text-destructive">
                    {errors.name?.message || apiErrors.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Select users to add to this team. Members can be assigned to maintenance requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users && users.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleMember(user.id)}
                    >
                      <Checkbox
                        checked={selectedMembers?.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{user.username} • {user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users available.</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedMembers?.length || 0} member{selectedMembers?.length !== 1 ? 's' : ''} selected
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/teams')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Team
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
