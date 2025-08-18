import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import { WorkoutSetFormData } from '@/types/workout';
import { DatabaseService } from '@/services/databaseService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ManualWorkoutFormProps {
  selectedDate: Date;
  onSave: (sets: WorkoutSetFormData[]) => Promise<void>;
  onClose: () => void;
  userId: string;
}

interface ExerciseGroup {
  muscle_group_id: number;
  muscle_group_name: string;
  exercises: Array<{
    id: number;
    exercise_name: string;
  }>;
}

const ManualWorkoutForm: React.FC<ManualWorkoutFormProps> = ({ 
  selectedDate, 
  onSave, 
  onClose, 
  userId 
}) => {
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetFormData[]>([
    {
      muscle_group_id: 0,
      exercise_id: 0,
      weight: 0,
      number_of_reps: 0
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Load exercise library on component mount
  useEffect(() => {
    const loadExerciseLibrary = async () => {
      try {
        const groups = await DatabaseService.getExerciseGroups(userId);
        setExerciseGroups(groups);
        
        // Set default values for the first set
        if (groups.length > 0 && groups[0].exercises.length > 0) {
          setWorkoutSets([{
            muscle_group_id: groups[0].muscle_group_id,
            exercise_id: groups[0].exercises[0].id,
            weight: 0,
            number_of_reps: 0
          }]);
        }
      } catch (error) {
        // Handle load error silently
        toast({
          title: 'Error',
          description: 'Failed to load exercise library',
          variant: 'destructive'
        });
      }
    };

    loadExerciseLibrary();
  }, [userId]);

  const addSet = () => {
    if (exerciseGroups.length > 0 && exerciseGroups[0].exercises.length > 0) {
      setWorkoutSets(prev => [...prev, {
        muscle_group_id: exerciseGroups[0].muscle_group_id,
        exercise_id: exerciseGroups[0].exercises[0].id,
        weight: 0,
        number_of_reps: 0
      }]);
    }
  };

  const removeSet = (index: number) => {
    if (workoutSets.length > 1) {
      setWorkoutSets(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof WorkoutSetFormData, value: any) => {
    setWorkoutSets(prev => prev.map((set, i) => {
      if (i === index) {
        const updatedSet = { ...set, [field]: value };
        
        // If muscle group changed, reset exercise to first available
        if (field === 'muscle_group_id') {
          const selectedGroup = exerciseGroups.find(g => g.muscle_group_id === value);
          if (selectedGroup && selectedGroup.exercises.length > 0) {
            updatedSet.exercise_id = selectedGroup.exercises[0].id;
          }
        }
        
        return updatedSet;
      }
      return set;
    }));
  };

  const getAvailableExercises = (muscleGroupId: number) => {
    const group = exerciseGroups.find(g => g.muscle_group_id === muscleGroupId);
    return group ? group.exercises : [];
  };

  const handleSave = async () => {
    try {
      // Validate all sets
      const validSets = workoutSets.filter(set => 
        set.muscle_group_id > 0 && 
        set.exercise_id > 0 && 
        set.number_of_reps > 0
      );

      if (validSets.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields for at least one set',
          variant: 'destructive'
        });
        return;
      }

      setIsLoading(true);
      await onSave(validSets);
      onClose();
      
      toast({
        title: 'Success',
        description: `${validSets.length} workout set(s) added successfully!`,
      });
      
    } catch (error) {
      // Handle save error silently
      toast({
        title: 'Error',
        description: 'Failed to save workout sets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = workoutSets.some(set => 
    set.muscle_group_id > 0 && 
    set.exercise_id > 0 && 
    set.number_of_reps > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Add Workout Sets - {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {workoutSets.map((set, index) => (
            <div key={index} className="p-6 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-700">Set {index + 1}</h4>
                {workoutSets.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSet(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Muscle Group Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Muscle Group</label>
                  <select
                    value={set.muscle_group_id}
                    onChange={(e) => updateSet(index, 'muscle_group_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={0}>Select Muscle Group</option>
                    {exerciseGroups.map(group => (
                      <option key={group.muscle_group_id} value={group.muscle_group_id}>
                        {group.muscle_group_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Exercise Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Exercise</label>
                  <select
                    value={set.exercise_id}
                    onChange={(e) => updateSet(index, 'exercise_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={set.muscle_group_id === 0}
                  >
                    <option value={0}>Select Exercise</option>
                    {getAvailableExercises(set.muscle_group_id).map(exercise => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.exercise_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Weight Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Weight (lbs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>
                
                {/* Reps Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Reps</label>
                  <input
                    type="number"
                    min="1"
                    value={set.number_of_reps || ''}
                    onChange={(e) => updateSet(index, 'number_of_reps', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {/* Add More Sets Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addSet}
            className="w-full border-dashed border-2 border-gray-300 hover:border-gray-400 py-4"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Another Set
          </Button>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid || isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Sets
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualWorkoutForm; 