import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Dumbbell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DatabaseService } from '@/services/databaseService';
import { UserMuscleGroup, UserExercise, ExerciseGroup } from '@/types/workout';
import { supabase } from '@/integrations/client';

const ExerciseKnowledge = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<UserMuscleGroup[]>([]);
  const [exercises, setExercises] = useState<UserExercise[]>([]);
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [showAddMuscleGroup, setShowAddMuscleGroup] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newMuscleGroupName, setNewMuscleGroupName] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<UserMuscleGroup | null>(null);
  const [editingExercise, setEditingExercise] = useState<UserExercise | null>(null);
  const [editMuscleGroupName, setEditMuscleGroupName] = useState('');
  const [editExerciseName, setEditExerciseName] = useState('');

  // Get user ID on component mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      setUserId(userId || null);
    });
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    try {
      const [muscleGroupsData, exercisesData, exerciseGroupsData] = await Promise.all([
        DatabaseService.getUserMuscleGroups(userId),
        DatabaseService.getUserExercises(userId),
        DatabaseService.getExerciseGroups(userId)
      ]);
      
      setMuscleGroups(muscleGroupsData);
      setExercises(exercisesData);
      setExerciseGroups(exerciseGroupsData);
    } catch (error) {
      console.error('Error loading exercise data:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load exercise data', 
        variant: 'destructive' 
      });
    }
  };

  const handleAddMuscleGroup = async () => {
    if (!userId || !newMuscleGroupName.trim()) return;
    
    try {
      const newMuscleGroup = await DatabaseService.addMuscleGroup(userId, newMuscleGroupName.trim());
      if (newMuscleGroup) {
        toast({ title: 'Success!', description: 'Muscle group added successfully.' });
        setNewMuscleGroupName('');
        setShowAddMuscleGroup(false);
        await loadData();
      }
    } catch (error) {
      console.error('Error adding muscle group:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to add muscle group', 
        variant: 'destructive' 
      });
    }
  };

  const handleAddExercise = async () => {
    if (!userId || !newExerciseName.trim() || !selectedMuscleGroup) return;
    
    try {
      const muscleGroupId = parseInt(selectedMuscleGroup);
      const newExercise = await DatabaseService.addExercise(userId, muscleGroupId, newExerciseName.trim());
      if (newExercise) {
        toast({ title: 'Success!', description: 'Exercise added successfully.' });
        setNewExerciseName('');
        setSelectedMuscleGroup('');
        setShowAddExercise(false);
        await loadData();
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to add exercise', 
        variant: 'destructive' 
      });
    }
  };

  // Edit muscle group
  const handleEditMuscleGroup = (muscleGroup: UserMuscleGroup) => {
    setEditingMuscleGroup(muscleGroup);
    setEditMuscleGroupName(muscleGroup.muscle_group_name);
  };

  const handleUpdateMuscleGroup = async () => {
    if (!userId || !editingMuscleGroup || !editMuscleGroupName.trim()) return;
    
    try {
      const success = await DatabaseService.updateMuscleGroup(userId, editingMuscleGroup.id, editMuscleGroupName.trim());
      if (success) {
        toast({ title: 'Updated!', description: 'Muscle group name updated successfully.' });
        setEditingMuscleGroup(null);
        setEditMuscleGroupName('');
        await loadData();
      }
    } catch (error) {
      console.error('Error updating muscle group:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update muscle group', 
        variant: 'destructive' 
      });
    }
  };

  // Edit exercise
  const handleEditExercise = (exercise: UserExercise) => {
    setEditingExercise(exercise);
    setEditExerciseName(exercise.exercise_name);
  };

  const handleUpdateExercise = async () => {
    if (!userId || !editingExercise || !editExerciseName.trim()) return;
    
    try {
      const success = await DatabaseService.updateExercise(userId, editingExercise.id, editExerciseName.trim());
      if (success) {
        toast({ title: 'Updated!', description: 'Exercise name updated successfully.' });
        setEditingExercise(null);
        setEditExerciseName('');
        await loadData();
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update exercise', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteMuscleGroup = async (muscleGroup: UserMuscleGroup) => {
    if (!confirm(`Are you sure you want to delete "${muscleGroup.muscle_group_name}"? This will also delete all associated exercises and workout sets.`)) {
      return;
    }
    
    try {
      const success = await DatabaseService.deleteMuscleGroup(userId!, muscleGroup.id);
      if (success) {
        toast({ title: 'Deleted!', description: 'Muscle group and all associated data removed.' });
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting muscle group:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete muscle group', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteExercise = async (exercise: UserExercise) => {
    if (!confirm(`Are you sure you want to delete "${exercise.exercise_name}"? This will also delete all associated workout sets.`)) {
      return;
    }
    
    try {
      const success = await DatabaseService.deleteExercise(userId!, exercise.id);
      if (success) {
        toast({ title: 'Deleted!', description: 'Exercise and all associated workout sets removed.' });
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete exercise', 
        variant: 'destructive' 
      });
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Exercise Knowledge
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddMuscleGroup(true)}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Muscle Group
          </Button>
          <Button
            onClick={() => setShowAddExercise(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>
      </div>

      {/* Exercise Library */}
      <div className="space-y-6">
        {exerciseGroups.map((group) => (
          <Card key={group.muscle_group_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-purple-700 flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {group.muscle_group_name}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditMuscleGroup(muscleGroups.find(mg => mg.id === group.muscle_group_id)!)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteMuscleGroup(muscleGroups.find(mg => mg.id === group.muscle_group_id)!)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {group.exercises.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No exercises in this muscle group</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="font-medium text-gray-800">{exercise.exercise_name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExercise(exercise)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExercise(exercise)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Muscle Group Modal */}
      {showAddMuscleGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Add New Muscle Group
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="muscle-group-name">Muscle Group Name</Label>
                <Input
                  id="muscle-group-name"
                  value={newMuscleGroupName}
                  onChange={(e) => setNewMuscleGroupName(e.target.value)}
                  placeholder="e.g., Forearms, Calves"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddMuscleGroup()}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMuscleGroup(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMuscleGroup}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  disabled={!newMuscleGroupName.trim()}
                >
                  Add Muscle Group
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Add New Exercise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="muscle-group-select">Muscle Group</Label>
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
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
              <div className="space-y-2">
                <Label htmlFor="exercise-name">Exercise Name</Label>
                <Input
                  id="exercise-name"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="e.g., Barbell Curls, Push-ups"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddExercise()}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddExercise(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddExercise}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  disabled={!newExerciseName.trim() || !selectedMuscleGroup}
                >
                  Add Exercise
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Muscle Group Modal */}
      {editingMuscleGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Edit Muscle Group
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-muscle-group-name">Muscle Group Name</Label>
                <Input
                  id="edit-muscle-group-name"
                  value={editMuscleGroupName}
                  onChange={(e) => setEditMuscleGroupName(e.target.value)}
                  placeholder="e.g., Forearms, Calves"
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateMuscleGroup()}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingMuscleGroup(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateMuscleGroup}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  disabled={!editMuscleGroupName.trim()}
                >
                  Update Muscle Group
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Edit Exercise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-exercise-name">Exercise Name</Label>
                <Input
                  id="edit-exercise-name"
                  value={editExerciseName}
                  onChange={(e) => setEditExerciseName(e.target.value)}
                  placeholder="e.g., Barbell Curls, Push-ups"
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateExercise()}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingExercise(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateExercise}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  disabled={!editExerciseName.trim()}
                >
                  Update Exercise
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ExerciseKnowledge;
