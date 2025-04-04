// Helper para converter ArrayBuffer para Base64 em ambiente Worker
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa é geralmente disponível em Workers
  return btoa(binary);
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Considere restringir em produção
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

    // Espera payload com prompt e imageUrl
    const requestData = await request.json();
    const { prompt, imageUrl, model } = requestData; // model é opcional, pode definir padrão

    if (!prompt || !imageUrl) {
        return new Response(JSON.stringify({ error: 'Missing prompt or imageUrl in request body' }), { status: 400, headers });
    }

    // 1. Busca a imagem do Cloudflare URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch image from URL: ${imageResponse.statusText}` }), { status: 502, headers }); // Bad Gateway
    }
    const imageBlob = await imageResponse.blob();
    if (!imageBlob) {
       return new Response(JSON.stringify({ error: 'Failed to get image blob from URL' }), { status: 500, headers });
    }
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = arrayBufferToBase64(imageArrayBuffer);
    const mimeType = imageBlob.type || 'image/png'; 

    const geminiModel = model || 'gemini-pro-vision'; 
    const geminiPayload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: { 
         // temperature: 0.4,
         // topK: 32,
         // topP: 1,
         // maxOutputTokens: 4096,
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
        if (geminiData.promptFeedback.safetyRatings) {
             solution += ` Ratings: ${JSON.stringify(geminiData.promptFeedback.safetyRatings)}`;
        }
         console.warn("Gemini content blocked:", geminiData.promptFeedback);
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