import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { telegram_user_id } = body;

        if (!telegram_user_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing telegram_user_id' 
                }),
            };
        }

        // Получаем данные пользователя
        const { data: user, error } = await supabase
            .from('crypto_wallets')
            .select('testnet_wallets, seed_phrases')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                testnet_wallets: user.testnet_wallets || {},
                has_seed: !!user.seed_phrases
            }),
        };

    } catch (error) {
        console.error('Error getting testnet wallets:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message 
            }),
        };
    }
};