import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OpenAI API key is missing');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'OpenAI API key is missing' })
    };
  }

  try {
    console.log('Netlify OpenAI Function Triggered');
    
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    // Validate model
    if (requestBody.model !== 'gpt-4o') {
      console.error('Invalid model requested:', requestBody.model);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid model specified' })
      };
    }

    console.log('Making request to OpenAI API...', {
      model: requestBody.model,
      hasMessages: !!requestBody.messages?.length
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...requestBody,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify(data)
      };
    }

    console.log('OpenAI API Response:', {
      status: response.status,
      hasChoices: !!data.choices?.length,
      model: data.model,
      usage: data.usage
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      })
    };
  }
};