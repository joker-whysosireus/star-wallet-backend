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
            ? 'https://api.blockchair.com/litecoin/testnet'
            : 'https://api.blockchair.com/litecoin';

        const apiKey = process.env.BLOCKCHAIR_API_KEY || '';
        const url = `${baseUrl}/dashboards/address/${address}${apiKey ? `?key=${apiKey}` : ''}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ balance: '0' }),
            };
        }

        const data = await response.json();
        
        let balance = '0';
        if (data.data && data.data[address] && data.data[address].address) {
            const balanceSatoshi = data.data[address].address.balance || 0;
            balance = (balanceSatoshi / 100_000_000).toString();
        }

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ balance }),
        };

    } catch (error) {
        console.error('LTC balance function error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: "Failed to fetch LTC balance",
                details: error.message 
            }),
        };
    }
};