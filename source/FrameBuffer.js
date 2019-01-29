/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory and stack are stored seperatly
	
	A 64x64 pixel Frame buffer is mapped to 0xD000.
	Pixel data is 0b00RRGGBB, 2 bits per color
	
	Memory Map:

	0xD000	Frame buffer
*/

"use strict";


// Memory
function FrameBuffer(base_addr)
{
	const MODULE = "[FrameBuff] ";
	const DEVICE_TYPE = "FB";				// Device identifier

	// Frame buffer
	const BUFFER_X = 64;					// Frame buffer columns
	const BUFFER_Y = 64;					// Frame buffer rows
	const FB_SIZE = BUFFER_X * BUFFER_Y;	// Frame buffer size
		
	var color_table;			// Color lookup table

	var canvas = null;			// Canvas
	var ctx;					// Context
	var canvas_width = 0;		// fb x size
	var canvas_height = 0;		// fb y size
	var buffer;					// 8 bit Frame buffer data
	
	var os_canvas;				// Off Screen canvas
	var os_ctx;
	var os_imagedata;
	
	var fb_data;				// Some references for pixel access
	var fb_data8;
	var fb_data32;
	
	//var fb_updates = 0;		// Framebuffer updates
	//var fb_update = 0; 		// True to udpate frame buffer

	// Returns device type
	function get_type()
	{
		return device_type;
	}
	
	
	// Init
	function init(memory)
	{
		main.log_console(`${MODULE} Init\n`);	
				
		// Get context
		canvas = document.getElementById("fbuffer");
		ctx = canvas.getContext("2d")
		
		ctx.imageSmoothingEnabled = false; // Disable smooth scaling
		
		// Size
		//canvas.width = window.innerWidth;
		//canvas.height = window.innerHeight;  
		canvas.tabIndex = 1000;
		
		// Save size
		canvas_width = +canvas.width;
		canvas_height = +canvas.height;
		

		// Off screen canvas
		os_canvas = document.createElement('canvas');
		os_canvas.width = canvas_width;
		os_canvas.height = canvas_height;
		os_ctx = os_canvas.getContext('2d');
		
		os_ctx.imageSmoothingEnabled = false; // Disable smooth scaling

		
		// Off screen image data
		os_imagedata = os_ctx.getImageData(0, 0, BUFFER_X, BUFFER_Y);
		
		// Create fast references to the data
		fb_data = new ArrayBuffer(os_imagedata.data.length);
		fb_data8 = new Uint8ClampedArray(fb_data);
		fb_data32 = new Uint32Array(fb_data);
		
		// Get frame buffer memory
		buffer = new Uint8Array(FB_SIZE);		// Get Memory	

		// Add frame buffer memory hook
		memory.add_hook(base_addr, FB_SIZE, read_hook, write_hook);
		
		create_color_table(); // For creating color table
		
		clear();
	}
	
	function clear()
	{
		
		for (var a = 0; a < FB_SIZE; a++)
			write_hook(a, 0);
	}
	
	function read_hook(a)
	{
		return buffer[a];
	}
	
	function write_hook(a, v)
	{
		// Save for reading
		buffer[a] = v;
		
		// Write 32 bit value into buffer directly
		fb_data32[a] = color_table[v];
	}
	
	
	// Get color from value, return in hex
	function get_color(v)
	{
		const c_table = [0, 85, 171, 255]; // Color table for rgb
		
		// Data is in   0b00RRGGBB format
		var r = c_table[(v >> 4) & 0x03];
		var g = c_table[(v >> 2) & 0x03];
		var b = c_table[v & 0x03];
		
		return (0xff << 24) + (b << 16) + (g << 8) + r;
	}
	
	// Generate text color table 
	function create_color_table()
	{
		color_table = new Uint32Array(256);
		
		for (var i = 0; i < 256; i++)
		{
			color_table[i] = get_color(i);
			//main.log(hex_dword(color_table[i]));
		}
	}
	
	// Render off screen frame buffer
	function update()
	{
		// Link in 8 bit off screen data
		os_imagedata.data.set(fb_data8);
		
		// Write off screen image data to offscreen buffer
		os_ctx.putImageData(os_imagedata, 0, 0);
		
		// Strech off screen canvas buffer to main canvas
		ctx.drawImage(os_canvas, 0, 0, BUFFER_X, BUFFER_Y, 
								 0, 0, canvas_width, canvas_height);		
	}

	/* End of frame Buffer */	
	
	// Public Interface
	return {get_type: get_type,
			init:init,
			update : update};
}

