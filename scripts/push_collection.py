"""Day file collection local len Postman (ghi de collection cung UID).

Chay: python3 scripts/push_collection.py [duong-dan-file.json]
Mac dinh: apis/TIB-031-order-date-range.postman_collection.json

File local la nguon chuan. Sua bang generator roi chay script nay de dong bo.
Can POSTMAN_API_KEY trong .env.
"""
import json, subprocess, sys

PROJ = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
POSTMAN_API = "https://api.getpostman.com"

# ten collection tren Postman -> UID. Them dong moi khi push collection khac.
UID_BY_NAME = {
    "TIB-031 — Order date range filter (staging)":
        "55935087-65e3e911-3698-45be-9433-e1bf3fc8cdb0",
}

env = {}
for line in open(PROJ + "/.env"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

key = env.get("POSTMAN_API_KEY", "").strip()
if not key:
    raise SystemExit("thieu POSTMAN_API_KEY trong .env")

path = sys.argv[1] if len(sys.argv) > 1 else \
    PROJ + "/apis/TIB-031-order-date-range.postman_collection.json"
col = json.load(open(path))
name = col["info"]["name"]

uid = UID_BY_NAME.get(name)
if not uid:
    raise SystemExit("chua biet UID cho collection '%s' - them vao UID_BY_NAME" % name)

n_req = sum(len(f.get("item", [])) for f in col["item"])
print("push '%s' -> %s" % (name, uid))
print("  %d folder, %d request, %d bien" % (len(col["item"]), n_req, len(col.get("variable", []))))

out = subprocess.run(["curl", "-s", "-w", "\n__H__%{http_code}", "-X", "PUT",
                      POSTMAN_API + "/collections/" + uid,
                      "-H", "X-Api-Key: " + key,
                      "-H", "Content-Type: application/json",
                      "-H", "Accept: application/json",
                      "-d", json.dumps({"collection": col})],
                     capture_output=True, text=True).stdout
body, _, code = out.rpartition("__H__")
if code.strip() == "200":
    print("  OK - da ghi de tren Postman")
else:
    print("  THAT BAI - HTTP", code.strip())
    print("  ", body[:400])
    raise SystemExit(1)

# doc lai de xac nhan
raw = subprocess.run(["curl", "-s", POSTMAN_API + "/collections/" + uid,
                      "-H", "X-Api-Key: " + key, "-H", "Accept: application/json"],
                     capture_output=True, text=True).stdout
got = json.loads(raw)["collection"]
g_req = sum(len(f.get("item", [])) for f in got.get("item", []))
print("  doc lai: %d folder, %d request" % (len(got.get("item", [])), g_req))
print("  khop file local:" , len(got.get("item", [])) == len(col["item"]) and g_req == n_req)
