import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save, Mic, MicOff, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { WorkoutSetFormData } from '@/types/workout';
import VoiceRecordingControls from './VoiceRecordingControls';
import { DatabaseService } from '@/services/databaseService';
import { transcribeAudio } from '../../api/deepgram-transcribe';
import { parseWorkoutWithOpenAI } from '../../api/openai-parse-workout';

interface VoiceRecorderProps {
  selectedDate: Date;
  onSave: (sets: WorkoutSetFormData[]) => Promise<void>;
  onClose: () => void;
  userId: string;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  selectedDate, 
  onSave, 
  onClose, 
  userId 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedSets, setProcessedSets] = useState<WorkoutSetFormData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load exercise library on component mount
  useEffect(() => {
    const loadExerciseLibrary = async () => {
      try {
        const exerciseGroups = await DatabaseService.getExerciseGroups(userId);
        setExerciseLibrary(exerciseGroups);
      } catch (error) {
        // Handle load error silently
        toast({
          title: 'Error',
          description: 'Failed to load exercise library',
          variant: 'destructive',
        });
      }
    };

    loadExerciseLibrary();
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
      // Handle recording error silently
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
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
      setProcessedSets(extractedSets);
      setShowForm(true);
      
    } catch (error) {
      // Handle processing error silently
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const processTranscriptWithOpenAI = async (transcriptText: string): Promise<WorkoutSetFormData[]> => {
    try {
      // Create exercise context for OpenAI
      const exerciseContext = createExerciseContext();
      
      // Call OpenAI API
      const openaiResponse = await parseWorkoutWithOpenAI(transcriptText, exerciseContext);
      
      if (!openaiResponse.workoutSets || !Array.isArray(openaiResponse.workoutSets)) {
        throw new Error('Invalid response from OpenAI');
      }
      
      return openaiResponse.workoutSets;
      
    } catch (error) {
      // Handle OpenAI processing error silently
      setErrorMessage('Failed to process workout with AI. Please try again.');
      // Fallback to simple processing if OpenAI fails
      return await simpleVoiceProcessing(transcriptText, createExerciseContext());
    }
  };

  const createExerciseContext = () => {
    const context: any = {};
    
    exerciseLibrary.forEach(group => {
      context[group.muscle_group_name.toLowerCase()] = {
        muscle_group_id: group.muscle_group_id,
        exercises: group.exercises.map((ex: any) => ({
          id: ex.id,
          name: ex.exercise_name.toLowerCase(),
          aliases: generateExerciseAliases(ex.exercise_name)
        }))
      };
    });
    
    return context;
  };

  const generateExerciseAliases = (exerciseName: string) => {
    const aliases = [exerciseName.toLowerCase()];
    
    // Common exercise variations
    if (exerciseName.toLowerCase().includes('bench press')) {
      aliases.push('bench', 'chest press', 'flat bench');
    } else if (exerciseName.toLowerCase().includes('push up')) {
      aliases.push('pushup', 'push-ups', 'push ups');
    } else if (exerciseName.toLowerCase().includes('pull up')) {
      aliases.push('pullup', 'pull-ups', 'pull ups');
    } else if (exerciseName.toLowerCase().includes('squat')) {
      aliases.push('squats');
    } else if (exerciseName.toLowerCase().includes('deadlift')) {
      aliases.push('dead lift', 'dead lifts');
    }
    
    return aliases;
  };

  const simpleVoiceProcessing = async (voiceText: string, exerciseContext: any): Promise<WorkoutSetFormData[]> => {
    const sets: WorkoutSetFormData[] = [];
    const words = voiceText.toLowerCase().split(' ');
    
    let currentWeight = 0;
    let currentReps = 0;
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
    
    // Look for muscle groups and exercises
    for (const [muscleGroupName, groupData] of Object.entries(exerciseContext)) {
      if (voiceText.toLowerCase().includes(muscleGroupName)) {
        currentMuscleGroup = (groupData as any).muscle_group_id;
        
        // Find matching exercise
        for (const exercise of (groupData as any).exercises) {
          if (exercise.aliases.some((alias: string) => voiceText.toLowerCase().includes(alias))) {
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
    if (sets.length === 0 && exerciseLibrary.length > 0) {
      const firstGroup = exerciseLibrary[0];
      if (firstGroup.exercises.length > 0) {
        sets.push({
          muscle_group_id: firstGroup.muscle_group_id,
          exercise_id: firstGroup.exercises[0].id,
          weight: 0,
          number_of_reps: 0
        });
      }
    }
    
    return sets;
  };

  const handleSave = async () => {
    try {
      await onSave(processedSets);
      onClose();
      
      toast({
        title: 'Success',
        description: `${processedSets.length} workout set(s) added successfully!`,
      });
    } catch (error) {
      // Handle save error silently
      toast({
        title: 'Error',
        description: 'Failed to save workout sets',
        variant: 'destructive',
      });
    }
  };

  const updateSet = (index: number, field: keyof WorkoutSetFormData, value: any) => {
    setProcessedSets(prev => prev.map((set, i) => 
      i === index ? { ...set, [field]: value } : set
    ));
  };

  const addSet = () => {
    if (processedSets.length > 0) {
      const firstSet = processedSets[0];
      setProcessedSets(prev => [...prev, {
        muscle_group_id: firstSet.muscle_group_id,
        exercise_id: firstSet.exercise_id,
        weight: 0,
        number_of_reps: 0
      }]);
    }
  };

  const removeSet = (index: number) => {
    if (processedSets.length > 1) {
      setProcessedSets(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (showForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Review & Edit Workout Sets
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Voice Input:</h4>
              <p className="text-blue-700">{transcript || 'No voice input detected'}</p>
            </div>
            
            {processedSets.map((set, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700">Set {index + 1}</h4>
                  {processedSets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSet(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Weight (lbs)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={set.weight || ''}
                      onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Reps</label>
                    <input
                      type="number"
                      min="1"
                      value={set.number_of_reps || ''}
                      onChange={(e) => updateSet(index, 'number_of_reps', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addSet}
              className="w-full border-dashed border-2 border-gray-300 hover:border-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Set
            </Button>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Back to Voice Input
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Sets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Voice Workout Input
          </CardTitle>
          <p className="text-gray-600">
            Speak your workout naturally and let AI process it
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="mb-4">
            <VoiceRecordingControls
              isRecording={isRecording}
              isProcessing={isProcessing}
              recordingTime={recordingTime}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              errorMessage={errorMessage}
            />
            </div>
            
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-purple-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing voice input...
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceRecorder;