pragma solidity ^0.5.0;
import "./node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./node_modules/openzeppelin-soldity/contracts/token/IERC20.sol";


contract Loan {

    using SafeMath for uint;

    uint public totalDebt; // max = 2**256 - 1
    mapping(address => uint) public loaneeToDebt;
    mapping(address => uint) public tokenPrices;
    uint public etherPrice;

    constructor() {
        etherPrice = 100;
        tokenPrices["0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"] = 1; //DAI
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
        require(tokenValues[_collateralAddress], "Collateral token registered to system");		

        IERC20(_collateralAddress).transferFrom(msg.sender, address(this), _collateralAmount));		

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
    }
}