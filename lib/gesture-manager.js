
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

window.JointType = window.KinectGestures.JointType = {
  'HandRight': 11,
  'WristRight': 10,
  'ElbowRight': 9,
  'ShoulderRight': 8,
  'ShoulderCenter': 2,
  'ShoulderLeft': 4,
  'ElbowLeft': 5,
  'WristLeft': 6,
  'HandLeft': 7,
  'Head': 3,
  'Spine': 1,
  'HipCenter': 0,
  'FootRight': 19,
  'AnkleRight': 18,
  'KneeRight': 17,
  'HipRight': 16,
  'HipLeft': 12,
  'KneeLeft': 13,
  'AnkleLeft': 14,
  'FootLeft': 15
};

(function(){

    var trackedSkeletons = [];

    var FRAME_CHECK_TRACKING = 50,
        frameCount = 0,
        currentlyTrackedPlayers = [];

    function GestureManager(){}

    GestureManager.registeredGestures = [];

    GestureManager.gesturesInProgress = {};

    GestureManager.registerGesture = function(gestureClass)
    {
        if (GestureManager.registeredGestures.indexOf(gestureClass) >= 0)
        {
            return;
        }

        GestureManager.registeredGestures.push(gestureClass);
        KinectGestures.PersonManager.updateGestures();
    }

    GestureManager.unregisterGesture = function(gestureClass)
    {
        if (GestureManager.registeredGestures.indexOf(gestureClass) === -1)
        {
            return;
        }
        if (gestureClass.destroy){
            gestureClass.destroy();
        }
        GestureManager.registeredGestures.splice(GestureManager.registeredGestures.indexOf(gestureClass),1);
        KinectGestures.PersonManager.updateGestures();
    }

    

    GestureManager.update = function(frame){
        
        trackedSkeletons = [];

        for (var i = frame.skeletons.length - 1; i >= 0; i--) {
            if (frame.skeletons[i].trackingState > 0){
                trackedSkeletons.push(frame.skeletons[i]);
            }
        }

        GestureManager.checkSkeletonTracking(trackedSkeletons);

        if (trackedSkeletons.length > 0){

            if (frameCount >= FRAME_CHECK_TRACKING){
                KinectGestures.PlayerRegister.checkSkeletonTracking(trackedSkeletons);
                KinectGestures.PersonManager.checkSkeletonTracking(trackedSkeletons);
                frameCount = 0;
            }
            else{
                frameCount++;
            }
            
            for (var k = trackedSkeletons.length - 1; k >= 0; k--) {
                KinectGestures.PersonManager.update(trackedSkeletons[k]);
                /*for (var j = registeredGestures.length - 1; j >= 0; j--) {
                    registeredGestures[j].update(trackedSkeletons[k]);    
                }*/
            }
        }
        
    };

    GestureManager.checkSkeletonTracking = function(trackedSkeletons)
    {
        // TODO enable / disable this feature
        // we've lost someone 
        if (trackedSkeletons.length < currentlyTrackedPlayers.length)
        { 
            var find = false;
            // lost everybody
            if (trackedSkeletons.length === 0)
            {
              for (var i = currentlyTrackedPlayers.length - 1; i >= 0; i--) {
                var player = KinectGestures.PlayerRegister.getPlayerById(currentlyTrackedPlayers[i].trackingId);
                KinectGestures.emit(KinectGestures.EventType.PlayerLost, {trackingId:currentlyTrackedPlayers[i].trackingId, playerNum:player ? player.playerNum : -1});
              }
            }
            else{ 

              // find who is lost
              var losts = [];
              for (var i = currentlyTrackedPlayers.length - 1; i >= 0; i--) {
                var found = false;
                for (var j = trackedSkeletons.length - 1; j >= 0; j--) {
                  if (trackedSkeletons[j].trackingId === currentlyTrackedPlayers[i].trackingId){
                    found = true;
                    break;
                  }
                }
                if (!found){
                  losts.push(currentlyTrackedPlayers[i]);
                }
              }

              for (i = losts.length - 1; i >= 0; i--) {
                var player = KinectGestures.PlayerRegister.getPlayerById(losts[i].trackingId);
                KinectGestures.emit(KinectGestures.EventType.PlayerLost, {trackingId:losts[i].trackingId, playerNum:player ? player.playerNum : -1});
              }
            } 
        }

        currentlyTrackedPlayers = trackedSkeletons;
    }

    KinectGestures.GestureManager = GestureManager;

})();