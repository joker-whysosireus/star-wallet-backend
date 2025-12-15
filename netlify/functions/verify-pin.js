import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
            } catch (parseError) {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ isValid: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Request body is empty" }),
            };
        }

        const { telegram_user_id, pin_code } = requestBody;

        if (!telegram_user_id || !pin_code) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Missing telegram_user_id or pin_code" }),
            };
        }

        const { data: user, error } = await supabase
            .from('crypto_wallets')
            .select('pin_code')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (error) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: error.message }),
            };
        }

        if (!user) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "User not found" }),
            };
        }

        if (!user.pin_code) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ 
                    isValid: false, 
                    pinNotSet: true,
                    message: "PIN code not set for this user" 
                }),
            };
        }

        const isValid = user.pin_code === pin_code;

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ isValid }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ isValid: false, error: error.message }),
        };
    }
};