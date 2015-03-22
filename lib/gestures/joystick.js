window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){


    function JoystickCondition(person, dynamic){

        var _person = person;
        var _hand = JointType.HandRight;
        var _checker = _person.checker;
        var _dyn = dynamic;
        var _last = {x:0, y:0, z:0};
        var EPSILON = 0.01;
        var ApproximationValue = 5.0;
        
        this.Check = function(skeleton)
        {
            
            if ((Math.abs(_last.x - 0.0) < EPSILON && Math.abs(_last.y - 0.0) < EPSILON && Math.abs(_last.z - 0.0) < EPSILON) || 
                (!_dyn && _checker.GetRelativePosition(JointType.Head, JointType.HandLeft)[Direction.Upward] === true))
            {
                _last = skeleton.joints[JointType.HandRight].position;
                //KinectGestures.log('joystic'+)
            }
            else
            {
                var xDiff = skeleton.joints[JointType.HandRight].position.x - _last.x;
                var yDiff = _last.y - skeleton.joints[JointType.HandRight].position.y;
                var zDiff = _last.z - skeleton.joints[JointType.HandRight].position.z;//e.Skeleton.GetPosition(JointType.ShoulderRight).z - e.Skeleton.GetPosition(JointType.HandRight).z;
                if (_dyn)
                {
                    if ((_last.x < skeleton.joints[JointType.ShoulderRight].position.x - 0.2 && xDiff > 0.0) ||
                        (_last.x > skeleton.joints[JointType.ShoulderRight].position.x + 0.4 && xDiff < 0.0))
                    {
                        _last.x += (xDiff / ApproximationValue);
                    }
                    if ((_last.y < skeleton.joints[JointType.ShoulderRight].position.y - 0.3 && yDiff > 0.0) ||
                        (_last.y > skeleton.joints[JointType.ShoulderRight].position.y + 0.3 && yDiff < 0.0))
                    {
                        _last.y += (yDiff / ApproximationValue);
                    }
                }
                var args = 'x:' +xDiff.toFixed(3) + ' y:' + yDiff.toFixed(3) + ' z:' + zDiff.toFixed(3);
                //KinectGestures.log('joystic x:' +xDiff + ' y:' + yDiff + ' z:' + zDiff);
                return {res:1, args:args};
                //FireSucceeded(this, new JoystickGestureEventArgs{x = xDiff, y = yDiff, DistToShoulderz = zDiff});
            }
            
        }

    }

    // Gesture class
    JoystickGesture.inherits(KinectGestures.GestureChecker);
    
    function JoystickGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = 'Joystic';
        this.person = person;
        this.timeout = 5000;
        this.conditions = [ new JoystickCondition( person, false )];
    }

    KinectGestures.JoystickGesture = JoystickGesture;

})();