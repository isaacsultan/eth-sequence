pragma solidity ^0.5.0;

contract Loan {
  uint public debt; 
    address public loanee;

    function createLoan(uint _amount) public {
        require(debt == 0, "User already owes tokens");
        debt = _amount;
        loanee = msg.sender;
        msg.sender.transfer(_amount);
    }
}