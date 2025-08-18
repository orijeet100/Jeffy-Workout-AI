// Deepgram API route for voice-to-text transcription
export async function transcribeAudio(audioBlob: Blob, mimeType: string = 'audio/webm') {
  try {
    // Get Deepgram API key from environment
    const DEEPGRAM_API_KEY = (import.meta as any).env?.VITE_DEEPGRAM_API_KEY;
    
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to your .env file.');
    }

    // Use the simpler approach that was working - direct blob to Deepgram
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=base&smart_format=true&punctuate=true&language=en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType,
        'Accept': 'application/json',
      },
      body: audioBlob, // Send raw audio blob directly
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      throw new Error(`Deepgram transcription failed: ${errorText}`);
    }

    const deepgramData = await deepgramResponse.json();
    
    // Extract transcript from Deepgram response
    const transcript = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    if (!transcript || transcript.trim() === '') {
      throw new Error('No speech detected in audio. Please try speaking more clearly or for longer duration.');
    }

    return {
      transcript: transcript.trim(),
      confidence: deepgramData.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
    };

  } catch (error) {
    throw error;
  }
} 