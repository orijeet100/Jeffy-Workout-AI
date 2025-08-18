-- Add modified_at columns to tables for edit functionality
-- This script adds timestamp columns to track when records were last modified

-- Add modified_at column to user_muscle_groups table
ALTER TABLE user_muscle_groups 
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add modified_at column to user_exercises table  
ALTER TABLE user_exercises 
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add modified_at column to workout_sets table
ALTER TABLE workout_sets 
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace function to automatically update modified_at on row updates
CREATE OR REPLACE FUNCTION update_modified_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update modified_at
DROP TRIGGER IF EXISTS update_user_muscle_groups_modified_at ON user_muscle_groups;
CREATE TRIGGER update_user_muscle_groups_modified_at
    BEFORE UPDATE ON user_muscle_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_at_column();

DROP TRIGGER IF EXISTS update_user_exercises_modified_at ON user_exercises;
CREATE TRIGGER update_user_exercises_modified_at
    BEFORE UPDATE ON user_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_at_column();

DROP TRIGGER IF EXISTS update_workout_sets_modified_at ON workout_sets;
CREATE TRIGGER update_workout_sets_modified_at
    BEFORE UPDATE ON workout_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_at_column();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_modified_at_column() TO authenticated; 