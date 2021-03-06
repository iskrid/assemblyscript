function runner(allocator, runs, allocs) {
  var ptrs = [];

  function randomAlloc(maxSize) {
    if (!maxSize) maxSize = 8192;
    var size = ((Math.random() * maxSize) >>> 0) + 1;
    size = (size + 3) & ~3;
    var ptr = allocator.allocate_memory(size);
    if (!ptr) throw Error();
    if (ptrs.indexOf(ptr) >= 0) throw Error();
    if (allocator.set_memory)
      allocator.set_memory(ptr, 0xdc, size);
    ptrs.push(ptr);
    return ptr;
  }

  function preciseFree(ptr) {
    var idx = ptrs.indexOf(ptr);
    if (idx < 0) throw Error();
    var ptr = ptrs[idx];
    ptrs.splice(idx, 1);
    if (typeof ptr !== "number") throw Error();
    allocator.free_memory(ptr);
  }

  function randomFree() {
    var idx = (Math.random() * ptrs.length) >>> 0;
    var ptr = ptrs[idx];
    if (typeof ptr !== "number") throw Error();
    ptrs.splice(idx, 1);
    allocator.free_memory(ptr);
  }

  // remember the smallest possible memory address
  var base = allocator.allocate_memory(64);
  console.log("base: " + base);
  allocator.free_memory(base);
  console.log("mem initial: " + allocator.memory.buffer.byteLength);

  try {
    for (var j = 0; j < runs; ++j) {
      console.log("run " + (j + 1) + " (" + allocs + " allocations) ...");
      for (var i = 0; i < allocs; ++i) {
        var ptr = randomAlloc();

        // immediately free every 4th
        if (!(i % 4)) preciseFree(ptr);

        // occasionally free random blocks
        else if (ptrs.length && Math.random() < 0.33) randomFree();

        // ^ sums up to clearing about half the blocks half-way
      }
      // free the rest, randomly
      while (ptrs.length) randomFree();

      // should now be possible to reuse the entire memory
      // just try a large portion of the memory here, for example because of
      // SL+1 for allocations in TLSF
      var size = ((allocator.memory.buffer.byteLength - base) * 9 / 10) >>> 0;
      var ptr = allocator.allocate_memory(size);
      if (allocator.set_memory)
        allocator.set_memory(ptr, 0xac, size);
      if (ptr !== base)
        throw Error("expected " + base + " but got " + ptr);
      allocator.free_memory(ptr);
    }
  } finally {
    // mem(allocator.memory, 0, 0x10000);
  }
}

function mem(memory, offset, count) {
  if (!offset) offset = 0;
  if (!count) count = 1024;
  var mem = new Uint8Array(memory.buffer, offset);
  var stackTop = new Uint32Array(memory.buffer, 4, 1)[0];
  var hex = [];
  for (var i = 0; i < count; ++i) {
    var o = (offset + i).toString(16);
    while (o.length < 4) o = "0" + o;
    if ((i & 15) === 0) {
      hex.push("\n" + o + ":");
    }
    var h = mem[i].toString(16);
    if (h.length < 2) h = "0" + h;
    hex.push(h);
  }
  console.log(hex.join(" ") + " ...");
}

if (typeof module === "object" && typeof exports === "object")
  module.exports = runner;
