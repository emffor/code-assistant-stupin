import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary)
}

serve(async (req) => {
  try {
    const { prompt, imageUrl, model } = await req.json()
    const apiKey = req.headers.get('X-API-Key')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key missing' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!prompt || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or imageUrl in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image from URL: ${imageResponse.statusText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const imageBase64 = arrayBufferToBase64(imageArrayBuffer)
    const mimeType = imageResponse.headers.get('content-type') || 'image/png'

    const geminiModel = model || 'gemini-pro-vision'
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
      generationConfig: {},
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ]
    }

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    })

    if (!geminiResponse.ok) {
      let errorMsg = `Gemini API Error: ${geminiResponse.statusText}`
      try {
        const errorData = await geminiResponse.json()
        errorMsg = `Gemini API Error: ${errorData.error?.message || geminiResponse.statusText}`
      } catch (e) {}
      
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: geminiResponse.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()

    let solution = 'No text generated.'
    if (geminiData.candidates && geminiData.candidates[0] && 
        geminiData.candidates[0].content && geminiData.candidates[0].content.parts && 
        geminiData.candidates[0].content.parts[0] && geminiData.candidates[0].content.parts[0].text) {
      solution = geminiData.candidates[0].content.parts[0].text
    } else if (geminiData.promptFeedback && geminiData.promptFeedback.blockReason) {
      solution = `Content blocked by Gemini: ${geminiData.promptFeedback.blockReason}`
    }

    return new Response(
      JSON.stringify({ solution: solution }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})