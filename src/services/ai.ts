import type { AppSettings } from '../types';
import { SYSTEM_PROMPT } from './claude';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1';

async function callAnthropicApi(apiKey: string, userMessage: string, model: string): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAiCompatibleApi(
  apiKey: string,
  userMessage: string,
  model: string,
  baseUrl: string,
): Promise<string> {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function callAiApi(settings: AppSettings, userMessage: string): Promise<string> {
  const provider = settings.aiProvider || 'anthropic';

  if (provider === 'anthropic') {
    return callAnthropicApi(
      settings.claudeApiKey,
      userMessage,
      settings.claudeModel || 'claude-sonnet-4-5-20250929',
    );
  } else if (provider === 'openai') {
    return callOpenAiCompatibleApi(
      settings.openAiApiKey,
      userMessage,
      settings.openAiModel || 'gpt-4o',
      OPENAI_URL,
    );
  } else {
    return callOpenAiCompatibleApi(
      '',
      userMessage,
      settings.localAiModel || '',
      settings.localAiBaseUrl || 'http://localhost:11434/v1',
    );
  }
}

export async function testAiConnection(settings: AppSettings): Promise<void> {
  const provider = settings.aiProvider || 'anthropic';

  if (provider === 'anthropic') {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.claudeModel || 'claude-sonnet-4-5-20250929',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
  } else if (provider === 'openai') {
    const res = await fetch(`${OPENAI_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: settings.openAiModel || 'gpt-4o',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
  } else {
    const baseUrl = (settings.localAiBaseUrl || 'http://localhost:11434/v1').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.localAiModel || '',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
  }
}

export function hasValidAiConfig(settings: AppSettings): boolean {
  const provider = settings.aiProvider || 'anthropic';
  if (provider === 'anthropic') return !!settings.claudeApiKey;
  if (provider === 'openai') return !!settings.openAiApiKey;
  return !!settings.localAiBaseUrl && !!settings.localAiModel;
}
