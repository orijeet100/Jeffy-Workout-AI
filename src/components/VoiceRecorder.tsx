
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Workout, ExerciseSet, LLMResponse } from '@/types/workout';
import VoiceRecordingControls from './VoiceRecordingControls';
import ExerciseSetForm from './ExerciseSetForm';

interface VoiceRecorderProps {
  selectedDate: Date;
  onSave: (workout: Omit<Workout, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ selectedDate, onSave, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
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
    };
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
    audioContext.current = new AudioContext();
    analyser.current = audioContext.current.createAnalyser();
    microphone.current = audioContext.current.createMediaStreamSource(stream);
    
    microphone.current.connect(analyser.current);
    analyser.current.fftSize = 512;
    
    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      analyser.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (average < 20) { // Very low audio level threshold
        if (!silenceTimeout.current) {
          silenceTimeout.current = setTimeout(() => {
            if (isRecording) {
              stopRecording();
              toast({
                title: "Recording Stopped",
                description: "No voice detected for 4 seconds.",
              });
            }
          }, 4000); // 4 seconds of silence
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
      
      // Start silence detection
      detectSilence(stream);
      
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Voice will auto-stop after 4 seconds of silence.",
      });
    } catch (error) {
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
      toast({
        title: "Recording Stopped",
        description: "Processing your voice input...",
      });
      simulateLLMProcessing();
    }
  };

  const simulateLLMProcessing = () => {
    setIsProcessing(true);
    setErrorMessage('');
    
    setTimeout(() => {
      const mockResponse: LLMResponse = Math.random() > 0.2 ? {
        success: true,
        sets: [
          {
            id: crypto.randomUUID(),
            exerciseName: "Bench Press",
            muscleGroup: "Chest",
            weight: "185 lbs",
            reps: 8
          },
          {
            id: crypto.randomUUID(),
            exerciseName: "Bench Press",
            muscleGroup: "Chest",
            weight: "185 lbs",
            reps: 6
          },
          {
            id: crypto.randomUUID(),
            exerciseName: "Shoulder Press",
            muscleGroup: "Shoulders",
            weight: "65 lbs",
            reps: 10
          }
        ]
      } : {
        success: false,
        error: "Could not understand the workout details. Please try again with clearer instructions."
      };

      if (mockResponse.success && mockResponse.sets) {
        setExerciseSets(mockResponse.sets);
        toast({
          title: "AI Analysis Complete!",
          description: `Extracted ${mockResponse.sets.length} exercise sets.`,
        });
      } else {
        setErrorMessage(mockResponse.error || "Enter Valid query");
        toast({
          title: "Processing Error",
          description: mockResponse.error || "Enter Valid query",
          variant: "destructive",
        });
      }
      
      setIsProcessing(false);
    }, 2000);
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
      date: format(selectedDate, 'yyyy-MM-dd'),
      title: `Workout - ${format(selectedDate, 'MMM dd')}`,
      exerciseSets: validSets,
    };

    onSave(workout);
  };

  // Initialize with one empty set if none exist
  useEffect(() => {
    if (exerciseSets.length === 0) {
      addNewSet();
    }
  }, []);

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
            {format(selectedDate, "MMM dd, yyyy")}
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
          />

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
