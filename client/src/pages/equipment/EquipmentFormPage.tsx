import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { EquipmentFormData } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

const equipmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  serial_number: z.string().min(1, 'Serial number is required').max(100),
  department_or_owner: z.string().min(1, 'Department/Owner is required').max(100),
  location: z.string().min(1, 'Location is required').max(100),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  warranty_end: z.string().optional().nullable(),
  default_team: z.number().optional().nullable(),
  default_technician: z.number().optional().nullable(),
  is_usable: z.boolean(),
});

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const { data: equipment, isLoading: loadingEquipment } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => api.getEquipmentById(Number(id)),
    enabled: isEditing,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(),
  });

  const { data: users } = useQuery({
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
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: '',
      serial_number: '',
      department_or_owner: '',
      location: '',
      purchase_date: '',
      warranty_end: null,
      default_team: null,
      default_technician: null,
      is_usable: true,
    },
  });

  const selectedTeamId = watch('default_team');

  // Filter technicians by selected team
  const availableTechnicians = selectedTeamId && teams
    ? teams.find(t => t.id === selectedTeamId)?.members || []
    : users || [];

  useEffect(() => {
    if (equipment) {
      reset({
        name: equipment.name,
        serial_number: equipment.serial_number,
        department_or_owner: equipment.department_or_owner,
        location: equipment.location,
        purchase_date: equipment.purchase_date,
        warranty_end: equipment.warranty_end,
        default_team: equipment.default_team,
        default_technician: equipment.default_technician,
        is_usable: equipment.is_usable,
      });
    }
  }, [equipment, reset]);

  const mutation = useMutation({
    mutationFn: (data: EquipmentFormData) =>
      isEditing
        ? api.updateEquipment(Number(id), data)
        : api.createEquipment(data),
    onSuccess: () => {
      toast({ title: `Equipment ${isEditing ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      navigate('/equipment');
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

  const onSubmit = (data: EquipmentFormData) => {
    setApiErrors({});
    mutation.mutate(data);
  };

  if (isEditing && loadingEquipment) {
    return <LoadingState message="Loading equipment..." />;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? 'Edit Equipment' : 'New Equipment'}
        description={isEditing ? `Editing ${equipment?.name}` : 'Add a new piece of equipment'}
        actions={
          <Button variant="outline" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Equipment name"
                  />
                  {(errors.name || apiErrors.name) && (
                    <p className="text-sm text-destructive">
                      {errors.name?.message || apiErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number *</Label>
                  <Input
                    id="serial_number"
                    {...register('serial_number')}
                    placeholder="Unique serial number"
                    className="font-mono"
                  />
                  {(errors.serial_number || apiErrors.serial_number) && (
                    <p className="text-sm text-destructive">
                      {errors.serial_number?.message || apiErrors.serial_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department_or_owner">Department/Owner *</Label>
                  <Input
                    id="department_or_owner"
                    {...register('department_or_owner')}
                    placeholder="e.g. IT Department"
                  />
                  {errors.department_or_owner && (
                    <p className="text-sm text-destructive">
                      {errors.department_or_owner.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="e.g. Building A, Room 101"
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive">
                      {errors.location.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date *</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    {...register('purchase_date')}
                  />
                  {errors.purchase_date && (
                    <p className="text-sm text-destructive">
                      {errors.purchase_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warranty_end">Warranty End</Label>
                  <Input
                    id="warranty_end"
                    type="date"
                    {...register('warranty_end')}
                  />
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
                  <Label>Default Team</Label>
                  <Select
                    value={watch('default_team')?.toString() || ''}
                    onValueChange={(value) =>
                      setValue('default_team', value ? Number(value) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Technician</Label>
                  <Select
                    value={watch('default_technician')?.toString() || ''}
                    onValueChange={(value) =>
                      setValue('default_technician', value ? Number(value) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTechnicians.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.first_name} {user.last_name} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTeamId && (
                    <p className="text-xs text-muted-foreground">
                      Showing team members only
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Equipment Usable</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark this equipment as usable or out of service
                  </p>
                </div>
                <Switch
                  checked={watch('is_usable')}
                  onCheckedChange={(checked) => setValue('is_usable', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/equipment')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Equipment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
