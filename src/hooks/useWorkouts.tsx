
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface WorkoutSet {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

interface WorkoutExercise {
  name: string;
  muscleGroup: string;
  sets: WorkoutSet[];
}

interface Workout {
  id: string;
  title: string;
  date: string;
  user_id: string;
  exercises?: WorkoutExercise[];
  exerciseSets?: any[];
}

interface ExerciseSet {
  id?: string;
  exerciseName: string;
  muscleGroup: string;
  weight: string;
  reps: number;
  duration_seconds?: number;
  notes?: string;
}

interface CreateWorkoutData {
  title: string;
  date: string;
  exerciseSets?: ExerciseSet[];
  exercises?: WorkoutExercise[];
}

export const useWorkouts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch workouts
  const { data: workouts, isLoading, error } = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (workoutsError) {
        console.error('Error fetching workouts:', workoutsError);
        throw workoutsError;
      }

      // Fetch exercise sets for each workout
      const workoutsWithSets = await Promise.all(
        (workoutsData || []).map(async (workout) => {
          const { data: setsData, error: setsError } = await supabase
            .from('exercise_sets')
            .select(`
              *,
              exercises (
                name,
                muscle_groups (name)
              )
            `)
            .eq('workout_id', workout.id)
            .order('set_order');

          if (setsError) {
            console.error('Error fetching exercise sets:', setsError);
            return { ...workout, exerciseSets: [] };
          }

          const exerciseSets = (setsData || []).map(set => ({
            id: set.id,
            exerciseName: set.exercises?.name || 'Unknown Exercise',
            muscleGroup: set.exercises?.muscle_groups?.name || 'Unknown',
            weight: set.weight ? `${set.weight} ${set.weight_unit || 'lbs'}` : '',
            reps: set.reps || 0,
            duration_seconds: set.duration_seconds,
            notes: set.notes || ''
          }));

          return { ...workout, exerciseSets };
        })
      );

      return workoutsWithSets;
    },
    enabled: !!user?.id,
  });

  // Add workout mutation
  const addWorkoutMutation = useMutation({
    mutationFn: async (workoutData: CreateWorkoutData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Create workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          title: workoutData.title,
          date: workoutData.date,
          user_id: user.id,
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Error creating workout:', workoutError);
        throw workoutError;
      }

      // Add exercise sets if provided
      if (workoutData.exerciseSets && workoutData.exerciseSets.length > 0) {
        for (let i = 0; i < workoutData.exerciseSets.length; i++) {
          const set = workoutData.exerciseSets[i];
          
          // Find or create exercise
          let exerciseId;
          const { data: existingExercise } = await supabase
            .from('exercises')
            .select('id')
            .eq('name', set.exerciseName)
            .eq('muscle_group_id', (
              await supabase
                .from('muscle_groups')
                .select('id')
                .eq('name', set.muscleGroup)
                .eq('user_id', user.id)
                .single()
            ).data?.id)
            .single();

          if (existingExercise) {
            exerciseId = existingExercise.id;
          } else {
            // Create new exercise if it doesn't exist
            const { data: muscleGroup } = await supabase
              .from('muscle_groups')
              .select('id')
              .eq('name', set.muscleGroup)
              .eq('user_id', user.id)
              .single();

            if (muscleGroup) {
              const { data: newExercise, error: exerciseError } = await supabase
                .from('exercises')
                .insert({
                  name: set.exerciseName,
                  muscle_group_id: muscleGroup.id,
                  metric_type: 'weight_reps',
                })
                .select()
                .single();

              if (exerciseError) throw exerciseError;
              exerciseId = newExercise.id;
            }
          }

          if (exerciseId) {
            // Parse weight
            let weight = null;
            let weightUnit = 'lbs';
            if (set.weight) {
              const weightMatch = set.weight.match(/(\d+(?:\.\d+)?)\s*(lbs?|kg|pounds?|kilograms?)?/i);
              if (weightMatch) {
                weight = parseFloat(weightMatch[1]);
                const unit = weightMatch[2]?.toLowerCase();
                if (unit && (unit.startsWith('kg') || unit.startsWith('kilo'))) {
                  weightUnit = 'kg';
                }
              }
            }

            const { error: setError } = await supabase
              .from('exercise_sets')
              .insert({
                workout_id: workout.id,
                exercise_id: exerciseId,
                weight: weight,
                weight_unit: weightUnit as 'lbs' | 'kg',
                reps: set.reps,
                duration_seconds: set.duration_seconds,
                notes: set.notes,
                set_order: i + 1,
              });

            if (setError) {
              console.error('Error creating exercise set:', setError);
              throw setError;
            }
          }
        }
      }

      return workout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
    onError: (error) => {
      console.error('Error adding workout:', error);
      toast({
        title: "Error",
        description: "Failed to add workout. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    workouts,
    isLoading,
    error,
    addWorkout: addWorkoutMutation.mutateAsync,
    isAddingWorkout: addWorkoutMutation.isPending,
  };
};
