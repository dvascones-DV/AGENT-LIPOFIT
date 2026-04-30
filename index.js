require('dotenv').config({ override: true });
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const SYSTEM_PROMPT = require('./prompt.js');
const { getHistory, addMessage } = require('./conversations.js');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TAG_MAP = {
  '[MOSTRAR_PRODUCTO]': 'enviar_producto',
  '[MOSTRAR_COMBO]': 'enviar_combo',
  '[MOSTRAR_TESTIMONIOS]': 'enviar_testimonios',
  '[CERRAR_VENTA]': 'cerrar_venta',
};
const WA_LINK = 'https://wa.me/593987020841';

function detectAction(text) {
  for (const [tag, accion] of Object.entries(TAG_MAP)) {
    if (text.includes(tag)) return accion;
  }
  return 'seguir';
}

function stripTags(text) {
  return Object.keys(TAG_MAP)
    .reduce((t, tag) => t.replace(tag, ''), text)
    .trim();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.post('/chat', async (req, res) => {
  const { user_id, nombre, mensaje } = req.body;

  if (!user_id || !mensaje) {
    return res.status(400).json({ error: 'user_id y mensaje son requeridos' });
  }

  addMessage(user_id, 'user', mensaje);
  const history = getHistory(user_id);

  try {
    const systemPrompt = nombre
      ? `${SYSTEM_PROMPT}\n\nEl nombre del prospecto es: ${nombre}`
      : SYSTEM_PROMPT;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: history,
    });

    const rawText = response.content[0].text;
    const accion = detectAction(rawText);
    let respuesta = stripTags(rawText);

    if (accion === 'cerrar_venta') {
      respuesta += `\n\n👉 Escríbenos por WhatsApp: ${WA_LINK}`;
    }

    addMessage(user_id, 'assistant', rawText);

    res.json({ respuesta, accion });
  } catch (err) {
    console.error('Error Anthropic:', err.message, err.status);
    res.status(500).json({ error: 'Error al procesar la respuesta', detalle: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 lipofit-agent corriendo en puerto ${PORT}`);
});
