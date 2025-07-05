
export interface ExerciseSet {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  weight: string;
  reps: number;
}

export interface Workout {
  id: string;
  date: string;
  title: string;
  exerciseSets: ExerciseSet[];
  timestamp: number;
}

export interface LLMResponse {
  success: boolean;
  sets?: ExerciseSet[];
  error?: string;
}
