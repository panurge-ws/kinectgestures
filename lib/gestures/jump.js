window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};


(function(){

    function JumpCondition(person, params){

        var _person = person;
        var _index = 0;
        var _indexConcurrencies = 0;
        var _checker = _person.checker;
        var _startTime = 0;
        var _concurrenciesTimeout = 600;



        
        this.Check = function(skeleton)
        {
            // we have just jumped
            //KinectGestures.log(_index);
            
            
            var footRightMovement = _checker.GetSteadyAbsoluteMovement(JointType.AnkleRight, 3);
            var footLeftMovement = _checker.GetSteadyAbsoluteMovement(JointType.AnkleLeft, 3);
            var footRAbsMovoment = _checker.GetSteadyAbsoluteMovement(JointType.AnkleRight, 5);
            var footLAbsMovoment = _checker.GetSteadyAbsoluteMovement(JointType.AnkleLeft, 5);
            
            //var ankleRightVelocity = _checker.GetAbsoluteVelocity(JointType.AnkleRight);

            // feet steady in last 5 frames
            if (_index === 0 && 
                (
                    footRAbsMovoment[KinectGestures.Direction.Left] || footRAbsMovoment[KinectGestures.Direction.Right] ||
                    footLAbsMovoment[KinectGestures.Direction.Left] || footLAbsMovoment[KinectGestures.Direction.Right]
                )
            ){
                return;
            }

            // going upward with both feet
            if (_index === 0 && footRightMovement[KinectGestures.Direction.Upward] === true && footLeftMovement[KinectGestures.Direction.Upward]){
                
                _index = 1;
                this.SetConcurrencies();
                _concurrenciesTimeout = 700;
                _startTime = Date.now();
            }
            
            // going down in 15 frames -> succed but not reset
            else if (_index >= 1 && _index < JumpGesture.Options.WindowSize && footRightMovement[KinectGestures.Direction.Downward] === true && footLeftMovement[KinectGestures.Direction.Downward] === true){
                this.Reset(true);
                _concurrenciesTimeout = 400;
                return {res:1, args:''};
            }
            else{
                if (_index >= JumpGesture.Options.WindowSize)
                {
                    this.Reset(true);
                }
                else if (_index >= 1){
                    _index++;
                }
            }

            if (_startTime > 0 && Date.now() - _startTime > _concurrenciesTimeout)
            {
                this.ResetConcurrencies();
            } 
        }

        this.Reset = function(upper)
        {
            _index = 0;
            _fired = false;
        }

        this.SetConcurrencies = function()
        {
            if (!KinectGestures.GestureManager.gesturesInProgress[person.trackingId]){
                KinectGestures.GestureManager.gesturesInProgress[person.trackingId] = {};
            }
            KinectGestures.GestureManager.gesturesInProgress[person.trackingId]['jump'] = true;
        }

        this.ResetConcurrencies = function()
        {
            _startTime = 0;
            if(KinectGestures.GestureManager.gesturesInProgress 
                && KinectGestures.GestureManager.gesturesInProgress[person.trackingId] 
                    && KinectGestures.GestureManager.gesturesInProgress[person.trackingId]['jump'])
            {
                KinectGestures.GestureManager.gesturesInProgress[person.trackingId]['jump'] = null;
                delete KinectGestures.GestureManager.gesturesInProgress[person.trackingId]['jump'];

            }
        }

    }

    // Gesture class
    JumpGesture.inherits(KinectGestures.GestureChecker);

    JumpGesture.Options = {WindowSize:15};
    
    function JumpGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.Jump;
        this.person = person;
        this.timeout = 0;
        this.conditions = [ new JumpCondition(person) ];
    }

    KinectGestures.JumpGesture = JumpGesture;

})();


// JumpCalibratedGesture gesture
// a gesture based on calibrated skeleton
// to detect if there is a jump
// the gesture is defined by two movements
// 1. going up
// 2. going down
// if 2. is not executed, then 1 can't be repeated
(function(){

    function JumpCalibratedCondition(person, params){

        var _person = person;
        var _currPos = '';
        var _index = 0;
        var _checker = _person.checker;
        
        function calcFeetPosition(skeleton)
        {
            return Math.min(skeleton.joints[JointType.FootLeft].position.y, skeleton.joints[JointType.FootRight].position.y) / 1;   
        }
        this.Check = function(skeleton)
        {
            var hipAbsMovoment = _checker.GetSteadyAbsoluteMovement(JointType.HipCenter, 5);
            // body steady in last 5 frames
            if (_index === 0 && 
                (
                    hipAbsMovoment[KinectGestures.Direction.Left] || hipAbsMovoment[KinectGestures.Direction.Right]
                )
            ){
                return;
            }

            var calibSkel = KinectGestures.PlayerRegister.getRefSkeletonById(skeleton.trackingId);
            
            if (calibSkel){
            
                var feetPosCalib = calcFeetPosition(calibSkel);
                var feetPos = calcFeetPosition(skeleton);
                var dif = feetPosCalib - feetPos;
                //
                if (_index === 0 && -dif >= JumpCalibratedGesture.Options.Threshold)
                {
                    _index = 1;
                }
                else if (_index === 1 && -dif < JumpCalibratedGesture.Options.Threshold)
                {   
                    _index = 2;
                    //KinectGestures.log(dif);
                    var res = {res:1, args:{}};
                    return res;
                }
                if (_index >= 2)
                {
                    _index++;
                    if (_index >= JumpCalibratedGesture.Options.WindowSize){
                        _index = 0;
                    }
                }
            }
        }

    }

    // Gesture class
    JumpCalibratedGesture.inherits(KinectGestures.GestureChecker);

    // Threshold: the minimum distance for we consider a jump has executed
    // WindowSize: frame to wait before detect a new jump
    JumpCalibratedGesture.Options = {Threshold:0.05, WindowSize:4};
    
    function JumpCalibratedGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.JumpPosition;
        this.person = person;
        this.timeout = 0;
        this.conditions = [ new JumpCalibratedCondition(person) ];
    }

    KinectGestures.JumpCalibratedGesture = JumpCalibratedGesture;           

})();