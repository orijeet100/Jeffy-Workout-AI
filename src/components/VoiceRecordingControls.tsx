
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Sparkles } from 'lucide-react';

interface VoiceRecordingControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  errorMessage: string;
}

const VoiceRecordingControls: React.FC<VoiceRecordingControlsProps> = ({
  isRecording,
  isProcessing,
  recordingTime,
  onStartRecording,
  onStopRecording,
  errorMessage
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className={`p-4 rounded-full ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-purple-100'}`}>
          {!isRecording ? (
            <Button
              onClick={onStartRecording}
              className="bg-purple-600 hover:bg-purple-700 rounded-full p-4 shadow-lg"
              disabled={isProcessing}
            >
              <Mic className="h-6 w-6 text-white" />
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              className="bg-red-600 hover:bg-red-700 rounded-full p-4 shadow-lg"
            >
              <Square className="h-6 w-6 text-white" />
            </Button>
          )}
        </div>
      </div>
      
      {isRecording && (
        <div className="text-center">
          <p className="text-red-600 font-semibold">Recording: {formatTime(recordingTime)}</p>
          <p className="text-sm text-gray-500">Describe your exercises, weights, and reps</p>
        </div>
      )}
      
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-purple-600">
          <Sparkles className="h-5 w-5 animate-spin" />
          <span>AI is analyzing your workout...</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceRecordingControls;
