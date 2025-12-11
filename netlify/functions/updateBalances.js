// netlify/functions/updateBalances.js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("updateBalances.js: Function started");
    
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
                body: JSON.stringify({ error: "telegram_user_id and token_balances are required" }),
            };
        }
        
        // Обновляем балансы токенов
        const { data, error } = await supabase
            .from('crypto_wallets')
            .update({
                token_balances: token_balances,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', telegram_user_id)
            .select()
            .single();
        
        if (error) {
            console.error("updateBalances.js: Error updating balances:", error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Failed to update balances" }),
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: "Balances updated successfully"
            }),
        };
        
    } catch (error) {
        console.error("updateBalances.js: Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};