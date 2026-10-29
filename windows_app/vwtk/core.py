# ============================================================
# VodiWalker Toolkit — core logic (no UI dependencies)
# پشتیبانی از: vless:// · vmess:// · trojan:// · ss:// · سابسکریپشن
# ============================================================

from __future__ import annotations

import base64
import json
import re
import socket
import ssl
import time
import uuid as uuidlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import parse_qs, unquote, urlparse

SUPPORTED_SCHEMES = ("vless", "vmess", "trojan", "ss")

PROTOCOL_LABELS = {
    "vless": "VLESS",
    "vmess": "VMess",
    "trojan": "Trojan",
    "ss": "Shadowsocks",
}

SECURITY_LABELS = {
    "tls": "TLS",
    "reality": "REALITY",
    "none": "—",
    "": "—",
    "xtls": "XTLS",
}

TRANSPORT_LABELS = {
    "tcp": "TCP",
    "ws": "WebSocket",
    "grpc": "gRPC",
    "h2": "HTTP/2",
    "http": "HTTP",
    "kcp": "mKCP",
    "quic": "QUIC",
    "xhttp": "XHTTP",
    "splithttp": "XHTTP",
    "": "—",
}


# ------------------------------------------------------------
# helpers
# ------------------------------------------------------------

def b64decode_forgiving(text: str) -> bytes:
    """base64 که url-safe و padding ناقص رو هم قبول کنه."""
    s = (text or "").strip().replace("\n", "").replace("\r", "").replace(" ", "")
    s += "=" * (-len(s) % 4)
    return base64.b64decode(s, altchars=b"-_")


def _intify(value, default: int = 0) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def _first(params: dict, *keys: str, default: str = "") -> str:
    for k in keys:
        v = params.get(k)
        if isinstance(v, (list, tuple)):
            v = v[0] if v else ""
        if v:
            return str(v)
    return default


def split_hostport(hostport: str) -> tuple[str, int]:
    hostport = (hostport or "").strip()
    if hostport.startswith("["):  # [::1]:443
        m = re.match(r"^\[([^\]]+)\]:(\d+)$", hostport)
        if m:
            return m.group(1), _intify(m.group(2), 443)
    if ":" in hostport:
        host, _, port = hostport.rpartition(":")
        if port.isdigit():
            return host, int(port)
    return hostport, 443


# ------------------------------------------------------------
# data model
# ------------------------------------------------------------

@dataclass
class Config:
    raw: str
    protocol: str
    name: str
    host: str
    port: int
    security: str = ""
    transport: str = "tcp"
    auth: str = ""           # uuid / password / method
    params: dict = field(default_factory=dict)

    @property
    def protocol_label(self) -> str:
        return PROTOCOL_LABELS.get(self.protocol, self.protocol.upper())

    @property
    def security_label(self) -> str:
        return SECURITY_LABELS.get((self.security or "").lower(), self.security.upper())

    @property
    def transport_label(self) -> str:
        return TRANSPORT_LABELS.get((self.transport or "").lower(), self.transport)

    @property
    def endpoint(self) -> str:
        return f"{self.host}:{self.port}"

    def details(self) -> list[tuple[str, str]]:
        """جزئیات نمایش‌دادنی به صورت (برچسب، مقدار)."""
        rows: list[tuple[str, str]] = [
            ("نام", self.name or "—"),
            ("پروتکل", self.protocol_label),
            ("آدرس سرور", self.host or "—"),
            ("پورت", str(self.port)),
            ("امنیت", self.security_label),
            ("ترنسپورت", self.transport_label),
        ]
        p = self.params
        extra = [
            ("UUID / رمز", self.auth, True),
            ("SNI (Server Name)", p.get("sni") or p.get("serverName"), False),
            ("Host", p.get("host"), False),
            ("مسیر (Path)", p.get("path"), False),
            ("Fingerprint", p.get("fp"), False),
            ("Flow", p.get("flow"), False),
            ("Public Key", p.get("pbk"), False),
            ("Short ID", p.get("sid"), False),
            ("ALPN", p.get("alpn"), False),
            ("Service Name", p.get("serviceName"), False),
            ("شبکه (Network)", p.get("net"), False),
            ("تأیید (Security)", p.get("tls"), False),
            ("سایر پارامترها", p.get("extra"), False),
        ]
        for label, value, long_value in extra:
            if not value:
                continue
            if not long_value and len(str(value)) > 90:
                value = str(value)[:87] + "…"
            rows.append((label, str(value)))
        return rows


# ------------------------------------------------------------
# parsers
# ------------------------------------------------------------

