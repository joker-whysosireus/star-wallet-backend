// netlify/functions/saveSeedPhrase.js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import * as bip39 from 'bip39';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("saveSeedPhrase.js: Function started");
    
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
        const { telegram_user_id, seed_phrase, pin_code } = JSON.parse(event.body);
        
        if (!telegram_user_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "telegram_user_id is required" }),
            };
        }
        
        // Если сид-фраза не предоставлена, генерируем новую
        let finalSeedPhrase = seed_phrase;
        if (!finalSeedPhrase) {
            finalSeedPhrase = bip39.generateMnemonic(128);
        }
        
        // Проверяем валидность сид-фразы
        if (!bip39.validateMnemonic(finalSeedPhrase)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Invalid seed phrase" }),
            };
        }
        
        // Обновляем запись пользователя
        const { data, error } = await supabase
            .from('crypto_wallets')
            .update({
                seed_phrases: finalSeedPhrase,
                pin_code: pin_code || null,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', telegram_user_id)
            .select()
            .single();
        
        if (error) {
            console.error("saveSeedPhrase.js: Error saving seed phrase:", error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Failed to save seed phrase" }),
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                seed_phrase: finalSeedPhrase,
                message: "Seed phrase saved successfully"
            }),
        };
        
    } catch (error) {
        console.error("saveSeedPhrase.js: Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};