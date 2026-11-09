"""
Read a claim from Python with genlayer-py 0.19.0rc2.

    python web/examples/read_claim.py <claim id>

Reads need an account even for views, so a throwaway one is made and never funded.
"""
import json
import sys

from genlayer_py import create_account, create_client
from genlayer_py.chains import studio_devnet

CONTRACT = json.load(open("web/lib/deployment.json"))["ratecard"]
studio_devnet.rpc_urls = {"default": {"http": ["https://studio-next.genlayer.com/api"]}}

client = create_client(chain=studio_devnet, account=create_account())
claim = json.loads(client.read_contract(address=CONTRACT, function_name="get_claim", args=[int(sys.argv[1])]))
print(json.dumps({k: claim[k] for k in ("found", "status", "reading1", "reading2", "tier", "pay", "appealed")}))
