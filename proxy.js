addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })
  
  async function handleRequest(request) {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
      'Content-Type': 'application/json'
    }
    
    // Responde ao preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }
    
    try {
      // Extrai dados da solicitação
      const apiKey = request.headers.get('X-API-Key')
      const { text } = await request.json()
      
      // Chamada para API Gemini (Google AI)
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analise este código e sugira uma solução para o problema. Seja conciso e direto:\n\n${text}`
            }]
          }]
        })
      })
      
      const geminiData = await geminiResponse.json()
      
      // Extrai o texto da resposta
      const solution = geminiData.candidates[0].content.parts[0].text
      
      return new Response(
        JSON.stringify({ solution }),
        { headers }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Falha no processamento' }),
        { status: 500, headers }
      )
    }
  }