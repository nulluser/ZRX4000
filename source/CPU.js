/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory is shared between cores. Stack is local to core.
*/

"use strict";

// CPU
// Pass in name, Memory, start address
function CPU(name, memory, start_addr)
{
	const MODULE = "[CPU]       ";
	
	// Public interface
	const exports = {init:init, pre_init:pre_init, update:update, 
					get_inst_table:get_inst_table, 
					get_inst_count:get_inst_count};
	
	// Debugging
	const DEBUG = 0;					// Slow down for debugging
	const DUMP_MEM = 0;					// Dump memory on load
	const DUMP_MEM_SIZE = 0x100;		// Dump Size
	const DUMP_STACK = 0;				// Displat stack during execution
	const DUMP_STACK_SZ = 0x10;			// Number of stack elements to display

	// Config	
	const NUM_INST = DEBUG ? 1 : 200000;	// Instructions per update
	const STACK_SIZE = 32768;				// Stack space size
	//const UPDATE_RATE = 1;				// CPU Update
	
	// Errors
	const ERROR_UI = 0x01;		// Unknown instruction
	
	// Instruction
	var inst_table = []; 		// Instruction loopup table

	// Instruction modes
	const M_NONE = 0x00;		// No Mode (test)
	const M_IMM  = 0x01;		// Immediate mode
	const IP_END = -1;			// Flag to indicate halted
		
	// Stack
	var stack = null;			// Stack
	
	// Registers
	var ip = 0;					// Instruction pointer
	var sp = 0;					// Stack pointer
	var a = 0;					// Accum
	var x = 0;					// X
	var y = 0;					// Y
	var e = 0;					// Equal
	var l = 0;					// Less
	var g = 0;					// Greater
	var p = 0;					// Memory pointer
	
	// Other
	var T = 0;					// Temp for internal use
	
	// Monitoring
	var inst_updates = 0;		// Instruction updates
	var fb_update = 0;			// True if frame buffer needs updating
	var prog_loaded = false;	// True if loaded

	/* 
		Public 
	*/
	
	//  Stage inst table. TODO: Need to remove
	function pre_init()
	{
		main.log_console(MODULE + "Pre Init\n");	
		setup_inst(); 		// Load instructions
	}
	
	// Core CPU init 
	function init()
	{
		main.log_console(`${MODULE} ${name} Init\n`);	
		
		stack = new Uint8Array(STACK_SIZE);		// Get Stack
		
		load_program();
		
		//setInterval(update, UPDATE_RATE); //  Internal update control
	}
			
	// Return for assembler
	function get_inst_table()
	{
		return inst_table;
	}
	
	// Get number of updates and reset
	function get_inst_count()
	{
		var c = inst_updates;
		inst_updates = 0;
		return c;
	}			
			
	/* 
		Private
	*/			
			
	// Core Update
	function update()
	{
		if (!prog_loaded) return;
		
		var r = step(NUM_INST); // Process a chunk
		
		if (r > 0)				// Deal with CPU errors
		{
			if (r == ERROR_UI)
			{
				var a = ip-1;
				main.log_console(`Undefined inst at [${hex_word(a)}] = (${hex_byte(memory.get_byte(a))}) \n`);
				ip = IP_END;
			}
		}
		
		fb_update = 0;
	}
		
	// Load a test program
	function load_program()
	{
		reset_flags();
		
		if (DUMP_MEM) memory.dump(start_addr, DUMP_MEM_SIZE);
		
		prog_loaded = true;
	}
	
	
	function dump_stack()
	{
		main.log_console(`Stack:\n`);
		for (var i = 0; i < DUMP_STACK_SZ; i++)
			main.log_console(` [${i}] ${hex_byte(stack[i])}\n`);
		ip = IP_END;
	}
	
	// Clear all flags
	function reset_flags()
	{
		ip=start_addr; sp=0; a=0; x=0; y=0; e=0; l=0; g=0; p=0;					
	}

	// Push byte to stack
	function push_byte(v) { stack[sp++] = v; } 
	
	// Pop byte from stack
	function pop_byte(v) { return stack[--sp]; } 
		
	// Push word to stack. Pushed as low byte, high byte
	function push_word(v) { push_byte(v&0xff); push_byte(v>>8); } 
	
	// Pop word from stack. Poped as high byte, low byte
	function pop_word(v) { var v = pop_byte()<<8; v |= pop_byte(); return v; } 

	
	// Setup Instruction types
	function setup_inst()	
	{
		//                  Diss test   Inst mide Size Func Ptr
		inst_table[0x00] = {text:"NOP", m:M_NONE, s:0, f:inst_nop }; // No Operation	
		inst_table[0x10] = {text:"JMP", m:M_NONE, s:2, f:inst_jmp }; // Jump to address
		inst_table[0x11] = {text:"JSR", m:M_NONE, s:2, f:inst_jsr }; // Jump subroutine
		inst_table[0x12] = {text:"RET", m:M_NONE, s:0, f:inst_ret }; // Return
		inst_table[0x13] = {text:"JL",  m:M_NONE, s:2, f:inst_jl  }; // Jump if less
		inst_table[0x14] = {text:"JE",  m:M_NONE, s:2, f:inst_je  }; // Jump Equal
		inst_table[0x15] = {text:"JNE", m:M_NONE, s:2, f:inst_jne }; // Jump Not Equal
		inst_table[0x16] = {text:"JG",  m:M_NONE, s:2, f:inst_jg  }; // Jump greater

		inst_table[0x20] = {text:"LDA", m:M_NONE, s:1, f:inst_lda }; // Load A with constant
		inst_table[0x21] = {text:"LDX", m:M_NONE, s:1, f:inst_ldx }; // Load X with constant
		inst_table[0x22] = {text:"LDY", m:M_NONE, s:1, f:inst_ldy }; // Load Y with constant
		inst_table[0x23] = {text:"LDM", m:M_NONE, s:2, f:inst_ldm }; // Load A value from memory 
		inst_table[0x24] = {text:"STA", m:M_NONE, s:2, f:inst_sta }; // Store A at memory location
		inst_table[0x25] = {text:"STX", m:M_NONE, s:2, f:inst_stx }; // Store X at memory location
		inst_table[0x26] = {text:"STY", m:M_NONE, s:2, f:inst_sty }; // Store Y at memory location
		inst_table[0x27] = {text:"TXA", m:M_NONE, s:2, f:inst_txa }; // Transfre X to A
		inst_table[0x28] = {text:"TAX", m:M_NONE, s:2, f:inst_tax }; // Transfer A to X
		inst_table[0x29] = {text:"TYA", m:M_NONE, s:2, f:inst_tya }; // Transfre X to A
		inst_table[0x2A] = {text:"TAY", m:M_NONE, s:2, f:inst_tay }; // Transfer A to X
		
		inst_table[0x30] = {text:"SP",  m:M_NONE, s:2, f:inst_sp  }; // Set pointer address
		inst_table[0x31] = {text:"LP",  m:M_NONE, s:0, f:inst_lp  }; // Load A into memory at pointer
		inst_table[0x32] = {text:"GP",  m:M_NONE, s:0, f:inst_gp  }; // Get value at pointer
		inst_table[0x33] = {text:"IP",  m:M_NONE, s:0, f:inst_ip  }; // Increment pointer
		inst_table[0x34] = {text:"AP",  m:M_NONE, s:0, f:inst_ap  }; // Add a to pointer

		inst_table[0x40] = {text:"PUSH",m:M_NONE, s:0, f:inst_push}; // Push A into stack
		inst_table[0x41] = {text:"POP", m:M_NONE, s:0, f:inst_pop }; // Pop from stack into A

		inst_table[0x50] = {text:"CMP", m:M_NONE, s:1, f:inst_cmp }; // Compare with A
		inst_table[0x51] = {text:"CPX", m:M_NONE, s:1, f:inst_cpx }; // Compare with X
		inst_table[0x52] = {text:"CPY", m:M_NONE, s:1, f:inst_cpy }; // Compare with Y

		inst_table[0x60] = {text:"INC", m:M_NONE, s:1, f:inst_inc }; // Increment A
		inst_table[0x61] = {text:"DEC", m:M_NONE, s:1, f:inst_dec }; // Decrement A
		inst_table[0x62] = {text:"INX", m:M_NONE, s:1, f:inst_inx }; // Increment X
		inst_table[0x63] = {text:"DEX", m:M_NONE, s:1, f:inst_dex }; // Decrement X
		inst_table[0x64] = {text:"INY", m:M_NONE, s:1, f:inst_iny }; // Increment Y
		inst_table[0x65] = {text:"DEY", m:M_NONE, s:1, f:inst_dey }; // Decrement Y

		inst_table[0x80] = {text:"OUT", m:M_NONE, s:0, f:inst_out }; // Output A to console

		inst_table[0x90] = {text:"AND", m:M_NONE, s:1, f:inst_and }; // Set A to A & immediate
		inst_table[0x91] = {text:"OR",  m:M_NONE, s:1, f:inst_or  }; // Set A to A | immediate
		inst_table[0x92] = {text:"XOR", m:M_NONE, s:1, f:inst_xor }; // Set A to A ^ immediate
		inst_table[0x93] = {text:"NOT", m:M_NONE, s:1, f:inst_not }; // Set A to bitwise negation of A
		inst_table[0x94] = {text:"SHL", m:M_NONE, s:1, f:inst_shl }; // Shift A left by immediate bits
		inst_table[0x95] = {text:"SHR", m:M_NONE, s:1, f:inst_shr }; // Shift A right by the immediate bits
		inst_table[0x96] = {text:"ADD", m:M_NONE, s:1, f:inst_add }; // Set A to A + operand Z_256
		inst_table[0x97] = {text:"SUB", m:M_NONE, s:1, f:inst_sub }; // Set A to A + operand Z_256
		inst_table[0x98] = {text:"MUL", m:M_NONE, s:1, f:inst_mul }; // Set A to A * operand Z_256
		inst_table[0x99] = {text:"DIV", m:M_NONE, s:1, f:inst_div }; // Set A to A / operand Z_256
		inst_table[0x9A] = {text:"NEG", m:M_NONE, s:0, f:inst_neg }; // Set A to the additive inverse of A in Z_256

		inst_table[0xB0] = {text:"RND", m:M_NONE, s:0, f:inst_rnd }; // Random number
		inst_table[0xC0] = {text:"SYNC",m:M_NONE, s:0, f:inst_sync}; // Render framebuffer
		inst_table[0xFF] = {text:"END", m:M_NONE, s:0, f:inst_end }; // Halt
	}

	// Instructions
	function inst_nop() {};
	
   	function inst_jmp() {ip = memory.get_word(ip) - 2;}
	function inst_jsr() {push_word(ip+2); ip = memory.get_word(ip) -2}
	function inst_ret() {ip = pop_word(); }
	function inst_jl()  {if (l) ip = memory.get_word(ip) - 2;} 
	function inst_je()  {if (e) ip = memory.get_word(ip) - 2;} 
	function inst_jne() {if (!e)ip = memory.get_word(ip) - 2;} 
	function inst_jg()  {if (g) ip = memory.get_word(ip) - 2;} 

	function inst_sp()  {p = memory.get_word(ip)} 
	function inst_lp()  {memory.set_byte(p, a);} 
	function inst_gp()  {a = memory.get_byte(p);} 
	function inst_ip()  {p++;} 
	function inst_ap()  {p+=a;} 

	function inst_lda() {a = memory.get_byte(ip);}
	function inst_ldx() {x = memory.get_byte(ip);}
	function inst_ldy() {y = memory.get_byte(ip);}
	
	function inst_ldm() {a = memory.get_byte(memory.get_word(ip));} 
	function inst_sta() {memory.set_byte(memory.get_word(ip), a);}
	function inst_stx() {memory.set_byte(memory.get_word(ip), x);}
	function inst_sty() {memory.set_byte(memory.get_word(ip), y);}

	function inst_tax() {x = a;}
	function inst_txa() {a = x;}
	function inst_tay() {x = a;}
	function inst_tya() {a = x;}
	
	function inst_push(){push_byte(a);} 
	function inst_pop() {a = pop_byte();} 
	function inst_cmp() {T = memory.get_byte(ip); e = a == T; l = a < T; g = a > T;} 
	function inst_cpx() {T = memory.get_byte(ip); e = x == T; l = x < T; g = x > T;} 
	function inst_cpy() {T = memory.get_byte(ip); e = y == T; l = y < T; g = y > T;} 
		
	function inst_inc() {a = (a + 1) & 0xff;}
	function inst_dec() {a = (a - 1) & 0xff;}
	function inst_inx() {x = (x + 1) & 0xff;}
	function inst_dex() {x = (x - 1) & 0xff;}
	function inst_iny() {y = (y + 1) & 0xff;}
	function inst_dey() {y = (y - 1) & 0xff;}
	
	function inst_and() {a = a & memory.get_byte(ip);} 
	function inst_or()  {a = a | memory.get_byte(ip);} 
	function inst_xor() {a = a ^ memory.get_byte(ip);} 
	function inst_not() {a = ~a;} 
	function inst_shl() {a = a << memory.get_byte(ip);} 
	function inst_shr() {a = a >> memory.get_byte(ip);} 
	function inst_add() {a = (a + memory.get_byte(ip)) & 0xff;}
	function inst_sub() {a = (a - memory.get_byte(ip)) & 0xff;}
	function inst_mul() {a = (a * memory.get_byte(ip)) & 0xff;}
	function inst_div() {a = (a / memory.get_byte(ip)) & 0xff;}
	function inst_neg() {a = (65536 - a) & 0xff;}
	
	function inst_rnd() {a = (Math.random() * 255) & 0xff;} 
	function inst_sync(){fb_update=1;} 
	function inst_out() {main.log_output(get_char(a));} 
	function inst_end() {ip = IP_END;} 
	
	// Process count number of instructions
	function step(count)
	{		
		var exec = count;									// Keep track of remaining
		
		while(exec-- && !fb_update && ip != IP_END)			// Loop until done, or SYNC or HALT
		{
			if (DEBUG) disassemble_inst(ip, 1);				// Dissassemble
			
			var inst = inst_table[memory.get_byte(ip++)];	// Get next inst
			
			if (inst === undefined) return(ERROR_UI);		// Catch undefined

			if (inst.f != null) inst.f();					// Execute

			if (DUMP_STACK) dump_stack();					// Display stack dump

			ip += inst.s;									// Consume operands, next ip
		}
		
		inst_updates += count - exec;
		
		return 0;
	}
	
	/* End of CPU */
	
	return exports;
}
