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
  title: string;
  exerciseSets: ExerciseSet[];
  timestamp: number;
}

export interface LLMResponse {
  success: boolean;
  exerciseCount: number;
  sets?: ExerciseSet[];
  helpText?: string;
  error?: string;
}
