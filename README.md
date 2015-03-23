## ** Experimental **
## A JavaScript library to detect gestures via Kinect (1.8.0) SD

---

## HOW TO USE
---

1) Install the Kinect SDK 1.8.0 [drivers](http://www.microsoft.com/en-us/download/details.aspx?id=40278) and [toolkit](http://www.microsoft.com/en-us/download/details.aspx?id=40276) from Microsoft. 

2) Run the WebServer supplied within the toolkit.

3) Create a new HTML file in the Content folder of the WebServer folder in the TootlKit folder, E.g. "gestures.html": it will be available at: http://localhost:8181/files/gestures.html according to the WebServer settings.

4) Add the [Kinect SDK 1.8.0](https://github.com/panurge-ws/kinectgestures/blob/master/sdk/Kinect-1.8.0.js) to your HTML

5) Add the [kinect-gestures.js](https://github.com/panurge-ws/kinectgestures/blob/master/dist/kinect-gestures.js) (or the [minified version](https://github.com/panurge-ws/kinectgestures/blob/master/dist/kinect-gestures.min.js) ) to your HTML

6) Start the sensor:

```javascript
var sensor = Kinect.sensor(Kinect.DEFAULT_SENSOR_NAME, function(sensorToConfig, isConnected) {
    // pass here your configuration 
    // Notice that the skeleton stream must be enabled
    //sensorToConfig.postConfig(configuration);
});
```
        
7) Initialize the KinectGestures library

```javascript
KinectGestures.init(sensor,{
	// enable debugging (it will draw the skeleton on a canvas element, see below)
    debug:true, 
    canvasElementID:'canvasElement', // the ID of the canvas element where the debugger will draw the skeletons'data
    // enable registration for players, so you can detect which skeleton belongs to player 1 or 2 (see below)
    registerPlayer:true, 
    numPlayersToRegister:1, // wait n players before enable registering
    log:true, // enable logging
    logElementID:'canvasElement', // the ID of the HTML element where the log message will write
    });
```

8) Listen for gestures and players'status events

```javascript
// weva the right hand
KinectGestures.on(KinectGestures.GestureType.Wave, function(event){
	console.log(event.data);
    // you can use this gesture to register player e.g:
    KinectGestures.PlayerRegister.registerPlayerPosition(event.data.skeleton);
});

// swipe the hand left or right
KinectGestures.on(KinectGestures.GestureType.Swipe, function(event){
	console.log(event.data);
    // event.data.direction = KinectGestures.Direction.Left | KinectGestures.Direction.Right
});

KinectGestures.on(KinectGestures.GestureType.Squat, function(event){
	console.log(event.data);
});

KinectGestures.on(KinectGestures.GestureType.Jump, function(event){
	console.log(event.data);
});

// this needs a player to be registered
KinectGestures.on(KinectGestures.GestureType.SquatPosition, function(event){
	console.log(event.data);
});

// this needs a player to be registered
KinectGestures.on(KinectGestures.GestureType.JumpPosition, function(event){
	console.log(event.data);
});

// this needs a player to be registered
KinectGestures.on(KinectGestures.GestureType.PlayerPosition, function(event){
	console.log(event.data);
});

//////////////////////////
// Player status handlers
//////////////////////////


// a previously tracked skeleton is no more tracked
KinectGestures.on(KinectGestures.EventType.PlayerLost, function(event){
	KinectGestures.log('playerLost!' + JSON.stringify(event.data));
});

// a previously tracked player that was lost, it's engaged again
KinectGestures.on(KinectGestures.EventType.PlayerEngagedAgain, function(event){
	KinectGestures.log('playerEngagedAgain!' + JSON.stringify(event.data));
});

// according to 'numPlayersToRegister' params you passed in the initialization
// this will fire when all the players are being tracked
KinectGestures.on(KinectGestures.EventType.PlayersTracked, function(event){
});

// when you call the KinectGestures.PlayerRegister.registerPlayerPosition(skeletonData), an event of type KinectGestures.EventType.PlayerRegister is dispatched meaning you have registered / engaged your user
// N.B. KinecteGesture consider the player on the left of the Kinect sensor ad player 1, viceversa player 2
KinectGestures.on(KinectGestures.EventType.PlayerRegister, function(event){
	console.log(event.data);
});
```

## DEMO
---
For a woking example, please see test/app.js demo. You can simpy clone this repo, add the whole folder inside the Content folder of the SDK toolkit. You will access it as [address to Kinect WebServer]/[repo folder]/test/index.html

## VERSION
---
The library is currently in alpha version and it should be considered "experimental", not for using in production environments.


## LICENSE
---
Unlicensed: see more on LICENSE file


## CREDITS
---
Parts of the mathematical methods are ported from a C# version available at 
https://gesturedetector.codeplex.com/SourceControl/latest#GestureDetector/

Thanks to [ThinkingAbout](http://www.thinkingabout.it/) to have supported this project.






