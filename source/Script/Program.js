/*
	CPU
	2019 nulluser, teth

	User program
*/

"use strict";



var test = 

`

		.cpu	CPU6502
		.org	$7600


start

		ldx		#$00

loop

		lda		string,X

		cmp		#$00
		
		beq		start
		
		sta		$C000

		inx
		
		jmp		loop
		





		
string
		
		.byte "/---------------\"
		.byte $0d
		.byte "|  Hello 6502!  |"
		.byte $0d
		.byte "\---------------/"
		.byte $0d
		.byte $00
	
		.org	$FFFA                ; Address of reset vector
		.word	start               ; NMI
		.word	start               ; Reset vector
		.word	start               ; IRQ	
	

`;











// scroll vert
var gpu_test1 = 
 `
 
start:
		

loop:	
		lda		#01					// Clear color
		jsr 	gpu_clear:				// Clear

		jsr		move_poly:
		jsr 	draw_poly:			// Clear
		
		sync
		//end
		
		jmp		loop:

		
		
		
move_poly:
			// Move X1
			lda		p1x:
			sta		temp_v:
			lda		p1dx:
			sta		temp_dv:
			jsr		move_value:
			lda		temp_v:
			sta		p1x:
			lda		temp_dv:
			sta		p1dx:
			
			// Move Y1
			lda		p1y:
			sta		temp_v:
			lda		p1dy:
			sta		temp_dv:
			jsr		move_value:
			lda		temp_v:
			sta		p1y:
			lda		temp_dv:
			sta		p1dy:
			
			// Move X2
			lda		p2x:
			sta		temp_v:
			lda		p2dx:
			sta		temp_dv:
			jsr		move_value:
			lda		temp_v:
			sta		p2x:
			lda		temp_dv:
			sta		p2dx:
			
			// Move Y2
			lda		p2y:
			sta		temp_v:
			lda		p2dy:
			sta		temp_dv:
			jsr		move_value:
			lda		temp_v:
			sta		p2y:
			lda		temp_dv:
			sta		p2dy:
			
			// Move X3
			lda		p3x:
			sta		temp_v:
			lda		p3dx:
			sta		temp_dv:
			jsr		move_value:
			lda		temp_v:
			sta		p3x:
			lda		temp_dv:
			sta		p3dx:
			
			// Move Y3
			lda		p3y:
			sta		temp_v:
			lda		p3dy:
			sta		temp_dv:
			jsr		move_value:
			lda		temp_v:
			sta		p3y:
			lda		temp_dv:
			sta		p3dy:			
			
			ret
		
		
		
// value is on stack, dvalue is in A
move_value:


			rnd
			
			
			cmp #80

			lda #ff

			jl	mv1:
			
			lda #01

mv1:			

			sta  temp_dv:





			lda		temp_v:
			add		temp_dv:
			sta		temp_v:		

			
			
			
			cmp		#4
			jl		move_under:
			cmp	#3e
			jg		move_over:
			
			ret
			
			
			
			
move_under:
		lda	#04
		sta temp_v:
		lda	#01
		sta temp_dv:
		ret
			
			
move_over:
		lda	#3e
		sta temp_v:
		lda	#ff
		sta temp_dv:
		ret
			
			
			
			
			
			
			
			
			
			
move_value1:

			lda		temp_dv:
			neg
			sta		temp_dv:
			
			lda		temp_v:
			add		temp_dv:
			sta		temp_v:	
						
move_value2:

		
		ret
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
	
			
			
			
/* Draw the polygon  */
draw_poly:
			SP		B001			// cmd[1]
		
			lda		#90				// Draw polys
			lp
			inp

			lda		#0				// No op
			lp
			
			SP		B200			// Data[0]

			
			lda		#01		
			lp
			inp
			
			
			lda		color:				// Color
			lp
			inp
			
			lda		p1x:				// X1
			lp
			inp

			lda		p1y:				// Y1
			lp
			inp
			
			lda		p2x:				// X1
			lp
			inp

			lda		p2y:				// Y1
			lp
			inp

			lda		p3x:				// X1
			lp
			inp

			lda		p3y:				// Y1
			lp
			inp
			
			SP		B000			// Cmd[1]
			lda		#01				// Update
			lp
			
			ret			
			


			
/* Clear screen to color in A */			
gpu_clear:
			push
			SP		B001			// cmd[1]
			lda		#10				// Clear command
			lp						
			inp
			lda		#0				// No op
			lp
			inp
			
			SP		B100			// Data[0]
			pop						// Get color
			lp

			SP		B000			// Cmd[1]
			lda		#01				// Update
			lp
			
			ret
			
			
			
color:		DB		#32			
p1x:		DB 		#08
p1y:		DB 		#18
p1dx:		DB 		#01
p1dy:		DB 		#01

p2x:		DB 		#33
p2y:		DB 		#18
p2dx:		DB 		#01
p2dy:		DB 		#01

p3x:		DB 		#19
p3y:		DB 		#30			
p3dx:		DB 		#01
p3dy:		DB 		#01
			
temp_v:		DB		#00
temp_dv:	DB		#00
		
			
			
			
`;





