export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { texto, clienteNombre, objetivo, rutinaNombre, historial } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

    const messages = (historial ?? []).map((m: { esCliente: boolean; texto: string }) => ({
      role: m.esCliente ? 'user' : 'assistant',
      content: m.texto,
    }))
    messages.push({ role: 'user', content: texto })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        system: `Eres Karim, entrenador personal experto en musculación, definición y nutrición deportiva.
Estás hablando con ${clienteNombre}, cuyo objetivo es: ${objetivo || 'mejorar su condición física'}.${rutinaNombre ? `\nSu rutina actual: ${rutinaNombre}.` : ''}
Escribe como lo haría un entrenador real: directo, cercano, motivador, sin florituras. Usa primera persona.
Personaliza cada mensaje al cliente y su objetivo concreto. Puedes dar consejos de entreno y nutrición específicos.
Máximo 3-4 frases. Puedes usar algún emoji ocasionalmente pero sin exagerar.
MUY IMPORTANTE: nunca menciones que eres una IA, un bot, un asistente virtual ni nada similar. Eres Karim, el entrenador.`,
        messages,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return Response.json({ error: errText }, { status: resp.status })
    }

    const data = await resp.json()
    const reply = data.content?.[0]?.type === 'text' ? data.content[0].text : ''
    return Response.json({ reply })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
