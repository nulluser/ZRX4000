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
var logger = (function () 
{
	var MODULE = "[Log]        ";
		
	const MAX_LEN = 300; 			// Need weird size because of spaces, TODO fix	
	const ASSM_MAX = 1000;
	const CON_MAX = 500;
	const TERM_MAX = 20;
	
	//var t = 0;

	function init()
	{
		log_console("[Status]\n");
		log_terminal("[Terminal Output]\n");
		log_console(MODULE + "Init\n");
	}
	
	
	/* Logging */
	// This has to be done to get around cross site scripting 
	function debug_init()
	{
		// Create log window
		//debug_window = window.open("", "debug_window", "width=512,height=512,directories=0,titlebar=0,toolbar=0,location=0,status=0,menubar=0,scrollbars=yes,resizable=no");
		/*debug_window = window.open("", "debug_window", "width=512,height=512");
		
		var html = 
		`
		<!DOCTYPE html>
		<html>
		<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<style> body {padding:0px; margin:0px; overflow:scroll-y;} </style>
		</head>
		<body>
		<strong><code>
		<div id="main-wrap" style="width:100%;">
		<div id="console" style='width:50%; height:100%; float:left'></div>
		<div id="output" style='width:50%; height:100%; float:right'></div>
		</div>
		</code></strong>
		</body>
		</html>
		`;

		debug_window.document.write(html); // Inject*/
	}
	
	
	// Replace all in string
	function replace_all(str, find, replace) 
	{
		return str.replace(new RegExp(find, 'g'), replace);
	}

	// Fix weird chars
	function format_output(d)
	{
		d = replace_all(d, "\n", "");
		d = replace_all(d, " ", "&nbsp;");
		
		return d;
	}
	
	// Scroll to bottom
	function scroll_down()
	{
		var scrollingElement = (debug_window.document.scrollingElement || debug_window.document.body);
		scrollingElement.scrollTop = scrollingElement.scrollHeight;
	}

	// True if newline in string
	function is_newline(c)
	{
		return ascii(c) == 0x0d || ascii(c) == 0x0a;
	}
		
	// Add line to log
	function shift_log(l, max)
	{
		// Shift down
		l.appendChild(document.createElement('div'));

		// Limit
		while(l.children.length > max-1) 
			 l.removeChild(l.children[0]);
	}
	
	// Add item to log list
	function add(log_area, item, max_lines)
	{
		var l = document.getElementById(log_area)

		// Make sure we have at least one element
		if (l.children.length == 0)
			l.appendChild(document.createElement('div'));
		
		item += ""; 		// Force into string
		
		var i = 0;
		var st = "";		// Current string
		
		// Need to process all items to deal with shifting
		while (i < item.length)
		{
			// next char
			var ch = item[i];
		
			// Shift if newline
			if (is_newline(ch) || st.length >= MAX_LEN)
			{
				l.children[l.children.length-1].innerHTML += format_output(st);		
				st = "";
				shift_log(l, max_lines);
			}
			else
			{
				st += ch;		// Add to current
			}
			
			i++;
		}

		var out = format_output(st);
		
		// Enforce length
		if (l.children[l.children.length-1].innerHTML.length + out.length > MAX_LEN)
		{
			shift_log(l, max_lines);		
		}
		
		l.children[l.children.length-1].innerHTML += out;
		
	}


	// Log to javascript console
	function log(item)
	{
		item = replace_all(item, "\n", "");
		console.log(item);		
	}
	
	// Log CPU Output
	function terminal(item)
	{
		add_log("terminal_out", item, TERM_MAX);
		//log(item);
	}

	// Log Console messages
	function console(item)
	{
		add_log("console", item, CON_MAX);
		//log(item);
	}

	// Log Console messages
	function assemble(item)
	{
		add_log("assemble", item, ASSM_MAX);
		//log(item);
	}
	
	// Public Interface
	return 	{init : init,
			 add : add, 
			console : console,
			terminal : terminal,
			assemble : assemble,
			log : log};
}());
