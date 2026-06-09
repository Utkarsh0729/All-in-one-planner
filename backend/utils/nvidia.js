import dotenv from 'dotenv';

dotenv.config();

// Standardize reading the key in case there are spaces in the .env definition
const getApiKey = () => {
  const envVal = process.env.NVIDIA_API_KEY || '';
  return envVal.trim();
};

const API_KEY = getApiKey();
const BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

/**
 * Send a chat completion request to the NVIDIA NIM API Catalog.
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @param {boolean} jsonMode 
 * @returns {Promise<any>}
 */
export const queryNvidiaAI = async (systemPrompt, userPrompt, jsonMode = false) => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    throw new Error('NVIDIA_API_KEY is not configured in .env');
  }

  try {
    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1024
    };

    if (jsonMode) {
      // Standard OpenAI structure for JSON output (if supported)
      // or we handle formatting constraints via prompting
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `NVIDIA API returned status ${res.status}`);
    }

    const data = await res.json();
    const resultText = data.choices[0].message.content.trim();

    if (jsonMode) {
      try {
        // Strip markdown code block wrappers if the model still outputs them
        let cleanText = resultText;
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        return JSON.parse(cleanText.trim());
      } catch (parseError) {
        console.error('Failed to parse JSON response from NVIDIA AI:', resultText);
        throw new Error('NVIDIA AI returned invalid JSON');
      }
    }

    return resultText;
  } catch (error) {
    console.error('NVIDIA AI request error:', error);
    throw error;
  }
};