// scroll vert
var gpu_test2 = 
 `
 
start:
		

loop:	
		//lda		#01					// Clear color
		//jsr 	gpu_clear:				// Clear
		
		//lda		#08					// NUmber of lines
		//jsr 	gpu_test_lines:			// Draw lines
			
		ldx		#01						// num poly list draw calls before sync
		
loop1:	
		
		txa
		push

		lda		#1				// Number of polys
		jsr 	gpu_test_polys:			// Clear
		
		pop
		tax

		dex
		cpx		#0
		jne		loop1:

		
		
		//sp		d720					// pixel to test buffer
		//lda		#03
		lp
		
		
		sync
		//end
		jmp 	loop:
 
 
/* Draw some Lines  */
gpu_test_lines:
			cmp #0					// Make sure we have some lines
			jne	lineck:
			ret
		
lineck:
			tax						// Save number of lines in A
			
			SP		B001			// cmd[1]
		
			lda		#80				// Draw lines
			lp
			inp

			lda		#0				// No op
			lp
			
			SP		B200			// Data[0]

			txa						// number of lines in a
			//lda		#01		
			lp
			inp

linelp:									// Draw lines
			
			//lda		#46				// Color
			rnd				
			lp
			inp
			
			//lda		#04				// X1
			rnd
			shr		#02
			lp
			inp

			//lda		#07				// Y1
			rnd
			shr		#02
			lp
			inp
			
			//lda		#14				// X2
			rnd
			shr		#02
			lp
			inp

			//lda		#17				// Y2
			rnd
			shr		#02
			lp
			inp			
			
			dex
			cpx 	#0
			jne 	linelp:
			
			SP		B000			// Cmd[1]
			lda		#01				// Update
			lp
			
			sync
			//end
			ret
			
			
			
			
/* Draw some Lines  */
gpu_test_polys:

			cmp		#0					// Make sure we have some polys
			jne		polyck:
			ret
		
polyck:
			tax						// Save number of polys in A
			
			SP		B001			// cmd[1]
		
			lda		#90				// Draw polys
			lp
			inp

			lda		#0				// No op
			lp
			
			SP		B200			// Data[0]

				
			txa						// number of polys in a
			
			//lda		#01		
			lp
			inp
			
			
			

polylp:									// Draw lines
 
			
			//lda		#46				// Color
			rnd				
			lp
			inp
			
			//lda		#04				// X1
			rnd
			shr		#02
			lp
			inp

			//lda		#07				// Y1
			rnd
			shr		#02
			lp
			inp
			
			//lda		#14				// X2
			rnd
			shr		#02
			lp
			inp

			//lda		#17				// Y2
			rnd
			shr		#02
			lp
			inp		

			//lda		#14				// X3
			rnd
			shr		#02
			lp
			inp

			//lda		#17				// Y3
			rnd
			shr		#02
			lp
			inp		
			
			
			dex
			cpx 	#0
			jne 	polylp:
			
			SP		B000			// Cmd[1]
			lda		#01				// Update
			lp
			
			//sync
			//end
			ret			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
/* Clear screen to color in A */			
gpu_clear:
			push
			SP		B001			// cmd[1]
			lda		#10				// Clear command
			lp						
			inp
			lda		#0				// No op
			lp
			inp
			
			SP		B100			// Data[0]
			pop						// Get color
			lp

			SP		B000			// Cmd[1]
			lda		#01				// Update
			lp
			
			ret
`;



