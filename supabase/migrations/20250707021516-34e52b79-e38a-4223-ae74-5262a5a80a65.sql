
-- Fix the handle_new_user function to avoid ambiguous column references
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize default exercise knowledge
  PERFORM public.initialize_default_exercises(NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Also fix the initialize_default_exercises function to avoid ambiguous references
CREATE OR REPLACE FUNCTION public.initialize_default_exercises(input_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  chest_id UUID;
  back_id UUID;
  legs_id UUID;
  biceps_id UUID;
  triceps_id UUID;
  shoulders_id UUID;
  abs_id UUID;
BEGIN
  -- Insert default muscle groups
  INSERT INTO public.muscle_groups (user_id, name, is_default) VALUES
    (input_user_id, 'Chest', true),
    (input_user_id, 'Back', true),
    (input_user_id, 'Legs', true),
    (input_user_id, 'Biceps', true),
    (input_user_id, 'Triceps', true),
    (input_user_id, 'Shoulders', true),
    (input_user_id, 'Abs', true);
  
  -- Get the IDs of the created muscle groups
  SELECT id INTO chest_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Chest';
  SELECT id INTO back_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Back';
  SELECT id INTO legs_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Legs';
  SELECT id INTO biceps_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Biceps';
  SELECT id INTO triceps_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Triceps';
  SELECT id INTO shoulders_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Shoulders';
  SELECT id INTO abs_id FROM public.muscle_groups WHERE user_id = input_user_id AND name = 'Abs';
  
  -- Insert default exercises
  INSERT INTO public.exercises (muscle_group_id, name, metric_type, is_default) VALUES
    -- Chest exercises
    (chest_id, 'Bench Press', 'weight_reps', true),
    (chest_id, 'Incline Bench Press', 'weight_reps', true),
    (chest_id, 'Decline Bench Press', 'weight_reps', true),
    (chest_id, 'Dumbbell Flyes', 'weight_reps', true),
    (chest_id, 'Push-ups', 'weight_reps', true),
    (chest_id, 'Dips', 'weight_reps', true),
    (chest_id, 'Incline Dumbbell Press', 'weight_reps', true),
    (chest_id, 'Cable Crossovers', 'weight_reps', true),
    (chest_id, 'Chest Press Machine', 'weight_reps', true),
    (chest_id, 'Pec Deck', 'weight_reps', true),
    
    -- Back exercises
    (back_id, 'Pull-ups', 'weight_reps', true),
    (back_id, 'Chin-ups', 'weight_reps', true),
    (back_id, 'Deadlifts', 'weight_reps', true),
    (back_id, 'Bent-over Rows', 'weight_reps', true),
    (back_id, 'Lat Pulldowns', 'weight_reps', true),
    (back_id, 'T-Bar Rows', 'weight_reps', true),
    (back_id, 'Cable Rows', 'weight_reps', true),
    (back_id, 'Single-arm Dumbbell Rows', 'weight_reps', true),
    (back_id, 'Face Pulls', 'weight_reps', true),
    (back_id, 'Reverse Flyes', 'weight_reps', true),
    
    -- Legs exercises
    (legs_id, 'Squats', 'weight_reps', true),
    (legs_id, 'Deadlifts', 'weight_reps', true),
    (legs_id, 'Leg Press', 'weight_reps', true),
    (legs_id, 'Lunges', 'weight_reps', true),
    (legs_id, 'Romanian Deadlifts', 'weight_reps', true),
    (legs_id, 'Bulgarian Split Squats', 'weight_reps', true),
    (legs_id, 'Leg Curls', 'weight_reps', true),
    (legs_id, 'Leg Extensions', 'weight_reps', true),
    (legs_id, 'Calf Raises', 'weight_reps', true),
    (legs_id, 'Hip Thrusts', 'weight_reps', true),
    
    -- Biceps exercises
    (biceps_id, 'Bicep Curls', 'weight_reps', true),
    (biceps_id, 'Hammer Curls', 'weight_reps', true),
    (biceps_id, 'Preacher Curls', 'weight_reps', true),
    (biceps_id, 'Concentration Curls', 'weight_reps', true),
    (biceps_id, 'Cable Curls', 'weight_reps', true),
    (biceps_id, 'Barbell Curls', 'weight_reps', true),
    (biceps_id, '21s', 'weight_reps', true),
    (biceps_id, 'Incline Dumbbell Curls', 'weight_reps', true),
    (biceps_id, 'Reverse Curls', 'weight_reps', true),
    (biceps_id, 'Chin-ups', 'weight_reps', true),
    
    -- Triceps exercises
    (triceps_id, 'Tricep Dips', 'weight_reps', true),
    (triceps_id, 'Close-grip Bench Press', 'weight_reps', true),
    (triceps_id, 'Overhead Tricep Extension', 'weight_reps', true),
    (triceps_id, 'Tricep Pushdowns', 'weight_reps', true),
    (triceps_id, 'Diamond Push-ups', 'weight_reps', true),
    (triceps_id, 'Skull Crushers', 'weight_reps', true),
    (triceps_id, 'Tricep Kickbacks', 'weight_reps', true),
    (triceps_id, 'Rope Pushdowns', 'weight_reps', true),
    (triceps_id, 'Bench Dips', 'weight_reps', true),
    (triceps_id, 'Overhead Dumbbell Extension', 'weight_reps', true),
    
    -- Shoulders exercises
    (shoulders_id, 'Shoulder Press', 'weight_reps', true),
    (shoulders_id, 'Lateral Raises', 'weight_reps', true),
    (shoulders_id, 'Front Raises', 'weight_reps', true),
    (shoulders_id, 'Rear Delt Flyes', 'weight_reps', true),
    (shoulders_id, 'Arnold Press', 'weight_reps', true),
    (shoulders_id, 'Upright Rows', 'weight_reps', true),
    (shoulders_id, 'Shrugs', 'weight_reps', true),
    (shoulders_id, 'Pike Push-ups', 'weight_reps', true),
    (shoulders_id, 'Face Pulls', 'weight_reps', true),
    (shoulders_id, 'Handstand Push-ups', 'weight_reps', true),
    
    -- Abs exercises (some time-based)
    (abs_id, 'Crunches', 'weight_reps', true),
    (abs_id, 'Planks', 'time_based', true),
    (abs_id, 'Sit-ups', 'weight_reps', true),
    (abs_id, 'Russian Twists', 'weight_reps', true),
    (abs_id, 'Leg Raises', 'weight_reps', true),
    (abs_id, 'Mountain Climbers', 'time_based', true),
    (abs_id, 'Bicycle Crunches', 'weight_reps', true),
    (abs_id, 'Dead Bug', 'weight_reps', true),
    (abs_id, 'Ab Wheel Rollouts', 'weight_reps', true),
    (abs_id, 'Hanging Knee Raises', 'weight_reps', true);
END;
$function$;
