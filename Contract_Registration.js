// Debt token creation parameters
const fundingAddress 			= '...' // SLP address funding the token creation
const FUNDMNEMONIC 				= '...'; // mnemonic of he address funding the token creation
const fundingWif 				= '...' // WIF of the address funding token creation in compressed WIF format
const tokenReceiverAddress 		= '...' // SLP address
const batonReceiverAddress 		= '...' // SLP address
const bchChangeReceiverAddress 	= '...' // CASH address
const TOKENNAME 				= '...'; // e.g. 'DebtToken'
const SYMBOL 					= '...'; // e.g. DET
const QUANTITY 					= 100; // initial supply
      
// Registration parameters
const DebtID = '959632fd0e674a4158d17167b0963f586ec19ffcea204e030d1c1f6541c3348f'; //debt token ID from createToken()
const NETWORK = `testnet`

// Used for debugging and investigating JS objects.
const util = require("util")
util.inspect.defaultOptions = { depth: 1 }

// Instantiate SLP based on the network.
const SLPSDK = require("../../slp-sdk/lib/SLP")
let SLP
if (NETWORK === `mainnet`)
  SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` })

/*
	This class creates the SLP debt token, distributes it to the creditors, posts the debt token ID
	onchain and sets up the BCH collateral fund for management in Debt_Covenant.js.
 */ 
registration();
async function registration() {

	createToken();
	
	registerContract();
	
	establishCollateral();
		
}

/*
  This function posts the debt token ID onchain via memopress encode.
  The .encode() call returns a transaction output and the TX ID is extracted
  and stored. For the time being local storage is used to test the POC.
 */ 
function registerContract() {
	// stores the token ID onchain via blockpress
	let memopress = require('memopress');
	var tx = memopress.encode('0x8d02', DebtID);
	  
	console.log('Encode Tx: ' + tx);
		
	// IMPORTANT: always typecast to string via 'hex' otherwise you'll get a capped buffer output
	const fs = require('fs');
	fs.writeFile('encodetx.txt', tx.toString('hex').match(/../g).join(' '), (err) => { 
      
    // In case of a error throw err. 
    if (err) throw err; 
	}) 
}

/*
  When CashScript browser support is available this function will facilitate the:
  	1. creation of the BCH collateral holding
  	2. transfer the collateral into the fund
  	3. ensure the covenant will always fail the require() condition in the contract
    until floor price has been breached
 */ 
function establishCollateral() {
	// awaiting CashScript browser support
}

/*
  Create SLP token function taken from the SLP SDK. 
  Requires that wallet to have a small BCH balance.
*/
async function createToken() {
  try {

		// root seed buffer
		const rootSeed = SLP.Mnemonic.toSeed(FUNDMNEMONIC)
		// master HDNode
		let masterHDNode
		if (NETWORK === `mainnet`) masterHDNode = SLP.HDNode.fromSeed(rootSeed)
			else masterHDNode = SLP.HDNode.fromSeed(rootSeed, "testnet") // Testnet

		// HDNode of BIP44 account
		const account = SLP.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

		const change = SLP.HDNode.derivePath(account, "0/0")

		// get the cash address
		const cashAddress = SLP.HDNode.toCashAddress(change)
		const slpAddress = SLP.Address.toSLPAddress(cashAddress)

		// Create a config object defining the token to be created.
	    const createConfig = {
	      fundingAddress,
	      fundingWif,
	      tokenReceiverAddress,
	      batonReceiverAddress,
	      bchChangeReceiverAddress,
	      decimals: 4,
	      name: TOKENNAME,
	      symbol: SYMBOL,
	      documentUri: "developer.bitcoin.com",
	      documentHash: null,
	      initialTokenQty: QUANTITY
	    }
	
	    // Generate, sign, and broadcast a hex-encoded transaction for creating
	    // the new token.
	    const genesisTxId = await SLP.TokenType1.create(createConfig)
	
	    console.log(`genesisTxID: ${util.inspect(genesisTxId)}`)
	    console.log(
	      `The genesis TxID above is used to uniquely identify your new class of SLP token. Save it and keep it handy.`
	    )
	    console.log(` `)
	    console.log(`View this transaction on the block explorer:`)
	    if (NETWORK === `mainnet`)
	      console.log(`https://explorer.bitcoin.com/bch/tx/${genesisTxId}`);
	    else console.log(`https://explorer.bitcoin.com/tbch/tx/${genesisTxId}`);
	  } catch (err) {
	    console.error(`Error in createToken: `, err);
	    console.log(`Error message: ${err.message}`);
	  }
}

module.exports = {
  registration,
};
