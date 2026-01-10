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
                    body: JSON.stringify({ 
                        success: false, 
                        error: "Invalid JSON format in request body" 
                    }),
                };
            }
        } else {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Request body is empty" 
                }),
            };
        }

        const { telegram_user_id, network = 'mainnet' } = requestBody;

        if (!telegram_user_id) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: "telegram_user_id is required" 
                }),
            };
        }

        try {
            // Получаем пользователя из базы данных
            const { data: userData, error: userError } = await supabase
                .from('crypto_wallets')
                .select('transactions')
                .eq('telegram_user_id', telegram_user_id)
                .single();

            if (userError) {
                if (userError.code === 'PGRST116') {
                    return {
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({
                            success: true,
                            transactions: []
                        }),
                    };
                }
                throw userError;
            }

            let transactions = userData.transactions || [];
            
            // Фильтруем транзакции по сети, если указана
            if (network) {
                transactions = transactions.filter(tx => tx.network === network);
            }
            
            // Сортируем по дате (новые сначала)
            transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    transactions: transactions
                }),
            };

        } catch (dbError) {
            console.error('Database error:', dbError);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Database error: " + dbError.message 
                }),
            };
        }

    } catch (error) {
        console.error('General error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message 
            }),
        };
    }
};