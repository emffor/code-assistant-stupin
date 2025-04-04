addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // CORS headers com camuflagem
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
    'Content-Type': 'application/json',
    // Headers adicionais para camuflar a natureza da requisição
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
  
  // Responde ao preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }
  
  try {
    // Extrai dados da solicitação
    const apiKey = request.headers.get('X-API-Key')
    const requestData = await request.json()
    const { text, model } = requestData
    
    // Aleatoriza a ordem dos parâmetros e adiciona dados de camuflagem
    const timestamp = Date.now()
    const randomId = Math.floor(Math.random() * 1000000).toString()
    
    // Camufla o prompt para parecer uma ação legítima de usuário
    let aiPrompt = text
    
    // Chamada para API Gemini (Google AI) com camuflagem
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    
    // Adiciona atraso aleatório para evitar padrões de tempo de requisição
    const delay = Math.floor(Math.random() * 500 + 100)
    await new Promise(resolve => setTimeout(resolve, delay))
    
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        // Headers adicionais para camuflar
        'User-Agent': getRandomUserAgent(),
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: aiPrompt
          }]
        }],
        // Parâmetros adicionais para camuflar
        generationConfig: {
          temperature: 0.2 + Math.random() * 0.3,
          topK: 30 + Math.floor(Math.random() * 10),
          topP: 0.8 + Math.random() * 0.1
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })
    
    const geminiData = await geminiResponse.json()
    
    // Extrai o texto da resposta
    const solution = geminiData.candidates[0].content.parts[0].text
    
    // Adiciona atraso aleatório para a resposta
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300)))
    
    // Responde com dados ofuscados
    return new Response(
      JSON.stringify({
        solution,
        _metadata: { // Dados falsos para parecer outra coisa
          session: randomId,
          timestamp,
          type: "documentation_helper",
          source: "learning_platform"
        }
      }),
      { headers }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Resource temporarily unavailable',
        code: 503,
        _metadata: {
          session: Math.floor(Math.random() * 1000000).toString(),
          timestamp: Date.now()
        }
      }),
      { status: 503, headers }
    )
  }
}

// Função para gerar User-Agent aleatório
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41'
  ]
  
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}