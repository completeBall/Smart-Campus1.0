const PROVIDERS = {
  kimi: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k'
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  doubao: {
    label: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-1-5-lite-32k-250115'
  }
};

const maskKey = (key) => {
  if (!key) return '';
  return '******';
};

const normalizeBaseUrl = (baseUrl) => String(baseUrl || '').replace(/\/+$/, '');

const getProviderDefaults = (provider) => {
  return PROVIDERS[provider] || PROVIDERS.deepseek;
};

const readErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.error?.message || data.message || JSON.stringify(data);
  } catch (e) {
    return response.statusText || 'AI 服务请求失败';
  }
};

const callChatCompletion = async ({ provider, apiKey, model, baseUrl, messages, temperature = 0.7, maxTokens = 1024 }) => {
  if (!apiKey) {
    throw new Error('请先在管理员端配置 API Key');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('消息内容不能为空');
  }

  const defaults = getProviderDefaults(provider);
  const url = `${normalizeBaseUrl(baseUrl || defaults.baseUrl)}/chat/completions`;
  const payload = {
    model: model || defaults.model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('AI 服务没有返回有效内容');
    }

    const usage = data.usage || {};
    return {
      content,
      provider,
      model: payload.model,
      usage: {
        prompt_tokens: Number(usage.prompt_tokens || 0),
        completion_tokens: Number(usage.completion_tokens || 0),
        total_tokens: Number(usage.total_tokens || 0)
      }
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AI 服务响应超时，请稍后重试');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = {
  PROVIDERS,
  callChatCompletion,
  getProviderDefaults,
  maskKey
};
