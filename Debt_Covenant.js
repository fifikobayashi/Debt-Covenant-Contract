// ============== Initialisation Parameters ====================
const { BITBOX } = require('bitbox-sdk');
const SLPSDK = require("../../slp-sdk/lib/SLP"); // amend depending on where your SLP SDK is stored
const { Contract, Sig, FailedRequireError } = require('cashscript');
const path = require('path');
const DEBTID = "ec10a63a4067dff85a8ba9256dd0c9a86f25f9a4191b7411a54f5c2fdfd19221";
const bchCollateralAddress = 'bchtest:qp4wds5xz0vlpga28u90cn8mnrhw2w8ljgh2q8asxr'; // address holding the BCH as collateral
const decodeTx = 'OP_RETURN 653 959632fd0e674a4158d17167b0963f586ec19ffcea204e030d1c1f6541c3348f'
const smartContractMnemonic = '';
var totalBCHLoan = 0.5; // total BCH as collateral for the loan
const network = 'testnet';
// =============================================================

// Initialise BITBOX based on chosen network
if (network === 'mainnet')
	bitbox = new BITBOX({ restURL: 'https://rest.bitcoin.com/v2/' })
else bitbox = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });

// instantiate the SLP SDK based on the chosen network
if (network === `mainnet`)
	SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` });

// Initialise HD node and CashScript contract's keypair
const rootSeed = bitbox.Mnemonic.toSeed(smartContractMnemonic);
const hdNode = bitbox.HDNode.fromSeed(rootSeed, network);
const collateralFund = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 0));

// Derive collateralFund's public key and public key hash
const collateralFundPk = bitbox.ECPair.toPublicKey(collateralFund);
const collateralFundPkh = bitbox.Crypto.hash160(collateralFundPk);

// Compile the P2PKH Cash Contract
const P2PKH = Contract.compile(path.join(__dirname, 'Debt_Covenant.cash'), network);

// Instantiate a new P2PKH contract with constructor arguments: { pkh: collateralFundPkh }
const instance = P2PKH.new(collateralFundPkh);
	
/*
 * Checks whether the Debt Covenant has been breached based on current price 
 */
checkDebtCovenant();
async function checkDebtCovenant() {

	// initialise distribution variables
	var totalDividends = 100; // e.g. 100% of debt obligation tokens
	var distributionRate = 0;

	// retrieves and decodes the debt obligation token ID permanently stored onchain via blockpress
	let memopress = require('memopress');
	var memo = memopress.decode(decodeTx).message;
	const onchainTokenId = memo.split('@').pop(); // removes the '@' and opcode from buffer

	// boolean outcome from cashscript method
	var validation = await validateTokenId(DEBTID, onchainTokenId);

	if (validation == true) { // if the debt obligation ID matches the onchain version

		//retrieve address details for crowdfund cash address
		var balance = await SLP.Address.details(bchCollateralAddress);

		// retrieve array of debt obligation token holders
		var debtObHolders = await SLP.Utils.balancesForToken(DEBTID); 
		const debtObAddrCount = debtObHolders.length;

		// calculate distribution of the airdrop token based on debt obligation token balances of each wallet
		distributionRate = totalBCHLoan / totalDividends;  

		// passes the array of token holders for BCH distribution
		sendBch(debtObHolders, distributionRate, debtObAddrCount);

	} else { // if the token ID did not match the onchain version
		
		console.log('Error: Token ID did not match onchain version');
	}
}


/*
 * Calls on the CashScript contract to validate the debt obligation ID being used 
 */
async function validateTokenId(localId, onchainId) {

	try {
		// Call the validateTokenId function in cashscript returns true if no error is caught
		// note the '.send()' is needed so that validation is carried out on the network, otherwise
		//		it is no different than a local client side validation.
		var tx = await instance.functions.validateTokenID(localId, onchainId).send(instance.address,1);
		return true;
	} catch (error) {
		if (error instanceof FailedRequireError) {
			// returns false if comparison fails
			console.log('Error: token ID mismatch');
			return false;
		} else {
			console.log('Error: ' + error);
			return false;
		}
	}
}

async function checkBchPrice() {
	
}

/*
 * Distribution of the BCH from the collateralFund address to 
 *  holders of the debt obligation token 
 */
async function sendBch(debtObHolders, distributionRate, debtObAddrCount) {

  try {
    
    // convert cash addresses into legacy addresses
    const SEND_ADDR_LEGACY = bitbox.Address.toLegacyAddress(bchCollateralAddress);
    
    // retrieve utxos of address
    const u = await bitbox.Address.utxo(bchCollateralAddress);
    const utxo = findBiggestUtxo(u.utxos);
    const originalAmount = utxo.satoshis; // original total sats in address
    const vout = utxo.vout;
    const txid = utxo.txid;
    
    // initiates TransactionBuilder on the selected network
    const transactionBuilder = new bitbox.TransactionBuilder(network);
    
    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = 300 * debtObAddrCount;
    console.log(`byteCount: ${byteCount}`);
    const satoshisPerByte = 1.2;
    const txFee = Math.floor(satoshisPerByte * byteCount);
    console.log(`txFee: ${txFee}`);
    
    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);
     
    var totalSatsForDistribution = 0; // tracks the total sats for distribution
    
    // iteration through array of token holders to send alloted BCH
	for (var i = 0; i < debtObAddrCount; i++) {
		var sendAmountBch = debtObHolders[i].tokenBalance * distributionRate; // calculate the correct BCH to send
		var sendAmountSat = Math.floor(bitbox.BitcoinCash.toSatoshi(sendAmountBch)); // convert from BCH to SATs
		var receiveAddress = SLP.Address.toCashAddress(debtObHolders[i].slpAddress);
		
		console.log('\nAdding output #: ' + (i+1) + ' of ' + debtObAddrCount + '\nSending ' 
		+ sendAmountBch + ' bch to ' + receiveAddress);

		// retrieve the corresponding cash address for each SLP address
		const RECV_ADDR_LEGACY = bitbox.Address.toLegacyAddress(receiveAddress);

		// keep track of total sats for this tx
		totalSatsForDistribution = totalSatsForDistribution + sendAmountSat;
		
		// add output w/ address and amount to send
		transactionBuilder.addOutput(receiveAddress, sendAmountSat);
		
	}

    // amount to send back to the sending address.
    // It's the original amount - 1.2 sat/byte for tx size
    const remainder = originalAmount - totalSatsForDistribution - txFee;
	
	// final output for the remainder sats to return to the sender
	transactionBuilder.addOutput(bchCollateralAddress, remainder); 

    // since satoshi's can't be fractional at time of code
    const satoshisToSend = Math.floor(totalSatsForDistribution - txFee);
	  
    // Generate a change address from a Mnemonic of a private key.
    const change = changeAddrFromMnemonic(smartContractMnemonic)

    // Generate a keypair from the change address.
    const keyPair = bitbox.HDNode.toKeyPair(change)

    // Sign the transaction with the HD node.
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // build tx
    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()

    // Broadcast transation to the network
    const txidStr = await bitbox.RawTransactions.sendRawTransaction([hex])
    console.log(`Transaction ID: ${txidStr}`)
         
  } catch (err) {
    console.log(`error: `, err)
  }
}
  
// *** Helpder functions imported from Bitbox SDK below ***

/*
 * Generate a change address from a Mnemonic of a private key.
 */
function changeAddrFromMnemonic(mnemonic, network) {
  const rootSeed = bitbox.Mnemonic.toSeed(mnemonic)
  const masterHDNode = bitbox.HDNode.fromSeed(rootSeed, network)
  const account = bitbox.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

  // derive the first external change address HDNode which is going to spend utxo
  const change = bitbox.HDNode.derivePath(account, "0/0")
  return change
}

/*
 * Get the balance in BCH of a BCH address.
 */
async function getBCHBalance(addr, verbose) {
  try {
    const bchBalance = await bitbox.Address.details(addr)

    if (verbose) console.log(bchBalance)

    return bchBalance.balance
  } catch (err) {
    console.error(`Error in getBCHBalance: `, err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

/*
 * Returns the utxo with the biggest balance from an array of utxos.
 */
function findBiggestUtxo(utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
  
  
module.exports = {
  checkDebtCovenant,
};
