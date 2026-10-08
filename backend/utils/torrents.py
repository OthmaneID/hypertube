import httpx2
import libtorrent
import os


def generate_peer_id():
    return b'-HT0001-' + os.urandom(12)

async def get_trackers() :
  trackers_api = "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt"
  try:
      async with httpx2.AsyncClient() as client:
          res = await client.get(trackers_api)
      # The API returns plain text with one tracker per line
      trackers = res.text.strip().split('\n')
      return [t.strip() for t in trackers if t.strip()]
  except Exception as e:
      print("error while getting trackers : ", e)
      return []


async def get_peers(trackers: list): 
    try:
        pass
    except Exception as e:
        print("error while getting peers : ", e)
        return []


#  info_hash, key, peer_id, port, downloaded, left, uploaded, compact



