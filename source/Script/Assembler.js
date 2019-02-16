/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
*/

"use strict";

// Assembler
function Assembler(memory)
{
	const MODULE = "[Assembler] ";
	
	// Private 
	const DEBUG = 0;			// True for assembly debug
	
	const DISS_LEN = 0xA00;		// How much to disassemble
	const M_ABS = 1;			// Modes for addresses
	const M_REL = 2;			// Relative
	const M_OFS = 3;			// Offset
	const M_HI = 4;				// High byte
	const M_LO = 5;				// Low byte
	
	var address_table = [];  	// Stores known addresses
	var resolve_table = [];  	// Stores address that need resolved
	var cur_prog = 0;			// Location of next load 
	var last_org = 0;			// Last origin
	
	var cur_cpu = null;			// Reference to CPU 
		
		
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
		main.log_assemble(`${MODULE} [Assemble]\n`);
		//main.log(str);

		if (str == "")
		{
			main.log_assemble(`No Program ${str}\n`);
			return;
		}		
		
		cur_cpu = cpu;
		
		cur_prog = prog_addr; // TODO: can be removed probably
		
		address_table = [];
		resolve_table = [];
		
		str = remove_block_comments(str);		// Eat block comments in plain text

		var lines = str.split("\n");
		
		// Assemble entire program
		if (assemble_lines(lines))
		{
			main.log_assemble(`${MODULE} Failed to assemble\n`);
			return 1;
		}
		
		if (resolve_addresses())
		{
			main.log_assemble(`${MODULE} Failed to resolve addresses\n`);
			return 1;
		}
		
		disassemble(main.log_assemble, last_org, last_org + DISS_LEN);
		
		return 0;
	}
	
	/* 
		Private
	*/	
	
	
	// Remove block comments from string
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

	
	// Assemble all lines
	function assemble_lines(lines)
	{
		var cur_line = 0;
		
		while(cur_line < lines.length)
		{
			if (assemble_line(lines[cur_line]))
			{
				main.log_assemble(`Assembly failed on line ${cur_line+1} (${lines[cur_line]})\n`);
				return 1;
			}
				
			cur_line++;
		}
		
		return 0;
	}
	
	
	
	
	// Return index into address table if label found, -1 otherwise
	function find_label(label)
	{
		for (var i = 0; i < address_table.length; i++)
			if (label == address_table[i].label) return i;

		return -1;
	}
	
	
	// Fill in addresses they were unknown in first pass
	function resolve_addresses()
	{
		// Resolve addresses
		for (var i = 0; i < resolve_table.length; i++)
		{
			var resolve = resolve_table[i];		// Element we are resolving 
			
			var label_index = find_label(resolve.label);
			
			if (label_index == -1)
			{
				main.log_assemble(`${MODULE} Unresolved symbol (${resolve.label}) \n`);
				return 1;				
			}
			
			// Known address
			var address = address_table[label_index];		

			// Check address modes
			if(resolve.mode == M_ABS) memory.set_word(resolve.addr, address.addr); else 				// Absolute address
			if(resolve.mode == M_OFS) memory.set_word(resolve.addr, address.addr + resolve.ofs); else	// Offset Address
			if(resolve.mode == M_HI)  memory.set_byte(resolve.addr, address.addr >> 8); else			// High byte of address
			if(resolve.mode == M_LO)  memory.set_byte(resolve.addr, address.addr & 0xff); else			// Low byte of address
			if(resolve.mode == M_REL) // Relative address
			{
				var delta = address.addr - resolve.addr - 1;

				if (delta < -128 || delta > 127)
				{
					console.log("Jump to far.  Label: " + resolve.label + "  Loc: " + hex_word(resolve.addr) + " Delta: " + hex_byte(delta));
					return 1;
				}
						
				memory.set_byte(resolve.addr, delta);
			} else
			// Unknown mode
			{
				main.log_assemble(`${MODULE} Resolve Address: Unknown mode: ${resolve.mode} \n`);
				return 1;
			}
			
		}
		
		// Show address table
		
		/*main.log_assemble(`${MODULE} [Address Table]\n`);
		for (var i = 0; i < address_table.length; i++)
			main.log_assemble(`${MODULE}   ${address_table[i].label.padEnd(16)} ${hex_word(address_table[i].addr)}\n`);*/
		
		return 0;
	}
	
		
	// Get tokens from input string
	function parse_tokens(line)
	{
		var tokens = [];
		
		var p = line.indexOf(";");				// Remove line comments
		if (p != -1) line = line.substr(0, p);
		
		var regx = /[^\s"]+|"([^"]*)"/gi; 		// Create captured group
	
		//Each call to exec returns the next regex match as an array
		//Index 1 is the string. Add quotes to detect as string later
		//Index 0 is the matched token
		
		var match;
		while ((match = regx.exec(line)) != null)
				tokens.push(match[1] ? "\"" + match[1] + "\"" : match[0]);
			
		return tokens;
	}

	
	/* Core assembler */
	
	// Assemble a line
	function assemble_line(line)
	{
		if (line == "") return 0;				// Do not process plank lines
	
		var tokens = parse_tokens(line);		// Split line into tokens by whitespace. Keep strings

		if (tokens.length == 0) return 0;		// No tokens in line		

		// See if token is label. This is added to address table and consumed
		if (is_label(tokens[0]))
		{
			// Add to known addresses
			address_table.push({addr:cur_prog, label:tokens[0]});
			
			// Remove label token
			tokens.splice(0, 1);
			
			if (tokens.length == 0) return 0;					// No tokens left line		
		}		
	
		if (assemble_inst(tokens) == 0) return 0;		// Try Instruction
		if (assemble_byte(tokens) == 0) return 0;		// Try .byte
		if (assemble_word(tokens) == 0) return 0;		// Try .word
		if (assemble_org(tokens) == 0) return 0;		// try .org
		
		// Unknown
		main.log_assemble(`${MODULE} Invalid Token: (${tokens[0]})\n`);
		
		return 1;
	}
	


	/* 
		High Level assembly 
	*/
	
	
	// Assemble an instruction
	//function assemble_inst(found_inst, next)
	function assemble_inst(line_tokens)
	{
		// See if token is instruction. Correct instruction for mode will be determined later	
		var inst_index = find_inst(line_tokens[0], cur_cpu.M_ANY);
					
		// Did not find as instruction
		if (inst_index == -1) return 1;
		
		var next = line_tokens[1];
		
		var operand = 0;
		
		var result = decode_operand(inst_index, next);	
		
		// Unable to decode mode
		if (result.mode == cur_cpu.M_NONE) 
		{
			main.log_assemble(`${MODULE} assemble inst: Invalid operand ${next}\n`);
			return 1;
		}
		
		// Adjust instruction for known address mode
		inst_index = find_inst(line_tokens[0], result.mode);
		
		if (inst_index == -1)
		{
			main.log_assemble(`${MODULE} Address mode not found for ${line_tokens[0]} ${cur_cpu.MODE_TEXT(result.mode)}\n`);
			console.log(`${MODULE} Address mode not found for ${line_tokens[0]} ${cur_cpu.MODE_TEXT(result.mode)}\n`);
			return 1;
		}
		
		add_inst(inst_index, result.mode, result.operand);	// Add to memory
		
		return 0;
	}
	
	// Decode the operand
	function decode_operand(inst_index, next)
	{
		var result = {mode:cur_cpu.M_NONE, operand:0};
		
		// Mode from first match instruction. Used for relative
		var mode = cur_cpu.inst_table[inst_index].m;
		
		// Build a list of functions to check the operand against. Must be checked in order
		var check_funcs = {	check_implied, check_relative, check_abs,
							check_immediate, check_zp, check_zpx, check_zpy, 
							check_ind, check_absx, check_absy, check_xind, check_indy};
		
		// Look for a match
		for (var i in check_funcs)
			if (check_funcs[i](next, mode, result)) return result;
		
		return result;
	}
	
	
	/* Address mode checks */
	
	
	// Implied
	function check_implied(op, mode, result)
	{
		if (op != undefined) return 0; // Todo: needs a better check
		
		result.mode = cur_cpu.M_IMP;

		return 1;
	}
	

	// See if address is relative
	function check_relative(op, mode, result)
	{
		if (mode != cur_cpu.M_REL) return 0;
		
		resolve_table.push({addr:cur_prog+1, label:op, mode:M_REL});
			
		result.mode = cur_cpu.M_REL;		
			
		return 1;
	}
	
	// Absolute
	function check_abs(op, mode, result)
	{
		if (is_offset_label(op))
		{
			assemble_offset_label(op);
			result.mode = cur_cpu.M_ABS;
			return 1;
		}

		if (is_label(op))
		{
			resolve_table.push({addr:cur_prog+1, label:op, mode:M_ABS});
			result.mode = cur_cpu.M_ABS;
			return 1;
		}
		
		if (is_address(op)) 
		{
			result.operand = hex_value(op);
			result.mode = cur_cpu.M_ABS;
			return 1;
		}
		
		return 0;
	}
	
	// immediate
	function check_immediate(op, mode, result)
	{
		// Check for char literal
		if (is_literal(op))
		{
			operand = ascii(op[1]);
			
			result.mode = cur_cpu.M_IMM;
			
			return 1;
		}
		
		
		if (is_immediate(op))
		{
			// Check for address operators
		
			// Low address
			if (op[1] == '<')
			{
				var label = op.substr(2, op.length);
				resolve_table.push({addr:cur_prog+1, label:label, mode:M_LO});	
			}
			else
			if (op[1] == '>')
			{
				var label = op.substr(2, op.length);
				resolve_table.push({addr:cur_prog+1, label:label, mode:M_HI});	
			}
			else
			{
				result.operand = parseInt(op.substr(2, op.length-1), 16); 
			}
			
			result.mode = cur_cpu.M_IMM;

			return 1;
		}
		
		return 0;
	}
		
	// Zero page
	function check_zp(op, mode, result)
	{	
		// Match $XX
		if (op[0] != '$') return 0;
		if (op.length != 3) return 0;
		if (!is_hex_str(op.substr(1, op.length))) return 0;

		result.operand = hex_value(op);
		result.mode = cur_cpu.M_ZP;
		
		return 1;
	}
		
	// Zero page X
	function check_zpx(op, mode, result)		
	{
		if (op.length != 5) return 0;
		
		if (op[0] != '$') return 0;
		if (op[3] != ',') return 0;
		if (op[4] != 'X') return 0;
		
		if (!is_hex_str(op.substr(1, 2))) return 0;		

		result.operand = hex_value(op.substr(0, op.length-2));
		result.mode = cur_cpu.M_ZPX;
		
		return 1;
	}
			
	// Zero page Y
	function check_zpy(op, mode, result)	
	{	
		if (op.length != 5) return 0;
		if (op[0] != '$') return 0;
		if (op[3] != ',') return 0;
		if (op[4] != 'Y') return 0;
		if (!is_hex_str(op.substr(1, 2))) return 0;

		result.operand = hex_value(op.substr(0, op.length-2));
		result.mode = cur_cpu.M_ZPY;
		
		return 1;
	}
			
	// Indirect
	function check_ind(op, mode, result)
	{	
		// Check for (xxxx)
		if (op[0] != '(' || op[op.length-1] != ')') return 0;

		var addr = op.substr(1, op.length-2);
		
		// TODO need to check for a label here

		result.operand = hex_value(addr);						
		result.mode = cur_cpu.M_IND;
			
		return 1;
	}
		
	// Absolute X
	function check_absx(op, mode, result)
	{	
		if (op[op.length-2] != ',') return 0;
		if (op[op.length-1] != 'X') return 0;
		
		var  addr = op.substr(0, op.length-2);
		
		// make sure it's a valid address type
		if (!is_label(addr) && !is_offset_label(addr) && !is_address(addr)) return 0;
				
		if (is_address(addr)) 
		{
			result.operand = hex_value(op);
			result.mode = cur_cpu.M_ABS;
			
		} else
		if (is_label(addr)) 
		{
			assemble_label(addr); 
			result.operand = 0xffff;
			result.mode = cur_cpu.M_ABSX;	
		} else
		{
			main.log_assemble(`${MODULE} ABSX: Unknown label type ${label}\n`);
			return 0;
		}
		
		return 1;
	}
		
	// Absolute Y		
	function check_absy(op, mode, result)		
	{
		if (op[op.length-2] != ',') return 0;
		if (op[op.length-1] != 'Y') return 0;
		
		var addr = op.substr(0, op.length-2);
		
		// Make sure it's a valid address type
		if (!is_label(addr) && !is_offset_label(addr) && !is_address(addr)) return 0;
		
		if (is_address(addr)) 
		{
			result.operand = hex_value(op);
			result.mode = cur_cpu.M_ABS;
			
		} else
		if (is_label(addr)) 
		{
			assemble_label(addr); 
			result.operand = 0xffff;
			result.mode = cur_cpu.M_ABSY;	
		} else
		{
			main.log_assemble(`${MODULE} ABSY: Unknown label type ${label}\n`);
			return 0;
		}
		
		return 1;
	}
				
	// X Indirect
	function check_xind(op, mode, result)	
	{	
		// TODO replace with match(
		if (op[0] != '(' || op[1] != '$') return 0;
		if (!is_hex_char(op[op])) return 0;
		if (!is_hex_char(op[op])) return 0;
		if (op[4] != ',' || op[5] != 'X' || op[6] != ')') return 0;
		
		result.operand = hex_value(op.substr(1, 3));
			
		result.mode = cur_cpu.M_INDY;
			
		return 1;	
	}
		
	// Indirect Y
	function check_indy(op, mode, result)		
	{
		if (op[0] != '(' || op[1] != '$') return 0;
		if (!is_hex_char(op[2])) return 0;
		if (!is_hex_char(op[3])) return 0;
		if (op[4] != ')' || op[5] != ',' || op[6] != 'Y') return 0;
		
		result.operand = hex_value(op.substr(1, 3));
		result.mode = cur_cpu.M_INDY;
			
		return 1;
	} 

	/* Assemble Items */
	
	// Assemble a define byte
	function assemble_word(tokens)
	{
		if (tokens[0] != ".word") return 1;
		
		tokens.splice(0, 1); // Consume ".word"

		var next = tokens[0];
		
		if (next == undefined)
		{
			main.log_assemble(`${MODULE} .word value expected\n`);			
			return 1;
		}
				
		var cur_token = 0;
		
		while(cur_token < tokens.length)
		{
			next = tokens[cur_token];	

			if (is_label(next))
			{
				resolve_table.push({addr:cur_prog, label:next, mode:M_ABS});
				add_word(0); 
			} else
			if (is_address(next))
			{
				add_word(parseInt(next, 16)); 
			}else
			{
				main.log_assemble("assemble_word: no operand\n");
				return 1;
			}
			
			cur_token++;	
		}
		
		return 0;
	}	
		
	// Assemble a define byte
	function assemble_byte(tokens)
	{
		if (tokens[0] != ".byte") return 1;
		
		tokens.splice(0, 1); // Consume ".byte"

		var next = tokens[0];		
		
		if (next == undefined)
		{
			main.log_assemble(`${MODULE} .byte value expected\n`);
			return 1;
		}
		
		var cur_token = 0;
		
		while(cur_token < tokens.length)
		{
			next = tokens[cur_token];	
			
			// get rid of comma if present
			if (next.substr(next.length-1, next.length) == ',')
				next = next.substr(0, next.length-1);
			
			if (is_hex_byte(next))
			{
				add_byte(parseInt(next.substr(1, next.length-1), 16)); 
			} else
			if (is_immediate(next))
			{
				add_byte(parseInt(next.substr(1, next.length-1), 16)); 
			} else
			if (is_string(next))
			{
				for (var i = 1; i < next.length-1; i++)
					add_byte(ascii(next[i]));
				
			} else
			{
				main.log_assemble(`${MODULE} byte value expected ${next}\n`);
				return 1;
			}
		
			cur_token++;	
		}
		
		return 0;
	}
	
	// Assemble a define byte
	function assemble_org(tokens)
	{
		if (tokens[0] != ".org") return 1;
		
		var next = tokens[1];
		
		if (next == undefined)
		{
			main.log_assemble(`${MODULE} ORG value expected\n`);
			return 1;
		}

		// Check for valid address
		if(!is_address(next))
		{
			main.log_assemble(`${MODULE} ORG address expected (${next})\n`);
			return 1;
		}

		cur_prog = hex_value(next);
		
		last_org = cur_prog;
		
		main.log_assemble(`${MODULE} ORG (${hex_word(cur_prog)})\n`);

		return 0;
	}	
	
	// Assemble a label
	function assemble_label(label)
	{
		// Check for offset label
		if (is_offset_label(label)) 
		{
			assemble_offset_label(label); 
			return;
		}
		
		resolve_table.push({addr:cur_prog+1, label:label, mode:M_ABS});		
	}

	// Assemble an offset label.  TODO combine into assemble absolute
	function assemble_offset_label(next)
	{
		var label = next.substr(0, next.length-4);
		var ofs = next.substr(next.length-4, next.length);
			
		var sign = ofs[0];
		var ofs_value = parseInt(ofs.substr(2, ofs.length), 16);
			
		if (sign == '-') ofs_value *= -1;
		
		resolve_table.push({addr:cur_prog+1, label:label, ofs:ofs_value, mode:M_OFS});
	}
	
	/* Memory Access */
	
	// Add instruction to memory
	function add_inst(inst, mode, p1)
	{
		var val = cur_cpu.inst_table[inst].s == 0 ? "" : (cur_cpu.inst_table[inst].s == 1 ? hex_byte(p1) : hex_word(p1) )   ;
		
		// Add instruction
		add_byte(inst);
		
		if (cur_cpu.inst_table[inst].s == 1) add_byte(p1);
		if (cur_cpu.inst_table[inst].s == 2) add_word(p1);
	}
	
	// Add instruction byte to program
	function add_byte(v)
	{
		//console.log(hex_byte(v));
		memory.set_byte(cur_prog++, v); 
	}
	
	// Add instruction word to program
	function add_word(v) { add_byte(v & 0xff); add_byte(v >> 8);  }	

	/* Type checks */
		
	// Look for inst in table
	function find_inst(token, mode)
	{
		for (var inst in cur_cpu.inst_table) 
		{
			if (token.toUpperCase() == cur_cpu.inst_table[inst].text)
			{
				// Just match the text
				if (mode == cur_cpu.M_ANY) return inst;
					
				// Also match mode
				if (cur_cpu.inst_table[inst].m == mode)
					return inst;
			}
		}
		
		return -1;
	}
	
	// True if char is hex
	function is_hex_char(c)
	{
		if (c >= '0' && c <= '9') return 1;
		if (c >= 'a' && c <= 'f') return 1;	
		if (c >= 'A' && c <= 'F') return 1;	

		return 0;
	}
		
	// True if string is hex
	function is_hex_str(s)
	{
		for (var i = 0; i < s.length; i++)
			if (!is_hex_char(s[i])) return 0;

		return 1;
	}
			
	function is_hex_byte(s)
	{
		if (s[0] != '$') return 0;
		if (s.length != 3) return 0;
		if (!is_hex_str(s.substr(1, s.length))) return 0;
		
		return 1;
	}	
	
	// True if token is string
	function is_string(s)
	{
		if (s[0] != '"') return 0;
		if (s[s.length-1] != '"') return 0;
		
		return 1;
	}
	
	// True if token is label
	function is_literal(s)
	{
		return s[0] == '\'' && s[s.length-1] == '\'' && s.length == 3;
	}	
	
	// True if token is valid label char
	function is_label_char(c, first)
	{
		// Upper and lower case ok for first char
		if (c >= 'a' && c <= 'z') return 1;
		if (c >= 'A' && c <= 'Z') return 1;
		
		// Underscore and Numbers ok for remaining 
		if (!first)
		{
			if (c == '_') return 1;
			if (c >= '0' && c <= '9') return 1;
		}
		
		return 0;
	}
	
	// True if label or offset label
	function is_label(s)
	{		
		// Check for offset label first
		if (is_offset_label(s)) return 1; 
		
		// Make sure all chars are valid
		for (var i = 0; i < s.length; i++)
		{
			if ( !is_label_char(s[i], i == 0)) return 0; 
		}
		
		// Make sure it is not an instruction
		if (find_inst(s, cur_cpu.M_ANY) != -1) return 0;
		
		return 1;
	}	
	
	// True if toke is offset label
	function is_offset_label(s)
	{
		// Match ADDR+$xx or ADDR-$xx
		
		if (s == undefined) return 0;
		
		var ofs_len = 5;
		
		// check label
		for (var i = 0; i < s.length - ofs_len; i++)
		{
			if ( !is_label_char(s[i], i == 0)) return 0; 
		}
		
		if (s[s.length-4] != '+' && s[s.length-4] != '-') return 0;   //  + or -
		
		return 1;
	}	
	
	// True if is hex address
	function is_address(s)
	{
		if (s[0] != '$') return 0;
		if (s.length != 5) return 0;
		if (!is_hex_str(s.substr(1, s.length))) return 0;
		
		return 1;
	}

	// True if starts with #
	function is_immediate(next)
	{
		return next[0] == '#';
	}
	
	// Get Hex value from $....
	function hex_value(h)
	{
		return parseInt(h.substr(1, h.length), 16); 
	}
	
	/* End of Assembler */
	
	
	/* Disassembler */
	
	// Show Disassembly
	function disassemble(target, start, end)
	{
		main.log_assemble(`${MODULE} [Disassembly]\n`);
				
		var i = start;
		
		// Disassemble and consume operands
		while(i < end) i = disassemble_inst(target, i);
		
		dump_hex(start, end);
	}
	
	// Disassemble single inst 
	function disassemble_inst(target, i, flags)
	{
		var out = "";

		out += `${MODULE} `;

		// Address
		out += `<span class="assemble_addr">${hex_word(i)}</span>   `;
		
		var inst = cur_cpu.inst_table[memory.get_byte(i)];
		
		// Show instruction bytes		
		out += `<span class="assemble_data">`;
		var byte_str = hex_byte(memory.get_byte(i))
		if (inst.s >= 1) byte_str += " " + hex_byte(memory.get_byte(i+1));
		if (inst.s == 2) byte_str  += " " + hex_byte(memory.get_byte(i+2));
		out += byte_str.padEnd(12);
		out += `</span>`;		

		// Address mode 
		out += `<span class="assemble_mode"> ${cur_cpu.MODE_TEXT(inst.m).padEnd(6)}</span>  `;	
		
		// Inst name
		out += `<span class="assemble_inst"> ${inst.text.padEnd(6)} </span>`;   	
		
		// Decode address mode
		if (inst.m == CPU6502.M_IMP)  out += ``;
		if (inst.m == CPU6502.M_ABS)  out += `$${hex_word(memory.get_word(i+1))}`;
		if (inst.m == CPU6502.M_ABSX) out += `$${hex_word(memory.get_word(i+1))},X`;
		if (inst.m == CPU6502.M_ABSY) out += `$${hex_word(memory.get_word(i+1))},Y`;
		if (inst.m == CPU6502.M_IMM)  out += `#$${hex_byte(memory.get_byte(i+1))}`;
		if (inst.m == CPU6502.M_IND)  out += `($${hex_word(memory.get_word(i+1))})`;
		if (inst.m == CPU6502.M_XIND) out += `($${hex_byte(memory.get_byte(i+1))},X)`;
		if (inst.m == CPU6502.M_INDY) out += `($${hex_byte(memory.get_byte(i+1))}),Y`;
		if (inst.m == CPU6502.M_REL)  out += `$${hex_word(i+(memory.get_byte(i+1)+2))}`;
		if (inst.m == CPU6502.M_ZP)   out += `$${hex_byte(memory.get_byte(i+1))}`;
		if (inst.m == CPU6502.M_ZPX)  out += `$${hex_byte(memory.get_byte(i+1))},X`;
		if (inst.m == CPU6502.M_ZPY)  out += `$${hex_byte(memory.get_byte(i+1))},Y`;
		
		out += "\n";

		i += inst.s + 1; // Next inst	

		target(out);

		return i;
	}		
	
	// Hex dump for degugging
	function dump_hex(start, end)
	{
		var c = 0;
		var str = "";
		
		for (var i = start; i < end; i++)
		{
			var b = memory.get_byte(i);;
			
			if (c == 0)  str += "e" + hex_word(i) + ":  .DB ";
			
			str += "$" + hex_byte(b);

			if (c != 7 && i <= end-1) str += ",";

			str += " " ;
			
			if (++c >= 8) { str += "\n"; c = 0; } 
		}
		
		console.log(str);
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
		
	/* End of Disassembler */

	return {init:init, assemble:assemble};
}
