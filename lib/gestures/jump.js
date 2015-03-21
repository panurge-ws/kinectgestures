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
            //window.log(_index);
            
            
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
                _startTime = Date.now();
            }
            
            // going down in 15 frames -> succed but not reset
            else if (_index >= 1 && _index < 15 && footRightMovement[KinectGestures.Direction.Downward] === true && footLeftMovement[KinectGestures.Direction.Downward] === true){
                this.Reset(true);
                return {res:1, args:''};
            }
            else{
                if (_index >= 15)
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
            //console.log('Reset',_index, upper);
            //window.log('jump reset: ' + _index);
            _index = 0;
            _fired = false;
            //this.ResetConcurrencies();
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
            //window.log('ResetConcurrencies');
        }

    }

    // Gesture class
    JumpGesture.inherits(KinectGestures.GestureChecker);
    
    function JumpGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = 'jump';
        this.person = person;
        this.timeout = 0;
        this.conditions = [ new JumpCondition(person) ];
    }

    KinectGestures.JumpGesture = JumpGesture;

})();



/*
// JumpCalibratedGesture gesture
// a gesture based on calibrated skeleton
// to detect if there is a jump
// the gesture is defined by two movements
// 1. going up
// 2. going down
// if 2. is not executed, then 1 can't be repeated
(function(KinectGestures){

    function JumpCalibratedGesture(){}

    var TRESHOLD = 0.05; // the minimum distance for we consider a jump has executed

    var _gestureTrack = {};
    
    function calcFeetPosition(skeleton)
    {
        return Math.min(skeleton.joints[JointType.FootLeft].position.y, skeleton.joints[JointType.FootRight].position.y) / 1;   
    }

    // the feet are up
    function jumpSegment1(skeleton)
    {
        var calibSkel = PlayerRegister.getRefSkeletonById(skeleton.trackingId);
        if (calibSkel){
            var dif = calcFeetPosition(skeleton) - calcFeetPosition(calibSkel);
            //window.log(dif);
            if (dif >= TRESHOLD){
                return true;
            }
        }
        return false;
    }

    // the feet are down
    function jumpSegment2(skeleton)
    {
        
        var calibSkel = PlayerRegister.getRefSkeletonById(skeleton.trackingId);
        if (calibSkel){
            var dif = calcFeetPosition(skeleton) - calcFeetPosition(calibSkel);
            //window.log(dif);
            if (dif < TRESHOLD){
                return true;
            }
        }
        return false;
    }

    var _segments = [];
    _segments.push(jumpSegment1);
    _segments.push(jumpSegment2);
    
    function resetGesture(trackingId)
    {   
        if (_gestureTrack[trackingId]){
            _gestureTrack[trackingId] = null;
            delete _gestureTrack[trackingId];
        } 
    }

    var ti = 0;

    JumpCalibratedGesture.update = function(skeleton){

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
                window.log('jump: ' + ti);

                var eventData = {
                    'trackingId': skeleton.trackingId,
                };
                
                KinectGestures.emit('jump',eventData);

                _gestureTrack[skeleton.trackingId].currentSegment = 1;
            }
            // we are going up, we can reset
            else{
                _gestureTrack[skeleton.trackingId].currentSegment = 0;
            }  
        }              
    }               

    KinectGestures.JumpCalibratedGesture = JumpCalibratedGesture;

})(window);
*/