/**
 * Ollama Local AI Integration
 * Privacy-first alternative to OpenAI
 */

export interface OllamaConfig {
  baseUrl: string
  model: string
}

export interface AIRequest {
  prompt: string
  system?: string
  temperature?: number
  maxTokens?: number
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama3'
}

// Make request to local Ollama instance
export async function generateWithOllama(request: AIRequest): Promise<string> {
  const { baseUrl, model } = DEFAULT_CONFIG
  
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt: request.prompt,
      system: request.system,
      temperature: request.temperature || 0.7,
      stream: false
    })
  })
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.response
}

// Check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const { baseUrl } = DEFAULT_CONFIG
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

// Get available models
export async function getOllamaModels(): Promise<string[]> {
  try {
    const { baseUrl } = DEFAULT_CONFIG
    const response = await fetch(`${baseUrl}/api/tags`)
    
    if (!response.ok) return []
    
    const data = await response.json()
    return data.models?.map((m: { name: string }) => m.name) || []
  } catch {
    return []
  }
}

// Wrapper that switches between Ollama and OpenAI based on user preference
export async function generateAI(
  request: AIRequest,
  useLocal: boolean = false
): Promise<string> {
  if (useLocal) {
    const available = await isOllamaAvailable()
    if (!available) {
      throw new Error('Ollama is not running. Please start Ollama or use cloud AI.')
    }
    return generateWithOllama(request)
  }
  
  // Fall back to OpenAI (import dynamically to avoid issues when key missing)
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: request.system || 'You are a helpful assistant.' },
      { role: 'user', content: request.prompt }
    ],
    temperature: request.temperature || 0.7,
    max_tokens: request.maxTokens || 2000
  })
  
  return completion.choices[0].message.content || ''
}