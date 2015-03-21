window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    // 
    function SquatCondition(person, params){

        var _person = person;
        var _index;
        var _checker = _person.checker;

        var UpperBound = 2;

        this.Check = function(skeleton)
        {
               
            var hipVelocity = _checker.GetAbsoluteVelocity(JointType.HipCenter);
            
            // if jump is in progress rreset 
            if (KinectGestures.GestureManager.gesturesInProgress && KinectGestures.GestureManager.gesturesInProgress[person.trackingId] && KinectGestures.GestureManager.gesturesInProgress[person.trackingId]['jump'] === true)
            {
                this.Reset();
                return;
            }
            // min speed
            if (_index === 0 && hipVelocity < 1.2)
            {
                this.Reset();
                return;
            }

            var hipMovement = _checker.GetSteadyAbsoluteMovement(JointType.HipCenter, 3);
            // hip steady in last 3 frames
            if (_index === 0 && 
                (
                    hipMovement[KinectGestures.Direction.Left] || hipMovement[KinectGestures.Direction.Right]
                )
            ){
                this.Reset();
                return;
            }

            var footRightMovement = _checker.GetSteadyAbsoluteMovement(JointType.FootRight,3);
            var footLeftMovement = _checker.GetSteadyAbsoluteMovement(JointType.FootLeft,3);
            // foot steady in last 3 frames
            if (
                (footRightMovement[KinectGestures.Direction.Upward] || footRightMovement[KinectGestures.Direction.Upward]
                || footLeftMovement[KinectGestures.Direction.Upward] || footLeftMovement[KinectGestures.Direction.Upward])
            )
            {
                this.Reset();
                return;
            }

            // we are going down so -> success but we reset only on Upward or if feet has moved (see above)
            if (_index === 0 && hipMovement[KinectGestures.Direction.Downward])
            {
                _index = 1;
                return {res:1, args:''};
            }
            else if (_index === 1 && hipMovement[KinectGestures.Direction.Upward]){
                this.Reset();
            }  
        }

        this.Reset = function()
        {
            _index = 0;
        }

    }

    // Gesture class
    SquatGesture.inherits(KinectGestures.GestureChecker);
    
    function SquatGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = 'squat';
        this.person = person;
        this.timeout = 700;
        this.conditions = [ new SquatCondition(person) ];
    }

    KinectGestures.SquatGesture = SquatGesture;

})();



// SquatCalibratedGesture gesture
// a gesture based on calibrated skeleton
// to detect if there is a squat
// the gesture is defined by two movements
// 1. going down
// 2. going up
// if 2. is not executed, then 1 can't be repeated
/*(function(){

    function SquatCalibratedGesture(){}

    var TRESHOLD = 0.15; // the minimum distance for we consider a sqat has executed

    var _gestureTrack = {};
    

    // the hipeCenter joint is down
    function squatSegment1(skeleton)
    {
        var calibSkel = KinectGestures.PlayerRegister.getRefSkeletonById(skeleton.trackingId);
        if (calibSkel){
            var dif = calibSkel.joints[JointType.HipCenter].position.y - skeleton.joints[JointType.HipCenter].position.y;
            //window.log(dif);
            if (dif >= TRESHOLD){
                return true;
            }
        }
        return false;
    }

    // the hipeCenter joint is up
    function squatSegment2(skeleton)
    {
        
        var calibSkel = KinectGestures.PlayerRegister.getRefSkeletonById(skeleton.trackingId);
        if (calibSkel){
            var dif = calibSkel.joints[JointType.HipCenter].position.y - skeleton.joints[JointType.HipCenter].position.y;
            //window.log(dif);
            if (dif < TRESHOLD){
                return true;
            }
        }
        return false;
    }

    var _segments = [];
    _segments.push(squatSegment1);
    _segments.push(squatSegment2);
    
    function resetGesture(trackingId)
    {   
        if (_gestureTrack[trackingId]){
            _gestureTrack[trackingId] = null;
            delete _gestureTrack[trackingId];
        } 
    }

    var ti = 0;

    SquatCalibratedGesture.update = function(skeleton){

        if (!_gestureTrack[skeleton.trackingId]){

            _gestureTrack[skeleton.trackingId] = {
                currentSegment:0,
                //frameWaveCount:0
            }
        }

        var result = _segments[_gestureTrack[skeleton.trackingId].currentSegment](skeleton);

        if (result === true)
        {
            // we are goind down
            if (_gestureTrack[skeleton.trackingId].currentSegment === 0)
            {
                
                ti++;
                window.log('squat: ' + ti);

                var eventData = {
                    'trackingId': skeleton.trackingId,
                };
                
                KinectGestures.emit('squat',eventData);

                _gestureTrack[skeleton.trackingId].currentSegment = 1;
            }
            // we are going up, we can reset
            else{
                _gestureTrack[skeleton.trackingId].currentSegment = 0;
            }  
        }              
    }               

    KinectGestures.SquatCalibratedGesture = SquatCalibratedGesture;

})();*/

