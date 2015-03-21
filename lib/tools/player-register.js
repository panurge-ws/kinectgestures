window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){
    
    var timeoutRegisterPos, 
        intervalRegisterPos, 
        initTimeRegister = 0;

    function PlayerRegister(){}

    PlayerRegister.initPositionPlayer1 = null;
    PlayerRegister.initPositionPlayer2 = null;
    PlayerRegister.isRegistering = false;
    PlayerRegister.isCalibrating = false;
    PlayerRegister.started = false;
    PlayerRegister.numPlayersToRegister = 1;
    PlayerRegister.player1Engaged = false;
    PlayerRegister.player2Engaged = false;
    PlayerRegister.registeredPositions = {};

    /*function calibrateMsg()
    {   
        var timeLeft = Date.now()-initTimeRegister;
        timeLeft = Math.round(timeLeft/1000);
        timeLeft = 5-timeLeft;
        window.log('Calibrating Position '+ timeLeft + 's');
    }*/

    /*function registerPosition()
    {
        clearTimeout(timeoutRegisterPos);
        clearInterval(intervalRegisterPos);
        PlayerRegister.isRegistering = false;
        PlayerRegister.isCalibrating = false;
        window.log('Position Calibrated');
    }*/

    /*function initCalibration()
    {
        timeoutRegisterPos = setTimeout(registerPosition,5000);
        initTimeRegister = Date.now();
        intervalRegisterPos = setInterval(calibrateMsg,1000);
    }*/

    PlayerRegister.init = function()
    {
        //clearTimeout(timeoutRegisterPos);
        //clearInterval(intervalRegisterPos);
        PlayerRegister.isRegistering = true;
    }

    PlayerRegister.getPlayerById = function(trackingId)
    {
        if (PlayerRegister.initPositionPlayer1 && PlayerRegister.initPositionPlayer1.trackingId === trackingId)
        {
            return PlayerRegister.initPositionPlayer1
        }
        if (PlayerRegister.initPositionPlayer2 && PlayerRegister.initPositionPlayer2.trackingId === trackingId)
        {
            return PlayerRegister.initPositionPlayer2
        }

        return null;
    }

    PlayerRegister.getRefSkeletonById = function(trackingId)
    {
        var pl = PlayerRegister.getPlayerById(trackingId);
        return pl ? pl.skeleton : null;
    }

    PlayerRegister.registerPlayerPosition = function(trackingId, skeleton)
    {   
        // TODO calibrate skeleton on 
        if (skeleton.position.x <= 0){
            PlayerRegister.initPositionPlayer1 = skeleton.position;
            PlayerRegister.initPositionPlayer1.trackingId = trackingId;
            PlayerRegister.initPositionPlayer1.skeleton = skeleton;
            PlayerRegister.initPositionPlayer1.playerNum = 1;
            PlayerRegister.player1Engaged = true;
        }
        else{
            PlayerRegister.initPositionPlayer2 = skeleton.position;
            PlayerRegister.initPositionPlayer2.trackingId = trackingId;
            PlayerRegister.initPositionPlayer2.skeleton = skeleton;
            PlayerRegister.initPositionPlayer2.playerNum = 2;
            PlayerRegister.player2Engaged = true;
        }
       
        if (PlayerRegister.numPlayersToRegister === 1 || 
           (PlayerRegister.player1Engaged && PlayerRegister.player2Engaged) )
        {
            PlayerRegister.isRegistering = false;
            PlayerRegister.isCalibrating = false;
        }   
    }

    PlayerRegister.reset = function()
    {
        PlayerRegister.started = false;
        PlayerRegister.player1Engaged = false;
        PlayerRegister.player2Engaged = false;
        PlayerRegister.registeredPositions = {};
    }

    // TODO manage the case in which one of the two players disappears when registering 
    PlayerRegister.update = function (frame)
    {
        if (PlayerRegister.isRegistering){
            var playersTracked = 0;
            for (var iSkeleton = 0; iSkeleton < frame.skeletons.length; ++iSkeleton) {

                var skeleton = frame.skeletons[iSkeleton];
                            
                if (skeleton.trackingState > 0){
                    playersTracked++;
                    //PlayerRegister.registeredPositions[skeleton.trackingId] = skeleton.position;
                    /*if (skeleton.position.x <= 0 && !PlayerRegister.player1Engaged){
                        PlayerRegister.initPositionPlayer1 = skeleton.position;
                        PlayerRegister.initPositionPlayer1.trackingId = skeleton.trackingId;
                    }
                    else if (skeleton.position.x > 0 && !PlayerRegister.player2Engaged){
                        PlayerRegister.initPositionPlayer2 = skeleton.position;
                        PlayerRegister.initPositionPlayer2.trackingId = skeleton.trackingId;
                    }*/
                   
                }
            }
            if (playersTracked === PlayerRegister.numPlayersToRegister && !PlayerRegister.isCalibrating){
                
                PlayerRegister.isCalibrating = true;
                KinectGestures.emit('playersTracked');
            }
        }

    } 

    // check if the current skeleton is currently traked as player
    // otherwise it assigns to the player the new trackingId
    // according to his position
    // TODO ask if right logic
    // TODO can we use this function to determine which are the players?
    PlayerRegister.checkSkeletonTracking = function(skeletons){
        
        var found = 0, indexFound;
        
        for (var i = skeletons.length - 1; i >= 0; i--) {
            window.log('found'+skeletons[i].trackingId);
            var skeleton = skeletons[i];
            if (PlayerRegister.initPositionPlayer1 && skeleton.trackingId === PlayerRegister.initPositionPlayer1.trackingId)
            {
                found = found > 1 ? 3 : 1;
                indexFound = i;
            }
            if (PlayerRegister.initPositionPlayer2 && skeleton.trackingId === PlayerRegister.initPositionPlayer2.trackingId)
            {
                found = found > 1 ? 3 : 2;
                indexFound = i;
            }
        }

        // some skeleton is not being traked before
        if (found < 3){
            
            // found player 1 => the new is player2
            if (found === 1 && skeletons.length > 1){
                if (PlayerRegister.initPositionPlayer2){
                    PlayerRegister.initPositionPlayer2.trackingId = skeletons[indexFound === 0 ? 1 : 0].trackingId;
                    KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                }
            }
            // found player 2 => the is player 1
            else if (found === 2 && skeletons.length > 1)   
            {
                if (PlayerRegister.initPositionPlayer1){
                    PlayerRegister.initPositionPlayer1.trackingId =  skeletons[indexFound === 0 ? 1 : 0].trackingId;
                    KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});
                }
            }
            // re-assign based on position
            else if (found === 0 && skeletons.length > 0)
            {   
                // we have tu mutually exclude the skeletons
                // so we guess natural positions
                if (skeletons.length === 1){
                    // assign in base of the absolute position
                    if (skeletons[0].position.x <= 0)
                    {
                        if (PlayerRegister.initPositionPlayer1){
                            PlayerRegister.initPositionPlayer1.trackingId =  skeletons[0].trackingId;
                            KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});   
                        }
                    }
                    else 
                    {
                        if (PlayerRegister.initPositionPlayer2){
                            PlayerRegister.initPositionPlayer2.trackingId =  skeletons[0].trackingId;
                            KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                        }
                    }
                }
                else{
                    // assign based on the relative position of the players
                    if (skeletons[0].position.x < skeletons[1].position.x){
                        if (PlayerRegister.initPositionPlayer1){
                            PlayerRegister.initPositionPlayer1.trackingId = skeletons[0].trackingId;
                            KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});
                        }
                        if (PlayerRegister.initPositionPlayer2){
                            PlayerRegister.initPositionPlayer2.trackingId = skeletons[1].trackingId;
                            KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                        }
                    }
                    else{
                        if (PlayerRegister.initPositionPlayer1){
                            PlayerRegister.initPositionPlayer1.trackingId = skeletons[1].trackingId;
                            KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});
                        }
                        if (PlayerRegister.initPositionPlayer2){
                            PlayerRegister.initPositionPlayer2.trackingId = skeletons[0].trackingId;
                            KinectGestures.emit('playerEngagedAgain', {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                        }
                    }
                }
            }
        }

    }

    KinectGestures.PlayerRegister = PlayerRegister;


})();