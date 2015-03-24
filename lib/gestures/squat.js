window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    // 
    function SquatCondition(person, params){

        var _person = person;
        var _index = 0;
        var _checker = _person.checker;

        var UpperBound = 2;

        this.Check = function(skeleton)
        {
             
            // the skeleton should be tracked, well formed on the lower part, and in standing up position
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'lower', true, 'standup')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }  
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
    //SquatGesture.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(SquatGesture, KinectGestures.GestureChecker);
    
    function SquatGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.Squat;
        this.person = person;
        this.timeout = 700;
        this.conditions = [ new SquatCondition(person) ];
    }

    KinectGestures.SquatGesture = SquatGesture;

})();



// SquatCalibratedGesture gesture
// a gesture based on calibrated skeleton
// to detect if there is a squat
(function(){

    function SquatCalibratedCondition(person, params){

        var _person = person;
        var _checker = _person.checker;
        var _currPos = '';
        
        
        this.Check = function(skeleton)
        {   
            // the skeleton should be tracked, well formed on the lower part
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton, 'lower')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }

            var calibSkel = KinectGestures.PlayerRegister.getRefSkeletonById(skeleton.trackingId);
            if (calibSkel){
                var dif = calibSkel.joints[JointType.HipCenter].position.y - skeleton.joints[JointType.HipCenter].position.y;
                //KinectGestures.log(dif);
                var newPos = dif >= SquatCalibrated.Options.Threshold ? 'down' : 'up';
                if (_currPos != newPos){
                    var res = {res:1, args:{newPosition:newPos, oldPosition:_currPos}};
                    _currPos = newPos;
                    return res;
                }
            }
        }
    }

    // Gesture class
    //SquatCalibrated.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(SquatCalibrated, KinectGestures.GestureChecker);


    // the minimum distance for we consider a squat has executed
    SquatCalibrated.Options = {Threshold:0.15};
    
    function SquatCalibrated(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.SquatPosition;
        this.person = person;
        this.timeout = 0;
        this.conditions = [ new SquatCalibratedCondition(person) ];
    }

    KinectGestures.SquatCalibrated = SquatCalibrated;           

})();

