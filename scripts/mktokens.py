import json, subprocess, re, os

PROJ = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
ENV = PROJ + "/.env"
API = "https://staging-api.teeinblue.com"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")

env = {}
for line in open(ENV):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")


def login(email, pwd):
    out = subprocess.run(["curl", "-s", API + "/api/login", "-X", "POST",
                          "-H", "Content-Type: application/json", "-H", "Accept: application/json",
                          "-H", "User-Agent: " + UA,
                          "-H", "Origin: https://staging-portal.teeinblue.com",
                          "-H", "Referer: https://staging-portal.teeinblue.com/",
                          "-d", json.dumps({"email": email, "password": pwd})],
                         capture_output=True, text=True).stdout
    return json.loads(out)["token"]


def list_tokens(jwt):
    out = subprocess.run(["curl", "-s", API + "/api/tokens?per_page=100",
                          "-H", "Authorization: Bearer " + jwt,
                          "-H", "Accept: application/json", "-H", "User-Agent: " + UA],
                         capture_output=True, text=True).stdout
    return json.loads(out)["data"]


def delete_token(jwt, tid):
    subprocess.run(["curl", "-s", "-o", "/dev/null", "-X", "DELETE", API + "/api/tokens/" + str(tid),
                    "-H", "Authorization: Bearer " + jwt, "-H", "Accept: application/json",
                    "-H", "User-Agent: " + UA])


def mktoken(jwt, name, abilities):
    # xoa token cu cung ten de khong tich luy rac
    for t in list_tokens(jwt):
        if t["name"] == name:
            delete_token(jwt, t["id"])
            print("    (xoa token cu cung ten, id=%s)" % t["id"])
    out = subprocess.run(["curl", "-s", API + "/api/tokens", "-X", "POST",
                          "-H", "Authorization: Bearer " + jwt,
                          "-H", "Content-Type: application/json", "-H", "Accept: application/json",
                          "-H", "User-Agent: " + UA,
                          "-d", json.dumps({"name": name, "abilities": abilities})],
                         capture_output=True, text=True).stdout
    d = json.loads(out)
    if "plainTextToken" not in d:
        raise SystemExit("tao token that bai: " + out[:300])
    return d["plainTextToken"], d["accessToken"]["id"]


jwtA = login(env["TIB_USER_A_EMAIL"], env["TIB_USER_A_PASSWORD"])
jwtB = login(env["TIB_USER_B_EMAIL"], env["TIB_USER_B_PASSWORD"])
print("login A + B: OK")

specs = [
    ("TIB_API_TOKEN", jwtA, "QA openapi - full read (user A)",
     ["orders:read", "customizations:read", "campaigns:read", "products:read"]),
    ("TIB_ORDERS_READ_TOKEN", jwtA, "QA openapi - orders:read only (user A)",
     ["orders:read"]),
    ("TIB_CUSTOMIZATIONS_READ_TOKEN", jwtA, "QA openapi - customizations:read only (user A)",
     ["customizations:read"]),
    ("TIB_FORBIDDEN_TOKEN", jwtB, "QA openapi - cross-tenant (user B)",
     ["orders:read", "customizations:read"]),
]

values = {}
ids = {}
for key, jwt, name, ab in specs:
    pt, tid = mktoken(jwt, name, ab)
    values[key] = pt
    ids[key] = tid
    print("  %-32s id=%-4s abilities=%s" % (key, tid, ",".join(ab)))

values["TIB_INVALID_TOKEN"] = "invalid-token"
values["TIB_API_BASE"] = API
values["TIB_OPENAPI_BASE"] = API + "/openapi/v1"

BEGIN = "# >>> TIB Open API tokens (tu dong tao boi QA) >>>"
END = "# <<< TIB Open API tokens <<<"


def q(v):
    """Token co dang `118|abcdef` - ky tu | la pipe trong shell.

    Phai boc nhay kep, neu khong `. ./.env` se vo (command not found).
    """
    return '"%s"' % v

block = [BEGIN,
         "# Tao lai bang: python3 scripts/mktokens.py  (token cu cung ten se bi xoa truoc)",
         "# Token KHONG co han su dung. Xoa bang DELETE /api/tokens/{id} khi khong dung nua.",
         "# Ability hop le: orders:read orders:write customizations:read campaigns:read products:read mcp:access",
         "",
         "TIB_API_BASE=" + values["TIB_API_BASE"],
         "TIB_OPENAPI_BASE=" + values["TIB_OPENAPI_BASE"],
         "",
         "# User A - day du quyen doc (happy path)",
         "TIB_API_TOKEN=" + q(values["TIB_API_TOKEN"]),
         "",
         "# User A - chi orders:read (test gioi han scope)",
         "TIB_ORDERS_READ_TOKEN=" + q(values["TIB_ORDERS_READ_TOKEN"]),
         "",
         "# User A - chi customizations:read (test gioi han scope)",
         "TIB_CUSTOMIZATIONS_READ_TOKEN=" + q(values["TIB_CUSTOMIZATIONS_READ_TOKEN"]),
         "",
         "# User B - dung de test cross-tenant (phai bi tu choi khi tro vao data cua A)",
         "TIB_FORBIDDEN_TOKEN=" + q(values["TIB_FORBIDDEN_TOKEN"]),
         "",
         "# Token rac - test 401",
         "TIB_INVALID_TOKEN=" + q(values["TIB_INVALID_TOKEN"]),
         "",
         "# Postman sync - de trong thi script chi ghi .env, khong day len Postman",
         "# Lay key tai https://go.postman.co/settings/me/api-keys",
         "POSTMAN_API_KEY=" + env.get("POSTMAN_API_KEY", ""),
         "POSTMAN_ENV_ID=" + (env.get("POSTMAN_ENV_ID", "") or "8c4e7af8-4bdd-4074-961c-626282e1a2a9"),
         END]

