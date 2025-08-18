import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audio, mimeType } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Get Deepgram API key from environment
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    
    if (!DEEPGRAM_API_KEY) {
      return res.status(500).json({ error: 'Deepgram API key not configured' });
    }

    // Convert base64 back to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Call Deepgram API
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=false&utterances=false&paragraphs=false&numerals=true&profanity_filter=false&redact=false&search=false&replace=false&keywords=false&detect_topics=false&language=en&tier=nova', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType || 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API error:', errorText);
      return res.status(deepgramResponse.status).json({ 
        error: 'Deepgram transcription failed',
        details: errorText
      });
    }

    const deepgramData = await deepgramResponse.json();
    
    // Extract transcript from Deepgram response
    const transcript = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'No speech detected in audio' });
    }

    return res.status(200).json({ 
      transcript: transcript.trim(),
      confidence: deepgramData.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
    });

  } catch (error) {
    console.error('Deepgram transcription error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 