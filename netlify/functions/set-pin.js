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
        const { telegram_user_id, pin_code } = body;

        if (!telegram_user_id || !pin_code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing required fields' 
                }),
            };
        }

        // Validate PIN format (4 digits only)
        if (!/^\d{4}$/.test(pin_code)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'PIN must be exactly 4 digits' 
                }),
            };
        }

        // Check if user exists
        const { data: existingUser, error: selectError } = await supabase
            .from('crypto_wallets')
            .select('*')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        let result;
        
        if (selectError && selectError.code === 'PGRST116') {
            // User doesn't exist, create new
            const { data, error } = await supabase
                .from('crypto_wallets')
                .insert([{
                    telegram_user_id,
                    pin_code: pin_code,
                    wallet_addresses: {},
                    token_balances: {},
                    transactions: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else if (selectError) {
            throw selectError;
        } else {
            // User exists, update PIN
            const { data, error } = await supabase
                .from('crypto_wallets')
                .update({
                    pin_code: pin_code,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_user_id', telegram_user_id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: result 
            }),
        };

    } catch (error) {
        console.error('Error setting PIN:', error);
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