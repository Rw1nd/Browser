# v8 compile

```sh
git reset --hard 1dab065bb4025bdd663ba12e2e976c34c3fa6599
gclient sync
./tools/dev/v8gen.py x64.debug 
ninja -C out.gn/x64.debug d8


./tools/dev/v8gen.py x64.relase
ninja -C out.gn/x64.release
```

