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
			const { error } = await supabase.rpc('create_default_user_data', {
				new_user_id: userId
			});
			if (error) throw error;
		} catch (error) {
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
				.order('id', { ascending: true });
			if (error) throw error;
			return data || [];
		} catch (error) {
			return [];
		}
	}

	// Get user's exercises
	static async getUserExercises(userId: string): Promise<UserExercise[]> {
		try {
			const { data, error } = await supabase
				.from('user_exercises')
				.select('*')
				.eq('user_id', userId)
				.order('id', { ascending: true });
			if (error) throw error;
			return data || [];
		} catch (error) {
			return [];
		}
	}

	// Get exercise groups for a user
	static async getExerciseGroups(userId: string): Promise<ExerciseGroup[]> {
		try {
			const muscleGroups = await this.getUserMuscleGroups(userId);
			const exercises = await this.getUserExercises(userId);
			const exerciseGroups: ExerciseGroup[] = muscleGroups.map(muscleGroup => {
				const groupExercises = exercises.filter(exercise => exercise.muscle_group_id === muscleGroup.id);
				return {
					muscle_group_id: muscleGroup.id,
					muscle_group_name: muscleGroup.muscle_group_name,
					exercises: groupExercises
				};
			});
			return exerciseGroups;
		} catch (error) {
			return [];
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
				.order('exercise_name');
			if (error) throw error;
			return data || [];
		} catch (error) {
			return [];
		}
	}

	// Add a single workout set
	static async addWorkoutSet(workoutSet: WorkoutSetFormData, userId: string, date: string): Promise<WorkoutSet> {
		if (!userId) throw new Error('User ID is required');
		if (!date) throw new Error('Date is required');
		if (!workoutSet || typeof workoutSet !== 'object') throw new Error('Invalid workout set');
		const formattedDate = new Date(date).toISOString().split('T')[0];
		const { data, error } = await supabase
			.from('workout_sets')
			.insert({
				user_id: userId,
				date: formattedDate,
				muscle_group_id: workoutSet.muscle_group_id,
				exercise_id: workoutSet.exercise_id,
				weight: workoutSet.weight,
				number_of_reps: workoutSet.number_of_reps,
				created_at: new Date().toISOString(),
				modified_at: new Date().toISOString()
			})
			.select('*')
			.single();
		if (error) throw error;
		return data as WorkoutSet;
	}

	// Add multiple workout sets
	static async addWorkoutSets(workoutSets: WorkoutSetFormData[], userId: string, date: string): Promise<WorkoutSet[]> {
		if (!userId) throw new Error('User ID is required');
		if (!date) throw new Error('Date is required');
		if (!Array.isArray(workoutSets) || workoutSets.length === 0) throw new Error('No workout sets provided');
		const formattedDate = new Date(date).toISOString().split('T')[0];
		const results: WorkoutSet[] = [];
		for (const workoutSet of workoutSets) {
			const inserted = await this.addWorkoutSet(workoutSet, userId, formattedDate);
			results.push(inserted);
		}
		return results;
	}

	// Get workout sets by date with names joined
	static async getWorkoutSetsByDate(userId: string, date: string): Promise<WorkoutSetWithDetails[]> {
		try {
			const { data, error } = await supabase
				.from('workout_sets')
				.select(`
					id, user_id, date, muscle_group_id, exercise_id, weight, number_of_reps, created_at, modified_at,
					user_muscle_groups ( id, muscle_group_name ),
					user_exercises ( id, exercise_name )
				`)
				.eq('user_id', userId)
				.eq('date', date)
				.order('created_at', { ascending: true });
			if (error) throw error;
			return (data || []).map((set: any) => ({
				...set,
				muscle_group_name: set.user_muscle_groups.muscle_group_name,
				exercise_name: set.user_exercises.exercise_name
			}));
		} catch (error) {
			return [];
		}
	}

	// Update workout set
	static async updateWorkoutSet(id: number, updates: Partial<WorkoutSet>): Promise<boolean> {
		try {
			const { error } = await supabase
				.from('workout_sets')
				.update({
					...updates,
					modified_at: new Date().toISOString()
				})
				.eq('id', id);
			if (error) throw error;
			return true;
		} catch (error) {
			return false;
		}
	}

	// Delete workout set
	static async deleteWorkoutSet(id: number): Promise<boolean> {
		try {
			const { error } = await supabase
				.from('workout_sets')
				.delete()
				.eq('id', id);
			if (error) throw error;
			return true;
		} catch (error) {
			return false;
		}
	}

	// Add new muscle group
	static async addMuscleGroup(userId: string, muscleGroupName: string): Promise<UserMuscleGroup | null> {
		try {
			const { data, error } = await supabase
				.from('user_muscle_groups')
				.insert({ user_id: userId, muscle_group_name: muscleGroupName })
				.select()
				.single();
			if (error) throw error;
			return data;
		} catch (error) {
			return null;
		}
	}

	// Add new exercise
	static async addExercise(userId: string, muscleGroupId: number, exerciseName: string): Promise<UserExercise | null> {
		try {
			const { data: muscleGroup, error: muscleGroupError } = await supabase
				.from('user_muscle_groups')
				.select('id')
				.eq('id', muscleGroupId)
				.eq('user_id', userId)
				.single();
			if (muscleGroupError || !muscleGroup) throw new Error('Invalid muscle group');
			const { data, error } = await supabase
				.from('user_exercises')
				.insert({ user_id: userId, muscle_group_id: muscleGroupId, exercise_name: exerciseName })
				.select()
				.single();
			if (error) throw error;
			return data;
		} catch (error) {
			return null;
		}
	}

	// Delete muscle group
	static async deleteMuscleGroup(userId: string, muscleGroupId: number): Promise<boolean> {
		try {
			await supabase.from('workout_sets').delete().eq('user_id', userId).eq('muscle_group_id', muscleGroupId);
			await supabase.from('user_exercises').delete().eq('user_id', userId).eq('muscle_group_id', muscleGroupId);
			const { error } = await supabase
				.from('user_muscle_groups')
				.delete()
				.eq('user_id', userId)
				.eq('id', muscleGroupId);
			if (error) throw error;
			return true;
		} catch (error) {
			return false;
		}
	}

	// Delete exercise
	static async deleteExercise(userId: string, exerciseId: number): Promise<boolean> {
		try {
			await supabase.from('workout_sets').delete().eq('user_id', userId).eq('exercise_id', exerciseId);
			const { error } = await supabase
				.from('user_exercises')
				.delete()
				.eq('user_id', userId)
				.eq('id', exerciseId);
			if (error) throw error;
			return true;
		} catch (error) {
			return false;
		}
	}

	// Update muscle group name
	static async updateMuscleGroup(userId: string, muscleGroupId: number, newName: string): Promise<boolean> {
		try {
			const { error } = await supabase
				.from('user_muscle_groups')
				.update({ muscle_group_name: newName, modified_at: new Date().toISOString() })
				.eq('id', muscleGroupId)
				.eq('user_id', userId);
			if (error) throw error;
			return true;
		} catch (error) {
			return false;
		}
	}

	// Update exercise name
	static async updateExercise(userId: string, exerciseId: number, newName: string): Promise<boolean> {
		try {
			const { error } = await supabase
				.from('user_exercises')
				.update({ exercise_name: newName, modified_at: new Date().toISOString() })
				.eq('id', exerciseId)
				.eq('user_id', userId);
			if (error) throw error;
			return true;
		} catch (error) {
			return false;
		}
	}
} 