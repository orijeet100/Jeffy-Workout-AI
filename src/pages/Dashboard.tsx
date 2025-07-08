import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Dumbbell, Pencil, Trash2 } from 'lucide-react';
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
  const [editSet, setEditSet] = useState<WorkoutSet | null>(null);
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editReps, setEditReps] = useState<number>(0);
  const [editExercise, setEditExercise] = useState<null | { muscleGroup: string; exerciseName: string; sets: WorkoutSet[] }>(null);
  const [editSets, setEditSets] = useState<WorkoutSet[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{exerciseName: string, sets: WorkoutSet[]} | null>(null);

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
  const addWorkoutSet = async (sets: { exerciseName: string; muscleGroup: string; weight: number; reps: number; }[]) => {
    if (!userId || !Array.isArray(sets) || sets.length === 0) return;
    const now = Date.now();
    const newSets: WorkoutSet[] = sets.map((setData, idx) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      data: {
        ...setData,
        timestamp: now + idx, // ensure unique timestamp per set
      },
    }));
    const { error } = await supabase.from('workouts').insert(newSets);
    if (error) {
      console.error('Supabase insert error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setWorkoutSets(prev => Array.isArray(prev) ? [...prev, ...newSets] : [...newSets]);
      toast({ title: 'Sets Added!', description: `${newSets.length} set(s) have been saved.` });
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

  // Group by muscle group, then by exercise name, then by set order
  const groupedByMuscle = React.useMemo(() => {
    const groups: Record<string, Record<string, WorkoutSet[]>> = {};
    workoutSets.forEach(set => {
      const mg = set.data.muscleGroup;
      const ex = set.data.exerciseName;
      if (!groups[mg]) groups[mg] = {};
      if (!groups[mg][ex]) groups[mg][ex] = [];
      groups[mg][ex].push(set);
    });
    // Sort sets within each exercise by timestamp
    Object.values(groups).forEach(exGroups => {
      Object.values(exGroups).forEach(arr => arr.sort((a, b) => a.data.timestamp - b.data.timestamp));
    });
    // Sort muscle groups by the timestamp of their first set
    const sortedMuscleGroups = Object.entries(groups)
      .sort(([, exGroupsA], [, exGroupsB]) => {
        const firstA = Object.values(exGroupsA)[0]?.[0]?.data.timestamp || 0;
        const firstB = Object.values(exGroupsB)[0]?.[0]?.data.timestamp || 0;
        return firstA - firstB;
      });
    return sortedMuscleGroups.map(([muscleGroup, exercises]) => ({ muscleGroup, exercises }));
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
        groupedByMuscle.map((group, groupIdx) => (
          <div key={group.muscleGroup} className="mb-8">
            {/* Muscle Group Header with pill and lines */}
            <div className="flex items-center mb-4">
              <div className="flex-1 h-px bg-purple-400" />
              <span className="mx-4 px-6 py-1 bg-purple-50 text-purple-700 font-semibold rounded-full text-lg shadow-sm border border-purple-100">
                {group.muscleGroup}
              </span>
              <div className="flex-1 h-px bg-purple-400" />
            </div>
            {Object.entries(group.exercises).map(([exerciseName, sets]) => (
              <div key={exerciseName} className="bg-white border border-purple-100 rounded-2xl shadow-md mb-6 p-0">
                {/* Exercise Card Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-6 w-6 text-purple-400" />
                    <span className="text-2xl font-bold text-gray-900">{exerciseName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 rounded hover:bg-purple-100 text-blue-600"
                      title="Edit"
                      onClick={() => {
                        setEditExercise({ muscleGroup: group.muscleGroup, exerciseName, sets });
                        setEditSets(sets.map(s => ({ ...s })));
                      }}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      className="p-2 rounded hover:bg-red-100 text-red-600"
                      title="Delete"
                      onClick={() => setDeleteConfirm({ exerciseName, sets })}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {/* Set Rows */}
                {sets.map((set, idx) => (
                  <div key={set.id} className="flex items-center justify-between bg-purple-50 rounded-xl mx-4 my-3 px-6 py-3">
                    <span className="text-purple-600 font-semibold text-lg">Set {idx + 1}</span>
                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-1 text-gray-800 font-medium text-lg">
                        <Dumbbell className="h-5 w-5 text-gray-400" />
                        {set.data.weight} <span className="text-gray-500 text-base ml-1">lb</span>
                      </span>
                      <span className="text-gray-800 font-medium text-lg">{set.data.reps} <span className="text-gray-500 text-base ml-1">reps</span></span>
                    </div>
                  </div>
                ))}
              </div>
          ))}
        </div>
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

      {/* Edit Modal */}
      {editExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-6 w-6 text-purple-400" />
              <span className="text-2xl font-bold text-gray-900">{editExercise.exerciseName}</span>
            </div>
            {editSets.map((set, idx) => (
              <div key={set.id} className="flex items-center justify-between bg-purple-50 rounded-xl mb-4 px-4 py-3">
                <span className="text-purple-600 font-semibold text-lg">Set {idx + 1}</span>
                <input
                  type="number"
                  value={set.data.weight}
                  min={0}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setEditSets(prev => prev.map((s, i) => i === idx ? { ...s, data: { ...s.data, weight: val } } : s));
                  }}
                  className="border rounded px-2 py-1 w-20 text-right mx-2"
                />
                <input
                  type="number"
                  value={set.data.reps}
                  min={0}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setEditSets(prev => prev.map((s, i) => i === idx ? { ...s, data: { ...s.data, reps: val } } : s));
                  }}
                  className="border rounded px-2 py-1 w-20 text-right mx-2"
                />
                <button
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => setEditSets(prev => prev.filter((_, i) => i !== idx))}
                  title="Remove Set"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              className="w-full flex items-center justify-center gap-2 border rounded-lg py-2 my-2 text-purple-700 hover:bg-purple-50"
              onClick={() => setEditSets(prev => [...prev, {
                id: crypto.randomUUID(),
                user_id: editSets[0]?.user_id || '',
                date: editSets[0]?.date || '',
                data: {
                  exerciseName: editExercise.exerciseName,
                  muscleGroup: editExercise.muscleGroup,
                  weight: 0,
                  reps: 0,
                  timestamp: Date.now(),
                },
              }])}
            >
              <Plus className="h-5 w-5" /> Add Set
            </button>
            <div className="flex justify-between gap-2 mt-4">
              <button
                className="flex-1 px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => { setEditExercise(null); setEditSets([]); }}
              >Cancel</button>
              <button
                className="flex-1 px-3 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-2"
                onClick={async () => {
                  // Find deleted sets
                  const originalIds = new Set(editExercise.sets.map(s => s.id));
                  const newIds = new Set(editSets.map(s => s.id));
                  const toDelete = editExercise.sets.filter(s => !newIds.has(s.id));
                  const toUpdate = editSets.filter(s => originalIds.has(s.id));
                  const toAdd = editSets.filter(s => !originalIds.has(s.id));
                  // Delete removed sets
                  await Promise.all(toDelete.map(s => deleteWorkoutSet(s.id)));
                  // Update changed sets
                  await Promise.all(toUpdate.map(s => updateWorkoutSet(s)));
                  // Add new sets
                  if (toAdd.length > 0) {
                    await addWorkoutSet(toAdd.map(s => ({
                      exerciseName: s.data.exerciseName,
                      muscleGroup: s.data.muscleGroup,
                      weight: s.data.weight,
                      reps: s.data.reps,
                    })));
                  }
                  setEditExercise(null);
                  setEditSets([]);
                }}
              >
                <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75v10.5a2.25 2.25 0 01-2.25 2.25H9a2.25 2.25 0 01-2.25-2.25V6.75m10.5 0A2.25 2.25 0 0017.25 4.5h-10.5a2.25 2.25 0 00-2.25 2.25m13.5 0v.75a.75.75 0 01-.75.75h-12a.75.75 0 01-.75-.75v-.75m13.5 0h-13.5" /></svg></span>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-xl font-bold mb-4">Delete All Sets for {deleteConfirm.exerciseName}?</h2>
            <p className="mb-6">Are you sure you want to delete <b>all sets</b> for this exercise? This cannot be undone.</p>
            <div className="flex gap-4 justify-center">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => setDeleteConfirm(null)}
              >No</button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  await Promise.all(deleteConfirm.sets.map(s => deleteWorkoutSet(s.id)));
                  setDeleteConfirm(null);
                }}
              >Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
