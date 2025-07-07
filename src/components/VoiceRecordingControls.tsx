
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useExerciseKnowledge } from '@/hooks/useExerciseKnowledge';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecordingControlsProps {
  onWorkoutParsed: (workoutData: any) => void;
}

export const VoiceRecordingControls: React.FC<VoiceRecordingControlsProps> = ({ onWorkoutParsed }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const { exercises } = useExerciseKnowledge();

  useEffect(() => {
    // Initialize speech recognition if available
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionClass) {
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Permission Required",
            description: "Please allow microphone access to use voice recording.",
            variant: "destructive"
          });
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscript('');
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      toast({
        title: "Recording Started",
        description: "Speak your workout details clearly.",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      toast({
        title: "Recording Stopped",
        description: "Processing your workout...",
      });
    }
  };

  const playRecording = () => {
    if (audioUrl && !isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const parseWorkout = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Transcript",
        description: "Please record your workout first or the speech recognition didn't capture anything.",
        variant: "destructive"
      });
      return;
    }

    setIsParsing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-workout', {
        body: {
          transcript: transcript.trim(),
          exerciseKnowledge: exercises
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast({
          title: "Parsing Error",
          description: "Failed to parse workout. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data && data.exercises && data.exercises.length > 0) {
        onWorkoutParsed(data);
        toast({
          title: "Workout Parsed Successfully",
          description: `Found ${data.exercises.length} exercise(s) in your recording.`,
        });
        
        // Clear the recording after successful parsing
        setAudioUrl(null);
        setTranscript('');
      } else {
        toast({
          title: "No Exercises Found",
          description: "Couldn't identify any exercises in your recording. Please try again with clearer speech.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error parsing workout:', error);
      toast({
        title: "Parsing Error",
        description: "An unexpected error occurred while parsing your workout.",
        variant: "destructive"
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Voice Recording</h3>
      
      <div className="flex gap-2 mb-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Recording
          </Button>
        )}
        
        {audioUrl && !isRecording && (
          <>
            {!isPlaying ? (
              <Button
                onClick={playRecording}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Play
              </Button>
            ) : (
              <Button
                onClick={pausePlayback}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            
            <Button
              onClick={parseWorkout}
              disabled={isParsing}
              className="flex items-center gap-2"
              size="sm"
            >
              {isParsing ? 'Parsing...' : 'Parse Workout'}
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm">Recording in progress...</span>
        </div>
      )}

      {transcript && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Transcript:</p>
          <p className="text-sm text-gray-600">{transcript}</p>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-2">
        Speak clearly about your workout: "I did 3 sets of bench press, first set 135 pounds for 8 reps..."
      </p>
    </div>
  );
};
