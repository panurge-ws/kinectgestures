window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

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
            
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'upper')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }
            //else{
                //KinectGestures.log('skeletonStability->true');
            //}
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
    //WaveGesture.inherits(KinectGestures.GestureChecker);

    KinectGestures.Utils.Inherits(WaveGesture, KinectGestures.GestureChecker);
    
    function WaveGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.Wave;
        this.person = person;
        this.timeout = 800;
        this.conditions = [ new WaveCondition( person, 0 ), new WaveCondition( person, 1 )];
    }

    KinectGestures.WaveGesture = WaveGesture;

})();
