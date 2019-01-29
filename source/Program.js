/*
	CPU
	2019 nulluser, teth

	User program
*/

"use strict";



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
			//JSR			clear_screen:	// Clear the screen
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


			
			
check_keys:	LDA 		'a'
			JSR 		checkkey:
			CMP			#00
			JE			keyloop1:
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





/* Multo core test */
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
			

// Program data
					
counter1:	DB		#00				// Counters for graphics test
counter2:	DB		#00



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

			LDA		00
			STA		counter1:	// Low byte
			
			
			LDA		00
			STA		counter2:	// High byte
			
			SP		D000		// Set pointer to frame buffer base
		
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
	



