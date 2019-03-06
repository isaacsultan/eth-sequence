pragma solidity ^0.5.0;
import "./node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Loan {

    using SafeMath for uint;

    uint public totalDebt; // max = 2**256 - 1
    mapping(address => uint) public loaneeToDebt; 

    function createLoan(uint _amount) public {
        require(loaneeToDebt[msg.sender] == 0, "User already owes tokens");
        loaneeToDebt[msg.sender] = _amount;
        msg.sender.transfer(_amount);
        totalDebt = totalDebt.add(_amount);
    }
}