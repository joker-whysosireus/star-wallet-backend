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
        console.log('verify-pin.js: Starting PIN verification');
        const body = JSON.parse(event.body);
        const { telegram_user_id, pin_code } = body;

        console.log('verify-pin.js: Verifying PIN for user:', telegram_user_id);

        if (!telegram_user_id || !pin_code) {
            console.log('verify-pin.js: Missing required fields');
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
            console.log('verify-pin.js: Invalid PIN format');
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
        console.log('verify-pin.js: Fetching user from database...');
        const { data: user, error } = await supabase
            .from('crypto_wallets')
            .select('pin_code')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // User not found
                console.log('verify-pin.js: User not found');
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        error: 'User not found' 
                    }),
                };
            }
            console.error('verify-pin.js: Database error:', error);
            throw error;
        }

        console.log('verify-pin.js: User found');
        console.log('verify-pin.js: Stored PIN:', user.pin_code);
        console.log('verify-pin.js: Provided PIN:', pin_code);
        console.log('verify-pin.js: PIN exists in DB:', !!user.pin_code);

        // Verify PIN (comparing strings)
        if (user.pin_code && user.pin_code === pin_code) {
            console.log('verify-pin.js: PIN verified successfully');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'PIN verified successfully'
                }),
            };
        } else {
            console.log('verify-pin.js: Incorrect PIN or PIN not set');
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
        console.error('verify-pin.js: Error verifying PIN:', error);
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