export const handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
        const { address, network = 'mainnet' } = JSON.parse(event.body);
        
        if (!address) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ error: "Address is required" }),
            };
        }

        const baseUrl = network === 'testnet' 
            ? 'https://api.shasta.trongrid.io' 
            : 'https://api.trongrid.io';

        const response = await fetch(`${baseUrl}/v1/accounts/${address}`);
        
        if (!response.ok) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ balance: '0' }),
            };
        }

        const data = await response.json();
        
        let balance = '0';
        if (data.data && data.data.length > 0 && data.data[0].balance) {
            const balanceSUN = parseInt(data.data[0].balance);
            balance = (balanceSUN / 1_000_000).toFixed(6);
        }

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ balance }),
        };

    } catch (error) {
        console.error('TRON balance function error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: "Failed to fetch TRON balance",
                details: error.message 
            }),
        };
    }
};