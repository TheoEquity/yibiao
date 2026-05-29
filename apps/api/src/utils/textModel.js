const { settingsState } = require('../data/settings');

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function extractTextFromResponse(payload) {
  if (typeof payload?.choices?.[0]?.message?.content === 'string') {
    return payload.choices[0].message.content;
  }

  if (Array.isArray(payload?.choices?.[0]?.message?.content)) {
    return payload.choices[0].message.content.map((item) => item?.text || '').join('\n');
  }

  if (typeof payload?.choices?.[0]?.text === 'string') {
    return payload.choices[0].text;
  }

  return '';
}

async function callTextModel({ systemPrompt, userPrompt, temperature = 0.3 }) {
  const baseUrl = normalizeBaseUrl(settingsState.textModel?.base_url);
  const modelName = String(settingsState.textModel?.model_name || '').trim();
  const apiKey = String(settingsState.textModel?.api_key || '').trim();

  if (!baseUrl || !modelName || !apiKey) {
    throw new Error('文本模型配置不完整');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`文本模型调用失败: ${response.status}`);
    }

    const payload = await response.json();
    const text = extractTextFromResponse(payload).trim();
    if (!text) {
      throw new Error('文本模型返回为空');
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  callTextModel,
};
