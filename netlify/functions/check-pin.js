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
        console.log('check-pin.js: Starting PIN check function');
        const body = JSON.parse(event.body);
        const { telegram_user_id } = body;

        if (!telegram_user_id) {
            console.log('check-pin.js: Missing telegram_user_id');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing telegram_user_id' 
                }),
            };
        }

        console.log('check-pin.js: Checking PIN for user:', telegram_user_id);
        
        // Check if user has PIN set
        const { data: user, error } = await supabase
            .from('crypto_wallets')
            .select('pin_code')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // User not found - no PIN set
                console.log('check-pin.js: User not found in database');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        hasPin: false 
                    }),
                };
            }
            console.error('check-pin.js: Database error:', error);
            throw error;
        }
        
        console.log('check-pin.js: User found, pin_code value:', user.pin_code);
        console.log('check-pin.js: PIN exists:', !!user.pin_code);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                hasPin: !!user.pin_code && user.pin_code !== null && user.pin_code !== ''
            }),
        };

    } catch (error) {
        console.error('check-pin.js: Error checking PIN:', error);
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