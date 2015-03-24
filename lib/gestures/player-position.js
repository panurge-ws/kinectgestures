window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};
// Detect the position of a player relative to his initial registered position
// not a real gesture
// but we use the same interface of a gesture to detect tht
/*(function(KinectGestures){

    function PlayerPosition(){}

    // N.B.: this is the key factor to determine the effective move
    var treshold = 0.2;

    var diffPos = 0;

    PlayerPosition.lastPositionPlayer1 = null;                
    PlayerPosition.lastPositionPlayer2 = null;                
    PlayerPosition.positionPlayer1 = null;                
    PlayerPosition.positionPlayer2 = null; 
    
    PlayerPosition.update = function(skeleton){

        if (PlayerRegister.isRegistering){
            return;
        }

        var player = null;
        if (PlayerRegister.initPositionPlayer1 && skeleton.trackingId === PlayerRegister.initPositionPlayer1.trackingId){
            player = 1;
        }
        else if (PlayerRegister.initPositionPlayer2 && skeleton.trackingId === PlayerRegister.initPositionPlayer2.trackingId){
            player = 2;
        }
        if (player !== null){
            diffPos = skeleton.position.x - PlayerRegister['initPositionPlayer'+player].x;
            if (Math.abs(diffPos) > treshold){
                if (diffPos < 0){
                    PlayerPosition['positionPlayer'+player] = -1;
                }
                else{
                    PlayerPosition['positionPlayer'+player] = 1;
                }
            }
            else{
                PlayerPosition['positionPlayer'+player] = 0;
            }
            if (PlayerPosition['lastPositionPlayer'+player] !== PlayerPosition['positionPlayer'+player]){
                //KinectGestures.log('Player 1 Position: ' + (PlayerPosition.positionPlayer1 !== null ? PlayerPosition.positionPlayer1 : '') + '; Player 2 Position: ' + (PlayerPosition.positionPlayer2 !== null ? PlayerPosition.positionPlayer2 : ''));
                PlayerPosition['lastPositionPlayer'+player] = PlayerPosition['positionPlayer'+player];
            }
        }
        
    }               

    KinectGestures.PlayerPosition = PlayerPosition;

})(window);*/



(function(){


    function PlayerPositionContition(person){

        var _person = person;
        var _checker = _person.checker;
    
        var _diffPos = 0;

        var _position = -1;
        
        this.Check = function(skeleton)
        {
            // the skeleton should be tracked, well formed on the lower part, and in stand up position
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'lower')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }
            /*else{
                KinectGestures.log('skeletonStability->true');
            }*/

            if (KinectGestures.PlayerRegister.isRegistering){
                return;
            }

            var initPlayerPosition = KinectGestures.PlayerRegister.getPlayerById(person.trackingId);

            var newPosition;

            if (initPlayerPosition !== null){
                
                _diffPos = skeleton.position.x - initPlayerPosition.x;

                if (Math.abs(_diffPos) > PlayerPosition.Options.Threshold){
                    if (_diffPos < 0){
                        newPosition = -1;
                    }
                    else{
                        newPosition = 1;
                    }
                }
                else{
                    newPosition = 0;
                }
                if (newPosition !== _position){
                    
                    _position = newPosition;

                    PlayerPosition['player'+initPlayerPosition.playerNum] = _position;

                    var arg = {
                        position: _position,
                        playerNum: initPlayerPosition.playerNum
                    }
                    
                    return {res:1, args:arg};
                }
            }
        }

        

    }

    // Gesture class
    //PlayerPosition.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(PlayerPosition, KinectGestures.GestureChecker);

    PlayerPosition.Options = {Threshold:0.2};
    
    function PlayerPosition(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.PlayerPosition;
        this.person = person;
        this.timeout = 0; // continuous
        this.conditions = [ new PlayerPositionContition( person )];
    }

    KinectGestures.PlayerPosition = PlayerPosition;

})();