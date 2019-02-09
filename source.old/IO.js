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
	
	var key_addr = 0;
	var key_int = 0;

	var key_buffer = [];
	var t = 0;
	
	// Init
	function init(cpu, memory, _k_addr, _key_int)
	{
		key_addr = _k_addr;
		key_int = _key_int;
		
		main.log_console(`${MODULE} Init\n`);	
		
		// fbuffer
		 var fb = document.getElementById(FB_DIV);
		fb.addEventListener("keyup", (evt)=>{keyup(evt, cpu, memory)}, false);	
		fb.addEventListener("keydown", (evt)=>{keyup(evt, cpu, memory)}, false);	
		
		// Terminal
		var term = document.getElementById(TERM_DIV);
		term.addEventListener("keydown", (evt)=>{terminal_key(evt);}, false);	
		
		terminal_out("[Terminal]\n");
		
		//setInterval(()=>{terminal_out(t++);if (t>9) t = 0;}, 2);
	}
		
		
	// Capture terminal key
	function terminal_key(event)
	{
		var key = event.keyCode & 0xff;
		
		// Add keys to key buffer
		key_buffer.push(key);
		
		// Enfoce length limit
		if (key_buffer.length > KEY_MAX)
			key_buffer.splice(0, 1);
		
		console.log(key_buffer);
	}
			
		
	// Write char to terminal
	function terminal_out(c)
	{
		logger.add(TERM_DIV, c, TERM_MAX);
	}
		
		
	// Get next key in key buffer
	function terminal_in()
	{
		if (key_buffer.length == 0) return 0;
		
		var k = key_buffer[0];
		
		key_buffer.splice(0, 1);
		
		return k;
	}
		
		
	// Key down for frame buffer
	function keydown(evt, cpu, memory)
	{
		var key = ascii(evt.key) & 0xff;
		memory.set_byte(key_addr + key, 1);
		cpu.interrupt(key_int);
	}
	
	// Key up for frame buffer
	function keyup(evt, cpu, memory)
	{
		var key = ascii(evt.key) & 0xff;
		memory.set_byte(key_addr + key, 0);
		cpu.interrupt(key_int);
	}	
		
	// Public Interface
	return {init : init,
			terminal_out : terminal_out, 
			terminal_in : terminal_in};
}
