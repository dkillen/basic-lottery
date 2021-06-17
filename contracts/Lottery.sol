pragma solidity ^0.4.17;

contract Lottery {
    // State variables

    address public manager;
    address[] public players;

    // Function modifiers

    modifier restricted() {
        require(msg.sender == manager);
        _;
    }

    // Constructor

    function Lottery() public {
        manager = msg.sender;
    }

    // Contract functions

    function enter() public payable {
        require(msg.value > .01 ether);
        players.push(msg.sender);
    }

    function random() private view returns (uint256) {
        return uint256(keccak256(block.difficulty, now, players));
    }

    function pickWinner() public restricted {
        uint256 index = random() % players.length;
        players[index].transfer(this.balance);
        players = new address[](0);
    }

    function getPlayers() public view returns (address[]) {
        return players;
    }
}
