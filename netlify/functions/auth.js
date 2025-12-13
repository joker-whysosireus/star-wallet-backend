import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Импортируем crypto для Node.js среды
const crypto = require('crypto');

exports.handler = async (event, context) => {
    console.log("auth.js: Function started");

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("auth.js: Handling OPTIONS request");
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        console.log("auth.js: event.body:", event.body);

        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
                console.log("auth.js: Request body:", requestBody);
            } catch (parseError) {
                console.error("auth.js: Error parsing JSON:", parseError);
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ isValid: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("auth.js: Request body is empty");
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
                console.log("auth.js: referralCode from start_param: " + referralCode);
            } catch (error) {
                console.error("auth.js: Error processing start_param: " + error);
            }
        }

        if (!initData) {
            console.warn("auth.js: initData is missing in request body");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "initData is missing in request body" }),
            };
        }

        console.log("auth.js: initData:", initData);

        const searchParams = new URLSearchParams(initData);
        const userStr = searchParams.get('user');
        const authDate = searchParams.get('auth_date');
        const hash = searchParams.get('hash');

        if (!userStr || !authDate || !hash) {
            console.warn("auth.js: Missing user, auth_date, or hash in initData");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Missing user, auth_date, or hash in initData" }),
            };
        }

        let user;
        try {
            user = JSON.parse(userStr);
            console.log("auth.js: Parsed user data:", user);
        } catch (error) {
            console.error("auth.js: Error parsing user JSON:", error);
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
        const avatarUrl = user.photo_url || null;

        console.log("auth.js: Extracted user data - userId:", userId, "firstName:", firstName, "lastName:", lastName, "username:", username, "avatarUrl:", avatarUrl);

        if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            console.error("auth.js: Environment variables not defined");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Environment variables not defined" }),
            };
        }

        // Верификация хэша с использованием Node.js crypto
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

        // Создаем secretKey как HMAC SHA256 от BOT_TOKEN с ключом "WebAppData"
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        
        // Вычисляем HMAC SHA256 от dataCheckString
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        console.log("auth.js: Calculated hash:", calculatedHash, "Provided hash:", hash);

        if (calculatedHash !== hash) {
            console.warn("auth.js: Hash mismatch - Calculated hash:", calculatedHash, "Provided hash:", hash);
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Hash mismatch" }),
            };
        }

        const date = parseInt(authDate);
        const now = Math.floor(Date.now() / 1000);

        if (now - date > 86400) {
            console.warn("auth.js: auth_date is too old");
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ isValid: false }),
            };
        }

        // Проверяем существование пользователя в таблице crypto_wallets
        let userDB;
        try {
            console.log("auth.js: Checking user in crypto_wallets table, telegram_user_id:", userId);
            
            const { data: existingUser, error: selectError } = await supabase
                .from('crypto_wallets')
                .select('*')
                .eq('telegram_user_id', userId)
                .single();

            if (selectError && selectError.code === 'PGRST116') {
                // Пользователь не найден, создаем нового
                console.log("auth.js: User not found, creating new user in crypto_wallets");
                
                const newUser = {
                    telegram_user_id: userId,
                    username: username,
                    first_name: firstName,
                    last_name: lastName,
                    avatar: avatarUrl,
                    pin_code: null,
                    wallet_addresses: {},
                    token_balances: {},
                    transactions: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                console.log("auth.js: Creating user in crypto_wallets table:", newUser);
                
                const { data: createdUser, error: insertError } = await supabase
                    .from('crypto_wallets')
                    .insert([newUser])
                    .select('*')
                    .single();

                if (insertError) {
                    console.error("auth.js: Error creating user in crypto_wallets table:", insertError);
                    return {
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ isValid: false, error: "Failed to create user in crypto_wallets table" }),
                    };
                }

                console.log("auth.js: User successfully created in crypto_wallets table:", createdUser);
                userDB = createdUser;
                
            } else if (selectError) {
                console.error("auth.js: Error finding user in crypto_wallets:", selectError);
                return {
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({ isValid: false, error: "Failed to find user in crypto_wallets table" }),
                };
            } else {
                console.log("auth.js: User found in crypto_wallets table:", existingUser);
                userDB = existingUser;
                
                // Обновляем данные пользователя если изменились
                const updateData = {};
                if (userDB.username !== username) {
                    updateData.username = username;
                }
                if (userDB.first_name !== firstName) {
                    updateData.first_name = firstName;
                }
                if (userDB.last_name !== lastName) {
                    updateData.last_name = lastName;
                }
                if (userDB.avatar !== avatarUrl) {
                    updateData.avatar = avatarUrl;
                }
                
                if (Object.keys(updateData).length > 0) {
                    updateData.updated_at = new Date().toISOString();
                    
                    const { data: updatedUser, error: updateError } = await supabase
                        .from('crypto_wallets')
                        .update(updateData)
                        .eq('telegram_user_id', userId)
                        .select('*')
                        .single();

                    if (!updateError) {
                        console.log("auth.js: User data updated successfully");
                        userDB = updatedUser;
                    } else {
                        console.error("auth.js: Error updating user data:", updateError);
                    }
                }
            }

            console.log("auth.js: Returning user data from crypto_wallets:", userDB);

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    isValid: true, 
                    userData: userDB
                }),
            };

        } catch (dbError) {
            console.error("auth.js: Database error:", dbError);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Database error: " + dbError.message }),
            };
        }

    } catch (error) {
        console.error("auth.js: Netlify Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ isValid: false, error: error.message }),
        };
    }
};