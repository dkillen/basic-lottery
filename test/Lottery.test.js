const assert = require("assert");
const { expect } = require("chai");
const ganache = require("ganache-cli");
const { it } = require("mocha");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require("../compile");

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: "1000000" });
});

describe("Lottery Contract", () => {
  it("deploys a contract", () => {
    assert.ok(lottery.options.address);
  });

  it("allows one account to enter", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("0.02", "ether"),
    });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    expect(accounts[0]).to.be.equal(players[0]);
    expect(players.length).to.be.equal(1);

    const contractBalance = await web3.eth.getBalance(lottery.options.address);
    expect(contractBalance).to.be.equal(web3.utils.toWei("0.02", "ether"));
  });

  it("allows multiple accounts to enter", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("0.02", "ether"),
    });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei("0.02", "ether"),
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    expect(players[0]).to.be.equal(accounts[0]);
    expect(players[1]).to.be.equal(accounts[1]);
    expect(players[2]).to.be.equal(accounts[2]);
    expect(players.length).to.be.equal(3);
  });

  it("requires a minimum amount of ether to enter", async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[1],
        value: 10,
      });
    } catch (err) {
      assert(true);
      return;
    }
    assert(false);
  });

  it("only the manager can pick a winner", async () => {
    const exceptionMessage =
      "VM Exception while processing transaction: revert";

    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });

    let error;
    try {
      await lottery.methods.pickWinner().send({ from: accounts[1] });
    } catch (err) {
      error = err.message;
    }
    expect(error).to.be.equal(exceptionMessage);
  });

  it("sends ether to the winner and resets the players array", async () => {
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei("2", "ether"),
    });

    // Test ether transferred to winning player
    const initialBalance = await web3.eth.getBalance(accounts[1]);
    await lottery.methods.pickWinner().send({ from: accounts[0] });
    const finalBalance = await web3.eth.getBalance(accounts[1]);
    const difference = finalBalance - initialBalance;
    expect(difference.toString()).to.be.equal(web3.utils.toWei("2", "ether"));

    // Test players array is now empty
    const players = await lottery.methods.getPlayers().call();
    expect(players.length).to.be.equal(0);

    // Test contract balance is now zero
    const contractBalance = await web3.eth.getBalance(lottery.options.address);
    expect(contractBalance).to.be.equal("0");
  });
});
