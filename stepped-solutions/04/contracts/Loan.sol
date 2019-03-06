pragma solidity ^0.5.0;

contract Loan {
    uint public totalDebt;
    mapping(address => uint) public loaneeToDebt; 

    function createLoan(uint _amount) public {
        require(loaneeToDebt[msg.sender] == 0, "User already owes tokens");
        loaneeToDebt[msg.sender] = _amount;
        msg.sender.transfer(_amount);
        totalDebt += _amount;
    }
}