// netlify/functions/getWallets.js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("getWallets.js: Function started");
    
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
        const { telegram_user_id } = JSON.parse(event.body);
        
        if (!telegram_user_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "telegram_user_id is required" }),
            };
        }
        
        // Получаем данные пользователя из таблицы crypto_wallets
        const { data: userData, error } = await supabase
            .from('crypto_wallets')
            .select('*')
            .eq('telegram_user_id', telegram_user_id)
            .single();
        
        if (error) {
            console.error("getWallets.js: Error fetching user data:", error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Failed to fetch user data" }),
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: userData
            }),
        };
        
    } catch (error) {
        console.error("getWallets.js: Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};