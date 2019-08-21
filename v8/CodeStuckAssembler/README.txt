We have added a cool function 'toNumber' for Array. 
To use it, you can fetch the V8 source code and apply the patch file.

Here are some useful build commands:

fetch v8
git reset --hard 7.6.306
git apply --whitespace=nowarn < source.patch
gclient sync
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
ninja -C out.gn/foo d8

We recommend sending a single line of javascript while exploiting remote server.