// scroll vert
var OS = 
 `
 
start:		


		jsr 	keyboard_init:


			SP		start_str:
			JSR		print_str:
			
 
			sp		1000
 
			//jsr		dump_mem:


loop:
			
			jsr		get_cmd:
			
			jmp		loop:
 
 
			end
	

/* Get next console command */
get_cmd:
			lda		'>'
			jsr		putchar:
			//STA		c000
			//out
			lda		#20
			jsr		putchar:
			//STA		c000
			//out
			
			sp		cmd_str:
			ldx		#14				// max command
			
get_cmd1:							// Next char
			 
			 
			 jsr getchar:
			 //in
			//lda		c001
			//sta  c000
			
			//cmp #00
			//je get_cmd1:


			//in
			
			//cmp		#00
			//je		get_cmd1:		// No char in buffer
			
			lp						// Store in cmd string
			inp 
			
		
			dex
			cpx 	#0
			jne		get_cmd2:		// Too many chars?
			
			
			cmp		#0d
			je		get_cmd2:
			
			inx
			
			dep
			jmp		get_cmd1:
			
			
			
			
			

			
get_cmd2:
			jsr		putchar:
			//STA		c000
			//out

		
			cmp		#0d
			jne		get_cmd1:		// New line
		
			lda 	#0					// Term string
			lp
		
			sp		cmd_str_hdr:	// Cmd: header
			jsr	 	print_str:
		
			sp		cmd_str:		// Print cmd string
			jsr 	print_str:

			ret		
	
	
	
/* Dump memory starting in P */	
dump_mem:	

		
			ldy		#10
			
			


dump_mem1:	

			pushp				// Display address
			pop
			jsr 	print_h8:
			pop
			jsr 	print_h8:
			lda		#20				// Space
			jsr		putchar:
			//STA		c000
			//out
			lda		#20				// Space
			jsr		putchar:
			//STA		c000
			//out

			
			
			ldx		#10			// Dump line as hex
dump_mem2:
			gp
			inp
			jsr 	print_h8:
			lda		#20
			jsr		putchar:
			//STA		c000
			
			//out
			dex
			cpx 	#0
			jg		dump_mem2:

			lda		#20				// Space
			jsr		putchar:
			//STA		c000
			//out
			lda		#20				// Space
			jsr		putchar:
			//STA		c000
			//out

			
			
			lda		#10
			subp				// Back to start of line
			ldx		#10
dump_mem3:						// Dump line as ascii
			gp
			inp
			cmp 	#20				// Make sure printable
			jl		dump_mem4:
			cmp 	#80
			jg		dump_mem4:
			jsr		putchar:
			//STA		c000
			//out
			jmp 	dump_mem5:
			
dump_mem4:				
			lda 	#2e
			jsr		putchar:
			//STA		c000
			//out
			
dump_mem5:			
			dex						// Next byte
			cpx 	#0
			jg		dump_mem3:

			jsr		print_newline:
			
			dey						// Next line
			cpy 	#0
			jg		dump_mem1:

			ret

	
	
	
/*** Library ***/	
	
	
	keyboard_init:

			
			SP			keyboard_isr:	// Get address of keyboard isr
			PUSHP						// Pushed as low byte  high byte	
			SP			ffe2			// Address of interrupt vector 1
			pop							// Get High byte of address
			lp							// Store in vector table
			inp
			pop							// Get Low byte of address
			lp							// Storein vector table
			
			ret



/* Deal with keyboard interrupt */		
keyboard_isr:		
			//LDA			#01
			//STA			key_change:

			//JSR			check_keys:


//			END
			

			iret
			

			
getchar:
			LDA		c001
			cmp #00
			je		getchar:
			ret
			

putchar:
			STA		c000
			
			ret		
			
			
			
	
/* Print newline */
print_newline:
			push
			lda		#0a
			jsr		putchar:
			//out
			pop
			ret
	
/* Print 4 bit hex char */
print_h4:	and 	#0f
			cmp		#0a
			jl		print_h4_1:
			add		#07
print_h4_1:	add		#30
			jsr		putchar:
			//out
			ret
	
/* Print 4 bit hex char */
print_h8:	push
			shr		#04
			jsr		print_h4:
			pop
			jsr		print_h4:
			ret
			
// Prints string that P points to		
print_str:	GP
			CMP		#00
			JE		print_str1:
		
			//LDA   #45
			jsr		putchar:
			
			//OUT
			INP
			JMP		print_str:
		
print_str1:		
			RET
			

// Program data
					
cmd_str:	DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			DB		#0
			
			
cmd_str_hdr: 
			DB		'C'
			DB		'm'
			DB		'd'
			DB		':'
			DB		#20
			
			DB		#0

					
					
					
counter1:	DB		#00				// Counters for graphics test
counter2:	DB		#00

start_str:							// Startup String
			DB		'R'
			DB		'O'
			DB		'M'
			DB		#20
			DB		'M'
			DB		'O'
			DB		'N'
			DB		#20
			DB		'v'
			DB		'l'
			DB		'.'
			DB		'0'
			DB		#0a
			DB		#0

`;
/* End of Program */
	


























