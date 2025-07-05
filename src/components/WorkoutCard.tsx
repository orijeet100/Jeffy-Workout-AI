
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Dumbbell, Weight, Edit, Plus, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Workout, ExerciseSet } from '@/types/workout';

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: string) => void;
  onUpdate?: (updatedWorkout: Workout) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onDelete, onUpdate }) => {
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editingSets, setEditingSets] = useState<ExerciseSet[]>([]);

  // Group sets by muscle group, then by exercise name, maintaining order
  const groupedByMuscle = workout.exerciseSets.reduce((muscleGroups, set) => {
    if (!muscleGroups[set.muscleGroup]) {
      muscleGroups[set.muscleGroup] = {};
    }
    if (!muscleGroups[set.muscleGroup][set.exerciseName]) {
      muscleGroups[set.muscleGroup][set.exerciseName] = [];
    }
    muscleGroups[set.muscleGroup][set.exerciseName].push(set);
    return muscleGroups;
  }, {} as Record<string, Record<string, ExerciseSet[]>>);

  // Get ordered muscle groups based on first appearance in exerciseSets
  const orderedMuscleGroups = Array.from(new Set(workout.exerciseSets.map(set => set.muscleGroup)));

  const getTotalMuscleGroups = () => Object.keys(groupedByMuscle).length;
  const getTotalExercises = () => Object.values(groupedByMuscle).reduce((total, exercises) => total + Object.keys(exercises).length, 0);

  const handleEditExercise = (muscleGroup: string, exerciseName: string) => {
    const exerciseKey = `${muscleGroup}-${exerciseName}`;
    const exerciseSets = groupedByMuscle[muscleGroup][exerciseName];
    setEditingExercise(exerciseKey);
    setEditingSets([...exerciseSets]);
  };

  const handleSaveExercise = () => {
    if (!editingExercise || !onUpdate) return;

    const [muscleGroup, exerciseName] = editingExercise.split('-');
    const updatedExerciseSets = workout.exerciseSets.filter(
      set => !(set.muscleGroup === muscleGroup && set.exerciseName === exerciseName)
    );

    const validEditingSets = editingSets.filter(set => 
      set.exerciseName.trim() && set.weight.trim() && set.reps > 0
    );

    const updatedWorkout = {
      ...workout,
      exerciseSets: [...updatedExerciseSets, ...validEditingSets]
    };

    onUpdate(updatedWorkout);
    setEditingExercise(null);
    setEditingSets([]);
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
    setEditingSets([]);
  };

  const handleDeleteExercise = (muscleGroup: string, exerciseName: string) => {
    if (!onUpdate) return;

    const updatedExerciseSets = workout.exerciseSets.filter(
      set => !(set.muscleGroup === muscleGroup && set.exerciseName === exerciseName)
    );

    const updatedWorkout = {
      ...workout,
      exerciseSets: updatedExerciseSets
    };

    onUpdate(updatedWorkout);
  };

  const updateEditingSet = (setId: string, field: keyof ExerciseSet, value: string | number) => {
    setEditingSets(prev => prev.map(set => 
      set.id === setId ? { ...set, [field]: value } : set
    ));
  };

  const addNewSetToEditing = (muscleGroup: string, exerciseName: string) => {
    const newSet: ExerciseSet = {
      id: crypto.randomUUID(),
      exerciseName,
      muscleGroup,
      weight: '',
      reps: 0
    };
    setEditingSets(prev => [...prev, newSet]);
  };

  const removeSetFromEditing = (setId: string) => {
    setEditingSets(prev => prev.filter(set => set.id !== setId));
  };

  return (
    <Card className="bg-gradient-to-r from-white to-purple-50 border-purple-200 shadow-md hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">{getTotalMuscleGroups()} muscle groups</span>
              <span className="font-medium">{getTotalExercises()} exercises</span>
              <span className="font-medium">{workout.exerciseSets.length} total sets</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(workout.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {orderedMuscleGroups.map((muscleGroup) => (
            <div key={muscleGroup} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px bg-purple-200 flex-1"></div>
                <span className="text-sm font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  {muscleGroup}
                </span>
                <div className="h-px bg-purple-200 flex-1"></div>
              </div>
              
              {Object.entries(groupedByMuscle[muscleGroup]).map(([exerciseName, sets]) => {
                const exerciseKey = `${muscleGroup}-${exerciseName}`;
                const isEditing = editingExercise === exerciseKey;
                
                return (
                  <div key={exerciseName} className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-800 text-lg">{exerciseName}</span>
                      </div>
                      {!isEditing && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExercise(muscleGroup, exerciseName)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full p-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExercise(muscleGroup, exerciseName)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-3">
                        {editingSets.map((set, index) => (
                          <div key={set.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-purple-600 min-w-[60px]">Set {index + 1}</span>
                            <Input
                              type="text"
                              placeholder="Weight"
                              value={set.weight}
                              onChange={(e) => updateEditingSet(set.id, 'weight', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              placeholder="Reps"
                              value={set.reps || ''}
                              onChange={(e) => updateEditingSet(set.id, 'reps', parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSetFromEditing(set.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addNewSetToEditing(muscleGroup, exerciseName)}
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Set
                          </Button>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveExercise}
                            className="flex-1"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sets.map((set, index) => (
                          <div key={set.id} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 px-4 py-3 rounded-lg">
                            <span className="font-medium text-purple-600">Set {index + 1}</span>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <Weight className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{set.weight}</span>
                              </div>
                              <span className="font-medium">{set.reps} reps</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutCard;
