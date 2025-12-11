// netlify/functions/saveWalletAddresses.js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("saveWalletAddresses.js: Function started");
    
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
        const { telegram_user_id, wallet_addresses } = JSON.parse(event.body);
        
        if (!telegram_user_id || !wallet_addresses) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "telegram_user_id and wallet_addresses are required" }),
            };
        }
        
        // Обновляем адреса кошельков
        const { data, error } = await supabase
            .from('crypto_wallets')
            .update({
                wallet_addresses: wallet_addresses,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', telegram_user_id)
            .select()
            .single();
        
        if (error) {
            console.error("saveWalletAddresses.js: Error saving wallet addresses:", error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Failed to save wallet addresses" }),
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: "Wallet addresses saved successfully"
            }),
        };
        
    } catch (error) {
        console.error("saveWalletAddresses.js: Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};