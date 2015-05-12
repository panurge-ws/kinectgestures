// inherits utils


window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

	if (!Kinect){
		throw "Kinect 1.8.0 SDK required";
		return;
	}

	var _sensor = null;
	
	KinectGestures.options = {
		debug:false, 
		registerPlayer:true, 
		numPlayersToRegister:1,
		canvasElementID:false, 
		log:false, 
		logElementID:null
	};

	KinectGestures.GestureType = {
		'Wave':'wave',
		'Jump':'jump',
		'JumpPosition':'jumpPosition',
		'Squat':'squat',
		'SquatPosition':'squatPosition',
		'Swipe':'swipe',
		'PlayerPosition':'playerPosition',
		'Joystick':'joystick'
	};

	KinectGestures.EventType = {
		'PlayerEngagedAgain':'playerEngagedAgain',
		'PlayerLost':'playerLost',
		'PlayersTracked':'playersTracked',
		'PlayerTracked':'playerTracked',
		'PlayerRegister':'playerRegister',
	};

	KinectGestures.MapTypeClass = {
		'wave': 'WaveGesture',
		'jump': 'JumpGesture',
		'jumpPosition': 'JumpCalibratedGesture',
		'squat': 'SquatGesture',
		'squatPosition': 'SquatCalibrated',
		'swipe': 'SwipeGesture',
		'playerPosition': 'PlayerPosition',
		'joystick': 'JoystickGesture'
	};

	function onStreamFrame(frame)
	{
		if (frame.stream === Kinect.SKELETON_STREAM_NAME)
        {
        	if (KinectGestures.options.debug){
        		KinectGestures.DebugDrawer.update(frame);
        	}
            
            if (KinectGestures.options.registerPlayer) 
            {
            	if (KinectGestures.PlayerRegister.started === false){
	                KinectGestures.PlayerRegister.init();
	                KinectGestures.PlayerRegister.started = true;
	            }

	            KinectGestures.PlayerRegister.update(frame);
            }

            KinectGestures.GestureManager.update(frame);
        }
	}

	function registerGesture(eventName){

		//console.log('KinectGestures.GestureManager.registerGestures:'+ eventName);
		
		if (KinectGestures.MapTypeClass[eventName]){
			KinectGestures.GestureManager.registerGesture(KinectGestures[KinectGestures.MapTypeClass[eventName]]);
		}
	}

	function unregisterGesture(eventName){
		if (KinectGestures.MapTypeClass[eventName]){
			KinectGestures.GestureManager.unregisterGesture(KinectGestures.MapTypeClass[eventName]);
		}
	}

	KinectGestures.init = function(sensor, options)
	{
		if (!sensor)
		{
			throw "You need to set a sensor";
			return;
		}

		_sensor = sensor;

		if (options){

			for(var k in KinectGestures.options)
			{
				if (typeof options[k] !== 'undefined')
				{
					KinectGestures.options[k] = options[k];
				}
			}
		}

		if (KinectGestures.options.debug && KinectGestures.options.canvasElementID){
			KinectGestures.DebugDrawer.CanvasElemntID = KinectGestures.options.canvasElementID;
		}

		KinectGestures.enable();
	}

	KinectGestures.enable = function()
	{
		if (_sensor){
			_sensor.addStreamFrameHandler( onStreamFrame );
			_sensor.connect();
		}
		
	};

	KinectGestures.disable = function()
	{
		if (_sensor){
			_sensor.removeStreamFrameHandler( onStreamFrame );
			_sensor.disconnect();
		}
	};

	KinectGestures.toggleDebugMode = function()
	{
		KinectGestures.options.debug = !KinectGestures.options.debug;
	};

	// events emitter / listener
    KinectGestures.emitter = document.createElement('div');

    KinectGestures.emit = function(eventName, eventData)
    {   
        var event = document.createEvent('Event');
        event.initEvent(eventName, true, true);
        event.data = eventData;
        KinectGestures.emitter.dispatchEvent(event);
    }

    KinectGestures.addEventListener = function(eventName, handler)
    {
    	registerGesture(eventName);
        KinectGestures.emitter.addEventListener(eventName,handler);
    }
    KinectGestures.removeEventListener = function(eventName, handler)
    {
    	unregisterGesture(eventName);
        KinectGestures.emitter.removeEventListener(eventName, handler);
    }

    KinectGestures.on = KinectGestures.addEventListener;    
    KinectGestures.off = KinectGestures.removeEventListener;

    
    // Logging
    var logElement = null;
    KinectGestures.log = function(msg)
    {	
    	if (!logElement && KinectGestures.options.logElementID && KinectGestures.options.log){
    		logElement = document.getElementById(KinectGestures.options.logElementID)
    	}

    	if (logElement){
    		logElement.innerHTML = msg;
    	}
    }



    // utils // TODO move in other file
    KinectGestures.Utils = {}

    KinectGestures.Utils.Inherits = function(functionExtending, superFunction){
    	functionExtending.prototype = Object.create(superFunction.prototype);
    }

    /*Function.prototype.inherits = function(parent) {
	  this.prototype = Object.create(parent.prototype);
	};*/

})();
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    function GestureChecker(person){

        this.person = person;
        this.gestureName = '';
        this.timeout = 0;
        this.conditions = [];

        var _conditionIndex = 0;
        var _startTime = 0;
        var ti = 0;

        this.Check = function(skeleton)
        {
            
            var result = this.conditions[_conditionIndex].Check(skeleton);
            
            if (result)
            {
                //KinectGestures.log(result.res + ' - ' + this.gestureName);
                switch(result.res)
                {
                    case 0:
                        this.Reset();
                        break;
                    case 1:
                        //KinectGestures.log('_conditionIndex'+_conditionIndex)
                        if (_conditionIndex === this.conditions.length-1)
                        {   
                            
                            ti++;
                            
                            KinectGestures.log(this.gestureName + ": " + JSON.stringify(result.args) + " - ti:" + ti);
                            
                            var eventData = result.args ? result.args : {};
                            eventData.trackingId = skeleton.trackingId;
                            KinectGestures.emit(this.gestureName, eventData);
                            this.Reset();
                        }
                        else{
                            //KinectGestures.log('_conditionIndex'+_conditionIndex)
                            _startTime = Date.now();
                            _conditionIndex++;
                        }
                        
                    case -1:
                        // continue: let's decide the condition itself to reset
                        break;
                }
            }

            if (this.timeout > 0 && _startTime <= Date.now() - this.timeout)
            {
                this.Reset();
            }
        }

        this.Reset = function()
        {
            _conditionIndex = 0;
            _startTime = Date.now();
        }
    }

    KinectGestures.GestureChecker = GestureChecker;

})();

