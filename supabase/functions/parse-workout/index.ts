
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transcript, exerciseKnowledge } = await req.json()

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create exercise knowledge context
    const exerciseContext = Object.entries(exerciseKnowledge || {})
      .map(([muscleGroup, exercises]) => 
        `${muscleGroup}: ${exercises.join(', ')}`
      ).join('\n')

    const systemPrompt = `You are a fitness assistant that parses workout transcripts into structured data. 

Available exercises by muscle group:
${exerciseContext}

Parse the following workout transcript and return a JSON object with this exact structure:
{
  "exercises": [
    {
      "name": "exact exercise name from available exercises",
      "muscleGroup": "muscle group name",
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
1. Only use exercise names that exist in the available exercises list
2. If an exercise isn't in the list, find the closest match or skip it
3. Extract weight, reps, and duration information accurately
4. For time-based exercises (like planks), use duration_seconds instead of reps
5. Include any relevant notes or form cues mentioned
6. Return only valid JSON, no additional text

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
}`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to parse workout transcript' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    const parsedContent = data.choices[0]?.message?.content

    if (!parsedContent) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    try {
      // Parse the JSON response from OpenAI
      const workoutData = JSON.parse(parsedContent)
      
      return new Response(
        JSON.stringify(workoutData),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      console.error('Raw response:', parsedContent)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response', 
          rawResponse: parsedContent 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in parse-workout function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
