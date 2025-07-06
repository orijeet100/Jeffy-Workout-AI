
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export const useExerciseKnowledge = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: exercises = {}, isLoading } = useQuery({
    queryKey: ['exerciseKnowledge', user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data, error } = await supabase
        .from('muscle_groups')
        .select(`
          name,
          exercises (name, metric_type)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const exerciseMap: Record<string, string[]> = {};
      data.forEach(group => {
        exerciseMap[group.name] = group.exercises.map(ex => ex.name);
      });

      return exerciseMap;
    },
    enabled: !!user
  });

  const addMuscleGroupMutation = useMutation({
    mutationFn: async (muscleGroupName: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('muscle_groups')
        .insert({
          user_id: user.id,
          name: muscleGroupName
        });

      if (error) throw error;
    },
    onSuccess: (_, muscleGroupName) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseKnowledge'] });
      toast({
        title: "Muscle Group Added",
        description: `${muscleGroupName} has been added to your exercise knowledge.`,
      });
    }
  });

  const deleteMuscleGroupMutation = useMutation({
    mutationFn: async (muscleGroupName: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('muscle_groups')
        .delete()
        .eq('user_id', user.id)
        .eq('name', muscleGroupName);

      if (error) throw error;
    },
    onSuccess: (_, muscleGroupName) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseKnowledge'] });
      toast({
        title: "Muscle Group Deleted",
        description: `${muscleGroupName} has been removed from your exercise knowledge.`,
      });
    }
  });

  const addExerciseMutation = useMutation({
    mutationFn: async ({ muscleGroup, exerciseName }: { muscleGroup: string, exerciseName: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Get muscle group ID
      const { data: muscleGroupData } = await supabase
        .from('muscle_groups')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', muscleGroup)
        .single();

      if (!muscleGroupData) throw new Error('Muscle group not found');

      const { error } = await supabase
        .from('exercises')
        .insert({
          muscle_group_id: muscleGroupData.id,
          name: exerciseName
        });

      if (error) throw error;
    },
    onSuccess: (_, { muscleGroup, exerciseName }) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseKnowledge'] });
      toast({
        title: "Exercise Added",
        description: `${exerciseName} has been added to ${muscleGroup}.`,
      });
    }
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async ({ muscleGroup, exerciseName }: { muscleGroup: string, exerciseName: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: muscleGroupData } = await supabase
        .from('muscle_groups')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', muscleGroup)
        .single();

      if (!muscleGroupData) throw new Error('Muscle group not found');

      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('muscle_group_id', muscleGroupData.id)
        .eq('name', exerciseName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseKnowledge'] });
      toast({
        title: "Exercise Deleted",
        description: "Exercise has been removed.",
      });
    }
  });

  return {
    exercises,
    isLoading,
    addMuscleGroup: addMuscleGroupMutation.mutate,
    deleteMuscleGroup: deleteMuscleGroupMutation.mutate,
    addExercise: addExerciseMutation.mutate,
    deleteExercise: deleteExerciseMutation.mutate
  };
};
