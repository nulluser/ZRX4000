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
		
		var i = 0;
		
		// Process a chunk. Bail on Sync
		for (i = 0; i < NUM_INST && !fb_update; i++) step();
		
		inst_updates += i;	
		
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
		inst_table[0x21] = {text:"LDM", m:M_NONE, s:2, f:inst_ldm }; // Load A value from memory 
		inst_table[0x22] = {text:"STA", m:M_NONE, s:2, f:inst_sta }; // Store A at memory location
		inst_table[0x30] = {text:"SP",  m:M_NONE, s:2, f:inst_sp  }; // Set pointer address
		inst_table[0x31] = {text:"LP",  m:M_NONE, s:0, f:inst_lp  }; // Load A into memory at pointer
		inst_table[0x32] = {text:"GP",  m:M_NONE, s:0, f:inst_gp  }; // Get value at pointer
		inst_table[0x33] = {text:"IP",  m:M_NONE, s:0, f:inst_ip  }; // Increment pointer
		inst_table[0x34] = {text:"AP",  m:M_NONE, s:0, f:inst_ap  }; // Add a to pointer
		inst_table[0x40] = {text:"PUSH",m:M_NONE, s:0, f:inst_push}; // Push A into stack
		inst_table[0x41] = {text:"POP", m:M_NONE, s:0, f:inst_pop }; // Pop from stack into A
		inst_table[0x50] = {text:"CMP", m:M_NONE, s:1, f:inst_cmp }; // Compare
		inst_table[0x80] = {text:"OUT", m:M_NONE, s:0, f:inst_out }; // Output A
		inst_table[0x90] = {text:"AND", m:M_NONE, s:1, f:inst_and }; // Set A to A & immediate
		inst_table[0x91] = {text:"OR",  m:M_NONE, s:1, f:inst_or  }; // Set A to A | immediate
		inst_table[0x92] = {text:"XOR", m:M_NONE, s:1, f:inst_xor }; // Set A to A ^ immediate
		inst_table[0x93] = {text:"NOT", m:M_NONE, s:1, f:inst_not }; // Set A to bitwise negation of A
		inst_table[0x94] = {text:"SHL", m:M_NONE, s:1, f:inst_shl }; // Shift A left by immediate bits
		inst_table[0x95] = {text:"SHR", m:M_NONE, s:1, f:inst_shr }; // Shift A right by the immediate bits
		inst_table[0x96] = {text:"ADD", m:M_NONE, s:1, f:inst_add }; // Set A to A + operand Z_256
		inst_table[0x97] = {text:"SUB", m:M_NONE, s:1, f:inst_sub }; // Set A to A + operand Z_256
		inst_table[0x98] = {text:"NEG", m:M_NONE, s:0, f:inst_neg }; // Set A to the additive inverse of A in Z_256
		inst_table[0xA0] = {text:"RND", m:M_NONE, s:0, f:inst_rnd }; // Random number
		inst_table[0xB0] = {text:"SYNC",m:M_NONE, s:0, f:inst_sync}; // Render framebuffer
		inst_table[0xFF] = {text:"END", m:M_NONE, s:0, f:inst_end }; // Halt
	}

		// Instructions
	function inst_nop() {};
	function inst_cmp() {var v = memory.get_byte(ip); e = a == v; l = a < v; g = a > v;} 
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
	function inst_ldm() {a = memory.get_byte(memory.get_word(ip));} 
	function inst_sta() {memory.set_byte(memory.get_word(ip), a);}
	function inst_push(){push_byte(a);} 
	function inst_pop() {a = pop_byte();} 
	function inst_and() {a = a & memory.get_byte(ip);} 
	function inst_or()  {a = a | memory.get_byte(ip);} 
	function inst_xor() {a = a ^ memory.get_byte(ip);} 
	function inst_not() {a = ~a;} 
	function inst_shl() {a = a << memory.get_byte(ip);} 
	function inst_shr() {a = a >> memory.get_byte(ip);} 
	function inst_add() {a = (a + memory.get_byte(ip)) & 0xff;}
	function inst_sub() {a = (a - memory.get_byte(ip)) & 0xff;}
	function inst_neg() {a = (65536 - a) & 0xff;}
	function inst_rnd() {a = (Math.random() * 255) & 0xff;} 
	function inst_sync(){fb_update=1;} 
	function inst_out() {main.log_output(get_char(a));} 
	function inst_end() {ip = IP_END;} 
	
	// Next inst
	function step()
	{		
		// End of program
		if (ip == IP_END) return;
				
		if (DEBUG) disassemble_inst(ip, 1);
		
		// Get next inst
		var inst = inst_table[memory.get_byte(ip++)];
		
		// Catch undefined
		if (inst === undefined)
		{
			main.log_console(`Undefined inst at [${hex_word(ip-1)}] = (${hex_byte(memory.get_byte(ip-1))}) \n`);
			ip = IP_END;
			return;
		}
		
		// Execute
		if (inst.f != null) inst.f();
			
		// Display stack dump?
		if (DUMP_STACK) dump_stack();

		ip += inst.s; // Consume operands, next ip
	}
	
	/* End of CPU */
	
	return exports;
}
