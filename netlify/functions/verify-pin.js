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

        // Get user's PIN code
        const { data: user, error } = await supabase
            .from('crypto_wallets')
            .select('pin_code, pin_attempts, pin_locked_until')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (error) throw error;

        // Check if PIN is locked
        if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
            const lockTime = Math.ceil((new Date(user.pin_locked_until) - new Date()) / 1000);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: `PIN is locked. Try again in ${lockTime} seconds.`
                }),
            };
        }

        // Verify PIN
        if (user.pin_code === pin_code) {
            // Reset attempts on successful login
            await supabase
                .from('crypto_wallets')
                .update({
                    pin_attempts: 0,
                    pin_locked_until: null,
                    last_login: new Date().toISOString()
                })
                .eq('telegram_user_id', telegram_user_id);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'PIN verified successfully'
                }),
            };
        } else {
            // Increment failed attempts
            const newAttempts = (user.pin_attempts || 0) + 1;
            let updateData = {
                pin_attempts: newAttempts,
                updated_at: new Date().toISOString()
            };

            // Lock PIN after 3 failed attempts for 5 minutes
            if (newAttempts >= 3) {
                const lockUntil = new Date();
                lockUntil.setMinutes(lockUntil.getMinutes() + 5);
                updateData.pin_locked_until = lockUntil.toISOString();
            }

            await supabase
                .from('crypto_wallets')
                .update(updateData)
                .eq('telegram_user_id', telegram_user_id);

            const attemptsLeft = 3 - newAttempts;
            const errorMessage = attemptsLeft > 0 
                ? `Incorrect PIN. ${attemptsLeft} attempts remaining.`
                : 'Too many failed attempts. PIN locked for 5 minutes.';

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: errorMessage
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