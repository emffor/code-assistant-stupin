addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
  }

  try {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API Key missing' }), { status: 401, headers });
    }

    const requestData = await request.json();
    const { prompt, imageBase64, model } = requestData;

    if (!prompt || !imageBase64) {
        return new Response(JSON.stringify({ error: 'Missing prompt or imageBase64 in request body' }), { status: 400, headers });
    }

    const geminiModel = model || 'gemini-pro-vision';
    const geminiPayload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/png',
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: { 
         temperature: 0.4,
         maxOutputTokens: 4096,
      },
      safetySettings: [ 
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ]
    };

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiResponse.ok) {
        let errorMsg = `Gemini API Error: ${geminiResponse.statusText}`;
        try {
            const errorData = await geminiResponse.json();
            errorMsg = `Gemini API Error: ${errorData.error?.message || geminiResponse.statusText}`;
        } catch (e) {
            console.error("Gemini API Error Response:", await geminiResponse.text()); 
        }
        return new Response(JSON.stringify({ error: errorMsg }), { status: geminiResponse.status, headers });
    }

    const geminiData = await geminiResponse.json();

    let solution = 'No text generated.'; 
    if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts && geminiData.candidates[0].content.parts[0] && geminiData.candidates[0].content.parts[0].text) {
        solution = geminiData.candidates[0].content.parts[0].text;
    } else if (geminiData.promptFeedback && geminiData.promptFeedback.blockReason) {
        solution = `Content blocked by Gemini: ${geminiData.promptFeedback.blockReason}`;
    } else {
        console.error("Unexpected Gemini response structure:", JSON.stringify(geminiData, null, 2));
    }

    return new Response(
      JSON.stringify({ solution: solution }), 
      { headers }
    )

  } catch (error) {
    console.error('Error in Cloudflare Worker:', error);
    return new Response(
      JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
      { status: 500, headers }
    )
  }
}