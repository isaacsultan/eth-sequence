pragma solidity ^0.5.0;

contract Loan {
    uint public debt; 
    address public loanee;

    function createLoan(uint _amount) public {
        debt = _amount;
        loanee = msg.sender;
    }
}