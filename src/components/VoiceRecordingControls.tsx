
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface VoiceRecordingControlsProps {
  onWorkoutParsed: (workoutData: any) => void;
  isRecording?: boolean;
  isProcessing?: boolean;
  recordingTime?: number;
  onStartRecording?: () => Promise<void>;
  onStopRecording?: () => void;
  errorMessage?: string;
}

export const VoiceRecordingControls: React.FC<VoiceRecordingControlsProps> = ({ 
  onWorkoutParsed,
  isRecording: externalIsRecording,
  isProcessing: externalIsProcessing,
  recordingTime: externalRecordingTime,
  onStartRecording: externalOnStartRecording,
  onStopRecording: externalOnStopRecording,
  errorMessage: externalErrorMessage
}) => {
  const [internalIsRecording, setInternalIsRecording] = useState(false);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalIsParsing, setInternalIsParsing] = useState(false);
  const [internalAudioUrl, setInternalAudioUrl] = useState<string | null>(null);
  const [internalTranscript, setInternalTranscript] = useState<string>('');
  
  // Use external props if provided, otherwise use internal state
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : internalIsRecording;
  const isProcessing = externalIsProcessing !== undefined ? externalIsProcessing : internalIsParsing;
  const recordingTime = externalRecordingTime || 0;
  const errorMessage = externalErrorMessage || '';
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition if available
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
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
          setInternalTranscript(prev => prev + ' ' + finalTranscript);
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
    if (externalOnStartRecording) {
      await externalOnStartRecording();
      return;
    }

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
        setInternalAudioUrl(url);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setInternalIsRecording(true);
      setInternalTranscript('');
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Speech recognition start error:', error);
        }
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
    if (externalOnStopRecording) {
      externalOnStopRecording();
      return;
    }

    if (mediaRecorderRef.current && internalIsRecording) {
      mediaRecorderRef.current.stop();
      setInternalIsRecording(false);
      
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Speech recognition stop error:', error);
        }
      }
      
      toast({
        title: "Recording Stopped",
        description: "Processing your workout...",
      });
    }
  };

  const playRecording = () => {
    if (internalAudioUrl && !internalIsPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      audioRef.current = new Audio(internalAudioUrl);
      audioRef.current.onended = () => setInternalIsPlaying(false);
      audioRef.current.play();
      setInternalIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setInternalIsPlaying(false);
    }
  };

  const parseWorkout = async () => {
    if (!internalTranscript.trim()) {
      toast({
        title: "No Transcript",
        description: "Please record your workout first or the speech recognition didn't capture anything.",
        variant: "destructive"
      });
      return;
    }

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.",
        variant: "destructive"
      });
      return;
    }

    setInternalIsParsing(true);
    
    try {
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
              content: 'You are a fitness assistant that parses workout transcripts into structured data. Parse the workout and return a JSON object with exercises array containing name, muscleGroup, and sets with weight, reps, duration_seconds, and notes.'
            },
            {
              role: 'user',
              content: `Parse this workout transcript: "${internalTranscript}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const parsedContent = data.choices[0]?.message?.content;

      if (!parsedContent) {
        throw new Error('No response from OpenAI');
      }

      try {
        const workoutData = JSON.parse(parsedContent);
        
        if (workoutData && workoutData.exercises && workoutData.exercises.length > 0) {
          onWorkoutParsed(workoutData);
          toast({
            title: "Workout Parsed Successfully",
            description: `Found ${workoutData.exercises.length} exercise(s) in your recording.`,
          });
          
          // Clear the recording after successful parsing
          setInternalAudioUrl(null);
          setInternalTranscript('');
        } else {
          toast({
            title: "No Exercises Found",
            description: "Couldn't identify any exercises in your recording. Please try again with clearer speech.",
            variant: "destructive"
          });
        }
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        toast({
          title: "Parsing Error",
          description: "Failed to parse AI response. Please try again.",
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
      setInternalIsParsing(false);
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
        
        {internalAudioUrl && !isRecording && (
          <>
            {!internalIsPlaying ? (
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
              disabled={isProcessing}
              className="flex items-center gap-2"
              size="sm"
            >
              {isProcessing ? 'Parsing...' : 'Parse Workout'}
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm">Recording in progress... {recordingTime}s</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {internalTranscript && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Transcript:</p>
          <p className="text-sm text-gray-600">{internalTranscript}</p>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-2">
        Speak clearly about your workout: "I did 3 sets of bench press, first set 135 pounds for 8 reps..."
      </p>
    </div>
  );
};
