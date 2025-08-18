// Client helper to call server-side OpenAI proxy (no keys in client)
export async function parseWorkoutWithOpenAI(transcript: string, exerciseContext: any) {
	const PARSE_URL = (import.meta as any).env?.VITE_EDGE_PARSE_WORKOUT_URL;
	if (!PARSE_URL) {
		throw new Error('Parse endpoint not configured. Please set VITE_EDGE_PARSE_WORKOUT_URL in your .env');
	}

	const response = await fetch(PARSE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ transcript, exerciseContext }),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenAI processing failed: ${errorText}`);
	}

	return await response.json();
} 