window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

window.JointType = window.KinectGestures.JointType = {
  'HandRight': 11,
  'WristRight': 10,
  'ElbowRight': 9,
  'ShoulderRight': 8,
  'ShoulderCenter': 2,
  'ShoulderLeft': 4,
  'ElbowLeft': 5,
  'WristLeft': 6,
  'HandLeft': 7,
  'Head': 3,
  'Spine': 1,
  'HipCenter': 0,
  'FootRight': 19,
  'AnkleRight': 18,
  'KneeRight': 17,
  'HipRight': 16,
  'HipLeft': 12,
  'KneeLeft': 13,
  'AnkleLeft': 14,
  'FootLeft': 15
};

(function(){

    var trackedSkeletons = [];

    var FRAME_CHECK_TRACKING = 50,
        frameCount = 0,
        currentlyTrackedPlayers = [];

    function GestureManager(){}

    GestureManager.registeredGestures = [];

    GestureManager.gesturesInProgress = {};

    GestureManager.registerGesture = function(gestureClass)
    {
        if (GestureManager.registeredGestures.indexOf(gestureClass) >= 0)
        {
            return;
        }

        GestureManager.registeredGestures.push(gestureClass);
        KinectGestures.PersonManager.updateGestures();
    }

    GestureManager.unregisterGesture = function(gestureClass)
    {
        if (GestureManager.registeredGestures.indexOf(gestureClass) === -1)
        {
            return;
        }
        if (gestureClass.destroy){
            gestureClass.destroy();
        }
        GestureManager.registeredGestures.splice(GestureManager.registeredGestures.indexOf(gestureClass),1);
        KinectGestures.PersonManager.updateGestures();
    }

    

    GestureManager.update = function(frame){
        
        trackedSkeletons = [];

        for (var i = frame.skeletons.length - 1; i >= 0; i--) {
            if (frame.skeletons[i].trackingState > 0){
                trackedSkeletons.push(frame.skeletons[i]);
            }
        }

        GestureManager.checkSkeletonTracking(trackedSkeletons);

        if (trackedSkeletons.length > 0){

            if (frameCount >= FRAME_CHECK_TRACKING){
                KinectGestures.PlayerRegister.checkSkeletonTracking(trackedSkeletons);
                KinectGestures.PersonManager.checkSkeletonTracking(trackedSkeletons);
                frameCount = 0;
            }
            else{
                frameCount++;
            }
            
            for (var k = trackedSkeletons.length - 1; k >= 0; k--) {
                KinectGestures.PersonManager.update(trackedSkeletons[k]);
                /*for (var j = registeredGestures.length - 1; j >= 0; j--) {
                    registeredGestures[j].update(trackedSkeletons[k]);    
                }*/
            }
        }
        
    };

    GestureManager.checkSkeletonTracking = function(trackedSkeletons)
    {
        // TODO enable / disable this feature
        // we've lost someone 
        if (trackedSkeletons.length < currentlyTrackedPlayers.length)
        { 
            var find = false;
            // lost everybody
            if (trackedSkeletons.length === 0)
            {
              for (var i = currentlyTrackedPlayers.length - 1; i >= 0; i--) {
                var player = KinectGestures.PlayerRegister.getPlayerById(currentlyTrackedPlayers[i].trackingId);
                KinectGestures.emit(KinectGestures.EventType.PlayerLost, {trackingId:currentlyTrackedPlayers[i].trackingId, playerNum:player ? player.playerNum : -1, relativePosition:currentlyTrackedPlayers[i].position.x <= 0 ? 1 : 2});
              }
            }
            else{ 

              // find who is lost
              var losts = [];
              for (var i = currentlyTrackedPlayers.length - 1; i >= 0; i--) {
                var found = false;
                for (var j = trackedSkeletons.length - 1; j >= 0; j--) {
                  if (trackedSkeletons[j].trackingId === currentlyTrackedPlayers[i].trackingId){
                    found = true;
                    break;
                  }
                }
                if (!found){
                  losts.push(currentlyTrackedPlayers[i]);
                }
              }

              for (i = losts.length - 1; i >= 0; i--) {
                var player = KinectGestures.PlayerRegister.getPlayerById(losts[i].trackingId);
                KinectGestures.emit(KinectGestures.EventType.PlayerLost, {trackingId:losts[i].trackingId, playerNum:player ? player.playerNum : -1, relativePosition:losts[i].position.x <= 0 ? 1 : 2});
              }
            } 
        }

        currentlyTrackedPlayers = trackedSkeletons;
    }

    KinectGestures.GestureManager = GestureManager;

})();
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    
    function PersonManager(){}

    PersonManager.persons = {};

    PersonManager.update = function(skeleton)
    {

        var person;
        if (!PersonManager.persons[skeleton.trackingId])
        {
            person = new Person(skeleton.trackingId);
            PersonManager.persons[skeleton.trackingId] = person;
            person.Init();
        }
        else{
            person = PersonManager.persons[skeleton.trackingId];
        }

        person.CheckGestures(skeleton);
    }

    PersonManager.getPerson = function(trackingId)
    {
        if (PersonManager.persons[trackingId])
        {
            return PersonManager.persons[trackingId];
        }
        return null;
    }

    PersonManager.updateGestures = function()
    {
        for(var item in PersonManager.persons)
        {
            PersonManager.persons[item].updateGestures();
        }
    }

    PersonManager.checkSkeletonTracking = function(trackedSkeletons)
    {
        for(var item in PersonManager.persons)
        {
            var found = false;
            for (var i = trackedSkeletons.length - 1; i >= 0; i--) {
                if (trackedSkeletons[i].trackingId === PersonManager.persons[item].trackingId){
                    found = true;
                    break;
                }
            }
            if (!found){
                PersonManager.persons[item] = null;
                delete PersonManager.persons[item];
            }
            
        }
    }

    KinectGestures.PersonManager = PersonManager;



    // **********************
    //
    //
    // PERSON
    //
    //
    // **********************


    var SKELETON_TO_STORE = 8;

    function Person(trackingId){
        
        var self = this;

        self.trackingId = trackingId;
        self.frames = [];
        self.checker = null;
        self.gestures = [];
    }

    Person.prototype.UpdateGestures = function()
    {
        this.gestures = [];
        for (var i = KinectGestures.GestureManager.registeredGestures.length - 1; i >= 0; i--) {
            this.gestures.push(new KinectGestures.GestureManager.registeredGestures[i](this))
        }
    }

    Person.prototype.Init = function()
    {
        this.checker = new KinectGestures.Checker(this);
        this.UpdateGestures();
    }

    Person.prototype.GetLastSkeleton = function(frame)
    {
        if (frame > this.frames.length-1 || frame < 0)
        {
            return null;
        }
        return this.frames[this.frames.length-frame-1] ? this.frames[this.frames.length-frame-1].Skeleton : null; 
    }

    Person.prototype.CheckGestures = function(skeleton)
    {
        this.frames.push({Skeleton:skeleton, Timestamp:Date.now()});
        
        if (this.frames.length === SKELETON_TO_STORE){
            this.frames.shift();
        }

        for (var i = this.gestures.length - 1; i >= 0; i--) {
            this.gestures[i].Check(skeleton);
        }
    }

    Person.prototype.GetLastFrame = function(frame)
    {
        if (frame > this.frames.length-1 || frame < 0)
        {
            return null;
        }
        return this.frames[this.frames.length-frame-1] ? this.frames[this.frames.length-frame-1] : null; 
    }

    Person.prototype.CurrentSkeleton = function()
    {
        return this.frames[this.frames.length-1].Skeleton;
    }

    /// <summary>
    /// Time-difference between two skeletons
    /// </summary>
    /// <param name="first">Relative number of the first frame</param>
    /// <param name="second">Relative number of the second frame</param>
    /// <returns>Milliseconds passed between</returns>
    Person.prototype.MillisBetweenFrames = function(first, second) //get timedifference in millisconds between skeletons
    {
        var diff = (this.GetLastFrame(second).Timestamp - this.GetLastFrame(first).Timestamp);
        //KinectGestures.log(diff);
        //Debug.WriteLineIf(diff < 0, "Time Difference negative in MillisBetweenFrame");
        return diff;
    }

    KinectGestures.Person = Person;
    

})();
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// porting of 
// https://gesturedetector.codeplex.com/SourceControl/latest#GestureDetector/Tools/Checker.cs
(function(){

    
    /// <summary>
    /// Instantiates a Checker with a Person to check on.</summary>
    /// <param name="p">
    /// The Person with a set of Kinect skeletons to check on.</param>
    function Checker(person){
        var self = this;
        this.person = person;
    }


    /// <summary>
    /// Get a joints absolute velocity. If theres not enough skeleton information,
    /// precision is decreased automatically.</summary>
    /// <param name="type">
    /// The JointType to get velocity from.</param>
    /// <returns>
    /// Returns the absolute velocity in meters</returns>
    Checker.prototype.GetAbsoluteVelocity = function(jointType)
    {
        if (!this.HasSkeleton(1))
        {
            return 0;
        }
        if (!this.HasSkeleton(3))
        {   
            return this.SimpleAbsoluteVelocity(jointType, 0, 1);
        }
        return KinectGestures.SkeletonMath.Median(this.SimpleAbsoluteVelocity(jointType, 0, 1), this.SimpleAbsoluteVelocity(jointType, 1, 2), this.SimpleAbsoluteVelocity(jointType, 2, 3));
    }

    /// <summary>
    /// Simply calculates the velocity of a joint. Takes two versions.</summary>
    /// <param name="type">
    /// The JointType to get velocity from.</param>
    /// <param name="firstTime">
    /// First index of the persons cached skeletons</param>
    /// <param name="secondTime">
    /// Second index of the persons cached skeletons</param>
    /// <returns>
    /// Returns the absolute velocity in meters</returns>
    Checker.prototype.SimpleAbsoluteVelocity = function(jointType, firstTime, secondTime)
    {
        if (!this.HasSkeleton(firstTime) || !this.HasSkeleton(secondTime))
        {
            throw "No Skeleton at this Index";
        }
        //KinectGestures.log(KinectGestures.SkeletonMath.DistanceBetweenPoints(this.person.GetLastSkeleton(firstTime).joints[jointType].position, this.person.GetLastSkeleton(secondTime).joints[jointType].position))
        //KinectGestures.log(this.person.GetLastSkeleton(firstTime).joints[jointType].position.x - this.person.GetLastSkeleton(secondTime).joints[jointType].position.x);
        return KinectGestures.SkeletonMath.DistanceBetweenPoints(this.person.GetLastSkeleton(firstTime).joints[jointType].position, this.person.GetLastSkeleton(secondTime).joints[jointType].position) * 1000.0 / this.person.MillisBetweenFrames(secondTime, firstTime);
    }

    /// <summary>
    /// Calculates the relative velocity of a joint referencing to a second one.</summary>
    /// <param name="steady">
    /// The referenctial JointType.</param>
    /// <param name="moving">
    /// The moving JointType of interest</param>
    /// <returns>
    /// Returns the relative velocity in meters</returns>
    Checker.prototype.GetRelativeVelocity = function(steady, moving)
    {
        if (!this.HasSkeleton(1))
        {
            return 0;
        }
        var d0 = this.SubstractedPointsAt(steady, moving, 0);
        var d1 = this.SubstractedPointsAt(steady, moving, 1);

        if (!this.HasSkeleton(3))
        {
            return KinectGestures.SkeletonMath.DistanceBetweenPoints(d0, d1) * 1000.0 / this.person.MillisBetweenFrames(1, 0);
        }

        var d2 = this.SubstractedPointsAt(steady, moving, 2);
        var d3 = this.SubstractedPointsAt(steady, moving, 3);
        
        return KinectGestures.SkeletonMath.Median(
            KinectGestures.SkeletonMath.DistanceBetweenPoints(d0, d1) * 1000.0 / this.person.MillisBetweenFrames(1, 0),
            KinectGestures.SkeletonMath.DistanceBetweenPoints(d1, d2) * 1000.0 / this.person.MillisBetweenFrames(2, 1),
            KinectGestures.SkeletonMath.DistanceBetweenPoints(d2, d3) * 1000.0 / this.person.MillisBetweenFrames(3, 2)
        );
    }

    /// <summary>
    /// Checks if a person has a skeleton for a given time.</summary>
    /// <param name="time">
    /// Index of the persons skeleton cache.</param>
    /// <returns>
    /// Returns true if there is a skeleton for the given index, false otherwise.</returns>
    Checker.prototype.HasSkeleton = function(time)
    {
        return this.person.GetLastSkeleton(time) != null;
    }

    Checker.prototype.SubstractedPointsAt = function(steady, moving, time)
    {
        if (!this.HasSkeleton(time))
        {
            throw "No Skeleton at this Index";
        }
        return KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(time).joints[moving].position, this.person.GetLastSkeleton(time).joints[steady].position);
    }

    /// <summary>
    /// Median of the distance between two points
    /// Median over 3
    /// </summary>
    /// <param name="t1">Joint 1</param>
    /// <param name="t2">Joint 2</param>
    /// <returns>Distance in Meters</returns>
    Checker.prototype.GetDistanceMedian = function(t1, t2)
    {
        if (!this.HasSkeleton(2))
        {
            return this.GetDistance(t1, t2);
        }
        return KinectGestures.SkeletonMath.Median(GetDistance(t1,t2), GetDistance(t1,t2,1), GetDistance(t1,t2,2));
    }

    /// <summary>
    /// The last distance between the points. 
    /// </summary>
    /// <param name="t1">Joint 1</param>
    /// <param name="t2">Joint 2</param>
    /// <returns>Distance in Meters</returns>
    Checker.prototype.GetDistance = function(t1, t2)
    {
        return this.GetDistanceAtTime(t1, t2, 0);
    }

    Checker.prototype.GetDistanceAtTime = function(t1, t2, time)
    {
        if (!this.HasSkeleton(time))
        {
            throw "No Skeleton at this Index";
        }
        return KinectGestures.SkeletonMath.DistanceBetweenPoints(this.person.GetLastSkeleton(time).joints[t1].position, this.person.GetLastSkeleton(time).joints[t2].position);
    }

    /// <summary>
    /// The actual movement directions
    /// High Tolerance
    /// </summary>
    /// <param name="type">Joint</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetAbsoluteMovement = function(type)
    {
        if (!this.HasSkeleton(1))
        {
            var res = {}
            res[KinectGestures.SkeletonMath.Direction.None] = true;
            return res;
        }
        return KinectGestures.SkeletonMath.DirectionTo(this.person.GetLastSkeleton(1).joints[type].position, this.person.CurrentSkeleton().joints[type].position);
    }

    /// <summary>
    /// The actual direction of movement to a relative point
    /// </summary>
    /// <param name="steady">The reference joint</param>
    /// <param name="moving">The joint for the direction</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetRelativeMovement = function(steady, moving)
    {
        if (!this.HasSkeleton(1))
        {
            var res = {}
            res[KinectGestures.SkeletonMath.Direction.None] = true;
            return res;
        }
        return KinectGestures.SkeletonMath.DirectionTo(KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(1).joints[moving].position, this.person.GetLastSkeleton(1).joints[steady].position),
            KinectGestures.SkeletonMath.SubstractPoints(this.person.CurrentSkeleton().joints[moving].position, this.person.CurrentSkeleton().joints[steady].position));
    }

    /// <summary>
    /// The static position of a joint in relation to another
    /// </summary>
    /// <param name="from">source of the direction</param>
    /// <param name="to">target of the direction</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetRelativePosition = function(from, to)
    {
        return KinectGestures.SkeletonMath.DirectionTo(this.person.CurrentSkeleton().joints[from].position, this.person.CurrentSkeleton().joints[to].position);
    }

    /// <summary>
    /// Direction of a joint over a span of frames
    /// Low tolerance, but movement has to be constant
    /// </summary>
    /// <param name="type">the joint</param>
    /// <param name="duration">number of frames</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetSteadyAbsoluteMovement = function(type, duration)
    {
        var from = [], to = [];
        if (duration < 1)
        {
            throw "Duration must be at least 1";
        }
        for (var i = 0; i < duration && this.HasSkeleton(i+1); i++)
        {
            to.push(this.person.GetLastSkeleton(i).joints[type].position);
            from.push(this.person.GetLastSkeleton(i+1).joints[type].position);
        }
        return KinectGestures.SkeletonMath.SteadyDirectionTo(from, to);
    }

    /// <summary>
    /// Relative movement over a timespawn
    /// Low tolerance, but movement has to be constant
    /// </summary>
    /// <param name="steady">The reference joint</param>
    /// <param name="moving">The joint to get the direction from</param>
    /// <param name="duration">Timespawn in frames</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetSteadyRelativeMovement = function(steady, moving, duration)
    {
        var from = [], to = [];
        if (duration < 1)
        {
            throw "Duration must be at least 1";
        }
        for (var i = 0; i < duration && this.HasSkeleton(i+1); i++)
        {
            to.push(KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(i).joints[moving].position, this.person.GetLastSkeleton(i).joints[steady].position));
            from.push(KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(i+1).joints[moving].position, this.person.GetLastSkeleton(i+1).joints[steady].position));
        }
        return KinectGestures.SkeletonMath.SteadyDirectionTo(from, to);
    }

    /// <summary>
    /// The relative position over a timespawn
    /// Low tolerance, but the position has to be constant
    /// </summary>
    /// <param name="from">Source of the direction</param>
    /// <param name="to">target of the direction</param>
    /// <param name="duration">Timespawn in frames</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetSteadyPosition = function(from, to, duration)
    {
        var origin = [], target = [];
        if (duration < 0)
        {
            throw "Duration must be at least 1";
        }
        for (var i = 0; i <= duration && this.HasSkeleton(i); i++)
        {
            target.push(this.person.GetLastSkeleton(i).joints[to].position);
            origin.push(this.person.GetLastSkeleton(i).joints[from].position);
        }
        return KinectGestures.SkeletonMath.SteadyDirectionTo(origin, target);
    }

    KinectGestures.Checker = Checker;

})();

