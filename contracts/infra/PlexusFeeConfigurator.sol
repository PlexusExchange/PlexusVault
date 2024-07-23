// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PlexusFeeConfigurator is OwnableUpgradeable {
    struct FeeCategory {
        uint256 total; // total fee charged on each harvest
        uint256 plexus; // split of total fee going to plexus fee batcher
        string label; // description of the type of fee category
        bool active; // on/off switch for fee category
    }

    address public keeper;
    uint256 public totalLimit;
    uint256 constant DIVISOR = 1 ether;

    mapping(address => uint256) public stratFeeId;
    mapping(uint256 => FeeCategory) internal feeCategory;

    event SetStratFeeId(address indexed strategy, uint256 indexed id);
    event SetFeeCategory(uint256 indexed id, uint256 total, uint256 plexus, string label, bool active);
    event Pause(uint256 indexed id);
    event Unpause(uint256 indexed id);
    event SetKeeper(address indexed keeper);

    function initialize(address _keeper, uint256 _totalLimit) public initializer {
        __Ownable_init();
        keeper = _keeper;
        totalLimit = _totalLimit;
    }

    // checks that caller is either owner or keeper
    modifier onlyManager() {
        require(msg.sender == owner() || msg.sender == keeper, "!manager");
        _;
    }

    // fetch fees for a strategy
    function getFees(address _strategy) external view returns (FeeCategory memory) {
        return getFeeCategory(stratFeeId[_strategy], false);
    }

    // fetch fees for a strategy, _adjust option to view fees as % of total harvest instead of % of total fee
    function getFees(address _strategy, bool _adjust) external view returns (FeeCategory memory) {
        return getFeeCategory(stratFeeId[_strategy], _adjust);
    }

    // fetch fee category for an id if active, otherwise return default category
    // _adjust == true: view fees as % of total harvest instead of % of total fee
    function getFeeCategory(uint256 _id, bool _adjust) public view returns (FeeCategory memory fees) {
        uint256 id = feeCategory[_id].active ? _id : 0;
        fees = feeCategory[id];
        if (_adjust) {
            uint256 _totalFee = fees.total;
            fees.plexus = (fees.plexus * _totalFee) / DIVISOR;
        }
    }

    // set a fee category id for a strategy that calls this function directly
    function setStratFeeId(uint256 _feeId) external {
        _setStratFeeId(msg.sender, _feeId);
    }

    // set a fee category id for a strategy by a manager
    function setStratFeeId(address _strategy, uint256 _feeId) external onlyManager {
        _setStratFeeId(_strategy, _feeId);
    }

    // set fee category ids for multiple strategies at once by a manager
    function setStratFeeId(address[] memory _strategies, uint256[] memory _feeIds) external onlyManager {
        uint256 stratLength = _strategies.length;
        for (uint256 i = 0; i < stratLength; i++) {
            _setStratFeeId(_strategies[i], _feeIds[i]);
        }
    }

    // internally set a fee category id for a strategy
    function _setStratFeeId(address _strategy, uint256 _feeId) internal {
        stratFeeId[_strategy] = _feeId;
        emit SetStratFeeId(_strategy, _feeId);
    }

    // set values for a fee category using the relative split for call and strategist
    // i.e. call = 0.01 ether(10000000000000000) == 1% of total fee
    // _adjust == true: input call and strat fee as % of total harvest
    function setFeeCategory(uint256 _id, uint256 _total, string memory _label, bool _active) external onlyOwner {
        require(_total <= totalLimit, ">totalLimit");
        uint256 plexus = DIVISOR;

        FeeCategory memory category = FeeCategory(_total, plexus, _label, _active);

        feeCategory[_id] = category;
        emit SetFeeCategory(_id, _total, plexus, _label, _active);
    }

    // deactivate a fee category making all strategies with this fee id revert to default fees
    function pause(uint256 _id) external onlyManager {
        feeCategory[_id].active = false;
        emit Pause(_id);
    }

    // reactivate a fee category
    function unpause(uint256 _id) external onlyManager {
        feeCategory[_id].active = true;
        emit Unpause(_id);
    }

    // change keeper
    function setKeeper(address _keeper) external onlyManager {
        keeper = _keeper;
        emit SetKeeper(_keeper);
    }
}
