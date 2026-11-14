import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";

// Empty POST is a transport diagnostic, not reproduction of the App request.
export function post(
  url,
  {
    timeoutMs = 12000,
    maxBytes = 1048576,
    body = Buffer.alloc(0),
    headers = {},
    onBody,
    profile = "empty-post-diagnostic",
    authenticated = false,
    signal,
  } = {},
) {
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid HTTP timeout');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>8*1048576)throw Error('Invalid HTTP response limit');
  if(signal && (typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw Error('Invalid AbortSignal');
  return new Promise((resolve) => {
    if (
      Object.keys(headers).some((name) =>
        /^(cookie|authorization|proxy-authorization)$/i.test(name),
      )
    )
      throw Error("Anonymous validator does not accept credentials");
    const started = Date.now();
    const result = {
      url,
      method: "POST",
      request_body_bytes: body.length,
      authenticated,
      request_profile: profile,
      dns_resolved: null,
      tcp_connected: false,
      tls_established: false,
      http_response_received: false,
    };
    let finished = false;
    const finish = (extra) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      resolve({ ...result, ...extra, elapsed_ms: Date.now() - started });
    };
    let request;
    const abort=()=>{
      if(finished)return;
      const e=Error('request-aborted');e.code='ABORT_ERR';
      finish({classification:result.http_response_received?'incomplete-response':'transport-failure',error:'ABORT_ERR',business_success:null});
      request?.destroy(e);
    };
    if(signal?.aborted){resolve({...result,classification:'transport-failure',error:'ABORT_ERR',business_success:null,elapsed_ms:Date.now()-started});return;}
    const target = new URL(url);
    if (target.username || target.password)
      throw Error("Anonymous validator does not accept URL credentials");
    if (target.protocol === "http:") result.tls_established = null;
    const transport = target.protocol === "https:" ? https : http;
    request = transport.request(
      target,
      {
        method: "POST",
        headers: {
          "User-Agent": "tieba-apis-validation/0.1",
          "Content-Length": String(body.length),
          ...headers,
        },
      },
      (response) => {
        result.http_response_received = true;
        result.tcp_connected = true;
        if (target.protocol === "https:")
          result.tls_established = response.socket.authorized;
        result.http_status = response.statusCode;
        result.content_type = response.headers["content-type"] ?? null;
        if(response.headers.location) {
          try { const redirect=new URL(response.headers.location,target); result.redirect_origin=redirect.origin; result.redirect_protocol=redirect.protocol; }
          catch { result.redirect_invalid=true; }
        }
        const hash = crypto.createHash("sha256");
        let total = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > maxBytes) {
            finish({
              classification: "incomplete-response",
              error: "response-size-limit",
              business_success: null,
            });
            response.destroy();
            request.destroy();
            return;
          }
          hash.update(chunk);
          chunks.push(chunk);
        });
        response.on("error", (error) =>
          finish({
            classification: "incomplete-response",
            error: error.code ?? error.message,
          }),
        );
        response.on("end", () => {
          if (finished) return;
          try {
            onBody?.(Buffer.concat(chunks));
          } catch (error) {
            finish({
              classification: "response-processing-failure",
              error: error.message,
              business_success: null,
            });
            return;
          }
          finish({
            classification: "response-received-unverified",
            response_bytes: total,
            response_sha256: hash.digest("hex"),
            business_success: null,
          });
        });
      },
    );
    const timer = setTimeout(
      () => request.destroy(Error("deadline-exceeded")),
      timeoutMs,
    );
    request.on("socket", (socket) => {
      result.connection_reused = request.reusedSocket;
      if (!socket.connecting) result.tcp_connected = true;
      if (target.protocol === "https:" && socket.authorized)
        result.tls_established = true;
      if (
        !socket.connecting &&
        (target.protocol !== "https:" || socket.authorized)
      )
        return;
      socket.once("lookup", (error) => {
        if (!error) result.dns_resolved = true;
      });
      socket.once("connect", () => (result.tcp_connected = true));
      socket.once(
        "secureConnect",
        () => (result.tls_established = socket.authorized),
      );
    });
    request.on("error", (error) =>
      finish({
        classification: result.http_response_received
          ? "incomplete-response"
          : "transport-failure",
        error: error.code ?? error.message,
        business_success: null,
      }),
    );
    signal?.addEventListener("abort",abort,{once:true});
    if(signal?.aborted)abort();
    request.end(body);
  });
}
