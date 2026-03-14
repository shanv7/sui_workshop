import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import keyPairJson from "../keypair.json" with { type: "json" };
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";

/**
 *
 * Global variables
 *
 * These variables are used throughout the exercise below.
 *
 */
const keypair = Ed25519Keypair.fromSecretKey(keyPairJson.privateKey);

const PACKAGE_ID = `0x9603a31f4b3f32843b819b8ed85a5dd3929bf1919c6693465ad7468f9788ef39`;
const VAULT_ID = `0x8d85d37761d2a4e391c1b547c033eb0e22eb5b825820cbcc0c386b8ecb22be33`;

const suiClient = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});

/**
 * Scavenger Hunt: Exercise 3
 *
 * In this exercise, you use Sui objects as inputs in a PTB to update the value of a shared object.
 *
 * When finished, run the following command in the scripts directory to test your solution:
 *
 * pnpm scavenger-hunt
 *
 * RESOURCES:
 * - https://sdk.mystenlabs.com/typescript/transaction-building/basics#transactions
 */
const main = async () => {
  /**
   * Task 1:
   *
   * Create a new Transaction instance from the @mysten/sui/transactions module.
   */
  const tx = new Transaction();

  /**
   * Fetch the vault's code from on-chain so we can set the key correctly.
   * Hint: https://suiscan.xyz/testnet/object/0x8d85d37761d2a4e391c1b547c033eb0e22eb5b825820cbcc0c386b8ecb22be33/fields
   */
  const { object: vaultObject } = await suiClient.getObject({
    objectId: VAULT_ID,
    include: { json: true },
  });
  const json = vaultObject.json as Record<string, unknown> | null;
  const codeValue =
    (json?.content as { fields?: Record<string, string | number> } | undefined)?.fields?.code ??
    (json?.fields as Record<string, string | number> | undefined)?.code ??
    json?.code;
  if (codeValue === undefined || codeValue === null) {
    throw new Error(
      "Could not read vault code from on-chain object. Check VAULT_ID and network.",
    );
  }
  const vaultCode = BigInt(codeValue);

  /**
   * Task 2:
   *
   * Create a new key using the `key::new` function.
   */
  const [key] = tx.moveCall({
    target: `${PACKAGE_ID}::key::new`,
  });

  /**
   * Task 3:
   *
   * Set the key code correctly using the `key::set_code` function.
   */
  tx.moveCall({
    target: `${PACKAGE_ID}::key::set_code`,
    arguments: [key, tx.pure.u64(vaultCode)],
  });

  /**
   * Task 4:
   *
   * Use the key to withdraw the `SUI` coin from the vault using the `vault::withdraw` function.
   */
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::vault::withdraw`,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [tx.object(VAULT_ID), key],
  });

  /**
   * Task 5:
   *
   * Transfer the `SUI` coin to your account.
   */
  const suiAddress = keypair.getPublicKey().toSuiAddress();
  tx.transferObjects([coin], suiAddress);

  /**
   * Task 6:
   *
   * Sign and execute the transaction using the SuiClient instance created above.
   *
   * Print the result to the console.
   *
   * Resources:
   * - Observing transaction results: https://sdk.mystenlabs.com/typescript/transaction-building/basics#observing-the-results-of-a-transaction
   */
  const result = await suiClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  console.log("Transaction result:", result);

  /**
   * Task 7: Run the script with the command below and ensure it works!
   *
   * pnpm scavenger-hunt
   *
   * Verify the transaction on the Sui Explorer: https://suiscan.xyz/testnet/home
   */
};

main();
