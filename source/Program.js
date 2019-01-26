/*
	CPU
	2019 nulluser, teth

	User program
*/

"use strict";


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

	

	
	
// Generic FB test
// This one generally works
var fb_test = 
 `
 
 // Test frame buffer. Remove for game
 
			JSR	graphfill:
 
 lp:		
 			JSR	graphinc:
			JMP lp:
			

/* Test code */
graphfill:	LDA		#00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			
			SP		D000		//  pointer to frame buffer base
		
graphfill1:		
			RND
			LP
			INP
		
			LDA 	counter1:		// Increment counter low byte
			ADD 	#1
			STA 	counter1:
		
			CMP 	#00				// Rolled over?
			JNE 	graphfill1:
		
			LDA 	counter2: 		// High byte counter
			ADD 	#1
			STA 	counter2:
			CMP 	#10
			JL 		graphfill1:
	
			SYNC					// Sync framebuffer
			RET
			
			
/* Test code */
graphinc:	LDA		#00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			
			SP		D000		//  pointer to frame buffer base
		
graphinc1:		
			GP
			INC
			LP
			INP
		
			LDA 	counter1:		// Increment counter low byte
			ADD 	#1
			STA 	counter1:
		
			CMP 	#00				// Rolled over?
			JNE 	graphinc1:
		
			LDA 	counter2: 		// High byte counter
			ADD 	#1
			STA 	counter2:
			CMP 	#10
			JL 		graphinc1:
	
			SYNC					// Sync framebuffer
			RET
			
			
			
			
						
			
			
			
			
			
			
			
			

// Program data
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0

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
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0

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




// scroll vert
var vert_scroll = 
 `
 
 // Test frame buffer. Remove for game
 lp:		JSR	fire:
			JMP lp:
			

/* Test code */
fire:		LDA		00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			


		
		SP		D000		// Set pointer to frame buffer base
		
		
loop:		
			addp	40
			gp
			subp	40
			
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
	
	
	
	
	
	

			// Seed lower line

			SP		DFC0		// Set pointer to frame buffer base
			lda 	40
fire1:	


			PUSH
			RND
			LP
			INP
			POP
			
			DEC
			CMP		0


			JNE 	fire1:
			
	
	
	
	
	
	
	
	
			SYNC					// Sync framebuffer
			RET
			

// Program data
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0

`;
/* End of Program */
	





















// Fire
var fire = 
 `
 
 // Test frame buffer. Remove for game
 lp:		JSR	fire:
			JMP lp:
			

/* Test code */
fire:		LDA		00
			STA		counter1:	// Low byte
			STA		counter2:	// High byte
			


		
		SP		D000		// Set pointer to frame buffer base
		
		
loop:		
			lda 	0
			tax
			
			addp	40				
			gp						// Get pixel one row down
			
			shr 1
			addx
			subp	40

		
			gp						// Get pixel at current
			shr 1
			addx
			
			


			

			txa
			
			cmp 0
			JE	loop1:
			
			dec
			
			
loop1:
			
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
	
	
	
	
	
	

			// Seed lower line

			SP		DFC0		// Set pointer to frame buffer base
			lda 	40
fire1:	


			PUSH
			RND
			LP
			INP
			POP
			
			DEC
			CMP		0


			JNE 	fire1:
			
	
	
	
	
	
	
	
	
			SYNC					// Sync framebuffer
			RET
			

// Program data
					
counter1:	DB		0				// Counters for graphics test
counter2:	DB		0

`;
/* End of Program */
	



