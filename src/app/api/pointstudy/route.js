// Simple in-memory token cache
let cachedToken = null;
let tokenExpiry = null;
const baseURL = process.env.API_BASEURL;

async function authenticate() {
  const url = `${baseURL}/authenticate`;
  const data = {
    ClientName: process.env.CLIENT_NAME,
    LicenseKey: process.env.LICENSE_KEY,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (res.ok && json.Token) {
    cachedToken = json.Token;
    // Set a 1 hr expiry
    tokenExpiry = Date.now() + 3600 * 1000;
    return cachedToken;
  }
  throw new Error(json.error || 'Authentication failed');
}

async function getToken() {
  // Re-authenticate if token is missing or expired
  if (!cachedToken || (tokenExpiry && Date.now() > tokenExpiry)) {
    await authenticate();
  }
  return cachedToken;
}

export async function POST(request) {
  try {

    const token = await getToken();
    console.log('Got token successfully');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const res = await fetch(`${baseURL}/api/v1/pointstudy?audit=no`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    
    const json = await res.json();
    
    return new Response(JSON.stringify(json), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in POST handler:', err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}