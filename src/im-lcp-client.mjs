import tls from "node:tls";
import { intField, bytesField } from "./protobuf.mjs";
import { encodeLcpRequest, encodeLcpLogin, LcpFrameStream } from "./im-protocol.mjs";

// No logging or automatic replay: response bodies can contain account identifiers and cookies.
export class ImLcpClient {
  constructor({ device, bootstrap, onFrame, timeoutMs = 12000 }) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw Error("Invalid IM timeout");
    this.device = device;
    this.bootstrap = bootstrap;
    this.onFrame = onFrame;
    this.timeoutMs = timeoutMs;
    this.pending = new Map();
    this.stream = new LcpFrameStream();
    this.sequence = BigInt(Date.now()) * 1000n;
    this.closed = false;
  }

  async connect() {
    if (this.socket || this.closed) throw Error("Create a separate client for each connection");
    const route = this.bootstrap.protocols?.find((p) => p.protocol === "tls" && p.domain === "common.lcs.baidu.com" && String(p.port) === "443");
    if (!route || String(this.bootstrap.error_code) !== "0" || typeof this.bootstrap.token !== "string" || !this.bootstrap.token)
      throw Error("Unreviewed or incomplete LCP bootstrap");
    this.socket = tls.connect({ host: route.domain, port: 443, servername: route.domain, rejectUnauthorized: true });
    this.socket.on("data", (chunk) => {
      try {
        for (const frame of this.stream.push(chunk)) {
          this.onFrame?.(frame);
          const pending = this.pending.get(frame.log_id);
          if (pending && frame.kind === "response") {
            this.pending.delete(frame.log_id);
            clearTimeout(pending.timer);
            pending.resolve(frame);
          }
        }
      } catch (error) { this.close(error); }
    });
    this.socket.on("error", (error) => this.close(error));
    this.socket.on("close", () => { if (!this.closed) this.close(Error("LCP connection closed")); });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { this.socket.destroy(); reject(Error("LCP TLS connection timeout")); }, this.timeoutMs);
        this.socket.once("secureConnect", () => { clearTimeout(timer); resolve(); });
        this.socket.once("error", (error) => { clearTimeout(timer); reject(error); });
        this.socket.once("close", () => { clearTimeout(timer); reject(Error("LCP closed before TLS handshake")); });
      });
      this.tlsVerified = this.socket.authorized;
      const response = await this.request(1, 1, (logId) => encodeLcpLogin({ logId, token: this.bootstrap.token, cuid: this.device.cuid, timestampMs: Date.now() }));
      if (response.rpc_error_code !== "0" || response.lcm_response?.error_code !== "0") throw Error("LCP authentication rejected");
      const serverInterval = Number(response.lcm_response.next_interval_ms) || 20000;
      const interval = Math.min(30000, Math.max(5000, serverInterval));
      this.heartbeat = setInterval(() => {
        this.request(1, 3, (logId) => bytesField(1, Buffer.concat([intField(1, logId), intField(4, Date.now())])))
          .catch((error) => this.close(error));
      }, interval);
      this.heartbeat.unref();
      return response;
    } catch (error) { this.close(error); throw error; }
  }

  request(service, method, value) {
    if (!this.socket || this.socket.destroyed || this.closed) throw Error("LCP socket unavailable");
    if (this.pending.size >= 16) throw Error("LCP pending request limit");
    const logId = String(++this.sequence);
    const body = typeof value === "function" ? value(logId) : Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
    const packet = encodeLcpRequest({ service, method, logId, body });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(logId); reject(Error("LCP response timeout; read back state before retrying a write")); }, this.timeoutMs);
      this.pending.set(logId, { resolve, reject, timer });
      this.socket.write(packet, (error) => {
        if (error) { clearTimeout(timer); this.pending.delete(logId); reject(error); }
      });
    });
  }

  close(error = Error("LCP client closed")) {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeat);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
    this.socket?.destroy();
  }
}