// Generic FB test
// This one generally works
var fb_gametest = 
 `

/*****************************/			
/**                         **/
/** Simple Game Engine Test **/
/**                         **/
/*****************************/
			

/*************/			
/* Main Loop */
/*************/


start:
			JSR			keyboard_init:






mainloop:	
			JSR			check_keys:		// Deal with key presses
			JSR			clear_screen:	// Clear the screen
			JSR			draw_player:	// Draw
			
			SYNC						// Sync framebuffer
			
			NOP
			JMP			mainloop:

/********************/			
/* End of Main Loop */
/********************/

			

/************/			
/* Keyboard */
/************/


/* Install keyboard interrupt handler */
keyboard_init:

			
			SP			keyboard_isr:	// Get address of keyboard isr
			PUSHP						// Pushed as low byte  high byte	
			SP			ffe2			// Address of interrupt vector 1
			pop							// Get High byte of address
			lp							// Store in vector table
			inp
			pop							// Get Low byte of address
			lp							// Storein vector table
			
			ret



/* Deal with keyboard interrupt */		
keyboard_isr:		
			LDA			#01
			STA			key_change:

			JSR			check_keys:


//			END
			

			iret


			
			
check_keys:	

			LDA 		'a'
			JSR 		checkkey:
			CMP			#00
			JE			keyloop1:

			lda #45
			out 
			
			JSR 		p1_move_left:

// Check for 'd' pressed
keyloop1:	LDA 		'd'
			JSR			checkkey:				
			CMP 		#00
			JE			keyloop2:
			JSR 		p1_move_right:

// Check for 'w' pressed
keyloop2:	LDA 		'w'
			JSR			checkkey:				
			CMP 		#00
			JE			keyloop3:
			JSR 		p1_move_up:

// Check for 'd' pressed
keyloop3:	LDA 		's'
			JSR			checkkey:				
			CMP 		#00
			JE			keyloop4:
			JSR 		p1_move_down:
keyloop4:


			LDA			#00

			STA			key_change:

			ret			
			
			
				
// See if key is down
checkkey:	
			out


			SP			C100			// Set pointer to keyboard base	
			AP							// Advance into keyboard table
			GP							// Get value in table
			RET
		

/*******************/			
/* End of Keyboard */
/*******************/

	
			
			
/************/			
/* Movement */
/************/
			
			
p1_move_left:
			LDA			p1_pos_x:
			CMP			#0
			JNE			p1_move_left1:
			ret
		
p1_move_left1:
			DEC
			STA			p1_pos_x:
			ret			
			
p1_move_right: 			// TODO need to subtract image size
			LDA			p1_pos_x:
			CMP			#38
			JL			p1_move_right1:
			ret
		
p1_move_right1:
			INC
			STA			p1_pos_x:
			ret			
				
			
p1_move_up:
			LDA			p1_pos_y:
			CMP			#0
			JNE			p1_move_up1:
			ret
		
p1_move_up1:
			DEC
			STA			p1_pos_y:
			ret			
			
p1_move_down:			// TODO need to subtract image size
			LDA			p1_pos_y:
			CMP			#37
			JL			p1_move_down1:
			ret
p1_move_down1:
			INC
			STA			p1_pos_y:
			ret			
				
/*******************/			
/* End of Movement */
/*******************/
			
			

/************/			
/* Graphics */
/************/
			

/* Draw Player */
draw_player:

			SP			shipimage:		// Get image pointer
			LDA			p1_pos_x:		// Get player pos
			TAX
			LDA			p1_pos_y:
			TAY
			jsr			draw_image:		// Draw the image

			ret

			
			
/* Draw Image */
// P points to start of image data 
//  X and Y define draw position
// C0 is transparent
draw_image:	STX			image_x:		// Store draw location
			STY			image_y:
			
			GP
			STA			image_sx:		// Store image x size
			INP

			GP
			STA			image_sy:		// Store image y size
			INP
			
			STP			image_p:		// Store image start location

			SP			D000			// Pointer to frame buffer base

			LDA			image_y:		// Advance to y pos
			CMP			#0
			JE			draw_image2:	// Do offset y if we are at zero already
			
			TAX
draw_image1:					
			LDA			#40				// Advance to y pos
			ADDP
			DEX
			CPX			#0
			JNE			draw_image1:
								
draw_image2:				
				
			LDA			image_x:		// Advance to x pos
			ADDP

			
			LDA			image_sx:		// Get sizes
			TAX
			LDA			image_sy:	
			TAY
			
draw_image3:
			
			PUSHP						// Save fb location
			LDP			image_p:		// Get current image pixel
			GP						
			INP							// Advance
			STP			image_p:
			POPP						// Restore fb location

			CMP			#C0				// Check for transparent
			JE			draw_image4:
			LP							// Draw pixel
			
draw_image4:			
			INP							// Next frame buffer location
				
			DEX							// x row counter
			CPX			#0
			
			JNE			draw_image3:	// Not done with row
			
			LDA			image_sx:		// Get size
			TAX
			SUBP						// Pull out what was just drawn
			LDA			#40				// Advance to next line
			ADDP	

			DEY	
			CPY			#0
			JNE			draw_image3:	// Draw next line
			
			RET
						
			
			
/* Clear Screen */
clear_screen:

			LDX			#40				// Size to clear
			LDY			#40
			SP			D000			//  pointer to frame buffer base
			
clear_screen1:					
			
			LDA			#01				// Clear color
			LP
			INP							// Next FB location
			DEX							// column counter
			CPX			#00
			JNE			clear_screen1:
			
			LDX			#40				// Row counter
			DEY
			CPY			#00
			JNE			clear_screen1:	
			RET
			
/*******************/		
/* End of Graphics */
/*******************/				
		



			
/*************/		
/* Game Data */
/*************/				

key_change: DB			#0				// True if key was changed

p1_pos_x:	DB			#08
p1_pos_y:	DB			#08
p1_size_x:	DB			#08
p1_size_y:	DB			#09

// Define an image, SX  SY
shipimage:	DB			#08 #09
			DB			#C0 #C0 #C0 #03 #03 #C0 #C0 #C0
			DB			#C0 #C0 #C0 #03 #03 #C0 #C0 #C0
			DB			#C0 #03 #03 #03 #03 #03 #03 #C0
			DB			#03 #03 #03 #03 #03 #03 #03 #03
			DB			#03 #03 #0C #0C #0C #0C #03 #03
			DB			#03 #03 #0C #0C #0C #0C #03 #03
			DB			#03 #03 #03 #0F #0F #03 #03 #03
			DB			#03 #03 #03 #03 #03 #03 #03 #03
			DB			#C0 #03 #03 #03 #03 #03 #03 #C0
		
/********************/		
/* End of Game Data */
/********************/				
		
		
		
		
/****************/		
/* Library Data */
/****************/				

image_x:	DB			#00				// Scratch pad for image drawing
image_y:	DB			#00
image_sx:	DB			#00				// Scratch pad for image drawing
image_sy:	DB			#00
image_p:	DB			#00	#00			// Current pointer image image		

/***********************/		
/* End of Library Data */
/***********************/				


			
`;
/* End of Program */





