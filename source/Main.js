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

	function init()
	{
		// Prime logs
		log_console("[Status]\n");
		log_console(MODULE + "Init\n");
				
		system = System();
		
		//load(DEFAULT_PROG);
		//assemble();

		load(gpu_test1);
		//assemble();

		
		
	}
	
	// Load default program
	function load(prog)
	{
		document.getElementById("assemble_text").value = prog;
	}
	
	
	// Load default program
	function load_click()
	{
		load_area("assembler");
		load(DEFAULT_PROG);
	}
	
	// User wants to assemble
	function assemble()
	{
		var t = document.getElementById("assemble_text").value;
		system.user_assemble(t);
	}
	
	// User wants to assemble
	function assemble_click()
	{
		load_area("assembler");
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
		hide('system');
		hide('console');
		hide('terminal');
		hide('assembler');
		
		show(area);
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
			load_click :load_click, 
			assemble_click:assemble_click,
			log_console : log_console,
			log_assemble : log_assemble,
			log : log, 
			load_area:load_area};
}());
