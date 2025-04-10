import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Função auxiliar para converter um ArrayBuffer para Base64
function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  try {
    const body = await req.json();
    const apiKey = req.headers.get('X-API-Key');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key missing' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let geminiResponse;
    let solution = 'No text generated.';

    // Processamento para imagem: espera os campos "prompt" e "imageUrl"
    if (body.imageUrl && body.prompt) {
      const { prompt, imageUrl, model } = body;

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch image from URL: ${imageResponse.statusText}` }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = arrayBufferToBase64(imageArrayBuffer);
      const mimeType = imageResponse.headers.get('content-type') || 'image/png';

      const geminiModel = model || 'gemini-2.0-flash-lite';
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
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      };

      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`;
      geminiResponse = await fetch(geminiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });
    
    // Processamento para texto: espera o campo "text"
    } else if (body.text) {
      const { text, model } = body;
      const geminiModel = model || 'gemini-pro';
      const geminiPayload = {
        contents: [{
          parts: [{ text: text }]
        }],
        generationConfig: {},
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      };

      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      geminiResponse = await fetch(geminiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });

    } else {
      return new Response(
        JSON.stringify({ error: 'Missing required fields. Provide either {prompt, imageUrl} for image analysis or {text} for text analysis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Tratamento de resposta da API Gemini
    if (!geminiResponse.ok) {
      let errorMsg = `Gemini API Error: ${geminiResponse.statusText}`;
      try {
        const errorData = await geminiResponse.json();
        errorMsg = `Gemini API Error: ${errorData.error?.message || geminiResponse.statusText}`;
      } catch (e) {}
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: geminiResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    if (
      geminiData.candidates &&
      geminiData.candidates[0] &&
      geminiData.candidates[0].content &&
      geminiData.candidates[0].content.parts &&
      geminiData.candidates[0].content.parts[0] &&
      geminiData.candidates[0].content.parts[0].text
    ) {
      solution = geminiData.candidates[0].content.parts[0].text;
    } else if (geminiData.promptFeedback && geminiData.promptFeedback.blockReason) {
      solution = `Content blocked by Gemini: ${geminiData.promptFeedback.blockReason}`;
    }

    return new Response(
      JSON.stringify({ solution }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