/* Multi core test */
var mc_test = 
 `
 // Test 
 
lp:		
			ldx			#f0
			ldy			#f0
			txa
			push

lp1:		dex
			cpx			#0
			jne 		lp1:
 
			pop						// Get x count
			tax
			push
		
			dey
			cpy			#0
			jne 		lp1:
		
			pop						// get stack straight
			SYNC
			JMP 		lp:

`



// scroll vert
var vert_scroll = 
 `
 /*  Vertical Scroll Test */
 
 
start:		SP		startstring:
			JSR		printstr:
 
 
 lp:		JSR			fire:
			JMP 		lp:
			
fire:		LDA			#00
			STA			counter1:	// Low byte
			STA			counter2:	// High byte
		
			SP			D000		// Set pointer to frame buffer base
		
loop:		lda			#40			// Get next row
			addp	
			gp
			
			push
			lda			#40
			subp
			pop
			LP						// Store in current
		
			INP
			
			LDA 		counter1:		// Increment counter low byte
			ADD 		#01
			STA 		counter1:
		
			CMP 		#40				// Rolled over?
			JL 			loop:
		

			LDA			#0
			STA			counter1:
			
			LDA 		counter2: 		// High byte counter
			ADD 		#01
			STA 		counter2:
			
			CMP 		#3F
			JL 			loop:
	
			// Seed lower line
			SP		DFC0		// Set pointer to frame buffer base
			lda 	#40
fire1:	
			PUSH
			RND
			LP
			INP
			POP
			
			DEC
			CMP		#00

			JNE 	fire1:

			SYNC					// Sync framebuffer
			RET
			
// Prints string that P points to		
printstr:	GP
			CMP		#00
			JE		printdone:
		
			OUT
			INP
			JMP		printstr:
		
printdone:		
			RET
			

// Program data
					
counter1:	DB		#00				// Counters for graphics test
counter2:	DB		#00

startstring:						// Startup String
			DB		'V'
			DB		'e'
			DB		'r'
			DB		't'
			DB		#20
			DB		'S'
			DB		'c'
			DB		'r'
			DB		'o'
			DB		'l'
			DB		'l'
			DB		#0a
			DB		#0

`;
/* End of Program */
	







































