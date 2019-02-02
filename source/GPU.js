/*
	GPU
	2019 nulluser, teth

	File: GPU.js
	
	
	GPU Interface memory is seperated into command and data buffers
	THe commands are loaded into the command buffer starting at location base+1
	The data is then loaded into the datra buffer.
	Once the data is in place a 1 is loaded into cmd_base + 0 to tell the GPU to run the commands.
	The GPU then clears this location bhack to zero when done
	
	The command advances a pointer in to the data. When the command is complete the next command will start where the previous one left off
	
	GPU Commands
	0x00	No command, stops update chain
	0x10	Clear screen Data: [color in data_base + 0]
	0x80	Draw lines. Data: [num_lines, color, x0, y0, x1, y1 ... ]
	0x90	Draw triangles. Data: [num_triangles, color, x0, y0, x1, y1, x2, x3 ... ]
	
	
	Example
	
		Clear screen to 0x02
		
		memory[cmd_base+1]  = 0x10		// Clear command
		memory[cmd_base+2]  = 0x00		// Nop		
		memory[data_base+0] = color	// Line color
		memory[cmd_base+0]  = 1			// Perform operation
	
		To draw a line from (30x40) to (50x60)
		
		memory[cmd_base+1]  = 0x80		// Draw lines command
		memory[cmd_base+2]  = 0x00		// Nop
		memory[data_base+0] = 1			// Number of lines
		memory[data_base+1] = color		// Line color
		memory[data_base+2] = 30		// X0
		memory[data_base+3] = 40		// Y0
		memory[data_base+4] = 50		// X1
		memory[data_base+5] = 60		// Y1
		memory[cmd_base+0]  = 1			// Perform operation
		
		
		To draw a polging at [(5x5),(20x50),(15x20)]
		
		memory[cmd_base+1]  = 0x80		// Draw lines command
		memory[cmd_base+2]  = 0x00		// Nop
		memory[data_base+0] = 1			// Number of Polygons
		memory[data_base+1] = color		// Poly color
		memory[data_base+2] = 5			// X0
		memory[data_base+3] = 5			// Y0
		memory[data_base+4] = 20		// X1
		memory[data_base+5] = 50		// Y1
		memory[data_base+6] = 15		// X2
		memory[data_base+7] = 20		// Y3
		memory[cmd_base+0]  = 1			// Perform operation
*/

"use strict";

