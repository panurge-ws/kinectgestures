window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// Stability helper
// it detects if he skeleton is moving or is (relatively) stable
// TODO make a gesture type
/*(function(KinectGestures){

    function SkeletonStability(){}

    var WINDOW_SIZE = 3; // frame number for a segment is considered still active
    var TRESHOLD_STABLE = 0.04;

    var _gestureTrack = {};
    
    function resetGesture(trackingId)
    {   
        if (_gestureTrack[trackingId]){
            _gestureTrack[trackingId] = null;
            delete _gestureTrack[trackingId];
        }
        
    }

    SkeletonStability.isStable = function(trackingId)
    {
        if (_gestureTrack[trackingId]){
           return _gestureTrack[trackingId].stable === true;
        }
        // return not stable if not mapped
        // TODO check...
        return false;
    }
    
    SkeletonStability.update = function(skeleton){

        if (!_gestureTrack[skeleton.trackingId]){

            _gestureTrack[skeleton.trackingId] = {
                lastPosition:skeleton.position,
                stable: false,
                frameCount:0
            }
        }
        
        if (_gestureTrack[skeleton.trackingId].frameCount >= WINDOW_SIZE){
            
            var dif = Math.abs(skeleton.position.x - _gestureTrack[skeleton.trackingId].lastPosition.x);
            var stable = dif < TRESHOLD_STABLE ;
            _gestureTrack[skeleton.trackingId].stable = stable;
            //KinectGestures.log(stable + ' -> ' + dif.toFixed(3));
            _gestureTrack[skeleton.trackingId].lastPosition = skeleton.position;

            _gestureTrack[skeleton.trackingId].frameCount = 0;
        }
        else{
            _gestureTrack[skeleton.trackingId].frameCount++;
        }

    }               

    KinectGestures.SkeletonStability = SkeletonStability;

})();*/