def _parse_uri(line: str) -> Optional[Config]:
    """vless:// و trojan://"""
    try:
        parsed = urlparse(line)
        auth = unquote(parsed.username or "")
        host = parsed.hostname or ""
        port = _intify(parsed.port, 443)
        if not host:
            return None
        q = parse_qs(parsed.query, keep_blank_values=True)
        transport = _first(q, "type", "net", default="tcp") or "tcp"
        security = _first(q, "security", "tls", default="")
        name = unquote(parsed.fragment) if parsed.fragment else host

        known = {"type", "security", "sni", "servername", "host", "path", "fp",
                 "flow", "pbk", "sid", "alpn", "servicename", "encryption",
                 "encryptionFlow", "mode", "headerType", "quicSecure", "quicEncryption"}
        extra = [f"{k}={v[0]}" for k, v in q.items()
                 if k.lower() not in {x.lower() for x in known} and v and v[0]]
        params = {
            "sni": _first(q, "sni", "serverName", "servername"),
            "host": _first(q, "host"),
            "path": unquote(_first(q, "path")),
            "fp": _first(q, "fp", "fingerprint"),
            "flow": _first(q, "flow"),
            "pbk": _first(q, "pbk", "publicKey"),
            "sid": _first(q, "sid", "shortId"),
            "alpn": _first(q, "alpn"),
            "serviceName": _first(q, "serviceName", "servicename"),
            "extra": " · ".join(extra),
        }
        proto = parsed.scheme.lower()
        return Config(raw=line, protocol=proto, name=name, host=host, port=port,
                      security=security, transport=transport, auth=auth, params=params)
    except Exception:
        return None


def _parse_vmess(line: str) -> Optional[Config]:
    """vmess://base64(json)"""
    try:
        payload = line.split("://", 1)[1]
        data = json.loads(b64decode_forgiving(payload).decode("utf-8", "replace"))
        host = str(data.get("add", "")).strip()
        if not host:
            return None
        port = _intify(data.get("port"), 443)
        name = str(data.get("ps") or host)
        transport = str(data.get("net") or "tcp") or "tcp"
        security = str(data.get("tls") or "")
        params = {
            "sni": str(data.get("sni") or ""),
            "host": str(data.get("host") or ""),
            "path": str(data.get("path") or ""),
            "fp": str(data.get("fp") or ""),
            "alpn": str(data.get("alpn") or ""),
            "net": str(data.get("net") or ""),
            "tls": str(data.get("tls") or ""),
            "extra": " · ".join(
                f"{k}={data[k]}"
                for k in ("v", "aid", "scy", "type", "psk", "serverName")
                if data.get(k) not in (None, "")
            ),
        }
        return Config(raw=line, protocol="vmess", name=name, host=host, port=port,
                      security=security, transport=transport,
                      auth=str(data.get("id") or ""), params=params)
    except Exception:
        return None


def _parse_ss(line: str) -> Optional[Config]:
    """ss:// — هر دو فرمت SIP002 و قدیمی"""
    try:
        body = line[5:]
        name = ""
        if "#" in body:
            body, frag = body.split("#", 1)
            name = unquote(frag)
        body = body.split("?", 1)[0]
        method_pass = ""
        hostport = ""
        if "@" in body:
            userinfo, hostport = body.rsplit("@", 1)
            try:
                method_pass = b64decode_forgiving(userinfo).decode("utf-8", "replace")
            except Exception:
                method_pass = unquote(userinfo)
        else:
            decoded = b64decode_forgiving(body).decode("utf-8", "replace")
            if "@" not in decoded:
                return None
            method_pass, hostport = decoded.rsplit("@", 1)
        host, port = split_hostport(hostport)
        if not host:
            return None
        method, _, password = method_pass.partition(":")
        return Config(raw=line, protocol="ss", name=name or host, host=host, port=port,
                      security="", transport="tcp",
                      auth=(f"{method}:{password}" if password else method),
                      params={"extra": f"method={method}"})
    except Exception:
        return None


def parse_link(line: str) -> Optional[Config]:
    line = (line or "").strip()
    if not line or line.startswith("#"):
        return None
    scheme, sep, _ = line.partition("://")
    if not sep:
        return None
    scheme = scheme.lower()
    if scheme == "vless" or scheme == "trojan":
        return _parse_uri(line)
    if scheme == "vmess":
        return _parse_vmess(line)
    if scheme == "ss":
        return _parse_ss(line)
    return None


def _looks_like_links(text: str) -> bool:
    return any(f"{s}://" in text for s in SUPPORTED_SCHEMES)


