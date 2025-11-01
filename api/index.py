import sys
import os

# 親ディレクトリをパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# 作業ディレクトリを親ディレクトリに設定
os.chdir(parent_dir)

from app_27triple import app

# VercelのPython Runtimeは'application'という名前のWSGIアプリを探す
# これが最も簡単で確実な方法
application = app

