// test/DexTwo.test.js

// load dependencies
const { expect } = require('chai');

// import utils from test helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

// load compiled artifacts
const SwappableToken = artifacts.require('SwappableToken');
const DexTwo         = artifacts.require('DexTwo');
const DexTwoAttack   = artifacts.require('DexTwoAttack');

// start test block
contract('DexTwo', function ([ owner, other ]) {
  const initialSupply    = BN('1000');
  const initialDexAlloc  = BN('100');
  const initialUserAlloc = BN('10');

  beforeEach(async function () {
    this.vulnContract   = await DexTwo.new({ from: owner });

    // verify Ownable set owner correctly
    expect(await this.vulnContract.owner()).to.equal(owner);

    this.attackContract = await DexTwoAttack.new(this.vulnContract.address, {from: other});

    this.token1         = await SwappableToken.new(this.vulnContract.address, "Token1", "T1", initialSupply, {from: owner });
    this.token2         = await SwappableToken.new(this.vulnContract.address, "Token2", "T2", initialSupply, {from: owner });

    this.vulnContract.setTokens(this.token1.address, this.token2.address);

    //transfer initial allocation of tokens to DEX & attack contract
    await this.token1.transfer(this.vulnContract.address, initialDexAlloc, { from: owner });
    await this.token2.transfer(this.vulnContract.address, initialDexAlloc, { from: owner });
    await this.token1.transfer(this.attackContract.address, initialUserAlloc, { from: owner });
    await this.token2.transfer(this.attackContract.address, initialUserAlloc, { from: owner });

    // verify initial token balances
    expect(await this.token1.balanceOf(this.vulnContract.address)).to.be.bignumber.equal(initialDexAlloc);
    expect(await this.token2.balanceOf(this.vulnContract.address)).to.be.bignumber.equal(initialDexAlloc);
    expect(await this.token1.balanceOf(this.attackContract.address)).to.be.bignumber.equal(initialUserAlloc);
    expect(await this.token2.balanceOf(this.attackContract.address)).to.be.bignumber.equal(initialUserAlloc);

    // verify remaining owner token balances
    expect(await this.token1.balanceOf(owner)).to.be.bignumber.equal(BN(initialSupply-initialUserAlloc-initialDexAlloc));
    expect(await this.token2.balanceOf(owner)).to.be.bignumber.equal(BN(initialSupply-initialUserAlloc-initialDexAlloc));
  });

  it('test attack: drain both tokens from DexTwo', async function () {
    await this.attackContract.attack({from: other});

    // verify both dex tokens have been drained
    expect(await this.token1.balanceOf(this.vulnContract.address)).to.be.bignumber.equal(BN("0"));
    expect(await this.token2.balanceOf(this.vulnContract.address)).to.be.bignumber.equal(BN("0"));
  });
});
