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
    arms_id INTEGER;
    core_id INTEGER;
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
        (existing_user_id, 'Legs'),
        (existing_user_id, 'Shoulders'),
        (existing_user_id, 'Arms'),
        (existing_user_id, 'Core')
    RETURNING id INTO chest_id;
    
    -- Get the IDs of the created muscle groups
    SELECT id INTO chest_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Chest';
    SELECT id INTO back_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Back';
    SELECT id INTO legs_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Legs';
    SELECT id INTO shoulders_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Shoulders';
    SELECT id INTO arms_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Arms';
    SELECT id INTO core_id FROM user_muscle_groups WHERE user_id = existing_user_id AND muscle_group_name = 'Core';
    
    -- Create default exercises for each muscle group
    INSERT INTO user_exercises (user_id, muscle_group_id, exercise_name) VALUES
        -- Chest exercises
        (existing_user_id, chest_id, 'Bench Press'),
        (existing_user_id, chest_id, 'Push-ups'),
        (existing_user_id, chest_id, 'Dumbbell Flyes'),
        (existing_user_id, chest_id, 'Incline Bench Press'),
        
        -- Back exercises
        (existing_user_id, back_id, 'Pull-ups'),
        (existing_user_id, back_id, 'Deadlift'),
        (existing_user_id, back_id, 'Bent-over Rows'),
        (existing_user_id, back_id, 'Lat Pulldowns'),
        
        -- Legs exercises
        (existing_user_id, legs_id, 'Squats'),
        (existing_user_id, legs_id, 'Deadlift'),
        (existing_user_id, legs_id, 'Lunges'),
        (existing_user_id, legs_id, 'Leg Press'),
        
        -- Shoulders exercises
        (existing_user_id, shoulders_id, 'Overhead Press'),
        (existing_user_id, shoulders_id, 'Lateral Raises'),
        (existing_user_id, shoulders_id, 'Front Raises'),
        (existing_user_id, shoulders_id, 'Rear Delt Flyes'),
        
        -- Arms exercises
        (existing_user_id, arms_id, 'Bicep Curls'),
        (existing_user_id, arms_id, 'Tricep Dips'),
        (existing_user_id, arms_id, 'Hammer Curls'),
        (existing_user_id, arms_id, 'Skull Crushers'),
        
        -- Core exercises
        (existing_user_id, core_id, 'Planks'),
        (existing_user_id, core_id, 'Crunches'),
        (existing_user_id, core_id, 'Russian Twists'),
        (existing_user_id, core_id, 'Leg Raises');
        
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