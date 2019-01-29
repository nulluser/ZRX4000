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
	const MODULE = "[System]    ";

	//const UPDATE_RATE = 2000;		// CPU Update (ms)
	const UPDATE_RATE = 0;			// CPU Update (ms)
	const DEBUG_TIME = 0;
	
	
	const SECOND_RATE = 1000;		// Status update

	const TARGET_FPS = 60;			// Target fps
	const NUM_INST = 50000;			// Total number of instructions in update cycle
	const AUTO_SCALE  = 0;			// Auto scale cpu steps for frame rate
	const MIN_INST = 10000;			//
	
	// Memory
	const FB_ADDR = 0xD000; 		// Frame buffer address
	const KEY_ADDR = 0xC100;		// Keyboard map
	const PROG1_ADDRESS = 0x1000;	// Program address for cpu1
	const PROG2_ADDRESS = 0x2000;	// Program address for cpu1
	const PROG3_ADDRESS = 0x3000;	// Program address for cpu1
	
	
	// Interrupt numbers
	const INT_KEYBOARD =	0x01    // Keyboard interrupt
	
	// Cores
	const TEST_CORES = 0;			// Number of cores
	
	// Devices
	var memory = null;				// Shared memory
	var cpu_cores = [];				// CPU Cores
	var frame_buffer = null;		// Frame buffer
	
	// Assemble
	var assembler = null;			// Assembler object

	// Status
	var total_inst = 0;				// Instructions in since last second
	var fb_updates = 0;				// Number of FB updates since last second
	var update_enable = 0;			// Allow cores to run if true
	var last_update = Date.now();
	var total_exec = NUM_INST;		//	Inital
	
	
	var inst_rate = 100000.0;		// Filter for auto inst loading
	var fps_filter = 0.8;			// Filter for fps calc
	var average_fps = 0;			// Current average FPS
	
	/* 
		Public 
	*/
	
	// Core CPU init 
	function init()
	{
		main.log_console(`${MODULE} Init\n`);	

		connect_devices();
		
		
		//window.requestAnimationFrame(update);
		setInterval(second, SECOND_RATE);
		setInterval(update, UPDATE_RATE);
		//update();
	}
		 	
	
	// Hook devices into system
	function connect_devices()
	{
		main.log_console(`${MODULE} Connecting Devices\n`);
				

		// Setup CPU
		CPU.configure(); 		// Load instructions				
				
				
		// Setup main memory
		memory = Memory();
		memory.init();

		// Setup frame buffer
		frame_buffer = FrameBuffer(FB_ADDR);
		frame_buffer.init(memory);

	
		
		// Create an assembler
		assembler = Assembler(memory);
		
		// Assemble some code into memory
		
		if(assembler.assemble(CPU, vert_scroll,	0x1000)) return;
		
		
		
		
		//if (assembler.assemble(CPU, fb_gametest,		0x1000)) return;
		//if (assembler.assemble(CPU, fb_filltest,		0x2000)) return;
		
		//if (assembler.assemble(CPU, mc_test,		0x2000)) return;
		
		//assembler.assemble(CPU, inst_test,		0x1000);
		
		//assembler.assemble(CPU.inst_table, fb_test1,	0x2000);
		//assembler.assemble(CPU.inst_table, fb_test2,	0x3000);
		//assembler.assemble(CPU.inst_table, game,		0x4000);		
		
		memory.dump(0x1000, 0x100);
		
		
		
		// Create some cores
		cpu_cores.push( new CPU("CPU1", memory, 0x1000) );
		//cpu_cores.push( new CPU("CPU2", memory, 0x2000) );
		//cpu_cores.push( new CPU("CPU3", memory, 0x3000) );
		
		// Set realtime option for game core
		//CPU.set_option(cpu_cores[0], CPU.OPTION_REALTIME, 1);
		
		
		
		// Create more cores
		// They will all run the code at 0x2000, frame buffer test
		for (var i = 0; i < TEST_CORES; i++)
			cpu_cores.push( new CPU("CPUX" + i, memory, 0x2000) );		
		
		
		
		
		// Setup IO. Need to make module
			
		// Addach IO to CPU 0
		io_init(cpu_cores[0]);
		
		
		
		update_enable = true;
		
		// Init cores
		//for (var i = 0; i < cpu_cores.length; i++)
//			cpu_cores[i].init();



	}	
			
	// Setup IO Devices
	function io_init(cpu)
	{
		
		
		
		
		
		
		// Connect keys
		window.addEventListener("keydown", (evt)=>{keydown(evt, cpu)}, false);	
		window.addEventListener("keyup", (evt)=>{keyup(evt, cpu)}, false);	
	}
	
	// Handle key events
	function keydown(evt, cpu)
	{
		var key = ascii(evt.key) & 0xff;
		//log("Key down: " + hex_byte(key));

		memory.set_byte(KEY_ADDR + key, 1);
		cpu.interrupt(INT_KEYBOARD);
		
		
	}
	
	function keyup(evt, cpu)
	{
		var key = ascii(evt.key) & 0xff;
		//log("Key up: " +  hex_byte(key));
		memory.set_byte(KEY_ADDR + key, 0);
		cpu.interrupt(INT_KEYBOARD);
	}			
			
			
	// Second Update
	function second()
	{
		// Seed
		if (average_fps < 1) average_fps = fb_updates;
		
		average_fps = fps_filter * average_fps + (1-fps_filter) * fb_updates;

		if (AUTO_SCALE)
		{
			var error = (average_fps - TARGET_FPS) / TARGET_FPS
		
			total_exec += inst_rate * (error);
			
			if (total_exec < MIN_INST) total_exec= MIN_INST;
			
			
			console.log(` Error: ${(error*100).toFixed(2)}% ${total_exec.toFixed(0)} \n`);
		}

		
		main.log_console(`${MODULE} Frame Rate: ${average_fps.toFixed(2)} Inst Rate: ${total_inst}\n` );
		

		total_inst = 0;
		fb_updates = 0;

	}	
	
	// Core Update
	function update()
	{
		var cur = Date.now();
		var dt = cur - last_update;
		
		if (dt > DEBUG_TIME) 
		{
			update_system(dt);
			last_update = cur;
		}
		
		
		//window.requestAnimationFrame(update);
		
		//setTimeout(update, 0);
	}
	
	
	function update_system()
	{
				

		

		
		
		
		if (!update_enable) return;

		//console.log("Update");
				
		var cpu_exec = Math.floor(total_exec / cpu_cores.length);
				
		for (var i = 0; i < cpu_cores.length; i++)
			total_inst += cpu_cores[i].update(cpu_exec);
	
		frame_buffer.update();
		
		fb_updates++;

	}
	
	
	/* Private */
	
	return {init:init};
}

