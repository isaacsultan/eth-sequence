const {
  BN,
  expectEvent,
  shouldFail,
} = require('openzeppelin-test-helpers');

const Loan = artifacts.require('Loan');

contract('Loan', function([_, contractOwner, user]) {
  let loan;
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
});
