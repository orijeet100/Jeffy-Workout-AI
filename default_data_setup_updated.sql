-- Updated Default Data Setup for New Table Structure
-- This script creates default muscle groups and exercises for new users

-- Function to create default user data
CREATE OR REPLACE FUNCTION create_default_user_data(new_user_id UUID)
RETURNS VOID AS $$
DECLARE
    chest_id INTEGER;
    back_id INTEGER;
    legs_id INTEGER;
    shoulders_id INTEGER;
    biceps_id INTEGER;
    triceps_id INTEGER;
    abs_id INTEGER;
BEGIN
    -- Create default muscle groups for the new user
    INSERT INTO user_muscle_groups (user_id, muscle_group_name) VALUES
        (new_user_id, 'Chest'),
        (new_user_id, 'Back'),
        (new_user_id, 'Shoulders'),
        (new_user_id, 'Legs'),
        (new_user_id, 'Biceps'),
        (new_user_id, 'Triceps'),
        (new_user_id, 'Abs')
    RETURNING id INTO chest_id;
    
    -- Get the IDs of the created muscle groups
    SELECT id INTO chest_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Chest';
    SELECT id INTO back_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Back';
    SELECT id INTO shoulders_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Shoulders';
    SELECT id INTO legs_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Legs';
    SELECT id INTO biceps_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Biceps';
    SELECT id INTO triceps_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Triceps';
    SELECT id INTO abs_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Abs';
    
    -- Create default exercises for each muscle group
    INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
        -- Chest exercises
        (new_user_id, chest_id, 'Bench Press'),
        (new_user_id, chest_id, 'Incline Bench Press'),
        (new_user_id, chest_id, 'Decline Bench Press'),
        (new_user_id, chest_id, 'Dumbbell Flyes'),
        (new_user_id, chest_id, 'Push-ups'),
        (new_user_id, chest_id, 'Dips'),
        (new_user_id, chest_id, 'Incline Dumbbell Press'),
        (new_user_id, chest_id, 'Cable Crossovers'),
        (new_user_id, chest_id, 'Chest Press Machine'),
        (new_user_id, chest_id, 'Pec Deck'),
        
        -- Back exercises
        (new_user_id, back_id, 'Pull-ups'),
        (new_user_id, back_id, 'Chin-ups'),
        (new_user_id, back_id, 'Deadlifts'),
        (new_user_id, back_id, 'Bent-over Rows'),
        (new_user_id, back_id, 'Lat Pulldowns'),
        (new_user_id, back_id, 'T-Bar Rows'),
        (new_user_id, back_id, 'Cable Rows'),
        (new_user_id, back_id, 'Single-arm Dumbbell Rows'),
        (new_user_id, back_id, 'Face Pulls'),
        (new_user_id, back_id, 'Reverse Flyes'),
        
        -- Shoulders exercises
        (new_user_id, shoulders_id, 'Shoulder Press'),
        (new_user_id, shoulders_id, 'Lateral Raises'),
        (new_user_id, shoulders_id, 'Front Raises'),
        (new_user_id, shoulders_id, 'Rear Delt Flyes'),
        (new_user_id, shoulders_id, 'Arnold Press'),
        (new_user_id, shoulders_id, 'Upright Rows'),
        (new_user_id, shoulders_id, 'Shrugs'),
        (new_user_id, shoulders_id, 'Pike Push-ups'),
        (new_user_id, shoulders_id, 'Face Pulls'),
        (new_user_id, shoulders_id, 'Handstand Push-ups'),
        
        -- Legs exercises
        (new_user_id, legs_id, 'Squats'),
        (new_user_id, legs_id, 'Deadlifts'),
        (new_user_id, legs_id, 'Leg Press'),
        (new_user_id, legs_id, 'Lunges'),
        (new_user_id, legs_id, 'Romanian Deadlifts'),
        (new_user_id, legs_id, 'Bulgarian Split Squats'),
        (new_user_id, legs_id, 'Leg Curls'),
        (new_user_id, legs_id, 'Leg Extensions'),
        (new_user_id, legs_id, 'Calf Raises'),
        (new_user_id, legs_id, 'Hip Thrusts'),
        
        -- Biceps exercises
        (new_user_id, biceps_id, 'Bicep Curls'),
        (new_user_id, biceps_id, 'Hammer Curls'),
        (new_user_id, biceps_id, 'Preacher Curls'),
        (new_user_id, biceps_id, 'Concentration Curls'),
        (new_user_id, biceps_id, 'Cable Curls'),
        (new_user_id, biceps_id, 'Barbell Curls'),
        (new_user_id, biceps_id, '21s'),
        (new_user_id, biceps_id, 'Incline Dumbbell Curls'),
        (new_user_id, biceps_id, 'Reverse Curls'),
        (new_user_id, biceps_id, 'Chin-ups'),
        
        -- Triceps exercises
        (new_user_id, triceps_id, 'Tricep Dips'),
        (new_user_id, triceps_id, 'Close-grip Bench Press'),
        (new_user_id, triceps_id, 'Overhead Tricep Extension'),
        (new_user_id, triceps_id, 'Tricep Pushdowns'),
        (new_user_id, triceps_id, 'Diamond Push-ups'),
        (new_user_id, triceps_id, 'Skull Crushers'),
        (new_user_id, triceps_id, 'Tricep Kickbacks'),
        (new_user_id, triceps_id, 'Rope Pushdowns'),
        (new_user_id, triceps_id, 'Bench Dips'),
        (new_user_id, triceps_id, 'Overhead Dumbbell Extension'),
        
        -- Abs exercises
        (new_user_id, abs_id, 'Crunches'),
        (new_user_id, abs_id, 'Planks'),
        (new_user_id, abs_id, 'Sit-ups'),
        (new_user_id, abs_id, 'Russian Twists'),
        (new_user_id, abs_id, 'Leg Raises'),
        (new_user_id, abs_id, 'Mountain Climbers'),
        (new_user_id, abs_id, 'Bicycle Crunches'),
        (new_user_id, abs_id, 'Dead Bug'),
        (new_user_id, abs_id, 'Ab Wheel Rollouts'),
        (new_user_id, abs_id, 'Hanging Knee Raises');
        
    RAISE NOTICE 'Default exercise data created for user %', new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_user_data(UUID) TO authenticated;

-- Test the function (optional - remove in production)
-- SELECT create_default_user_data('your-test-user-id-here'); 