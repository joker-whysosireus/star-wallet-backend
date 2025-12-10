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

    // Получаем полную информацию о кошельке пользователя
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('telegram_user_id', telegram_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Если пользователь не существует, создаем пустую запись
        const { data: newUser, error: createError } = await supabase
          .from('crypto_wallets')
          .insert([
            {
              telegram_user_id,
              wallet_addresses: {},
              token_balances: {},
              transactions: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            wallet: newUser
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
        wallet: data
      }),
    };

  } catch (error) {
    console.error("Error getting wallet data:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to get wallet data", 
        details: error.message 
      }),
    };
  }
};