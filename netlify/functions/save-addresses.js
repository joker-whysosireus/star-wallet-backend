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
        const { telegram_user_id, wallet_addresses, is_testnet = false } = body;

        if (!telegram_user_id || !wallet_addresses) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing required fields' 
                }),
            };
        }

        console.log(`[SAVE-ADDRESSES] Saving ${is_testnet ? 'testnet' : 'mainnet'} addresses for user: ${telegram_user_id}`);

        // Сначала получаем текущие данные пользователя
        const { data: existingUser, error: fetchError } = await supabase
            .from('crypto_wallets')
            .select('*')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (fetchError) {
            console.error('Error fetching user:', fetchError);
            throw fetchError;
        }

        // Подготавливаем данные для обновления
        const updateData = {
            updated_at: new Date().toISOString(),
            is_testnet: is_testnet
        };

        // Сохраняем адреса в правильное поле в зависимости от сети
        if (is_testnet) {
            updateData.testnet_wallet_addresses = {
                ...(existingUser.testnet_wallet_addresses || {}),
                ...wallet_addresses
            };
            // Сохраняем mainnet адреса без изменений
            updateData.wallet_addresses = existingUser.wallet_addresses || {};
        } else {
            updateData.wallet_addresses = {
                ...(existingUser.wallet_addresses || {}),
                ...wallet_addresses
            };
            // Сохраняем testnet адреса без изменений
            updateData.testnet_wallet_addresses = existingUser.testnet_wallet_addresses || {};
        }

        console.log(`[SAVE-ADDRESSES] Update data:`, updateData);

        // Обновляем данные пользователя
        const { data, error } = await supabase
            .from('crypto_wallets')
            .update(updateData)
            .eq('telegram_user_id', telegram_user_id)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            throw error;
        }

        console.log(`[SAVE-ADDRESSES] Successfully saved ${is_testnet ? 'testnet' : 'mainnet'} addresses`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: data,
                message: `Addresses saved for ${is_testnet ? 'testnet' : 'mainnet'}`,
                saved_addresses: is_testnet ? data.testnet_wallet_addresses : data.wallet_addresses
            }),
        };

    } catch (error) {
        console.error('[SAVE-ADDRESSES] Error:', error);
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