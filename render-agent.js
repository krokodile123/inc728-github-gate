const http = require('http');

const PORT = process.env.PORT || 10000;
const AUTHORITY_URL = process.env.AUTHORITY_URL;
const AGENT_TOKEN = process.env.AGENT_TOKEN;

async function handleAttempt(req, res, url) {
  if (!AUTHORITY_URL || !AGENT_TOKEN) {
    res.writeHead(500, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:false,error:'agent_not_configured'}));
  }

  const idempotencyKey = url.searchParams.get('key') || `render-${Date.now()}`;
  try {
    const response = await fetch(AUTHORITY_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${AGENT_TOKEN}`,
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({
        mandateId: 'INC-728',
        principal: 'render-agent-b',
        action: 'RENDER_REDEPLOY',
        resource: 'inc728-p2-control-root'
      })
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch { body = {raw:text}; }
    const decision = body.decision || body.result || body.status || null;
    res.writeHead(response.ok ? 200 : response.status, {'content-type':'application/json'});
    return res.end(JSON.stringify({
      ok: response.ok,
      authorityHttpStatus: response.status,
      decision,
      downstreamExecutionPermitted: decision === 'ALLOW',
      authority: body
    }));
  } catch (err) {
    res.writeHead(502, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:false,error:'authority_unreachable'}));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/health') {
    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:true,principal:'render-agent-b'}));
  }
  if (url.pathname === '/attempt' && req.method === 'GET') {
    return handleAttempt(req, res, url);
  }
  res.writeHead(404, {'content-type':'application/json'});
  res.end(JSON.stringify({ok:false,error:'not_found'}));
});

server.listen(PORT, '0.0.0.0');
