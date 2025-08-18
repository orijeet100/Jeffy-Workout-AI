// Client helper to call server-side Deepgram proxy (no keys in client)
export async function transcribeAudio(audioBlob: Blob): Promise<{ transcript: string; confidence: number }> {
	const TRANSCRIBE_URL = (import.meta as any).env?.VITE_EDGE_TRANSCRIBE_URL;
	if (!TRANSCRIBE_URL) {
		throw new Error('Transcription endpoint not configured. Please set VITE_EDGE_TRANSCRIBE_URL in your .env');
	}

	const response = await fetch(TRANSCRIBE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'audio/webm',
		},
		body: audioBlob,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Transcription failed: ${errorText}`);
	}

	const data = await response.json();
	return {
		transcript: data.transcript || '',
		confidence: data.confidence || 0,
	};
} 