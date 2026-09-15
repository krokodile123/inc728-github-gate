const http = require('http');

const PORT = process.env.PORT || 10000;
const AUTHORITY_URL = process.env.AUTHORITY_URL;
const AGENT_TOKEN = process.env.AGENT_TOKEN;
const RENDER_DEPLOY_HOOK_URL = process.env.RENDER_DEPLOY_HOOK_URL;

async function parseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {raw: text}; }
}

async function handleAttempt(req, res, url) {
  if (!AUTHORITY_URL || !AGENT_TOKEN || !RENDER_DEPLOY_HOOK_URL) {
    res.writeHead(500, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:false,error:'agent_not_configured'}));
  }

  const idempotencyKey = url.searchParams.get('key') || `render-p25-${Date.now()}`;

  try {
    const authorityResponse = await fetch(AUTHORITY_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${AGENT_TOKEN}`,
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({
        mandateId: 'INC-P25',
        principal: 'render-agent-b',
        action: 'RENDER_REDEPLOY',
        resource: 'inc728-p2-control-root'
      })
    });

    const authorityBody = await parseBody(authorityResponse);
    const decision = authorityBody.decision || authorityBody.result || authorityBody.status || null;

    if (!authorityResponse.ok) {
      res.writeHead(authorityResponse.status, {'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:false,
        authorityHttpStatus:authorityResponse.status,
        decision,
        downstreamExecutionPermitted:false,
        downstreamInvoked:false,
        authority:authorityBody
      }));
    }

    if (decision !== 'ALLOW') {
      res.writeHead(200, {'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:true,
        authorityHttpStatus:authorityResponse.status,
        decision,
        downstreamExecutionPermitted:false,
        downstreamInvoked:false,
        authority:authorityBody
      }));
    }

    const deployResponse = await fetch(RENDER_DEPLOY_HOOK_URL, {method:'POST'});
    const deployBody = await parseBody(deployResponse);

    if (!deployResponse.ok) {
      res.writeHead(502, {'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:false,
        authorityHttpStatus:authorityResponse.status,
        decision,
        downstreamExecutionPermitted:true,
        downstreamInvoked:true,
        downstreamHttpStatus:deployResponse.status,
        error:'render_deploy_failed',
        authority:authorityBody
      }));
    }

    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({
      ok:true,
      authorityHttpStatus:authorityResponse.status,
      decision,
      downstreamExecutionPermitted:true,
      downstreamInvoked:true,
      downstreamHttpStatus:deployResponse.status,
      downstreamDeployId:deployBody.id || deployBody.deployId || null,
      authority:authorityBody
    }));
  } catch (err) {
    res.writeHead(502, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:false,error:'p25_attempt_failed'}));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/health') {
    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({
      ok:true,
      principal:'render-agent-b',
      mandate:'INC-P25',
      deployHookConfigured:Boolean(RENDER_DEPLOY_HOOK_URL)
    }));
  }
  if (url.pathname === '/attempt' && req.method === 'GET') {
    return handleAttempt(req, res, url);
  }
  res.writeHead(404, {'content-type':'application/json'});
  res.end(JSON.stringify({ok:false,error:'not_found'}));
});

server.listen(PORT, '0.0.0.0');
