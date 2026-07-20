import { describe, expect, it, vi } from 'vitest';
import { callAiApi, getConfiguredProviders, hasValidAiConfig } from './ai';
import { baseSettings } from '../test/fixtures';

describe('ai service', () => {
  it('detects configured providers', () => {
    const providers = getConfiguredProviders({
      ...baseSettings,
      claudeApiKey: 'a',
      openAiApiKey: 'o',
      localAiBaseUrl: 'http://localhost:11434/v1',
      localAiModel: 'llama3',
    });
    expect(providers.map(p => p.id)).toEqual(['anthropic', 'openai', 'local']);
  });

  it('validates config for selected provider', () => {
    expect(hasValidAiConfig({ ...baseSettings, aiProvider: 'anthropic', claudeApiKey: 'x' })).toBe(true);
    expect(hasValidAiConfig({ ...baseSettings, aiProvider: 'openai', openAiApiKey: '' })).toBe(false);
    expect(hasValidAiConfig({ ...baseSettings, aiProvider: 'local', localAiModel: 'llama3' })).toBe(true);
  });

  it('routes API calls based on provider override', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await callAiApi(
      { ...baseSettings, aiProvider: 'openai', openAiApiKey: 'key', openAiModel: 'gpt-5.6' },
      'hello',
      'openai'
    );
    expect(res).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
