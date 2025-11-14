const { Client,
	PrivateKey,
	AccountCreateTransaction,
	AccountBalanceQuery,
	Hbar, 
	TransferTransaction,
	TokenCreateTransaction,
	TokenType,
	TokenSupplyType,
	TokenAssociateTransaction,
} = require("@hashgraph/sdk");

require('dotenv').config();

async function environmentSetup() {
	const accountId = process.env.MY_ACCOUNT_ID;
	const privateKey = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY);
	
	const client = Client.forTestnet();

	client.setOperator(accountId, privateKey);

	client.setDefaultMaxTransactionFee(new Hbar(100));

	client.setMaxQueryPayment(new Hbar(50));

	if(!accountId || !privateKey) {
		throw new Error("Environment variable not available");
	}

	//create new keys
	const newAccountPrivateKey = PrivateKey.generateED25519();
	const newAccountPublicKey = newAccountPrivateKey.publicKey;

	//create the account - its either on the AccountCreateTransaction or on the Alias of the HBar
	const newAccount = await new AccountCreateTransaction()
		.setKey(newAccountPublicKey)
		.setInitialBalance(Hbar.fromTinybars(1000))
		.execute(client);
	//get the new account ID
	const getReceipt = await newAccount.getReceipt(client);
	const newAccountId = getReceipt.accountId;

	console.log("The new Account id is: " + newAccountId);

	//verify the new account balance
	const accountBalance = await new AccountBalanceQuery()
		.setAccountId(newAccountId)
		.execute(client);
	console.log("The new account balance is: " + accountBalance.hbars.toTinybars() + " tinybars.");

	//send some hbar, since we are transferring from the client to new account there is no need of signing the transactio
	const sendHbar = await new TransferTransaction()
		.addHbarTransfer(accountId, Hbar.fromTinybars(-1000))
		.addHbarTransfer(newAccountId, Hbar.fromTinybars(1000))
		.execute(client);
	
	//verify the transaction reached consensus
	const transactionReceipt = await sendHbar.getReceipt(client);
	console.log("The transfer transaction from my account to the new account is: " + transactionReceipt.status.toString());

	const supplyKey = PrivateKey.generate();

	//create tokens -- Tokens are assets and have the monetary value
	//fungible tokens -> they can be swapped, they have equal values and are identical
	let tokenCreate = await new TokenCreateTransaction()
		.setTokenName("Maarifa")
		.setTokenSymbol("Maa")
		.setTokenType(TokenType.FungibleCommon)
		.setDecimals(2)
		.setInitialSupply(10000)
		.setTreasuryAccountId(accountId)
		.setSupplyType(TokenSupplyType.Infinite)
		.setSupplyKey(supplyKey)
		.freezeWith(client);
	//sign with treasury key
	let tokenCreateSign = await tokenCreate.sign(privateKey);

	//submit the transaction
	let tokenCreateSubmit = await tokenCreateSign.execute(client);

	//get the transaction receipt
	let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

	//get the token id
	let tokenId = tokenCreateRx.tokenId;

	console.log(`- created token with id: ${tokenId} \n`);

	//create hedera token association transaction to send the nfts 
	const transactionAssociation = await new TokenAssociateTransaction()
		.setAccountId(newAccountId)
		.setTokenIds([tokenId])
		.freezeWith(client);
	
	//sign the transaction with the newly created account
	const signTx = await transactionAssociation.sign(newAccountPrivateKey);

	const txResponse = await signTx.execute(client);

	//get the associate receipt
	const associateReceipt = await txResponse.getReceipt(client);

	const associateStatus = await associateReceipt.status;

	console.log("The transaction associate status was: " + associateStatus);

	//set the balance check here initial account balance
	const transferTransaction = await new TransferTransaction()
		.addTokenTransfer(tokenId, accountId, -10)
		.addTokenTransfer(tokenId, newAccountId, 10)
		.freezeWith(client)

	const signTransferTx = await transferTransaction.sign(privateKey);

	const transferTxResponse = await signTransferTx.execute(client);

	const transferTxReceipt = await transferTxResponse.getReceipt(client);

	const transferTxStatus = await transferTxReceipt.status

	console.log("The transfer status is: " + transferTxStatus)

	//check the balance after transfer
}

environmentSetup();

