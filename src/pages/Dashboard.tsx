import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Dumbbell, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { DatabaseService } from '@/services/databaseService';
import { WorkoutSetWithDetails, WorkoutSetFormData } from '@/types/workout';
import { supabase } from '@/integrations/client';
import AddSetsModal from '@/components/AddSetsModal';

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userId, setUserId] = useState<string | null>(null);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetWithDetails[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showAddSetsModal, setShowAddSetsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSet, setEditingSet] = useState<WorkoutSetWithDetails | null>(null);
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editReps, setEditReps] = useState<number>(0);

  // Get user ID on component mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      setUserId(userId || null);
      
      // Initialize user data if this is a new user
      if (userId) {
        initializeUserIfNeeded(userId);
      }
    });
  }, []);

  // Initialize user with default data if needed
  const initializeUserIfNeeded = async (userId: string) => {
    try {
      const muscleGroups = await DatabaseService.getUserMuscleGroups(userId);
      if (muscleGroups.length === 0) {
        await DatabaseService.initializeUserData(userId);
        toast({ 
          title: 'Welcome!', 
          description: 'Default exercises have been added to your library.' 
        });
      }
    } catch (error) {
      // Handle initialization error silently
    }
  };

  // Fetch workout sets when date or user changes
  useEffect(() => {
    if (userId && selectedDate) {
      loadWorkoutSets();
    }
  }, [userId, selectedDate]);

  // Fetch workout sets for the selected date
  const loadWorkoutSets = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const sets = await DatabaseService.getWorkoutSetsByDate(userId, dateString);
      console.log('🔍 Debug: Workout sets loaded:', sets);
      setWorkoutSets(sets);
    } catch (error) {
      // Handle fetch error silently
    } finally {
      setIsLoading(false);
    }
  };

  // Add new workout sets
  const handleAddWorkoutSets = async (sets: WorkoutSetFormData[]) => {
    if (!userId) return;

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      
      // Use the more efficient addWorkoutSets function for multiple sets
      const addedSets = await DatabaseService.addWorkoutSets(sets, userId, dateString);

      if (addedSets.length > 0) {
        toast({ 
          title: 'Success!', 
          description: `${addedSets.length} set(s) have been saved.` 
        });
        
        // Refresh the workout sets
        await loadWorkoutSets();
      }
    } catch (error) {
      // Handle add error silently
      toast({ 
        title: 'Error', 
        description: 'Failed to save workout sets', 
        variant: 'destructive' 
      });
    }
  };

  // Open edit modal for workout set
  const handleEditWorkoutSet = (set: WorkoutSetWithDetails) => {
    setEditingSet(set);
    setEditWeight(set.weight);
    setEditReps(set.number_of_reps);
    setShowEditModal(true);
  };

  // Update workout set
  const handleUpdateWorkoutSet = async () => {
    if (!editingSet) return;
    
    try {
      await DatabaseService.updateWorkoutSet(editingSet.id, {
        weight: editWeight,
        number_of_reps: editReps
      }, userId);
      
      toast({ title: 'Updated!', description: 'Your changes have been saved.' });
      setShowEditModal(false);
      setEditingSet(null);
      await loadWorkoutSets();
    } catch (error) {
      // Handle update error silently
      toast({ 
        title: 'Error', 
        description: 'Failed to update workout set', 
        variant: 'destructive' 
      });
    }
  };

  // Delete workout set
  const handleDeleteWorkoutSet = async (id: number) => {
    try {
      await DatabaseService.deleteWorkoutSet(id, userId);
      toast({ title: 'Deleted', description: 'Set has been removed.' });
      await loadWorkoutSets();
    } catch (error) {
      // Handle delete error silently
      toast({ 
        title: 'Error', 
        description: 'Failed to delete workout set', 
        variant: 'destructive' 
      });
    }
  };

  // Group workout sets by muscle group and exercise
  const groupedWorkoutSets = React.useMemo(() => {
    console.log('🔍 Debug: Grouping workout sets:', workoutSets);
    
    const groups: Record<string, Record<string, WorkoutSetWithDetails[]>> = {};
    
    workoutSets.forEach(set => {
      const muscleGroup = set.muscle_group_name || 'Unknown';
      const exercise = set.exercise_name || 'Unknown';
      
      console.log('🔍 Debug: Processing set:', { 
        id: set.id, 
        muscleGroup, 
        exercise, 
        muscle_group_name: set.muscle_group_name,
        exercise_name: set.exercise_name 
      });
      
      if (!groups[muscleGroup]) {
        groups[muscleGroup] = {};
      }
      if (!groups[muscleGroup][exercise]) {
        groups[muscleGroup][exercise] = [];
      }
      
      groups[muscleGroup][exercise].push(set);
    });

    // Sort sets within each exercise by creation time
    Object.values(groups).forEach(exerciseGroups => {
      Object.values(exerciseGroups).forEach(sets => {
        sets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    });

    console.log('🔍 Debug: Final grouped result:', groups);
    return groups;
  }, [workoutSets]);

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">Loading...</div>
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
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4 text-center">
          <p className="text-lg font-semibold text-gray-800">
            Workout for {format(selectedDate, "MMM dd, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowAddSetsModal(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Sets
        </Button>
      </div>

      {/* Sets Display or Empty State */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-lg text-gray-600">Loading workout data...</div>
        </div>
      ) : Object.keys(groupedWorkoutSets).length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="text-center py-8 text-gray-500">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sets recorded for this day</p>
            <p className="text-sm mt-1">Tap "Voice Input" to get started!</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedWorkoutSets).map(([muscleGroup, exercises]) => (
          <div key={muscleGroup} className="mb-8">
            {/* Muscle Group Header with pill and lines */}
            <div className="flex items-center mb-4">
              <div className="flex-1 h-px bg-purple-400" />
              <span className="mx-4 px-6 py-1 bg-purple-50 text-purple-700 font-semibold rounded-full text-lg shadow-sm border border-purple-100">
                {muscleGroup}
              </span>
              <div className="flex-1 h-px bg-purple-400" />
            </div>
            
            {Object.entries(exercises).map(([exerciseName, sets]) => (
              <div key={exerciseName} className="bg-white border border-purple-100 rounded-2xl shadow-md mb-6 p-0">
                {/* Exercise Card Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-6 w-6 text-purple-400" />
                    <span className="text-2xl font-bold text-gray-900">{exerciseName}</span>
                  </div>
                </div>
                
                {/* Set Rows */}
                {sets.map((set, idx) => (
                  <div key={set.id} className="flex items-center justify-between bg-purple-50 rounded-xl mx-4 my-3 px-6 py-3">
                    <span className="text-purple-600 font-semibold text-lg">Set {idx + 1}</span>
                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-1 text-gray-800 font-medium text-lg">
                        <Dumbbell className="h-5 w-5 text-gray-400" />
                        {set.weight} <span className="text-gray-500 text-base ml-1">lb</span>
                      </span>
                      <span className="text-gray-800 font-medium text-lg">{set.number_of_reps} <span className="text-gray-500 text-base ml-1">reps</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="p-2 rounded hover:bg-purple-100 text-blue-600"
                        title="Edit"
                        onClick={() => handleEditWorkoutSet(set)}
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        className="p-2 rounded hover:bg-red-100 text-red-600"
                        title="Delete"
                        onClick={() => handleDeleteWorkoutSet(set.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          ))}
        </div>
        ))
      )}

      {/* Add Sets Modal */}
      {showAddSetsModal && (
        <AddSetsModal
          selectedDate={selectedDate}
          onSave={handleAddWorkoutSets}
          onClose={() => setShowAddSetsModal(false)}
          userId={userId}
        />
      )}

      {/* Edit Workout Set Modal */}
      {showEditModal && editingSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Edit Workout Set
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Weight (lb)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(Number(e.target.value))}
                  step="10"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reps">Reps</Label>
                <Input
                  id="edit-reps"
                  type="number"
                  value={editReps}
                  onChange={(e) => setEditReps(Number(e.target.value))}
                  step="1"
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSet(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWorkoutSet}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
