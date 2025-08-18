-- New normalized database structure for Jeffy AI
-- Run this in your Supabase SQL Editor

-- Table 1: User Muscle Groups
CREATE TABLE IF NOT EXISTS user_muscle_groups (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    muscle_group_id INTEGER NOT NULL,
    muscle_group_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, muscle_group_id)
);

-- Table 2: User Exercises
CREATE TABLE IF NOT EXISTS user_exercises (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    muscle_group_id INTEGER REFERENCES user_muscle_groups(id) ON DELETE CASCADE,
    exercise_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, muscle_group_id, exercise_name)
);

-- Table 3: Workout Sets
CREATE TABLE IF NOT EXISTS workout_sets (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    muscle_group_id INTEGER REFERENCES user_muscle_groups(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES user_exercises(id) ON DELETE CASCADE,
    number_of_reps INTEGER NOT NULL,
    weight DECIMAL(6,2),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE user_muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_muscle_groups
CREATE POLICY "Users can manage their own muscle groups" ON user_muscle_groups
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_exercises
CREATE POLICY "Users can manage their own exercises" ON user_exercises
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for workout_sets
CREATE POLICY "Users can manage their own workout sets" ON workout_sets
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_muscle_groups_user_id ON user_muscle_groups(user_id);
CREATE INDEX idx_user_exercises_user_id ON user_exercises(user_id);
CREATE INDEX idx_user_exercises_muscle_group_id ON user_exercises(muscle_group_id);
CREATE INDEX idx_workout_sets_user_id ON workout_sets(user_id);
CREATE INDEX idx_workout_sets_date ON workout_sets(date);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id); 