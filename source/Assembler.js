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
	
	const DEBUG = 0;			// True for assembly debug
	
	const NEWLINE = "NEWLINE";	// Newline token, internal use
	
	
	var address_table = [];  	// Stores known addresses
	var resolve_table = [];  	// Stores address that need resolved
	var cur_token = 0;			// Index of current token
	var cur_prog = 0;			// Location of next load 
	
	var cur_cpu = null;
		
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
	function assemble(cpu, str, prog_addr)
	{
		main.log_console(`${MODULE} [Assemble]\n`);
		//main.log(str);

		cur_cpu = CPU;
		
		cur_prog = prog_addr;
		
		address_table = [];
		resolve_table = [];


		str = remove_block_comments(str);
		
		
		
		var tokens = parse_tokens(str);

		
		
		console.log(tokens);
		
		//console.log(tokens);
		
		

		
		//console.log(tokens);
				
		// Assemble entire program
		
		if (assemble_tokens(tokens))
			return 1;
		
		// Resolve addresses
		for (var i = 0; i < resolve_table.length; i++)
		{
			var found = 0;
			for (var j = 0; j < address_table.length && found == 0; j++)
			{
				if (resolve_table[i].label == address_table[j].label)
				{
					memory.set_word(resolve_table[i].addr, address_table[j].addr);
					found = 1;
				}
			}
			
			if (found == 0)
			{
				main.log_console(`${MODULE} Unresolved symbol ${resolve_table[i].label} \n`);
				return 1;
			}
			
		}
		
		// Show address table
		main.log_console(`${MODULE} [Address Table]\n`);
		for (var i = 0; i < address_table.length; i++)
			main.log_console(`${MODULE}   ${address_table[i].label.padEnd(16)} ${hex_word(address_table[i].addr)}\n`);

		/* For Debugging 
		main.log_console(`${MODULE} Resolve Table\n`);
		for (var i = 0; i < resolve_table.length; i++)
			main.log_console(`${MODULE}   ${resolve_table[i].label.padEnd(16)} ${hex_word(resolve_table[i].addr)} \n`);*/
				
		
		disassemble(main.log, prog_addr, prog_addr + 0x100);
		disassemble(main.log_console, prog_addr, prog_addr + 0x40);
		
		return 0;
		
	}
	
	function remove_block_comments(str)
	{
		while (true)
		{
			var p1 = str.indexOf("/*");
			
			if (p1 == -1) break;			// No comment found
			
			var p2 = str.indexOf("*/");
			
			str = str.slice(0, p1) + str.slice(p2+2);			
		}
				
		return str;
	}
	
	
	
	
	// Get tokens from input string
	function parse_tokens(str)
	{
		var lines = str.split(/[\n]+/);
		var tokens = [];
			
		// Break lines apart into tokens
		for (var i = 0; i < lines.length; i++)
		{
			if (lines[i] == "") continue; // blank lines
			
			var count = 0; // number of tokens for line
			
			// Remove comments
			var p = lines[i].indexOf("//");
			if (p != -1) lines[i] = lines[i].substr(0, p);

			// Add to token list
			var t = lines[i].split(/[ \t]+/);
			for (var j = 0; j < t.length; j++)
			{	
				if (t[j].length > 0 && t[j] != "\t" )
				{
					//main.log("TKA: (" + t[j] + ")\n");
					
					tokens.push(t[j]);
					count++;
				}
			}
			
			if (count > 0)
				tokens.push(NEWLINE);	

		}
		return tokens;
	}
	

	
	
	/* 
		Private
	*/	
	
	// Assemble all tokens
	function assemble_tokens(tokens)
	{
		//log("Tokens: " + tokens.length);
		//log(tokens);
		
		cur_token = 0;
		
		while(cur_token < tokens.length)
		{
			//main.log_console("T:" + tokens[cur_token] + "\n");
			
			if (assemble_token(tokens, tokens[cur_token], tokens[cur_token+1]))
				return 1;
			cur_token++;
			
			// Consume newline
			if (tokens[cur_token] == NEWLINE)
				cur_token++;
		}
		
		return 0;
	}
	
	// Assemble token
	function assemble_token(tokens, token, next)
	{
		if (DEBUG)
			main.log("Token[" + cur_token + "]: " + token + "\n");
			
		if (token == "") return 0;
			
		// See if token is label
		// TODO Need to also detect label with semicolon
		if (is_label(token))
		{
			assemble_label(token);	
			return 0;
		}

		// See if token is instruction	
		var inst = find_inst(token, CPU.M_ANY);
					
		// Found instruction, add it to program listing
		if (inst != -1)
		{
			return (assemble_inst(inst, next));
			
		}
		
		// See if token is a define byte
		if (token == "DB")
		{
			return (assemble_db(tokens, next));
		}
			
			
		main.log_console(`Invalid Token: (${token})\n`);
		
		return 1;
	}
	

	
	// Assemble a label
	function assemble_label(token)
	{
		var label = get_label(token)
			
		//log("Add Label: " + label);
				
		address_table.push({addr:cur_prog, label:label});
	}
	
	// Assemble an instruction
	function assemble_inst(found_inst, next)
	{
		var operand = 0;
		
		var inst = cur_cpu.inst_table[found_inst];
			
		//console.log("Inst: " + inst.text + " next: " + next);
			
		// Implied mode
		if (inst.s == 0)
		//if (is_inst(next))
		{
			add_inst(found_inst, CPU.M_IMP, 0);	// Add to memory
			return 0;
		}


		var mode = CPU.N_NONE;	// No mod known yet
			
		// parse operand

		if (next == undefined)
		{
			main.log_console("Operand expected");
			return 1;
		}
		
		// Add to resolve list if opperand is a label
		if (is_label(next))
		{
			var label = get_label(next);
			
			// Need to add one to account for inst byte
			resolve_table.push({addr:cur_prog+1, label:label});
			
			mode = CPU.M_DIR;
			
		}else 
		// Check for char literal
		if (is_literal(next))
		{
			operand = ascii(next[1]);
			
			mode = CPU.M_IMM;
		} else
		if (is_immediate(next))
		{
			
			operand = parseInt(next.substr(1, next.length-1), 16); 
			mode = CPU.M_IMM;
			
		} else
		if (is_address(next))
		{
			operand = parseInt(next, 16); 
			
			mode = CPU.M_DIR;
		} else
		// Assume hex
		{
			main.log_console(`Invalid operand ${next}\n`);
			
			// Get value of operand
			//operand = parseInt(next, 16); 
			return 1;
		}
		
		
		// Adjust instruction for known address mode
		found_inst = find_inst(inst.text, mode);
		
		if (found_inst == -1)
		{
			main.log_console(`${MODULE} Address mode not found for ${inst.text} \n`);
			
			return 1;
		}
		
	
		cur_token += inst.s > 0 ? 1 : 0;		// Consume operands
		
		add_inst(found_inst, mode, operand);	// Add to memory
		
		return 0;
	}
	
		
	// Assemble a define byte
	function assemble_db(tokens, next)
	{
		//console.log("Assemble db : " + next);
		
		if (next == undefined)
		{
			main.log_console(`${MODULE} DB value expected\n`);
			
			return 1;
		}
		
		while(next != NEWLINE)
		{
		
			if (is_literal(next))
			{
				add_byte(ascii(next[1]));
				
			} else
			if (is_immediate(next))
			{
				add_byte(parseInt(next.substr(1, next.length-1), 16)); 
			}
		
			cur_token++;	// Consume byte
			next = tokens[cur_token+1];	// compute next
		}
		
		return 0;
	}
	
	// Add instruction to memory
	function add_inst(inst, mode, p1)
	{
		//main.log("Add Inst    " + hex_word(cur_prog) + " " +cur_cpu.inst_table[inst].text + "  " + p1);
		
		// Add instruction
		add_byte(inst);
		
		if (cur_cpu.inst_table[inst].s == 1) add_byte(p1);
		if (cur_cpu.inst_table[inst].s == 2) add_word(p1);
	}
	
	// Add instruction byte to program
	function add_byte(v) { memory.set_byte(cur_prog++, v); }
	
	// Add instruction word to program
	function add_word(v) { add_byte(v >> 8); add_byte(v & 0xff); }	
	
	
	
	
	
	
		
	// Look for inst in table
	function find_inst(token, mode)
	{
		var found_inst = -1;
		for (var inst in cur_cpu.inst_table) 
		{
			if (token.toUpperCase() == cur_cpu.inst_table[inst].text)
			{
				// Just match the text
				if (mode == CPU.M_ANY) return inst;
					
				// Also match mode
				if (cur_cpu.inst_table[inst].m == mode)
					return inst;
			}
		}
		
		return -1;
	}
	
	
	
			
	// Look for inst in table
	function is_inst(token)
	{
		for (var inst in cur_cpu.inst_table) 
		{
			if (token.toUpperCase() == cur_cpu.inst_table[inst].text) return 1;
		}
		
		return 0;
	}
	
	
	
	
	
	
	
	// True if is label
	function is_literal(s)
	{
		return s[0] == '\'' && s[s.length-1] == '\'' && s.length == 3;
	}	
	
	// True if immediate
	function is_immediate(next)
	{
		return next[0] == '#';
		
	}

	// True if char is hex
	function is_hex_char(c)
	{
		if (!(c>=0 && c <=9) || !(c >= 'a' && c <= 'f') || !(c >= 'A' && c <= 'F'))
			return 1;
		
		return 0;
	}
	
	// True if char is hex
	function is_hex_str(s)
	{
		for (var i = 0; i < s.length; i++)
		{
			if (!is_hex_char(s[i])) return 0;
		}
		return 1;
	}
			
	function is_address(s)
	{
		if (s.length != 4) return 0;
		if (!is_hex_str(s)) return 0;
		
		return 1;
	}


	function is_immediate(next)
	{
		return next[0] == '#';
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
	function disassemble(target, start, end)
	{
		main.log_console(`${MODULE} [Disassembly]\n`);
				
		var i = start;
		
		// Disassemble and consume operands
		while(i <= end) 
			i = disassemble_inst(target, i);
	}
	
	// Disassemble single inst 
	function disassemble_inst(target, i, flags)
	{
		var out = "";

		out += `${MODULE}   ${hex_word(i)}    `; // Address

		var inst_byte = memory.get_byte(i);	// instruction
		
		//main.log_console(hex_byte(inst));
		if (cur_cpu.inst_table[inst_byte] == undefined)
		{
			out += `Undefined inst: [${hex_word(i)}] ${inst}\n`;
			return;
		}
		
		var inst = cur_cpu.inst_table[inst_byte];
		
		// Inst name
		out += inst.text.padEnd(6) + "   ";

		if (inst.s == 0)	out += "    "; 
		if (inst.s == 1)	out += hex_byte(memory.get_byte(i+1)).padEnd(4); 
		if (inst.s == 2)	out += hex_word(memory.get_word(i+1));
	
		//log(address_table);
		//log_console("[" + find_addr_name(i) + "]");
		
		i += inst.s + 1;	
	
		out += "\n";
		
		target(out);
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
