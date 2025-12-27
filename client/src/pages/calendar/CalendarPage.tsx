import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/ui/loading';
import { ErrorState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading, error, refetch } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => api.getCalendarEvents(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, scheduled_date }: { id: number; scheduled_date: string }) =>
      api.updateRequest(id, { scheduled_date }),
    onSuccess: () => {
      toast({ title: 'Event rescheduled successfully' });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to reschedule',
        description: error.getAllErrors().join(', '),
        variant: 'destructive',
      });
      // Refetch to reset the calendar
      refetch();
    },
  });

  if (isLoading) return <LoadingState message="Loading calendar..." />;
  if (error) return <ErrorState retry={() => refetch()} />;

  const calendarEvents = events?.map((event) => ({
    id: event.id.toString(),
    title: event.title,
    start: event.start,
    end: event.end,
    extendedProps: {
      request_id: event.request_id,
    },
    backgroundColor: 'hsl(142 71% 45%)',
    borderColor: 'hsl(142 71% 40%)',
  })) || [];

  const handleEventClick = (info: any) => {
    const requestId = info.event.extendedProps.request_id;
    navigate(`/requests/${requestId}`);
  };

  const handleEventDrop = (info: any) => {
    const requestId = info.event.extendedProps.request_id;
    const newDate = info.event.start.toISOString();
    
    updateMutation.mutate({
      id: requestId,
      scheduled_date: newDate,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Maintenance Calendar"
        description="View and reschedule preventive maintenance"
      />

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-4">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              editable={true}
              droppable={true}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek',
              }}
              height="auto"
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false,
              }}
            />
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-muted-foreground text-center">
          Drag and drop events to reschedule. Click an event to view details.
          Only preventive maintenance is shown.
        </p>
      </div>
    </div>
  );
}