/******************************************************************************/
/******** FROM HERE DOWN OLD INSTRUCTIONS. NOT UPDATED. LEGACY ****************/
/******************************************************************************/





// Generic FB test
// This one generally works
var fb_filltest = 
 `
 
main:		JSR		graphfill:			// Fill screen with random
mainloop:	JSR		graphinc:			// Modify 
			JMP		mainloop:
			

/* Fill Graph with random */
graphfill:	SP		D000			//  pointer to frame buffer base
		
			LDX		#0
			LDY		#0
		
graphfill1:		
			RND						// Random fill
			LP
			INP
			
			INX 
			CPX 	#00				// Rolled over?
			JNE 	graphfill1:
			
			INY
			CPY 	#10
			JL 		graphfill1:		// Not done?
	
			SYNC					// Sync framebuffer
			RET
						
			
/* Increment values */
graphinc:	SP		D000			//  Pointer to frame buffer base
		
			LDX		#0
			LDY		#0
		
graphinc1:		
			GP
			INC
			LP
			INP
		
			INX
		
			CPX 	#00				// Rolled over?
			JNE 	graphinc1:
		
			INY
			CPY 	#10
			JL 		graphinc1:
	
			SYNC					// Sync framebuffer
			RET
			
			
`;
/* End of Program */
	










var game = 
 /*Start of program*/
 
 /*  Warning: Do not use keywords in comments. Parser is not good */

