/*
	CPU
	2019 nulluser
	
	File: Logger.js
*/

"use strict";

/*
	Logger
*/

// Main system object
var logger = (function () 
{
	var MODULE = "[Log]        ";
		
	const MAX_LEN = 400; 			// Need weird size because of spaces, TODO fix	
	
	//var t = 0;

	function init()
	{
		log_console("[Status]\n");
		log_terminal("[Terminal Output]\n");
		log_console(MODULE + "Init\n");
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
		//d = replace_all(d, " ", "&nbsp;");
		
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
		
	// Public Interface
	return 	{init : init,
			 add : add, 
			log : log};
}());
