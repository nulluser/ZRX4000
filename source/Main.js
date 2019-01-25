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
	const MAX_LEN = 250; 			// Need weird size because of spaces, TODO fix
	const MAX_LINES = 50;			// Log lines
	const RENDER_TIME = 500;		// DOM logging is slow, throttle
	
	var debug_window;
	var output_log = [];
	var console_log = [];
	var system = null;
	
	function init()
	{
		debug_init();
					
		// Prime logs
		log_console("[Status]\n");
		log_output("[Program Output]\n");
		log_console(MODULE + "Init\n");
		
		render_log();
		
		system = System();
		system.init();
		
		//setInterval(function(){log_console("tesss222ssst " + t + "\n");t++; }, 100);
		//setInterval(function(){log_output("tewwst " + t + "\n");t++; }, 100);
		
		setInterval(render_log, RENDER_TIME);
	}
	
	
	/* 
		TODO This logging mess needs to go 
		This is needde so the console does not get flooded and lock the browser up
	*/
	
	
	
	/* Logging */
	// This has to be done to get around cross site scripting 
	function debug_init()
	{
		// Create frame buffer window
		//debug_window = window.open("", "debug_window", "width=512,height=512,directories=0,titlebar=0,toolbar=0,location=0,status=0,menubar=0,scrollbars=yes,resizable=no");

		debug_window = window.open("", "debug_window", "width=512,height=512");

		
		var html = 
		`
		<!DOCTYPE html>
		<html>
		<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<style> body {padding:0px; margin:0px; overflow:scroll-y;} </style>
		</head>
		<body>
		<strong>
		<code>
		<div id="main-wrap" style="width:100%;">
		<div id="console" style='width:50%; height:100%; float:left'></div>
		<div id="output" style='width:50%; height:100%; float:right'></div>
		</div>
		</code>
		</strong>
		</body>
		</html>
		`;

		debug_window.document.write(html); // Inject
	}
	
	
	// Replace all in string
	function replace_all(str, find, replace) 
	{
		return str.replace(new RegExp(find, 'g'), replace);
	}

	// Fisx weird chars
	function format_output(d)
	{
		d += ""; // Force string
		d = replace_all(d, "\n", "");
		d = replace_all(d, " ", "&nbsp;");
		
		return d;
	}

	// Display current log
	function render_log()
	{
		var out = debug_window.document.getElementById("output");
		
		out.innerHTML = "";
		
		for  (var i = 0; i < output_log.length; i++)
			out.innerHTML += output_log[i] + "<br>";
		
		var con = debug_window.document.getElementById("console");
		
		con.innerHTML = "";
		for  (var i = 0; i < console_log.length; i++)
			con.innerHTML += " " + console_log[i] + "<br>";
	}

	// True if newline in string
	function has_newline(item)
	{
		for (var i = 0; i < item.length; i++)
			if (ascii(item[i]) == 0x0d || ascii(item[i]) == 0x0a) return 1;

		return 0;
	}

	// Add item to log list
	function add_log(lines, item)
	{
		var shift = has_newline(item);	// See if we need to shift later

		item = format_output(item);		// Fix Spaces
		
		if (lines.length == 0) lines.push("");// Make sure we at least one line

		lines[lines.length-1] += item;		// Append to current
		
		// Check length
		if (lines[lines.length-1].length >= MAX_LEN) 
		{
			lines[lines.length-1] = lines[lines.length-1].substr(0, MAX_LEN);
			shift = 1;
		}
		
		// Shift lines up
		if (shift)
		{
			// Add a line 
			if (lines.length < MAX_LINES)
				lines.push("");
			else
			{
				// Shift lines
				for (var i = 1; i < lines.length; i++)
					lines[i-1] = lines[i];

				lines[lines.length-1] = "";		// Clear last
			}
		}
		
		//render_log();
	}


	function log(item)
	{
		debug_window.console.log(item);		
		console.log(item);		
	}
	
	// Log CPU Output
	function log_output(item)
	{
		//return;
		add_log(output_log, item + "");
	}

	// Log console messages
	function log_console(item)
	{
		//return;
		add_log(console_log, item + "");
		
		//console.log(item);
	}

	// Public Interface
	return 	{init : init,
			render_log : render_log,
			log_console : log_console,
			log_output : log_output,
			log : log};
}());
