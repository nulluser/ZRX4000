/*
	CPU
	2019 nulluser, teth
	
	CPU Emulator
	
	Memory is shared between cores. Stack is local to core.
*/

"use strict";

// Testing clean OO arch

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
		CPU.NUM_INST = CPU.DEBUG ? 1 : 1000000;	// Instructions per update
		CPU.STACK_SIZE = 32768;			// Stack space size
		//const UPDATE_RATE = 1;		// CPU Update
		
		// Errors
		CPU.ERROR_UI = 0x01;			// Unknown instruction
		CPU.ERROR_UIF = 0x02;			// Unknown instruction function

		// Instruction modes
		CPU.M_ANY  = 0xFF;				// Any mode mask for assembler
		CPU.M_NONE = 0x00;				// No Mode (test)
		CPU.M_IMP  = 0x01;				// Implied, no operand
		CPU.M_IMM  = 0x02;				// Immediate mode
		CPU.M_DIR  = 0x03;				// Direct mode, 16 bit address
		CPU.M_IND  = 0x04;				// Indirect mode, 16 bit address	
		

		CPU.IP_END = -1;			
		
		CPU.inst_table = [];
		
		//                     Display text Inst mode    Size Func Ptr
		CPU.inst_table[0x00] = {text:"NOP", m:CPU.M_IMP, s:0, f:CPU.inst_nop }; // No Operation	
		CPU.inst_table[0x01] = {text:"JMP", m:CPU.M_DIR, s:2, f:CPU.inst_jmp }; // Jump to address
		CPU.inst_table[0x02] = {text:"JSR", m:CPU.M_DIR, s:2, f:CPU.inst_jsr }; // Jump subroutine
		CPU.inst_table[0x03] = {text:"RET", m:CPU.M_IMP, s:0, f:CPU.inst_ret }; // Return
		CPU.inst_table[0x04] = {text:"JL",  m:CPU.M_DIR, s:2, f:CPU.inst_jl  }; // Jump if less
		CPU.inst_table[0x05] = {text:"JE",  m:CPU.M_DIR, s:2, f:CPU.inst_je  }; // Jump Equal
		CPU.inst_table[0x06] = {text:"JNE", m:CPU.M_DIR, s:2, f:CPU.inst_jne }; // Jump Not Equal
		CPU.inst_table[0x07] = {text:"JG",  m:CPU.M_DIR, s:2, f:CPU.inst_jg  }; // Jump greater

		CPU.inst_table[0x10] = {text:"LDA", m:CPU.M_IMM, s:1, f:CPU.inst_lda }; // Load A with constant
		CPU.inst_table[0x11] = {text:"LDA", m:CPU.M_DIR, s:2, f:CPU.inst_ldad}; // Load A value from memory 
		CPU.inst_table[0x12] = {text:"LDX", m:CPU.M_IMM, s:1, f:CPU.inst_ldx }; // Load X with constant
		CPU.inst_table[0x13] = {text:"LDY", m:CPU.M_IMM, s:1, f:CPU.inst_ldy }; // Load Y with constant
		CPU.inst_table[0x14] = {text:"LDP", m:CPU.M_DIR, s:2, f:CPU.inst_ldp }; // Load P with value at memory location
		
		//CPU.inst_table[0x14] = {text:"LDM", m:CPU.M_DIR, s:2, f:CPU.inst_ldm }; // Load A value from memory 
		
		
		CPU.inst_table[0x18] = {text:"STA", m:CPU.M_DIR, s:2, f:CPU.inst_sta }; // Store A at memory location
		CPU.inst_table[0x19] = {text:"STX", m:CPU.M_DIR, s:2, f:CPU.inst_stx }; // Store X at memory location
		CPU.inst_table[0x1A] = {text:"STY", m:CPU.M_DIR, s:2, f:CPU.inst_sty }; // Store Y at memory location
		CPU.inst_table[0x1B] = {text:"STP", m:CPU.M_DIR, s:2, f:CPU.inst_stp }; // Store P at memory location


		CPU.inst_table[0x20] = {text:"TXA", m:CPU.M_IMP, s:0, f:CPU.inst_txa }; // Transfre X to A
		CPU.inst_table[0x21] = {text:"TAX", m:CPU.M_IMP, s:0, f:CPU.inst_tax }; // Transfer A to X
		CPU.inst_table[0x22] = {text:"TYA", m:CPU.M_IMP, s:0, f:CPU.inst_tya }; // Transfre Y to A
		CPU.inst_table[0x23] = {text:"TAY", m:CPU.M_IMP, s:0, f:CPU.inst_tay }; // Transfer A to Y
		
		CPU.inst_table[0x30] = {text:"SP",  m:CPU.M_DIR, s:2, f:CPU.inst_sp  }; // Set pointer address
		CPU.inst_table[0x31] = {text:"LP",  m:CPU.M_IMP, s:0, f:CPU.inst_lp  }; // Load A into memory at pointer
		CPU.inst_table[0x32] = {text:"GP",  m:CPU.M_IMP, s:0, f:CPU.inst_gp  }; // Get value at pointer
		CPU.inst_table[0x33] = {text:"AP",  m:CPU.M_IMP, s:0, f:CPU.inst_ap  }; // Add a to pointer

		CPU.inst_table[0x40] = {text:"PUSH",m:CPU.M_IMP, s:0, f:CPU.inst_push}; // Push A into stack
		CPU.inst_table[0x41] = {text:"POP", m:CPU.M_IMP, s:0, f:CPU.inst_pop }; // Pop from stack into A

		CPU.inst_table[0x42] = {text:"PUSHP",m:CPU.M_IMP, s:0, f:CPU.inst_pshp};// Push A into stack
		CPU.inst_table[0x43] = {text:"POPP", m:CPU.M_IMP, s:0, f:CPU.inst_popp};// Pop from stack into A
		
		
		CPU.inst_table[0x50] = {text:"CMP", m:CPU.M_IMM, s:1, f:CPU.inst_cmp }; // Compare with A
		CPU.inst_table[0x51] = {text:"CPX", m:CPU.M_IMM, s:1, f:CPU.inst_cpx }; // Compare with X
		CPU.inst_table[0x52] = {text:"CPY", m:CPU.M_IMM, s:1, f:CPU.inst_cpy }; // Compare with Y

		CPU.inst_table[0x60] = {text:"INC", m:CPU.M_IMP, s:0, f:CPU.inst_inc }; // Increment A
		CPU.inst_table[0x61] = {text:"DEC", m:CPU.M_IMP, s:0, f:CPU.inst_dec }; // Decrement A
		CPU.inst_table[0x62] = {text:"INX", m:CPU.M_IMP, s:0, f:CPU.inst_inx }; // Increment X
		CPU.inst_table[0x63] = {text:"DEX", m:CPU.M_IMP, s:0, f:CPU.inst_dex }; // Decrement X
		CPU.inst_table[0x64] = {text:"INY", m:CPU.M_IMP, s:0, f:CPU.inst_iny }; // Increment Y
		CPU.inst_table[0x65] = {text:"DEY", m:CPU.M_IMP, s:0, f:CPU.inst_dey }; // Decrement Y
		CPU.inst_table[0x66] = {text:"INP", m:CPU.M_IMP, s:0, f:CPU.inst_inp }; // Increment pointer
		CPU.inst_table[0x67] = {text:"DEP", m:CPU.M_IMP, s:0, f:CPU.inst_dep }; // Increment pointer
		
		
		CPU.inst_table[0x70] = {text:"TSA", m:CPU.M_IMP, s:0, f:CPU.inst_tsa }; // Transfer Status to A
		CPU.inst_table[0x71] = {text:"TAS", m:CPU.M_IMP, s:0, f:CPU.inst_tas }; // Transfer A to Status
		CPU.inst_table[0x72] = {text:"CLC", m:CPU.M_IMP, s:0, f:CPU.inst_clc }; // Clear Carry
		CPU.inst_table[0x73] = {text:"SET", m:CPU.M_IMP, s:0, f:CPU.inst_sec }; // Set Carry
		
		CPU.inst_table[0x80] = {text:"OUT", m:CPU.M_IMP, s:0, f:CPU.inst_out }; // Output A to console

		CPU.inst_table[0x90] = {text:"AND", m:CPU.M_IMM, s:1, f:CPU.inst_and }; // Set A to A & immediate
		CPU.inst_table[0x91] = {text:"OR",  m:CPU.M_IMM, s:1, f:CPU.inst_or  }; // Set A to A | immediate
		CPU.inst_table[0x92] = {text:"XOR", m:CPU.M_IMM, s:1, f:CPU.inst_xor }; // Set A to A ^ immediate
		CPU.inst_table[0x93] = {text:"NOT", m:CPU.M_IMM, s:1, f:CPU.inst_not }; // Set A to bitwise negation of A
		CPU.inst_table[0x94] = {text:"SHL", m:CPU.M_IMM, s:1, f:CPU.inst_shl }; // Shift A left by immediate bits
		CPU.inst_table[0x95] = {text:"SHR", m:CPU.M_IMM, s:1, f:CPU.inst_shr }; // Shift A right by the immediate bits
		CPU.inst_table[0x96] = {text:"ADD", m:CPU.M_IMM, s:1, f:CPU.inst_add }; // Set A to A + operand Z_256
		CPU.inst_table[0x97] = {text:"ADDP",m:CPU.M_IMP, s:0, f:CPU.inst_addp}; // Set P to P + A
		CPU.inst_table[0x98] = {text:"ADDX",m:CPU.M_IMP, s:0, f:CPU.inst_addx}; // Set A to A + X Z_256
		CPU.inst_table[0x99] = {text:"SUB", m:CPU.M_IMM, s:1, f:CPU.inst_sub }; // Set A to A + operand Z_256
		CPU.inst_table[0x9A] = {text:"SUBP",m:CPU.M_IMP, s:0, f:CPU.inst_subp}; // Set Set P to P - A
		CPU.inst_table[0x9B] = {text:"MUL", m:CPU.M_IMM, s:1, f:CPU.inst_mul }; // Set A to A * operand Z_256
		CPU.inst_table[0x9C] = {text:"DIV", m:CPU.M_IMM, s:1, f:CPU.inst_div }; // Set A to A / operand Z_256
		CPU.inst_table[0x9D] = {text:"NEG", m:CPU.M_IMP, s:0, f:CPU.inst_neg }; // Set A to the additive inverse of A in Z_256
		
		CPU.inst_table[0xB0] = {text:"RND", m:CPU.M_IMP, s:0, f:CPU.inst_rnd }; // Random number
		CPU.inst_table[0xC0] = {text:"SYNC",m:CPU.M_IMP, s:0, f:CPU.inst_sync}; // Render framebuffer
		CPU.inst_table[0xFF] = {text:"END", m:CPU.M_IMP, s:0, f:CPU.inst_end }; // Halt
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
			
	// Core Update
	update()
	{
		if (!this.prog_loaded) return;
		
		this.inst_updates = 0;
		
		var r = this.step(CPU.NUM_INST); // Process a chunk
		
		if (r > 0)				// Deal with CPU errors
		{
			if (r == CPU.ERROR_UI)
			{
				var a = this.state.ip-1;
				main.log_console(`${CPU.MODULE} ${this.name} Undefined inst at [${hex_word(a)}] = (${hex_byte(this.memory.get_byte(a))}) \n`);
				this.disassemble_inst(a, 1);
				this.program_loaded = 0;
				this.ip = CPU.IP_END;
			} else
			if (r == CPU.ERROR_UIF)
			{
				var a = this.state.ip-1;
				main.log_console(`${CPU.MODULE} ${this.name} Undefined inst function at [${hex_word(a)}] = (${hex_byte(this.memory.get_byte(a))}) \n`);
				this.ip = CPU.IP_END;
			}			
		}
		
		this.state.fb_update = 0;
		
		return this.inst_updates;
	}
		
	
	// Display current stack
	dump_stack()
	{
		main.log_console(`Stack:\n`);
		for (var i = 0; i < CPU.DUMP_STACK_SZ; i++)
			main.log_console(` [${i}] ${hex_byte(stack[i])}\n`);
		this.ip = this.IP_END;
	}
	
	// Pad inst for display 
	pad_inst(str) {var pad = "    ";return (str + pad).substring(0, pad.length);}
	
	
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
		main.log_console(this.pad_inst(inst.text) + "   ");

		if (inst.s == 0) main.log_console(this.pad_inst("")); 
		if (inst.s == 1) main.log_console(this.pad_inst(hex_byte(this.memory.get_byte(i+1)))); 
		if (inst.s == 2) main.log_console(hex_word(this.memory.get_word(i+1)));
	
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
		
		//i += inst.s + 1;	// Advance ip
	
		main.log_console("\n");
		//return i;
	}		
		
	// Clear all flags
	reset_flags()
	{
		//main.log_console(`Reset Flags ${hex_word(this.start_addr)}\n`);
		
		this.state.ip=this.start_addr; 
		this.state.sp=0; 
		this.state.a=0;
		this.state.x=0;
		this.state.y=0;
		this.state.e=0;
		this.state.l=0;
		this.state.g=0;
		this.state.p=0;					
	}

	// Push byte to stack
	static push_byte(s, v) { s.stack[s.sp++] = v; } 
	
	// Pop byte from stack
	static pop_byte(s, v) { return s.stack[--s.sp]; } 
		
	// Push word to stack. Pushed as low byte, high byte
	static push_word(s, v) { CPU.push_byte(s, v&0xff); CPU.push_byte(s, v>>8); } 
	
	// Pop word from stack. Poped as high byte, low byte
	static pop_word(s, v) { var v = CPU.pop_byte(s,0)<<8; v |= CPU.pop_byte(s,0); return v; } 

	
	// Instructions
	
	static compare(s, v1, v2) { s.e = v1 == v2;s. l = v1 < v2; s.g = v1 > v2; }
	
	static inst_nop (m, s) {};
	
   	static inst_jmp (m, s) {s.ip = m.get_word(s.ip) - 2;}
	static inst_jsr (m, s) {CPU.push_word(s, s.ip+2); s.ip = m.get_word(s.ip) - 2;}
	static inst_ret (m, s) {s.ip = CPU.pop_word(s); }
	static inst_jl  (m, s) {if (s.l) s.ip = m.get_word(s.ip) - 2;} 
	static inst_je  (m, s) {if (s.e) s.ip = m.get_word(s.ip) - 2;} 
	static inst_jne (m, s) {if (!s.e)s.ip = m.get_word(s.ip) - 2;} 
	static inst_jg  (m, s) {if (s.g) s.ip = m.get_word(s.ip) - 2;} 

	static inst_sp  (m, s) {s.p = m.get_word(s.ip)} 
	static inst_lp  (m, s) {m.set_byte(s.p, s.a);} 
	static inst_gp  (m, s) {s.a = m.get_byte(s.p);} 
	
	static inst_ap  (m, s) {s.p+=s.a;}  

	static inst_lda (m, s) {s.a = m.get_byte(s.ip);}
	static inst_ldad (m, s) {s.a = m.get_byte(m.get_word(s.ip));} 
	static inst_ldx (m, s) {s.x = m.get_byte(s.ip);}
	static inst_ldy (m, s) {s.y = m.get_byte(s.ip);}
	static inst_ldp (m, s) {s.p = m.get_word(m.get_word(s.ip));} 
	//static inst_ldm (m, s) {s.a = m.get_byte(m.get_word(s.ip));} 


	//static inst_ldam (m, s) {s.a = m.get_byte(m.get_word(s.ip));} 

	static inst_sta (m, s) {m.set_byte(m.get_word(s.ip), s.a);}
	static inst_stx (m, s) {m.set_byte(m.get_word(s.ip), s.x);}
	static inst_sty (m, s) {m.set_byte(m.get_word(s.ip), s.y);}
	static inst_stp (m, s) {m.set_word(m.get_word(s.ip), s.p);}
	

	static inst_tax (m, s) {s.x = s.a;}
	static inst_txa (m, s) {s.a = s.x;}
	static inst_tay (m, s) {s.y = s.a;}
	static inst_tya (m, s) {s.a = s.y;}
	
	static inst_push(m, s) {CPU.push_byte(s, s.a);} 
	static inst_pop (m, s) {s.a = CPU.pop_byte(s);} 
	
	static inst_pshp(m, s) {CPU.push_word(s, s.p);} 
	static inst_popp(m, s) {s.p = CPU.pop_word(s);} 
	
	
	static inst_cmp (m, s) {CPU.compare(s, s.a, m.get_byte(s.ip));} 
	static inst_cpx (m, s) {CPU.compare(s, s.x, m.get_byte(s.ip));} 
	static inst_cpy (m, s) {CPU.compare(s, s.y, m.get_byte(s.ip));} 
		
	static inst_inc (m, s) {s.a = (s.a + 1) & 0xff;}
	static inst_dec (m, s) {s.a = (s.a - 1) & 0xff;}
	static inst_inx (m, s) {s.x = (s.x + 1) & 0xff;}
	static inst_dex (m, s) {s.x = (s.x - 1) & 0xff;}
	static inst_iny (m, s) {s.y = (s.y + 1) & 0xff;}
	static inst_dey (m, s) {s.y = (s.y - 1) & 0xff;}
	static inst_inp (m, s) {s.p = (s.p+1) & 0xffff;} 
	static inst_dep (m, s) {s.p = (s.p-1) & 0xffff;} 
	
	static inst_tsa (m, s) {s.a = (s.e << 3) | (s.l << 2) | (s.g << 1) | s.c;}
    static inst_tas (m, s) {s.e = s.a >> 3; s.l = (s.a >> 2) & 1; s.g = (s.a >> 1) & 1; s.c = s.a & 1; }
    static inst_clc (m, s) {s.c = 0;}
    static inst_sec (m, s) {s.c = 1;}
	
	static inst_and (m, s) {s.a = s.a & m.get_byte(s.ip);} 
	static inst_or  (m, s) {s.a = s.a | m.get_byte(s.ip);} 
	static inst_xor (m, s) {s.a = s.a ^ m.get_byte(s.ip);} 
	static inst_not (m, s) {s.a = ~s.a;} 
	static inst_shl (m, s) {s.a = s.a << m.get_byte(s.ip);} 
	static inst_shr (m, s) {s.a = s.a >> m.get_byte(s.ip);} 
	
	static inst_add (m, s) {var sum = s.a + m.get_byte(s.ip); s.a = sum & 0xff; s.c = sum &0x0100}
	static inst_addp(m, s) {s.p = (s.p + s.a) & 0xffff;}
	static inst_addx(m, s) {s.x = (s.x + s.a) & 0xff;}
	static inst_sub (m, s) {s.a = (s.a - m.get_byte(s.ip)) & 0xff;}
	static inst_subp(m, s) {s.p = (s.p - s.a) & 0xffff;}
	static inst_mul (m, s) {s.a = (s.a * m.get_byte(s.ip)) & 0xff;}
	static inst_div (m, s) {s.a = (s.a / m.get_byte(s.ip)) & 0xff;}
	static inst_neg (m, s) {s.a = (65536 - s.a) & 0xff;}
	
	static inst_rnd (m, s) {s.a = (Math.random() * 255) & 0xff;} 
	static inst_sync(m, s) {s.fb_update=1;} 
	static inst_out (m, s) {main.log_output(get_char(s.a));} 
	static inst_end (m, s) {s.ip = CPU.IP_END;} 
	 

	// Process count number of instructions
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
			
			if (inst === undefined) return(CPU.ERROR_UI);			// Catch undefined inst
			if (inst.f === undefined) return(CPU.ERROR_UIF);		// Catch undefined inst function
			
			inst.f(this.memory, this.state);						// Execute

			if (CPU.DUMP_STACK) this.dump_stack();					// Display stack dump

			this.state.ip += inst.s;								// Consume operands, next ip
			exec++;
		}
		
		this.inst_updates += exec;
		
		
		return 0;
	}
	
	/* End of CPU */
	
	//return exports;
	
}






	