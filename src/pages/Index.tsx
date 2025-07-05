
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Dumbbell, Clock, Target } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import WorkoutCard from '@/components/WorkoutCard';
import VoiceRecorder from '@/components/VoiceRecorder';
import { Workout } from '@/types/workout';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showAddWorkout, setShowAddWorkout] = useState(false);

  // Load workouts from localStorage on component mount
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('workouts');
    if (savedWorkouts) {
      setWorkouts(JSON.parse(savedWorkouts));
    }
  }, []);

  // Save workouts to localStorage whenever workouts change
  useEffect(() => {
    localStorage.setItem('workouts', JSON.stringify(workouts));
  }, [workouts]);

  const addWorkout = (workoutData: Omit<Workout, 'id' | 'timestamp'>) => {
    const newWorkout: Workout = {
      ...workoutData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setWorkouts(prev => [...prev, newWorkout]);
    setShowAddWorkout(false);
    toast({
      title: "Workout Added!",
      description: "Your workout has been saved successfully.",
    });
  };

  const deleteWorkout = (id: string) => {
    setWorkouts(prev => prev.filter(workout => workout.id !== id));
    toast({
      title: "Workout Deleted",
      description: "Workout has been removed from your history.",
    });
  };

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const todaysWorkouts = workouts.filter(workout => workout.date === selectedDateString);

  const getTotalWorkouts = () => workouts.length;
  const getThisWeekWorkouts = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return workouts.filter(workout => new Date(workout.timestamp) >= oneWeekAgo).length;
  };

  const getTotalSets = () => {
    return workouts.reduce((total, workout) => total + workout.exerciseSets.length, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Dumbbell className="h-6 w-6" />
            FitTracker Pro
          </h1>
          <p className="text-purple-100">Track your workout sets with voice</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{getTotalWorkouts()}</p>
              <p className="text-sm text-gray-600">Total Workouts</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{getTotalSets()}</p>
              <p className="text-sm text-gray-600">Total Sets</p>
            </CardContent>
          </Card>
        </div>

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
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              Workouts for {format(selectedDate, "MMM dd, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysWorkouts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No workouts recorded for this day</p>
                <p className="text-sm mt-1">Tap "Add Workout" to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysWorkouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onDelete={deleteWorkout}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Voice Recorder Modal */}
      {showAddWorkout && (
        <VoiceRecorder
          selectedDate={selectedDate}
          onSave={addWorkout}
          onClose={() => setShowAddWorkout(false)}
        />
      )}
    </div>
  );
};

export default Index;
