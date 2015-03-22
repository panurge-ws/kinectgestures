$(document).ready(function () {

    

    var streamImageWidth = 640;
    var streamImageHeight = 480;
    var streamImageResolution = streamImageWidth.toString() + "x" + streamImageHeight.toString();

    var isSensorConnected = false;
    var engagedUser = null;
    //var cursor = null;
    //var userViewerCanvasElement = null;
    //var backgroundRemovalCanvasElement = null;

    // Log errors encountered during sensor configuration
    function configError(statusText, errorData) {
        console.log((errorData != null) ? JSON.stringify(errorData) : statusText);
    }

    // Determine if the specified object has any properties or not
    function isEmptyObject(obj) {
        if (obj == null) {
            return true;
        }

        var numProperties = 0;

        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                ++numProperties;
            }
        }

        return numProperties <= 0;
    }

    // Show or hide the cursor
    /*function setCursorVisibility(isVisible) {
        if (cursor == null) {
            return;
        }

        if (isVisible) {
            cursor.show();
        } else {
            cursor.hide();
        }
    }*/

    // Show or hide a canvas element
    /*function setCanvasVisibility(canvasElement, isVisible) {
        if (canvasElement == null) {
            return;
        }

        var canvasQuery = $(canvasElement);

        if (isVisible) {
            if (!canvasQuery.hasClass("showing")) {
                // Clear canvas before showing it
                var canvasContext = canvasElement.getContext("2d");
                canvasContext.clearRect(0, 0, streamImageWidth, streamImageHeight);
            }

            canvasQuery.addClass("showing");
        } else {
            canvasQuery.removeClass("showing");
        }
    }*/

    

    // Update sensor state and perform UI transitions (showing/hiding appropriate UI elements)
    // related to sensor status or engagement state changes
    var delayedConfigTimeoutId = null;
    function updateUserState(newIsSensorConnected, newEngagedUser, sensorToConfig) {
        var hasEngagedUser = engagedUser != null;
        var newHasEngagedUser = newEngagedUser != null;

        // If there's a pending configuration change when state changes again, cancel previous timeout
        if (delayedConfigTimeoutId != null) {
            clearTimeout(delayedConfigTimeoutId);
            delayedConfigTimeoutId = null;
        }

        if ((isSensorConnected != newIsSensorConnected) || (engagedUser != newEngagedUser)) {
            if (newIsSensorConnected) {

                var immediateConfig = {};
                var delayedConfig = {};
                immediateConfig[Kinect.INTERACTION_STREAM_NAME] = { "enabled": true };
                immediateConfig[Kinect.USERVIEWER_STREAM_NAME] = { "resolution": streamImageResolution };
                //immediateConfig[Kinect.BACKGROUNDREMOVAL_STREAM_NAME] = { "resolution": streamImageResolution };

                //setCursorVisibility(newHasEngagedUser);
                //setCanvasVisibility(userViewerCanvasElement, !newHasEngagedUser);
                //setCanvasVisibility(backgroundRemovalCanvasElement, newHasEngagedUser);

                if (newHasEngagedUser) {
                    //immediateConfig[Kinect.BACKGROUNDREMOVAL_STREAM_NAME].enabled = true;
                    //immediateConfig[Kinect.BACKGROUNDREMOVAL_STREAM_NAME].trackingId = newEngagedUser;

                    delayedConfig[Kinect.USERVIEWER_STREAM_NAME] = { "enabled": true }; // old = false
                } else {
                    immediateConfig[Kinect.USERVIEWER_STREAM_NAME].enabled = true;

                    if (hasEngagedUser) {
                        //delayedConfig[Kinect.BACKGROUNDREMOVAL_STREAM_NAME] = { "enabled": false };
                    }
                }

                // Perform immediate configuration
                //sensorToConfig.postConfig(immediateConfig, configError);

                // schedule delayed configuration for 2 seconds later
                if (!isEmptyObject(delayedConfig)) {
                    delayedConfigTimeoutId = setTimeout(function () {
                        //sensorToConfig.postConfig(delayedConfig, configError);
                        delayedConfigTimeoutId = null;
                    }, 2000);
                }
            } else {
                //setCursorVisibility(false);
                //setCanvasVisibility(userViewerCanvasElement, false);
                //setCanvasVisibility(backgroundRemovalCanvasElement, false);
            }
        }

        isSensorConnected = newIsSensorConnected;
        engagedUser = newEngagedUser;

    }

    // Get the id of the engaged user, if present, or null if there is no engaged user
    function findEngagedUser(userStates) {

        var engagedUserId = null;

        for (var i = 0; i < userStates.length; ++i) {
            var entry = userStates[i];
            if (entry.userState == "engaged") {
                engagedUserId = entry.id;
                break;
            }
        }

        return engagedUserId;
    }

    // Respond to user state change event
    function onUserStatesChanged(newUserStates) {
        var newEngagedUser = findEngagedUser(newUserStates);
        updateUserState(isSensorConnected, newEngagedUser, sensor);
    }

    var configuration = {

        "interaction" : {
            "enabled": false,
        },
     
        "userviewer" : {
            "enabled": false,
            "resolution": "640x480", //320x240, 160x120, 128x96, 80x60
            "userColors": { "engaged": 0x7fffffff, "tracked": 0x7fffffff },
            "defaultUserColor": 0x70000000, //RGBA 2147483647
        },
     
        "backgroundRemoval" : {
            "enabled": false,
            "resolution": "640x480", //1280x960
        },
     
        "skeleton" : {
            "enabled": true,
        },
     
        "sensorStatus" : {
            "enabled": true,
        }
     
    };

    // Create sensor and UI adapter layers
    var sensor = Kinect.sensor(Kinect.DEFAULT_SENSOR_NAME, function (sensorToConfig, isConnected) {
        sensorToConfig.postConfig(configuration);
        /*if (isConnected) {

            // Determine what is the engagement state upon connection
            sensorToConfig.getConfig(function (data) {
                var engagedUserId = findEngagedUser(data[Kinect.INTERACTION_STREAM_NAME].userStates);

                
                updateUserState(true, engagedUserId, sensorToConfig);
            });
        } else {
            updateUserState(false, engagedUser, sensorToConfig);
        }*/
    });
    //var uiAdapter = KinectUI.createAdapter(sensor);

    //uiAdapter.promoteButtons();
    //cursor = uiAdapter.createDefaultCursor();
    //userViewerCanvasElement = document.getElementById("userViewerCanvas");
    //backgroundRemovalCanvasElement = document.getElementById("backgroundRemovalCanvas");
    //uiAdapter.bindStreamToCanvas(Kinect.USERVIEWER_STREAM_NAME, userViewerCanvasElement);
    //uiAdapter.bindStreamToCanvas(Kinect.BACKGROUNDREMOVAL_STREAM_NAME, backgroundRemovalCanvasElement);

    /*sensor.addEventHandler(function (event) {
        
        switch (event.category) {
            case Kinect.USERSTATE_EVENT_CATEGORY:
                switch (event.eventType) {
                    case Kinect.USERSTATESCHANGED_EVENT_TYPE:
                        console.log(Kinect.USERSTATESCHANGED_EVENT_TYPE, event.userStates);
                        window.log(JSON.stringify(event.userStates));
                        onUserStatesChanged(event.userStates);
                        break;
                }
                break;
        }
    });*/


    
    /*var skelFrameCount = 0;
    sensor.addStreamFrameHandler( function(frame) {

        switch (frame.stream) {
            case Kinect.SKELETON_STREAM_NAME:

                skelFrameCount++;

                DebugDrawer.update(frame);
                
                if (PlayerRegister.started === false){
                    PlayerRegister.init();
                    PlayerRegister.started = true;
                }
                PlayerRegister.update(frame);

                GestureManager.update(frame);
                
            break;

            case Kinect.USERVIEWER_STREAM_NAME:
            case Kinect.BACKGROUNDREMOVAL_STREAM_NAME:
            break;
        }
    });*/


    // Game logics
    var GAME_STATUS = 'waiting';
        loggedPlayers = 0;

    KinectGestures.init(sensor,{
        debug:true,
        registerPlayer:true,
        numPlayersToRegister:1,
        canvasElementID:'skeletonContainer',
        log:true,
        logElementID:'skeletonLogger',
    });

    KinectGestures.on(KinectGestures.EventType.PlayersTracked, function(event){
        if (GAME_STATUS === 'waiting'){
            KinectGestures.log('Put your feet in the central position and say hello!');
            GAME_STATUS = 'engaging';
        } 
    });
    

    KinectGestures.on(KinectGestures.GestureType.Wave, function(event){
        if (GAME_STATUS === 'engaging'){
            loggedPlayers++;
            if (loggedPlayers === KinectGestures.options.numPlayersToRegister){
                GAME_STATUS = 'engaged';
                KinectGestures.PlayerRegister.registerPlayerPosition(event.data.skeleton);
                KinectGestures.log('Engaged!');
            }
        }
        /*window.log('Wave!'+JSON.stringify(eventData));
        setTimeout(function(){
            window.log('');
        }, 500);*/
    });

    
    
    KinectGestures.on(KinectGestures.GestureType.Swipe, function(event){});

    //KinectGestures.on('squat',function(event){});
    KinectGestures.on(KinectGestures.GestureType.SquatPosition, function(event){});
    //KinectGestures.on(KinectGestures.GestureType.Squat, function(event){});

    //KinectGestures.on(KinectGestures.GestureType.Jump, function(event){});
    KinectGestures.on(KinectGestures.GestureType.JumpPosition, function(event){});
    
    KinectGestures.on(KinectGestures.EventType.PlayerLost, function(event){
        KinectGestures.log('playerLost!' + JSON.stringify(event.data));
    });

    KinectGestures.on(KinectGestures.EventType.PlayerEngagedAgain, function(event){
        KinectGestures.log('playerEngagedAgain!' + JSON.stringify(event.data));
    });


    var player1Position = null,
        player2Position = null;

    KinectGestures.on(KinectGestures.GestureType.PlayerPosition, function(event){
        if (event.data.playerNum === 1){
            player1Position = event.data.position;
        }
        else{
            player2Position = event.data.position;
        }
    });

    KinectGestures.log('Detecting players...');

});