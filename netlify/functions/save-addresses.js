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
        const { 
            telegram_user_id, 
            wallet_addresses, 
            testnet_wallets 
        } = body;

        if (!telegram_user_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing telegram_user_id' 
                }),
            };
        }

        // Проверяем существование пользователя
        const { data: existingUser, error: fetchError } = await supabase
            .from('crypto_wallets')
            .select('*')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        let result;
        
        if (fetchError || !existingUser) {
            // Создаем нового пользователя
            const newUserData = {
                telegram_user_id,
                wallet_addresses: wallet_addresses || {},
                testnet_wallets: testnet_wallets || {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('crypto_wallets')
                .insert([newUserData])
                .select()
                .single();
                
            if (error) throw error;
            result = data;
        } else {
            // Обновляем существующего пользователя
            const updateData = {
                wallet_addresses: wallet_addresses || existingUser.wallet_addresses || {},
                testnet_wallets: testnet_wallets || existingUser.testnet_wallets || {},
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('crypto_wallets')
                .update(updateData)
                .eq('telegram_user_id', telegram_user_id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: result,
                message: 'Addresses saved successfully',
                mainnet_count: Object.keys(wallet_addresses || {}).length,
                testnet_count: Object.keys(testnet_wallets || {}).length
            }),
        };

    } catch (error) {
        console.error('Error saving addresses:', error);
        
        // Подробное логирование ошибки для отладки
        const errorDetails = {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        };
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Internal server error',
                details: errorDetails
            }),
        };
    }
};