def parse_input(text: str) -> tuple[list[Config], list[str]]:
    """هر متنی: تک لینک، چند لینک، یا سابسکریپشن base64 → لیست کانفیگ + خطاها."""
    text = (text or "").strip()
    configs: list[Config] = []
    errors: list[str] = []
    if not text:
        return configs, errors

    # سابسکریپشن: متن بدون لینک که base64 قابل‌گشایی است
    if not _looks_like_links(text):
        try:
            decoded = b64decode_forgiving(text).decode("utf-8", "replace")
            if _looks_like_links(decoded):
                text = decoded
        except Exception:
            errors.append("متن واردشده نه لینک معتبر است و نه سابسکریپشن قابل‌گشایی.")
            return configs, errors

    seen: set[str] = set()
    for raw_line in re.split(r"[\r\n]+", text):
        raw_line = raw_line.strip()
        if not raw_line or raw_line.startswith("#"):
            continue
        # ممکن است چند لینک در یک خط با فاصله جدا شده باشند
        chunks = re.split(r"\s+(?=[a-zA-Z][a-zA-Z0-9+.-]*://)", raw_line) if " " in raw_line else [raw_line]
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            cfg = parse_link(chunk)
            if cfg is None:
                if "://" in chunk:
                    errors.append(chunk[:80] + ("…" if len(chunk) > 80 else ""))
                continue
            if cfg.raw in seen:
                continue
            seen.add(cfg.raw)
            configs.append(cfg)

    if not configs and not errors:
        errors.append("هیچ لینک قابل‌پردازشی پیدا نشد.")
    return configs, errors


# ------------------------------------------------------------
# QR
# ------------------------------------------------------------

def qr_png_bytes(data: str, box_size: int = 10, border: int = 2) -> bytes:
    import io

    import qrcode
    from PIL import Image

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=box_size, border=border)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0a0f1c", back_color="white")
    if not isinstance(img, Image.Image):  # qrcode>=7 returns PIL image already
        img = img.get_image() if hasattr(img, "get_image") else img
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


# ------------------------------------------------------------
# connection test
# ------------------------------------------------------------

def test_endpoint(host: str, port: int, timeout: float = 5.0,
                  check_tls: bool = False) -> dict:
    """
    تست اتصال TCP و (در صورت نیاز) handshake تصادفی TLS.
    خروجی: {ok, tcp_ms, tls_ms, error}
    """
    result = {"ok": False, "tcp_ms": None, "tls_ms": None, "error": ""}
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        result["error"] = "dns"
        return result
    if not infos:
        result["error"] = "dns"
        return result

    last_error = "timeout"
    for family, stype, proto, _canon, sockaddr in infos:
        t0 = time.perf_counter()
        try:
            sock = socket.socket(family, stype, proto)
            sock.settimeout(timeout)
            sock.connect(sockaddr)
        except (socket.timeout, TimeoutError):
            last_error = "timeout"
            continue
        except ConnectionRefusedError:
            last_error = "refused"
            continue
        except OSError:
            last_error = "unreachable"
            continue
        tcp_ms = (time.perf_counter() - t0) * 1000.0
        result["ok"] = True
        result["tcp_ms"] = round(tcp_ms, 1)
        if check_tls:
            try:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                t1 = time.perf_counter()
                with ctx.wrap_socket(sock, server_hostname=host) as tls_sock:
                    tls_sock.settimeout(timeout)
                    tls_sock.do_handshake() if hasattr(tls_sock, "do_handshake") else None
                result["tls_ms"] = round((time.perf_counter() - t1) * 1000.0, 1)
            except Exception:
                result["tls_ms"] = None
            finally:
                try:
                    sock.close()
                except Exception:
                    pass
        else:
            try:
                sock.close()
            except Exception:
                pass
        return result

    result["error"] = last_error
    return result


def test_many(configs: list[Config], timeout: float = 5.0, max_workers: int = 8,
              cancel_event: Optional["threading.Event"] = None,
              on_result=None) -> list[dict]:
    """
    تست هم‌زمان چند کانفیگ.
    on_result(index, result) به‌ازای هر نتیجه فراخوانی می‌شود.
    """
    import threading  # noqa: F401  (فقط برای type)

    results: list[dict] = [{} for _ in configs]
    if not configs:
        return results
    workers = min(max_workers, len(configs))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {}
        for i, cfg in enumerate(configs):
            if cancel_event is not None and cancel_event.is_set():
                break
            check_tls = (cfg.security or "").lower() in ("tls", "reality", "xtls")
            fut = pool.submit(test_endpoint, cfg.host, cfg.port, timeout, check_tls)
            future_map[fut] = i
        for fut in as_completed(future_map):
            if cancel_event is not None and cancel_event.is_set():
                for pending in future_map:
                    pending.cancel()
            if fut.cancelled():
                continue
            idx = future_map[fut]
            try:
                res = fut.result()
            except Exception:
                res = {"ok": False, "tcp_ms": None, "tls_ms": None, "error": "internal"}
            results[idx] = res
            if on_result is not None:
                on_result(idx, res)
    return results


# ------------------------------------------------------------
# utilities
# ------------------------------------------------------------

def new_uuid() -> str:
    return str(uuidlib.uuid4())


def b64_encode_text(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def b64_decode_text(text: str) -> str:
    return b64decode_forgiving(text).decode("utf-8", "replace")
