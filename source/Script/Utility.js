/*
	CPU
	2019 nulluser
	
	File: Main.js
*/

"use strict";

/*
	Utility
*/

// Fix tab for text box
function capture_tab(event, edit)
{
	if(event.keyCode===9)
	{
		var v=edit.value,s=edit.selectionStart,e=edit.selectionEnd;
		
		edit.value=v.substring(0, s)+'\t'+v.substring(e);
		edit.selectionStart=edit.selectionEnd=s+1;
		
		if(event.preventDefault) event.preventDefault();
    	
		return false;
	}
	return true;
}


// Get byte as hex string
function hex_byte(d)
{
	var hex = Number(d).toString(16);
	hex = "00".substr(0, 2 - hex.length) + hex; 
	return hex.toUpperCase();
}
	
// Get word as hex string
function hex_word(d)
{
	var hex = Number(d).toString(16);
	hex = "0000".substr(0, 4 - hex.length) + hex; 
	return hex.toUpperCase();
}	

// Get word as hex string
function hex_dword(d)
{
	var hex = Number(d).toString(16);
	hex = "00000000".substr(0, 8 - hex.length) + hex; 
	return hex.toUpperCase();
}

// Get ascii value
function ascii (a) 
{ 
	return a.charCodeAt(0); 
}

// Get ascii char
function get_char(v) 
{ 
	return String.fromCharCode(v); 
};


