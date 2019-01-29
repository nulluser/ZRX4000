/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
*/

"use strict";


// Memory
function IO(key_addr, key_int)
{
	const MODULE = "[IO]        ";
	
	var key_addr = key_addr;
	
	// Init
	function init(cpu, memory)
	{
		main.log_console(`${MODULE} Init\n`);	
	
		// Connect keys
		window.addEventListener("keydown", (evt)=>{keydown(evt, cpu, memory)}, false);	
		window.addEventListener("keyup", (evt)=>{keyup(evt, cpu, memory)}, false);	
	}
		
	// Handle key events
	function keydown(evt, cpu, memory)
	{
		var key = ascii(evt.key) & 0xff;
		//log("Key down: " + hex_byte(key));

		memory.set_byte(key_addr + key, 1);
		cpu.interrupt(key_int);
	}
	
	function keyup(evt, cpu, memory)
	{
		var key = ascii(evt.key) & 0xff;
		//log("Key up: " +  hex_byte(key));
		memory.set_byte(key_addr + key, 0);
		cpu.interrupt(key_int);
	}	
		
	// Public Interface
	return {init : init};

	
}


