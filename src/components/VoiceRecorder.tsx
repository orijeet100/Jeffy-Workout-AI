import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Workout, ExerciseSet, LLMResponse } from '@/types/workout';
import VoiceRecordingControls from './VoiceRecordingControls';
import ExerciseSetForm from './ExerciseSetForm';
import { supabase } from '@/integrations/client';
import { WorkoutSet } from '@/pages/Dashboard';

interface VoiceRecorderProps {
  selectedDate: Date;
  onSave: (sets: { exerciseName: string; muscleGroup: string; weight: number; reps: number; }[]) => Promise<void>;
  onClose: () => void;
  userId: string;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ selectedDate = new Date(), onSave, onClose, userId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const recognition = useRef<any>(null);

  // OpenAI API configuration - Use import.meta.env for Vite
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here';
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  // Valid muscle groups for mapping
  const VALID_MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Biceps', 'Triceps', 'Shoulders', 'Abs'];

  // Add this line to detect browser support for speech recognition
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';
      
      recognition.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all results to get the complete transcript
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Only show final results + current interim
        setTranscript(finalTranscript + (interimTranscript ? interimTranscript : ''));
      };
      
      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          return;
        }
        setErrorMessage(`Speech recognition error: ${event.error}`);
      };
      
      recognition.current.onstart = () => {
        setIsTranscribing(true);
        setTranscript('');
      };
      
      recognition.current.onend = () => {
        setIsTranscribing(false);
      };
    }
    
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  const createEmptySet = (): ExerciseSet => ({
    id: crypto.randomUUID(),
    exerciseName: '',
    muscleGroup: '',
    weight: 0,
    reps: 0
  });

  const addNewSet = () => {
    setExerciseSets(prev => Array.isArray(prev) ? [...prev, createEmptySet()] : [createEmptySet()]);
  };

  const updateSet = (id: string, field: keyof ExerciseSet, value: string | number) => {
    setExerciseSets(prev => Array.isArray(prev) ? prev.map(set => set.id === id ? { ...set, [field]: value } : set) : []);
  };

  const deleteSet = (id: string) => {
    setExerciseSets(prev => Array.isArray(prev) ? prev.filter(set => set.id !== id) : []);
  };

  const detectSilence = (stream: MediaStream) => {
    try {
      audioContext.current = new AudioContext();
      analyser.current = audioContext.current.createAnalyser();
      microphone.current = audioContext.current.createMediaStreamSource(stream);
      
      microphone.current.connect(analyser.current);
      analyser.current.fftSize = 512;
      
      const bufferLength = analyser.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudioLevel = () => {
        if (!analyser.current) return;
        
        analyser.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        
        if (average < 20) {
          if (!silenceTimeout.current) {
            silenceTimeout.current = setTimeout(() => {
              if (isRecording) {
                stopRecording();
                toast({
                  title: "Recording Stopped",
                  description: "No voice detected for 4 seconds.",
                });
              }
            }, 4000);
          }
        } else {
          if (silenceTimeout.current) {
            clearTimeout(silenceTimeout.current);
            silenceTimeout.current = null;
          }
        }
        
        if (isRecording) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      checkAudioLevel();
    } catch (error) {
      console.error('Audio context error:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      
      const chunks: Blob[] = [];
      mediaRecorder.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.current.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.current) {
          audioContext.current.close();
        }
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setErrorMessage('');
      setTranscript('');
      
      // Start speech recognition
      if (recognition.current) {
        try {
          recognition.current.start();
        } catch (error) {
          console.error('Speech recognition start error:', error);
        }
      }
      
      // Start silence detection
      detectSilence(stream);
      
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly. Recording will auto-stop after 4 seconds of silence.",
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
        silenceTimeout.current = null;
      }
      
      // Stop speech recognition
      if (recognition.current && isTranscribing) {
        try {
          recognition.current.stop();
        } catch (error) {
          console.error('Speech recognition stop error:', error);
        }
      }
      
      toast({
        title: "Recording Stopped",
        description: "Processing your voice input...",
      });
      
      // Wait a bit for final speech recognition results
      setTimeout(() => {
        processWorkoutWithOpenAI();
      }, 1000);
    }
  };

  const processWorkoutWithOpenAI = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    
    if (!transcript.trim()) {
      setErrorMessage('No speech detected. Please try recording again.');
      setIsProcessing(false);
      return;
    }

    try {
      // Fetch user's exercise knowledge
      if (!userId) return;
      const { data: knowledgeRow } = await supabase
        .from('exercise_knowledge')
        .select('data')
        .eq('user_id', userId)
        .single();
      const userKnowledge = knowledgeRow?.data;

      const prompt = `You are a fitness AI assistant. Your job is to extract structured workout data from the following transcript, using ONLY the user's exercise knowledge base below.

**User's Exercise Knowledge Base:**
${JSON.stringify(userKnowledge, null, 2)}

**IMPORTANT:**
- Only use these fields for each set:
  - "exerciseName": string, e.g., Bench Press
  - "muscleGroup": string, e.g., Chest
  - "weight": number, e.g., 185 (no units, no text, just a number)
  - "reps": number, e.g., 8 (just a number)
- Only use muscle groups and exercises from the user's knowledge base above. Do not invent or suggest any others.
- If any field is missing, make a reasonable guess or use 0 for weight if unknown and 10 for reps if unknown.
- Return only valid JSON, no markdown, no extra text.

**EXAMPLE OUTPUT:**
{
  "success": true,
  "exerciseCount": 2,
  "sets": [
    {
      "id": "1",
      "exerciseName": "Bench Press",
      "muscleGroup": "Chest",
      "weight": 185,
      "reps": 8
    },
    {
      "id": "2",
      "exerciseName": "Push-ups",
      "muscleGroup": "Chest",
      "weight": 0,
      "reps": 15
    }
  ]
}

If you cannot extract any valid workout data, return:
{
  "success": false,
  "exerciseCount": 0,
  "error": "Brief explanation of why extraction failed"
}

**TRANSCRIPT TO ANALYZE:**
"${transcript}"

Return only valid JSON matching the example structure above.`;

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a fitness AI that extracts workout data from speech. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const workoutData = JSON.parse(content);
      
      // Validate the response structure
      if (workoutData.success && workoutData.sets && Array.isArray(workoutData.sets)) {
        // Add unique IDs if missing and validate muscle groups
        const validatedSets = workoutData.sets.map((set: any) => ({
          id: set.id || crypto.randomUUID(),
          exerciseName: set.exerciseName || 'Unknown Exercise',
          muscleGroup: VALID_MUSCLE_GROUPS.includes(set.muscleGroup) ? set.muscleGroup : 'Chest',
          weight: typeof set.weight === 'number' ? set.weight : Number(String(set.weight).replace(/[^\d.]/g, '')) || 0,
          reps: typeof set.reps === 'number' ? set.reps : Number(String(set.reps).replace(/[^\d.]/g, '')) || 0
        }));

        setExerciseSets(Array.isArray(validatedSets) ? validatedSets : [createEmptySet()]);
        toast({
          title: "AI Analysis Complete!",
          description: `Extracted ${validatedSets.length} exercise sets from your workout.`,
        });
      } else {
        throw new Error(workoutData.error || 'Invalid response format from AI');
      }
    } catch (error) {
      console.error('OpenAI processing error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process workout data');
      toast({
        title: "Processing Error",
        description: "Could not analyze your workout. Please try again or add exercises manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    const validSets = exerciseSets.filter(set =>
      set.exerciseName.trim() &&
      set.muscleGroup.trim() &&
      typeof set.weight === 'number' && set.weight >= 0 &&
      typeof set.reps === 'number' && set.reps > 0
    );

    if (validSets.length === 0) {
      toast({
        title: "Invalid Sets",
        description: "Please fill in all required fields for at least one set.",
        variant: "destructive",
      });
      return;
    }

    await onSave(validSets.map(({ exerciseName, muscleGroup, weight, reps }) => ({ exerciseName, muscleGroup, weight, reps })));

    toast({
      title: "Sets Saved!",
      description: "Your sets have been saved.",
    });

    onClose();
  };

  // Single initialization effect
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      setIsReady(false);
      if (!userId) {
        setExerciseSets([createEmptySet()]);
        setIsReady(true);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('exercise_knowledge')
          .select('data')
          .eq('user_id', userId)
          .single();
        if (error && error.code !== 'PGRST116') {
          setError('Failed to load your exercise knowledge.');
          setExerciseSets([createEmptySet()]);
        } else if (data && Array.isArray(data.data) && data.data.length > 0) {
          setExerciseSets(data.data);
        } else {
          // Insert default for new user
          await supabase.from('exercise_knowledge').insert({
            user_id: userId,
            data: [createEmptySet()],
          });
          setExerciseSets([createEmptySet()]);
        }
      } catch (e) {
        setError('Failed to initialize exercise sets.');
        setExerciseSets([createEmptySet()]);
      }
      if (isMounted) {
        setIsReady(true);
        setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [userId]);

  useEffect(() => {
    const savedWorkouts = localStorage.getItem('workouts');
    if (savedWorkouts) {
      try {
        const parsed = JSON.parse(savedWorkouts);
        setWorkouts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setWorkouts([]);
      }
    }
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-lg text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!userId) {
    return <div className="text-center py-10 text-lg">Loading user session...</div>;
  }

  if (loading) {
    return <div className="text-center py-10 text-lg">Loading your exercise knowledge...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-lg text-red-600">{error}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Add Workout</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-purple-100 text-sm">
            {selectedDate ? format(selectedDate, "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy")}
          </p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <VoiceRecordingControls
              isRecording={isRecording}
              isProcessing={isProcessing}
              recordingTime={recordingTime}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              errorMessage={errorMessage}
            />
            {!isRecording && (
              <span className="mt-2 text-sm text-gray-500 text-center max-w-xs">
                Speak about the exercises after pressing this button and press stop when done.
              </span>
            )}
          </div>
          <ExerciseSetForm
            exerciseSets={Array.isArray(exerciseSets) ? exerciseSets : []}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onAddNewSet={addNewSet}
          />
          {/* Speech Recognition Status */}
          {!isSpeechRecognitionSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                Speech recognition not supported in this browser. Voice recording will work but text won't be transcribed.
              </p>
            </div>
          )}

          {/* API Key Warning */}
          {OPENAI_API_KEY === 'your-api-key-here' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                Please set your OpenAI API key in the environment variable VITE_OPENAI_API_KEY
              </p>
            </div>
          )}

          {/* Transcript Display */}
          {isTranscribing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">
                Transcribing...
              </h4>
              <p className="text-blue-700 text-sm whitespace-pre-wrap">
                Listening...
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={isProcessing}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Workout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceRecorder;