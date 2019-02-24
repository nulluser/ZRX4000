/*
	CPU6502
	2019 nulluser, teth
	
	CPU6502 Emulator
	
	Memory is shared between cores. Stack is local to core.
*/

"use strict";

// CPU6502
// Pass in name, Memory, start address

//class CPU6502
function CPU6502(name, memory, io)
{
	/* Static Members */
	const MODULE = "[CPU6502]    ";

	const MAX_EXEC = 100000;		// Max number of instructions per update
		
	const RESET_VECT = 0xfffc;
		
	// Debugging
	const DUMP_MEM = 0;				// Dump memory on load
	const DUMP_MEM_SIZE = 0x100;	// Dump Size
	const DUMP_STACK = 0;			// Displat stack during execution
	const DUMP_STACK_SZ = 0x10;		// Number of stack elements to display

	const ENABLE_INTERRUPT = 1;		// Enable interrupt
		
	//const STACK_SIZE = 32768;		// Stack space size
		
	const VECBASE = 0xffe0;			// Base for interrupt vector table. 16 vectors, 32 bytes.  
									// CPU6502 will get the address stored here, push ip, and jmp there
		
	const OPTION_DEBUG = 1;			// Debug flag
	const OPTION_REALTIME = 2;		// Realtime. Process until SYNC instruction
		
	// Errors
	const ERROR_UI = 0x01;			// Unknown instruction

	var MODES = {};
		
	// Instruction modes
	MODES.M_ANY  = 0xFF;				// Any mode mask for assembler
	MODES.M_NONE = 0x00;				// No Mode (test)
	MODES.M_IMP  = 0x01;				// Implied, no operand
	MODES.M_ABS  = 0x02;				// Absolute
	MODES.M_ABSX = 0x03;				// Absolute X
	MODES.M_ABSY = 0x04;				// Absolute Y
	MODES.M_IMM  = 0x05;				// Immediate
	MODES.M_IND  = 0x06;				// Indirect
	MODES.M_XIND = 0x07;				// X Indirect
	MODES.M_INDY = 0x08;				// Indirect Y
	MODES.M_REL  = 0x09;				// Relative
	MODES.M_ZP   = 0x0A;				// Zero Page
	MODES.M_ZPX  = 0x0B;				// Zero Page X
	MODES.M_ZPY  = 0x0C;				// Zero Page Y
		
		
	var FLAGS_C = 0x01;
	var FLAGS_Z = 0x02;
	var FLAGS_I = 0x04;
	var FLAGS_D = 0x08;
	var FLAGS_B = 0x10;
	var FLAGS_X = 0x20;
	var FLAGS_V = 0x40;
	var FLAGS_N = 0x80;
		
		
	var inst_table = [];				// Opcode table
	
	/* Variables */
	//var name = "";
	//var memory = null;
	//var io = null;
	//var start_addr = null;
	var realtime = false;
	var debug = false;
		
	// CPU6502 State
	var state = {};
		
	var interrupt_queue = [];	// List of pending interrupt sources
	
	// Monitoring
	var inst_updates = 0;		// Instruction updates
	//var prog_loaded = false;	// True if loaded
		
	//var state.stack = new Uint8Array(STACK_SIZE);		// Get Stack

	// Registers
	var IP, SP, A, X, Y, FLAGS;
	var fb_update;
	
	//main.log_console(`${MODULE} CPU Constructor\n`);	
	
	var running = 0;
	
	/* Public */
	
	
	function configure()
	{
		
		load_instructions();
	}
	
	

	function reset()
	{
		main.log_console(`${MODULE}Rebooting\n`);
		
		interrupt_queue = [];	// List of pending interrupt sources
	
		inst_updates = 0;		// Instruction updates
		
		reset_flags();

		running = true;
		
		IP = memory.get_word(RESET_VECT);
		
	}
	
	function get_name()
	{
		return name;
	}
	
	
	function get_inst_table()
	{
		return inst_table;
	}
	
	function get_addr_modes()
	{
		return MODES;
	}
	
	function set_option(option, state)
	{
		if (option == "debug") debug = state;
		if (option == "realtime") realtime = state;
	}
	
	// External Interrupt
	function interrupt(source)
	{
		
		main.log_console(`${MODULE} ${name} Interrupt ${hex_byte(source)}\n`);
		
		interrupt_queue.push(source);
	}
	
	// Process next pending
	function next_interrupt()
	{
		if (interrupt_queue.length == 0) return;
		
		// Get next and remove from list
		var source = interrupt_queue[0];	// Get next
		interrupt_queue.splice(0, 1);		//  Remove from list
		
	
		// Just return if not enabled
		if (!ENABLE_INTERRUPT) return;
		
		main.log_console(`${MODULE} ${name} Process Interrupt ${hex_byte(source)}\n`);
	
		push_word(memory, state, IP);

		var addr = memory.get_word(VECBASE + 2 * source);
		
		IP = memory.get_word(VECBASE + 2 * source);
		
		//main.log_console(`${MODULE} ${name} Jumping to ${hex_word(IP)}\n`);
		
		//memory.dump(VECBASE, 32);
		
	}
	
	
	
	/* 
		Private
	*/						
	

	
	// Configure static members
	function load_instructions()	
	{
		main.log_console(`${MODULE} CPU Configure\n`);
		
		//	 Fill instruction table so there are no gaps		
		for (var i = 0; i < 256; i++) 
		{
			INST(i, "", MODES.M_NONE, (op)=>{});
			inst_table[i].s = 0;			
		}
		
		
		INST(0x00,"BRK",  MODES.M_IMP, (op)=>{ running = 0;} ); 
		INST(0x01,"ORA",  MODES.M_XIND,(op)=>{ A |= op;  flag_update(A)} ); 
		INST(0x05,"ORA",  MODES.M_ZP,  (op)=>{ A |= op;  flag_update(A)} ); 
		INST(0x06,"ASL",  MODES.M_ZP,  (op)=>{ var a = op; set_zp(a, get_zp(a) >> 1); } ); 
		INST(0x08,"PHP",  MODES.M_IMP, (op)=>{ push_byte(FLAGS); } ); 
		INST(0x09,"ORA",  MODES.M_IMM, (op)=>{ A |= op;  flag_update(A)} ); 
		INST(0x0a,"ASL",  MODES.M_IMP, (op)=>{ A <<= 1;  flag_update(A)} ); 
		INST(0x0d,"ORA",  MODES.M_ABS, (op)=>{ A |= op; flag_update(A)}  ); 
		INST(0x0e,"ASL",  MODES.M_ABS, (op)=>{ set_abs(IP, op << 1)} ); 

		INST(0x10,"BPL",  MODES.M_REL, (op)=>{ if (!get_flag(FLAGS_N)) branch();} ); 
		INST(0x11,"ORA",  MODES.M_INDY,(op)=>{ A |= op; flag_update(A);} ); 
		INST(0x15,"ORA",  MODES.M_ZPX, (op)=>{ A |= op; flag_update(A);} ); 
		INST(0x16,"ASL",  MODES.M_ZPX, (op)=>{ set_zpx(IP, op << 1);} ); 
		INST(0x18,"CLC",  MODES.M_IMP, (op)=>{ clear_flag(FLAGS_C)} ); 
		INST(0x19,"ORA",  MODES.M_ABSY,(op)=>{ A |= op; flag_update(A);} ); 
		INST(0x1d,"ORA",  MODES.M_ABSX,(op)=>{ A |= op; flag_update(A);} ); 
		INST(0x1e,"ASL",  MODES.M_ABSX,(op)=>{ set_absx(IP, op << 1);} ); 

		INST(0x20,"JSR",  MODES.M_ABS, (op)=>{ push_word(IP); IP = get_word(IP) - 2; } ); 		
		INST(0x21,"AND",  MODES.M_XIND,(op)=>{ A &= op; flag_update(A); }); 
		INST(0x24,"BIT",  MODES.M_ZP,  (op)=>{ check_flag(op&0x80, FLAGS_N); check_flag(op&0x40, FLAGS_V); check_flag(op & A, FLAGS_Z);  } ); 
		INST(0x25,"AND",  MODES.M_ZP,  (op)=>{ A &= op; flag_update(A); } ); 
		INST(0x26,"ROL",  MODES.M_ZP,  (op)=>{ set_zp(op << 1);} ); 
		INST(0x28,"PLP",  MODES.M_IMP, (op)=>{ FLAGS = op; } ); 
		INST(0x29,"AND",  MODES.M_IMM, (op)=>{ A &= op; flag_update(A);}  ); 
		INST(0x2A,"ROL",  MODES.M_IMP, (op)=>{ A <<= 1;flag_update(A); } ); 
		INST(0x2C,"BIT",  MODES.M_ABS, (op)=>{ check_flag(op&0x80, FLAGS_N); check_flag(op&0x40, FLAGS_V); check_flag(op & A, FLAGS_Z); } ); 
		INST(0x2D,"AND",  MODES.M_ABS, (op)=>{ A &= op; flag_update(A);} ); 
		INST(0x2E,"ROL",  MODES.M_ABS, (op)=>{ set_abs(op << 1);} ); 
			
		INST(0x30,"BMI",  MODES.M_REL, (op)=>{ if (get_flag(FLAGS_N)) branch();} ); 
		INST(0x31,"AND",  MODES.M_INDY,(op)=>{ A &= op; flag_update(A);} ); 
		INST(0x35,"AND",  MODES.M_ZPX, (op)=>{ A &= op; flag_update(A);} ); 
		INST(0x36,"ROL",  MODES.M_ZPX, (op)=>{ set_zpx(op << 1); } ); 
		INST(0x38,"SEC",  MODES.M_IMP, (op)=>{ set_flag(FLAGS_C);} ); 
		INST(0x39,"AND",  MODES.M_ABSY,(op)=>{ A &= op;flag_update(A); } ); 
		INST(0x3D,"AND",  MODES.M_ABSX,(op)=>{ A &= op; flag_update(A);} ); 
		INST(0x3E,"ROL",  MODES.M_ABSX,(op)=>{ set_absx(op << 1); } ); 
		
		INST(0x40,"RTI",  MODES.M_IMP, (op)=>{ FLAGS = pop_byte(); IP = pop_word() + 2; } ); 
		INST(0x41,"EOR",  MODES.M_XIND,(op)=>{ A ^= op; flag_update(A);} ); 
		INST(0x45,"EOR",  MODES.M_ZP,  (op)=>{ A ^= op; flag_update(A);} ); 
		INST(0x46,"LSR",  MODES.M_ZP,  (op)=>{ set_zp(op >> 1);} ); 
		INST(0x48,"PHA",  MODES.M_IMP, (op)=>{ push_byte(A);} ); 
		INST(0x49,"EOR",  MODES.M_IMM, (op)=>{ A ^= op;flag_update(A); } ); 
		INST(0x4A,"LSR",  MODES.M_IMP, (op)=>{ A >>= 1; flag_update(A);} ); 
		INST(0x4C,"JMP",  MODES.M_ABS, (op)=>{ IP = get_word(IP) - 2;}); 
		INST(0x4D,"EOR",  MODES.M_ABS, (op)=>{ A ^= op;flag_update(A);} ); 
		INST(0x4E,"LSR",  MODES.M_ABS, (op)=>{ set_abs(op >> 1);} ); 
		
		INST(0x50,"BVC",  MODES.M_REL, (op)=>{ if (!get_flag(FLAGS_V)) branch();} ); 
		INST(0x51,"EOR",  MODES.M_INDY,(op)=>{ A ^= op; flag_update(A);} ); 
		INST(0x55,"EOR",  MODES.M_ZPX, (op)=>{ A ^= op; flag_update(A);} ); 
		INST(0x56,"LSR",  MODES.M_ZPX, (op)=>{ set_zpx(op >> 1);} ); 
		INST(0x58,"CLI",  MODES.M_IMP, (op)=>{ clear_flags(FLAGS_I);} ); 
		INST(0x59,"EOR",  MODES.M_ABSY,(op)=>{ A ^= op; flag_update(A);} ); 
		INST(0x5D,"EOR",  MODES.M_ABSX,(op)=>{ A ^= op; flag_update(A);} ); 
		INST(0x5E,"LSR",  MODES.M_ABSX,(op)=>{ set_absx(op >> 1);} ); 
		
		INST(0x60,"RTS",  MODES.M_IMP, (op)=>{ IP = pop_word() + 2; } ); 
		INST(0x61,"ADC",  MODES.M_XIND,(op)=>{ A += op; flag_update(A);} ); 
		INST(0x65,"ADC",  MODES.M_ZP,  (op)=>{ A += op; flag_update(A);} ); 
		INST(0x66,"ROR",  MODES.M_ZP,  (op)=>{ set_zp(op >> 1);} ); 
		INST(0x68,"PLA",  MODES.M_IMP, (op)=>{ A = pop_byte();} ); 
		INST(0x69,"ADC",  MODES.M_IMM, (op)=>{ A += op; flag_update(A);} ); 
		INST(0x6A,"ROR",  MODES.M_IMP, (op)=>{ A >>= 1; flag_update(A);} ); 
		INST(0x6C,"JMP",  MODES.M_IND, (op)=>{ IP = op;} ); 
		INST(0x6D,"ADC",  MODES.M_ABS, (op)=>{ A += op; flag_update(A);} ); 
		INST(0x6E,"ROR",  MODES.M_ABS, (op)=>{ set_abs(op >> 1);} ); 
		
		INST(0x70,"BVS",  MODES.M_REL, (op)=>{ if (get_flag(FLAGS_V)) branch();} ); 
		INST(0x71,"ADC",  MODES.M_INDY,(op)=>{ A += op; flag_update(A);} ); 
		INST(0x75,"ADC",  MODES.M_ZPX, (op)=>{ A += op; flag_update(A);} ); 
		INST(0x76,"ROR",  MODES.M_ZPX, (op)=>{ set_zpx(op >> 1); } ); 
		INST(0x78,"SEI",  MODES.M_IMP, (op)=>{ set_flag(FLAGS_I); } ); 
		INST(0x79,"ADC",  MODES.M_ABSY,(op)=>{ A += op; flag_update(A);} ); 
		INST(0x7D,"ADC",  MODES.M_ABSX,(op)=>{ A += op; flag_update(A);} ); 
		INST(0x7E,"ROR",  MODES.M_ABSX,(op)=>{ set_absx(op >> 1);} ); 

		INST(0x81,"STA",  MODES.M_XIND,(op)=>{ set_xind(A);} ); 
		INST(0x84,"STY",  MODES.M_ZP,  (op)=>{ set_zp(Y);} ); 
		INST(0x85,"STA",  MODES.M_ZP,  (op)=>{ set_zp(A); } ); 
		INST(0x86,"STX",  MODES.M_ZP,  (op)=>{ set_zp(X); } ); 
		INST(0x88,"DEY",  MODES.M_IMP, (op)=>{ Y--;} ); 
		INST(0x8A,"TXA",  MODES.M_IMP, (op)=>{ A = X; flag_update(A);} ); 
		INST(0x8C,"STY",  MODES.M_ABS, (op)=>{ set_abs(Y);} ); 
		INST(0x8D,"STA",  MODES.M_ABS, (op)=>{ set_abs(A);} );  
		INST(0x8E,"STX",  MODES.M_ABS, (op)=>{ set_abs(X);} ); 
		
		INST(0x90,"BCC",  MODES.M_REL, (op)=>{ if (!get_flag(FLAGS_C)) branch();} ); 
		INST(0x91,"STA",  MODES.M_INDY,(op)=>{ set_indy(A);} ); 
		INST(0x94,"STY",  MODES.M_ZPX, (op)=>{ set_zpx(Y);} ); 
		INST(0x95,"STA",  MODES.M_ZPX, (op)=>{ set_zpx(A);} ); 
		INST(0x96,"STX",  MODES.M_ZPY, (op)=>{ set_zpy(X);} ); 
		INST(0x98,"TYA",  MODES.M_IMP, (op)=>{ A = Y; flag_update(A);} ); 
		INST(0x99,"STA",  MODES.M_ABSY,(op)=>{ set_absy(A);} ); 
		INST(0x9A,"TXS",  MODES.M_IMP, (op)=>{ SP = X;} ); 
		INST(0x9D,"STA",  MODES.M_ABSX,(op)=>{ set_absx(A);} ); 
		
		INST(0xA0,"LDY",  MODES.M_IMM, (op)=>{ Y = op;} ); 
		INST(0xA1,"LDA",  MODES.M_XIND,(op)=>{ A = op; flag_update(A);} ); 
		INST(0xA2,"LDX",  MODES.M_IMM, (op)=>{ X = op; } ); 
		INST(0xA4,"LDY",  MODES.M_ZP,  (op)=>{ Y = op;} ); 
		INST(0xA5,"LDA",  MODES.M_ZP,  (op)=>{ A = op; flag_update(A);} ); 
		INST(0xA6,"LDX",  MODES.M_ZP,  (op)=>{ X = op;} ); 
		INST(0xA8,"TAY",  MODES.M_IMP, (op)=>{ Y = A; flag_update(A);} ); 
		INST(0xA9,"LDA",  MODES.M_IMM, (op)=>{ A = op; } ); 
		INST(0xAA,"TAX",  MODES.M_IMP, (op)=>{ X = A; flag_update(A);} ); 
		INST(0xAC,"LDY",  MODES.M_ABS, (op)=>{ Y = op;} ); 
		INST(0xAD,"LDA",  MODES.M_ABS, (op)=>{ A = op; flag_update(A);} ); 
		INST(0xAE,"LDX",  MODES.M_ABS, (op)=>{ X = op;} ); 
		
		INST(0xB0,"BCS",  MODES.M_REL, (op)=>{ if (get_flag(FLAGS_C)) branch();} ); 
		INST(0xB1,"LDA",  MODES.M_INDY,(op)=>{ A = op; flag_update(A);} ); 
		INST(0xB4,"LDY",  MODES.M_ZPX, (op)=>{ Y = op; flag_update(A);} ); 
		INST(0xB5,"LDA",  MODES.M_ZPX, (op)=>{ A = op; flag_update(A);} ); 
		INST(0xB6,"LDX",  MODES.M_ZPY, (op)=>{ A = op; flag_update(A);} ); 
		INST(0xB8,"CLV",  MODES.M_IMP, (op)=>{ clear_flags(FLAGS_V);} ); 
		INST(0xB9,"LDA",  MODES.M_ABSY,(op)=>{ A = op; flag_update(A);} ); 
		INST(0xBA,"TSX",  MODES.M_IMP, (op)=>{ X = SP; } ); 
		INST(0xBC,"LDY",  MODES.M_ABSX,(op)=>{ Y = op;} ); 
		INST(0xBD,"LDA",  MODES.M_ABSX,(op)=>{ A = op; flag_update(A);} ); 
		INST(0xBE,"LDX",  MODES.M_ABSY,(op)=>{ X = op;} ); 
		
		INST(0xC0,"CPY",  MODES.M_IMM, (op)=>{ flag_update(Y - op);} ); 
		INST(0xC1,"CMP",  MODES.M_XIND,(op)=>{ flag_update(A - op); } ); 
		INST(0xC4,"CPY",  MODES.M_ZP,  (op)=>{ flag_update(Y - op);} ); 
		INST(0xC5,"CMP",  MODES.M_ZP,  (op)=>{ flag_update(A - op);} ); 
		INST(0xC6,"DEC",  MODES.M_ZP,  (op)=>{ set_zp(op-1);} ); 
		INST(0xC8,"INY",  MODES.M_IMP, (op)=>{ Y = Y++;} ); 
		INST(0xC9,"CMP",  MODES.M_IMM, (op)=>{ flag_update(A - op); } ); 
		INST(0xCA,"DEX",  MODES.M_IMP, (op)=>{ X = X--; } ); 
		INST(0xCC,"CPY",  MODES.M_ABS, (op)=>{ flag_update(Y - op)} ); 
		INST(0xCD,"CMP",  MODES.M_ABS, (op)=>{ flag_update(A - op); } ); 
		INST(0xCE,"DEC",  MODES.M_ABS, (op)=>{ set_abs(op - 1); } ); 
		
		INST(0xD0,"BNE",  MODES.M_REL, (op)=>{ if (!get_flag(FLAGS_Z)) branch();} ); 
		INST(0xD1,"CMP",  MODES.M_INDY,(op)=>{ flag_update(A - op); } ); 
		INST(0xD5,"CMP",  MODES.M_ZPX, (op)=>{ flag_update(A - op); } ); 
		INST(0xD6,"DEC",  MODES.M_ZPX, (op)=>{ set_zpx(op - 1);} ); 
		INST(0xD8,"CLD",  MODES.M_IMP, (op)=>{ clear_flag(FLAGS_D);} ); 
		INST(0xD9,"CMP",  MODES.M_ABSY,(op)=>{ flag_update(A - op); } ); 
		INST(0xDD,"CMP",  MODES.M_ABSX,(op)=>{ flag_update(A - op); } ); 
		INST(0xDE,"DEC",  MODES.M_ABSX,(op)=>{ set_absx(op - 1);} ); 
		
		INST(0xE0,"CPX",  MODES.M_IMM, (op)=>{ flag_update(X - op);} ); 
		INST(0xE1,"SBC",  MODES.M_XIND,(op)=>{ A -= op; flag_update(A); } ); 
		INST(0xE4,"CPX",  MODES.M_ZP,  (op)=>{ flag_update(X - op);} ); 
		INST(0xE5,"SBC",  MODES.M_ZP,  (op)=>{ A -= op; flag_update(A);} ); 
		INST(0xE6,"INC",  MODES.M_ZP,  (op)=>{ set_zp(op+1);} ); 
		INST(0xE8,"INX",  MODES.M_IMP, (op)=>{ X = (X + 1) &0xff;} ); 
		INST(0xE9,"SBC",  MODES.M_IMM, (op)=>{ A -= op; flag_update(A);} ); 
		INST(0xEA,"NOP",  MODES.M_IMP, (op)=>{ } ); 
		INST(0xEC,"CPX",  MODES.M_ABS, (op)=>{ flag_update(X - op);} ); 
		INST(0xED,"SBC",  MODES.M_ABS, (op)=>{ A -= op; flag_update(A);} ); 
		INST(0xEE,"INC",  MODES.M_ABS, (op)=>{ set_abs(op+1);} ); 
		
		INST(0xF0,"BEQ",  MODES.M_REL, (op)=>{ if (get_flag(FLAGS_Z)) branch();} ); 
		INST(0xF1,"SBC",  MODES.M_INDY,(op)=>{ A -= op; flag_update(A);} ); 
		INST(0xF5,"SBC",  MODES.M_ZPX, (op)=>{ A -= op; flag_update(A);} ); 
		INST(0xFD,"INC",  MODES.M_ZPX, (op)=>{ set_zpx(op+1);} ); 
		INST(0xF8,"SED",  MODES.M_IMP, (op)=>{ set_flags(FLAGS_D); } ); 
		INST(0xF9,"SBC",  MODES.M_ABSY,(op)=>{ A -= op; flag_update(A);} ); 
		INST(0xFD,"SBC",  MODES.M_ABSX,(op)=>{ A -= op; flag_update(A);} ); 
		INST(0xFE,"INC",  MODES.M_ABSX,(op)=>{ set_absx(op+1);} ); 
		
		
		// Compute sizes
		for (var i in inst_table)
		{
			var s = 0;
			var m = inst_table[i].m;
			
			if (m == MODES.M_NONE) s = 0;
			if (m == MODES.M_IMP)  s = 0;
			if (m == MODES.M_ABS)  s = 2;
			if (m == MODES.M_ABSX) s = 2;
			if (m == MODES.M_ABSY) s = 2;
			if (m == MODES.M_IMM)  s = 1;
			if (m == MODES.M_IND)  s = 2;
			if (m == MODES.M_XIND) s = 1;
			if (m == MODES.M_INDY) s = 1;
			if (m == MODES.M_REL)  s = 1;
			if (m == MODES.M_ZP)   s = 1;
			if (m == MODES.M_ZPX)  s = 1;
			if (m == MODES.M_ZPY)  s = 1;
			
			inst_table[i].s = s;
		}

		main.log_console(`${MODULE}Loaded CPU6502 ${name}\n`);		
	}	
	

	
	function reset_flags()
	{
		//main.log_console(`${MODULE} Reset Flags\n`);
		
		//IP=start_addr;
		
		IP = memory.get_word(RESET_VECT);
		SP=0xff;
		A=0;
		X=0;
		Y=0;
		FLAGS = 0;   		// Flags register
		
		fb_update=0;		// Frame buffer update flag

	}
	
		
	// Display current stack
	function dump_stack()
	{
		main.log_console(`${MODULE} Stack:\n`);
		for (var i = 0; i < DUMP_STACK_SZ; i++)
			main.log_console(` [${i}] ${hex_byte(stack[i])}\n`);
		ip = IP_END;
	}
		
	// Disassemble single instruction
	function disassemble_inst(i, flags)
	{
		var out = "";
		
		out += `${MODULE} ${hex_word(i)} `; // Address

		var inst_byte = memory.get_byte(i);	// instruction
		
		//main.log_console.log("byte: " + inst_byte + " " + i);
		var inst = inst_table[inst_byte];
		
		if (inst === undefined)
		{
			out += `Inst not defined ${i} : ${inst_byte}\n`;
			//IP = END_IP;
			return;
		}
		
		// Inst name
		out += inst.text.padEnd(6) + "   ";

		//if (inst.s == 0) out += "      "; 
		//if (inst.s == 1) main.log_console(hex_byte(memory.get_byte(i+1)).padEnd(6)); 
		//if (inst.s == 2) main.log_console(hex_word(memory.get_word(i+1)).padEnd(6));
	
	
		var operand = "";
	
			// Decode address mode
		if (inst.m == MODES.M_IMP)  operand += ``;
		if (inst.m == MODES.M_ABS)  operand += `$${hex_word(memory.get_word(i+1))}`;
		if (inst.m == MODES.M_ABSX) operand += `$${hex_word(memory.get_word(i+1))},X`;
		if (inst.m == MODES.M_ABSY) operand += `$${hex_word(memory.get_word(i+1))},Y`;
		if (inst.m == MODES.M_IMM)  operand += `#$${hex_byte(memory.get_byte(i+1))}`;
		if (inst.m == MODES.M_IND)  operand += `($${hex_word(memory.get_word(i+1))})`;
		if (inst.m == MODES.M_XIND) operand += `($${hex_byte(memory.get_byte(i+1))},X)`;
		if (inst.m == MODES.M_INDY) operand += `($${hex_byte(memory.get_byte(i+1))}),Y`;
		if (inst.m == MODES.M_REL)  operand += `$${hex_word(i+(memory.get_byte(i+1)+2))}`;
		if (inst.m == MODES.M_ZP)   operand += `$${hex_byte(memory.get_byte(i+1))}`;
		if (inst.m == MODES.M_ZPX)  operand += `$${hex_byte(memory.get_byte(i+1))},X`;
		if (inst.m == MODES.M_ZPY)  operand += `$${hex_byte(memory.get_byte(i+1))},Y`;
	
	
		out += operand.padEnd(10);
	
		//operand = opera
	
		//main.log_console(out.padEnd(10));
	
	
		if (flags)
		{
			out += ` IP:${hex_word(IP)} `+
							`A:${hex_byte(A)} ` + 
							`X:${hex_byte(X)} ` + 
							`Y:${hex_byte(Y)} ` + 
							`SP:${hex_byte(SP)} ` + 							
							`Z:${(FLAGS&FLAGS_Z?1:0)} ` + 
							`N:${(FLAGS&FLAGS_N?1:0)} ` + 
							`L:${(state.l?1:0)} ` +
							`O:${(state.o?1:0)} `;
		}
	
		out += "\n";
		//main.log_console("\n");
		
		main.log_console(out);	
	}
		
		
	function get_word(a) { return memory.get_word(a); };			// Get word from memory
	function set_word(a, v) { return memory.set_word(a, v); };		// Set word in memory
	
	function get_byte(a) { return memory.get_byte(a); };			// Unsigned 
	function get_sbyte(a) { return memory.get_sbyte(a); };			// Signed
	function set_byte(a, v) { return memory.set_byte(a, v); };		// Set byte in memory
		
	function push_byte(v) { set_byte(0x100 + SP--, v); } 			// Push byte to stack
	function pop_byte() { return get_byte(0x100 + ++SP); }			// Pop byte from stack

	function push_word(v) { push_byte(v&0xff); push_byte(v>>8);  } 	// Push word to stack. Pushed as low byte, high byte
	function pop_word() { var v = pop_byte()<<8; v |= pop_byte(); return v; } // Pop word from stack. Popped as high byte, low byte
	
	
	function flag_update(t)
	{
		set_flag(t == 0, FLAGS_Z);		// Zero
		set_flag(t > 128, FLAGS_N);		// Neg
		set_flag(t > 255, FLAGS_V);		// Overflow
	}

	function get_flag(mask) { return FLAGS & mask; }
	
	function set_flag(mask)	{ FLAGS |= mask; }
	
	function clear_flag(mask) { FLAGS &= ~mask;	}
	
	function check_flag(cond, mask)
	{
		if (cond) set_flag(mask); else clear_flag(mask);
	}
	
	function branch()
	{
		IP = (get_sbyte(IP) + IP) & 0xffff;
	}
	
	
	// Load inst slot
	function INST(op, text, mode, func){ inst_table[op] = {text:text, m:mode, f:func}; };
	
	// Operand processing
	
	
	/*function get_abs()  { return get_byte(get_word(IP)); }
	function get_absx() { return get_byte((get_word(IP)+X) & 0xffff);	}	
	function get_absy() { return get_byte((get_word(IP)+Y) & 0xffff); }	
	function get_imm()  { return get_byte(IP); }	
	function get_ind()  { return get_word(get_word(IP)); }	
	function get_xind() { return get_word(get_word((IP+X)&0xffff)); }	
	function get_indy() { return get_word((get_word(IP)+Y)&0xffff); }		
	function get_rel()  { return IP + get_sbyte(IP) }		
	function get_zp()   { return get_byte(IP) }		
	function get_zpx()  { return get_byte((IP+X) & 0xff) }		
	function get_zpy()  { return get_byte((IP+Y) & 0xff) }	*/	
	
	
	function set_abs(v)  {  memory.set_byte(get_word(IP), v);}
	function set_absx(v) {  memory.set_byte((get_word(IP)+X) & 0xffff,v); }	
	function set_absy(v) {  memory.set_byte((get_word(IP)+Y) & 0xffff,v); }	
	function set_imm(v)  {  memory.set_byte(IP,v); }	
	function set_ind(v)  {  memory.set_word(get_word(IP)); }	
	function set_xind(v) {  memory.set_word(get_word((IP+X) & 0xffff),v); }	
	function set_indy(v) {  memory.set_word((get_word(IP)+Y) & 0xffff,v); }		
	//function set_rel(v)  {  IP + get_sbyte(IP,v) }		
	function set_zp(v)   {  memory.set_byte(get_byte(IP), v) }		
	function set_zpx(v)  {  memory.set_byte((get_byte(IP)+X) & 0xff, v) }		
	function set_zpy(v)  {  memory.set_byte((get_byte(IP)+Y) & 0xff, v) }	
	
		
	function get_operand(m)
	{
		if (m == MODES.M_IMP)  return 0;
		if (m == MODES.M_ABS)  return get_byte(get_word(IP)); 
		if (m == MODES.M_ABSX) return get_byte((get_word(IP)+X) & 0xffff);
		if (m == MODES.M_ABSY) return get_byte((get_word(IP)+Y) & 0xffff); 
		if (m == MODES.M_IMM)  return get_byte(IP);
		if (m == MODES.M_IND)  return get_word(get_word(IP));
		if (m == MODES.M_XIND) return get_byte((get_word(IP + X) & 0xffff));
		if (m == MODES.M_INDY) return get_byte((get_word(IP) + Y)& 0xffff);
		if (m == MODES.M_REL)  return (IP + get_sbyte(IP)) & 0xffff;
		if (m == MODES.M_ZP)   return get_byte(get_byte(IP));
		if (m == MODES.M_ZPX)  return get_byte((get_byte(IP) + X) &0xff);
		if (m == MODES.M_ZPY)  return get_byte((get_byte(IP) + Y) &0xff);
		
		main.log_console(`${MODULE} Unknown address mode for get operand\n`);
		running = 0;
		
		return 0;
	}
		
	function mode_text(m)
	{
		// Instruction modes
		if (m == MODES.M_ANY)  return ("ANY "); //
		if (m == MODES.M_NONE) return ("NONE"); // 
		if (m == MODES.M_IMP)  return ("IMP "); // 
		if (m == MODES.M_ABS)  return ("ABS "); // 
		if (m == MODES.M_ABSX) return ("ABSX"); // 
		if (m == MODES.M_ABSY) return ("ABSY"); // 
		if (m == MODES.M_IMM)  return ("IMM "); // 
		if (m == MODES.M_IND)  return ("IND "); //
		if (m == MODES.M_XIND) return ("XIND"); // 
		if (m == MODES.M_INDY) return ("INDY"); // 
		if (m == MODES.M_REL)  return ("REL "); // 
		if (m == MODES.M_ZP)   return ("ZP  "); // 
		if (m == MODES.M_ZPX)  return ("ZPX "); // 
		if (m == MODES.M_ZPY)  return ("ZPY "); // 
		return ("Unknown");
	}
	
	
	// Core Update
	function update(num_exec)
	{
		//main.log_console(`sp : ${hex_word(SP)} \n`);
		
		//main.log_console(debug);
		
		if (debug) num_exec = 1;
		
		if (!running) return;
		
		inst_updates = 0;

		next_interrupt();
		
		var r = step(num_exec); // Process a chunk
		
		// Deal with CPU6502 errors
		if (r > 0)						
		{
			if (r == ERROR_UI)
			{
				var a = IP-1;
				main.log_console(`${MODULE} ${name} Undefined inst at [${hex_word(a)}] = (${hex_byte(memory.get_byte(a))}) \n`);
				disassemble_inst(a, 1);
				running = 0;
				//ip = IP_END;
			}			
		}
		
		fb_update = 0;
		
		return inst_updates;
	}
	
	
	

	
	
	// Process num_exec number of instructions
	// Return error code or 0
	function step(num_exec)
	{
		var exec = 0; // Keep track of remaining
		
		//if (IP == END_IP) return;
		//var end =  Date.now() + MAX_TIME;
		
		// Loop until done, or SYNC or HALT
		while(((exec < num_exec) || (realtime && !debug)) && 
			  !fb_update && 
			  //IP != IP_END //&&
			  //Date.now() < end
			  exec < MAX_EXEC
			  )
			  
		//while(IP != IP_END && Date.now() < end)
		{
			
			if (debug) disassemble_inst(IP, 1);				// Dissassemble
			
			var inst = inst_table[memory.get_byte(IP++)];	// Get next inst
			
			if (inst.text == "") return(ERROR_UI);							// Catch undefined inst
						
						//console.log("c");
						//console.log(this);
			var operand = get_operand(inst.m);
						
			main.log_console("OP: " + hex_word(operand) + "\n");						
						
						
			//inst.f(memory, state);										// Execute
			inst.f(operand);

			if (DUMP_STACK) dump_stack();								// Display stack dump

			IP += inst.s;												// Consume operands, next ip
			exec++;
		}
		
		inst_updates += exec;
		
		return 0;
	}
	
	/* End of CPU6502 */
	
	return {configure:configure, 
			reset:reset, 
			update:update,
			set_option:set_option, 
			get_name:get_name, get_inst_table: get_inst_table, 
			get_addr_modes:get_addr_modes, mode_text:mode_text};
	
}

//window.CPU6502 = CPU6502;		// Export class to window context



