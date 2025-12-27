import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { RequestFormData, RequestType } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

const requestSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  equipment: z.number({ required_error: 'Equipment is required' }),
  request_type: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  duration: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Duration must be in HH:MM:SS format'),
  technician: z.number().optional().nullable(),
  team: z.number().optional().nullable(),
});

export default function RequestFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const { data: request, isLoading: loadingRequest } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequestById(Number(id)),
    enabled: isEditing,
  });

  const { data: equipmentList } = useQuery({
    queryKey: ['equipment-all'],
    queryFn: () => api.getEquipment(1),
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      subject: '',
      equipment: undefined,
      request_type: 'PREVENTIVE',
      scheduled_date: '',
      duration: '01:00:00',
      technician: null,
      team: null,
    },
  });

  const selectedEquipmentId = watch('equipment');
  const selectedTeamId = watch('team');

  // Auto-set team from equipment's default_team
  const selectedEquipment = equipmentList?.results.find(
    (e) => e.id === selectedEquipmentId
  );

  useEffect(() => {
    if (selectedEquipment?.default_team && !selectedTeamId) {
      setValue('team', selectedEquipment.default_team);
    }
  }, [selectedEquipment, selectedTeamId, setValue]);

  // Get team members for technician selection
  const team = teams?.find((t) => t.id === selectedTeamId);
  const teamMembers = team?.members || [];

  useEffect(() => {
    if (request) {
      const scheduledDate = new Date(request.scheduled_date);
      reset({
        subject: request.subject,
        equipment: request.equipment,
        request_type: request.request_type,
        scheduled_date: format(scheduledDate, "yyyy-MM-dd'T'HH:mm"),
        duration: request.duration,
        technician: request.technician,
        team: request.team,
      });
    }
  }, [request, reset]);

  const mutation = useMutation({
    mutationFn: (data: RequestFormData) => {
      // Convert local datetime to ISO 8601
      const formattedData = {
        ...data,
        scheduled_date: new Date(data.scheduled_date).toISOString(),
      };
      return isEditing
        ? api.updateRequest(Number(id), formattedData)
        : api.createRequest(formattedData);
    },
    onSuccess: () => {
      toast({ title: `Request ${isEditing ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      navigate('/requests');
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

  const onSubmit = (data: RequestFormData) => {
    setApiErrors({});
    mutation.mutate(data);
  };

  if (isEditing && loadingRequest) {
    return <LoadingState message="Loading request..." />;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? 'Edit Request' : 'New Maintenance Request'}
        description={
          isEditing ? `Editing request #${id}` : 'Create a new maintenance work order'
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/requests')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  {...register('subject')}
                  placeholder="Brief description of the maintenance work"
                />
                {(errors.subject || apiErrors.subject) && (
                  <p className="text-sm text-destructive">
                    {errors.subject?.message || apiErrors.subject}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Equipment *</Label>
                  <Select
                    value={watch('equipment')?.toString() || ''}
                    onValueChange={(value) => setValue('equipment', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentList?.results.map((equipment) => (
                        <SelectItem key={equipment.id} value={equipment.id.toString()}>
                          {equipment.name} ({equipment.serial_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(errors.equipment || apiErrors.equipment) && (
                    <p className="text-sm text-destructive">
                      {errors.equipment?.message || apiErrors.equipment}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Request Type *</Label>
                  <Select
                    value={watch('request_type')}
                    onValueChange={(value) =>
                      setValue('request_type', value as RequestType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                      <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {watch('request_type') === 'PREVENTIVE'
                      ? 'Will appear on calendar'
                      : 'Urgent task - not shown on calendar'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Scheduled Date & Time *</Label>
                  <Input
                    id="scheduled_date"
                    type="datetime-local"
                    {...register('scheduled_date')}
                  />
                  {(errors.scheduled_date || apiErrors.scheduled_date) && (
                    <p className="text-sm text-destructive">
                      {errors.scheduled_date?.message || apiErrors.scheduled_date}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (HH:MM:SS) *</Label>
                  <Input
                    id="duration"
                    {...register('duration')}
                    placeholder="01:00:00"
                    className="font-mono"
                  />
                  {(errors.duration || apiErrors.duration) && (
                    <p className="text-sm text-destructive">
                      {errors.duration?.message || apiErrors.duration}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select
                    value={watch('team')?.toString() || ''}
                    onValueChange={(value) =>
                      setValue('team', value ? Number(value) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assigned from equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEquipment?.default_team && (
                    <p className="text-xs text-muted-foreground">
                      Default team from equipment: {selectedEquipment.default_team_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Technician</Label>
                  <Select
                    value={watch('technician')?.toString() || ''}
                    onValueChange={(value) =>
                      setValue('technician', value ? Number(value) : null)
                    }
                    disabled={!selectedTeamId || teamMembers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedTeamId
                            ? 'Select technician'
                            : 'Select team first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTeamId && teamMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No members in this team
                    </p>
                  )}
                  {(errors.technician || apiErrors.technician) && (
                    <p className="text-sm text-destructive">
                      {errors.technician?.message || apiErrors.technician}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