// Frame Buffer
function GPU(memory, fbuffer, _cmd_base, _data_base)
{
	const MODULE = "[GPU]       ";
		
	const CMD_SIZE	= 0x200;				// Command buffer size
	const DATA_SIZE	= 0x800;				// Data buffer size (2048)
		
	const CMD_NONE	= 0x00;					// Nop
	const CMD_CLEAR	= 0x10;					// Clear screen
	const CMD_LINES	= 0x80;					// Draw lines
	const CMD_POLYS	= 0x90;					// Draw polygons
		
		
	var fbuffer = fbuffer;					// Frame buffer reference
	var cmd_base = _cmd_base;				// Start address of command buffer memory map
	var data_base = _data_base;				// Start address of data buffer memory map
	
	var cmd_buffer = null;					// Local command buffer
	var data_buffer = null;					// Local data buffer
	
	var cmd_idx = null						// Current command index
	var data_idx = null;					// Current data index
	
	var buffer_x = 0;						// Cached Framebuffer size
	var buffer_y = 0;

	var ctx = null;							// Framebuffer off screen context
	
	var poly_updates = 0;
	
	init(memory);						// Init
	
	// Init
	function init(memory)
	{
		main.log_console(`${MODULE} Init\n`);	
		main.log_console(`${MODULE}  Cmd  ${hex_word(cmd_base)}\n`);	
		main.log_console(`${MODULE}  Data ${hex_word(data_base)}\n`);	

		// Refernce to frame buffer context and size
		ctx = fbuffer.get_context();
		buffer_x = ctx.canvas.width;
		buffer_y = ctx.canvas.height;
		
		// Get command and data buffers
		cmd_buffer = new Uint8Array(CMD_SIZE);		
		data_buffer = new Uint8Array(DATA_SIZE);	
		
		// Map in the command and data areas
		memory.add_hook(cmd_base, CMD_SIZE, cmd_read_hook, cmd_write_hook);
		memory.add_hook(data_base, DATA_SIZE, data_read_hook, data_write_hook);
		
		test();
	}
	
	function get_polys()
	{
		var v = poly_updates;
		poly_updates = 0;
		
		return v;
	}
		
	

	// Intercept cmd memory read
	function cmd_read_hook(a)
	{
		return cmd_buffer[a];
	}
	
	// Intercept cmd memory write
	function cmd_write_hook(a, v)
	{
		cmd_buffer[a] = v;
		
		// Perform operations if flag at cmd[0] is set
		if (a == 0 && v & 0x01)
			perform_operations();
	}	
	
	// Intercept data memory read
	function data_read_hook(a)
	{
		return data_buffer[a];
	}
	
	// Intercept data memory write
	function data_write_hook(a, v)
	{
		data_buffer[a] = v;
	}
	
	// Get next command byte
	function next_cmd(a)
	{
		return cmd_buffer[cmd_idx++];
	}
	
	// Get next data byte
	function next_data(a)
	{
		return data_buffer[data_idx++];
	}
	
	// Perform pending operations
	function perform_operations()
	{
		fbuffer.pre_sync();	// Write currnet pixels into display buffer
		
		//main.log_console(`${MODULE} Update\n`);
		
		cmd_idx = 1;		// Skip start flag
		data_idx = 0;
		var cmd = 0;
		
		// Process all pending 
		while (cmd = next_cmd())
		{
			//main.log(`${MODULE} Cmd: ${cmd}\n`);	
			
			if (cmd	== CMD_NONE) break; else
			if (cmd == CMD_CLEAR) clear_cmd();
			if (cmd == CMD_LINES) draw_lines_cmd();
			if (cmd == CMD_POLYS) draw_polygons_cmd();
		}
		
		cmd_buffer[0] = 0; // Clear pending
		
		fbuffer.post_sync(); // sapve changes into raw pixel buffer
		
		//fbuffer.update();
	}
	
	
	// Performy clear command
	function clear_cmd()
	{
		var color = next_data();
		
		//console.log("Clear: " + color + " " + buffer_x + " " + buffer_y);
		
		ctx.fillStyle = fbuffer.get_canvas_color(color);
		
		//console.log(ctx.fillStyle);
		
		ctx.fillRect(0, 0, buffer_x, buffer_y);
	}
	
	// Perform draw lines command
	function draw_lines_cmd()
	{
		var poly_count = next_data();

		//console.log("Line count: " + line_count);
		
		for (var i = 0; i < poly_count; i++)
		{
			var color = next_data();
			var x1 = next_data();
			var y1 = next_data();
			var x2 = next_data();
			var y2 = next_data();
			
			ctx.strokeStyle = fbuffer.get_canvas_color(color);

			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke(); 
		}
	}
	
	
	// Perform draw polys command
	function draw_polygons_cmd()
	{
		var line_count = next_data();

		//console.log("Line count: " + line_count);
		
		for (var i = 0; i < line_count; i++)
		{
			if (data_idx + 7 > DATA_SIZE) return;
			
			
			var color = next_data();
			var x1 = next_data();
			var y1 = next_data();
			var x2 = next_data();
			var y2 = next_data();
			var x3 = next_data();
			var y3 = next_data();
			
			//main.log_console(`c:${color} x1:${x1} y1:${y1} x2:${x2} y2:${y2} x3:${x3} y3:${y3}\n`);
			
			ctx.fillStyle = fbuffer.get_canvas_color(color);
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x3, y3);
			ctx.lineTo(x1, y1);
			ctx.closePath();
			ctx.fill();
			
			poly_updates++;
		}
	}	
	
	function test()
	{
		
		/*
		//Clear
		memory.set_byte(cmd_base+1,  0x10)		// Clear lines command
		memory.set_byte(cmd_base+2,  0x00)		// No op
		memory.set_byte(data_base+0, 0x10)		// Color
		memory.set_byte(cmd_base+0,  1);		// Perform operation*/
		
		// Lines
		/*memory.set_byte(cmd_base+1,  0x80)		// Draw lines command
		memory.set_byte(cmd_base+2,  0x00)		// No op
		memory.set_byte(data_base+0, 1)			// Number of lines
		memory.set_byte(data_base+1, 0x33);		// Line color
		memory.set_byte(data_base+2, 5);		// X0
		memory.set_byte(data_base+3, 8);		// Y0
		memory.set_byte(data_base+4, 20);		// X1
		memory.set_byte(data_base+5, 30);		// Y1
		memory.set_byte(cmd_base+0,  1);			// Perform operation
		*/
		
		// Polygons
		/*memory.set_byte(cmd_base+1,  CMD_LINES)		// Draw lines command
		memory.set_byte(cmd_base+2,  0x00)		// No op
		memory.set_byte(data_base+0, 1)			// Number of Polys
		memory.set_byte(data_base+1, 0x33);		// Line color
		memory.set_byte(data_base+2, 3);		// X0
		memory.set_byte(data_base+3, 3);		// Y0
		memory.set_byte(data_base+4, 20);		// X1
		memory.set_byte(data_base+5, 3);		// Y1
		memory.set_byte(data_base+6, 15);		// X2
		memory.set_byte(data_base+7, 20);		// Y2
		
		memory.set_byte(cmd_base+0,  1);			// Perform operation
		*/
		
	}


	/* End of frame Buffer */	
	
	// Public Interface
	return {init:init, get_polys:get_polys};
}

