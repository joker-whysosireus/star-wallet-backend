import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("check-pin.js: Function started");

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("check-pin.js: Handling OPTIONS request");
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

        // Проверяем пользователя в базе
        const { data: userData, error: userError } = await supabase
            .from('crypto_wallets')
            .select('pin_code')
            .eq('telegram_user_id', userId)
            .single();

        if (userError) {
            console.error("check-pin.js: Error fetching user:", userError);
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ success: false, error: "User not found" }),
            };
        }

        // Если PIN-код не передан, проверяем нужен ли он
        if (!pinCode) {
            const needsPin = !userData.pin_code || userData.pin_code.trim() === '';
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ 
                    success: true, 
                    needsPin: needsPin,
                    hasPin: !!userData.pin_code && userData.pin_code.trim() !== ''
                }),
            };
        }

        // Проверяем PIN-код
        const isCorrect = userData.pin_code === pinCode;

        if (isCorrect) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ 
                    success: true, 
                    pinVerified: true,
                    needsPin: false 
                }),
            };
        } else {
            return {
                statusCode: 401,
                headers: headers,
                body: JSON.stringify({ 
                    success: false, 
                    pinVerified: false,
                    error: "Incorrect PIN code"
                }),
            };
        }

    } catch (error) {
        console.error("check-pin.js: Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};