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
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { telegram_user_id, pin_code } = requestBody;

        if (!telegram_user_id || !pin_code) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Missing telegram_user_id or pin_code" }),
            };
        }

        if (!/^\d{4}$/.test(pin_code)) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "PIN code must be 4 digits" }),
            };
        }

        const { data, error } = await supabase
            .from('crypto_wallets')
            .update({ 
                pin_code: pin_code,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', telegram_user_id)
            .select('*')
            .single();

        if (error) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: error.message }),
            };
        }

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ success: true, data }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};