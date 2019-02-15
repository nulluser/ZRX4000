/*
	CPU6502
	2019 nulluser, teth
	
	CPU6502 Emulator
	
	Memory is shared between cores. Stack is local to core.
*/

"use strict";

// CPU6502
// Pass in name, Memory, start address
class CPU6502
{
	// Configure static members
	static configure()	
	{
		/* Static Members */
		CPU6502.MODULE = "[CPU6502]       ";
		
		CPU6502.MAX_EXEC = 100000;
		
		// Debugging
		CPU6502.DUMP_MEM = 0;				// Dump memory on load
		CPU6502.DUMP_MEM_SIZE = 0x100;		// Dump Size
		CPU6502.DUMP_STACK = 0;				// Displat stack during execution
		CPU6502.DUMP_STACK_SZ = 0x10;		// Number of stack elements to display

		
		CPU6502.ENABLE_INTERRUPT = 1;		// Enable interrupt
		
		// Config	
		//CPU6502.NUM_INST =  100000;		// Instructions per update
		
		//if (CPU6502.DEBUG) CPU6502.NUM_INST = 1;// Less instructions for debug
		
		CPU6502.STACK_SIZE = 32768;			// Stack space size
		
		CPU6502.VECBASE		= 0xffe0;		// Base for interrupt vector table. 16 vectors, 32 bytes.  
										// CPU6502 will get the address stored here, push ip, and jmp there
		
		
		CPU6502.OPTION_DEBUG = 1;		// Realtime. Process until SYNC instruction
		CPU6502.OPTION_REALTIME = 2;		// Realtime. Process until SYNC instruction
		
		// Errors
		CPU6502.ERROR_UI = 0x01;			// Unknown instruction

		// Instruction modes
		CPU6502.M_ANY  = 0xFF;				// Any mode mask for assembler
		CPU6502.M_NONE = 0x00;				// No Mode (test)
		CPU6502.M_IMP  = 0x01;				// Implied, no operand
		CPU6502.M_ABS  = 0x02;				// Absolute
		CPU6502.M_ABSX = 0x03;				// Absolute X
		CPU6502.M_ABSY = 0x04;				// Absolute Y
		CPU6502.M_IMM  = 0x05;				// Immediate
		CPU6502.M_IND  = 0x06;				// Indirect
		CPU6502.M_XIND = 0x07;				// X Indirect
		CPU6502.M_INDY = 0x08;				// Indirect Y
		CPU6502.M_REL  = 0x09;				// Relative
		CPU6502.M_ZP   = 0x0A;				// Zero Page
		CPU6502.M_ZPX  = 0x0B;				// Zero Page X
		CPU6502.M_ZPY  = 0x0C;				// Zero Page Y
		
		CPU6502.IP_END = -1;			
		
		CPU6502.inst_table = [];
		
		//	 Fill instruction table so there are no gaps		
		for (var i = 0; i < 256; i++) 
		{
			CPU6502.INST(i, "", CPU6502.M_NONE, null);
			CPU6502.inst_table[i].s = 0;
			
		}
		
		
		CPU6502.INST(0x00,"BRK",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x01,"ORA",  CPU6502.M_XIND, (m, io, s)=>{} ); 
		CPU6502.INST(0x02,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x03,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x04,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x05,"ORA",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x06,"ASL",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x07,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 		
		CPU6502.INST(0x08,"PHP",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x09,"ORA",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0x0a,"ASL",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x0b,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 		
		CPU6502.INST(0x0c,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 		
		CPU6502.INST(0x0d,"ORA",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x0e,"ASL",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x0f,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 		

		CPU6502.INST(0x10,"BPL",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0x11,"ORA",  CPU6502.M_INDY,(m, io, s)=>{} ); 
		CPU6502.INST(0x12,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x13,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x14,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x15,"ORA",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x16,"ASL",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x17,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 		
		CPU6502.INST(0x18,"CLC",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x19,"ORA",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0x1a,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x1b,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x1c,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 		
		CPU6502.INST(0x1d,"ORA",  CPU6502.M_ABSX, (m, io, s)=>{} ); 
		CPU6502.INST(0x1e,"ASL",  CPU6502.M_ABSX, (m, io, s)=>{} ); 
		CPU6502.INST(0x1f,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 

		CPU6502.INST(0x20,"JSR",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x21,"AND",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0x22,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x23,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x24,"BIT",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x25,"AND",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x26,"ROL",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x27,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x28,"PLP",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x29,"AND",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0x2A,"ROL",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x1B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x2C,"BIT",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x2D,"AND",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x2E,"ROL",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x2F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
			
		CPU6502.INST(0x30,"BMI",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0x31,"AND",  CPU6502.M_INDY, (m, io, s)=>{} ); 
		CPU6502.INST(0x32,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x33,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x34,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x35,"AND",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x36,"ROL",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x37,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x38,"SEC",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x39,"AND",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0x3A,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x3B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x3C,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x3D,"AND",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0x3E,"ROL",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0x3F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0x40,"RTI",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x41,"EOR",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0x42,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x43,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x44,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x45,"EOR",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x46,"LSR",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x47,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x48,"PHA",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x49,"EOR",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0x4A,"LSR",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x4B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x4C,"JMP",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x4D,"EOR",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x4E,"LSR",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x4F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0x50,"BVC",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0x51,"EOR",  CPU6502.M_INDY,(m, io, s)=>{} ); 
		CPU6502.INST(0x52,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x53,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x54,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x55,"EOR",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x56,"LSR",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x57,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x58,"CLI",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x59,"EOR",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0x5A,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x5B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x5C,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x5D,"EOR",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0x5E,"LSR",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0x5F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0x60,"RTS",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x61,"ADC",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0x62,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x63,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x64,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x65,"ADC",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x66,"ROR",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x67,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x68,"PLA",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x69,"ADC",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0x6A,"ROR",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x6B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x6C,"JMP",  CPU6502.M_IND, (m, io, s)=>{} ); 
		CPU6502.INST(0x6D,"ADC",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x6E,"ROR",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x6F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0x70,"BVS",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0x71,"ADC",  CPU6502.M_INDY,(m, io, s)=>{} ); 
		CPU6502.INST(0x72,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x73,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x74,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x75,"ADC",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x76,"ROR",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x77,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x78,"SEI",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x79,"ADC",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0x7A,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x7B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x7C,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x7D,"ADC",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0x7E,"ROR",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0x7F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 

		CPU6502.INST(0x80,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x81,"STA",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0x82,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x83,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x84,"STY",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x85,"STA",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x86,"STX",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0x87,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x88,"DEY",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x89,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x8A,"TXA",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x8B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x8C,"STY",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x8D,"STA",  CPU6502.M_ABS, (m, io, s)=>{} );  
		CPU6502.INST(0x8E,"STX",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0x8F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0x90,"BCC",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0x91,"STA",  CPU6502.M_INDY,(m, io, s)=>{} ); 
		CPU6502.INST(0x92,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x93,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x94,"STY",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x95,"STA",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0x96,"STX",  CPU6502.M_ZPY, (m, io, s)=>{} ); 
		CPU6502.INST(0x97,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x98,"TYA",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x99,"STA",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0x9A,"TXS",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0x9B,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x9C,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x9D,"STA",  CPU6502.M_ABSX, (m, io, s)=>{} ); 
		CPU6502.INST(0x9E,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0x9F,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0xA0,"LDY",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xA1,"LDA",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0xA2,"LDX",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xA3,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xA4,"LDY",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xA5,"LDA",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xA6,"LDX",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xA7,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xA8,"TAY",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xA9,"LDA",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xAA,"TAX",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xAB,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xAC,"LDY",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xAD,"LDA",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xAE,"LDX",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xAF,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0xB0,"BCS",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0xB1,"LDA",  CPU6502.M_INDY, (m, io, s)=>{} ); 
		CPU6502.INST(0xB2,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xB3,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xB4,"LDY",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0xB5,"LDA",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0xB6,"LDX",  CPU6502.M_ZPY, (m, io, s)=>{} ); 
		CPU6502.INST(0xB7,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xB8,"CLV",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xB9,"LDA",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0xBA,"TSX",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xBB,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xBC,"LDY",  CPU6502.M_ABSX, (m, io, s)=>{} ); 
		CPU6502.INST(0xBD,"LDA",  CPU6502.M_ABSX, (m, io, s)=>{} ); 
		CPU6502.INST(0xBE,"LDX",  CPU6502.M_ABSY, (m, io, s)=>{} ); 
		CPU6502.INST(0xBF,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0xC0,"CPY",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xC1,"CMP",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0xC2,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xC3,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xC4,"CPY",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xC5,"CMP",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xC6,"DEC",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xC7,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xC8,"INY",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xC9,"CMP",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xCA,"DEX",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xCB,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xCC,"CPY",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xCD,"CMP",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xCE,"DEC",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xCF,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0xD0,"BNE",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0xD1,"CMP",  CPU6502.M_INDY,(m, io, s)=>{} ); 
		CPU6502.INST(0xD2,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xD3,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xD4,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xD5,"CMP",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0xD6,"DEC",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0xD7,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xD8,"CLD",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xD9,"CMP",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0xDA,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xDB,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xDC,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xDD,"CMP",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0xDE,"DEC",  CPU6502.M_ABSX, (m, io, s)=>{} ); 
		CPU6502.INST(0xDF,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0xE0,"CPX",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xE1,"SBC",  CPU6502.M_XIND,(m, io, s)=>{} ); 
		CPU6502.INST(0xE2,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xE3,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xE4,"CPX",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xE5,"SBC",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xE6,"INC",  CPU6502.M_ZP,  (m, io, s)=>{} ); 
		CPU6502.INST(0xE7,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xE8,"INX",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xE9,"SBC",  CPU6502.M_IMM, (m, io, s)=>{} ); 
		CPU6502.INST(0xEA,"NOP",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xEB,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xEC,"CPX",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xED,"SBC",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xEE,"INC",  CPU6502.M_ABS, (m, io, s)=>{} ); 
		CPU6502.INST(0xEF,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		CPU6502.INST(0xF0,"BEQ",  CPU6502.M_REL, (m, io, s)=>{} ); 
		CPU6502.INST(0xF1,"SBC",  CPU6502.M_INDY,(m, io, s)=>{} ); 
		CPU6502.INST(0xF2,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xF3,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xF4,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xF5,"SBC",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0xFD,"INC",  CPU6502.M_ZPX, (m, io, s)=>{} ); 
		CPU6502.INST(0xFD,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xF8,"SED",  CPU6502.M_IMP, (m, io, s)=>{} ); 
		CPU6502.INST(0xF9,"SBC",  CPU6502.M_ABSY,(m, io, s)=>{} ); 
		CPU6502.INST(0xFA,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xFB,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xFC,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		CPU6502.INST(0xFD,"SBC",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0xFE,"INC",  CPU6502.M_ABSX,(m, io, s)=>{} ); 
		CPU6502.INST(0xFF,"",     CPU6502.M_NONE, (m, io, s)=>{} ); 
		
		
/*		
		
		
		//       OP   Text    Inst mode  Func Ptr
		CPU6502.INST(0x00,"NOP",  CPU6502.M_IMP, (m, io, s)=>{} ); 														// No Operation	
		CPU6502.INST(0x01,"JMP",  CPU6502.M_DIR, (m, io, s)=>{s.ip = m.get_word(s.ip) - 2;});							// Jump to location
		CPU6502.INST(0x02,"JSR",  CPU6502.M_DIR, (m, io, s)=>{CPU6502.push_word(s, s.ip+2); s.ip = m.get_word(s.ip) - 2;});	// Jump subroutine
		CPU6502.INST(0x03,"RET",  CPU6502.M_IMP, (m, io, s)=>{s.ip = CPU6502.pop_word(s); }); 								// Return
		CPU6502.INST(0x04,"IRET", CPU6502.M_IMP, (m, io, s)=>{s.ip = CPU6502.pop_word(s); }); 								// Return from interrupt
		CPU6502.INST(0x05,"JL",   CPU6502.M_DIR, (m, io, s)=>{if (s.l) s.ip = m.get_word(s.ip) - 2;}); 					// Jump if less
		CPU6502.INST(0x06,"JE",   CPU6502.M_DIR, (m, io, s)=>{if (s.e) s.ip = m.get_word(s.ip) - 2;}); 					// Jump Equal
		CPU6502.INST(0x07,"JNE",  CPU6502.M_DIR, (m, io, s)=>{if (!s.e)s.ip = m.get_word(s.ip) - 2;}); 					// Jump Not Equal
		CPU6502.INST(0x08,"JG",   CPU6502.M_DIR, (m, io, s)=>{if (s.g) s.ip = m.get_word(s.ip) - 2;}); 					// Jump greater
		
		CPU6502.INST(0x10,"LDA",  CPU6502.M_IMM, (m, io, s)=>{s.a = m.get_byte(s.ip);}); 								// Load A with constant
		CPU6502.INST(0x11,"LDA",  CPU6502.M_DIR, (m, io, s)=>{s.a = m.get_byte(m.get_word(s.ip));}); 					// Load A value from memory 
		CPU6502.INST(0x12,"LDX",  CPU6502.M_IMM, (m, io, s)=>{s.x = m.get_byte(s.ip);}); 								// Load X with constant
		CPU6502.INST(0x13,"LDY",  CPU6502.M_IMM, (m, io, s)=>{s.y = m.get_byte(s.ip);}); 								// Load Y with constant
		CPU6502.INST(0x14,"LDP",  CPU6502.M_DIR, (m, io, s)=>{s.p = m.get_word(m.get_word(s.ip));}); 					// Load P with value at memory location		
		
		CPU6502.INST(0x18,"STA",  CPU6502.M_DIR, (m, io, s)=>{m.set_byte(m.get_word(s.ip), s.a);}); 					// Store A at memory location
		CPU6502.INST(0x19,"STX",  CPU6502.M_DIR, (m, io, s)=>{m.set_byte(m.get_word(s.ip), s.x);}); 					// Store X at memory location
		CPU6502.INST(0x1A,"STY",  CPU6502.M_DIR, (m, io, s)=>{m.set_byte(m.get_word(s.ip), s.y);}); 					// Store Y at memory location
		CPU6502.INST(0x1B,"STP",  CPU6502.M_DIR, (m, io, s)=>{m.set_word(m.get_word(s.ip), s.p);}); 					// Store P at memory location
		
		CPU6502.INST(0x20,"TXA",  CPU6502.M_IMP, (m, io, s)=>{s.a = s.x;}); 											// Transfer X to A
		CPU6502.INST(0x21,"TAX",  CPU6502.M_IMP, (m, io, s)=>{s.x = s.a;}); 											// Transfer A to X
		CPU6502.INST(0x22,"TYA",  CPU6502.M_IMP, (m, io, s)=>{s.a = s.y;}); 											// Transfer Y to A
		CPU6502.INST(0x23,"TAY",  CPU6502.M_IMP, (m, io, s)=>{s.y = s.a;}); 											// Transfer A to Y
		CPU6502.INST(0x30,"SP",   CPU6502.M_DIR, (m, io, s)=>{s.p = m.get_word(s.ip)});						 			// Set pointer address
		CPU6502.INST(0x31,"LP",   CPU6502.M_IMP, (m, io, s)=>{m.set_byte(s.p, s.a);});						 			// Load A into memory at pointer
		CPU6502.INST(0x32,"GP",   CPU6502.M_IMP, (m, io, s)=>{s.a = m.get_byte(s.p);});						 			// Get value at pointer
		CPU6502.INST(0x33,"AP",   CPU6502.M_IMP, (m, io, s)=>{s.p+=s.a;}); 												// Add a to pointer
		CPU6502.INST(0x40,"PUSH", CPU6502.M_IMP, (m, io, s)=>{CPU6502.push_byte(s, s.a);}); 								// Push A into stack
		CPU6502.INST(0x41,"POP",  CPU6502.M_IMP, (m, io, s)=>{s.a = CPU6502.pop_byte(s);});									// Pop from stack into A
		CPU6502.INST(0x42,"PUSHP",CPU6502.M_IMP, (m, io, s)=>{CPU6502.push_word(s, s.p);});					 				// Push A into stack
		CPU6502.INST(0x43,"POPP", CPU6502.M_IMP, (m, io, s)=>{s.p = CPU6502.pop_word(s);});					 				// Pop from stack into A		
		CPU6502.INST(0x50,"CMP",  CPU6502.M_IMM, (m, io, s)=>{CPU6502.compare(s, s.a, m.get_byte(s.ip));}); 				// Compare with A
		CPU6502.INST(0x51,"CPX",  CPU6502.M_IMM, (m, io, s)=>{CPU6502.compare(s, s.x, m.get_byte(s.ip));}); 				// Compare with X
		CPU6502.INST(0x52,"CPY",  CPU6502.M_IMM, (m, io, s)=>{CPU6502.compare(s, s.y, m.get_byte(s.ip));}); 				// Compare with Y
		CPU6502.INST(0x60,"INC",  CPU6502.M_IMP, (m, io, s)=>{s.a = (s.a + 1) & 0xff;}); 								// Increment A
		CPU6502.INST(0x61,"DEC",  CPU6502.M_IMP, (m, io, s)=>{s.a = (s.a - 1) & 0xff;}); 								// Decrement A
		CPU6502.INST(0x62,"INX",  CPU6502.M_IMP, (m, io, s)=>{s.x = (s.x + 1) & 0xff;}); 								// Increment X
		CPU6502.INST(0x63,"DEX",  CPU6502.M_IMP, (m, io, s)=>{s.x = (s.x - 1) & 0xff;}); 								// Decrement X
		CPU6502.INST(0x64,"INY",  CPU6502.M_IMP, (m, io, s)=>{s.y = (s.y + 1) & 0xff;}); 								// Increment Y
		CPU6502.INST(0x65,"DEY",  CPU6502.M_IMP, (m, io, s)=>{s.y = (s.y - 1) & 0xff;}); 								// Decrement Y
		CPU6502.INST(0x66,"INP",  CPU6502.M_IMP, (m, io, s)=>{s.p = (s.p+1) & 0xffff;}); 								// Increment pointer
		CPU6502.INST(0x67,"DEP",  CPU6502.M_IMP, (m, io, s)=>{s.p = (s.p-1) & 0xffff;}); 								// Increment pointer		
		CPU6502.INST(0x70,"TSA",  CPU6502.M_IMP, (m, io, s)=>{s.a = (s.e << 3) | (s.l << 2) | (s.g << 1) | s.c;} ); // Transfer Status to A
		CPU6502.INST(0x71,"TAS",  CPU6502.M_IMP, (m, io, s)=>{s.e = s.a >> 3; s.l = (s.a >> 2) & 1; s.g = (s.a >> 1) & 1; s.c = s.a & 1; } ); // Transfer A to Status
		CPU6502.INST(0x72,"CLC",  CPU6502.M_IMP, (m, io, s)=>{s.c = 0;} );									 			// Clear Carry
		CPU6502.INST(0x73,"SET",  CPU6502.M_IMP, (m, io, s)=>{s.c = 1;} ); 												// Set Carry		
		CPU6502.INST(0x80,"OUT",  CPU6502.M_IMP, (m, io, s)=>{} );				 	// Output A to terminal
		CPU6502.INST(0x81,"IN",   CPU6502.M_IMP, (m, io, s)=>{} );				 			// Terminal to A
		CPU6502.INST(0x90,"AND",  CPU6502.M_IMM, (m, io, s)=>{s.a = s.a & m.get_byte(s.ip);}  ); 						// Set A to A & immediate
		CPU6502.INST(0x91,"OR",   CPU6502.M_IMM, (m, io, s)=>{s.a = s.a | m.get_byte(s.ip);}   ); 						// Set A to A | immediate
		CPU6502.INST(0x92,"XOR",  CPU6502.M_IMM, (m, io, s)=>{s.a = s.a ^ m.get_byte(s.ip);}  ); 						// Set A to A ^ immediate
		CPU6502.INST(0x93,"NOT",  CPU6502.M_IMM, (m, io, s)=>{s.a = ~s.a;}  ); 											// Set A to bitwise negation of A
		CPU6502.INST(0x94,"SHL",  CPU6502.M_IMM, (m, io, s)=>{s.a = s.a << m.get_byte(s.ip);}  ); 						// Shift A left by immediate bits
		CPU6502.INST(0x95,"SHR",  CPU6502.M_IMM, (m, io, s)=>{s.a = s.a >> m.get_byte(s.ip);}  ); 						// Shift A right by the immediate bits
		CPU6502.INST(0x96,"ADD",  CPU6502.M_IMM, (m, io, s)=>{var sm = s.a + m.get_byte(s.ip); s.a = sm & 0xff; s.c = sm &0x0100} ); // Set A to A + operand Z_256
		CPU6502.INST(0x97,"ADD",  CPU6502.M_DIR, (m, io, s)=>{var sm = s.a + m.get_byte(m.get_word(s.ip)); s.a = sm & 0xff; s.c = sm &0x0100} ); // Set A to A + mem
		CPU6502.INST(0x98,"ADDP", CPU6502.M_IMP, (m, io, s)=>{s.p = (s.p + s.a) & 0xffff;}); 							// Set P to P + A
		CPU6502.INST(0x99,"ADDX", CPU6502.M_IMP, (m, io, s)=>{s.x = (s.x + s.a) & 0xff;}); 								// Set A to A + X Z_256
		CPU6502.INST(0x9A,"SUB",  CPU6502.M_IMM, (m, io, s)=>{s.a = (s.a - m.get_byte(s.ip)) & 0xff;} ); 				// Set A to A + operand Z_256
		CPU6502.INST(0x9B,"SUBP", CPU6502.M_IMP, (m, io, s)=>{s.p = (s.p - s.a) & 0xffff;}); 							// Set Set P to P - A
		CPU6502.INST(0x9C,"MUL",  CPU6502.M_IMM, (m, io, s)=>{s.a = (s.a * m.get_byte(s.ip)) & 0xff;} ); 				// Set A to A * operand Z_256
		CPU6502.INST(0x9D,"DIV",  CPU6502.M_IMM, (m, io, s)=>{s.a = (s.a / m.get_byte(s.ip)) & 0xff;} ); 				// Set A to A / operand Z_256
		CPU6502.INST(0x9E,"NEG",  CPU6502.M_IMP, (m, io, s)=>{s.a = (255 - s.a) & 0xff;} ); 							// Set A to the additive inverse of A in Z_256
		CPU6502.INST(0xB0,"RND",  CPU6502.M_IMP, (m, io, s)=>{s.a = (Math.random() * 255) & 0xff;} ); 					// Random number
		CPU6502.INST(0xC0,"SYNC", CPU6502.M_IMP, (m, io, s)=>{s.fb_update=1;} ); 										// Render framebuffer
		CPU6502.INST(0xFF,"END",  CPU6502.M_IMP, (m, io, s)=>{s.ip = CPU6502.IP_END;}  );									// Halt
		
*/		
		
		// Compute sizes
		for (var i in CPU6502.inst_table)
		{
			var s = 0;
			var m = CPU6502.inst_table[i].m;
			
			if (m == CPU6502.M_NONE) s = 0;
			if (m == CPU6502.M_IMP)  s = 0;
			if (m == CPU6502.M_ABS)  s = 2;
			if (m == CPU6502.M_ABSX) s = 2;
			if (m == CPU6502.M_ABSY) s = 2;
			if (m == CPU6502.M_IMM)  s = 1;
			if (m == CPU6502.M_IND)  s = 2;
			if (m == CPU6502.M_XIND) s = 1;
			if (m == CPU6502.M_INDY) s = 1;
			if (m == CPU6502.M_REL)  s = 1;
			if (m == CPU6502.M_ZP)   s = 1;
			if (m == CPU6502.M_ZPX)  s = 1;
			if (m == CPU6502.M_ZPY)  s = 1;
			
			CPU6502.inst_table[i].s = s;
		}
		
		
		main.log_console(`${CPU6502.MODULE}Init\n`);
		
	}	
	
	
	// Instance Constructor
	constructor (name, memory, io, start_addr)
	{
		/* Variables */
		this.name = name;
		this.memory = memory;
		this.io = io;
		this.start_addr = start_addr;
		this.realtime = false;
		this.debug = false;
		
		// CPU6502 State
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
		
		this.interrupt_queue = [];	// List of pending interrupt sources
	
		// Monitoring
		this.inst_updates = 0;		// Instruction updates
		this.prog_loaded = false;	// True if loaded
		
		this.state.stack = new Uint8Array(CPU6502.STACK_SIZE);		// Get Stack
		
		this.prog_loaded = true;

		main.log_console(`${CPU6502.MODULE} Loaded CPU6502 ${name} at ${hex_word(start_addr)}\n`);
	}
	
	
	
	static set_option(cpu, option, state)
	{
		if (option == CPU6502.OPTION_REALTIME)
			CPU6502.realtime = state;
		
		if (option == CPU6502.OPTION_DEBUG)
			CPU6502.debug = state;
		
	}
	
	// External Interrupt
	interrupt(source)
	{
		
		main.log_console(`${CPU6502.MODULE} ${this.name} Interrupt ${hex_byte(source)}\n`);
		
		this.interrupt_queue.push(source);
	}
	
	// Process next pending
	next_interrupt()
	{
		if (this.interrupt_queue.length == 0) return;
		
		// Get next and remove from list
		var source = this.interrupt_queue[0];	// Get next
		this.interrupt_queue.splice(0, 1);		//  Remove from list
		
	
		// Just return if not enabled
		if (!CPU6502.ENABLE_INTERRUPT) return;
		
		main.log_console(`${CPU6502.MODULE} ${this.name} Process Interrupt ${hex_byte(source)}\n`);
	
		CPU6502.push_word(this.state, this.state.ip);

		var addr = this.memory.get_word(CPU6502.VECBASE + 2 * source);
		
		this.state.ip = this.memory.get_word(CPU6502.VECBASE + 2 * source);
		
		//main.log_console(`${CPU6502.MODULE} ${this.name} Jumping to ${hex_word(this.state.ip)}\n`);
		
		//this.memory.dump(CPU6502.VECBASE, 32);
		
	}
	
	
	reset(cpu)
	{
		this.reset_flags();
	}
	
	
	/* 
		Private
	*/						
	
	reset_flags()
	{
		this.state.ip=this.start_addr;
		this.state.sp=0;
		this.state.a=0;
		this.state.x=0;
		this.state.y=0;
		this.state.e=0;
		this.state.l=0;
		this.state.g=0;
		this.state.c=0;
		this.state.p=0;
		this.state.fb_udpate=0;
	}
	
		
	// Display current stack
	dump_stack()
	{
		main.log_console(`${CPU6502.MODULE} Stack:\n`);
		for (var i = 0; i < CPU6502.DUMP_STACK_SZ; i++)
			main.log_console(` [${i}] ${hex_byte(stack[i])}\n`);
		this.ip = this.IP_END;
	}
		
	// Disassemble single instruction
	disassemble_inst(i, flags)
	{
		main.log_console(`${CPU6502.MODULE} ${hex_word(i)} `); // Address

		var inst_byte = this.memory.get_byte(i);	// instruction
		
		//main.log_console.log("byte: " + inst_byte + " " + i);
		var inst = CPU6502.inst_table[inst_byte];
		
		if (inst === undefined)
		{
			main.log_console(`Inst not defined ${i} : ${inst_byte}\n`);
			this.state.ip = CPU6502.END_IP;
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
	static push_word(s, v)	{ CPU6502.push_byte(s, v&0xff); CPU6502.push_byte(s, v>>8); } 
	
	// Pop word from stack. Poped as high byte, low byte
	static pop_word(s, v)	{ var v = CPU6502.pop_byte(s,0)<<8; v |= CPU6502.pop_byte(s,0); return v; } 
	
	// Instruction Helper
	static compare(s, v1, v2) { s.e = v1 == v2; s.l = v1 < v2; s.g = v1 > v2; }
	
	// Load inst slot
	static INST(op, text, mode, func){ CPU6502.inst_table[op] = {text:text, m:mode, f:func}; };
	
	
	static MODE_TEXT(m)
	{
		// Instruction modes
		if (m == 0xff) return ("ANY"); 
		if (m == 0x00) return ("NONE");// 
		if (m == 0x01) return ("IMP"); // 
		if (m == 0x02) return ("ABS"); // 
		if (m == 0x03) return ("ABSX");// 
		if (m == 0x04) return ("ABSY");// 
		if (m == 0x05) return ("IMM"); // 
		if (m == 0x06) return ("IND"); //
		if (m == 0x07) return ("XIND");// 
		if (m == 0x08) return ("INDY");// 
		if (m == 0x09) return ("REL"); // 
		if (m == 0x0A) return ("ZP");  // 
		if (m == 0x0B) return ("ZPX"); // 
		if (m == 0x0C) return ("ZPY"); // 
		return ("Unknown");
		
	}
	
	
	// Core Update
	update(num_exec)
	{
		//main.log_console(`sp : ${hex_word(this.state.sp)} \n`);
		
		if (this.debug) num_exec = 1;
		
		if (!this.prog_loaded) return;
		
		this.inst_updates = 0;

		this.next_interrupt();
		
		var r = this.step(num_exec); // Process a chunk
		
		// Deal with CPU6502 errors
		if (r > 0)						
		{
			if (r == CPU6502.ERROR_UI)
			{
				var a = this.state.ip-1;
				main.log_console(`${CPU6502.MODULE} ${this.name} Undefined inst at [${hex_word(a)}] = (${hex_byte(this.memory.get_byte(a))}) \n`);
				this.disassemble_inst(a, 1);
				this.program_loaded = 0;
				this.ip = CPU6502.IP_END;
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
		
		if (this.state.ip == CPU6502.END_IP) return;
		
		
		//var end =  Date.now() + CPU6502.MAX_TIME;
		
		// Loop until done, or SYNC or HALT
		while(((exec < num_exec) || (this.realtime && !this.debug)) && 
			  !this.state.fb_update && 
			  this.state.ip != CPU6502.IP_END //&&
			  //Date.now() < end
			  && exec < CPU6502.MAX_EXEC
			  )
			  
		//while(this.state.ip != CPU6502.IP_END && Date.now() < end)
		{
			if (this.debug) this.disassemble_inst(this.state.ip, 1);				// Dissassemble
			
			var inst = CPU6502.inst_table[this.memory.get_byte(this.state.ip++)];	// Get next inst
			
			if (inst.text == "") return(CPU6502.ERROR_UI);							// Catch undefined inst
			
			//inst.f(this.memory, this.state);									// Execute
			inst.f.call(this, this.memory, this.io, this.state);

			if (CPU6502.DUMP_STACK) this.dump_stack();								// Display stack dump

			this.state.ip += inst.s;											// Consume operands, next ip
			exec++;
		}
		
		this.inst_updates += exec;
		
		return 0;
	}
	
	/* End of CPU6502 */
}
