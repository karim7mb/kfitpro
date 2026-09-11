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
        system: `Eres KarimFitPro, el entrenador personal de ${clienteNombre}.
Su objetivo es: ${objetivo || 'mejorar su condición física'}.${rutinaNombre ? `\nSu rutina actual: ${rutinaNombre}.` : ''}
Responde de forma breve, motivadora y profesional en español.
Máximo 2-3 frases. Puedes usar emojis ocasionalmente. No repitas el nombre del cliente en cada mensaje.`,
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
