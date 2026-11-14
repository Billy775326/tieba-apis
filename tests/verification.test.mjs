import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { probe } from "../scripts/verify-read-api.mjs";
async function fixture(t, handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return `http://127.0.0.1:${server.address().port}/read`;
}
test("HTTP 200 with a business error is never promoted to API success", async (t) => {
  const url = await fixture(t, (req, res) => {
    assert.equal(req.method, "POST");
    assert.equal(req.headers.cookie, undefined);
    res.setHeader("Content-Type", "application/json");
    res.end('{"error_code":4}');
  });
  const r = await probe(url);
  assert.equal(r.http_status, 200);
  assert.equal(r.business_success, null);
  assert.equal(r.classification, "response-received-unverified");
});
test("a silent server is bounded by an overall deadline", async (t) => {
  const url = await fixture(t, () => {});
  const r = await probe(url, { timeoutMs: 40 });
  assert.equal(r.classification, "transport-failure");
  assert.equal(r.http_response_received, false);
  assert.equal(r.error, "deadline-exceeded");
  assert.equal(r.business_success, null);
});
test("an oversized response is incomplete rather than successful", async (t) => {
  const url = await fixture(t, (req, res) => res.end("oversized"));
  const r = await probe(url, { maxBytes: 2 });
  assert.equal(r.classification, "incomplete-response");
  assert.equal(r.business_success, null);
});
test("anonymous validation refuses credentials before contacting the server", async (t) => {
  let received = false;
  const url = await fixture(t, (req, res) => {
    received = true;
    res.end();
  });
  await assert.rejects(
    probe(url, { headers: { Cookie: "test-only" } }),
    /does not accept credentials/,
  );
  assert.equal(received, false);
});
test("connection metadata remains accurate when an HTTP socket is reused", async (t) => {
  const url = await fixture(t, (req, res) => res.end("ok"));
  await probe(url);
  const r = await probe(url);
  assert.equal(r.http_response_received, true);
  assert.equal(r.tcp_connected, true);
  assert.equal(r.tls_established, null);
});
test("local response processing errors are reported separately from transport", async (t) => {
  const url = await fixture(t, (req, res) => res.end("ok"));
  const r = await probe(url, {
    onBody: () => {
      throw Error("fixture storage failure");
    },
  });
  assert.equal(r.classification, "response-processing-failure");
  assert.equal(r.business_success, null);
});

test("redirect diagnostics omit query secrets and never follow the target", async (t) => {
  let requests=0;
  const url=await fixture(t,(req,res)=>{requests++;res.writeHead(302,{Location:"https://passport.baidu.com/login?token=fixture-secret"});res.end("moved");});
  const r=await probe(url);
  assert.equal(r.http_status,302);
  assert.equal(r.redirect_origin,"https://passport.baidu.com");
  assert.equal(r.redirect_protocol,"https:");
  assert(!JSON.stringify(r).includes("fixture-secret"));
  assert.equal(requests,1);
});
