import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Workout, ExerciseSet, LLMResponse } from '@/types/workout';
import { VoiceRecordingControls } from './VoiceRecordingControls';
import ExerciseSetForm from './ExerciseSetForm';

interface VoiceRecorderProps {
  selectedDate: Date;
  onSave: (workout: Omit<Workout, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ selectedDate = new Date(), onSave, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const recognition = useRef<any>(null);

  // Proxy API configuration - Use your local proxy instead of direct OpenAI
  const PROXY_API_URL = 'http://localhost:3001/api/process-workout'; // Replace with your proxy URL
  
  // Valid muscle groups for mapping
  const VALID_MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Biceps', 'Triceps', 'Shoulders', 'Abs'];

  // Check if speech recognition is supported
  const isSpeechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

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

  // Initialize with one empty set if none exist
  useEffect(() => {
    if (exerciseSets.length === 0) {
      addNewSet();
    }
  }, []);

  const createEmptySet = (): ExerciseSet => ({
    id: crypto.randomUUID(),
    exerciseName: '',
    muscleGroup: '',
    weight: '',
    reps: 0
  });

  const addNewSet = () => {
    setExerciseSets(prev => [...prev, createEmptySet()]);
  };

  const updateSet = (id: string, field: keyof ExerciseSet, value: string | number) => {
    setExerciseSets(prev => prev.map(set => 
      set.id === id ? { ...set, [field]: value } : set
    ));
  };

  const deleteSet = (id: string) => {
    setExerciseSets(prev => prev.filter(set => set.id !== id));
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
        processWorkoutWithProxyAPI();
      }, 1000);
    }
  };

  const processWorkoutWithProxyAPI = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    
    if (!transcript.trim()) {
      setErrorMessage('No speech detected. Please try recording again.');
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch(PROXY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          validMuscleGroups: VALID_MUSCLE_GROUPS
        }),
      });

      if (!response.ok) {
        throw new Error(`Proxy API error: ${response.status}`);
      }

      const workoutData = await response.json();
      
      // Validate the response structure
      if (workoutData.success && workoutData.sets && Array.isArray(workoutData.sets)) {
        // Add unique IDs if missing and validate muscle groups
        const validatedSets = workoutData.sets.map((set: any) => ({
          id: set.id || crypto.randomUUID(),
          exerciseName: set.exerciseName || 'Unknown Exercise',
          muscleGroup: VALID_MUSCLE_GROUPS.includes(set.muscleGroup) ? set.muscleGroup : 'Chest',
          weight: set.weight || '0 lbs',
          reps: typeof set.reps === 'number' ? set.reps : 0
        }));

        setExerciseSets(validatedSets);
        toast({
          title: "AI Analysis Complete!",
          description: `Extracted ${validatedSets.length} exercise sets from your workout.`,
        });
      } else {
        throw new Error(workoutData.error || 'Invalid response format from proxy API');
      }
    } catch (error) {
      console.error('Proxy API processing error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process workout data');
      toast({
        title: "Processing Error",
        description: "Could not analyze your workout. Please check your proxy API or add exercises manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWorkoutParsed = (workoutData: any) => {
    if (workoutData && workoutData.exercises && Array.isArray(workoutData.exercises)) {
      // Convert parsed exercises to exercise sets format
      const exerciseSets = workoutData.exercises.map((exercise: any) => 
        exercise.sets.map((set: any, index: number) => ({
          id: crypto.randomUUID(),
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          weight: set.weight ? `${set.weight}` : '',
          reps: set.reps || 0,
          duration_seconds: set.duration_seconds,
          notes: set.notes || ''
        }))
      ).flat();

      setExerciseSets(exerciseSets);
      toast({
        title: "Workout Parsed Successfully",
        description: `Found ${exerciseSets.length} exercise set(s) in your recording.`,
      });
    }
  };

  const handleSave = () => {
    if (exerciseSets.length === 0) {
      toast({
        title: "No Exercise Sets",
        description: "Please add at least one exercise set.",
        variant: "destructive",
      });
      return;
    }

    const validSets = exerciseSets.filter(set => 
      set.exerciseName.trim() && set.muscleGroup.trim() && set.weight.trim() && set.reps > 0
    );

    if (validSets.length === 0) {
      toast({
        title: "Invalid Sets",
        description: "Please fill in all required fields for at least one set.",
        variant: "destructive",
      });
      return;
    }

    const workout = {
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      title: `Workout - ${selectedDate ? format(selectedDate, 'MMM dd') : format(new Date(), 'MMM dd')}`,
      exerciseSets: validSets,
    };

    onSave(workout);
  };

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
          <VoiceRecordingControls
            isRecording={isRecording}
            isProcessing={isProcessing}
            recordingTime={recordingTime}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            errorMessage={errorMessage}
            onWorkoutParsed={handleWorkoutParsed}
          />

          {/* Speech Recognition Status */}
          {!isSpeechRecognitionSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                Speech recognition not supported in this browser. Voice recording will work but text won't be transcribed.
              </p>
            </div>
          )}

          {/* Proxy API Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              Using proxy API for workout processing. Make sure your local proxy server is running at: {PROXY_API_URL}
            </p>
          </div>

          {/* Transcript Display */}
          {(transcript || isTranscribing) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">
                {isTranscribing ? "Transcribing..." : "What you said:"}
              </h4>
              <p className="text-blue-700 text-sm whitespace-pre-wrap">
                {transcript || (isTranscribing ? "Listening..." : "")}
              </p>
            </div>
          )}

          <ExerciseSetForm
            exerciseSets={exerciseSets}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onAddNewSet={addNewSet}
          />

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
