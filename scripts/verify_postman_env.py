"""Doi chieu environment tren Postman voi .env: gia tri co len toi noi va co khop khong.

Chay: python3 scripts/verify_postman_env.py
Khong in ra gia tri token - chi in do dai + hash rut gon de so sanh.
"""
import json, subprocess, hashlib

PROJ = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
POSTMAN_API = "https://api.getpostman.com"
DEFAULT_ENV_ID = "8c4e7af8-4bdd-4074-961c-626282e1a2a9"

env = {}
for line in open(PROJ + "/.env"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

key = env.get("POSTMAN_API_KEY", "").strip()
if not key:
    raise SystemExit("thieu POSTMAN_API_KEY trong .env")
env_id = env.get("POSTMAN_ENV_ID", "").strip() or DEFAULT_ENV_ID

raw = subprocess.run(["curl", "-s", POSTMAN_API + "/environments/" + env_id,
                      "-H", "X-Api-Key: " + key, "-H", "Accept: application/json"],
                     capture_output=True, text=True).stdout
try:
    e = json.loads(raw)["environment"]
except Exception:
    raise SystemExit("khong doc duoc environment: " + raw[:300])

print("environment:", e.get("name"), "| id:", env_id)
print()

# ten Postman -> ten .env
PAIRS = {
    "api_token": "TIB_API_TOKEN",
    "partnerToken": "TIB_API_TOKEN",
    "orders_read_api_token": "TIB_ORDERS_READ_TOKEN",
    "customizations_read_api_token": "TIB_CUSTOMIZATIONS_READ_TOKEN",
    "forbidden_api_token": "TIB_FORBIDDEN_TOKEN",
    "invalid_api_token": "TIB_INVALID_TOKEN",
}


def fp(s):
    return hashlib.sha256(s.encode()).hexdigest()[:10] if s else "(rong)"


pm = {v["key"]: v for v in e.get("values", [])}
print("%-32s %-8s %-12s %-12s %s" % ("bien Postman", "type", "postman", ".env", "khop"))
print("-" * 82)
allok = True
for pmkey, envkey in PAIRS.items():
    v = pm.get(pmkey)
    if v is None:
        print("%-32s THIEU tren Postman" % pmkey); allok = False; continue
    pval = v.get("value") or ""
    eval_ = env.get(envkey, "")
    ok = bool(pval) and pval == eval_
    allok &= ok
    print("%-32s %-8s %-12s %-12s %s" % (pmkey, v.get("type", "?"), fp(pval), fp(eval_),
                                         "ok" if ok else ("LECH" if pval else "RONG")))

print()
plain = [v["key"] for v in e.get("values", []) if v.get("type") != "secret"
         and v["key"] not in PAIRS]
print("bien plain khac:", ", ".join(sorted(plain)))
print("\nPOSTMAN KHOP .env" if allok else "\nCO O LECH - xem tren")
