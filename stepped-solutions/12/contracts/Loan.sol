pragma solidity ^0.5.0;

import "./node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./node_modules/openzeppelin-soldity/contracts/token/IERC20.sol";
import "./node_modules/openzeppelin-soldity/contracts/ownership/Ownable.sol";
import "./DSmath.sol";

contract Loan is Ownable {

    using SafeMath for uint;

    uint public totalDebt; // max = 2**256 - 1
    mapping(address => uint) public loaneeToDebt;
    mapping(address => Collateral) public loaneeToCollateral;
    mapping(address => uint) public tokenPrices;
    uint public etherPrice;
    uint public interestRate; // wad

    struct Collateral {
        address tokenAddress;
        uint amount; // wad
    }

    constructor() public {
        etherPrice = 100;
        tokenPrices["0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"] = 1; //DAI
        interestRate = 2 * 10**23; // 0.0002 or 0.02%
    }

    function setInterestRate(uint _interestRate) public onlyOwner {
		interestRate = _interestRate;
	}

    function createLoan
    (
        uint _loanAmount,
        uint _collateralAmount,
        address _collateralAddress
    ) 
    public {
        require(loaneeToDebt[msg.sender] == 0, "User already owes tokens");
        require
        (
            isCollateralized(_loanAmount, _collateralAmount, _collateralAddress)
            "Collateral posted is insufficient to receive a loan");
        require(tokenPrices[_collateralAddress], "Collateral token registered to system");		

        IERC20(_collateralAddress).transferFrom(msg.sender, address(this), collateralAmount));
        Collateral collateral = Collateral(_collateralAddress, collateralAmount);
        loaneeToCollateral[msg.sender] = collateral;
    
        loaneeToDebt[msg.sender] = _amount;
        msg.sender.transfer(_amount);
        totalDebt = totalDebt.add(_amount);
    }

    function isCollateralized
    (
        uint _loanAmount,
        uint _collateralAmount,
        address _collateralAddress
    )
    public
    returns(bool) {
        uint collateralValue = tokenPrices[_collateralAddress].mul(_collateralAmount);
        uint loanValue = _loanAmount.mul(etherPrice);
        return (collateralValue >= loanValue);
    }

    function payLoan() public payable {
        loaneeToDebt[msg.sender] = loaneeToDebt[msg.sender].sub(msg.value);
        totalDebt = totalDebt.sub(msg.value);

        if (!loaneeToDebt[msg.sender]) {
            Collateral collateral = loaneeToCollateral[msg.sender];
            uint amountAfterInterest = DSMath.wmul(collateral.amount, interestRate);
            ERC20(collateral.tokenAddress)).transfer(address(this), msg.sender, amountAfterInterest)); 
            loaneeToCollateral[msg.sender] = 0;
        } 
    }
}