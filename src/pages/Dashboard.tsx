import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Dumbbell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import VoiceRecorder from '@/components/VoiceRecorder';
import { Workout } from '@/types/workout';
import { supabase } from '@/integrations/client';
import { Input } from '@/components/ui/input';

// Rename ExerciseSetRow to WorkoutSet for clarity
export interface WorkoutSet {
  id: string;
  user_id: string;
  date: string;
  data: {
    exerciseName: string;
    muscleGroup: string;
    weight: number;
    reps: number;
    timestamp: number;
  };
  created_at?: string;
}

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([]);
  const [showAddSet, setShowAddSet] = useState(false);

  // Load workouts from localStorage on component mount
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('workouts');
    if (savedWorkouts) {
      try {
        const parsed = JSON.parse(savedWorkouts);
        setWorkouts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setWorkouts([]);
      }
    }
  }, []);

  // Save workouts to localStorage whenever workouts change
  useEffect(() => {
    localStorage.setItem('workouts', JSON.stringify(workouts));
  }, [workouts]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id || null);
    });
  }, []);

  // Fetch all sets for the user and selected date from 'workouts' table
  useEffect(() => {
    if (!userId) return;
    const fetchSets = async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'));
      setWorkoutSets(Array.isArray(data) ? data : []);
    };
    fetchSets();
  }, [userId, selectedDate]);

  // Add a new set as a row in 'workouts' table
  const addWorkoutSet = async (setData: { exerciseName: string; muscleGroup: string; weight: number; reps: number; }) => {
    if (!userId) return;
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      user_id: userId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      data: {
        ...setData,
        timestamp: Date.now(),
      },
    };
    const { error } = await supabase.from('workouts').insert(newSet);
    if (error) {
      console.error('Supabase insert error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setWorkoutSets(prev => Array.isArray(prev) ? [...prev, newSet] : [newSet]);
      toast({ title: 'Set Added!', description: 'Your set has been saved.' });
    }
  };

  // Update a set in 'workouts' table
  const updateWorkoutSet = async (updatedSet: WorkoutSet) => {
    await supabase.from('workouts').update(updatedSet).eq('id', updatedSet.id);
    setWorkoutSets(prev => prev.map(set => set.id === updatedSet.id ? updatedSet : set));
    toast({ title: 'Set Updated!', description: 'Your changes have been saved.' });
  };

  // Delete a set from 'workouts' table
  const deleteWorkoutSet = async (id: string) => {
    await supabase.from('workouts').delete().eq('id', id);
    setWorkoutSets(prev => prev.filter(set => set.id !== id));
    toast({ title: 'Set Deleted', description: 'Set has been removed.' });
  };

  // Group sets by muscle group, ordered by first timestamp
  const groupedByMuscle = React.useMemo(() => {
    const groups: Record<string, WorkoutSet[]> = {};
    workoutSets.forEach(set => {
      const mg = set.data.muscleGroup;
      if (!groups[mg]) groups[mg] = [];
      groups[mg].push(set);
    });
    // Sort sets within each group by timestamp
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.data.timestamp - b.data.timestamp));
    // Sort muscle groups by the timestamp of their first set
    return Object.entries(groups)
      .sort(([, a], [, b]) => a[0].data.timestamp - b[0].data.timestamp)
      .map(([muscleGroup, sets]) => ({ muscleGroup, sets }));
  }, [workoutSets]);

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
            Sets for {format(selectedDate, "MMM dd, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Add Set Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowAddSet(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Set
        </Button>
      </div>

      {/* Sets Display or Empty State */}
      {groupedByMuscle.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="text-center py-8 text-gray-500">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sets recorded for this day</p>
            <p className="text-sm mt-1">Tap "Add Set" to get started!</p>
          </CardContent>
        </Card>
      ) : (
        groupedByMuscle.map(group => (
          <Card key={group.muscleGroup} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold text-purple-600">{group.muscleGroup}</CardTitle>
            </CardHeader>
            <CardContent>
              {group.sets.map(set => (
                <div key={set.id} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
                  <div>
                    <span className="font-semibold text-gray-800">{set.data.exerciseName}</span>
                    <span className="ml-2 text-gray-500">(Weight: {set.data.weight}, Reps: {set.data.reps})</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateWorkoutSet({ ...set, /* open edit modal here */ })}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteWorkoutSet(set.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Voice Recorder Modal */}
      {showAddSet && (
        <VoiceRecorder
          selectedDate={selectedDate}
          onSave={addWorkoutSet}
          onClose={() => setShowAddSet(false)}
          userId={userId}
        />
      )}
    </div>
  );
};

export default Dashboard;
