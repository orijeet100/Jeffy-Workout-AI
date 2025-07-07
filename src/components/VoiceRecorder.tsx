
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Workout, ExerciseSet } from '@/types/workout';
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
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
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

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      setErrorMessage('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.');
      setIsProcessing(false);
      return;
    }

    try {
      const systemPrompt = `You are a fitness assistant that parses workout transcripts into structured data. 

Available muscle groups: ${VALID_MUSCLE_GROUPS.join(', ')}

Parse the following workout transcript and return a JSON object with this exact structure:
{
  "exercises": [
    {
      "name": "exercise name",
      "muscleGroup": "muscle group from the list above",
      "sets": [
        {
          "weight": number or null,
          "reps": number or null,
          "duration_seconds": number or null,
          "notes": "any additional notes"
        }
      ]
    }
  ]
}

Rules:
1. Use only muscle groups from the provided list
2. Extract weight, reps, and duration information accurately
3. For time-based exercises (like planks), use duration_seconds instead of reps
4. Include any relevant notes or form cues mentioned
5. Return only valid JSON, no additional text

Example transcript: "I did 3 sets of bench press, first set 135 pounds for 8 reps, second set 140 pounds for 6 reps, third set 145 pounds for 4 reps"

Example output:
{
  "exercises": [
    {
      "name": "Bench Press",
      "muscleGroup": "Chest",
      "sets": [
        {"weight": 135, "reps": 8, "duration_seconds": null, "notes": ""},
        {"weight": 140, "reps": 6, "duration_seconds": null, "notes": ""},
        {"weight": 145, "reps": 4, "duration_seconds": null, "notes": ""}
      ]
    }
  ]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `Parse this workout transcript: "${transcript}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const parsedContent = data.choices[0]?.message?.content;

      if (!parsedContent) {
        throw new Error('No response from OpenAI');
      }

      try {
        const workoutData = JSON.parse(parsedContent);
        
        if (workoutData.exercises && Array.isArray(workoutData.exercises)) {
          // Convert parsed exercises to exercise sets format
          const exerciseSets = workoutData.exercises.map((exercise: any) => 
            exercise.sets.map((set: any, index: number) => ({
              id: crypto.randomUUID(),
              exerciseName: exercise.name,
              muscleGroup: VALID_MUSCLE_GROUPS.includes(exercise.muscleGroup) ? exercise.muscleGroup : 'Chest',
              weight: set.weight ? `${set.weight} lbs` : '',
              reps: typeof set.reps === 'number' ? set.reps : 0,
              duration_seconds: set.duration_seconds,
              notes: set.notes || ''
            }))
          ).flat();

          setExerciseSets(exerciseSets);
          toast({
            title: "AI Analysis Complete!",
            description: `Extracted ${exerciseSets.length} exercise sets from your workout.`,
          });
        } else {
          throw new Error('Invalid response format from OpenAI');
        }
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        setErrorMessage('Failed to parse AI response. Please try again or add exercises manually.');
        toast({
          title: "Processing Error",
          description: "Could not analyze your workout. Please add exercises manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('OpenAI processing error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process workout data');
      toast({
        title: "Processing Error",
        description: "Could not analyze your workout. Please check your API key or add exercises manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWorkoutParsed = (workoutData: any) => {
    if (workoutData && workoutData.exercises && Array.isArray(workoutData.exercises)) {
      const exerciseSets = workoutData.exercises.map((exercise: any) => 
        exercise.sets.map((set: any) => ({
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

          {/* API Key Status */}
          {!import.meta.env.VITE_OPENAI_API_KEY && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your environment variables.
              </p>
            </div>
          )}

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
