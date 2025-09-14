// OpenAI API route for parsing workout transcripts
export async function parseWorkoutWithOpenAI(transcript: string, exerciseContext: any) {
  try {
    // Get OpenAI API key from environment
    const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    // Create the prompt with exercise context
    const prompt = createOpenAIPrompt(transcript, exerciseContext);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful fitness assistant that parses workout descriptions into structured data. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const responseContent = openaiData.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Validate the response structure
    if (parsedResponse.error) {
      return { error: parsedResponse.error };
    }

    if (!parsedResponse.workoutSets || !Array.isArray(parsedResponse.workoutSets)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return parsedResponse;

  } catch (error) {
    throw error;
  }
}

function createOpenAIPrompt(transcript: string, exerciseContext: any): string {
  return `You are a fitness assistant that converts voice input into structured workout data.

EXERCISE LIBRARY CONTEXT:
${JSON.stringify(exerciseContext, null, 2)}

VOICE INPUT: "${transcript}"

TASK: Extract workout sets from the voice input and map them to the user's exercise library.

CRITICAL REQUIREMENTS:
- ONLY use muscle_group_id and exercise_id values that EXIST in the provided context
- NEVER invent or guess IDs - use ONLY the exact IDs from the context
- The muscle_group_id should reference the PRIMARY KEY (id) from user_muscle_groups table
- The exercise_id should reference the PRIMARY KEY (id) from user_exercises table

OUTPUT FORMAT: Return a JSON object with this structure:
{
  "workoutSets": [
    {
      "muscle_group_id": number, // MUST be a valid PRIMARY KEY from context
      "exercise_id": number,      // MUST be a valid PRIMARY KEY from context
      "weight": number,
      "number_of_reps": number
    }
  ]
}

RULES:
1. ONLY use exercises that exist in the user's library (use exact IDs from context)
2. Match muscle groups and exercises based on the context provided
3. Extract weight (in lbs) and reps from the voice input
4. If multiple sets are mentioned, create separate entries
5. If weight is not specified, use 0 as default
6. If reps are not specified, use 10 as default
7. If number of sets is not mentioned, assume 1 set
8. CRITICAL: Ensure all muscle_group_id and exercise_id values exist in the context
9. If user says entries for multiple sets, create separate entries for each set

DEFAULTS:
- Weight: 0 lbs (if not mentioned)
- Reps: 10 (if not mentioned)
- Sets: 1 (if not mentioned)

EXAMPLE ( The ids down are just examples, you need to use the ids from the context):
Voice: "I did 2 sets of bench press, 185 pounds, 8 reps and 3 sets of dumbbell flyes, 10 pounds, 10 reps"
Output: {
  "workoutSets": [
    {"muscle_group_id": 1, "exercise_id": 1, "weight": 185, "number_of_reps": 8},
    {"muscle_group_id": 1, "exercise_id": 1, "weight": 185, "number_of_reps": 8},
    {"muscle_group_id": 1, "exercise_id": 2, "weight": 10, "number_of_reps": 10},
    {"muscle_group_id": 1, "exercise_id": 2, "weight": 10, "number_of_reps": 10}
  ]
}

Voice: "bench press 135 pounds"
Output: {
  "workoutSets": [
    {"muscle_group_id": 1, "exercise_id": 1, "weight": 135, "number_of_reps": 10}
  ]
}

ERROR HANDLING:
If the user query is NOT related to workouts or fitness (e.g., "what's the weather", "tell me a joke", "how to cook pasta"), return:
{
  "error": "I'm your fitness assistant, not your personal chef! Let's stick to workouts and exercises, shall we?"
}

If the user query is unclear or doesn't contain workout information, return:
{
  "error": "I heard you say something, but I'm not sure what workout you're trying to log. Try being more specific about the exercise, weight, or reps!"
}

VALIDATION CHECK:
Before returning, verify that:
1. All muscle_group_id values exist in the context
2. All exercise_id values exist in the context
3. The exercise_id belongs to the correct muscle_group_id

IMPORTANT: Respond with ONLY the JSON object, no additional text or explanations.`;
} 