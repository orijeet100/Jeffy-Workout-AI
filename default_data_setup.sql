-- Default data setup for new users
-- This will be called programmatically when a user signs up

-- Function to create default data for a new user
CREATE OR REPLACE FUNCTION create_default_user_data(new_user_id UUID)
RETURNS VOID AS $$
DECLARE
    mg_id INTEGER;
    mg_record RECORD;
BEGIN
    -- Create default muscle groups for the new user
    INSERT INTO user_muscle_groups (user_id, muscle_group_id, muscle_group_name) VALUES
        (new_user_id, 1, 'Chest'),
        (new_user_id, 2, 'Back'),
        (new_user_id, 3, 'Shoulders'),
        (new_user_id, 4, 'Biceps'),
        (new_user_id, 5, 'Triceps'),
        (new_user_id, 6, 'Legs'),
        (new_user_id, 7, 'Core'),
        (new_user_id, 8, 'Cardio');

    -- Create default exercises for each muscle group
    FOR mg_record IN SELECT id, muscle_group_id FROM user_muscle_groups WHERE user_id = new_user_id LOOP
        mg_id := mg_record.muscle_group_id;
        
        -- Insert exercises based on muscle group
        CASE mg_id
            WHEN 1 THEN -- Chest
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Bench Press'),
                    (new_user_id, mg_record.id, 'Push-ups'),
                    (new_user_id, mg_record.id, 'Dumbbell Flyes'),
                    (new_user_id, mg_record.id, 'Incline Bench Press');
            WHEN 2 THEN -- Back
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Pull-ups'),
                    (new_user_id, mg_record.id, 'Deadlift'),
                    (new_user_id, mg_record.id, 'Barbell Rows'),
                    (new_user_id, mg_record.id, 'Lat Pulldowns');
            WHEN 3 THEN -- Shoulders
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Overhead Press'),
                    (new_user_id, mg_record.id, 'Lateral Raises'),
                    (new_user_id, mg_record.id, 'Front Raises'),
                    (new_user_id, mg_record.id, 'Shrugs');
            WHEN 4 THEN -- Biceps
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Barbell Curls'),
                    (new_user_id, mg_record.id, 'Dumbbell Curls'),
                    (new_user_id, mg_record.id, 'Hammer Curls'),
                    (new_user_id, mg_record.id, 'Preacher Curls');
            WHEN 5 THEN -- Triceps
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Dips'),
                    (new_user_id, mg_record.id, 'Tricep Pushdowns'),
                    (new_user_id, mg_record.id, 'Skull Crushers'),
                    (new_user_id, mg_record.id, 'Close Grip Bench Press');
            WHEN 6 THEN -- Legs
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Squats'),
                    (new_user_id, mg_record.id, 'Deadlifts'),
                    (new_user_id, mg_record.id, 'Lunges'),
                    (new_user_id, mg_record.id, 'Leg Press');
            WHEN 7 THEN -- Core
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Planks'),
                    (new_user_id, mg_record.id, 'Crunches'),
                    (new_user_id, mg_record.id, 'Russian Twists'),
                    (new_user_id, mg_record.id, 'Leg Raises');
            WHEN 8 THEN -- Cardio
                INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
                    (new_user_id, mg_record.id, 'Running'),
                    (new_user_id, mg_record.id, 'Cycling'),
                    (new_user_id, mg_record.id, 'Jump Rope'),
                    (new_user_id, mg_record.id, 'Rowing');
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_user_data(UUID) TO authenticated; 