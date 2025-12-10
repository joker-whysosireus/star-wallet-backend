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

    // Получаем адреса кошельков пользователя
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('wallet_addresses')
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        wallet_addresses: data?.wallet_addresses || {}
      }),
    };

  } catch (error) {
    console.error("Error getting wallet addresses:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to get wallet addresses", 
        details: error.message 
      }),
    };
  }
};