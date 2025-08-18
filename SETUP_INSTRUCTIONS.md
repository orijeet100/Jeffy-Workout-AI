# 🏗️ Jeffy AI - New Database System Setup

## 🎯 **Overview**

This document outlines the complete migration from the old JSON-based system to the new normalized 3-table database structure.

## 🗄️ **New Database Structure**

### **Table 1: user_muscle_groups**
- `id` - Primary key
- `user_id` - References auth.users(id)
- `muscle_group_id` - User's personal muscle group ID
- `muscle_group_name` - Name of the muscle group
- `created_at` - Timestamp

### **Table 2: user_exercises**
- `id` - Primary key
- `user_id` - References auth.users(id)
- `muscle_group_id` - References user_muscle_groups(id)
- `exercise_name` - Name of the exercise
- `created_at` - Timestamp

### **Table 3: workout_sets**
- `id` - Primary key
- `user_id` - References auth.users(id)
- `muscle_group_id` - References user_muscle_groups(id)
- `exercise_id` - References user_exercises(id)
- `number_of_reps` - Number of repetitions
- `weight` - Weight used (optional)
- `date` - Workout date
- `created_at` - Timestamp
- `modified_at` - Last modified timestamp

## 🔑 **API Keys Setup**

### **Required API Keys**
To enable the voice functionality, you need to add these API keys to your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Deepgram API Key for Voice-to-Text
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key_here

# OpenAI API Key for Workout Parsing
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### **Getting API Keys**

