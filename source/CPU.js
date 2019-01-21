/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory is shared between cores. Stack is local to core
	
*/

"use strict";

// CPU
// Pass in name, Memory, start address
function CPU(name, memory, prog_addr)
{
	const MODULE = "[CPU]       ";
	
	// Private 
	
	// Config
	const DEBUG = 0;			// Slow down for debugging
	const DUMP_MEM = 0;			// Dump memory on load
	const DISP_STACK = 0;		// Displat stack during execution
		
	var NUM_INST = DEBUG ? 1 : 1000000;	// Instructions per update
	
	//const UPDATE_RATE = 1;	// CPU Update
	
	const STACK_SIZE = 32768;	// Stack space size
	
	// TODO need jump on overflow and load flags to A
	
	// Instructions
	const NOP   = 0x00;     	// No op
    
	const JMP   = 0x10;     	// Jump to address
	const JSR   = 0x11;     	// Jump subroutine
	const RET   = 0x12;    	 	// Return
	const JL    = 0x13;     	// Jump if less
	const JE    = 0x14;     	// Jump Equal
	const JNE   = 0x15;     	// Jump Not Equal
	const JG    = 0x16;     	// Jump greater

	const LDA   = 0x20;     	// Load A with constant
	const LDM   = 0x21;     	// Load A value from memory 
	const STA   = 0x22;     	// Store A at memory location

	const SP    = 0x30;     	// Set pointer address
	const LP    = 0x31;     	// Load A into memory at pointer
	const GP    = 0x32;     	// Get value at pointer
	const IP    = 0x33;     	// Increment pointer
	const AP    = 0x34;     	// Add a to pointer
	
	const PUSH  = 0x40;     	// Push A into stack
	const POP   = 0x41;     	// Pop from stack into A
	const CMP   = 0x50;     	// Compare

	const OUT   = 0x80;     	// Output A
    
	const AND   = 0x90;     	// Set A to A & immediate
	const OR    = 0x91;     	// Set A to A | immediate
	const XOR   = 0x92;     	// Set A to A ^ immediate
	const NOT   = 0x93;     	// Set A to bitwise negation of A
	const SHL   = 0x94;     	// Shift A left by the number of bits indicated by immediate
	const SHR   = 0x95;     	// Shift A right by the number of bits indicated by immediate
	const ADD   = 0x96;     	// Set A to A + operand Z_256
	const SUB   = 0x97;     	// Set A to A + operand Z_256
	const NEG   = 0x98;     	// Set A to the additive inverse of A in Z_256
	
	const RND   = 0xA0;    	 	// Random number
	const SYNC  = 0xB0;    		// Render framebuffer	
	
	const END  = 0xFF;    		// Halt
	
	const IP_END = -1;			// Flag to indicate halted
	
	
	// Instruction
	var inst_table = []; 		// Instruction loopup table
		
	// Stack
	var stack = null;			// Stack
	
	
	// Registers
	var ip = prog_addr;			// Instruction pointer
	var sp = 0;					// Stack pointer
	var a = 0;					// Accum
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
			
	/* 
		Private
	*/			
			
	// Core Update
	function update()
	{
		if (!prog_loaded) return;
		
		// Process a chunk. Bail on Sync
		for (var i = 0; i < NUM_INST && !fb_update; i++) 
			step();
		
		fb_update = 0;
	}
		
	// Load a test program
	function load_program()
	{
		//memory.clear();

		reset_flags();
		
		//assemble(prog_str);
		
		if (DUMP_MEM) memory.dump(prog_addr, 0x100);
		
		prog_loaded = true;
	}
	
	// Clear all flags
	function reset_flags()
	{
		ip = prog_addr; sp = 0; a = 0; e = 0; l = 0; g = 0; p = 0;					
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
		inst_table[NOP]  = {text:"NOP", size:0, func:inst_nop};
		inst_table[JMP]  = {text:"JMP", size:2, func:inst_jmp};
		inst_table[JSR]  = {text:"JSR", size:2, func:inst_jsr};
		inst_table[RET]  = {text:"RET", size:0, func:inst_ret};
		inst_table[JL]   = {text:"JL",  size:2, func:inst_jl};
		inst_table[JE]   = {text:"JE",  size:2, func:inst_je};
		inst_table[JNE]  = {text:"JNE", size:2, func:inst_jne};
		inst_table[JG]   = {text:"JG",  size:2, func:inst_jg};
		inst_table[LDA]  = {text:"LDA", size:1, func:inst_lda};
		inst_table[LDM]  = {text:"LDM", size:2, func:inst_ldm};
		inst_table[STA]  = {text:"STA", size:2, func:inst_sta};
		inst_table[SP]   = {text:"SP",  size:2, func:inst_sp};
		inst_table[LP]   = {text:"LP",  size:0, func:inst_lp};
		inst_table[GP]   = {text:"GP",  size:0, func:inst_gp};
		inst_table[IP]   = {text:"IP",  size:0, func:inst_ip};
		inst_table[AP]   = {text:"AP",  size:0, func:inst_ap};
		inst_table[PUSH] = {text:"PUSH",size:0, func:inst_push};
		inst_table[POP]  = {text:"POP", size:0, func:inst_pop};
		inst_table[CMP]  = {text:"CMP", size:1, func:inst_cmp};
		inst_table[OUT]  = {text:"OUT", size:0, func:inst_out};
		inst_table[AND]  = {text:"AND", size:1, func:inst_and};
		inst_table[OR]   = {text:"OR",  size:1, func:inst_or};
		inst_table[XOR]  = {text:"XOR", size:1, func:inst_xor};
		inst_table[NOT]  = {text:"NOT", size:1, func:inst_not};
		inst_table[SHL]  = {text:"SHL", size:1, func:inst_shl};
		inst_table[SHR]  = {text:"SHR", size:1, func:inst_shr};
		inst_table[ADD]  = {text:"ADD", size:1, func:inst_add};
		inst_table[SUB]  = {text:"SUB", size:1, func:inst_sub};
		inst_table[NEG]  = {text:"NEG", size:0, func:inst_neg};
		inst_table[RND]  = {text:"RND", size:0, func:inst_rnd};
		inst_table[SYNC] = {text:"SYNC",size:0, func:inst_sync};
		inst_table[END]  = {text:"END", size:0, func:inst_end};
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
	
	// Next inst
	function step()
	{		
		// End of program
		if (ip == IP_END) return;
				
		if (DEBUG) disassemble_inst(ip, 1);
		
		// Get next inst
		var inst = memory.get_byte(ip++);		
		
		// Catch undefined
		if (inst_table[inst] == undefined)
		{
			main.log_console("Undefined inst [" + (hex_word(ip+1)) + "] " + hex_byte(inst) + "\n");
			return;
		}
		
		// Execute
		if (inst_table[inst].func != null)
			inst_table[inst].func();
			
		// Display stack dump?
		if (DISP_STACK)
			for (var i = 0; i < 5; i++)
				main.log_console("Stack["+i+"]" + hex_byte(stack[i]) + "\n");
			
		ip += inst_table[inst].size; // Consume operands, next ip
		
		inst_updates++;
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
	
	/* End of CPU */
	
	return {init:init, pre_init:pre_init, update:update, 
			get_inst_table:get_inst_table, get_inst_count:get_inst_count};
}

