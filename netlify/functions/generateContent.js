// netlify/functions/generateContent.js

import fetch from 'node-fetch';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { imageUrl, productFocus, productCategory, customPrompt } = JSON.parse(event.body);

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing OpenAI API key' })
    };
  }

  try {
    const prompt = `Generate optimized product title, description, and tags for Zazzle product. 
      Product focus: ${productFocus}
      Product category: ${productCategory}
      Image description: ${imageUrl ? 'Image provided. Use it for visual inspiration.' : 'No image provided.'}
      ${customPrompt ? 'Special instructions: ' + customPrompt : ''}
      Respond in JSON with fields: title, description, tags (comma-separated).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an assistant that helps create Zazzle product content.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    const result = await response.json();
    const content = result.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
