/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory and stack are stored seperatly
	
	A 64x64 pixel Frame buffer is mapped to 0xD000.
	Pixel data is 0b00RRGGBB, 2 bits per color
	
	
	Memory Map:
	
	
	0x1000	Program memory cpu 1
	0x2000	Program memory cpu 2
	0x3000	Program memory cpu 3
	
	0xC000	IO
	0xD000	Frame buffer

	
	Special Addresses
	0xC000			Write to output char (todo)
	0xC100-0xC1FF	Keyboard map
	
	
*/

"use strict";


// Memory
function Memory()
{
	const MODULE = "[Memory]    ";
	
	const MEM_SIZE 	= 65536;		// Memory space size
	
	var data = null;				// Memory	
	var addr_hooks = [];			// Memory range hooks
	
	
	// Init
	function init()
	{
		main.log(MODULE + "Init\n");	
	
		data = new Uint8Array(MEM_SIZE);		// Get Memory	
	}
		
	// Hook into memory space with callbacks
	// Addresses are adjusted reletive to hook start
	//  That is, the frame buffer will see address 0x0001 instead of 0xD001
	function add_hook(start, length, readcb, writecb)
	{
		main.log(`${MODULE} Hooking address ${hex_word(start)}-${hex_word(start+length)}\n`);
		
		addr_hooks.push({start:start, length:length, read:readcb, write:writecb});
	}		
		

	// Clear memory
	function clear()
	{
		for (var i = 0; i < MEM_SIZE; i++)
			data[i] = 0;
	}
	
	// See if something has hooked this space
	function find_hook(a)
	{
		for (var i = 0; i < addr_hooks.length; i++)
		{
			var hook = addr_hooks[i];
			
			if (a >= hook.start && hook.start + hook.length)
				return hook;
		}
		
		return null;
	}
	
	
	// Get byte from memory
	function get_byte(a) 
	{ 
		var h = find_hook(a);
		
		if (h != null)
		{
			return h.read(a - h.start);
		}
	
		return data[a]; 
	}
	
	// Get word from memory
	function get_word(a) 
	{ 
		return (get_byte(a) << 8) + get_byte(a+1); 
	}

	// Set byte in memory	
	function set_byte(a, v) 
	{ 
		var h = find_hook(a);
		
		if (h != null)
		{
			h.write(a - h.start, v);
			return;
		}	
	
		data[a] = v; 
	}
	
	// Set word in memory
	function set_word(a, v) 
	{ 
		set_byte(a, v >> 8); set_byte(a + 1, v & 0xff); 
	}

	// Show Disassembly
	function dump(start, length)
	{
		main.log_console("[Memory Dump]\n");
				
		var i = start;
		
		while(i <= start + length)
		{
			main.log_console(hex_word(i) + "   ");
			
			for (var j = i; j < i+16; j++)
				main.log_console(hex_byte(get_byte(j)) + " ");
			
			for (var j = i; j < i+16; j++)
			{
				var v = get_byte(j);
				if (v >= 0x20)
					main.log_console(get_char(v)); 
				else
					main.log_console(" ");
			}

			main.log_console("\n");
			i += 16;
		}

		
		main.log_console("[End of Memory]\n");
	}	
	
	// Public Interface
	return {init : init,
			add_hook : add_hook,
			clear : clear,
			dump : dump,
			get_byte : get_byte,
			get_word : get_word,
			set_byte : set_byte,
			set_word : set_word};

	
}



