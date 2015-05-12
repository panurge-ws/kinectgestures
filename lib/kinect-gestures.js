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