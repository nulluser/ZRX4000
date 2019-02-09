/*
	CPU
	2019 nulluser
	
	File: Main.js
*/

"use strict";

/*
	Main
*/

// Main system object
var main = (function () 
{
	var MODULE = "[Main]       ";
	
	// Private 
	//const DEFAULT_PROG = vert_scroll;
	const DEFAULT_PROG = OS;
	
	const ASSM_MAX = 1000;
	const CON_MAX = 500;

	var debug_window;				// Popup debug window
	var system = null;
	var current = null;

	function init()
	{
		// Prime logs
		log_console("[Status]\n");
		log_console(MODULE + "Init\n");
				
		system = System();
		
		//load(DEFAULT_PROG);
		//assemble();

		load_prog("OS");
		//load_prog("tiny_basic");
		//load_area("assembler");
		load_area("terminal");
		
		//assemble();

		
		
	}
	
	// Process UI click
	function ui_click(item)
	{
		var cmds = item.split(":");
		
		console.log(cmds);
		
		if (cmds[0] == "system")
		{
			if (cmds[1] == "start") system.start();
			if (cmds[1] == "stop") system.stop();
			if (cmds[1] == "reset") system.reset();
		}

		if (cmds[0] == "assembler")
		{
			if (cmds[1] == "assemble") 
				assemble();
			
			if (cmds[1] == "load") 
			{
				load_prog(cmds[2]);
			}
			
		}
		
	}
	
	// Load a program by variable name
	function load_prog(name)
	{
		console.log("Load: " + name);
		var prog = window[name]; // Get program data
		document.getElementById("assemble_text").value = prog;
		assemble();
		
		//console.log(prog);
		
	}
		
	// Assemble test in edit area
	function assemble()
	{
		document.getElementById("assemble").innerHTML = "";
		document.getElementById("terminal").innerHTML = "";
		var t = document.getElementById("assemble_text").value;
		system.user_assemble(t);
		
	}

	// Hide Area
	function hide(area) 
	{ 
		var x = document.getElementById(area);
		x.style.display = "none";
	} 
	
	// Show Area
	function show(area) 
	{ 
		var x = document.getElementById(area);
		x.style.display = "block";
		
		// Give focus to area main element
		if (area == "system")	document.getElementById("fbuffer").focus();
		if (area == "terminal")	document.getElementById("terminal").focus();
	} 
	
	
	// Hide all areas and display one
	function load_area(area)
	{
		current = area;
		
		hide('system');
		hide('console');
		hide('terminal');
		hide('assembler');
		
		show(area);
		
		if (area == "system")
			document.getElementById("fbuffer").focus(); 
	}

	// Log to javascript console
	function log(item)
	{
		//item = replace_all(item, "\n", "");
		//console.log(item);		
		logger.log(item);
	}
	
	// Log Console messages
	function log_console(item)
	{
		logger.add("console", item, CON_MAX);
		//log(item);
	}

	// Log Console messages
	function log_assemble(item)
	{
		logger.add("assemble", item, ASSM_MAX);
		//log(item);
	}
	
	// Public Interface
	return 	{init : init,
			ui_click:ui_click,
			log_console : log_console,
			log_assemble : log_assemble,
			log : log, 
			load_area:load_area};
}());
