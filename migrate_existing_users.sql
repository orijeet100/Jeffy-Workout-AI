-- Migration Script for Existing Users
-- Run this after updating the table structure to give existing users default exercises

-- First, let's see what users already have
SELECT 
    u.id as user_id,
    u.email,
    COUNT(umg.id) as muscle_groups_count,
    COUNT(ue.id) as exercises_count
FROM auth.users u
LEFT JOIN user_muscle_groups umg ON u.id = umg.user_id
LEFT JOIN user_exercises ue ON u.id = ue.user_id
GROUP BY u.id, u.email
ORDER BY u.created_at;

-- Function to migrate existing user (run this for each user who needs default data)
CREATE OR REPLACE FUNCTION migrate_existing_user(existing_user_id UUID)
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
    -- Check if user already has muscle groups
    IF EXISTS (SELECT 1 FROM user_muscle_groups WHERE user_id = existing_user_id) THEN
        RAISE NOTICE 'User % already has muscle groups, skipping migration', existing_user_id;
        RETURN;
    END IF;
    
    -- Create default muscle groups for the existing user
    INSERT INTO user_muscle_groups (user_id, muscle_group_name) VALUES
        (existing_user_id, 'Chest'),
        (existing_user_id, 'Back'),
        (existing_user_id, 'Shoulders'),
        (existing_user_id, 'Legs'),
        (existing_user_id, 'Biceps'),
        (existing_user_id, 'Triceps'),
        (existing_user_id, 'Abs')
    RETURNING id INTO chest_id;
    
    -- Get the IDs of the created muscle groups
    SELECT id INTO chest_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Chest';
    SELECT id INTO back_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Back';
    SELECT id INTO shoulders_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Shoulders';
    SELECT id INTO legs_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Legs';
    SELECT id INTO biceps_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Biceps';
    SELECT id INTO triceps_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Triceps';
    SELECT id INTO abs_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Abs';
    
    -- Create default exercises for each muscle group
    INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
        -- Chest exercises
        (existing_user_id, chest_id, 'Bench Press'),
        (existing_user_id, chest_id, 'Incline Bench Press'),
        (existing_user_id, chest_id, 'Decline Bench Press'),
        (existing_user_id, chest_id, 'Dumbbell Flyes'),
        (existing_user_id, chest_id, 'Push-ups'),
        (existing_user_id, chest_id, 'Dips'),
        (existing_user_id, chest_id, 'Incline Dumbbell Press'),
        (existing_user_id, chest_id, 'Cable Crossovers'),
        (existing_user_id, chest_id, 'Chest Press Machine'),
        (existing_user_id, chest_id, 'Pec Deck'),
        
        -- Back exercises
        (existing_user_id, back_id, 'Pull-ups'),
        (existing_user_id, back_id, 'Chin-ups'),
        (existing_user_id, back_id, 'Deadlifts'),
        (existing_user_id, back_id, 'Bent-over Rows'),
        (existing_user_id, back_id, 'Lat Pulldowns'),
        (existing_user_id, back_id, 'T-Bar Rows'),
        (existing_user_id, back_id, 'Cable Rows'),
        (existing_user_id, back_id, 'Single-arm Dumbbell Rows'),
        (existing_user_id, back_id, 'Face Pulls'),
        (existing_user_id, back_id, 'Reverse Flyes'),
        
        -- Shoulders exercises
        (existing_user_id, shoulders_id, 'Shoulder Press'),
        (existing_user_id, shoulders_id, 'Lateral Raises'),
        (existing_user_id, shoulders_id, 'Front Raises'),
        (existing_user_id, shoulders_id, 'Rear Delt Flyes'),
        (existing_user_id, shoulders_id, 'Arnold Press'),
        (existing_user_id, shoulders_id, 'Upright Rows'),
        (existing_user_id, shoulders_id, 'Shrugs'),
        (existing_user_id, shoulders_id, 'Pike Push-ups'),
        (existing_user_id, shoulders_id, 'Face Pulls'),
        (existing_user_id, shoulders_id, 'Handstand Push-ups'),
        
        -- Legs exercises
        (existing_user_id, legs_id, 'Squats'),
        (existing_user_id, legs_id, 'Deadlifts'),
        (existing_user_id, legs_id, 'Leg Press'),
        (existing_user_id, legs_id, 'Lunges'),
        (existing_user_id, legs_id, 'Romanian Deadlifts'),
        (existing_user_id, legs_id, 'Bulgarian Split Squats'),
        (existing_user_id, legs_id, 'Leg Curls'),
        (existing_user_id, legs_id, 'Leg Extensions'),
        (existing_user_id, legs_id, 'Calf Raises'),
        (existing_user_id, legs_id, 'Hip Thrusts'),
        
        -- Biceps exercises
        (existing_user_id, biceps_id, 'Bicep Curls'),
        (existing_user_id, biceps_id, 'Hammer Curls'),
        (existing_user_id, biceps_id, 'Preacher Curls'),
        (existing_user_id, biceps_id, 'Concentration Curls'),
        (existing_user_id, biceps_id, 'Cable Curls'),
        (existing_user_id, biceps_id, 'Barbell Curls'),
        (existing_user_id, biceps_id, '21s'),
        (existing_user_id, biceps_id, 'Incline Dumbbell Curls'),
        (existing_user_id, biceps_id, 'Reverse Curls'),
        (existing_user_id, biceps_id, 'Chin-ups'),
        
        -- Triceps exercises
        (existing_user_id, triceps_id, 'Tricep Dips'),
        (existing_user_id, triceps_id, 'Close-grip Bench Press'),
        (existing_user_id, triceps_id, 'Overhead Tricep Extension'),
        (existing_user_id, triceps_id, 'Tricep Pushdowns'),
        (existing_user_id, triceps_id, 'Diamond Push-ups'),
        (existing_user_id, triceps_id, 'Skull Crushers'),
        (existing_user_id, triceps_id, 'Tricep Kickbacks'),
        (existing_user_id, triceps_id, 'Rope Pushdowns'),
        (existing_user_id, triceps_id, 'Bench Dips'),
        (existing_user_id, triceps_id, 'Overhead Dumbbell Extension'),
        
        -- Abs exercises
        (existing_user_id, abs_id, 'Crunches'),
        (existing_user_id, abs_id, 'Planks'),
        (existing_user_id, abs_id, 'Sit-ups'),
        (existing_user_id, abs_id, 'Russian Twists'),
        (existing_user_id, abs_id, 'Leg Raises'),
        (existing_user_id, abs_id, 'Mountain Climbers'),
        (existing_user_id, abs_id, 'Bicycle Crunches'),
        (existing_user_id, abs_id, 'Dead Bug'),
        (existing_user_id, abs_id, 'Ab Wheel Rollouts'),
        (existing_user_id, abs_id, 'Hanging Knee Raises');
        
    RAISE NOTICE 'Migration completed for user %', existing_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION migrate_existing_user(UUID) TO authenticated;

-- Example usage for existing users:
-- SELECT migrate_existing_user('existing-user-uuid-here');

-- To migrate ALL existing users at once:
-- SELECT migrate_existing_user(id) FROM auth.users WHERE id NOT IN (
--     SELECT DISTINCT user_id FROM user_muscle_groups WHERE user_id IS NOT NULL
-- ); 