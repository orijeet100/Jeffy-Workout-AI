import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Plus, Save, Mic, MicOff, Loader2, Trash2 } from 'lucide-react';
import { WorkoutSetFormData } from '@/types/workout';
import { DatabaseService } from '@/services/databaseService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { transcribeAudio } from '../../api/deepgram-transcribe';
import { parseWorkoutWithOpenAI } from '../../api/openai-parse-workout';

interface AddSetsModalProps {
  selectedDate: Date;
  onSave: (sets: WorkoutSetFormData[]) => Promise<void>;
  onClose: () => void;
  userId: string;
}

interface ExerciseGroup {
  muscle_group_id: number;
  muscle_group_name: string;
  exercises: Array<{
    id: number;
    exercise_name: string;
  }>;
}

const AddSetsModal: React.FC<AddSetsModalProps> = ({ 
  selectedDate, 
  onSave, 
  onClose, 
  userId 
}) => {
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetFormData[]>([]);
  const [isFirstInstance, setIsFirstInstance] = useState(true);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Audio recording refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Load exercise library on component mount
  useEffect(() => {
    const loadExerciseLibrary = async () => {
      try {
        console.log('🔄 Loading exercise library for user:', userId);
        
        const groups = await DatabaseService.getExerciseGroups(userId);
        console.log('📚 Raw exercise groups from database:', groups);
        
        if (!groups || groups.length === 0) {
          console.warn('⚠️ No exercise groups found for user. This might indicate a setup issue.');
          toast({
            title: 'Warning',
            description: 'No exercise library found. Please check your exercise setup.',
            variant: 'default'
          });
          return;
        }
        
        setExerciseGroups(groups);
        console.log('✅ Exercise groups loaded successfully:', groups.length, 'groups');
        
        // Create initial dummy set only if this is the first instance
        if (groups.length > 0 && groups[0].exercises.length > 0) {
          const firstGroup = groups[0];
          const firstExercise = firstGroup.exercises[0];
          
          console.log('🎯 Creating dummy set with:', {
            muscle_group_id: firstGroup.muscle_group_id,
            muscle_group_name: firstGroup.muscle_group_name,
            exercise_id: firstExercise.id,
            exercise_name: firstExercise.exercise_name
          });
          
          setWorkoutSets([{
            muscle_group_id: firstGroup.muscle_group_id,
            exercise_id: firstExercise.id,
            weight: 0,
            number_of_reps: 10
          }]);
        } else {
          console.warn('⚠️ First muscle group has no exercises');
        }
        
      } catch (error) {
        console.error('❌ Error loading exercise library:', error);
        toast({
          title: 'Error',
          description: 'Failed to load exercise library',
          variant: 'destructive'
        });
      }
    };

    if (userId) {
      loadExerciseLibrary();
    } else {
      console.warn('⚠️ No userId provided, cannot load exercise library');
    }
  }, [userId]);

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes max
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Voice Recording Functions
  const handleStartRecording = async () => {
    try {
      setErrorMessage('');
      setTranscript('');
      audioChunksRef.current = [];

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioWithDeepgram(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Failed to access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioWithDeepgram = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setErrorMessage('');
      
      // Call Deepgram API
      const deepgramResponse = await transcribeAudio(audioBlob);
      
      const transcriptText = deepgramResponse.transcript;
      
      if (!transcriptText || transcriptText.trim() === '') {
        throw new Error('No speech detected. Please try again.');
      }
      
      setTranscript(transcriptText);
      
      // Process transcript with OpenAI
      const extractedSets = await processTranscriptWithOpenAI(transcriptText);
      
      if (extractedSets.error) {
        // Handle error response from OpenAI
        setErrorMessage(extractedSets.error);
        return;
      }
      
      // Add new sets to existing ones
      if (isFirstInstance && workoutSets.length === 1 && 
          workoutSets[0].muscle_group_id === exerciseGroups[0]?.muscle_group_id && 
          workoutSets[0].exercise_id === exerciseGroups[0]?.exercises[0]?.id) {
        // Replace dummy set on first voice input
        setWorkoutSets(extractedSets.workoutSets);
        setIsFirstInstance(false);
      } else {
        // Append new sets to existing ones
        setWorkoutSets(prev => [...prev, ...extractedSets.workoutSets]);
      }
      
      // Validate that all sets have valid IDs using the new validation function
      const validation = validateOpenAIResponse(extractedSets, createExerciseContext());
      
      if (!validation.isValid) {
        console.warn('⚠️ OpenAI response validation failed:', validation.errors);
        setErrorMessage(`Voice input processed but some sets had issues: ${validation.errors.join(', ')}`);
        
        // Only keep valid sets
        if (validation.validSets.length > 0) {
          if (isFirstInstance && workoutSets.length === 1 && 
              workoutSets[0].muscle_group_id === exerciseGroups[0]?.muscle_group_id && 
              workoutSets[0].exercise_id === exerciseGroups[0]?.exercises[0]?.id) {
            setWorkoutSets(validation.validSets);
            setIsFirstInstance(false);
          } else {
            setWorkoutSets(prev => [...prev, ...validation.validSets]);
          }
        }
      }
      
      toast({
        title: 'Voice Input Processed',
        description: `Added ${extractedSets.workoutSets.length} new workout set(s) from voice input!`,
      });
      
    } catch (error) {
      console.error('Error processing audio:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const processTranscriptWithOpenAI = async (transcriptText: string): Promise<any> => {
    try {
      // Create exercise context for OpenAI
      const exerciseContext = createExerciseContext();
      
      // Log the context and transcript for debugging
      console.log('🎯 VOICE INPUT DEBUG INFO:');
      console.log('📝 Transcript:', transcriptText);
      console.log('📚 Exercise Context:', exerciseContext);
      console.log('🔍 Available Muscle Groups:', exerciseGroups.map(g => ({
        id: g.muscle_group_id,
        name: g.muscle_group_name,
        exercises: g.exercises.map(e => ({ id: e.id, name: e.exercise_name }))
      })));
      
      // Call OpenAI API
      const openaiResponse = await parseWorkoutWithOpenAI(transcriptText, exerciseContext);
      
      // Log the OpenAI response for debugging
      console.log('🤖 OpenAI Response:', openaiResponse);
      
      if (openaiResponse.error) {
        return openaiResponse;
      }
      
      if (!openaiResponse.workoutSets || !Array.isArray(openaiResponse.workoutSets)) {
        throw new Error('Invalid response from OpenAI');
      }
      
      return openaiResponse;
      
    } catch (error) {
      console.error('Error processing with OpenAI:', error);
      // Fallback to simple processing if OpenAI fails
      const fallbackSets = await simpleVoiceProcessing(transcriptText, createExerciseContext());
      return { workoutSets: fallbackSets };
    }
  };

  const createExerciseContext = () => {
    const context: any = {};
    
    // Validate that we have user-specific exercise data
    if (!exerciseGroups || exerciseGroups.length === 0) {
      console.error('❌ No exercise groups found for user!');
      return context;
    }
    
    console.log('🔍 Creating exercise context for user with:', exerciseGroups.length, 'muscle groups');
    
    exerciseGroups.forEach(group => {
      if (!group.muscle_group_id || !group.muscle_group_name || !group.exercises) {
        console.warn('⚠️ Invalid muscle group data:', group);
        return;
      }
      
      const muscleGroupKey = group.muscle_group_name.toLowerCase().trim();
      const exercises = group.exercises.filter(ex => ex.id && ex.exercise_name);
      
      if (exercises.length === 0) {
        console.warn('⚠️ No valid exercises found for muscle group:', group.muscle_group_name);
        return;
      }
      
      context[muscleGroupKey] = {
        muscle_group_id: group.muscle_group_id, // This is the PRIMARY KEY
        muscle_group_name: group.muscle_group_name,
        exercises: exercises.map((ex) => ({
          id: ex.id, // This is the PRIMARY KEY from user_exercises
          name: ex.exercise_name.toLowerCase().trim()
        }))
      };
      
      console.log(`✅ Added muscle group: ${group.muscle_group_name} (ID: ${group.muscle_group_id}) with ${exercises.length} exercises`);
    });
    
    // Log the final context structure
    console.log('📚 Final Exercise Context Structure:', context);
    
    // Validate context has data
    const muscleGroupCount = Object.keys(context).length;
    const totalExercises = Object.values(context).reduce((sum: number, group: any) => sum + group.exercises.length, 0);
    
    console.log(`📊 Context Summary: ${muscleGroupCount} muscle groups, ${totalExercises} total exercises`);
    
    if (muscleGroupCount === 0) {
      console.error('❌ No valid exercise context created! This will cause OpenAI to fail.');
    }
    
    return context;
  };

  const validateOpenAIResponse = (response: any, context: any): { isValid: boolean; validSets: WorkoutSetFormData[]; errors: string[] } => {
    const errors: string[] = [];
    const validSets: WorkoutSetFormData[] = [];
    
    if (!response.workoutSets || !Array.isArray(response.workoutSets)) {
      errors.push('Response missing workoutSets array');
      return { isValid: false, validSets: [], errors };
    }
    
    response.workoutSets.forEach((set: any, index: number) => {
      // Check if muscle_group_id exists in context
      const muscleGroupExists = Object.values(context).some((group: any) => 
        group.muscle_group_id === set.muscle_group_id
      );
      
      if (!muscleGroupExists) {
        errors.push(`Set ${index + 1}: Invalid muscle_group_id ${set.muscle_group_id}`);
        return;
      }
      
      // Find the muscle group
      const muscleGroup = Object.values(context).find((group: any) => 
        group.muscle_group_id === set.muscle_group_id
      ) as any;
      
      // Check if exercise_id exists in that muscle group
      const exerciseExists = muscleGroup?.exercises?.some((ex: any) => 
        ex.id === set.exercise_id
      );
      
      if (!exerciseExists) {
        errors.push(`Set ${index + 1}: Invalid exercise_id ${set.exercise_id} for muscle_group_id ${set.muscle_group_id}`);
        return;
      }
      
      // Validate other fields
      if (typeof set.weight !== 'number' || set.weight < 0) {
        errors.push(`Set ${index + 1}: Invalid weight ${set.weight}`);
        return;
      }
      
      if (typeof set.number_of_reps !== 'number' || set.number_of_reps < 1) {
        errors.push(`Set ${index + 1}: Invalid reps ${set.number_of_reps}`);
        return;
      }
      
      // If all validations pass, add to valid sets
      validSets.push(set);
    });
    
    return {
      isValid: errors.length === 0,
      validSets,
      errors
    };
  };

  const simpleVoiceProcessing = async (voiceText: string, exerciseContext: any): Promise<WorkoutSetFormData[]> => {
    const sets: WorkoutSetFormData[] = [];
    const words = voiceText.toLowerCase().split(' ');
    
    let currentWeight = 0;
    let currentReps = 10; // Default to 10 reps
    let currentMuscleGroup = 0;
    let currentExercise = 0;
    let setCount = 1;
    
    // Look for set count indicators
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (word === 'sets' || word === 'set') {
        if (i > 0 && /^\d+$/.test(words[i - 1])) {
          setCount = parseInt(words[i - 1]);
        }
      }
    }
    
    // Look for weight (numbers followed by lbs/pounds)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (/^\d+$/.test(word) && (words[i + 1]?.includes('lb') || words[i + 1]?.includes('pound'))) {
        currentWeight = parseInt(word);
        break;
      }
    }
    
    // Look for reps (numbers followed by reps)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (/^\d+$/.test(word) && words[i + 1]?.includes('rep')) {
        currentReps = parseInt(word);
        break;
      }
    }
    
    // Look for muscle groups and exercises using the new clean structure
    for (const [muscleGroupName, groupData] of Object.entries(exerciseContext)) {
      if (voiceText.toLowerCase().includes(muscleGroupName)) {
        currentMuscleGroup = (groupData as any).muscle_group_id;
        
        // Find matching exercise by name
        for (const exercise of (groupData as any).exercises) {
          if (voiceText.toLowerCase().includes(exercise.name)) {
            currentExercise = exercise.id;
            break;
          }
        }
        
        if (currentExercise === 0 && (groupData as any).exercises.length > 0) {
          // Use first exercise if no specific match found
          currentExercise = (groupData as any).exercises[0].id;
        }
        
        break;
      }
    }
    
    // If we found all the data, create sets
    if (currentMuscleGroup > 0 && currentExercise > 0) {
      for (let i = 0; i < setCount; i++) {
        sets.push({
          muscle_group_id: currentMuscleGroup,
          exercise_id: currentExercise,
          weight: currentWeight,
          number_of_reps: currentReps
        });
      }
    }
    
    // If no sets were created, create a default one
    if (sets.length === 0 && exerciseGroups.length > 0) {
      const firstGroup = exerciseGroups[0];
      if (firstGroup.exercises.length > 0) {
        sets.push({
          muscle_group_id: firstGroup.muscle_group_id,
          exercise_id: firstGroup.exercises[0].id,
          weight: 0,
          number_of_reps: 10
        });
      }
    }
    
    return sets;
  };

  // Manual Form Functions
  const addSet = () => {
    if (exerciseGroups.length > 0 && exerciseGroups[0].exercises.length > 0) {
      setWorkoutSets(prev => [...prev, {
        muscle_group_id: exerciseGroups[0].muscle_group_id,
        exercise_id: exerciseGroups[0].exercises[0].id,
        weight: 0,
        number_of_reps: 10
      }]);
    }
  };

  const removeSet = (index: number) => {
    if (workoutSets.length > 1) {
      setWorkoutSets(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof WorkoutSetFormData, value: any) => {
    setWorkoutSets(prev => prev.map((set, i) => {
      if (i === index) {
        const updatedSet = { ...set, [field]: value };
        
        // If muscle group changed, reset exercise to first available
        if (field === 'muscle_group_id') {
          const selectedGroup = exerciseGroups.find(g => g.muscle_group_id === value);
          if (selectedGroup && selectedGroup.exercises.length > 0) {
            updatedSet.exercise_id = selectedGroup.exercises[0].id;
          }
        }
        
        return updatedSet;
      }
      return set;
    }));
  };

  const getAvailableExercises = (muscleGroupId: number) => {
    const group = exerciseGroups.find(g => g.muscle_group_id === muscleGroupId);
    return group ? group.exercises : [];
  };

  const handleSave = async () => {
    try {
      // Validate all sets and filter out invalid ones
      const validSets = workoutSets.filter(set => {
        // Check if muscle_group_id exists
        const validMuscleGroup = exerciseGroups.some(g => g.muscle_group_id === set.muscle_group_id);
        if (!validMuscleGroup) {
          console.warn('Invalid muscle_group_id:', set.muscle_group_id);
          return false;
        }
        
        // Check if exercise_id exists in the selected muscle group
        const muscleGroup = exerciseGroups.find(g => g.muscle_group_id === set.muscle_group_id);
        const validExercise = muscleGroup?.exercises.some(e => e.id === set.exercise_id);
        if (!validExercise) {
          console.warn('Invalid exercise_id:', set.exercise_id, 'for muscle_group_id:', set.muscle_group_id);
          return false;
        }
        
        // Check if reps are valid
        return set.number_of_reps > 0;
      });

      if (validSets.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in at least one complete set with valid muscle group and exercise',
          variant: 'destructive'
        });
        return;
      }

      // Show warning if some sets were filtered out
      if (validSets.length < workoutSets.length) {
        const filteredCount = workoutSets.length - validSets.length;
        toast({
          title: 'Warning',
          description: `${filteredCount} invalid workout set(s) were removed before saving.`,
          variant: 'default'
        });
      }

      await onSave(validSets);
      onClose();
      
      toast({
        title: 'Success',
        description: `${validSets.length} workout set(s) added successfully!`,
      });
      
    } catch (error) {
      console.error('Error saving workout sets:', error);
      toast({
        title: 'Error',
        description: 'Failed to save workout sets',
        variant: 'destructive'
      });
    }
  };

  const isFormValid = workoutSets.some(set => 
    set.muscle_group_id > 0 && 
    set.exercise_id > 0 && 
    set.number_of_reps > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Add Workout Sets - {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Compact Voice Input Section */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Voice Input</h3>
              
              <div className="flex items-center justify-center gap-4 mb-3">
                <Button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isProcessing}
                  className={`w-16 h-16 rounded-full ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  } text-white shadow-lg hover:shadow-xl transition-all duration-300`}
                >
                  {isRecording ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                
                {isRecording && (
                  <div className="text-sm font-medium text-purple-600">
                    Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                )}
                
                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing voice input...
                  </div>
                )}
              </div>
              
              {errorMessage && (
                <div className="text-red-600 text-xs mb-2">
                  {errorMessage}
                </div>
              )}
              
              {transcript && (
                <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                  "{transcript}"
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Form Section */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Workout Sets</h3>
              <p className="text-sm text-gray-600 mt-1">Configure your workout sets below</p>
            </div>

            <div className="space-y-4">
              {workoutSets.map((set, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">Set {index + 1}</h4>
                    {workoutSets.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSet(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Muscle Group Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Muscle Group</label>
                      <select
                        value={set.muscle_group_id}
                        onChange={(e) => updateSet(index, 'muscle_group_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value={0}>Select Muscle Group</option>
                        {exerciseGroups.map(group => (
                          <option key={group.muscle_group_id} value={group.muscle_group_id}>
                            {group.muscle_group_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Exercise Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Exercise</label>
                      <select
                        value={set.exercise_id}
                        onChange={(e) => updateSet(index, 'exercise_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={set.muscle_group_id === 0}
                      >
                        <option value={0}>Select Exercise</option>
                        {getAvailableExercises(set.muscle_group_id).map(exercise => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.exercise_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Weight Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Weight (lbs)</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    
                    {/* Reps Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Reps</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={set.number_of_reps || ''}
                        onChange={(e) => updateSet(index, 'number_of_reps', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Set Button - Now at the bottom for easy access */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSet}
                  className="w-full border-2 border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 py-4 transition-all duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Another Set
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Click to add more workout sets to your routine
                </p>
              </div>
            </div>
          </div>
          
          {/* Fixed Action Buttons */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50/50">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!isFormValid}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Sets
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddSetsModal; 