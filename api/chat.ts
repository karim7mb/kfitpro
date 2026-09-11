import Anthropic from '@anthropic-ai/sdk'

export const config = { runtime: 'nodejs' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { texto, clienteNombre, objetivo, rutinaNombre, historial } = await req.json()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const messages: Anthropic.MessageParam[] = (historial ?? []).map((m: { esCliente: boolean; texto: string }) => ({
    role: m.esCliente ? 'user' : 'assistant',
    content: m.texto,
  }))
  messages.push({ role: 'user', content: texto })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    system: `Eres KarimFitPro, el entrenador personal de ${clienteNombre}.
Su objetivo es: ${objetivo || 'mejorar su condición física'}.${rutinaNombre ? `\nSu rutina actual: ${rutinaNombre}.` : ''}
Responde de forma breve, motivadora y profesional en español.
Máximo 2-3 frases. Puedes usar emojis ocasionalmente. No repitas el nombre del cliente en cada mensaje.`,
    messages,
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''
  return Response.json({ reply })
}
