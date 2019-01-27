/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory is shared between cores. Stack is local to core.
*/

"use strict";

// CPU
// Pass in name, Memory, start address
class CPU
{
	// Configure static members
	static configure()	
	{
		/* Static Members */
		CPU.MODULE = "[CPU]       ";
		
		// Debugging
		CPU.DEBUG = 0;					// Slow down for debugging
		CPU.DUMP_MEM = 0;				// Dump memory on load
		CPU.DUMP_MEM_SIZE = 0x100;		// Dump Size
		CPU.DUMP_STACK = 0;				// Displat stack during execution
		CPU.DUMP_STACK_SZ = 0x10;		// Number of stack elements to display

		// Config	
		CPU.NUM_INST =  1000000;		// Instructions per update
		
		if (CPU.DEBUG) CPU.NUM_INST = 1;// Less instructions for debug
		
		CPU.STACK_SIZE = 32768;			// Stack space size
		
		// Errors
		CPU.ERROR_UI = 0x01;			// Unknown instruction

		// Instruction modes
		CPU.M_ANY  = 0xFF;				// Any mode mask for assembler
		CPU.M_NONE = 0x00;				// No Mode (test)
		CPU.M_IMP  = 0x01;				// Implied, no operand
		CPU.M_IMM  = 0x02;				// Immediate mode
		CPU.M_DIR  = 0x03;				// Direct mode, 16 bit address
		CPU.M_IND  = 0x04;				// Indirect mode, 16 bit address	
		
		CPU.IP_END = -1;			
		
		CPU.inst_table = [];
		
		//	 Fill instruction table so there are no gaps		
		for (var i = 0; i < 256; i++) CPU.INST(i, "", 0, null);
		
		//       OP   Text    Inst mode  Func Ptr
		CPU.INST(0x00,"NOP",  CPU.M_IMP, (m, s)=>{} ); 														// No Operation	
		CPU.INST(0x01,"JMP",  CPU.M_DIR, (m, s)=>{s.ip = m.get_word(s.ip) - 2;});							// Jump to location
		CPU.INST(0x02,"JSR",  CPU.M_DIR, (m, s)=>{CPU.push_word(s, s.ip+2); s.ip = m.get_word(s.ip) - 2;});	// Jump subroutine
		CPU.INST(0x03,"RET",  CPU.M_IMP, (m, s)=>{s.ip = CPU.pop_word(s); }); 								// Return
		CPU.INST(0x04,"JL",   CPU.M_DIR, (m, s)=>{if (s.l) s.ip = m.get_word(s.ip) - 2;}); 					// Jump if less
		CPU.INST(0x05,"JE",   CPU.M_DIR, (m, s)=>{if (s.e) s.ip = m.get_word(s.ip) - 2;}); 					// Jump Equal
		CPU.INST(0x06,"JNE",  CPU.M_DIR, (m, s)=>{if (!s.e)s.ip = m.get_word(s.ip) - 2;}); 					// Jump Not Equal
		CPU.INST(0x07,"JG",   CPU.M_DIR, (m, s)=>{if (s.g) s.ip = m.get_word(s.ip) - 2;}); 					// Jump greater
		CPU.INST(0x10,"LDA",  CPU.M_IMM, (m, s)=>{s.a = m.get_byte(s.ip);}); 								// Load A with constant
		CPU.INST(0x11,"LDA",  CPU.M_DIR, (m, s)=>{s.a = m.get_byte(m.get_word(s.ip));}); 					// Load A value from memory 
		CPU.INST(0x12,"LDX",  CPU.M_IMM, (m, s)=>{s.x = m.get_byte(s.ip);}); 								// Load X with constant
		CPU.INST(0x13,"LDY",  CPU.M_IMM, (m, s)=>{s.y = m.get_byte(s.ip);}); 								// Load Y with constant
		CPU.INST(0x14,"LDP",  CPU.M_DIR, (m, s)=>{s.p = m.get_word(m.get_word(s.ip));}); 					// Load P with value at memory location		
		CPU.INST(0x18,"STA",  CPU.M_DIR, (m, s)=>{m.set_byte(m.get_word(s.ip), s.a);}); 					// Store A at memory location
		CPU.INST(0x19,"STX",  CPU.M_DIR, (m, s)=>{m.set_byte(m.get_word(s.ip), s.x);}); 					// Store X at memory location
		CPU.INST(0x1A,"STY",  CPU.M_DIR, (m, s)=>{m.set_byte(m.get_word(s.ip), s.y);}); 					// Store Y at memory location
		CPU.INST(0x1B,"STP",  CPU.M_DIR, (m, s)=>{m.set_word(m.get_word(s.ip), s.p);}); 					// Store P at memory location
		CPU.INST(0x20,"TXA",  CPU.M_IMP, (m, s)=>{s.a = s.x;}); 											// Transfre X to A
		CPU.INST(0x21,"TAX",  CPU.M_IMP, (m, s)=>{s.x = s.a;}); 											// Transfer A to X
		CPU.INST(0x22,"TYA",  CPU.M_IMP, (m, s)=>{s.a = s.y;}); 											// Transfre Y to A
		CPU.INST(0x23,"TAY",  CPU.M_IMP, (m, s)=>{s.y = s.a;}); 											// Transfer A to Y
		CPU.INST(0x30,"SP",   CPU.M_DIR, (m, s)=>{s.p = m.get_word(s.ip)});						 			// Set pointer address
		CPU.INST(0x31,"LP",   CPU.M_IMP, (m, s)=>{m.set_byte(s.p, s.a);});						 			// Load A into memory at pointer
		CPU.INST(0x32,"GP",   CPU.M_IMP, (m, s)=>{s.a = m.get_byte(s.p);});						 			// Get value at pointer
		CPU.INST(0x33,"AP",   CPU.M_IMP, (m, s)=>{s.p+=s.a;}); 												// Add a to pointer
		CPU.INST(0x40,"PUSH", CPU.M_IMP, (m, s)=>{CPU.push_byte(s, s.a);}); 								// Push A into stack
		CPU.INST(0x41,"POP",  CPU.M_IMP, (m, s)=>{s.a = CPU.pop_byte(s);});									// Pop from stack into A
		CPU.INST(0x42,"PUSHP",CPU.M_IMP, (m, s)=>{CPU.push_word(s, s.p);});					 				// Push A into stack
		CPU.INST(0x43,"POPP", CPU.M_IMP, (m, s)=>{s.p = CPU.pop_word(s);});					 				// Pop from stack into A		
		CPU.INST(0x50,"CMP",  CPU.M_IMM, (m, s)=>{CPU.compare(s, s.a, m.get_byte(s.ip));}); 				// Compare with A
		CPU.INST(0x51,"CPX",  CPU.M_IMM, (m, s)=>{CPU.compare(s, s.x, m.get_byte(s.ip));}); 				// Compare with X
		CPU.INST(0x52,"CPY",  CPU.M_IMM, (m, s)=>{CPU.compare(s, s.y, m.get_byte(s.ip));}); 				// Compare with Y
		CPU.INST(0x60,"INC",  CPU.M_IMP, (m, s)=>{s.a = (s.a + 1) & 0xff;}); 								// Increment A
		CPU.INST(0x61,"DEC",  CPU.M_IMP, (m, s)=>{s.a = (s.a - 1) & 0xff;}); 								// Decrement A
		CPU.INST(0x62,"INX",  CPU.M_IMP, (m, s)=>{s.x = (s.x + 1) & 0xff;}); 								// Increment X
		CPU.INST(0x63,"DEX",  CPU.M_IMP, (m, s)=>{s.x = (s.x - 1) & 0xff;}); 								// Decrement X
		CPU.INST(0x64,"INY",  CPU.M_IMP, (m, s)=>{s.y = (s.y + 1) & 0xff;}); 								// Increment Y
		CPU.INST(0x65,"DEY",  CPU.M_IMP, (m, s)=>{s.y = (s.y - 1) & 0xff;}); 								// Decrement Y
		CPU.INST(0x66,"INP",  CPU.M_IMP, (m, s)=>{s.p = (s.p+1) & 0xffff;}); 								// Increment pointer
		CPU.INST(0x67,"DEP",  CPU.M_IMP, (m, s)=>{s.p = (s.p-1) & 0xffff;}); 								// Increment pointer		
		CPU.INST(0x70,"TSA",  CPU.M_IMP, (m, s)=>{s.a = (s.e << 3) | (s.l << 2) | (s.g << 1) | s.c;} ); // Transfer Status to A
		CPU.INST(0x71,"TAS",  CPU.M_IMP, (m, s)=>{s.e = s.a >> 3; s.l = (s.a >> 2) & 1; s.g = (s.a >> 1) & 1; s.c = s.a & 1; } ); // Transfer A to Status
		CPU.INST(0x72,"CLC",  CPU.M_IMP, (m, s)=>{s.c = 0;} );									 			// Clear Carry
		CPU.INST(0x73,"SET",  CPU.M_IMP, (m, s)=>{s.c = 1;} ); 												// Set Carry		
		CPU.INST(0x80,"OUT",  CPU.M_IMP, (m, s)=>{main.log_output(get_char(s.a));}  );				 		// Output A to console
		CPU.INST(0x90,"AND",  CPU.M_IMM, (m, s)=>{s.a = s.a & m.get_byte(s.ip);}  ); 						// Set A to A & immediate
		CPU.INST(0x91,"OR",   CPU.M_IMM, (m, s)=>{s.a = s.a | m.get_byte(s.ip);}   ); 						// Set A to A | immediate
		CPU.INST(0x92,"XOR",  CPU.M_IMM, (m, s)=>{s.a = s.a ^ m.get_byte(s.ip);}  ); 						// Set A to A ^ immediate
		CPU.INST(0x93,"NOT",  CPU.M_IMM, (m, s)=>{s.a = ~s.a;}  ); 											// Set A to bitwise negation of A
		CPU.INST(0x94,"SHL",  CPU.M_IMM, (m, s)=>{s.a = s.a << m.get_byte(s.ip);}  ); 						// Shift A left by immediate bits
		CPU.INST(0x95,"SHR",  CPU.M_IMM, (m, s)=>{s.a = s.a >> m.get_byte(s.ip);}  ); 						// Shift A right by the immediate bits
		CPU.INST(0x96,"ADD",  CPU.M_IMM, (m, s)=>{var sm = s.a + m.get_byte(s.ip); s.a = sm & 0xff; s.c = sm &0x0100} ); // Set A to A + operand Z_256
		CPU.INST(0x97,"ADDP", CPU.M_IMP, (m, s)=>{s.p = (s.p + s.a) & 0xffff;}); 							// Set P to P + A
		CPU.INST(0x98,"ADDX", CPU.M_IMP, (m, s)=>{s.x = (s.x + s.a) & 0xff;}); 								// Set A to A + X Z_256
		CPU.INST(0x99,"SUB",  CPU.M_IMM, (m, s)=>{s.a = (s.a - m.get_byte(s.ip)) & 0xff;} ); 				// Set A to A + operand Z_256
		CPU.INST(0x9A,"SUBP", CPU.M_IMP, (m, s)=>{s.p = (s.p - s.a) & 0xffff;}); 							// Set Set P to P - A
		CPU.INST(0x9B,"MUL",  CPU.M_IMM, (m, s)=>{s.a = (s.a * m.get_byte(s.ip)) & 0xff;} ); 				// Set A to A * operand Z_256
		CPU.INST(0x9C,"DIV",  CPU.M_IMM, (m, s)=>{s.a = (s.a / m.get_byte(s.ip)) & 0xff;} ); 				// Set A to A / operand Z_256
		CPU.INST(0x9D,"NEG",  CPU.M_IMP, (m, s)=>{s.a = (65536 - s.a) & 0xff;} ); 							// Set A to the additive inverse of A in Z_256
		CPU.INST(0xB0,"RND",  CPU.M_IMP, (m, s)=>{s.a = (Math.random() * 255) & 0xff;} ); 					// Random number
		CPU.INST(0xC0,"SYNC", CPU.M_IMP, (m, s)=>{s.fb_update=1;} ); 										// Render framebuffer
		CPU.INST(0xFF,"END",  CPU.M_IMP, (m, s)=>{s.ip = CPU.IP_END;}  );									// Halt
		
		// Compute sizes
		for (var i in CPU.inst_table)
		{
			if (CPU.inst_table[i].m == CPU.M_IMP) CPU.inst_table[i].s = 0;
			if (CPU.inst_table[i].m == CPU.M_IMM) CPU.inst_table[i].s = 1;
			if (CPU.inst_table[i].m == CPU.M_DIR) CPU.inst_table[i].s = 2;
			if (CPU.inst_table[i].m == CPU.M_IND) CPU.inst_table[i].s = 2;
		}
		
	}	
	
	
	// Instance Constructor
	constructor (name, memory, start_addr)
	{
		/* Variables */
		this.name = name;
		this.memory = memory;
		this.start_addr = start_addr;

		// CPU State
		this.state = 
		{
			stack:null, 			// Local stack
			ip:start_addr, 			// Instruction pointer
			sp:0,					// Stack Pointer
			a:0,					// Accum
			x:0, 					// X
			y:0, 					// Y
			e:0, 					// E // TODO Need combine into FLAGS register
			l:0, 					// L
			g:0, 					// G
			c:0,					// Carry
			p:0, 					// Pointer
			fb_udpate:0				// Frame buffer update 
		};
	
		// Monitoring
		this.inst_updates = 0;		// Instruction updates
		this.prog_loaded = false;	// True if loaded
		
		this.state.stack = new Uint8Array(CPU.STACK_SIZE);		// Get Stack
		
		this.prog_loaded = true;

		main.log_console(`${CPU.MODULE} Loaded CPU ${name} at ${hex_word(start_addr)}\n`);
	}
	
	
	/* 
		Private
	*/						
		
	
	// Display current stack
	dump_stack()
	{
		main.log_console(`Stack:\n`);
		for (var i = 0; i < CPU.DUMP_STACK_SZ; i++)
			main.log_console(` [${i}] ${hex_byte(stack[i])}\n`);
		this.ip = this.IP_END;
	}
		
