
export interface ExerciseSet {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  weight: string;
  reps: number;
  duration_seconds?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  date: string;
  title: string;
  exerciseSets: ExerciseSet[];
  timestamp: number;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string;
}

export interface LLMResponse {
  success: boolean;
  exerciseCount: number;
  sets?: ExerciseSet[];
  helpText?: string;
  error?: string;
}
