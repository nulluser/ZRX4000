/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory and stack are stored seperatly
	
	A 64x64 pixel Frame buffer is mapped to 0xD000.
	Pixel data is 0b00RRGGBB, 2 bits per color
	
	
	Memory Map:
	
	
	0x1000	Program
	0xC000	IO
	0xD000	Frame buffer

	
	Special Addresses
	0xC000			Write to output char (todo)
	0xC100-0xC1FF	Keyboard map
	
	
*/

"use strict";

// System
function System()
{
	const MODULE = "[SYSTEM]    ";

	const UPDATE_RATE = 1;			// CPU Update (ms)
	const SECOND_RATE = 1000;		// Status update

	// Memory
	const FB_ADDR = 0xD000; 		// Frame buffer address
	const KEY_ADDR = 0xC100;		// Keyboard map
	const PROG1_ADDRESS = 0x1000;	// Program address for cpu1
	const PROG2_ADDRESS = 0x2000;	// Program address for cpu1
	const PROG3_ADDRESS = 0x3000;	// Program address for cpu1
	
	// Cores
	const NUM_CORES = 1000;
	
	// Devices
	var memory = null;				// Shared memory
	var cpu_cores = [];				// CPU Cores
	var frame_buffer = null;		// Frame buffer

	var fb_updates = 0;				// Number of FB updates since last second


	/* 
		Public 
	*/
	
	// Core CPU init 
	function init()
	{
		main.log_console(MODULE + "Init\n");	

		connect_devices();
		
		setInterval(second, SECOND_RATE);
		setInterval(update, UPDATE_RATE);
	}
		 	
	
	// Hook devices into system
	function connect_devices()
	{
		main.log(MODULE + "Connecting Devices");
		
		// Setup main memory
		memory = Memory();
		memory.init();

		frame_buffer = FrameBuffer(FB_ADDR);
		frame_buffer.init(memory);

		io_init();
		
		cpu_cores.push( CPU("CPU1", memory, fb_test1, 0x1000) );
		cpu_cores.push( CPU("CPU2", memory, fb_test2, 0x2000) );
		cpu_cores.push( CPU("CPU3", memory, game, 0x3000) );
		
		
		//for (var i = 0; i < NUM_CORES; i++)
		//	cpu_cores.push( CPU("CPUX" + i, memory, fb_test, 0x3000) );
		
		for (var i = 0; i < cpu_cores.length; i++)
			cpu_cores[i].init();
	}	
			
	// Setup IO Devices
	function io_init()
	{
		// Connect keys
		window.addEventListener("keydown", keydown, false);	
		window.addEventListener("keyup", keyup, false);	
	}
	
	// Handle key events
	function keydown(evt)
	{
		var key = ascii(evt.key) & 0xff;
		//log("Key down: " + hex_byte(key));
		memory.set_byte(KEY_ADDR + key, 1);
	}
	
	function keyup(evt)
	{
		var key = ascii(evt.key) & 0xff;
		//log("Key up: " +  hex_byte(key));
		memory.set_byte(KEY_ADDR + key, 0);
	}			
			
			
	// Second Update
	function second()
	{
		main.log_console(`${MODULE} Framerate: ${fb_updates}\n` );
		fb_updates = 0;
	}	
	
	// Core Update
	function update()
	{
		//console.log("Update");
		
		for (var i = 0; i < cpu_cores.length; i++)
			cpu_cores[i].update();
	
		frame_buffer.update();
		
		fb_updates++;
		
		//for (var i = 0; i < NUM_INST && !fb_update; i++) 
//			step();

		// Only update if sync was called
		/*if (fb_update)
		{
			frame_buffer.update();
			fb_updates++;
			fb_update = 0;
		}*/
			//draw_buffer();
	}
	
	/* Private */
	
	return {init:init};
}

