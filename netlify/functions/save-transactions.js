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

        const { telegram_user_id, transaction, network = 'mainnet' } = requestBody;

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

        if (!transaction || !transaction.id) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Valid transaction object with id is required" 
                }),
            };
        }

        // Добавляем сеть в транзакцию
        transaction.network = network;
        transaction.created_at = new Date().toISOString();

        try {
            // Сначала получаем текущие транзакции пользователя
            const { data: userData, error: userError } = await supabase
                .from('crypto_wallets')
                .select('transactions')
                .eq('telegram_user_id', telegram_user_id)
                .single();

            if (userError) {
                throw userError;
            }

            let transactions = userData.transactions || [];
            
            // Проверяем, нет ли уже такой транзакции (по id)
            const existingIndex = transactions.findIndex(tx => tx.id === transaction.id);
            
            if (existingIndex !== -1) {
                // Обновляем существующую транзакцию
                transactions[existingIndex] = { ...transactions[existingIndex], ...transaction };
            } else {
                // Добавляем новую транзакцию в начало массива
                transactions.unshift(transaction);
                
                // Ограничиваем количество хранимых транзакций (например, 100)
                if (transactions.length > 100) {
                    transactions = transactions.slice(0, 100);
                }
            }

            // Обновляем транзакции в базе данных
            const { data: updatedData, error: updateError } = await supabase
                .from('crypto_wallets')
                .update({ 
                    transactions: transactions,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_user_id', telegram_user_id)
                .select();

            if (updateError) {
                throw updateError;
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: "Transaction saved successfully",
                    transaction: transaction
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