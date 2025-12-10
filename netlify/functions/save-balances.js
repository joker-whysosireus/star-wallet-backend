import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { telegram_user_id, token_balances } = JSON.parse(event.body);

    if (!telegram_user_id || !token_balances) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Missing telegram_user_id or token_balances" 
        }),
      };
    }

    // Проверяем валидность token_balances
    if (typeof token_balances !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "token_balances must be an object" 
        }),
      };
    }

    // Проверяем существование пользователя
    const { data: existingUser, error: checkError } = await supabase
      .from('crypto_wallets')
      .select('telegram_user_id')
      .eq('telegram_user_id', telegram_user_id)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // Пользователь не существует, создаем нового
      const { data: newUser, error: createError } = await supabase
        .from('crypto_wallets')
        .insert([
          {
            telegram_user_id,
            token_balances: token_balances,
            wallet_addresses: {},
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
          message: "Token balances saved for new user",
          user: newUser
        }),
      };
    }

    // Обновляем существующего пользователя
    const { data: updatedUser, error: updateError } = await supabase
      .from('crypto_wallets')
      .update({ 
        token_balances: token_balances,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_user_id', telegram_user_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: "Token balances updated",
        user: updatedUser
      }),
    };

  } catch (error) {
    console.error("Error saving token balances:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to save token balances", 
        details: error.message 
      }),
    };
  }
};