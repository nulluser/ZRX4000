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
	
	const M_ABS = 1;			// Modes for addresses
	const M_REL = 2;			// Relative
	const M_OFS = 3;			// Offset
	const M_HI = 4;				// High byte
	const M_LO = 5;				// Low byte
	
	var address_table = [];  	// Stores known addresses
	var resolve_table = [];  	// Stores address that need resolved
	var cur_prog = 0;			// Location of next load 

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
		
		cur_prog = prog_addr;
		
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
		
		disassemble(main.log_assemble, 0x7600, 0x8000);
		
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
			
			var address = address_table[label_index];		// Element that knows the address

			//console.log("Resolve : " + resolve.label + " addr: " + address.label);
			//console.log(resolve);
					
			
			// Absolute address
			if(resolve.mode == M_ABS)
			{
				memory.set_word(resolve.addr, address.addr);
			} else 
			// Relative address
			if(resolve.mode == M_REL)
			{
				var delta = address.addr - resolve.addr - 1;

				if (delta < -128 || delta > 127)
				{
					//console.log("Jump to far.  Label: " + resolve.label + "  Location: " + hex_word(resolve.addr) + " Jump too far: " + hex_byte(delta));
					return 1;
				}
						
				memory.set_byte(resolve.addr, delta);
						
				//console.log("Rel addr req: Label: " + resolve.label + " "  + hex_word(resolve.addr) + " " + hex_word(address.addr) + " " + delta);
			} else
			// Offset Address
			if(resolve.mode == M_OFS)
			{
				memory.set_word(resolve.addr, address.addr + resolve.ofs);
			} else
			// High byte of address
			if(resolve.mode == M_HI)
			{
				memory.set_byte(resolve.addr, address.addr >> 8);
			} else
			// Low byte of address
			if(resolve.mode == M_LO)
			{
				memory.set_byte(resolve.addr, address.addr & 0xff);
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
	
	
	// Get tokens from input string
	function parse_tokens(line)
	{
		var tokens = [];

		// Remove line comments
		var p = line.indexOf(";");
		if (p != -1) line = line.substr(0, p);
		
		// Create captured group
		var myRegexp = /[^\s"]+|"([^"]*)"/gi;
	
		do 
		{
			//Each call to exec returns the next regex match as an array
			var match = myRegexp.exec(line);
			if (match != null)
			{
				//Index 1 in the array is the captured group if it exists. 
				// Add quote to detect as string later
				//Index 0 is the matched text, which we use if no captured group exists
				tokens.push(match[1] ? "\"" + match[1] + "\"" : match[0]);
			}
		} while (match != null);
			
		return tokens;
	}
	
	
	
	/* 
		Private
	*/	
	
	// Assemble all tokens
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
	
	// Assemble a line
	function assemble_line(line)
	{
		if (line == "") return 0;	// Do not process plank lines
	
		//console.log("Assemble line (" + line + ")");

		var line_tokens = parse_tokens(line);		// Split line into tokens

		if (line_tokens.length == 0) return 0;		// No tokens in line
		
		// See if token is label
		if (is_label(line_tokens[0]))
		{
			//console.log("is label");
			
			var label = line_tokens[0];//(token)
			
			//console.log("Add Label: " + label);
				
			address_table.push({addr:cur_prog, label:label});
			
			
			// Remove label token
			line_tokens.splice(0, 1);
			
			// No other token left on line
			if (line_tokens.length == 0)
				return 0;
		}		

		// Get instruction token and next token
		var token = line_tokens[0];
		var next =  line_tokens[1];
			
		// See if token is instruction	
		var inst = find_inst(token, cur_cpu.M_ANY);
					
		// Found instruction, add it to program listing
		if (inst != -1)
		{
			return (assemble_inst(inst, next));
		}
		
		// See if token is a define byte
		if (token == ".byte")
		{
			return (assemble_byte(line_tokens, next));
		}
		
		// See if token is a define byte
		if (token == ".word")
		{
			return (assemble_word(line_tokens, next));
		}
		
		// See if token is an origin
		if (token == ".org")
		{
			return (assemble_org(line_tokens, next));
		}
		
		main.log_assemble(`${MODULE} Invalid Token: (${token})\n`);
		
		return 1;
	}
	


	
	// Assemble an instruction
	function assemble_inst(found_inst, next)
	{
		var operand = 0;
		
		var inst = cur_cpu.inst_table[found_inst];
			
		//console.log("Inst: " + inst.text + " next: " + next);
			
		/*// Implied mode
		if (inst.s == 0)
		//if (is_inst(next))
		{
			add_inst(found_inst, cur_cpu.M_IMP, 0);	// Add to memory
			return 0;
		}*/


		var mode = cur_cpu.M_NONE;	// No mod known yet
			
		// parse operand

		
		// Implied mode
		// TODO: Don't compare agaisnt undefined 
		// This works because implied instructions never take args
		//if (cur_cpu.inst_table[found_inst].m == cur_cpu.M_IMP)
		if (next == undefined)
		{
			//main.log_assemble("Assemble_inst Operand expected");
			//return 1;
			
			mode = cur_cpu.M_IMP;
		} else
		
		// See if address is relative
		if (cur_cpu.inst_table[found_inst].m == cur_cpu.M_REL)
		{
			var label = next;
			
			//console.log("Push rel " + hex_byte(found_inst) + " " + label);
			
			// Need to add one to account for inst byte. Mark as relative
			resolve_table.push({addr:cur_prog+1, label:label, rel:1, mode:M_REL});
			
			mode = cur_cpu.M_REL;		
		}else
		
		// Add to resolve list if operand is a label
		if (is_offset_label(next))
		{
						
			//console.log("Offset label: " + next);
			
			assemble_offset_label(next);
			

			
			mode = cur_cpu.M_ABS;
			
		}else 		
		if (is_label(next))
		{
			var label = next;
			
			// Need to add one to account for inst byte
			resolve_table.push({addr:cur_prog+1, label:label, rel:0, mode:M_ABS});
			
			mode = cur_cpu.M_ABS;
			
		}else 
		// Check for char literal
		if (is_literal(next))
		{
			operand = ascii(next[1]);
			
			mode = cur_cpu.M_IMM;
		} else
		if (is_immediate(next))
		{
			//console.lof("is_immediate " + next);
			
			// Check for address operators
			
			// Low address
			if (next[1] == '<')
			{
				
				label = next.substr(2, next.length);
				
				//console.log("Low address label: " + label);
				resolve_table.push({addr:cur_prog+1, label:label, rel:0, mode:M_LO});	
				
				
				operand = 0;
			}
			else
			if (next[1] == '>')
			{
				
				label = next.substr(2, next.length);
				
				//console.log("High address label: " + label);
				resolve_table.push({addr:cur_prog+1, label:label, rel:0, mode:M_HI});	
				
				
				operand = 0;
			}
			else
			{
				operand = parseInt(next.substr(2, next.length-1), 16); 
			}
			
			mode = cur_cpu.M_IMM;				
			
		} else
		if (is_address(next))
		{
			
			
			//operand = parseInt(next, 16); 
			operand = hex_value(next);
			
			
			mode = cur_cpu.M_ABS;
		} else
		if (is_zp(next))
		{
			operand = hex_value(next);
			
			mode = cur_cpu.M_ZP;
		} else
			
		if (is_zpx(next))
		{
			//console.log("Is zpx " + next);
			operand = hex_value(next.substr(0, next.length-2));
			//operand = 0xff;
			
			mode = cur_cpu.M_ZPX;
		} else
			
		if (is_zpy(next))
		{
			//console.log("Is zpy " + next);
			operand = hex_value(next.substr(0, next.length-2));
			//operand = 0xff;
			
			mode = cur_cpu.M_ZPY;
		} else

			
		if (is_ind(next))
		{
			//console.log("Is ind " + next);
						
			operand = hex_value(next.substr(1, next.length-1));						
						
			mode = cur_cpu.M_IND;
		} else
		
			
		
		if (is_absx(next))
		{
			main.log("Is absx " + next + "\n");
			var label = next.substr(0, next.length-2);
			
			main.log("label: " + label + "\n");
			if (is_label(label)) assemble_label(label); else
			if (is_offset_label(label)) assemble_offset_label(label); else
			{
				main.log_assemble(`${MODULE} ABSX: Unknown label type ${label}\n`);
				return 1;
			}
			
			operand = 0xffff;
			
			mode = cur_cpu.M_ABSX;
		} else
		
		if (is_absy(next))
		{
			main.log_assemble("Is absy " + next + "\n");
			var label = next.substr(0, next.length-2);
			
			main.log_assemble("label: " + label + "\n");
			if (is_label(label)) assemble_label(label); else
			if (is_offset_label(label)) assemble_offset_label(label); else
			{
				main.log_assemble(`${MODULE} ABSY: Unknown label type ${label}\n`);
				return 1;
			}
			
			operand = 0xffff;
			
			mode = cur_cpu.M_ABSX;
		} else
				
		if (is_xind(next))
		{
			operand = hex_value(next.substr(1, 3));
			
			//console.log("xind op " + operand);
			
			mode = cur_cpu.M_INDY;
			
		} else		
		
		if (is_indy(next))
		{
			operand = hex_value(next.substr(1, 3));
			
			//console.log("indy op " + hex_byte(operand) + " n:" + next);
			
			mode = cur_cpu.M_INDY;
			
		} else
		
			
		// Assume hex
		{
			main.log_assemble(`${MODULE} assemble inst: Invalid operand ${next}\n`);
			
			// Get value of operand
			//operand = parseInt(next, 16); 
			return 1;
		}
		
		// Adjust instruction for known address mode
		found_inst = find_inst(inst.text, mode);
		
		if (found_inst == -1)
		{
			main.log_assemble(`${MODULE} Address mode not found for ${inst.text} ${cur_cpu.MODE_TEXT(mode)}\n`);
			
			return 1;
		}
		
	
		//cur_token += inst.s > 0 ? 1 : 0;		// Consume operands
		
		add_inst(found_inst, mode, operand);	// Add to memory
		
		return 0;
	}
	
	
	
	
	
		// Assemble a label
	function assemble_offset_label(token)
	{
		var label = token;//(token)
			
		//log("Add Label: " + label);
				
		address_table.push({addr:cur_prog, label:label});
	}	
	
	
	// Assemble a label
	function assemble_label(label)
	{
		//var label = token;//(token)
			
		console.log("Assemble Label: " + label);
				
		//address_table.push({addr:cur_prog, label:label});
		
		resolve_table.push({addr:cur_prog+1, label:label, mode:M_ABS});		
		
	}
	
	
	
	function assemble_offset_label(next)
	{
					
			
			var label = next.substr(0, next.length-4);
			var ofs = next.substr(next.length-4, next.length);
			
			var sign = ofs[0];
			var ofs_value = parseInt(ofs.substr(2, ofs.length), 16);
			
			if (sign == '-') ofs_value *= -1;
			
			//console.log("L: " + label);
			//console.log("O: " + ofs);
			//console.log("S: " + sign);
			//console.log("V: " + ofs_value);
			
			// Need to add one to account for inst byte
			resolve_table.push({addr:cur_prog+1, label:label, rel:0, ofs:ofs_value, mode:M_OFS});
			
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	// Assemble a define byte
	function assemble_word(tokens, next)
	{
		//console.log("Assemble word : " + next);
		//console.log(tokens);
		
		tokens.splice(0, 1); // Consume ".word"

		next = tokens[0];
		
		if (next == undefined)
		{
			main.log_assemble(`${MODULE} .word value expected\n`);
			
			return 1;
		}
		
		//tokens.splice(0, 2); // Consume 
		
		var cur_token = 0;
		
		while(cur_token < tokens.length)
		{
			next = tokens[cur_token];	// compute next
			
			//console.log("assemble word next: " + next);
			/*if (is_literal(next))
			{
				add_byte(ascii(next[1]));
				
			} else*/
			if (is_label(next))
			{
				//assemble_label(next);
				
				//console.log("Word label: " + next);
				
				resolve_table.push({addr:cur_prog, label:next, rel:0, mode:M_ABS});
				
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
	function assemble_byte(tokens, next)
	{
		//console.log("Assemble byte : " + next + "\n");
		//console.log(tokens);
		
		tokens.splice(0, 1); // Consume ".word"

		next = tokens[0];		
		
		if (next == undefined)
		{
			main.log_assemble(`${MODULE} .byte value expected\n`);
			return 1;
		}
		
		
		var cur_token = 0;
		
		while(cur_token < tokens.length)
		{
			next = tokens[cur_token];	
		
			/*if (is_literal(next))
			{
				add_byte(ascii(next[1]));
				
			} else*/
			
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
				console.log(`${MODULE} byte value expected ${next}\n`);
				
				
			}
		
			//cur_token++;	// Consume byte
			cur_token++;	// compute next
		}
		
		return 0;
	}
	
	// Assemble a define byte
	function assemble_org(tokens, next)
	{
		
		
		//console.log("Assemble org");
		//console.log("Assemble db : " + next);
		
		if (next == undefined)
		{
			main.log_assemble(`${MODULE} org value expected\n`);
			return 1;
		}

		
		// Check for invalid address
		if(!is_address(next))
		{
			main.log_assemble(`${MODULE} ORG address expected (${next})\n`);
			return 1;
		}

		cur_prog = hex_value(next);
		
		main.log_assemble(`${MODULE} ORG prog: (${hex_word(cur_prog)})\n`);
		
		//cur_token++;	// Consume byte
		//next = tokens[cur_token+1];	// compute next
		
		//console.log("Return ok");
		return 0;
	}	
	
	
	
	// Add instruction to memory
	function add_inst(inst, mode, p1)
	{
		var val = cur_cpu.inst_table[inst].s == 0 ? "" : (cur_cpu.inst_table[inst].s == 1 ? hex_byte(p1) : hex_word(p1) )   ;
		
		//main.log("Add Inst    " + hex_word(cur_prog) + " " +cur_cpu.inst_table[inst].text + "  " + val);
		
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
	//function add_word(v) { add_byte(v >> 8); add_byte(v & 0xff); }	
	function add_word(v) { add_byte(v & 0xff); add_byte(v >> 8);  }	
	
	
	
	
	
		
	// Look for inst in table
	function find_inst(token, mode)
	{
		var found_inst = -1;
		for (var inst in cur_cpu.inst_table) 
		{
			if (token.toUpperCase() == cur_cpu.inst_table[inst].text)
			{
				//console.log(cur_cpu.inst_table[inst].text + " " + cur_cpu.inst_table[inst].m);
				
				// Just match the text
				if (mode == cur_cpu.M_ANY) return inst;
					
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
	
	
	
	
	function is_string(s)
	{
		
		if (s[0] != '"') return 0;
		if (s[s.length-1] != '"') return 0;
		
		return 1;
		
	}
	
	
	
	
	
	// True if is label
	function is_literal(s)
	{
		return s[0] == '\'' && s[s.length-1] == '\'' && s.length == 3;
	}	
	
	// True if is valid label char
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


	
	// True if char is hex
	function is_label(s)
	{
		for (var i = 0; i < s.length; i++)
		{
			if ( !is_label_char(s[i], i == 0)) return 0; 
		}
		
		
		// Make sure it is not an instruction
		if (find_inst(s, cur_cpu.M_ANY) != -1) return 0;
		
		
		
		
		
		return 1;
	}	
	
	
	// True if char is hex
	function is_offset_label(s)
	{
		main.log_assemble("Is offset label " + s + "\n");
		
		var ofs_len = 5;
		
		// check label
		for (var i = 0; i < s.length - ofs_len; i++)
		{
			if ( !is_label_char(s[i], i == 0)) return 0; 
		}
		
		if (s[s.length-4] != '+' && s[s.length-4] != '-') return 0;   //  + or -
		
		return 1;
	}	
		
	
	
	// True if char is hex
	function is_hex_char(c)
	{
		if (c >= '0' && c <= '9') return 1;
		if (c >= 'a' && c <= 'f') return 1;	
		if (c >= 'A' && c <= 'F') return 1;	

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
			
	function is_hex_byte(s)
	{
			///console.log("is address y: " + s);
		
		
		if (s[0] != '$') return 0;
		if (s.length != 3) return 0;
		if (!is_hex_str(s.substr(1, s.length))) return 0;
		
		return 1;
	}
			
	function is_address(s)
	{
		//console.log("is address y: " + s);
		
		
		if (s[0] != '$') return 0;
		if (s.length != 5) return 0;
		if (!is_hex_str(s.substr(1, s.length))) return 0;
		
		return 1;
	}
	


	function is_ind(s)
	{
		if (s[0] != '(') return 0;
		if (s[s.length-1] != ')') return 0;
		
		
		return 1;
	}
	


		









	function is_zp(s)
	{
		if (s[0] != '$') return 0;
		if (s.length != 3) return 0;
		if (!is_hex_str(s.substr(1, s.length))) return 0;
		
		return 1;
	}	


	function is_zpx(s)
	{
		//   $xx,X

		if (s.length != 5) return 0;
		
		if (s[0] != '$') return 0;
		if (s[3] != ',') return 0;
		if (s[4] != 'X') return 0;
		
		if (!is_hex_str(s.substr(1, 2))) return 0;
		
		return 1;
	}	

	
	
	function is_zpy(s)
	{
		//   $xx,Y

		if (s.length != 5) return 0;
		
		if (s[0] != '$') return 0;
		if (s[3] != ',') return 0;
		if (s[4] != 'Y') return 0;
		
		if (!is_hex_str(s.substr(1, 2))) return 0;
		
		return 1;
	}	

	
	
	
	
	
	function is_absx(s)
	{
		console.log("ABSX");
		//if (s[0] != '$') return 0;
		//if (s.length != 3) return 0;
		//if (!is_hex_str(s.substr(1, s.length))) return 0;
//		if (length != 7) return 0;
		
		
		if (s[s.length-2] != ',') return 0;
		if (s[s.length-1] != 'X') return 0;
		
		
		var  addr = s.substr(0, s.length-2);
		//console.log("Addr: " + addr);
		
		
		if (is_label(addr)) return 1;
		if (is_offset_label(addr)) return 1;
		if (is_address(addr)) return 1;
		
		return 0;
	}	
		
	function is_absy(s)
	{
		//if (s[0] != '$') return 0;
		//if (s.length != 3) return 0;
		//if (!is_hex_str(s.substr(1, s.length))) return 0;
		
		
		if (s[s.length-2] != ',') return 0;
		if (s[s.length-1] != 'Y') return 0;
		
		if (!is_label(s.substr(0, s.lengyth-2)) || is_offset_label(s.substr(0, s.lengyth-2))) return 0;
		
		
		return 1;
	}	
	
	
	function is_xind(s)
	{
		//console.log(s);
		
		if (s[0] != '(') return 0;
		if (s[1] != '$') return 0;
		if (!is_hex_char(s[2])) return 0;
		if (!is_hex_char(s[3])) return 0;
		if (s[4] != ',') return 0;
		if (s[5] != 'X') return 0;
		if (s[6] != ')') return 0;
		
		return 1;
		
		
		
		
	}	
	

	function is_indy(s)
	{
		//console.log(s);
		
		if (s[0] != '(') return 0;
		if (s[1] != '$') return 0;
		if (!is_hex_char(s[2])) return 0;
		if (!is_hex_char(s[3])) return 0;
		if (s[4] != ')') return 0;
		if (s[5] != ',') return 0;
		if (s[6] != 'Y') return 0;
		
		return 1;
		
		
		
		
	}
	
	
	
	

	function is_immediate(next)
	{
		return next[0] == '#';
	}
	
	
	// True if is label
	/*function is_label(s)
	{
		return s[s.length-1] == ':';
	}*/
	
	// Get label from string
	function get_label(s)
	{
		return s.substring(0, s.length-1);
	}
	
	
	
	
	
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
		while(i <= end) 
			i = disassemble_inst(target, i);
		
		
		
		// Dump hex
		
		var c = 0;
		var str = "";
		
		for (var i = start; i <= end; i++)
		{
			var b = memory.get_byte(i);;
			
			if (c == 0)  str += "e" + hex_word(i) + ":  .DB ";
			
			str += "$" + hex_byte(b);

		if (c != 7) str += ",";

			str += 			 " " ;
			
			if (++c >= 8) { str += "\n"; c = 0; } 
			
			
			
		}
		
		
		console.log(str);
		
		
		
		
	}
	
	// Disassemble single inst 
	function disassemble_inst(target, i, flags)
	{
		var out = "";

		out += `${MODULE} `;

		out += `<span class="assemble_addr">`;
		out += `  ${hex_word(i)}    `; // Address
		out += `</span>`;
				
		
		var inst_byte = memory.get_byte(i);	// instruction
		
		//main.log_assemble(hex_byte(inst));
		if (cur_cpu.inst_table[inst_byte] == undefined)
		{
		//	out += `Undefined inst: [${hex_word(i)}] ${inst}\n`;
			out += hex_byte(memory.get_byte(i)).padEnd(12);
			
			target(out);
		
			return 1;
		}
		
		var inst = cur_cpu.inst_table[inst_byte];
		
		
			out += `<span class="assemble_data">`;
		// Show instruction bytes
		var byte_str = hex_byte(memory.get_byte(i))
		if (inst.s >= 1) byte_str += " " + hex_byte(memory.get_byte(i+1));
		if (inst.s == 2) byte_str  += " " + hex_byte(memory.get_byte(i+2));

		out += byte_str.padEnd(12);
		

		out += `</span>`;		
		
		
				out += `<span class="assemble_mode">`;
		// Address mode 
		if (inst.m == CPU6502.M_NONE) out += `     `; else
		if (inst.m == CPU6502.M_IMP)  out += `IMP  `; else
		if (inst.m == CPU6502.M_ABS)  out += `ABS  `; else
		if (inst.m == CPU6502.M_ABSX) out += `ABSX `; else
		if (inst.m == CPU6502.M_ABSY) out += `ABSY `; else
		if (inst.m == CPU6502.M_IMM)  out += `IMM  `; else
		if (inst.m == CPU6502.M_IND)  out += `IND  `; else
		if (inst.m == CPU6502.M_XIND) out += `XIND `; else
		if (inst.m == CPU6502.M_INDY) out += `INDY `; else
		if (inst.m == CPU6502.M_REL)  out += `REL  `; else
		if (inst.m == CPU6502.M_ZP)   out += `ZP   `; else
		if (inst.m == CPU6502.M_ZPX)  out += `ZPX  `; else
		if (inst.m == CPU6502.M_ZPY)  out += `ZPY  `; 
		out += `</span>`;	
		
		out += "      ";
		
		
		
		out += `<span class="assemble_inst">`;
		
		// Inst name
		out += inst.text.padEnd(6);

		out += `</span>`;
		
		
		
		// Decode address mode
		
		
		if (inst.m == CPU6502.M_IMP)  out += ``;
		if (inst.m == CPU6502.M_ABS)  out += `$${hex_word(memory.get_word(i+1))}`;
		if (inst.m == CPU6502.M_ABSX) out += `$${hex_word(memory.get_word(i+1))},X`;
		if (inst.m == CPU6502.M_ABSY) out += `$${hex_word(memory.get_word(i+1))},Y`;
		if (inst.m == CPU6502.M_IMM)  out += `#$${hex_byte(memory.get_byte(i+1))}`;
		if (inst.m == CPU6502.M_IND)  out += `($${hex_word(memory.get_word(i+1))})`;
		if (inst.m == CPU6502.M_XIND) out += `($${hex_byte(memory.get_byte(i+1))},X)`;
		if (inst.m == CPU6502.M_INDY) out += `($${hex_byte(memory.get_byte(i+1))}),Y`;
		if (inst.m == CPU6502.M_REL) out += `$${hex_word(i+(memory.get_byte(i+1)+2))}`;
		if (inst.m == CPU6502.M_ZP) out += `$${hex_byte(memory.get_byte(i+1))}`;
		if (inst.m == CPU6502.M_ZPX) out += `$${hex_byte(memory.get_byte(i+1))},X`;
		if (inst.m == CPU6502.M_ZPY) out += `$${hex_byte(memory.get_byte(i+1))},Y`;
		

		out += "\n";

		
		
				//CPU6502.M_ANY  = 0xFF;				// Any mode mask for assembler
		//CPU6502.M_NONE = 0x00;				// No Mode (test)
		//CPU6502.M_IMP  = 0x01;				// Implied, no operand
		//CPU6502.M_ABS  = 0x02;				// Absolute
		//CPU6502.M_ABSX = 0x03;				// Absolute X
		//CPU6502.M_ABSY = 0x04;				// Absolute Y
		//CPU6502.M_IMM  = 0x05;				// Immediate
		//CPU6502.M_IND  = 0x06;				// Indirect
		//CPU6502.M_XIND = 0x07;				// X Indirect
		//CPU6502.M_INDY = 0x08;				// Indirect Y
		//CPU6502.M_REL  = 0x09;				// Relative
		//CPU6502.M_ZP   = 0x0A;				// Zero Page
		//CPU6502.M_ZPX  = 0x0B;				// Zero Page X
		//CPU6502.M_ZPY  = 0x0C;				// Zero Page Y
		

		
		
		
		//if (inst.s == 0)	out += "    "; 
		//if (inst.s == 1)	out += hex_byte(memory.get_byte(i+1)).padEnd(4); 
		//if (inst.s == 2)	out += hex_word(memory.get_word(i+1));
	
	
		//log(address_table);
		//log_console("[" + find_addr_name(i) + "]");
		
		//console.log(inst.s + " " + inst.m);
		//console.log(inst);
		
		i += inst.s + 1;	
		
		//console.log(inst);
		//console.log(inst.s);
		
	
		//out += "\n";
		
		target(out);
		
		//console.log(out);
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
		main.log_assemble("[Stack Dump]\n");
				
		/*var i = 0;
		
		for (var i = start; i < end; i++)
		{
			var v = memory[i];
			if (v != undefined)
			main.log_assemble(hex_word(i) + "   " + hex_byte(v) + " (" + String.fromCharCode(v)+ ")\n"); // Address
		}
		
		main.log_assemble("[End of Stack]\n");*/
	}		
	
	/* End of Disassembler */

	return {init:init, assemble:assemble};
}
