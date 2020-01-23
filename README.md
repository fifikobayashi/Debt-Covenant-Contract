# Debt-Covenant-Contract

***Use Case***

In the TV Show 'Succession', the media and entertainment conglomerate Waystar Royco had a $2bn loan secured against the company's stock price. If their stock fell below $130USD per share they were effectively in breach of their debt covenant and their creditors were then able to legally pursue the repayment of the loan in full.

In this context of this example the loan is secured against a BCH holding as collateral. The debt is tokenised via SLP tokens and held by one or more creditors (SLP token holders). If the BCH USD price fell below the agreed floor price then creditors can trustlessly initiate the repayment process without the need for an intermediary.


***Contract Features***
1. Calls a CashScript contract to validate the Debt ID used against the official ID onchain
2. Uses Bitbox to retrieve and validate whether the BCH USD price has breached the convenant's floor price
3. If 1 and 2 are true, it proceeds to loop through creditors holding the loan's tokenised debt (SLP token holders)
4. It calculates repayment dividends based on token balances (i.e. share) 
5. It releases the BCH collateral by building a multi-output transaction and broadcasts to network 

***Getting Started***
1. [Install Bitbox SDK](https://developer.bitcoin.com/bitbox/docs/getting-started)
2. [Install SLP SDK](https://github.com/Bitcoin-com/slp-sdk)
3. [Install Cashscript SDK 0.3.1 or above](https://developer.bitcoin.com/cashscript/docs/getting-started)
4. [Install Memopress](https://developer.bitcoin.com/tutorials/memopress/)
5. Fund a BCH collateral cashaddress and set the initialisation parameters in Debt_Covenant.js
6. Clone the repo and run the client logic in Debt_Covenant.js
~~~
git clone https://github.com/fifikobayashi/Debt-Covenant-Contract
cd Debt-Covenant-Contract
node Debt_Covenant.js
~~~



![Sample covenant audit output](https://raw.githubusercontent.com/fifikobayashi/Debt-Covenant-Contract/master/debt%20covenant%20output.PNG)

Tx ID:
https://explorer.bitcoin.com/tbch/tx/0f1fd71186cb60a1270555c25a7bb243989e460323a5dc13ccec932562938435
