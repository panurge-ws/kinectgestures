window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

/*

// Wave gesture
// criteria, you should wave 4 times your right hand
// keeping it above your elbow (+ stable position // TODO)
(function(KinectGestures){

    function WaveGesture(){}

    var WINDOW_SIZE = 20; // frame number for a segment is considered still active

    var _gestureTrack = {};
    

    function waveSegment1(skeleton)
    {
        // Hand above elbow
        if (skeleton.joints[JointType.HandRight].position.y > 
            skeleton.joints[JointType.ElbowRight].position.y)
        {
            // Hand right of elbow
            if (skeleton.joints[JointType.HandRight].position.x > 
                skeleton.joints[JointType.ElbowRight].position.x)
            {
                return true;
            }
        }
        return false;
    }

    function waveSegment2(skeleton)
    {
        
        // Hand above elbow
        if (skeleton.joints[JointType.HandRight].position.y > 
            skeleton.joints[JointType.ElbowRight].position.y)
        {
            // Hand left of elbow
            if (skeleton.joints[JointType.HandRight].position.x < 
                skeleton.joints[JointType.ElbowRight].position.x)
            {
                return true;
            }
        }
        return false;
    }

    var _segments = [];
    _segments.push(waveSegment1);
    _segments.push(waveSegment2);
    _segments.push(waveSegment1);
    _segments.push(waveSegment2);
    
    function resetGesture(trackingId)
    {   
        if (_gestureTrack[trackingId]){
            _gestureTrack[trackingId] = null;
            delete _gestureTrack[trackingId];
        }
        
    }

    WaveGesture.update = function(skeleton){

        if (!_gestureTrack[skeleton.trackingId]){

            _gestureTrack[skeleton.trackingId] = {
                currentSegment:0,
                frameWaveCount:0
            }
        }
        var result = _segments[_gestureTrack[skeleton.trackingId].currentSegment](skeleton);

        if (result === true)
        {
            if ((_gestureTrack[skeleton.trackingId].currentSegment + 1) < _segments.length)
            {
                _gestureTrack[skeleton.trackingId].currentSegment++;
                _gestureTrack[skeleton.trackingId].frameWaveCount = 0;
            }
            else
            {   
                var eventData = {
                    'trackingId': skeleton.trackingId,
                    //'player': PlayerRegister.positionPlayer1 && PlayerRegister.positionPlayer1.trackingId === skeleton.trackingId ? 1 : 2,
                    'skeleton': skeleton
                };
                
                KinectGestures.emit('wave',eventData);
                resetGesture(skeleton.trackingId);   
            }
        }
        else
        {   
            if (_gestureTrack[skeleton.trackingId].frameWaveCount > WINDOW_SIZE){
                resetGesture(skeleton.trackingId);
            }
            else{
                _gestureTrack[skeleton.trackingId].frameWaveCount++;
            }   
        }                 
    }               

    KinectGestures.WaveGesture = WaveGesture;

})(window); */




// SwipetGesture
// criteria, you should have your right hand between hip and shoulder
// and execute at x velocity
(function(){


    function WaveCondition(person, segment){

        var _person = person;
        var _hand = JointType.HandRight;
        var _index = 0;
        var _checker = _person.checker;
        var _segment = segment;
        
        this.Check = function(skeleton)
        {
            
            //var handElbow = _checker.GetSteadyPosition(JointType.ElbowRight, _hand, 3);
            //var handspeed = _checker.GetAbsoluteVelocity(_hand);
            // first position: hand above or right of elbow
            //window.log(_index === 0 && (!handElbow[KinectGestures.Direction.Upward] || !handElbow[KinectGestures.Direction.Right]));
            //window.log(_index);
            /*if (_index === 0 && (!handElbow[KinectGestures.Direction.Upward] || !handElbow[KinectGestures.Direction.Right])){
                _index = 0;
                return;
            }
            // second: hand must be above elbow
            if (_index === 1 && !handElbow[KinectGestures.Direction.Upward]){
                _index = 0;
                return {res:0};
            }

            // first: hand right of elbow -> go on;
            if (_index === 0 && handElbow[KinectGestures.Direction.Right] === true){
                _index = 1;
            }
            //window.log(_index);
            // second: hand left of elbow -> secceeded first segment
            if (_index === 1 && handElbow[KinectGestures.Direction.Left] === true)
            {   
                _index = 0;
                //window.log('wave');
                var eventData = {
                    'skeleton': skeleton
                };
                return {res:1, args:eventData};
            }*/

            // Hand above elbow
            if (skeleton.joints[JointType.HandRight].position.y < 
                skeleton.joints[JointType.ElbowRight].position.y)
            {
                _index = 0;
                return {res:0};
            }

            if (_index === 0)
            {
                
                // Hand right of elbow
                if (skeleton.joints[JointType.HandRight].position.x > 
                    skeleton.joints[JointType.ElbowRight].position.x)
                {
                    _index = 1;
                }
                
            }
            if (_index === 1)
            {
                // Hand left of elbow
                if (skeleton.joints[JointType.HandRight].position.x < 
                    skeleton.joints[JointType.ElbowRight].position.x)
                {
                    _index = 0;
                    var eventData = {
                        'skeleton': skeleton
                    }
                    return {res:1, args:eventData};
                }
                
            }
           
            
        }

        this.Reset = function()
        {
            _index = 0;
            _direction = KinectGestures.SkeletonMath.Direction.None;
        }

    }

    // Gesture class
    WaveGesture.inherits(KinectGestures.GestureChecker);
    
    function WaveGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = 'wave';
        this.person = person;
        this.timeout = 800;
        this.conditions = [ new WaveCondition( person, 0 ), new WaveCondition( person, 1 )];
    }

    KinectGestures.WaveGesture = WaveGesture;

})();
