/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
*/

"use strict";

// CPU
// Pass in name, Memory, program and address
function Assembler(memory)
{
	const MODULE = "[Assembler] ";
	
	// Private 
	
	// Assembler
	var address_table = [];  	// Stores known addresses
	var resolve_table = [];  	// Stores address that need resolved
	var cur_token = 0;			// Index of current token
	var cur_prog = 0;			// Location of next load 
	var cur_inst_table = null;	// Instruction table of current cpu
		
	/* 
		Public 
	*/
	
	// Assembler Init
	function init()
	{
		main.log_console(MODULE + "Init\n");	
	}
			
	
	/* Assembler */
			
	// Assemble a string
	function assemble(inst_table, str, prog_addr)
	{
		main.log(`[${name}] Assemble\n`);
		//main.log(str);

		cur_inst_table = inst_table;

		if (cur_inst_table == null)
		{
			log_console("No inst table");
		}
		
		cur_prog = prog_addr;
		
		address_table = [];
		resolve_table = [];

		// Need to strip comments
		// Split into lines
		//var lines = str.split(/\r?\n/); 
		//var i =0;
		//while (i < lines.length)
		//			assemble_line(lines[i++], address_table, resolve_table);
		
		// Find tokens
		var tokens = str.split(/[ ,\t\n]+/);
				
		// Assemble entire program
		assemble_tokens(tokens);
		
		// Resolve addresses
		for (var i = 0; i < resolve_table.length; i++)
		{
			for (var j = 0; j < address_table.length; j++)
			{
				if (resolve_table[i].label == address_table[j].label)
				{
					memory.set_word(resolve_table[i].addr, address_table[j].addr);
									
					break;
				}
			}
		}
		
		// Show address table
		main.log_console("Address Table\n");
		for (var i = 0; i < address_table.length; i++)
			main.log_console(" " + address_table[i].label + "  " + hex_word(address_table[i].addr) + "\n");

		main.log_console("Resolve Table\n");
		for (var i = 0; i < resolve_table.length; i++)
			main.log_console(" " + resolve_table[i].label + "  " + hex_word(resolve_table[i].addr) + "\n");
		
		
		disassemble(prog_addr, prog_addr + 0x100);
	}
	
	// Assemble all tokens
	function assemble_tokens(tokens)
	{
		//log("Tokens: " + tokens.length);
		//log(tokens);
		
		cur_token = 0;
		
		while(cur_token < tokens.length)
		{
			assemble_token(tokens[cur_token], tokens[cur_token+1]);		
			cur_token++;
		}
	}
	
	// Assemble token
	function assemble_token(token, next)
	{
		//main.log("Token[" + cur_token + "]: " + token);
			
		if (token == "") return;
			
		// See if we have a label
		if (is_label(token))
		{
			var label = get_label(token)
			
			//log("Add Label: " + label);
				
			address_table.push({addr:cur_prog, label:label});
				
			return;
		}
			
		// Look for inst in table
		var found_inst = -1;
		for (var it in cur_inst_table) 
		{
			if (token.toUpperCase() == cur_inst_table[it].text)
			{
				found_inst = it;
			}
		}
					
		// Found instruction, add it to program listing
		if (found_inst != -1)
		{
			var operand = 0;
			
			// parse operand, if needed
			if (cur_inst_table[found_inst].size > 0)
			{
				// Add to resolve list if opperand is a label
				if (is_label(next))
				{
					var label = get_label(next);
					
					// Need to add one to account for inst byte
					resolve_table.push({addr:cur_prog+1, label:label});
				}else 
				// Check for char literal
				if (is_literal(next))
				{
					operand = ascii(next[1]);
				} else
				// Assume hex
				{
					// Get value of operand
					operand = parseInt(next, 16); 
				}
				
				// We consumed one token for the operand
				cur_token++;
			}

			add_inst(found_inst, operand);

			return;
		}
		
		
		// Check for DB, define byte
		if (token == "DB")
		{
			if (is_literal(next))
			{
				add_byte(ascii(next[1]));
					
			} else
				add_byte(parseInt(next, 16));
		}
		
		//main.log_console("Invalid Token: " + token + "\n");
	}
	
	// Add instruction to memory
	function add_inst(inst, p1)
	{
		//main.log("Add Inst    " + hex_word(cur_prog) + " " +cur_inst_table[inst].text + "  " + p1);
		
		// Add instruction
		add_byte(inst);
		
		if (cur_inst_table[inst].size == 1) add_byte(p1);
		if (cur_inst_table[inst].size == 2) add_word(p1);
	}
	
	// Add instruction byte to program
	function add_byte(v) { memory.set_byte(cur_prog++, v); }
	
	// Add instruction word to program
	function add_word(v) { add_byte(v >> 8); add_byte(v & 0xff); }	
	
	// True if is label
	function is_literal(s)
	{
		return s[0] == '\'' && s[s.length-1] == '\'' && s.length == 3;
	}	
	
	// True if is label
	function is_label(s)
	{
		return s[s.length-1] == ':';
	}
	
	// Get label from string
	function get_label(s)
	{
		return s.substring(0, s.length-1);
	}
	
	/* End of Assembler */
	
	
	/* Disassembler */
	
	// Show Disassembly
	function disassemble(start, end)
	{
		main.log_console("[Disassembly]\n");
				
		var i = start;
		
		// Disassemble and consume operands
		while(i <= end) 
			i = disassemble_inst(i);
		
		main.log_console("[End of Disassembly]\n");
	}
	
	// Disassemble single inst 
	function disassemble_inst(i, flags)
	{
		main.log_console(hex_word(i) + " "); // Address

		var inst = memory.get_byte(i);	// instruction
		
		//main.log_console(hex_byte(inst));
		if (cur_inst_table[inst] == undefined)
		{
			main.log_console("Undefined inst: [" + hex_word(i) +"] " + inst + "\n");
			return;
		}
		
		// Inst name
		main.log_console(pad_inst(cur_inst_table[inst].text) + "   ");

		if (cur_inst_table[inst].size == 0)	main.log_console(pad_inst("")); 
		if (cur_inst_table[inst].size == 1)	main.log_console(pad_inst(hex_byte(memory.get_byte(i+1)))); 
		if (cur_inst_table[inst].size == 2)	main.log_console(hex_word(memory.get_word(i+1)));
	
		if (flags)
		{
			main.log_console("  IP: " + hex_word(ip) + "    A: " + hex_byte(a) + " SP: " + hex_word(sp) + 
							 " P: " + hex_word(p) + " E: " + (e?1:0) + " G: " + (g?1:0) + "L " + (l?1:0));
		}
		
		//log(address_table);
		//log_console("[" + find_addr_name(i) + "]");
		
		i += cur_inst_table[inst].size + 1;	
	
		main.log_console("\n");
		return i;
	}		
	
	// Get name of address
	function find_addr_name(i)
	{
		/*return ("");

		// See if we know address
		for (var j = 0; j < address_table.length; j++)
		{
			log(address_table[j].label  + " " + hex_word(address_table[j].addr) + " Target " + hex_word(i));
			
			if (address_table[j].addr == i)
				return address_table[j].label;
		}*/
		return "";
	}
	
	
	// Pad inst for display 
	function pad_inst(str) 
	{
		var pad = "    ";

		return (str + pad).substring(0, pad.length);
	}
		
	// Show Disassembly
	function dump_stack(elements)
	{
		main.log_console("[Stack Dump]\n");
				
		/*var i = 0;
		
		for (var i = start; i < end; i++)
		{
			var v = memory[i];
			if (v != undefined)
			main.log_console(hex_word(i) + "   " + hex_byte(v) + " (" + String.fromCharCode(v)+ ")\n"); // Address
		}
		
		main.log_console("[End of Stack]\n");*/
	}		
	
	/* End of Disassembler */

	return {init:init, assemble:assemble};
}

