
import React, { useState } from 'react';
import { Plus, Calendar, TrendingUp, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkoutCard } from '@/components/WorkoutCard';
import { VoiceRecordingControls } from '@/components/VoiceRecordingControls';
import { ExerciseSetForm } from '@/components/ExerciseSetForm';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useExerciseKnowledge } from '@/hooks/useExerciseKnowledge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDate, setWorkoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [parsedWorkoutData, setParsedWorkoutData] = useState<any>(null);
  
  const { workouts, addWorkout, isLoading: workoutsLoading } = useWorkouts();
  const { exercises, isLoading: exercisesLoading } = useExerciseKnowledge();

  const handleCreateWorkout = async () => {
    if (!workoutTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a workout title",
        variant: "destructive"
      });
      return;
    }

    try {
      const newWorkout = await addWorkout({
        title: workoutTitle,
        date: workoutDate,
        exercises: parsedWorkoutData?.exercises || []
      });

      if (newWorkout) {
        setIsCreateDialogOpen(false);
        setWorkoutTitle('');
        setWorkoutDate(format(new Date(), 'yyyy-MM-dd'));
        setParsedWorkoutData(null);
        
        toast({
          title: "Workout Created",
          description: `${workoutTitle} has been added to your workouts.`,
        });
      }
    } catch (error) {
      console.error('Error creating workout:', error);
      toast({
        title: "Error",
        description: "Failed to create workout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWorkoutParsed = (workoutData: any) => {
    setParsedWorkoutData(workoutData);
    setWorkoutTitle(`Workout - ${format(new Date(), 'MMM dd, yyyy')}`);
  };

  const totalWorkouts = workouts?.length || 0;
  const thisWeekWorkouts = workouts?.filter(workout => {
    const workoutDate = new Date(workout.date);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return workoutDate >= weekStart;
  }).length || 0;

  const totalExercises = Object.values(exercises).flat().length;

  if (workoutsLoading || exercisesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Workout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <VoiceRecordingControls onWorkoutParsed={handleWorkoutParsed} />
              
              <div className="space-y-2">
                <Label htmlFor="title">Workout Title</Label>
                <Input
                  id="title"
                  placeholder="Enter workout title"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                />
              </div>

              {parsedWorkoutData && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Parsed Workout Preview:</p>
                  <div className="space-y-2">
                    {parsedWorkoutData.exercises.map((exercise: any, index: number) => (
                      <div key={index} className="text-sm text-blue-700">
                        <strong>{exercise.name}</strong> - {exercise.sets.length} set(s)
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateWorkout}
                  className="flex-1"
                  disabled={!workoutTitle.trim()}
                >
                  Create Workout
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setParsedWorkoutData(null);
                    setWorkoutTitle('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Total Workouts
            </CardTitle>
            <Dumbbell className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">{totalWorkouts}</div>
            <p className="text-xs text-purple-600">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              This Week
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{thisWeekWorkouts}</div>
            <p className="text-xs text-blue-600">Workouts completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Exercise Library
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{totalExercises}</div>
            <p className="text-xs text-green-600">Available exercises</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workouts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Workouts</h2>
        {workouts && workouts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.slice(0, 6).map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <CardContent>
              <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workouts yet</h3>
              <p className="text-gray-500 mb-4">Start tracking your fitness journey by creating your first workout.</p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
