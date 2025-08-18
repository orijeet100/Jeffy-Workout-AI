// New normalized database types for Jeffy AI

export interface UserMuscleGroup {
  id: number;
  user_id: string;
  muscle_group_name: string;
  created_at: string;
}

export interface UserExercise {
  id: number;
  user_id: string;
  muscle_group_id: number;
  exercise_name: string;
  created_at: string;
}

export interface WorkoutSet {
  id: number;
  user_id: string;
  muscle_group_id: number;
  exercise_id: number;
  number_of_reps: number;
  weight: number | null;
  date: string;
  created_at: string;
  modified_at: string;
}

// Extended interfaces for frontend use
export interface WorkoutSetWithDetails extends WorkoutSet {
  muscle_group_name: string;
  exercise_name: string;
}

export interface ExerciseGroup {
  muscle_group_id: number;
  muscle_group_name: string;
  exercises: UserExercise[];
}

export interface WorkoutSetFormData {
  muscle_group_id: number;
  exercise_id: number;
  weight: number;
  number_of_reps: number;
}

// Legacy types for migration (can be removed after migration)
export interface ExerciseSet {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  weight: number;
  reps: number;
}

export interface Workout {
  id: string;
  date: string;
  exerciseSets: ExerciseSet[];
  timestamp: number;
}

export interface LLMResponse {
  exerciseName: string;
  muscleGroup: string;
  weight: number;
  reps: number;
}
