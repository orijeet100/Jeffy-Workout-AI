
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Dumbbell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import WorkoutCard from '@/components/WorkoutCard';
import VoiceRecorder from '@/components/VoiceRecorder';
import { useWorkouts } from '@/hooks/useWorkouts';

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  
  const { workouts, isLoading, addWorkout, deleteWorkout, updateWorkout } = useWorkouts(selectedDate);

  const handleAddWorkout = (workoutData: any) => {
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
    addWorkout({
      ...workoutData,
      date: selectedDateString
    });
    setShowAddWorkout(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Date Selector */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-white/50 border-purple-200 hover:bg-white/70",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4 text-center">
          <p className="text-lg font-semibold text-gray-800">
            Workouts for {format(selectedDate, "MMM dd, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Add Workout Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowAddWorkout(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Workout
        </Button>
      </div>

      {/* Today's Workouts */}
      {workouts.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="text-center py-8 text-gray-500">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No workouts recorded for this day</p>
            <p className="text-sm mt-1">Tap "Add Workout" to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onDelete={deleteWorkout}
              onUpdate={updateWorkout}
            />
          ))}
        </div>
      )}

      {/* Voice Recorder Modal */}
      {showAddWorkout && (
        <VoiceRecorder
          selectedDate={selectedDate}
          onSave={handleAddWorkout}
          onClose={() => setShowAddWorkout(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
