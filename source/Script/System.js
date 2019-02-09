/*
	CPU
	2019 nulluser, teth
	
	File: System.js
	
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

	const DEFAULT_PROG = tiny_basic;// Default program
	
	const DEBUG = 0;				// Master debug
	
	const UPDATE_RATE = 0;			// CPU Update (ms)
	const DEBUG_TIME = 50;			// Time to wait between updates in debug
	const SECOND_RATE = 1000;		// Status update

	const TARGET_FPS = 60;			// Target fps
	const NUM_INST = 50000;			// Total number of instructions in update cycle
	const AUTO_SCALE  = 0;			// Auto scale cpu steps for frame rate
	const MIN_INST = 10000;			//
	
	// Memory
	const FB_ADDR = 0xD000; 		// Frame buffer address
	
	const OUT_ADDR = 0xC000;		// Output char
	const IN_ADDR = 0xC001;		// Output char
	
	const KEY_ADDR = 0xC100;		// Keyboard map

	const GPU_CMD = 0xB000;			// GPU Cmd buffer base address
	const GPU_DATA = 0xB200;		// GPU Data buffer base address
	
	const PROG1_ADDRESS = 0x1000;	// Program address for cpu1
	const PROG2_ADDRESS = 0x2000;	// Program address for cpu1
	const PROG3_ADDRESS = 0x3000;	// Program address for cpu1
	
	
	// Interrupt numbers
	const INT_KEYBOARD =	0x01    // Keyboard interrupt
	
	// Cores
	const TEST_CORES = 0;			// Number of cores
	
	// Devices
	var io = null;					// IO
	var memory = null;				// Shared memory
	var cpu_cores = [];				// CPU Cores
	var frame_buffer = null;		// Frame buffer
	var gpu = null;					// GPU
	
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
	
	init();
	
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
	}
		 	
	
	// Hook devices into system
	function connect_devices()
	{
		main.log_console(`${MODULE} Connecting Devices\n`);
		
		CPU6502.configure(); 		// Setup CPU template 
		
		memory = Memory();											// Setup main memory
		io = IO();													// Setup IO object
		frame_buffer = FrameBuffer(memory, FB_ADDR);				// Setup frame buffer
		gpu = GPU(memory, frame_buffer, GPU_CMD, GPU_DATA);			// Setup GPU
		assembler = Assembler(memory);								// Create an assembler
		
		// Assemble some code into memory
		//if(assembler.assemble(CPU, vert_scroll,	0x1000)) return;
		
		//if(assembler.assemble(CPU6502, gpu_test1,	0x1000)) return;
		
		//if(assembler.assemble(CPU6502, DEFAULT_PROG,	0x1000)) return;
		
		
		//if (assembler.assemble(CPU, fb_gametest,		0x1000)) return;
		//if (assembler.assemble(CPU, fb_filltest,		0x2000)) return;
		//if (assembler.assemble(CPU, mc_test,		0x2000)) return;
		//assembler.assemble(CPU, inst_test,		0x1000);
		//assembler.assemble(CPU.inst_table, fb_test1,	0x2000);
		//assembler.assemble(CPU.inst_table, fb_test2,	0x3000);
		//assembler.assemble(CPU.inst_table, game,		0x4000);		
		
		// Create some cores
		cpu_cores.push( new CPU6502("CPU1", memory, io, 0x1000) );
		//cpu_cores.push( new CPU("CPU2", memory, 0x2000) );
		//cpu_cores.push( new CPU("CPU3", memory, 0x3000) );
		
		// Set realtime option for game core
		CPU6502.set_option(cpu_cores[0], CPU6502.OPTION_REALTIME, 1);
		
		// Set debug if needed
		// Can debug by core
		if (DEBUG)
			CPU6502.set_option(cpu_cores[0], CPU6502.OPTION_DEBUG, 1);		
		
		// Create more cores
		// They will all run the code at 0x2000, frame buffer test
		for (var i = 0; i < TEST_CORES; i++)
			cpu_cores.push( new CPU6502("CPUX" + i, memory, io, 0x2000) );		
			
		// Addach IO to CPU 0
		//io = IO(cpu_cores[0], memory, KEY_ADDR, INT_KEYBOARD);
		
		io.init(cpu_cores[0], memory, OUT_ADDR, IN_ADDR, KEY_ADDR, INT_KEYBOARD);
		
		// Dump memory
		memory.dump(0x1000, 0x100);

		update_enable = true;
	}	
			
			
			
			
			
			
	function start()
	{
		update_enable = true;
	}
	
	function stop()
	{
		update_enable = false;
	}

	function reset()
	{
		cpu_cores[0].reset();
		start();
	}
	
			
	function user_assemble(prog)
	{
		// Assemble some code into memory
		if(assembler.assemble(CPU6502, prog, 0x1000)) return;
		
		cpu_cores[0].reset();
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
		
		var poly_rate = gpu.get_polys();
		
		if (DEBUG == 0)
			main.log_console(`${MODULE} Frame Rate: ${average_fps.toFixed(2)} Poly Rate: ${poly_rate} Inst Rate: ${total_inst}\n` );

		total_inst = 0;
		fb_updates = 0;
	}	
	
	// Timer Update
	function update()
	{
		var cur = Date.now();
		var dt = cur - last_update;
		
		if (((dt > DEBUG_TIME) && DEBUG) || !DEBUG) 
		{
			update_system(dt);
			last_update = cur;
		}
		
		//window.requestAnimationFrame(update);
		//setTimeout(update, 0);
	}
	
	// Master update
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
	
	return {init:init, 
			user_assemble:user_assemble,
			start:start, 
			stop:stop,
			reset:reset
			};
}