window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){
    
    var timeoutRegisterPos, 
        intervalRegisterPos, 
        initTimeRegister = 0;

    function PlayerRegister(){}

    PlayerRegister.initPositionPlayer1 = null;
    PlayerRegister.initPositionPlayer2 = null;
    PlayerRegister.isRegistering = false;
    PlayerRegister.isCalibrating = false;
    PlayerRegister.started = false;
    PlayerRegister.player1Engaged = false;
    PlayerRegister.player2Engaged = false;
    PlayerRegister.registeredPositions = {};

    /*function calibrateMsg()
    {   
        var timeLeft = Date.now()-initTimeRegister;
        timeLeft = Math.round(timeLeft/1000);
        timeLeft = 5-timeLeft;
        KinectGestures.log('Calibrating Position '+ timeLeft + 's');
    }*/

    /*function registerPosition()
    {
        clearTimeout(timeoutRegisterPos);
        clearInterval(intervalRegisterPos);
        PlayerRegister.isRegistering = false;
        PlayerRegister.isCalibrating = false;
        KinectGestures.log('Position Calibrated');
    }*/

    /*function initCalibration()
    {
        timeoutRegisterPos = setTimeout(registerPosition,5000);
        initTimeRegister = Date.now();
        intervalRegisterPos = setInterval(calibrateMsg,1000);
    }*/

    PlayerRegister.init = function()
    {
        //clearTimeout(timeoutRegisterPos);
        //clearInterval(intervalRegisterPos);
        PlayerRegister.isRegistering = true;
    }

    PlayerRegister.getPlayerById = function(trackingId)
    {
        if (PlayerRegister.initPositionPlayer1 && PlayerRegister.initPositionPlayer1.trackingId === trackingId)
        {
            return PlayerRegister.initPositionPlayer1
        }
        if (PlayerRegister.initPositionPlayer2 && PlayerRegister.initPositionPlayer2.trackingId === trackingId)
        {
            return PlayerRegister.initPositionPlayer2
        }

        return null;
    }

    PlayerRegister.getRefSkeletonById = function(trackingId)
    {
        var pl = PlayerRegister.getPlayerById(trackingId);
        return pl ? pl.skeleton : null;
    }

    PlayerRegister.registerPlayerPosition = function(skeleton)
    {   
        // TODO calibrate skeleton on 
        if (skeleton.position.x <= 0){
            PlayerRegister.initPositionPlayer1 = skeleton.position;
            PlayerRegister.initPositionPlayer1.trackingId = skeleton.trackingId;
            PlayerRegister.initPositionPlayer1.skeleton = skeleton;
            PlayerRegister.initPositionPlayer1.playerNum = 1;
            PlayerRegister.player1Engaged = true;
            KinectGestures.emit(KinectGestures.EventType.PlayerRegister, {playerNum:1, trackingId:skeleton.trackingId});
        }
        else{
            PlayerRegister.initPositionPlayer2 = skeleton.position;
            PlayerRegister.initPositionPlayer2.trackingId = skeleton.trackingId;
            PlayerRegister.initPositionPlayer2.skeleton = skeleton;
            PlayerRegister.initPositionPlayer2.playerNum = 2;
            PlayerRegister.player2Engaged = true;
            KinectGestures.emit(KinectGestures.EventType.PlayerRegister, {playerNum:2, trackingId:skeleton.trackingId});
        }
       
        if (KinectGestures.options.numPlayersToRegister === 1 || 
           (PlayerRegister.player1Engaged && PlayerRegister.player2Engaged) )
        {
            PlayerRegister.isRegistering = false;
            PlayerRegister.isCalibrating = false;
        }   
    }

    PlayerRegister.reset = function()
    {
        PlayerRegister.started = false;
        PlayerRegister.player1Engaged = false;
        PlayerRegister.player2Engaged = false;
        PlayerRegister.registeredPositions = {};
    }

    // TODO manage the case in which one of the two players disappears when registering 
    PlayerRegister.update = function (frame)
    {
        if (PlayerRegister.isRegistering){
            var playersTracked = 0;
            for (var iSkeleton = 0; iSkeleton < frame.skeletons.length; ++iSkeleton) {

                var skeleton = frame.skeletons[iSkeleton];
                            
                if (skeleton.trackingState > 0){
                    playersTracked++;
                    //PlayerRegister.registeredPositions[skeleton.trackingId] = skeleton.position;
                    /*if (skeleton.position.x <= 0 && !PlayerRegister.player1Engaged){
                        PlayerRegister.initPositionPlayer1 = skeleton.position;
                        PlayerRegister.initPositionPlayer1.trackingId = skeleton.trackingId;
                    }
                    else if (skeleton.position.x > 0 && !PlayerRegister.player2Engaged){
                        PlayerRegister.initPositionPlayer2 = skeleton.position;
                        PlayerRegister.initPositionPlayer2.trackingId = skeleton.trackingId;
                    }*/
                    if (!PlayerRegister.isCalibrating)
                    {
                        KinectGestures.emit(KinectGestures.EventType.PlayerTracked, {relativePosition:skeleton.position.x <= 0 ? 1 : 2, skeleton:skeleton});
                    }
                   
                }
            }
            if (playersTracked === KinectGestures.options.numPlayersToRegister && !PlayerRegister.isCalibrating){
                
                PlayerRegister.isCalibrating = true;
                KinectGestures.emit(KinectGestures.EventType.PlayersTracked);
            }
            
        }

    } 

    // check if the current skeleton is currently traked as player
    // otherwise it assigns to the player the new trackingId
    // according to his position
    // TODO ask if right logic
    // TODO can we use this function to determine which are the players?

    // TODO TEST!
    PlayerRegister.checkSkeletonTracking = function(skeletons){
        
        var found = 0, indexFound;
        
        for (var i = skeletons.length - 1; i >= 0; i--) {
            var skeleton = skeletons[i];
            if (PlayerRegister.initPositionPlayer1 && skeleton.trackingId === PlayerRegister.initPositionPlayer1.trackingId)
            {
                found = found > 1 ? 3 : 1;
                indexFound = i;
                //KinectGestures.log('found-1:'+skeletons[i].trackingId);
            }
            if (PlayerRegister.initPositionPlayer2 && skeleton.trackingId === PlayerRegister.initPositionPlayer2.trackingId)
            {
                found = found > 1 ? 3 : 2;
                indexFound = i;
                //KinectGestures.log('found-2:' + skeletons[i].trackingId);
            
            }
            /*if (PlayerRegister.initPositionPlayer2){
                KinectGestures.log('found-2:' + PlayerRegister.initPositionPlayer2.trackingId);
            }
             if (PlayerRegister.initPositionPlayer1){
                KinectGestures.log('found-1:' + PlayerRegister.initPositionPlayer1.trackingId);
            }*/
        }

        // some skeleton is not being traked before
        if (found < 3){
            
            // found player 1 => the new is player2
            if (found === 1 && skeletons.length > 1){
                if (PlayerRegister.initPositionPlayer2){
                    PlayerRegister.initPositionPlayer2.trackingId = skeletons[indexFound === 0 ? 1 : 0].trackingId;
                    KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                }
            }
            // found player 2 => the is player 1
            else if (found === 2 && skeletons.length > 1)   
            {
                if (PlayerRegister.initPositionPlayer1){
                    PlayerRegister.initPositionPlayer1.trackingId =  skeletons[indexFound === 0 ? 1 : 0].trackingId;
                    KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});
                }
            }
            // re-assign based on position
            else if (found === 0 && skeletons.length > 0)
            {   
                // we have tu mutually exclude the skeletons
                // so we guess natural positions
                if (skeletons.length === 1){
                    // assign in base of the absolute position
                    if (skeletons[0].position.x <= 0)
                    {
                        if (PlayerRegister.initPositionPlayer1){
                            PlayerRegister.initPositionPlayer1.trackingId =  skeletons[0].trackingId;
                            KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});   
                        }
                    }
                    else 
                    {
                        if (PlayerRegister.initPositionPlayer2){
                            PlayerRegister.initPositionPlayer2.trackingId =  skeletons[0].trackingId;
                            KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                        }
                    }
                }
                else{
                    // assign based on the relative position of the players
                    if (skeletons[0].position.x < skeletons[1].position.x){
                        if (PlayerRegister.initPositionPlayer1){
                            PlayerRegister.initPositionPlayer1.trackingId = skeletons[0].trackingId;
                            KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});
                        }
                        if (PlayerRegister.initPositionPlayer2){
                            PlayerRegister.initPositionPlayer2.trackingId = skeletons[1].trackingId;
                            KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                        }
                    }
                    else{
                        if (PlayerRegister.initPositionPlayer1){
                            PlayerRegister.initPositionPlayer1.trackingId = skeletons[1].trackingId;
                            KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer1.trackingId, playerNum:1});
                        }
                        if (PlayerRegister.initPositionPlayer2){
                            PlayerRegister.initPositionPlayer2.trackingId = skeletons[0].trackingId;
                            KinectGestures.emit(KinectGestures.EventType.PlayerEngagedAgain, {trackingId:PlayerRegister.initPositionPlayer2.trackingId, playerNum:2});
                        }
                    }
                }
            }
        }

    }

    KinectGestures.PlayerRegister = PlayerRegister;


})();
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// porting of 
// https://gesturedetector.codeplex.com/SourceControl/latest#GestureDetector/Tools/SkeletonMath.cs
(function(){

    function SkeletonMath(){}

    /// Abstract directions for joint movement</summary>
    var Direction = 
    {
        /// <summary>
        /// A direction along the z-axis
        /// </summary>
        Forward:1,
        /// <summary>
        /// A direction along the z-axis
        /// </summary>
        Backward:2,
        /// <summary>
        /// A direction along the y-axis
        /// </summary>
        Upward:3,
        /// <summary>
        /// A direction along the y-axis
        /// </summary>
        Downward:4,
        /// <summary>
        /// A direction along the x-axis
        /// </summary>
        Left:5,
        /// <summary>
        /// A direction along the x-axis
        /// </summary>
        Right:6,
        /// <summary>
        /// No direction
        /// </summary>
        None:0
    };

    var Tolerance = 0.06;
    var MedianTolerance = 0.01;
    var MedianCorrectNeeded = 0.66666666;

    /// <summary>
    /// Get distance of two skeleton points in meters.</summary>
    SkeletonMath.DistanceBetweenPoints = function(p1, p2)
    {
        var dx = Math.abs(p2.x - p1.x);
        var dy = Math.abs(p2.y - p1.y);
        var dz = Math.abs(p2.z - p1.z);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    SkeletonMath.SubstractPoints = function(op1, op2)
    {
        var res = {};
        res.x = op1.x - op2.x;
        res.y = op1.y - op2.y;
        res.z = op1.z - op2.z;
        return res;
    }

    SkeletonMath.AddPoints = function(op1, op2)
    {
        var res = {};
        res.x = op1.x + op2.x;
        res.y = op1.y + op2.y;
        res.z = op1.z + op2.z;
        return res;
    }


    SkeletonMath.Median = function()
    {
        if (arguments.length === 3)
        {
            return SkeletonMath.Median3(arguments[0],arguments[1],arguments[2]);
        }
        else{
            return SkeletonMath.MedianValues(arguments);
        }
    }

    /// <summary>
    /// the median over three values
    /// </summary>
    /// <param name="d1"></param>
    /// <param name="d2"></param>
    /// <param name="d3"></param>
    /// <returns></returns>
    SkeletonMath.Median3 = function(d1, d2, d3)
    {
        // more performance than copying and sorting
        if ((d1 > d2 && d1 < d3) || (d1 < d2 && d1 > d3))
        {
            return d1;
        }
        if ((d2 > d1 && d2 < d3) || (d2 < d1 && d2 > d3))
        {
            return d2;
        }
        return d3;
    }

    /// <summary>
    /// The median over a unspecified number of values
    /// </summary>
    /// <param name="values"></param>
    /// <returns></returns>
    SkeletonMath.MedianValues = function(values)
    {   
        values.sort();
        return values[values.length/2];
    }

    /// <summary>
    /// The median of the direction between points
    /// </summary>
    /// <param name="from">Source joints</param>
    /// <param name="to">Target joints</param>
    /// <returns></returns>
    SkeletonMath.SteadyDirectionTo = function(from, to)
    {
        var directions = [];
        if (from.length != to.length)
        {
            throw "Length not identical";
        }
        for (var i = 0; i < from.length; i++)
        {
            directions.push({});
            var dx = to[i].x - from[i].x;
            var dy = to[i].y - from[i].y;
            var dz = to[i].z - from[i].z;
            if (dx > MedianTolerance)
            {
                directions[i][Direction.Right] = true;
            }
            else if (dx < -MedianTolerance)
            {
                directions[i][Direction.Left] = true;
            }
            if (dy > MedianTolerance)
            {
                directions[i][Direction.Upward] = true;
            }
            else if (dy < -MedianTolerance)
            {
                directions[i][Direction.Downward] = true;
            }
            if (dz > MedianTolerance)
            {
                directions[i][Direction.Backward] = true;
            }
            else if (dz < -MedianTolerance)
            {
                directions[i][Direction.Forward] = true;
            }
            
        }
        var res = {};
        for (var item in Direction)
        {
            // found enough times in lists
            // TODO check
            var itemFound = 0;
            for (var i = directions.length - 1; i >= 0; i--) {
                if (directions[i][Direction[item]]){
                    itemFound++;
                }
            }

            if (itemFound > from.length * MedianCorrectNeeded)
            {
                res[Direction[item]] = true;
            }
        }
        if (Object.keys(res).length === 0)
        {
            res[Direction.None] = true;
        }
        return res;
    }

    /// <summary>
    /// Get an abstract direction type between two skeleton points</summary>
    /// <param name="from">
    /// Source Point</param>
    /// <param name="to">
    /// Target Point</param>
    /// <returns>
    /// Returns a list of three directions (for each axis)</returns>
    SkeletonMath.DirectionTo = function(from, to)
    {
        var res = {};
        var dx = to.x - from.x;
        var dy = to.y - from.y;
        var dz = to.z - from.z;
        //KinectGestures.log(dx < -Tolerance);
        if (dx > Tolerance)
        {
            res[Direction.Right] = true;
        }
        else if (dx < -Tolerance)
        {
            res[Direction.Left] = true;
        }
        if (dy > Tolerance)
        {
            res[Direction.Upward] = true;
        }
        else if (dy < -Tolerance)
        {
            res[Direction.Downward] = true;
        }
        if (dz > Tolerance)
        {
            res[Direction.Backward] = true;
        }
        else if (dz < -Tolerance)
        {
            res[Direction.Forward] = true;
        }
        if (Object.keys(res).length === 0)
        {
            res[Direction.None] = true;
        }
        return res;
    }


    KinectGestures.SkeletonMath = SkeletonMath;
    KinectGestures.Direction = Direction;
    KinectGestures.SkeletonMath.Direction = Direction;
    
})();

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
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};
// Detect the position of a player relative to his initial registered position
// not a real gesture
// but we use the same interface of a gesture to detect tht
/*(function(KinectGestures){

    function PlayerPosition(){}

    // N.B.: this is the key factor to determine the effective move
    var treshold = 0.2;

    var diffPos = 0;

    PlayerPosition.lastPositionPlayer1 = null;                
    PlayerPosition.lastPositionPlayer2 = null;                
    PlayerPosition.positionPlayer1 = null;                
    PlayerPosition.positionPlayer2 = null; 
    
    PlayerPosition.update = function(skeleton){

        if (PlayerRegister.isRegistering){
            return;
        }

        var player = null;
        if (PlayerRegister.initPositionPlayer1 && skeleton.trackingId === PlayerRegister.initPositionPlayer1.trackingId){
            player = 1;
        }
        else if (PlayerRegister.initPositionPlayer2 && skeleton.trackingId === PlayerRegister.initPositionPlayer2.trackingId){
            player = 2;
        }
        if (player !== null){
            diffPos = skeleton.position.x - PlayerRegister['initPositionPlayer'+player].x;
            if (Math.abs(diffPos) > treshold){
                if (diffPos < 0){
                    PlayerPosition['positionPlayer'+player] = -1;
                }
                else{
                    PlayerPosition['positionPlayer'+player] = 1;
                }
            }
            else{
                PlayerPosition['positionPlayer'+player] = 0;
            }
            if (PlayerPosition['lastPositionPlayer'+player] !== PlayerPosition['positionPlayer'+player]){
                //KinectGestures.log('Player 1 Position: ' + (PlayerPosition.positionPlayer1 !== null ? PlayerPosition.positionPlayer1 : '') + '; Player 2 Position: ' + (PlayerPosition.positionPlayer2 !== null ? PlayerPosition.positionPlayer2 : ''));
                PlayerPosition['lastPositionPlayer'+player] = PlayerPosition['positionPlayer'+player];
            }
        }
        
    }               

    KinectGestures.PlayerPosition = PlayerPosition;

})(window);*/



