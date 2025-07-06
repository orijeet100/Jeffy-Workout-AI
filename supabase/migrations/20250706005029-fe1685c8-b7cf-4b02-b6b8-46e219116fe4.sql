
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create enum for exercise metric types
CREATE TYPE public.exercise_metric AS ENUM ('weight_reps', 'time_based');

-- Create enum for weight units
CREATE TYPE public.weight_unit AS ENUM ('lbs', 'kg');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create muscle_groups table
CREATE TABLE public.muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create exercises table
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muscle_group_id UUID REFERENCES public.muscle_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  metric_type exercise_metric DEFAULT 'weight_reps',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(muscle_group_id, name)
);

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercise_sets table
CREATE TABLE public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  weight DECIMAL(6,2),
  reps INTEGER,
  duration_seconds INTEGER,
  weight_unit weight_unit DEFAULT 'lbs',
  notes TEXT,
  set_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policies for muscle_groups
CREATE POLICY "Users can view their own muscle groups" ON public.muscle_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own muscle groups" ON public.muscle_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own muscle groups" ON public.muscle_groups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own muscle groups" ON public.muscle_groups
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for exercises
CREATE POLICY "Users can view exercises from their muscle groups" ON public.exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.muscle_groups 
      WHERE id = muscle_group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert exercises to their muscle groups" ON public.exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.muscle_groups 
      WHERE id = muscle_group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update exercises in their muscle groups" ON public.exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.muscle_groups 
      WHERE id = muscle_group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete exercises from their muscle groups" ON public.exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.muscle_groups 
      WHERE id = muscle_group_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for workouts
CREATE POLICY "Users can view their own workouts" ON public.workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts" ON public.workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON public.workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for exercise_sets
CREATE POLICY "Users can view exercise sets from their workouts" ON public.exercise_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE id = workout_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert exercise sets to their workouts" ON public.exercise_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE id = workout_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update exercise sets in their workouts" ON public.exercise_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE id = workout_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete exercise sets from their workouts" ON public.exercise_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE id = workout_id AND user_id = auth.uid()
    )
  );

-- Create trigger function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to initialize default exercise knowledge for new users
CREATE OR REPLACE FUNCTION public.initialize_default_exercises(user_id UUID)
RETURNS void AS $$
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
    (user_id, 'Chest', true),
    (user_id, 'Back', true),
    (user_id, 'Legs', true),
    (user_id, 'Biceps', true),
    (user_id, 'Triceps', true),
    (user_id, 'Shoulders', true),
    (user_id, 'Abs', true);
  
  -- Get the IDs of the created muscle groups
  SELECT id INTO chest_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Chest';
  SELECT id INTO back_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Back';
  SELECT id INTO legs_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Legs';
  SELECT id INTO biceps_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Biceps';
  SELECT id INTO triceps_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Triceps';
  SELECT id INTO shoulders_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Shoulders';
  SELECT id INTO abs_id FROM public.muscle_groups WHERE user_id = initialize_default_exercises.user_id AND name = 'Abs';
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to initialize default exercises
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Initialize default exercise knowledge
  PERFORM public.initialize_default_exercises(new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
