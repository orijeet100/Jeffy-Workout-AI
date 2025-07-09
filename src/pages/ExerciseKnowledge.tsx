import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/client';
import { defaultExercises } from '@/constants/defaultExercises';

const ExerciseKnowledge = () => {
  const [exercises, setExercises] = useState<Record<string, string[]>>(defaultExercises);
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<string | null>(null);
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [newExercise, setNewExercise] = useState('');
  const [showAddMuscleGroup, setShowAddMuscleGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current user's ID from Supabase session
  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id;
      setUserId(id || null);
    });
  }, []);

  // Fetch or create the user's exercise knowledge base
  useEffect(() => {
    if (!userId) return;
    const fetchOrCreateKnowledge = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_knowledge')
        .select('data')
        .eq('user_id', userId)
        .single();
      if (data && data.data) {
        setExercises(data.data);
      } else {
        // Insert default for new user
        await supabase.from('exercise_knowledge').insert({
          user_id: userId,
          data: defaultExercises,
        });
        setExercises(defaultExercises);
      }
      setLoading(false);
    };
    fetchOrCreateKnowledge();
  }, [userId]);

  // Update Supabase on any change
  const updateKnowledge = async (newExercises: Record<string, string[]>) => {
    setExercises(newExercises);
    if (!userId) return;
    await supabase
      .from('exercise_knowledge')
      .update({ data: newExercises })
      .eq('user_id', userId);
  };

  const addMuscleGroup = async () => {
    if (newMuscleGroup.trim() && !exercises[newMuscleGroup]) {
      const updated = {
        ...exercises,
        [newMuscleGroup]: []
      };
      await updateKnowledge(updated);
      setNewMuscleGroup('');
      setShowAddMuscleGroup(false);
      toast({
        title: "Muscle Group Added",
        description: `${newMuscleGroup} has been added to your exercise knowledge.`,
      });
    }
  };

  const deleteMuscleGroup = async (muscleGroup: string) => {
    const updated = { ...exercises };
    delete updated[muscleGroup];
    await updateKnowledge(updated);
    toast({
      title: "Muscle Group Deleted",
      description: `${muscleGroup} has been removed from your exercise knowledge.`,
    });
  };

  const addExercise = async (muscleGroup: string) => {
    if (newExercise.trim()) {
      const updated = {
        ...exercises,
        [muscleGroup]: [...exercises[muscleGroup], newExercise]
      };
      await updateKnowledge(updated);
      setNewExercise('');
      setEditingMuscleGroup(null);
      toast({
        title: "Exercise Added",
        description: `${newExercise} has been added to ${muscleGroup}.`,
      });
    }
  };

  const deleteExercise = async (muscleGroup: string, exerciseIndex: number) => {
    const updated = {
      ...exercises,
      [muscleGroup]: exercises[muscleGroup].filter((_, index) => index !== exerciseIndex)
    };
    await updateKnowledge(updated);
    toast({
      title: "Exercise Deleted",
      description: "Exercise has been removed.",
    });
  };

  const muscleGroupOrder = [
    ...Object.keys(defaultExercises),
    ...Object.keys(exercises).filter(mg => !Object.keys(defaultExercises).includes(mg))
  ];

  if (loading) {
    return <div className="text-center py-10 text-lg">Loading your exercise knowledge...</div>;
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
        {muscleGroupOrder.map(muscleGroup => (
          exercises[muscleGroup] && (
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
                  {exercises[muscleGroup].map((exercise, index) => (
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
                        placeholder="Add exercise"
                        value={newExercise}
                        onChange={(e) => setNewExercise(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addExercise(muscleGroup)}
                      />
                      <Button onClick={() => addExercise(muscleGroup)} size="sm">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setEditingMuscleGroup(null)} variant="outline" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>
    </div>
  );
};

export default ExerciseKnowledge;
