import json, subprocess

PROJ = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
ENV = PROJ + "/.env"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")

env = {}
for line in open(ENV):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

base = env["TIB_OPENAPI_BASE"]


def probe(token, path):
    out = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", base + path,
                          "-H", "Authorization: Bearer " + token,
                          "-H", "Accept: application/json", "-H", "User-Agent: " + UA],
                         capture_output=True, text=True).stdout
    return out.strip()


paths = [("/orders?per_page=1", "orders"),
         ("/customizations?per_page=1", "customizations"),
         ("/products?per_page=1", "products")]

rows = [
    ("TIB_API_TOKEN", "200", "200", "200"),
    ("TIB_ORDERS_READ_TOKEN", "200", "200", "403"),
    ("TIB_CUSTOMIZATIONS_READ_TOKEN", "403", "200", "403"),
    ("TIB_FORBIDDEN_TOKEN", "200", "200", "403"),
    ("TIB_INVALID_TOKEN", "401", "401", "401"),
]

print("%-32s %-10s %-16s %-10s" % ("bien", "orders", "customizations", "products"))
print("-" * 74)
allok = True
for key, *expect in rows:
    tok = env.get(key)
    if not tok:
        print("%-32s THIEU TRONG .env" % key); allok = False; continue
    got = [probe(tok, p) for p, _ in paths]
    marks = []
    for g, e in zip(got, expect):
        ok = (g == e)
        allok &= ok
        marks.append("%s %s" % (g, "ok" if ok else "!= " + e))
    print("%-32s %-10s %-16s %-10s" % (key, marks[0], marks[1], marks[2]))

print()
print("TIB_API_BASE     =", env.get("TIB_API_BASE"))
print("TIB_OPENAPI_BASE =", env.get("TIB_OPENAPI_BASE"))
print("credentials cu con nguyen:",
      all(k in env for k in ("TIB_USER_A_EMAIL", "TIB_USER_A_PASSWORD",
                             "TIB_USER_B_EMAIL", "TIB_USER_B_PASSWORD",
                             "TIB_STAGING_EMAIL", "TIB_STAGING_PASSWORD")))
print("\nTAT CA DUNG KY VONG" if allok else "\nCO O KHONG KHOP - xem tren")
