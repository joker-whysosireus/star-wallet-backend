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
        const { telegram_user_id, wallet_addresses, is_testnet = false } = body;

        if (!telegram_user_id || !wallet_addresses) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing required fields' 
                }),
            };
        }

        // Определяем какое поле обновлять в зависимости от is_testnet
        const updateField = is_testnet ? 'testnet_wallet_addresses' : 'wallet_addresses';
        const updateData = {
            [updateField]: wallet_addresses,
            updated_at: new Date().toISOString()
        };

        // Если это testnet, также обновляем поле is_testnet
        if (is_testnet) {
            updateData.is_testnet = true;
        }

        // Update wallet addresses
        const { data, error } = await supabase
            .from('crypto_wallets')
            .update(updateData)
            .eq('telegram_user_id', telegram_user_id)
            .select()
            .single();

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: data 
            }),
        };

    } catch (error) {
        console.error('Error saving addresses:', error);
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