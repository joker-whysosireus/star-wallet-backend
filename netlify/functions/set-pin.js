import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("set-pin.js: Function started");

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
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
            requestBody = JSON.parse(event.body);
        } else {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const userId = requestBody.userId;
        const pinCode = requestBody.pinCode;

        if (!userId) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "User ID is required" }),
            };
        }

        if (!pinCode) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "PIN code is required" }),
            };
        }

        // Проверяем, что PIN состоит из 4 цифр
        if (!/^\d{4}$/.test(pinCode)) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "PIN must be exactly 4 digits" }),
            };
        }

        // Устанавливаем PIN-код
        const { error } = await supabase
            .from('crypto_wallets')
            .update({ 
                pin_code: pinCode,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', userId);

        if (error) {
            console.error("set-pin.js: Error setting PIN code:", error);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Failed to set PIN code" }),
            };
        }

        console.log("set-pin.js: PIN code set successfully for user:", userId);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ 
                success: true, 
                message: "PIN code set successfully"
            }),
        };

    } catch (error) {
        console.error("set-pin.js: Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};