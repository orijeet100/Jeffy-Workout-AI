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
    arms_id INTEGER;
    core_id INTEGER;
BEGIN
    -- Create default muscle groups for the new user
    INSERT INTO user_muscle_groups (user_id, muscle_group_name) VALUES
        (new_user_id, 'Chest'),
        (new_user_id, 'Back'),
        (new_user_id, 'Legs'),
        (new_user_id, 'Shoulders'),
        (new_user_id, 'Arms'),
        (new_user_id, 'Core')
    RETURNING id INTO chest_id;
    
    -- Get the IDs of the created muscle groups
    SELECT id INTO chest_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Chest';
    SELECT id INTO back_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Back';
    SELECT id INTO legs_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Legs';
    SELECT id INTO shoulders_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Shoulders';
    SELECT id INTO arms_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Arms';
    SELECT id INTO core_id FROM user_muscle_groups WHERE user_id = new_user_id AND muscle_group_name = 'Core';
    
    -- Create default exercises for each muscle group
    INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
        -- Chest exercises
        (new_user_id, chest_id, 'Bench Press'),
        (new_user_id, chest_id, 'Push-ups'),
        (new_user_id, chest_id, 'Dumbbell Flyes'),
        (new_user_id, chest_id, 'Incline Bench Press'),
        
        -- Back exercises
        (new_user_id, back_id, 'Pull-ups'),
        (new_user_id, back_id, 'Deadlift'),
        (new_user_id, back_id, 'Bent-over Rows'),
        (new_user_id, back_id, 'Lat Pulldowns'),
        
        -- Legs exercises
        (new_user_id, legs_id, 'Squats'),
        (new_user_id, legs_id, 'Deadlift'),
        (new_user_id, legs_id, 'Lunges'),
        (new_user_id, legs_id, 'Leg Press'),
        
        -- Shoulders exercises
        (new_user_id, shoulders_id, 'Overhead Press'),
        (new_user_id, shoulders_id, 'Lateral Raises'),
        (new_user_id, shoulders_id, 'Front Raises'),
        (new_user_id, shoulders_id, 'Rear Delt Flyes'),
        
        -- Arms exercises
        (new_user_id, arms_id, 'Bicep Curls'),
        (new_user_id, arms_id, 'Tricep Dips'),
        (new_user_id, arms_id, 'Hammer Curls'),
        (new_user_id, arms_id, 'Skull Crushers'),
        
        -- Core exercises
        (new_user_id, core_id, 'Planks'),
        (new_user_id, core_id, 'Crunches'),
        (new_user_id, core_id, 'Russian Twists'),
        (new_user_id, core_id, 'Leg Raises');
        
    RAISE NOTICE 'Default exercise data created for user %', new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_user_data(UUID) TO authenticated;

-- Test the function (optional - remove in production)
-- SELECT create_default_user_data('your-test-user-id-here'); 