/**
 * TOS/NSFW 修复模块
 * 用于自动接受 TOS 协议并启用 NSFW 内容
 */

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function encodeGrpcWebFrame(message: Uint8Array): Uint8Array {
  const out = new Uint8Array(5 + message.length);
  out[0] = 0; // uncompressed
  // big-endian message length
  out[1] = (message.length >>> 24) & 0xff;
  out[2] = (message.length >>> 16) & 0xff;
  out[3] = (message.length >>> 8) & 0xff;
  out[4] = message.length & 0xff;
  out.set(message, 5);
  return out;
}

const TOS_FRAME = encodeGrpcWebFrame(new Uint8Array([0x10, 0x01]));

const NSFW_MESSAGE = (() => {
  const prefix = new Uint8Array([0x0a, 0x02, 0x10, 0x01, 0x12, 0x1a, 0x0a, 0x18]);
  const key = new TextEncoder().encode("always_show_nsfw_content");
  const out = new Uint8Array(prefix.length + key.length);
  out.set(prefix, 0);
  out.set(key, prefix.length);
  return out;
})();
const NSFW_FRAME = encodeGrpcWebFrame(NSFW_MESSAGE);

function cookieHeader(parts: Record<string, string | null | undefined>): string {
  const items: string[] = [];
  for (const [k, v] of Object.entries(parts)) {
    const val = String(v ?? "").trim();
    if (!val) continue;
    items.push(`${k}=${val}`);
  }
  return items.join("; ");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function acceptTosVersion(args: {
  sso: string;
  sso_rw: string;
  cf_clearance?: string;
  user_agent?: string;
  timeout_ms?: number;
}): Promise<{ ok: boolean; status: number | null; grpc_status: string | null; error: string | null }> {
  const url = "https://accounts.x.ai/auth_mgmt.AuthManagement/SetTosAcceptedVersion";
  const userAgent = args.user_agent || DEFAULT_USER_AGENT;
  const cookie = cookieHeader({
    sso: args.sso,
    "sso-rw": args.sso_rw || args.sso,
    cf_clearance: args.cf_clearance,
  });

  const controller = new AbortController();
  const timeout = Math.max(1, args.timeout_ms ?? 15_000);
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/grpc-web+proto",
        origin: "https://accounts.x.ai",
        referer: "https://accounts.x.ai/accept-tos",
        "x-grpc-web": "1",
        "user-agent": userAgent,
        cookie,
      },
      body: toArrayBuffer(TOS_FRAME),
      signal: controller.signal,
    });

    const grpcStatus = res.headers.get("grpc-status");
    const ok = res.status === 200 && (grpcStatus === null || grpcStatus === "0");
    const error = ok
      ? null
      : res.status === 403
        ? "403 Forbidden"
        : res.status !== 200
          ? `HTTP ${res.status}`
          : grpcStatus && grpcStatus !== "0"
            ? `gRPC ${grpcStatus}`
            : "unknown";

    return { ok, status: res.status, grpc_status: grpcStatus, error };
  } catch (e) {
    return { ok: false, status: null, grpc_status: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function enableNsfw(args: {
  sso: string;
  sso_rw: string;
  cf_clearance?: string;
  user_agent?: string;
  timeout_ms?: number;
}): Promise<{ ok: boolean; status: number | null; grpc_status: string | null; error: string | null }> {
  const url = "https://grok.com/auth_mgmt.AuthManagement/UpdateUserFeatureControls";
  const userAgent = args.user_agent || DEFAULT_USER_AGENT;
  const cookie = cookieHeader({
    sso: args.sso,
    "sso-rw": args.sso_rw || args.sso,
    cf_clearance: args.cf_clearance,
  });

  const controller = new AbortController();
  const timeout = Math.max(1, args.timeout_ms ?? 15_000);
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/grpc-web+proto",
        origin: "https://grok.com",
        referer: "https://grok.com/?_s=data",
        "x-grpc-web": "1",
        "user-agent": userAgent,
        cookie,
      },
      body: toArrayBuffer(NSFW_FRAME),
      signal: controller.signal,
    });

    const grpcStatus = res.headers.get("grpc-status");
    const ok = res.status === 200 && (grpcStatus === null || grpcStatus === "0");
    const error = ok
      ? null
      : res.status === 403
        ? "403 Forbidden"
        : res.status !== 200
          ? `HTTP ${res.status}`
          : grpcStatus && grpcStatus !== "0"
            ? `gRPC ${grpcStatus}`
            : "unknown";

    return { ok, status: res.status, grpc_status: grpcStatus, error };
  } catch (e) {
    return { ok: false, status: null, grpc_status: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureTosAndNsfw(args: {
  token: string;
  cf_clearance?: string;
  user_agent?: string;
}): Promise<{ ok: boolean; tos_ok: boolean; nsfw_ok: boolean; error: string | null }> {
  const sso = (args.token || "").trim().replace(/^sso=/, "");
  if (!sso) return { ok: false, tos_ok: false, nsfw_ok: false, error: "missing sso token" };

  const tos = await acceptTosVersion({
    sso,
    sso_rw: sso,
    cf_clearance: (args.cf_clearance || "").trim(),
    ...(args.user_agent ? { user_agent: args.user_agent } : {}),
  });
  if (!tos.ok) return { ok: false, tos_ok: false, nsfw_ok: false, error: `accept_tos failed: ${tos.error || "unknown"}` };

  const nsfw = await enableNsfw({
    sso,
    sso_rw: sso,
    cf_clearance: (args.cf_clearance || "").trim(),
    ...(args.user_agent ? { user_agent: args.user_agent } : {}),
  });
  if (!nsfw.ok) return { ok: false, tos_ok: true, nsfw_ok: false, error: `enable_nsfw failed: ${nsfw.error || "unknown"}` };

  return { ok: true, tos_ok: true, nsfw_ok: true, error: null };
}