#### **1. Deepgram API Key**
1. Go to [deepgram.com](https://deepgram.com)
2. Sign up for a free account
3. Navigate to **API Keys** in your dashboard
4. Copy your API key
5. Add it to your `.env` file as `VITE_DEEPGRAM_API_KEY`

#### **2. OpenAI API Key**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in to your account
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key and add it to your `.env` file as `VITE_OPENAI_API_KEY`

### **API Usage & Costs**
- **Deepgram**: Free tier includes 200 hours/month of audio transcription
- **OpenAI**: Pay-per-use pricing (very affordable for small usage)
- **Voice processing**: Each workout typically costs <$0.01

---

## 🎤 **Voice Input System**

### **How It Works**
The voice input system now uses **real AI APIs** for professional-grade voice processing:

1. **Click the "Add Sets" button** (single, beautiful gradient button)
2. **Choose your input method** - Voice Input or Manual Entry tabs
3. **For Voice Input**: Speak naturally, e.g., "I did 3 sets of bench press, 185 pounds, 8 reps each"
4. **Deepgram API** converts your voice to text with high accuracy
5. **OpenAI API** intelligently parses the text and maps it to your exercise library
6. **Review and edit** the extracted workout sets
7. **Save** all sets at once

### **Voice Processing Features**
- **Real-time voice recording** with microphone access
- **Professional transcription** via Deepgram's base model (free tier)
- **AI-powered workout parsing** via OpenAI GPT-4
- **Automatic exercise mapping** to your personal library
- **Smart pattern recognition** for weights, reps, and sets
- **Exercise aliases** (e.g., "bench" matches "Bench Press")
- **Multiple set detection** (e.g., "3 sets" creates 3 separate entries)
- **Context-aware processing** using your exercise knowledge base
- **Seamless integration** - voice input automatically fills the manual form

### **Example Voice Commands**
- "3 sets of bench press, 185 pounds, 8 reps each"
- "Deadlift 225 for 5 reps, 3 sets"
- "Push-ups, 15 reps, 4 sets"
- "Squats 135 pounds, 10 reps, 2 sets"

### **Technical Implementation**
- **MediaRecorder API** for browser-based audio recording
- **Deepgram base model** for high-accuracy transcription (free tier)
- **OpenAI GPT-4** for intelligent workout parsing
- **Exercise library context** passed to OpenAI for accurate mapping
- **Fallback processing** if API calls fail
- **User review** before saving to ensure accuracy

### **Audio Quality & Settings**
- **Format**: WebM with Opus codec for optimal quality
- **Sample rate**: Automatic (typically 48kHz)
- **Recording limit**: 3 minutes maximum
- **Noise reduction**: Built into Deepgram's model
- **Language**: English (configurable)

---

## ✏️ **Unified Add Sets Modal**

### **How It Works**
One button, two input methods - choose what works best for you:

1. **Click "Add Sets"** - Single beautiful gradient button
2. **Voice Input Tab**: Record your workout naturally
3. **Manual Entry Tab**: Fill out forms with dropdowns
4. **Seamless switching** between tabs
5. **Unified save** - all sets saved together

### **Modal Features**
- **Tabbed interface** - Voice Input and Manual Entry
- **Voice processing** automatically fills manual form
- **Dropdown selection** for muscle groups and exercises
- **Dynamic exercise filtering** based on selected muscle group
- **Multiple set management** with add/remove functionality
- **Form validation** ensures complete data entry
- **Responsive design** works on all screen sizes

### **User Experience Flow**
1. **Start with Voice Input** - Quick, hands-free entry
2. **AI processes** your voice and extracts workout data
3. **Automatically switches** to Manual Entry tab
4. **Review and edit** the AI-generated sets
5. **Add more sets** manually if needed
6. **Save everything** in one action

### **Smart Integration**
- **Voice input populates** manual form automatically
- **No data loss** when switching between tabs
- **Consistent validation** across both input methods
- **Unified save function** handles all sets together

## 🚀 **Setup Steps**

### **Step 1: Database Setup**

1. **Run the database setup script** in your Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of database_setup.sql
   ```

2. **Run the default data setup script**:
   ```sql
   -- Copy and paste the contents of default_data_setup.sql
   ```

### **Step 2: Update Frontend**

The following files have been updated to work with the new system:

- ✅ `src/types/workout.ts` - New type definitions
- ✅ `src/services/databaseService.ts` - Database operations service
- ✅ `src/components/WorkoutSetForm.tsx` - New dropdown-based form
- ✅ `src/pages/Dashboard.tsx` - Updated dashboard
- ✅ `src/pages/ExerciseKnowledge.tsx` - Exercise management
- ✅ `src/components/VoiceRecorder.tsx` - Updated voice input

### **Step 3: Test the System**

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Sign in with a new user** (or clear existing data)
3. **Verify default exercises are created** automatically
4. **Test adding workout sets** using the new dropdown form
5. **Test voice input** functionality
6. **Test exercise management** (add/remove muscle groups and exercises)

## 🔧 **Key Features**

### **✅ What's New**
- **Dropdown-based input** - No more typing errors
- **Personal exercise library** - Each user builds their own
- **Normalized database** - Fast queries, efficient storage
- **Automatic user initialization** - Default exercises on signup
- **Better data integrity** - Foreign key constraints

### **✅ What's Improved**
- **Performance** - Direct integer joins instead of JSON parsing
- **Scalability** - Handles millions of workout sets efficiently
- **User experience** - Cleaner interface, better error handling
- **Data consistency** - No duplicate or orphaned data

### **✅ What's Maintained**
- **Voice input functionality** - Still works with LLM processing
- **Workout tracking** - Same features, better implementation
- **Date-based organization** - Same calendar interface
- **Responsive design** - Same beautiful UI

## 🎯 **User Experience Flow**

### **New User Signup**
1. User signs up with Google OAuth
2. System automatically creates default muscle groups and exercises
3. User sees welcome message with default exercises
4. User can immediately start adding workouts

### **Adding Workout Sets**
1. Click "Add Set" button
2. Select muscle group from dropdown
3. Select exercise from filtered dropdown
4. Enter weight and reps
5. Add multiple sets as needed
6. Save all sets at once

### **Managing Exercise Library**
1. Go to "Exercise Knowledge" page
2. Add new muscle groups
3. Add new exercises to existing muscle groups
4. Delete unused exercises or muscle groups
5. All changes are immediately reflected in workout forms

## 🔍 **Troubleshooting**

### **Common Issues**

1. **"Missing Supabase environment variables"**
   - Ensure your `.env` file has the correct Supabase URL and anon key

2. **"RLS policy violation"**
   - Run the RLS policies from the database setup script
   - Verify your user is authenticated

3. **"Default exercises not created"**
   - Check the `create_default_user_data` function exists
   - Verify the function has proper permissions

4. **"Dropdowns not populating"**
   - Check browser console for errors
   - Verify database tables exist and have data
   - Check RLS policies allow user access

### **Debug Steps**

1. **Check Supabase logs** for authentication and database errors
2. **Verify table structure** matches the schema above
3. **Test database queries** directly in Supabase SQL Editor
4. **Check browser console** for frontend errors

## 🚀 **Next Steps**

After successful setup:

1. **Test all functionality** thoroughly
2. **Migrate existing data** if needed (contact support for migration script)
3. **Customize default exercises** for your user base
4. **Add advanced features** like exercise history, progress tracking
5. **Implement real LLM processing** for voice input

## 📞 **Support**

If you encounter issues:

1. Check this document first
2. Review Supabase logs and browser console
3. Verify database structure matches the schema
4. Test with a fresh user account
5. Contact development team with specific error messages

---

**🎉 Congratulations!** You now have a professional, scalable fitness tracking system that will grow with your users! 