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
                    error: 'Invalid PIN format' 
                }),
            };
        }

        // Get user's PIN code
        const { data: user, error } = await supabase
            .from('crypto_wallets')
            .select('pin_code')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // User not found
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        error: 'User not found' 
                    }),
                };
            }
            throw error;
        }

        // Verify PIN (comparing strings)
        if (user.pin_code === pin_code) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'PIN verified successfully'
                }),
            };
        } else {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Incorrect PIN'
                }),
            };
        }

    } catch (error) {
        console.error('Error verifying PIN:', error);
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