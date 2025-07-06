
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useExerciseKnowledge } from '@/hooks/useExerciseKnowledge';

const ExerciseKnowledge = () => {
  const { exercises, isLoading, addMuscleGroup, deleteMuscleGroup, addExercise, deleteExercise } = useExerciseKnowledge();
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<string | null>(null);
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [newExercise, setNewExercise] = useState('');
  const [showAddMuscleGroup, setShowAddMuscleGroup] = useState(false);

  const handleAddMuscleGroup = () => {
    if (newMuscleGroup.trim() && !exercises[newMuscleGroup]) {
      addMuscleGroup(newMuscleGroup);
      setNewMuscleGroup('');
      setShowAddMuscleGroup(false);
    }
  };

  const handleAddExercise = (muscleGroup: string) => {
    if (newExercise.trim()) {
      addExercise({ muscleGroup, exerciseName: newExercise });
      setNewExercise('');
      setEditingMuscleGroup(null);
    }
  };

  const handleDeleteExercise = (muscleGroup: string, exerciseName: string) => {
    deleteExercise({ muscleGroup, exerciseName });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Exercise Knowledge</h1>
        <Button
          onClick={() => setShowAddMuscleGroup(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Muscle Group
        </Button>
      </div>

      {showAddMuscleGroup && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter muscle group name"
                value={newMuscleGroup}
                onChange={(e) => setNewMuscleGroup(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMuscleGroup()}
              />
              <Button onClick={handleAddMuscleGroup} size="sm">
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => {
                  setShowAddMuscleGroup(false);
                  setNewMuscleGroup('');
                }} 
                variant="outline" 
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {Object.entries(exercises).map(([muscleGroup, exerciseList]) => (
          <Card key={muscleGroup} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold text-purple-600">{muscleGroup}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMuscleGroup(editingMuscleGroup === muscleGroup ? null : muscleGroup)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMuscleGroup(muscleGroup)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {exerciseList.map((exercise, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{exercise}</span>
                    {editingMuscleGroup === muscleGroup && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExercise(muscleGroup, exercise)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {editingMuscleGroup === muscleGroup && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add new exercise"
                      value={newExercise}
                      onChange={(e) => setNewExercise(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddExercise(muscleGroup)}
                    />
                    <Button onClick={() => handleAddExercise(muscleGroup)} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExerciseKnowledge;
