import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const crypto = require('crypto');

// Функция для генерации случайной строки
function generateRandomString(length, includeSpecialChars = false) {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    if (includeSpecialChars) {
        chars += '!@#$%^&*()_-+=<>?';
    }
    
    let result = '';
    const charactersLength = chars.length;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Функция для генерации надежного логина и пароля
function generateCredentials() {
    // Логин: 8-12 символов, буквы и цифры
    const loginLength = Math.floor(Math.random() * 5) + 8; // 8-12 символов
    const login = generateRandomString(loginLength, false);
    
    // Пароль: 16-20 символов, с специальными символами
    const passwordLength = Math.floor(Math.random() * 5) + 16; // 16-20 символов
    const password = generateRandomString(passwordLength, true);
    
    return { login, password };
}

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

        const initData = requestBody.initData;
        let referralCode = null;

        const urlParams = new URLSearchParams(initData);
        const startParam = urlParams.get('start_param');

        if (startParam) {
            try {
                referralCode = startParam.replace('ref_', '');
            } catch (error) {
                // ignore error
            }
        }

        if (!initData) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "initData is missing in request body" }),
            };
        }

        const searchParams = new URLSearchParams(initData);
        const userStr = searchParams.get('user');
        const authDate = searchParams.get('auth_date');
        const hash = searchParams.get('hash');

        if (!userStr || !authDate || !hash) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Missing user, auth_date, or hash in initData" }),
            };
        }

        let user;
        try {
            user = JSON.parse(userStr);
        } catch (error) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Error parsing user JSON" }),
            };
        }

        const userId = user.id;
        const firstName = user.first_name;
        const lastName = user.last_name || "";
        const username = user.username;

        if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Environment variables not defined" }),
            };
        }

        const params = new URLSearchParams(initData);
        const entries = Array.from(params.entries());
        entries.sort((a, b) => a[0].localeCompare(b[0]));

        let dataCheckString = "";
        for (const [key, value] of entries) {
            if (key !== "hash") {
                dataCheckString += `${key}=${value}\n`;
            }
        }
        dataCheckString = dataCheckString.trim();

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Hash mismatch" }),
            };
        }

        const date = parseInt(authDate);
        const now = Math.floor(Date.now() / 1000);

        if (now - date > 86400) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ isValid: false }),
            };
        }

        let userDB;
        try {
            // Проверяем существование столбцов login и password
            const { data: tableInfo, error: tableError } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_name', 'crypto_wallets')
                .eq('table_schema', 'public')
                .in('column_name', ['login', 'password']);

            if (!tableError && tableInfo.length < 2) {
                // Столбцы не существуют, нужно их создать
                // Для этого нужны права администратора, используем service key
                console.log('Adding login and password columns to crypto_wallets table');
                
                // SQL запрос для добавления столбцов
                const { error: alterError } = await supabase.rpc('add_columns_if_not_exist', {
                    table_name: 'crypto_wallets',
                    column_definitions: [
                        { name: 'login', type: 'TEXT', default: 'NULL' },
                        { name: 'password', type: 'TEXT', default: 'NULL' }
                    ]
                });

                // Если функция RPC не существует, создаем столбцы через SQL
                if (alterError) {
                    console.log('RPC function not available, trying direct SQL');
                    // В Supabase можно выполнять SQL через rpc или использовать административные запросы
                    // Этот пример предполагает, что у вас есть права на выполнение SQL
                }
            }

            const { data: existingUser, error: selectError } = await supabase
                .from('crypto_wallets')
                .select('*')
                .eq('telegram_user_id', userId)
                .single();

            if (selectError && selectError.code === 'PGRST116') {
                // Создаем нового пользователя
                const { login, password } = generateCredentials();
                
                const newUser = {
                    telegram_user_id: userId,
                    username: username,
                    first_name: firstName,
                    last_name: lastName,
                    pin_code: null,
                    wallet_addresses: {},
                    token_balances: {},
                    transactions: [],
                    login: login,
                    password: password,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data: createdUser, error: insertError } = await supabase
                    .from('crypto_wallets')
                    .insert([newUser])
                    .select('*')
                    .single();

                if (insertError) {
                    console.error('Insert error:', insertError);
                    return {
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ isValid: false, error: "Failed to create user in crypto_wallets table" }),
                    };
                }

                userDB = createdUser;
                console.log(`New user created with login: ${login}`);
                
            } else if (selectError) {
                return {
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({ isValid: false, error: "Failed to find user in crypto_wallets table" }),
                };
            } else {
                // Пользователь существует, проверяем наличие логина и пароля
                userDB = existingUser;
                
                const updateData = {};
                let needUpdate = false;
                
                // Обновляем базовые данные если изменились
                if (userDB.username !== username) {
                    updateData.username = username;
                    needUpdate = true;
                }
                if (userDB.first_name !== firstName) {
                    updateData.first_name = firstName;
                    needUpdate = true;
                }
                if (userDB.last_name !== lastName) {
                    updateData.last_name = lastName;
                    needUpdate = true;
                }
                
                // Генерируем логин и пароль если их нет
                if (!userDB.login || !userDB.password) {
                    const { login, password } = generateCredentials();
                    updateData.login = login;
                    updateData.password = password;
                    needUpdate = true;
                    console.log(`Generated credentials for existing user ${userId}: login=${login}`);
                }
                
                if (needUpdate) {
                    updateData.updated_at = new Date().toISOString();
                    
                    const { data: updatedUser, error: updateError } = await supabase
                        .from('crypto_wallets')
                        .update(updateData)
                        .eq('telegram_user_id', userId)
                        .select('*')
                        .single();

                    if (!updateError) {
                        userDB = updatedUser;
                    }
                }
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    isValid: true, 
                    userData: userDB
                }),
            };

        } catch (dbError) {
            console.error('Database error:', dbError);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Database error" }),
            };
        }

    } catch (error) {
        console.error('General error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ isValid: false, error: error.message }),
        };
    }
};