	// Disassemble single instruction
	disassemble_inst(i, flags)
	{
		main.log_console(hex_word(i) + " "); // Address

		var inst_byte = this.memory.get_byte(i);	// instruction
		
		//main.log_console.log("byte: " + inst_byte + " " + i);
		var inst = CPU.inst_table[inst_byte];
		
		if (inst === undefined)
		{
			main.log_console(`Inst not defined ${i} : ${inst_byte}\n`);
			this.state.ip = CPU.END_IP;
			return;
		}
		
		// Inst name
		main.log_console(inst.text.padEnd(6) + "   ");

		if (inst.s == 0) main.log_console("      "); 
		if (inst.s == 1) main.log_console(hex_byte(this.memory.get_byte(i+1)).padEnd(6)); 
		if (inst.s == 2) main.log_console(hex_word(this.memory.get_word(i+1)).padEnd(6));
	
		if (flags)
		{
			main.log_console(`  IP: ${hex_word(this.state.ip)} `+
							`A: ${hex_byte(this.state.a)} ` + 
							`X: ${hex_byte(this.state.x)} ` + 
							`Y: ${hex_byte(this.state.y)} ` + 
							`P: ${hex_word(this.state.p)} ` +
							`SP: ${hex_word(this.state.sp)} ` + 							
							`E: ${(this.state.e?1:0)} ` + 
							`G: ${(this.state.g?1:0)} ` + 
							`L ${(this.state.l?1:0)} ` +
							`O ${(this.state.o?1:0)} `
							);
		}
	
		main.log_console("\n");
	}		
		
