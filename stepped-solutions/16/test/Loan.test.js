const {
  BN,
  expectEvent,
  shouldFail,
  ether,
  send,
  constants,
  balance,
} = require('openzeppelin-test-helpers');

const Loan = artifacts.require('Loan');

contract('Loan', function([_, contractOwner, user]) {
  let loan;
  const fundAmount = ether(new BN(10));
  beforeEach(async function() {
    loan = await Loan.new(new BN(300), { from: contractOwner });
  });
  describe('#setInterestRate', function() {
    it('should set the rate correctly with the contractOwner', async function() {
      const amount = new BN(2).mul(new BN(10).pow(new BN(23)));
      const { logs } = await loan.setInterestRate(amount, {
        from: contractOwner,
      });
      expectEvent.inLogs(logs, 'InterestRate', { value: amount });
    });
    it('should revert with another user', function() {
      const amount = new BN(2).mul(new BN(10).pow(new BN(23)));
      shouldFail.reverting(loan.setInterestRate(amount, { from: user }));
    });
  });
  describe('#setTokenPrice', function() {
    const daiAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';
    const price = new BN(1);
    it('should set the price correctly with the contractOwner', async function() {
      const { logs } = await loan.setTokenPrice(daiAddress, price, {
        from: contractOwner,
      });
      expectEvent.inLogs(logs, 'TokenPrice', {
        tokenAdress: daiAddress,
        price,
      });
    });
    it('should revert with another user', function() {
      shouldFail.reverting(
        loan.setTokenPrice(daiAddress, price, { from: user })
      );
    });
  });
  describe('#createLoan', function() {
    const collateralAmount = ether(new BN(500));
    const loanAmount = ether(new BN(1));
    const tokenPrice = new BN(1);
    const tokenAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';
    beforeEach(async function() {
      await loan.setTokenPrice(tokenAddress, tokenPrice, {
        from: contractOwner,
      });
    });
    it('should revert if not fully collateralized', async function() {
      const lowCollateralAmount = new BN(1).mul(new BN(10).pow(new BN(20)));
      shouldFail.reverting.withMessage(
        loan.createLoan(loanAmount, lowCollateralAmount, tokenAddress, {
          from: user,
        }),
        'Collateral posted is insufficient to receive a loan'
      );
    });
    it('should revert if the collateral address is unregistered', async function() {
      shouldFail.reverting.withMessage(
        loan.createLoan(loanAmount, collateralAmount, constants.ZERO_ADDRESS, {
          from: user,
        }),
        'Collateral token not registered to system'
      );
    });
    it('should revert if there is not enough ether to send to the user', async function() {
      shouldFail.reverting(
        loan.createLoan(loanAmount, collateralAmount, tokenAddress, {
          from: user,
        })
      );
    });
    context('loan is funded with ether', function() {
      beforeEach(async function() {
        await send.ether(contractOwner, loan.address, fundAmount);
      });
      it('should revert if the user has an outstanding loan', async function() {
        await loan.createLoan(loanAmount, collateralAmount, tokenAddress, {
          from: user,
        });
        shouldFail.reverting.withMessage(
          loan.createLoan(loanAmount, collateralAmount, tokenAddress, {
            from: user,
          }),
          'User already owes tokens'
        );
      });
      it('should send the same amount of ether to the user', async function() {
        const expectedAmount = loanAmount.mul(new BN(-1));
        (await balance.difference(loan.address, () =>
          loan.createLoan(loanAmount, collateralAmount, tokenAddress, {
            from: user,
          })
        )).should.be.bignumber.equal(expectedAmount);
      });
      it('should emit an event', async function() {
        const { logs } = await loan.createLoan(
          loanAmount,
          collateralAmount,
          tokenAddress,
          { from: user }
        );
        expectEvent.inLogs(logs, 'NewLoan', {
          user,
          loanAmount,
          collateralAddress: tokenAddress,
          collateralAmount,
        });
      });
    });
  });
});
