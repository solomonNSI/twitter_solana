import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Twitter } from "../target/types/twitter";
import * as assert from "assert"
import * as bs58 from "bs58";

describe("twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Twitter as Program<Twitter>;

  it('can send a new tweet', async () => {
    // before sending the transaction to the blockchain
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet('crypto', 'GM GM GM GM GM GM', {
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    // Fetch the account details of the created tweet
    const tweetAcc = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(tweetAcc.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAcc.topic, 'crypto');
    assert.equal(tweetAcc.content, 'GM GM GM GM GM GM');
    assert.ok(tweetAcc.timestamp);
  });
  // after sending

  it('can send a new tweet without a topic', async () => {
    // before sending the transaction to the blockchain
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet('', 'GM GM GM GM GM GM', {
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    // Fetch the account details of the created tweet
    const tweetAcc = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(tweetAcc.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAcc.topic, '');
    assert.equal(tweetAcc.content, 'GM GM GM GM GM GM');
    assert.ok(tweetAcc.timestamp);
  });

  it('can send a new tweet from a diff author', async () => {
    // before sending the transaction to the blockchain
    const otherUser = anchor.web3.Keypair.generate();
    const signature = await program.provider.connection.requestAirdrop(otherUser.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature);
    
    const tweet = anchor.web3.Keypair.generate();
 
    await program.rpc.sendTweet('ay papi', 'GM GM GM GM GM GM', {
      accounts: {
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [otherUser, tweet],
    });

    // Fetch the account details of the created tweet
    const tweetAcc = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(tweetAcc.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweetAcc.topic, 'ay papi');
    assert.equal(tweetAcc.content, 'GM GM GM GM GM GM');
    assert.ok(tweetAcc.timestamp);
  });

  /* it('cannot provide a topic with more than 50 characters', async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const topicWith51Chars = 'x'.repeat(51);
      await program.rpc.sendTweet(topicWith51Chars, 'Hummus, am I right?', {
          accounts: {
              tweet: tweet.publicKey,
              author: program.provider.wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [tweet],
      });
    } catch (error) {
      assert.equal(error.msg, 'The provided topic should be 50 characters long maximum.');
      return;
    }
    assert.fail('The instruction should have failed with a 51-character topic.');
  });
 */
  it('can fetch all tweets', async () => {
    const tweetAccounts = await program.account.tweet.all();
    assert.equal(tweetAccounts.length, 3);
  });

  it('can filter tweets by author', async () => {
    const authorPublicKey = program.provider.wallet.publicKey
    const tweetAccounts = await program.account.tweet.all([
        {
            memcmp: {
                offset: 8, // Discriminator.
                bytes: authorPublicKey.toBase58(),
            }
        }
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => {
      return tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
    }))
  });

  it('can feilter tweets by topic', async () => {
    const topic = 'crypto';
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 52,
          bytes: bs58.encode(Buffer.from(topic)),
        }
      }
    ]);

    assert.equal(tweetAccounts.length, 1);
    assert.ok(tweetAccounts.every(tweetAccounts => {
      return tweetAccounts.account.topic === 'crypto'
    }));
  });


});