(function(){


    function PlayerPositionContition(person){

        var _person = person;
        var _checker = _person.checker;
    
        var _diffPos = 0;

        var _position = -1;
        
        this.Check = function(skeleton)
        {
            // the skeleton should be tracked, well formed on the lower part, and in stand up position
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'lower')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }
            /*else{
                KinectGestures.log('skeletonStability->true');
            }*/

            if (KinectGestures.PlayerRegister.isRegistering){
                return;
            }

            var initPlayerPosition = KinectGestures.PlayerRegister.getPlayerById(person.trackingId);

            var newPosition;

            if (initPlayerPosition !== null){
                
                _diffPos = skeleton.position.x - initPlayerPosition.x;

                if (Math.abs(_diffPos) > PlayerPosition.Options.Threshold){
                    if (_diffPos < 0){
                        newPosition = -1;
                    }
                    else{
                        newPosition = 1;
                    }
                }
                else{
                    newPosition = 0;
                }
                if (newPosition !== _position){
                    
                    _position = newPosition;

                    PlayerPosition['player'+initPlayerPosition.playerNum] = _position;

                    var arg = {
                        position: _position,
                        playerNum: initPlayerPosition.playerNum
                    }
                    
                    return {res:1, args:arg};
                }
            }
        }

        

    }

    // Gesture class
    //PlayerPosition.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(PlayerPosition, KinectGestures.GestureChecker);

    PlayerPosition.Options = {Threshold:0.2};
    
    function PlayerPosition(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.PlayerPosition;
        this.person = person;
        this.timeout = 0; // continuous
        this.conditions = [ new PlayerPositionContition( person )];
    }

    KinectGestures.PlayerPosition = PlayerPosition;

})();
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
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'lower', true, 'standup')){
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
            // the skeleton should be tracked, well formed on the lower part, and in standing up position
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'lower', true, 'standup')){
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
    //JumpCalibratedGesture.inherits(KinectGestures.GestureChecker);
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
            
            if (!KinectGestures.SkeletonStability.isWellFormed(_checker, skeleton,'upper')){
                //KinectGestures.log('skeletonStability->flase');
                return {res:0};
            }

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
                        var res = {res:1, args:{direction:_direction, hand:_hand}};
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
    //SwipeGesture.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(SwipeGesture, KinectGestures.GestureChecker);

    SwipeGesture.Options = {Hand:JointType.HandRight, AllowedDirections:[KinectGestures.Direction.Left, KinectGestures.Direction.Right]};

    
    function SwipeGesture(person, options)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.Swipe;
        this.person = person;
        this.timeout =  1500;
        this.conditions = [ new SwipeCondition(person, SwipeGesture.Options )];
    }

    KinectGestures.SwipeGesture = SwipeGesture;




})();
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
    //JoystickGesture.inherits(KinectGestures.GestureChecker);
    KinectGestures.Utils.Inherits(JoystickGesture, KinectGestures.GestureChecker);

    
    function JoystickGesture(person)
    {   
        KinectGestures.GestureChecker.apply(this, arguments);

        this.gestureName = KinectGestures.GestureType.Joystick;
        this.person = person;
        this.timeout = 5000;
        this.conditions = [ new JoystickCondition( person, false )];
    }

    KinectGestures.JoystickGesture = JoystickGesture;

})();
window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    function DebugDrawer()
    {   
        var areaW, areaH,
            areaC,
            multiplier = 300,
            multiplierY = 300;

        var canvasEl = null,
            context = null;

        var record = false;
        var skeletonColors = ['#ff0000','#ff00ff','#ffff00','#0000ff','#fff000','#000fff','#ff0000','#ff00ff'];

        function onResize()
        {
            areaW = window.innerWidth;
            areaH = window.innerHeight;
            areaC = {x:areaW/2,y:areaH/2};

            canvasEl.width = areaW;
            canvasEl.height = areaH;
            
            canvasEl.style.width = areaW+'px';
            canvasEl.style.height = areaH+'px';
        }

        function update(frame)
        {
            if (!KinectGestures.DebugDrawer.CanvasElemntID){
                throw "You need to set a canvas element id to use Debug Drawer";
                return;
            }
            
            if (!context){
                
                canvasEl  = document.getElementById(KinectGestures.DebugDrawer.CanvasElemntID);
                if (!canvasEl){
                    throw "Canvas Element ID not valid or not existing: " + KinectGestures.DebugDrawer.CanvasElemntID;
                    return;
                }
                context = canvasEl.getContext('2d');

                if (!context){
                    throw "Canvas Element is not a canvas: " + KinectGestures.DebugDrawer.CanvasElemntID;
                    return;
                }

                onResize();
            }

            context.clearRect(0,0,areaW,areaH);

            for (var iSkeleton = 0; iSkeleton < frame.skeletons.length; ++iSkeleton) {

                var skeleton = frame.skeletons[iSkeleton];
                            
                //skeleton.trackingId;
                //skeleton.trackingState; // 1 = position only, 2 = skeleton
                //skeleton.position;

                if (skeleton.trackingState > 0){

                    updateSkeleton(skeleton, iSkeleton);

                    
                    if (KinectGestures.PlayerPosition.player1 !== null && KinectGestures.PlayerRegister.initPositionPlayer1){
                       var initPos = areaC.x + KinectGestures.PlayerRegister.initPositionPlayer1.x * multiplier;
                       drawCircleAtXY(initPos,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos+80,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos-80,areaH-20,40,'#000000','#000000');
                       drawJointAtXY(initPos+KinectGestures.PlayerPosition.player1*80, areaH-20, 40, '#ff0000'); 
                    }
                    else{
                        if (KinectGestures.PlayerRegister.initPositionPlayer1){
                            drawJointAtXY(areaC.x + KinectGestures.PlayerRegister.initPositionPlayer1.x*multiplier, areaH-20, 40, '#ff0000');
                        }
                    }

                    if (KinectGestures.PlayerPosition.player2 !== null && KinectGestures.PlayerRegister.initPositionPlayer2){
                       var initPos = areaC.x + KinectGestures.PlayerRegister.initPositionPlayer2.x*multiplier;
                       drawCircleAtXY(initPos,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos+80,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos-80,areaH-20,40,'#000000','#000000');
                       drawJointAtXY(initPos+KinectGestures.PlayerPosition.player2*80, areaH-20, 40, '#ff0000'); 
                    }
                    else{
                        if (KinectGestures.PlayerRegister.initPositionPlayer2){
                            drawJointAtXY(areaC.x + KinectGestures.PlayerRegister.initPositionPlayer2.x*multiplier, areaH-20, 40, '#ff0000');
                        }
                    }
                }
            }

           

        }

        var maxY = 0;

        function updateSkeleton(skeleton, index)
        {   

            var body = [],
                armLeft = [],
                armRight = [],
                legLeft = [],
                legRight = [];

        
            // draw body position
            drawJointAtXY(areaC.x+skeleton.position.x*multiplier, areaH-(skeleton.position.y*areaH), 30, '#000000');
            maxY = Math.max(maxY,skeleton.position.y);
            //KinectGestures.log(maxY);
            // draw joints
            for (var iJoint = 0; iJoint < skeleton.joints.length; ++iJoint) {
                var joint = skeleton.joints[iJoint];
                //joint.jointType;
                //joint.trackingState;
                //joint.position; 
                //console.log(joint.trackingState);
                if (joint.trackingState > 1){

                    var pos = {
                        x:areaC.x+joint.position.x*multiplier,
                        y:areaC.y-joint.position.y*multiplierY
                    }

                    drawJointAtXY(pos.x,pos.y, 10, skeletonColors[index]); 
                    
                    switch (true){
                        case joint.jointType <= 3:
                            body.push(pos);
                        break;
                        case joint.jointType > 3 && joint.jointType <= 7:
                            armLeft.push(pos);
                        break;
                        case joint.jointType > 7 && joint.jointType <= 11:
                            armRight.push(pos);
                        break;
                        case joint.jointType > 11 && joint.jointType <= 15:
                            legLeft.push(pos);
                        break;
                        case joint.jointType > 15 && joint.jointType <= 19:
                            legRight.push(pos);
                        break;
                        
                    }    
                }
            }

            drawPartJoints(body);
            drawPartJoints(armRight);
            drawPartJoints(armLeft);
            drawPartJoints(legRight);
            drawPartJoints(legLeft);

            drawUnionPart(body[0],legRight[0]);
            drawUnionPart(body[0],legLeft[0]);
            drawUnionPart(body[2],armLeft[0]);
            drawUnionPart(body[2],armRight[0]);

        }

        function drawUnionPart(part1,part2)
        {   
            if (part1 && part2){
               context.beginPath();
                context.strokeStyle = '#000000';
                context.moveTo(part1.x,part1.y);
                context.lineTo(part2.x,part2.y);
                context.stroke();  
            }
           
        }

        function drawPartJoints(arrayJoints)
        {   
            if (arrayJoints.length > 0)
            {
                context.beginPath();
                context.strokeStyle = '#000000';
                context.moveTo(arrayJoints[0].x,arrayJoints[0]);
                for (var i = 0; i < arrayJoints.length; i++) {
                    context.lineTo(arrayJoints[i].x,arrayJoints[i].y);
                }
                context.stroke();
            }
           
        }

        function drawJointAtXY(x,y, radius, color)
        {
            context.beginPath();
            context.fillStyle = color ? color : '#ff0000' ;
            context.arc(x,y,radius ? radius : 10,0,2*Math.PI);
            context.fill();
        }

        function drawCircleAtXY(x,y, radius, fillColor, strokeColor)
        {
            context.beginPath();
            context.fillStyle = fillColor ? fillColor : '#ff0000' ;
            context.strokeStyle = strokeColor ? strokeColor : '#ff0000' ;
            context.arc(x,y,radius ? radius : 10,0,2*Math.PI);
            context.fill();
            context.stroke();
        }

        return {
            update:update
        };
    }

    KinectGestures.DebugDrawer = DebugDrawer();

})(window);