/*

*/

 `
 
 // Display Start Message
start:		SP		startstring:
			JSR		printstr:
			
			
// Core loop
mainloop:	JSR		checkkeys:
			JSR		draw:
			SYNC
			JMP		mainloop:

// Check for 'a' pressed			
checkkeys:	LDA 	'a'
			JSR 	checkkey:
			CMP		00
			JE		keyloop1:
			JSR 	keyp1left:

// Check for 'd' pressed
keyloop1:	LDA 	'd'
			JSR		checkkey:				
			CMP 	00
			JE		keyloop2:
			JSR 	keyp1right:

// Check for 'w' pressed
keyloop2:	LDA 	'w'
			JSR		checkkey:				
			CMP 	00
			JE		keyloop3:
			JSR 	keyp1up:

// Check for 'd' pressed
keyloop3:	LDA 	's'
			JSR		checkkey:				
			CMP 	00
			JE		keyloop4:
			JSR 	keyp1down:

// Check for '4' pressed			
keyloop4:	LDA 	'4'
			JSR 	checkkey:
			CMP		00
			JE		keyloop5:
			JSR 	keyp2left:			
			
// Check for '6' pressed			
keyloop5:	LDA 	'6'
			JSR 	checkkey:
			CMP		00
			JE		keyloop6:
			JSR 	keyp2right:
			
// Check for '8' pressed			
keyloop6:	LDA 	'8'
			JSR 	checkkey:
			CMP		00
			JE		keyloop7:
			JSR 	keyp2up:
			
// Check for '5' pressed			
keyloop7:	LDA 	'5'
			JSR 	checkkey:
			CMP		00
			JE		keyloop8:
			JSR 	keyp2down:
			
keyloop8:	RET	



// Deal with left key				
keyp1left:	// Range check
			LDM		p1posx:
			CMP		00
			JE		keyp1left1:
		
			// Erase old
			LDA		00
			JSR		drawp1:
	
			LDM		p1posx:
			SUB		01
			STA		p1posx:
keyp1left1:	ret		
			
			
// Deal with right key		
keyp1right:	// Range check
			LDM		p1posx:
			CMP		3f
			JE		keyp1right1:

			// Erase Old
			LDA		00
			JSR		drawp1:
	
			LDM		p1posx:
			ADD		01
			STA		p1posx:

keyp1right1:	RET	
		
		
// Deal with up key				
keyp1up:	// Range check
			LDM		p1posy:
			CMP		00
			JE		keyp1up1:
			
			// Erase old
			LDA		00
			JSR		drawp1:

			LDM		p1posy:
			SUB		01
			STA		p1posy:
		
keyp1up1:	RET		
		

// Deal with down key				
keyp1down:	// Range check
			LDM		p1posy:
			CMP		3f
			JE		keyp1down1:

			// Erase old
			LDA		00
			JSR		drawp1:

			LDM		p1posy:
			ADD		01
			STA		p1posy:
keyp1down1:	RET				
		
		
		
// Deal with p2 left key				
keyp2left:	// Range check
			LDM		p2posx:
			CMP		00
			JE		keyp2left1:
		
			// Erase old
			LDA		00
			JSR		drawp2:
	
			LDM		p2posx:
			SUB		01
			STA		p2posx:
keyp2left1:	RET			
		
		
	// Deal with right key		
keyp2right:	// Range check
			LDM		p2posx:
			CMP		3f
			JE		keyp2right1:

			// Erase Old
			LDA		00
			JSR		drawp2:
	
			LDM		p2posx:
			ADD		01
			STA		p2posx:

keyp2right1: RET
		
		
// Deal with up key				
keyp2up:	// Range check
			LDM		p2posy:
			CMP		00
			JE		keyp2up1:
			
			// Erase old
			LDA		00
			JSR		drawp2:

			LDM		p2posy:
			SUB		01
			STA		p2posy:
		
keyp2up1:	RET		
		

// Deal with down key				
keyp2down:	// Range check
			LDM		p2posy:
			CMP		3f
			JE		keyp2down1:

			// Erase old
			LDA		00
			JSR		drawp2:

			LDM		p2posy:
			ADD		1
			STA		p2posy:
keyp2down1:	RET				
		
		
// Draw player		
draw:
			// Draw p1 in whitish
			LDA		3e
			JSR		drawp1:
			LDA		1e
			JSR		drawp2:
			
			RET
		
		
// Draw player 1, color in A		
drawp1:		PUSH				// Save color

			SP		D000
			LDM		p1posx:
			AP					// x offset
			
			LDM		p1posy:
drawp11:						// Loop to addd y offset

			CMP		00
			
			JE		drawp12:
			SUB 	01			
			PUSH				// Save counter
			LDA		0x40		// addd columns
			AP
			POP					// Restore counter
			
			JMP		drawp11:	// Next column
			
drawp12:	POP					// Restore color
			LP
			RET		
		

		
// Draw player 2, color in A		
drawp2:		PUSH				// Save color
			SP		D000
			LDM		p2posx:
			AP					// x offset
		
			LDM		p2posy:
drawp21:						// Loop to addd y offset
			CMP		00
			
			JE		drawp22:
			SUB 	1			
			PUSH				// Save counter
			LDA		0x40		// addd columns
			AP
			POP					// Restore counter
			
			JMP		drawp21:	// Next column
			
drawp22:	POP					// Restore color
			LP
			RET				
		

		
		
		
		
// See if key is down
checkkey:	
			SP		C100		// Set pointer to keyboard base	
			AP

			GP
			CMP 	01			// See if pressed
		
			LDA		00			
			JNE 	checkkey1:
		
			LDA		01			// Set pressed
		
			// seek to key in A
checkkey1:
			RET
		
		
		
		

// Get first pressed key debounce
getkey:
			JSR 	getkeydown:		// Wait for key down
			CMP		0
			JNE 	getkey1:
			RET
			
getkey1:
			PUSH	
getkey2:
			JSR 	getkeydown:		// Wait for key up
		
			CMP		0
			JNE 	getkey2:
			POP
			RET
		
		
// Find first keypress and return in a
getkeydown:		
			SP		C100		// Set pointer to keyboard base	
			LDA		0			// Key counter
			PUSH	
getkeylp:
			GP
			CMP		00
			JNE		getkeydone:
			INP
			
			POP
			ADD		1
			PUSH
		
			CMP		FF
			JNE 	getkeylp:
		
			POP			// No key found
			LDA		0
			PUSH
		
getkeydone:
			POP			// Get counter  clean stack
			RET
	
		
		
		
		
// Prints string that P points to		
printstr:	GP
			CMP		00
			JE		printdone:
		
			OUT
			INP
			JMP		printstr:
		
printdone:		
			RET
		
		

/* Test code */
graphtest:	LDA		00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			
			SP		D000		// Set pointer to frame buffer base
		
loop:		RND
			LP
			INP
		
			LDM 	counter1:		// Increment counter low byte
			ADD 	1
			STA 	counter1:
		
			CMP 	00				// Rolled over?
			JNE 	loop:
		
			LDM 	counter2: 		// High byte counter
			ADD 	1
			STA 	counter2:
			CMP 	10
			JL 		loop:
	
			SYNC					// Sync framebuffer
			RET
			

// Program data
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0
							
p1posx:		DB		16				// Player 1 pos
p1posy:		DB		8

p2posx:		DB		16				// Player 2 pos
p2posy:		DB		36
					
					
					
startstring:						// Startup String
			DB		'P'
			DB		'o'
			DB		'n'
			DB		'g'
			DB		20
			DB		'V'
			DB		'1'
			DB		'.'
			DB		'0'
			DB		'0'
			DB		0a
			DB		0
	
`;
/* End of Program */

	

	
	

	
	
	
	
