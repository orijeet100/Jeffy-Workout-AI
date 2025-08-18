import { supabase } from '@/integrations/client';
import { 
  WorkoutSet, 
  UserMuscleGroup, 
  UserExercise, 
  WorkoutSetFormData,
  WorkoutSetWithDetails,
  ExerciseGroup 
} from '@/types/workout';

export class DatabaseService {
  // Initialize default data for new user
  static async initializeUserData(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('create_default_user_data', { new_user_id: userId });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      // Handle initialization error silently
      throw error;
    }
  }

  // Get user's muscle groups
  static async getUserMuscleGroups(userId: string): Promise<UserMuscleGroup[]> {
    try {
      const { data, error } = await supabase
        .from('user_muscle_groups')
        .select('*')
        .eq('user_id', userId)
        .order('id');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      // Handle fetch error silently
      throw error;
    }
  }

  // Get user's exercises
  static async getUserExercises(userId: string): Promise<UserExercise[]> {
    try {
      const { data, error } = await supabase
        .from('user_exercises')
        .select('*')
        .eq('user_id', userId)
        .order('id');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      // Handle fetch error silently
      throw error;
    }
  }

  // Get exercise groups for a user
  static async getExerciseGroups(userId: string): Promise<any[]> {
    try {
      const muscleGroups = await this.getUserMuscleGroups(userId);
      const exercises = await this.getUserExercises(userId);

      // Group exercises by muscle group
      const exerciseGroups = muscleGroups.map(group => ({
        muscle_group_id: group.id,
        muscle_group_name: group.muscle_group_name,
        exercises: exercises.filter(ex => ex.muscle_group_id === group.id)
      }));

      return exerciseGroups;
    } catch (error) {
      // Handle fetch error silently
      throw error;
    }
  }

  // Get exercises for a specific muscle group
  static async getExercisesByMuscleGroup(userId: string, muscleGroupId: number): Promise<UserExercise[]> {
    try {
      const { data, error } = await supabase
        .from('user_exercises')
        .select('*')
        .eq('user_id', userId)
        .eq('muscle_group_id', muscleGroupId)
        .order('id');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      // Handle fetch error silently
      throw error;
    }
  }

  // Add new workout set
  static async addWorkoutSet(workoutSet: WorkoutSetFormData, userId: string, date: string): Promise<WorkoutSet> {
    try {
      // Validate required fields
      if (!workoutSet.muscle_group_id || !workoutSet.exercise_id || !workoutSet.number_of_reps) {
        throw new Error('Missing required fields');
      }

      // Format date to YYYY-MM-DD
      const formattedDate = new Date(date).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('workout_sets')
        .insert({
          user_id: userId,
          muscle_group_id: workoutSet.muscle_group_id,
          exercise_id: workoutSet.exercise_id,
          number_of_reps: workoutSet.number_of_reps,
          weight: workoutSet.weight,
          date: formattedDate
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      // Handle database error silently
      throw error;
    }
  }

  // Add multiple workout sets
  static async addWorkoutSets(workoutSets: WorkoutSetFormData[], userId: string, date: string): Promise<WorkoutSet[]> {
    try {
      // Validate required fields for all sets
      for (const set of workoutSets) {
        if (!set.muscle_group_id || !set.exercise_id || !set.number_of_reps) {
          throw new Error('Missing required fields in one or more workout sets');
        }
      }

      // Format date to YYYY-MM-DD
      const formattedDate = new Date(date).toISOString().split('T')[0];

      const setsToInsert = workoutSets.map(set => ({
        user_id: userId,
        muscle_group_id: set.muscle_group_id,
        exercise_id: set.exercise_id,
        number_of_reps: set.number_of_reps,
        weight: set.weight,
        date: formattedDate
      }));

      const { data, error } = await supabase
        .from('workout_sets')
        .insert(setsToInsert)
        .select('*');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      // Handle database error silently
      throw error;
    }
  }

  // Get workout sets for a specific date
  static async getWorkoutSetsByDate(userId: string, date: string): Promise<WorkoutSetWithDetails[]> {
    try {
      const formattedDate = new Date(date).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('workout_sets')
        .select(`
          *,
          user_muscle_groups!inner(muscle_group_name),
          user_exercises!inner(exercise_name)
        `)
        .eq('user_id', userId)
        .eq('date', formattedDate)
        .order('created_at');

      if (error) {
        throw error;
      }


      // Map the joined data to match WorkoutSetWithDetails interface
      const mappedData = (data || []).map(set => ({
        ...set,
        muscle_group_name: set.user_muscle_groups?.muscle_group_name || 'Unknown',
        exercise_name: set.user_exercises?.exercise_name || 'Unknown'
      }));

      return mappedData;
    } catch (error) {
      // Handle fetch error silently
      throw error;
    }
  }

  // Update workout set
  static async updateWorkoutSet(setId: number, updates: Partial<WorkoutSetFormData>, userId: string): Promise<WorkoutSet> {
    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .update(updates)
        .eq('id', setId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      // Handle update error silently
      throw error;
    }
  }

  // Delete workout set
  static async deleteWorkoutSet(setId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      // Handle delete error silently
      throw error;
    }
  }

  // Add new muscle group
  static async addMuscleGroup(userId: string, muscleGroupName: string): Promise<UserMuscleGroup> {
    try {
      const { data, error } = await supabase
        .from('user_muscle_groups')
        .insert({
          user_id: userId,
          muscle_group_name: muscleGroupName
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      // Handle add error silently
      throw error;
    }
  }

  // Add new exercise
  static async addExercise(userId: string, muscleGroupId: number, exerciseName: string): Promise<UserExercise> {
    try {
      const { data, error } = await supabase
        .from('user_exercises')
        .insert({
          user_id: userId,
          muscle_group_id: muscleGroupId,
          exercise_name: exerciseName
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      // Handle add error silently
      throw error;
    }
  }

  // Delete muscle group (and all associated exercises and workout sets)
  static async deleteMuscleGroup(muscleGroupId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_muscle_groups')
        .delete()
        .eq('id', muscleGroupId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      // Handle delete error silently
      throw error;
    }
  }

  // Delete exercise (and all associated workout sets)
  static async deleteExercise(exerciseId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_exercises')
        .delete()
        .eq('id', exerciseId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      // Handle delete error silently
      throw error;
    }
  }

  // Update muscle group name
  static async updateMuscleGroup(muscleGroupId: number, updates: Partial<UserMuscleGroup>, userId: string): Promise<UserMuscleGroup> {
    try {
      const { data, error } = await supabase
        .from('user_muscle_groups')
        .update(updates)
        .eq('id', muscleGroupId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      // Handle update error silently
      throw error;
    }
  }

  // Update exercise name
  static async updateExercise(exerciseId: number, updates: Partial<UserExercise>, userId: string): Promise<UserExercise> {
    try {
      const { data, error } = await supabase
        .from('user_exercises')
        .update(updates)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      // Handle update error silently
      throw error;
    }
  }
} 