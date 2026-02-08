import ctypes
import logging
import os
import threading
from ctypes import wintypes

logger = logging.getLogger(__name__)

# Single lock to prevent multiple pickers from opening simultaneously
_picker_lock = threading.Lock()

# Windows Shell API Constants
BIF_RETURNONLYFSDIRS = 0x00000001
BIF_NEWDIALOGSTYLE = 0x00000040
MAX_PATH = 260

class BROWSEINFOW(ctypes.Structure):
    _fields_ = [
        ("hwndOwner", wintypes.HWND),
        ("pidlRoot", wintypes.LPVOID),
        ("pszDisplayName", wintypes.LPWSTR),
        ("lpszTitle", wintypes.LPWSTR),
        ("ulFlags", wintypes.UINT),
        ("lpfn", wintypes.LPVOID),
        ("lParam", wintypes.LPARAM),
        ("iImage", ctypes.c_int),
    ]

def open_folder_picker(initial_dir: str = "") -> str | None:
    """
    Opens a folder picker dialog using the native Windows Shell API (ctypes).
    Includes a lock to ensure only one dialog is active at a time.
    """
    if os.name != 'nt':
        return None

    # Try to acquire lock without blocking
    if not _picker_lock.acquire(blocking=False):
        logger.warning("Folder picker request ignored: Dialog already open.")
        return None

    try:
        shell32 = ctypes.windll.shell32
        ole32 = ctypes.windll.ole32
        
        # Initialize OLE for the current thread
        ole32.CoInitialize(None)
        
        browse_info = BROWSEINFOW()
        browse_info.hwndOwner = None
        browse_info.pidlRoot = None
        
        display_name_buf = ctypes.create_unicode_buffer(MAX_PATH)
        browse_info.pszDisplayName = ctypes.cast(display_name_buf, wintypes.LPWSTR)
        browse_info.lpszTitle = "Select Download Folder"
        browse_info.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE
        
        # Open the dialog (Blocking call)
        pidl = shell32.SHBrowseForFolderW(ctypes.byref(browse_info))
        
        if pidl:
            path_buf = ctypes.create_unicode_buffer(MAX_PATH)
            if shell32.SHGetPathFromIDListW(pidl, path_buf):
                folder_path = path_buf.value
                shell32.ILFree(pidl)
                ole32.CoUninitialize()
                return folder_path
            shell32.ILFree(pidl)
            
        ole32.CoUninitialize()
        
    except Exception as e:
        logger.exception(f"Native folder picker failed: {e}")
    finally:
        _picker_lock.release()

    return None

if __name__ == "__main__":
    print(f"Selected: {open_folder_picker()}")