// Frame buffer test cpu 1	
var fb_test1 = 
 `
 
 // Test frame buffer. Remove for game
 lp:		JSR	graphtest:
			JMP lp:
			

/* Test code */
graphtest:	

			LDA		#00
			STA		counter1:	// Low byte
			
			
			LDA		#00
			STA		counter2:	// High byte
			
			SP		D000		// Set pointer to frame buffer base
		
loop:		
			RND
			
			
			LP
			INP
		
			LDM 	counter1:		// Increment counter low byte
			ADD 	#1
			STA 	counter1:
		
			CMP 	#00				// Rolled over?
			JNE 	loop:
		
			LDM 	counter2: 		// High byte counter
			ADD 	#1
			STA 	counter2:
			CMP 	#9
			JL 		loop:
	
			SYNC					// Sync framebuffer
			RET
			

// Program data
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0

`;
/* End of Program */
	
	
	
	
// Frame buffer test cpu 2	
var fb_test2 = 
 `
 
 // Test frame buffer. Remove for game
 lp:		JSR	graphtest:
			JMP lp:
			

/* Test code */
graphtest:	LDA		00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			
			SP		D800		// Set pointer to frame buffer base
		
loop:		
			RND
			

			LP
			INP
		
			LDM 	counter1:		// Increment counter low byte
			ADD 	1
			STA 	counter1:
		
			CMP 	00				// Rolled over?
			JNE 	loop:
		
			LDM 	counter2: 		// High byte counter
			ADD 	1
			STA 	counter2:
			CMP 	9
			JL 		loop:
	
			SYNC					// Sync framebuffer
			RET
			

// Program data
					
counter1:	DB		#00				// Counters for graphics test
counter2:	DB		#00

`;
/* End of Program */






// Generic testing
var inst_test = 
 `
  
 lp:		PUSH
			POP
			PUSH
			POP
			PUSH
			POP
			PUSH
			POP
			PUSH
			POP
			PUSH
			POP
			TAX
			TXA
 
 
 
			JMP lp:


`




















// Fire
var fire = 
 `
 
 // Test frame buffer. Remove for game
 lp:		JSR	fire:
			JMP lp:
			

/* Test code */
fire:		LDA		#00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			


		
		SP		D000		// Set pointer to frame buffer base
		
		
loop:		
			lda 	#0
			tax
			
			lda #40
			addp				
			gp						// Get pixel one row down
			
			shr #01
			addx
			lda		#40
			subp

		
			gp						// Get pixel at current
			shr #01
			addx
			
			


			

			txa
			
			cmp #0
			JE	loop1:
			
			dec
			
			
loop1:
			
			LP
			INP
			
			
			LDA 	counter1:		// Increment counter low byte
			ADD 	#1
			STA 	counter1:
		
			CMP 	#00				// Rolled over?
			JNE 	loop:
		
			LDA 	counter2: 		// High byte counter
			ADD 	#1
			STA 	counter2:
			CMP 	#10
			JL 		loop:
	
	
	
	
	
	

			// Seed lower line

			SP		DFC0		// Set pointer to frame buffer base
			lda 	#40
fire1:	


			PUSH
			RND
			LP
			INP
			POP
			
			DEC
			CMP		#0


			JNE 	fire1:
			
	
	
	
	
	
	
	
	
			SYNC					// Sync framebuffer
			RET
			

// Program data
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0

`;
/* End of Program */
	



