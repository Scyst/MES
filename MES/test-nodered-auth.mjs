const tokenUrl = 'http://10.1.68.100:1886/auth/token';

async function main() {
  const params = new URLSearchParams();
  params.append('client_id', 'node-red-editor');
  params.append('grant_type', 'password');
  params.append('scope', '*');
  params.append('username', 'admin');
  params.append('password', 'oem2022');

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

main();
