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


VIDEO_EXTENSIONS = ('.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v')


def select_video_file(torrent_info, file_idx=None, filename=None):
    """Return the index of the requested file, or None if it can't be identified.

    In season packs the first video is usually episode 1, so guessing is only
    allowed when the torrent holds a single video file.
    """
    files = torrent_info.layout()
    num_files = files.num_files()

    def base_name(i):
        return os.path.basename(files.file_path(i)).lower()

    def is_video(i):
        return base_name(i).endswith(VIDEO_EXTENSIONS)

    wanted = os.path.basename(filename).lower() if filename else None
    idx_valid = file_idx is not None and 0 <= file_idx < num_files

    if idx_valid and (wanted is None or base_name(file_idx) == wanted):
        return file_idx

    if wanted:
        for i in range(num_files):
            if base_name(i) == wanted:
                return i

    if idx_valid and is_video(file_idx):
        return file_idx

    videos = [i for i in range(num_files) if is_video(i)]
    return videos[0] if len(videos) == 1 else None


def parse_range_header(range_header: str, file_size: int):
    """Parse HTTP Range header (e.g., 'bytes=0-1023')"""
    # Format: "bytes=start-end"
    range_str = range_header.replace("bytes=", "").split(",")[0].strip()
    parts = range_str.split("-")

    if not parts[0]:
        # Suffix range: "bytes=-500" means the last 500 bytes
        start = max(file_size - int(parts[1]), 0)
        end = file_size - 1
    else:
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else file_size - 1

    end = min(end, file_size - 1)
    start = min(start, end)
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



