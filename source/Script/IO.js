
/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
*/

"use strict";

// IO
function IO()
{
	const MODULE = "[IO]        ";
	const FB_DIV = "fbuffer";
	const TERM_DIV = "terminal";
	
	const KEY_MAX = 5;					// Max size of keyboard buffer
	const TERM_MAX = 25;
	const KEY_LSHIFT = 0x16;
	
	var out_addr = 0;
	var in_addr = 0;
	var key_addr = 0;
	var key_int = 0;

	const KEY_TABLE_SIZE = 256
	var key_table;
	var key_buffer = [];
	var t = 0;
	
	// Init
	function init(cpu, memory, _out_addr, _in_addr, _k_addr, _key_int)
	{
		out_addr = _out_addr;
		in_addr = _in_addr;
		
		key_addr = _k_addr;
		key_int = _key_int;
		
		main.log_console(`${MODULE} Init\n`);	
		
		key_table = new Uint8Array(KEY_TABLE_SIZE);
		
		
		// fbuffer
		 var fb = document.getElementById(FB_DIV);
		 
		//fb.addEventListener("keychar", (evt)=>{key_char(evt, cpu, memory)}, false);			 
		fb.addEventListener("keyup", (evt)=>{keyup(evt, cpu)}, false);	
		fb.addEventListener("keydown", (evt)=>{keydown(evt, cpu)}, false);	
		
		// Terminal
		var term = document.getElementById(TERM_DIV);
		term.addEventListener("keypress", (evt)=>{keypress(evt, cpu)}, false);	
		//term.addEventListener("keyup", (evt)=>{keyup(evt, cpu)}, false);	
		//term.addEventListener("keydown", (evt)=>{keydown(evt, cpu)}, false);	
		
		// Add keytable hook
		memory.add_hook(key_addr, KEY_TABLE_SIZE, key_read, null);

		// Add output hook
		memory.add_hook(in_addr, 2, terminal_read, null);
		memory.add_hook(out_addr, 1, null, terminal_write);
		
		
		//terminal_out("[Terminal]\n");
		
		//setInterval(()=>{terminal_out(t++);if (t>9) t = 0;}, 2);
	}
		
		
	// Key down for frame buffer
	function keydown(evt, cpu)
	{
		var key = ascii(evt.key) & 0xff;
		
		console.log("keydown: " + hex_byte(key));
		
		// Set as down in key table
		key_table[key] = 1;
		
		cpu.interrupt(key_int);
	}
	
	// Key up for frame buffer
	function keyup(evt, cpu)
	{
		var key = ascii(evt.key) & 0xff;
		
		// Set as up in key table
		key_table[key] = 0;
		
		cpu.interrupt(key_int);
	}	
	
	
	
		// Key down for frame buffer
	function keypress(evt, cpu)
	{
		var key;
		
		if (evt.key == "Enter") key = 0x0d; else
			key = ascii(evt.key);
		
		if (key < 9 || key > 127) return; // Non printable
		
		// Add keys to key buffer
		key_buffer.push(key);
		
		// Enfoce length limit
		if (key_buffer.length > KEY_MAX)
			key_buffer.splice(0, 1);
		
		console.log("key3: " + hex_byte(key));
		
		cpu.interrupt(key_int);
	}
	
	
			
	//	Return keyboard table element	
	function key_read(a)
	{
		return key_table[a];
	}			
			
	function terminal_write(a, c)
	{
		c = get_char(c);
				
		logger.add(TERM_DIV, c, TERM_MAX);
	}		
		
		
	// Get next key in key buffer
	function terminal_read(a)
	{
		if (key_buffer.length == 0) return 0;
		
		var k = key_buffer[0];
		
		key_buffer.splice(0, 1);
		return k
	}
		
	// Public Interface
	return {init : init};
}
