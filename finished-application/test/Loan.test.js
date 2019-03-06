// Loan.test.js
const {
  BN,
  expectEvent,
  shouldFail,
  constants,
  balance,
  send,
  ether,
} = require('openzeppelin-test-helpers');

const { padRight, utf8ToHex } = web3.utils;

const Loan = artifacts.require('Loan');
const ERC20Mock = artifacts.require('ERC20Mock');

contract('Loan', function([_, contractOwner, user, userTwo]) {
  let loan;
  let token;
  const initialSupply = new BN(1).mul(new BN(10).pow(new BN(26)));
  const fundAmount = ether(new BN(10));
  beforeEach(async function() {
    loan = await Loan.new(new BN(300), { from: contractOwner });
    token = await ERC20Mock.new(user, initialSupply);
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
    const daiName = utf8ToHex('DAI');
    it('should set the price correctly with the contractOwner', async function() {
      const { logs } = await loan.setTokenPrice(daiAddress, daiName, price, {
        from: contractOwner,
      });
      expectEvent.inLogs(logs, 'TokenPrice', {
        tokenAddress: daiAddress,
        tokenName: padRight(daiName, 64),
        price,
      });
    });
    it('should revert with another user', function() {
      shouldFail.reverting(
        loan.setTokenPrice(daiAddress, daiName, price, { from: user })
      );
    });
  });
  describe('#createLoan', function() {
    const collateralAmount = ether(new BN(500));
    const loanAmount = ether(new BN(1));
    const tokenPrice = new BN(1);
    beforeEach(async function() {
      await loan.setTokenPrice(token.address, tokenPrice, {
        from: contractOwner,
      });
      await token.approve(loan.address, collateralAmount, { from: user });
    });
    it('should revert if not fully collateralized', async function() {
      const lowCollateralAmount = new BN(1).mul(new BN(10).pow(new BN(20)));
      shouldFail.reverting.withMessage(
        loan.createLoan(loanAmount, lowCollateralAmount, token.address, {
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
        loan.createLoan(loanAmount, collateralAmount, token.address, {
          from: user,
        })
      );
    });
    context('loan is funded with ether', function() {
      beforeEach(async function() {
        await send.ether(contractOwner, loan.address, fundAmount);
      });
      it('should revert if the user has an outstanding loan', async function() {
        await loan.createLoan(loanAmount, collateralAmount, token.address, {
          from: user,
        });
        shouldFail.reverting.withMessage(
          loan.createLoan(loanAmount, collateralAmount, token.address, {
            from: user,
          }),
          'User already owes tokens'
        );
      });
      it('should transfer collateral tokens from the user to the contract', async function() {
        await loan.createLoan(loanAmount, collateralAmount, token.address, {
          from: user,
        });
        (await token.balanceOf(loan.address)).should.be.bignumber.equal(
          collateralAmount
        );
      });
      it('should send the same amount of ether to the user', async function() {
        const expectedAmount = loanAmount.mul(new BN(-1));
        (await balance.difference(loan.address, () =>
          loan.createLoan(loanAmount, collateralAmount, token.address, {
            from: user,
          })
        )).should.be.bignumber.equal(expectedAmount);
      });
      it('should emit an event', async function() {
        const { logs } = await loan.createLoan(
          loanAmount,
          collateralAmount,
          token.address,
          { from: user }
        );
        expectEvent.inLogs(logs, 'NewLoan', {
          user,
          loanAmount,
          collateralAddress: token.address,
          collateralAmount,
        });
      });
    });
  });

  describe('#payLoan', function() {
    const collateralAmount = ether(new BN(500));
    const loanAmount = ether(new BN(1));
    const tokenPrice = new BN(1);
    const interestRate = new BN(20000000000000);
    beforeEach(async function() {
      await loan.setTokenPrice(token.address, tokenPrice, {
        from: contractOwner,
      });
      await loan.setInterestRate(interestRate, {
        // 0.02%
        from: contractOwner,
      });
      await token.approve(loan.address, collateralAmount, { from: user });
      await send.ether(contractOwner, loan.address, fundAmount);
      await loan.createLoan(loanAmount, collateralAmount, token.address, {
        from: user,
      });
    });
    it('should revert if there is no debt to repay', async function() {
      shouldFail.reverting(loan.payLoan(), { from: userTwo });
    });
    it('should reduce the total debt by the amount of ether paid', async function() {
      const smallerAmount = loanAmount.div(new BN(2));
      const initialDebt = await loan.totalDebt();
      await loan.payLoan({ from: user, value: smallerAmount });

      (await loan.totalDebt()).should.be.bignumber.equal(
        initialDebt.sub(smallerAmount)
      );
    });
    context('debt is partially paid', function() {
      it('should emit an event', async function() {
        const smallerAmount = loanAmount.div(new BN(2));
        const { logs } = await loan.payLoan({
          from: user,
          value: smallerAmount,
        });

        expectEvent.inLogs(logs, 'PaidLoan', {
          user,
          paidAmount: smallerAmount,
          loanClosed: false,
        });
      });
    });
    context('debt is fully paid', function() {
      it('should return collateral (minus interest) to the user when debt fully repaid', async function() {
        const initialBalance = await token.balanceOf(user);
        const oneEth = ether(new BN(1));
        const interestAmount = collateralAmount.mul(interestRate).div(oneEth);
        await loan.payLoan({ from: user, value: loanAmount });
        (await token.balanceOf(user)).should.be.bignumber.equal(
          initialBalance.add(collateralAmount).sub(interestAmount)
        );
      });
      it('should emit an event', async function() {
        const { logs } = await loan.payLoan({
          from: user,
          value: loanAmount,
        });

        expectEvent.inLogs(logs, 'PaidLoan', {
          user,
          paidAmount: loanAmount,
          loanClosed: true,
        });
      });
    });
  });
});
