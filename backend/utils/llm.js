const https = require('https');

/**
 * Analyze a URL with LLM and return description + tags.
 * Falls back to a simple response if no API key is configured.
 */
async function analyzeUrl(url) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback: simple extraction without LLM
    const hostname = new URL(url).hostname.replace('www.', '');
    return {
      description: `Link to ${hostname}`,
      tags: [hostname.split('.')[0]]
    };
  }

  const prompt = `Analyze this URL and return a short description and relevant tags. Respond in JSON format only.

URL: ${url}

Required JSON format:
{"description": "one-line summary of what this page is about", "tags": ["tag1", "tag2", "tag3"]}`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const content = json.choices?.[0]?.message?.content;
          if (!content) throw new Error('No content in LLM response');
          const parsed = JSON.parse(content);
          resolve({
            description: parsed.description || 'No description available',
            tags: parsed.tags || []
          });
        } catch (e) {
          console.error('LLM parse error:', e.message);
          // Fallback
          const hostname = new URL(url).hostname.replace('www.', '');
          resolve({
            description: `Link to ${hostname}`,
            tags: [hostname.split('.')[0]]
          });
        }
      });
    });

    req.on('error', (e) => {
      console.error('LLM API request failed:', e.message);
      const hostname = new URL(url).hostname.replace('www.', '');
      resolve({
        description: `Link to ${hostname}`,
        tags: [hostname.split('.')[0]]
      });
    });

    req.write(data);
    req.end();
  });
}

module.exports = { analyzeUrl };
