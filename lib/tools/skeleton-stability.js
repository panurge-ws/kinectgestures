window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// Stability helper
// it detects if the skeleton is "well-formed"

(function(){


    function SkeletonStability(){}

    // Detects id a skeleton is well formed
    // checking the correct dispositions of the joints
    // @checker the cheker of the person
    // @skeleton A skeleton data frame 
    // @skeletonPart: null | 'upper' | 'lower' if null check the whole skeleton (upper and lower part)
    // @checkDirections: if tru check also the direcitons of the joints, not only the tracking status
    // @position: null | 'standing' (the skeleton is standing up)
    // TODO
    // @duration: the lapse of frames in which well formed has to be checked
    // return true or false 

    SkeletonStability.isWellFormed = function(checker, skeleton, skeletonPart, checkDirections, position, duration)
    {
        var resUpper = true, resLower = true;

        if (skeletonPart)
        {
            if (skeletonPart === 'upper')
            {
                resUpper = checkUpperPart(checker, skeleton, checkDirections);
            }
            else{
                 resLower = checkLowerPart(checker, skeleton, checkDirections, position);
            }
        }
        else{
            resUpper = checkUpperPart(checker, skeleton, checkDirections);
            resLower = checkLowerPart(checker, skeleton, checkDirections, position);
        }

        return resUpper && resLower;
    }

    function checkLowerPart(checker, skeleton, checkDirections, position)
    {
        var jointsToCheck = [
                JointType.HipCenter,
                JointType.HipLeft,
                JointType.HipRight,
                JointType.KneeRight,
                JointType.KneeLeft,
                JointType.FootRight,
                JointType.FootLeft,
            ];


        for (var i = jointsToCheck.length - 1; i >= 0; i--) {
            if (skeleton.joints[jointsToCheck[i]].trackingState < 2){
                return false;
            }
        }

        if (!checkDirections){
            return true;
        }

        var leftHipOrientation = checker.GetRelativePosition(JointType.HipCenter, JointType.HipLeft);

        if (!leftHipOrientation[KinectGestures.Direction.Left])
        {   
            return false;
        }

        var rightHipOrientation = checker.GetRelativePosition(JointType.HipCenter, JointType.HipRight);

        if (!rightHipOrientation[KinectGestures.Direction.Right])
        {   
            return false;
        }

        if (!position)
        {
            return true;
        }
        else if (position === 'standup'){
            
            var kneeHipOrientation = checker.GetRelativePosition(JointType.HipLeft, JointType.KneeLeft);

            if (!kneeHipOrientation[KinectGestures.Direction.Downward])
            {   
                return false;
            }

            var footKneeOrientation = checker.GetRelativePosition(JointType.KneeLeft, JointType.FootLeft);

            if (!footKneeOrientation[KinectGestures.Direction.Downward])
            {   
                return false;
            }

        }

        return true;
    }

    function checkUpperPart(checker, skeleton, checkDirections)
    {   
        var jointsToCheck = [
                JointType.ShoulderLeft,
                JointType.ShoulderRight,
                JointType.ShoulderCenter,
                JointType.ElbowLeft,
                JointType.ElbowRight,
                JointType.HandRight,
                JointType.HandLeft,
            ];


        for (var i = jointsToCheck.length - 1; i >= 0; i--) {
            if (skeleton.joints[jointsToCheck[i]].trackingState < 2){
                return false;
            }
        }

        if (!checkDirections){
            return true;
        }

        var leftShoulderOrientation = checker.GetRelativePosition(JointType.ShoulderCenter, JointType.ShoulderLeft);

        if (!leftShoulderOrientation[KinectGestures.Direction.Left])
        {   
            return false;
        }

        var rightShoulderOrientation = checker.GetRelativePosition(JointType.ShoulderCenter, JointType.ShoulderRight);

        if (!rightShoulderOrientation[KinectGestures.Direction.Right])
        {   
            return false;
        }

        var centerShoulderHipOrientation = checker.GetRelativePosition(JointType.HipCenter, JointType.ShoulderCenter);

        if (!centerShoulderHipOrientation[KinectGestures.Direction.Upward])
        {   

            return false;
        }

        return true;

    }

    KinectGestures.SkeletonStability = SkeletonStability;


})()

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