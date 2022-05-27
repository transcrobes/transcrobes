import http.client
import json
import sys
import urllib.parse

site = sys.argv[1]
username = sys.argv[2]
password = sys.argv[3]
reload_path = sys.argv[4]

if site == "localhost":
    conn = http.client.HTTPConnection(site)
else:
    conn = http.client.HTTPSConnection(site)

params = urllib.parse.urlencode({"username": username, "password": password})

headers = {"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain"}

conn.request("POST", "/api/v1/login/access-token", params, headers)

response = conn.getresponse()
data = json.loads(response.read().decode("utf-8"))
access_token = data["access_token"]
print(response.status, response.reason, access_token)

headers = {"Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + access_token}

with open(reload_path, "r") as f:
    events = f.read()

conn.request("POST", "/api/v1/data/reload_events", events, headers)

response = conn.getresponse()
data = response.read()
print(response.status, response.reason, data)
conn.close()
