import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const telegram_user_id = event.queryStringParameters?.telegram_user_id;

    if (!telegram_user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Missing telegram_user_id parameter" 
        }),
      };
    }

    // Получаем seed фразу пользователя
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('seed_phrases')
      .eq('telegram_user_id', telegram_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: "User not found" 
          }),
        };
      }
      throw error;
    }

    if (!data || !data.seed_phrases) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: "Seed phrase not found for this user" 
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        seed_phrase: data.seed_phrases
      }),
    };

  } catch (error) {
    console.error("Error getting seed phrase:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to get seed phrase", 
        details: error.message 
      }),
    };
  }
};