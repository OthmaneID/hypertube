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


def find_first_video_file(torrent_info):
    """Find the first video file in the torrent"""
    video_extensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']

    for file in torrent_info.files():
        file_path = file.path.lower()
        if any(file_path.endswith(ext) for ext in video_extensions):
            return file

    return None


def parse_range_header(range_header: str, file_size: int):
    """Parse HTTP Range header (e.g., 'bytes=0-1023')"""
    # Format: "bytes=start-end"
    range_str = range_header.replace("bytes=", "")
    parts = range_str.split("-")

    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if parts[1] else file_size - 1

    return start, end


def pieces_downloaded(handle, start_piece, end_piece):
    """Check if all pieces in range are downloaded"""
    for i in range(start_piece, end_piece + 1):
        if not handle.have_piece(i):
            return False
    return True


def check_piece_available(handle, piece_index):
    """Check if a specific piece is downloaded"""
    try:
        return handle.have_piece(piece_index)
    except:
        return False



