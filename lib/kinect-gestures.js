// inherits utils
Function.prototype.inherits = function(parent) {
  this.prototype = Object.create(parent.prototype);
};

window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

	if (!Kinect){
		throw "Kinect 1.8.0 SDK required";
		return;
	}

	var _sensor = null,
		_options = {debug:false, registerPlayer:true, canvasElementID:false};


	KinectGestures.GestureType = {
		'Wave':'wave',
		'Jump':'jump',
		'Squat':'squat',
		'Swipe':'swipe',
		'Playerposition':'playerposition',
		'Joystick':'joystick'
	};

	KinectGestures.MapTypeClass = {
		'wave': 'WaveGesture',
		'jump': 'JumpGesture',
		'squat': 'SquatGesture',
		'swipe': 'SwipeGesture',
		'playerposition': 'PlayerPosition',
		'joystick': 'JoystickGesture'
	};

	function onStreamFrame(frame)
	{
		if (frame.stream === Kinect.SKELETON_STREAM_NAME)
        {
        	if (_options.debug){
        		KinectGestures.DebugDrawer.update(frame);
        	}
            
            if (_options.registerPlayer) 
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
			for(var k in _options)
			{
				if (typeof options[k] !== 'undefined')
				{
					_options[k] = options[k];
				}
			}
		}

		if (_options.debug && _options.canvasElementID){
			KinectGestures.DebugDrawer.CanvasElemntID = _options.canvasElementID;
		}

		KinectGestures.enable();
	}

	KinectGestures.enable = function()
	{
		_sensor.addStreamFrameHandler( onStreamFrame );
	};

	KinectGestures.disable = function()
	{
		_sensor.removeStreamFrameHandler( onStreamFrame );
	}

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


})();