	// Push byte to stack
	static push_byte(s, v)	{ s.stack[s.sp++] = v; } 
	
	// Pop byte from stack
	static pop_byte(s, v)	{ return s.stack[--s.sp]; } 
		
	// Push word to stack. Pushed as low byte, high byte
	static push_word(s, v)	{ CPU.push_byte(s, v&0xff); CPU.push_byte(s, v>>8); } 
	
	// Pop word from stack. Poped as high byte, low byte
	static pop_word(s, v)	{ var v = CPU.pop_byte(s,0)<<8; v |= CPU.pop_byte(s,0); return v; } 
	
	// Instruction Helper
	static compare(s, v1, v2) { s.e = v1 == v2;s.l = v1 < v2; s.g = v1 > v2; }
	
	// Load inst slot
	static INST(op, text, mode, func){ CPU.inst_table[op] = {text:text, m:mode, f:func}; };
	
	
	// Core Update
	update()
	{
		if (!this.prog_loaded) return;
		
		this.inst_updates = 0;
		
		var r = this.step(CPU.NUM_INST); // Process a chunk
		
		// Deal with CPU errors
		if (r > 0)						
		{
			if (r == CPU.ERROR_UI)
			{
				var a = this.state.ip-1;
				main.log_console(`${CPU.MODULE} ${this.name} Undefined inst at [${hex_word(a)}] = (${hex_byte(this.memory.get_byte(a))}) \n`);
				this.disassemble_inst(a, 1);
				this.program_loaded = 0;
				this.ip = CPU.IP_END;
			}			
		}
		
		this.state.fb_update = 0;
		
		return this.inst_updates;
	}
	
	
	// Process num_exec number of instructions
	// Return error code or 0
	step(num_exec)
	{
		var exec = 0; // Keep track of remaining
		
		if (this.state.ip == CPU.END_IP) return;
		
		var end =  Date.now() + 10;
		
		// Loop until done, or SYNC or HALT
		while(exec < num_exec && !this.state.fb_update && this.state.ip != CPU.IP_END && Date.now() < end)
		//while(this.state.ip != CPU.IP_END && Date.now() < end)
		{
			if (CPU.DEBUG) 
			{
				this.disassemble_inst(this.state.ip, 1);				// Dissassemble
			}
			
			var inst = CPU.inst_table[this.memory.get_byte(this.state.ip++)];	// Get next inst
			
			if (inst.text == "") return(CPU.ERROR_UI);				// Catch undefined inst
			
			inst.f(this.memory, this.state);						// Execute

			if (CPU.DUMP_STACK) this.dump_stack();					// Display stack dump

			this.state.ip += inst.s;								// Consume operands, next ip
			exec++;
		}
		
		this.inst_updates += exec;
		
		return 0;
	}
	
	/* End of CPU */
}
