import fetch from 'node-fetch';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_URL = 'https://kailee-chorial-toshiko.ngrok-free.dev';
  const API_KEY = '45870e1601976950e57a5119f551465dd6ca016c87771dcdc4e5b978075ff727';

  const { endpoint, ...query } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Falta el parámetro endpoint' });
  }

  const queryString = new URLSearchParams(query as Record<string, string>).toString();
  const targetUrl = `${API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'X-API-Key': API_KEY,
        'ngrok-skip-browser-warning': 'true',
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error en proxy PTT:', error);
    return res.status(500).json({ error: 'Error al conectar con la API de PTT' });
  }
}