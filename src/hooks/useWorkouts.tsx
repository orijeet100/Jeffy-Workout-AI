
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface ExerciseSet {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  weight: string;
  reps: number;
  duration_seconds?: number;
  weight_unit: 'lbs' | 'kg';
}

export interface Workout {
  id: string;
  date: string;
  title: string;
  exerciseSets: ExerciseSet[];
  timestamp: number;
}

export const useWorkouts = (selectedDate: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: workoutData, error } = await supabase
        .from('workouts')
        .select(`
          *,
          exercise_sets (
            *,
            exercises (
              name,
              muscle_groups (name)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      return workoutData.map(workout => ({
        id: workout.id,
        date: workout.date,
        title: workout.title,
        timestamp: new Date(workout.created_at).getTime(),
        exerciseSets: workout.exercise_sets.map(set => ({
          id: set.id,
          exerciseName: set.exercises.name,
          muscleGroup: set.exercises.muscle_groups.name,
          weight: set.weight?.toString() || '0',
          reps: set.reps || 0,
          duration_seconds: set.duration_seconds,
          weight_unit: set.weight_unit as 'lbs' | 'kg'
        }))
      }));
    },
    enabled: !!user
  });

  const addWorkoutMutation = useMutation({
    mutationFn: async (workoutData: Omit<Workout, 'id' | 'timestamp'>) => {
      if (!user) throw new Error('User not authenticated');

      // Create workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          date: workoutData.date,
          title: workoutData.title
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Add exercise sets
      for (const exerciseSet of workoutData.exerciseSets) {
        // Find or create exercise
        const { data: muscleGroup } = await supabase
          .from('muscle_groups')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', exerciseSet.muscleGroup)
          .single();

        if (!muscleGroup) continue;

        let { data: exercise } = await supabase
          .from('exercises')
          .select('id')
          .eq('muscle_group_id', muscleGroup.id)
          .eq('name', exerciseSet.exerciseName)
          .single();

        if (!exercise) {
          const { data: newExercise } = await supabase
            .from('exercises')
            .insert({
              muscle_group_id: muscleGroup.id,
              name: exerciseSet.exerciseName,
              metric_type: exerciseSet.duration_seconds ? 'time_based' : 'weight_reps'
            })
            .select()
            .single();
          exercise = newExercise;
        }

        if (exercise) {
          await supabase
            .from('exercise_sets')
            .insert({
              workout_id: workout.id,
              exercise_id: exercise.id,
              weight: parseFloat(exerciseSet.weight) || null,
              reps: exerciseSet.reps || null,
              duration_seconds: exerciseSet.duration_seconds || null,
              weight_unit: exerciseSet.weight_unit
            });
        }
      }

      return workout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast({
        title: "Workout Added!",
        description: "Your workout has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save workout",
        variant: "destructive"
      });
    }
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast({
        title: "Workout Deleted",
        description: "Workout has been removed from your history.",
      });
    }
  });

  const selectedDateString = selectedDate.toISOString().split('T')[0];
  const todaysWorkouts = workouts.filter(workout => workout.date === selectedDateString);

  return {
    workouts: todaysWorkouts,
    isLoading,
    addWorkout: addWorkoutMutation.mutate,
    deleteWorkout: deleteWorkoutMutation.mutate,
    updateWorkout: () => {} // Will implement later
  };
};
