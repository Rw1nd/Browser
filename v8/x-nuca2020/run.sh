cd ~/v8
git checkout 8.6.358
git apply < patch
gclient sync
tools/dev/v8gen.py x64.release 
ninja -C out.gn/x64.release d8