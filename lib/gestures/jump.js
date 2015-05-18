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
            
            // the skeleton should be tracked, well formed on the lower part, and in standing up position
            if (KinectGestures.options.checkStability && !KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'lower', true, 'standup')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }
            /*else{
                KinectGestures.log('skeletonStability->true');
            }*/

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
    //JumpGesture.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(JumpGesture, KinectGestures.GestureChecker);


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
// 1. going up of both feet
// 2. going down of both feet
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
            // the skeleton should be tracked, well formed on the lower part, and in standing up position
            if (KinectGestures.options.checkStability && !KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton, 'lower', true, 'standup')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }


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
    KinectGestures.Utils.Inherits(JumpCalibratedGesture, KinectGestures.GestureChecker);

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


// JumpCalibratedGestureHip gesture
// a gesture based on calibrated skeleton
// to detect if there is a jump
// the gesture is defined by one movements
// 1. going up of the hip

// if 2. is not executed, then 1 can't be repeated
(function(){

    function JumpCalibratedHipCondition(person, params){

        var _person = person;
        var _currPos = '';
        var _index = 0;
        var _checker = _person.checker;
        
        
        this.Check = function(skeleton)
        {
            // the skeleton should be tracked, well formed on the lower part, and in standing up position
            /*if (KinectGestures.options.checkStability && !KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton, 'lower', true, 'standup')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }*/


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
            
                var hipPosCalib = calibSkel.joints[JointType.HipCenter].position.y;
                var hipPos = skeleton.joints[JointType.HipCenter].position.y;;
                var dif = hipPosCalib - hipPos;

                // KinectGestures.log(dif);
                if (_index === 0 && -dif >= JumpCalibratedHipGesture.Options.Threshold)
                {
                    
                    _index = 1;
                    var res = {res:1, args:{}};
                    return res;
                }
                else if (_index === 1 && -dif < JumpCalibratedHipGesture.Options.Threshold)
                {   
                    _index = 2;
                    //KinectGestures.log(dif);
                    
                }
                if (_index >= 2)
                {
                    _index++;
                    if (_index >= JumpCalibratedHipGesture.Options.WindowSize){
                        _index = 0;
                    }
                }
            }
        }

    }

    // Gesture class
    KinectGestures.Utils.Inherits(JumpCalibratedHipGesture, KinectGestures.GestureChecker);

    // Threshold: the minimum distance for we consider a jump has executed
    // WindowSize: frame to wait before detect a new jump
    JumpCalibratedHipGesture.Options = {Threshold:0.1, WindowSize:3};
    
    function JumpCalibratedHipGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.JumpPositionHip;
        this.person = person;
        this.timeout = 0;
        this.conditions = [ new JumpCalibratedHipCondition(person) ];
    }

    KinectGestures.JumpCalibratedHipGesture = JumpCalibratedHipGesture;           

})();