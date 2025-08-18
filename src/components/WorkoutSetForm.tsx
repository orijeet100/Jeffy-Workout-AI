import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DatabaseService } from '@/services/databaseService';
import { UserMuscleGroup, UserExercise, WorkoutSetFormData } from '@/types/workout';

interface WorkoutSetFormProps {
  selectedDate: Date;
  userId: string;
  onSave: (sets: WorkoutSetFormData[]) => Promise<void>;
  onClose: () => void;
}

const WorkoutSetForm: React.FC<WorkoutSetFormProps> = ({ 
  selectedDate, 
  userId, 
  onSave, 
  onClose 
}) => {
  const [muscleGroups, setMuscleGroups] = useState<UserMuscleGroup[]>([]);
  const [exercises, setExercises] = useState<UserExercise[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [filteredExercises, setFilteredExercises] = useState<UserExercise[]>([]);
  const [sets, setSets] = useState<WorkoutSetFormData[]>([
    { muscle_group_id: 0, exercise_id: 0, weight: 0, number_of_reps: 0 }
  ]);

  // Load muscle groups and exercises on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [muscleGroupsData, exercisesData] = await Promise.all([
          DatabaseService.getUserMuscleGroups(userId),
          DatabaseService.getUserExercises(userId)
        ]);
        
        setMuscleGroups(muscleGroupsData);
        setExercises(exercisesData);
      } catch (error) {
        console.error('Error loading exercise data:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to load exercise data', 
          variant: 'destructive' 
        });
      }
    };

    loadData();
  }, [userId]);

  // Filter exercises when muscle group changes
  useEffect(() => {
    if (selectedMuscleGroup) {
      const muscleGroupId = parseInt(selectedMuscleGroup);
      const filtered = exercises.filter(ex => ex.muscle_group_id === muscleGroupId);
      setFilteredExercises(filtered);
    } else {
      setFilteredExercises([]);
    }
  }, [selectedMuscleGroup, exercises]);

  const addSet = () => {
    setSets(prev => [...prev, { 
      muscle_group_id: 0, 
      exercise_id: 0, 
      weight: 0, 
      number_of_reps: 0 
    }]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof WorkoutSetFormData, value: any) => {
    setSets(prev => prev.map((set, i) => 
      i === index ? { ...set, [field]: value } : set
    ));
  };

  const handleMuscleGroupChange = (muscleGroupId: string) => {
    setSelectedMuscleGroup(muscleGroupId);
    // Reset exercise selection for all sets when muscle group changes
    setSets(prev => prev.map(set => ({ ...set, exercise_id: 0 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate sets
    const validSets = sets.filter(set => 
      set.muscle_group_id > 0 && 
      set.exercise_id > 0 && 
      set.weight > 0 && 
      set.number_of_reps > 0
    );

    if (validSets.length === 0) {
      toast({ 
        title: 'Invalid Data', 
        description: 'Please fill in all fields with valid values', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      await onSave(validSets);
      onClose();
    } catch (error) {
      console.error('Error saving workout sets:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save workout sets', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Add Workout Sets
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {sets.map((set, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700">Set {index + 1}</h4>
                  {sets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSet(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Muscle Group Selection */}
                  <div className="space-y-2">
                    <Label htmlFor={`muscle-group-${index}`}>Muscle Group</Label>
                    <Select
                      value={set.muscle_group_id.toString()}
                      onValueChange={(value) => {
                        updateSet(index, 'muscle_group_id', parseInt(value));
                        if (index === 0) handleMuscleGroupChange(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select muscle group" />
                      </SelectTrigger>
                      <SelectContent>
                        {muscleGroups.map((mg) => (
                          <SelectItem key={mg.id} value={mg.id.toString()}>
                            {mg.muscle_group_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Exercise Selection */}
                  <div className="space-y-2">
                    <Label htmlFor={`exercise-${index}`}>Exercise</Label>
                    <Select
                      value={set.exercise_id.toString()}
                      onValueChange={(value) => updateSet(index, 'exercise_id', parseInt(value))}
                      disabled={!set.muscle_group_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredExercises.map((exercise) => (
                          <SelectItem key={exercise.id} value={exercise.id.toString()}>
                            {exercise.exercise_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Weight Input */}
                  <div className="space-y-2">
                    <Label htmlFor={`weight-${index}`}>Weight (lbs)</Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={set.weight || ''}
                      onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  {/* Reps Input */}
                  <div className="space-y-2">
                    <Label htmlFor={`reps-${index}`}>Reps</Label>
                    <Input
                      id={`reps-${index}`}
                      type="number"
                      min="1"
                      value={set.number_of_reps || ''}
                      onChange={(e) => updateSet(index, 'number_of_reps', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Set Button */}
            <Button
              type="button"
              variant="outline"
              onClick={addSet}
              className="w-full border-dashed border-2 border-gray-300 hover:border-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Set
            </Button>

            {/* Submit Button */}
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
              Save All Sets
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutSetForm; 