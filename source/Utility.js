/*
	CPU
	2019 nulluser
	
	File: Main.js
*/

"use strict";

/*
	Utility
*/

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