content = open(ENV).read()
if BEGIN in content:
    content = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), "\n".join(block),
                     content, flags=re.S)
else:
    if not content.endswith("\n"):
        content += "\n"
    content += "\n" + "\n".join(block) + "\n"
open(ENV, "w").write(content)
print("\nda ghi vao .env")

# .env.example: cung key, khong co gia tri
ex = open(PROJ + "/.env.example").read()
ex_block = [BEGIN.replace("tu dong tao boi QA", "dien gia tri that vao .env"),
            "# Tao token bang POST /api/tokens voi {\"name\":\"...\",\"abilities\":[...]}",
            "# Gia tri plain CHI hien dung luc tao. Ability hop le:",
            "#   orders:read orders:write customizations:read campaigns:read products:read mcp:access",
            "",
            "TIB_API_BASE=https://staging-api.teeinblue.com",
            "TIB_OPENAPI_BASE=https://staging-api.teeinblue.com/openapi/v1",
            "",
            "TIB_API_TOKEN=",
            "TIB_ORDERS_READ_TOKEN=",
            "TIB_CUSTOMIZATIONS_READ_TOKEN=",
            "TIB_FORBIDDEN_TOKEN=",
            "TIB_INVALID_TOKEN=invalid-token",
            "",
            "# Postman sync (tuy chon) - co key thi script tu day token len environment",
            "# 'TIB Staging - Open API'. Lay key tai https://go.postman.co/settings/me/api-keys",
            "POSTMAN_API_KEY=",
            "POSTMAN_ENV_ID=8c4e7af8-4bdd-4074-961c-626282e1a2a9",
            END]
if BEGIN in ex:
    ex = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), "\n".join(ex_block), ex, flags=re.S)
else:
    if not ex.endswith("\n"):
        ex += "\n"
    ex += "\n" + "\n".join(ex_block) + "\n"
open(PROJ + "/.env.example", "w").write(ex)
print("da ghi vao .env.example")


# ---------------------------------------------------------------------------
# Dong bo len Postman environment "TIB Staging - Open API"
#
# Can POSTMAN_API_KEY trong .env (lay tai https://go.postman.co/settings/me/api-keys)
# va POSTMAN_ENV_ID (mac dinh la environment da tao san ben duoi).
# Neu thieu POSTMAN_API_KEY thi buoc nay duoc bo qua, .env van duoc cap nhat binh thuong.
# ---------------------------------------------------------------------------

POSTMAN_API = "https://api.getpostman.com"
DEFAULT_ENV_ID = "8c4e7af8-4bdd-4074-961c-626282e1a2a9"

# ten bien trong .env  ->  ten bien trong Postman environment
POSTMAN_MAP = {
    "TIB_API_TOKEN": ["api_token", "partnerToken"],
    "TIB_ORDERS_READ_TOKEN": ["orders_read_api_token"],
    "TIB_CUSTOMIZATIONS_READ_TOKEN": ["customizations_read_api_token"],
    "TIB_FORBIDDEN_TOKEN": ["forbidden_api_token"],
    "TIB_INVALID_TOKEN": ["invalid_api_token"],
}


def sync_postman(values, env):
    key = env.get("POSTMAN_API_KEY", "").strip()
    if not key:
        print("\nbo qua dong bo Postman: chua co POSTMAN_API_KEY trong .env")
        print("  them POSTMAN_API_KEY=<key> roi chay lai de tu day token len Postman")
        return

    env_id = env.get("POSTMAN_ENV_ID", "").strip() or DEFAULT_ENV_ID
    hdr = ["-H", "X-Api-Key: " + key, "-H", "Content-Type: application/json",
           "-H", "Accept: application/json"]

    raw = subprocess.run(["curl", "-s", POSTMAN_API + "/environments/" + env_id] + hdr,
                         capture_output=True, text=True).stdout
    try:
        cur = json.loads(raw)["environment"]
    except Exception:
        print("\ndong bo Postman THAT BAI khi doc environment:", raw[:200])
        return

    # goi ten -> gia tri moi
    newvals = {}
    for envkey, pmkeys in POSTMAN_MAP.items():
        if envkey in values:
            for pmkey in pmkeys:
                newvals[pmkey] = values[envkey]

    updated, missing = [], []
    for v in cur.get("values", []):
        if v.get("key") in newvals:
            v["value"] = newvals.pop(v["key"])
            v["enabled"] = True
            updated.append(v["key"])
    for k, val in newvals.items():
        cur.setdefault("values", []).append(
            {"key": k, "value": val, "type": "secret", "enabled": True})
        missing.append(k)

    body = json.dumps({"environment": {"name": cur.get("name"), "values": cur.get("values", [])}})
    out = subprocess.run(["curl", "-s", "-w", "\n__H__%{http_code}", "-X", "PUT",
                          POSTMAN_API + "/environments/" + env_id] + hdr + ["-d", body],
                         capture_output=True, text=True).stdout
    _, _, code = out.rpartition("__H__")
    if code.strip() == "200":
        print("\nda dong bo len Postman environment '%s'" % cur.get("name"))
        print("   cap nhat: " + ", ".join(sorted(updated)))
        if missing:
            print("   them moi: " + ", ".join(sorted(missing)))
    else:
        print("\ndong bo Postman THAT BAI - HTTP", code.strip(), out[:200])


sync_postman(values, env)
