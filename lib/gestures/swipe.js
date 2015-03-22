window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// SwipetGesture
// criteria, you should have your right hand between hip and shoulder
// and execute at x velocity
(function(){


    function SwipeCondition(person, options){

        var _person = person;
        var _hand = null;
        var _allowedDirections = null;
        var _direction = KinectGestures.SkeletonMath.Direction.None;
        var _index = 0;
        var _checker = _person.checker;

        var LowerBoundForSuccess = 2;
        var LowerBoundForVelocity = 1.8;

        // set options
        // TODO make editable on runtime
        _hand = options && options.Hand ? options.Hand : JointType.HandRight;
            
        var _allowedDirectionsParams = options && options.AllowedDirections ? options.AllowedDirections : [KinectGestures.Direction.Left,KinectGestures.Direction.Right];
        _allowedDirections = {};
        if (typeof _allowedDirectionsParams === 'object' && _allowedDirectionsParams.length > 0)
        {
            for (var i = _allowedDirectionsParams.length - 1; i >= 0; i--) {
                _allowedDirections[_allowedDirectionsParams[i]] = true;
            }
        }
        else{
            _allowedDirections[_allowedDirectionsParams] = true;
        }

        
        this.Check = function(skeleton)
        {
            
            var handToHipOrientation = _checker.GetRelativePosition(JointType.HipCenter, _hand);
            var handToShoulderOrientation = _checker.GetRelativePosition(JointType.ShoulderCenter, _hand);
            var handMovement = _checker.GetAbsoluteMovement(_hand);
            var handVelocity = _checker.GetRelativeVelocity(JointType.HipCenter, _hand);
            //KinectGestures.log(JSON.stringify(handMovement));
            
            if (handVelocity < LowerBoundForVelocity)
            {
                this.Reset();
                return {res:0};
            }
                // hand is in front of the body and between hip and shoulders
            else if (handToHipOrientation[KinectGestures.Direction.Forward] === true 
                && handToShoulderOrientation[KinectGestures.Direction.Downward] === true)
            {
                //KinectGestures.log(_direction);
                // movement did not start yet, initializing
                if (_direction == KinectGestures.Direction.None)
                {
                    // left or right movement is prefered
                    if (handMovement[KinectGestures.Direction.Left] === true && _allowedDirections[KinectGestures.Direction.Left] === true)
                    {
                        _direction = KinectGestures.Direction.Left;
                    }
                    else if (handMovement[KinectGestures.Direction.Right] === true && _allowedDirections[KinectGestures.Direction.Right] === true)
                    {
                        _direction = KinectGestures.Direction.Right;
                    }
                    else
                    {
                        // take other direction
                        //direction = handMovement;
                        // TODO check?
                        this.Reset();
                        return {res:0};
                    }
                }
                else if (!handMovement[_direction] && handVelocity < 1)
                {
                    // direction changed
                    //KinectGestures.log(handVelocity);
                    this.Reset();
                    return {res: 0};
                }
                else
                {
                    if (_index >= LowerBoundForSuccess)
                    {
                        var res = {res:1, args:_direction};
                        this.Reset();
                        return res;
                    }
                    else
                    {
                        // step successful, waiting for next
                        _index++;
                        return {res: -1};
                    }
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
    SwipeGesture.inherits(KinectGestures.GestureChecker);

    SwipeGesture.Options = {Hand:JointType.HandRight, AllowedDirections:[KinectGestures.Direction.Left, KinectGestures.Direction.Right]};

    
    function SwipeGesture(person, options)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.Swipe;
        this.person = person;
        this.timeout =  1000;
        this.conditions = [ new SwipeCondition(person, SwipeGesture.Options )];
    }

    KinectGestures.SwipeGesture = SwipeGesture;




})();