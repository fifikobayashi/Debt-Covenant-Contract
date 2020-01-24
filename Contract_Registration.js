const DebtID = '959632fd0e674a4158d17167b0963f586ec19ffcea204e030d1c1f6541c3348f'; //sample debt ID on testnet
let memopress = require('memopress');
const fs = require('fs');

registration();
async function registration() {

	registerContract();
	
	establishCollateral();
	
}

/*
 * This function posts the debt token ID onchain via memopress encode.
 * The .encode() call returns a transaction output and the TX ID is extracted
 * and stored. For the time being local storage is used to test the POC.
 */ 
function registerContract() {
	// stores the token ID onchain via blockpress
	var tx = memopress.encode('0x8d02', DebtID);
	  
	console.log('Encode Tx: ' + tx);
	
	// IMPORTANT: always typecast to string via 'hex' otherwise you'll get a capped buffer output
	fs.writeFile('encodetx.txt', tx.toString('hex').match(/../g).join(' '), (err) => { 
      
    // In case of a error throw err. 
    if (err) throw err; 
	}) 
}

/*
 * When CashScript browser support is available this function will facilitate the:
 * 	1. creation of the BCH collateral holding
 * 	2. transfer the collateral into the fund
 * 	3. ensure the covenant will always fail the require() condition in the contract
 *     until floor price has been breached
 */ 
function establishCollateral() {
	// awaiting CashScript browser support
}

module.exports = {
  registration,
};
