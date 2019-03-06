pragma solidity ^0.5.0;
import "./node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract MyToken is IERC20 {

	using SafeMath for uint;

	uint public supply;
	mapping(address => uint) public balances;

	constructor(uint _supply) public {
		supply = _supply;
	}

	function transfer(address from, address to, uint value) public {
		balances[from] = balances[from].sub(value);
		balances[to] = balances[to].add(value);

		emit Transfer(from, to, value);
	}
}