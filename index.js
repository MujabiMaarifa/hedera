const { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar, TransferTransaction } = require("@hashgraph/sdk");
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
	console.log("The new account balance is: " + accountBalance.hbars.toTinybars() + " tinybar .");
}

environmentSetup();

