pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DSmath.sol";


contract Loan is Ownable, DSMath {

    using SafeMath for uint;

    uint public totalDebt; // max = 2**256 - 1
    mapping(address => uint) private  loaneeToDebt;
    mapping(address => Collateral) private loaneeToCollateral;
    mapping(address => uint) private tokenPrices;
    uint private etherPrice;
    uint private interestRate; // wad

    struct Collateral {
        address tokenAddress;
        uint amount; // wad
    }

    event InterestRate(uint value);
    event TokenPrice(address tokenAddress, bytes32 tokenName, uint price);
    event NewLoan(address user, uint loanAmount, address collateralAddress, uint collateralAmount);
    event PaidLoan(address user, uint paidAmount, uint interestAmount, bool loanClosed);

    constructor(uint _etherPrice) public {
        etherPrice = _etherPrice;
    }

    function () external payable {}

    function setInterestRate(uint _interestRate) external onlyOwner {
        interestRate = _interestRate;
        emit InterestRate(interestRate);
    }

    function setTokenPrice(address _tokenAddress, bytes32 _tokenName, uint _price) public onlyOwner {
     tokenPrices[_tokenAddress] = _price;
        emit TokenPrice(_tokenAddress, _tokenName, _price);
    }

    function createLoan
    (
        uint _loanAmount,
        uint _collateralAmount,
        address _collateralAddress
    ) 
    external {
        require(loaneeToDebt[msg.sender] == 0, "User already owes tokens");
        require(tokenPrices[_collateralAddress] != 0, "Collateral token not registered to system");		
        require
        (
            isCollateralized(_loanAmount, _collateralAmount, _collateralAddress),
            "Collateral posted is insufficient to receive a loan"
        );

        IERC20(_collateralAddress).transferFrom(msg.sender, address(this), _collateralAmount);
        Collateral memory collateral = Collateral(_collateralAddress, _collateralAmount);
        loaneeToCollateral[msg.sender] = collateral;

        loaneeToDebt[msg.sender] = _loanAmount;
        msg.sender.transfer(_loanAmount);
        totalDebt = totalDebt.add(_collateralAmount);
        emit NewLoan(msg.sender, _loanAmount, _collateralAddress, _collateralAmount);
    }

    function isCollateralized
    (
        uint _loanAmount,
        uint _collateralAmount,
        address _collateralAddress
    )
    private
    returns(bool) {
        uint collateralValue = tokenPrices[_collateralAddress].mul(_collateralAmount);
        uint loanValue = _loanAmount.mul(etherPrice);
        return (collateralValue >= loanValue);
    }

    function payLoan() external payable {
        require(loaneeToDebt[msg.sender] > 0);
        loaneeToDebt[msg.sender] = loaneeToDebt[msg.sender].sub(msg.value);
        totalDebt = totalDebt.sub(msg.value);

        bool fullyPaid;
        uint interestAmount;
        if (loaneeToDebt[msg.sender] == 0) {
            Collateral memory collateral = loaneeToCollateral[msg.sender];
            interestAmount = DSMath.wmul(collateral.amount, interestRate);
            uint userAmount = DSMath.sub(collateral.amount, interestAmount);
            IERC20(collateral.tokenAddress).transfer(msg.sender, userAmount); 
            delete loaneeToCollateral[msg.sender];
            fullyPaid = true;
        } 
        emit PaidLoan(msg.sender, msg.value, interestAmount, fullyPaid);
    }
}