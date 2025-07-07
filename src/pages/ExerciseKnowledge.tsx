
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const defaultExercises = {
  Chest: [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Flyes',
    'Push-ups', 'Dips', 'Incline Dumbbell Press', 'Cable Crossovers', 'Chest Press Machine', 'Pec Deck'
  ],
  Back: [
    'Pull-ups', 'Chin-ups', 'Deadlifts', 'Bent-over Rows', 'Lat Pulldowns',
    'T-Bar Rows', 'Cable Rows', 'Single-arm Dumbbell Rows', 'Face Pulls', 'Reverse Flyes'
  ],
  Legs: [
    'Squats', 'Deadlifts', 'Leg Press', 'Lunges', 'Romanian Deadlifts',
    'Bulgarian Split Squats', 'Leg Curls', 'Leg Extensions', 'Calf Raises', 'Hip Thrusts'
  ],
  Biceps: [
    'Bicep Curls', 'Hammer Curls', 'Preacher Curls', 'Concentration Curls', 'Cable Curls',
    'Barbell Curls', '21s', 'Incline Dumbbell Curls', 'Reverse Curls', 'Chin-ups'
  ],
  Triceps: [
    'Tricep Dips', 'Close-grip Bench Press', 'Overhead Tricep Extension', 'Tricep Pushdowns',
    'Diamond Push-ups', 'Skull Crushers', 'Tricep Kickbacks', 'Rope Pushdowns', 'Bench Dips', 'Overhead Dumbbell Extension'
  ],
  Shoulders: [
    'Shoulder Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Flyes', 'Arnold Press',
    'Upright Rows', 'Shrugs', 'Pike Push-ups', 'Face Pulls', 'Handstand Push-ups'
  ],
  Abs: [
    'Crunches', 'Planks', 'Sit-ups', 'Russian Twists', 'Leg Raises',
    'Mountain Climbers', 'Bicycle Crunches', 'Dead Bug', 'Ab Wheel Rollouts', 'Hanging Knee Raises'
  ]
};

const ExerciseKnowledge = () => {
  const [exercises, setExercises] = useState<Record<string, string[]>>(defaultExercises);
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<string | null>(null);
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [newExercise, setNewExercise] = useState('');
  const [showAddMuscleGroup, setShowAddMuscleGroup] = useState(false);

  // Load exercises from localStorage on component mount
  useEffect(() => {
    const savedExercises = localStorage.getItem('exerciseKnowledge');
    if (savedExercises) {
      setExercises(JSON.parse(savedExercises));
    }
  }, []);

  // Save exercises to localStorage whenever exercises change
  useEffect(() => {
    localStorage.setItem('exerciseKnowledge', JSON.stringify(exercises));
  }, [exercises]);

  const addMuscleGroup = () => {
    if (newMuscleGroup.trim() && !exercises[newMuscleGroup]) {
      setExercises(prev => ({
        ...prev,
        [newMuscleGroup]: []
      }));
      setNewMuscleGroup('');
      setShowAddMuscleGroup(false);
      toast({
        title: "Muscle Group Added",
        description: `${newMuscleGroup} has been added to your exercise knowledge.`,
      });
    }
  };

  const deleteMuscleGroup = (muscleGroup: string) => {
    const updatedExercises = { ...exercises };
    delete updatedExercises[muscleGroup];
    setExercises(updatedExercises);
    toast({
      title: "Muscle Group Deleted",
      description: `${muscleGroup} has been removed from your exercise knowledge.`,
    });
  };

  const addExercise = (muscleGroup: string) => {
    if (newExercise.trim()) {
      setExercises(prev => ({
        ...prev,
        [muscleGroup]: [...prev[muscleGroup], newExercise]
      }));
      setNewExercise('');
      setEditingMuscleGroup(null);
      toast({
        title: "Exercise Added",
        description: `${newExercise} has been added to ${muscleGroup}.`,
      });
    }
  };

  const deleteExercise = (muscleGroup: string, exerciseIndex: number) => {
    setExercises(prev => ({
      ...prev,
      [muscleGroup]: prev[muscleGroup].filter((_, index) => index !== exerciseIndex)
    }));
    toast({
      title: "Exercise Deleted",
      description: "Exercise has been removed.",
    });
  };

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
                onKeyPress={(e) => e.key === 'Enter' && addMuscleGroup()}
              />
              <Button onClick={addMuscleGroup} size="sm">
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
                        onClick={() => deleteExercise(muscleGroup, index)}
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
                      onKeyPress={(e) => e.key === 'Enter' && addExercise(muscleGroup)}
                    />
                    <Button onClick={() => addExercise(muscleGroup)} size="sm">
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
