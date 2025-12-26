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
        const { 
            telegram_user_id, 
            testnet_wallets 
        } = body;

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

        console.log('Updating testnet wallets for:', telegram_user_id);
        console.log('Testnet wallets data:', testnet_wallets);

        const updateData = {
            testnet_wallets: testnet_wallets || {},
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('crypto_wallets')
            .update(updateData)
            .eq('telegram_user_id', telegram_user_id)
            .select()
            .single();

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }

        console.log('Successfully updated testnet wallets:', data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: data 
            }),
        };

    } catch (error) {
        console.error('Error updating testnet wallets:', error);
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