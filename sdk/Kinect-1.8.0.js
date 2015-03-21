// -----------------------------------------------------------------------
// <copyright file="Kinect-1.8.0.js" company="Microsoft">
//     Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
// -----------------------------------------------------------------------


//////////////////////////////////////////////////////////////
// Create the global Kinect object
var Kinect = (function () {
    "use strict";
    
    //////////////////////////////////////////////////////////////
    // SocketManager object constructor
    //     SocketManager(uri, onmessage(socket,message) [, onconnection(isConnected)] )
    //
    // uri: URI of websocket endpoint to connect to
    // onmessage: callback function to call whenever a message is received
    // onconnection: function to call back whenever socket connection status changes
    //               from disconnected to connected or vice versa
    function SocketManager(uri, onmessage, onconnection) {

        //////////////////////////////////////////////////////////////
        // Private SocketExec properties
        var onStatusChanged = null;
        var statusMessage = "";
        var socket = null;
        var socketManager = this;
        var wsUri = uri.replace(/^http(s)?:/i, "ws$1:");

        //////////////////////////////////////////////////////////////
        // Private SocketExec methods
        function updateStatusChanged() {
            if (onStatusChanged != null) {
                onStatusChanged(statusMessage);
            }
        }

        function updateStatus(message) {
            statusMessage = message;

            updateStatusChanged();
        }

        function tryConnection() {
            if (!socketManager.isStarted) {
                return;
            }

            if (socket != null) {
                updateStatus("Already connected." + (new Date()).toTimeString());
                return;
            }
            updateStatus("Connecting to server...");

            // Initialize a new web socket.
            socket = new WebSocket(wsUri);
            
            // Receive binary data as ArrayBuffer rather than Blob
            socket.binaryType = "arraybuffer";

            // Connection established.
            socket.onopen = function () {
                if (typeof onconnection == "function") {
                    onconnection(true);
                }
                
                updateStatus("Connected to server.");
            };

            // Connection closed.
            socket.onclose = function () {
                if (typeof onconnection == "function") {
                    onconnection(false);
                }
                
                updateStatus("Connection closed.");
                if (socketManager.isStarted) {
                    // Keep trying to reconnect as long as we're started
                    setTimeout(tryConnection, socketManager.retryTimeout, socketManager);
                }
                socket = null;
            };

            // Receive data FROM the server!
            socket.onmessage = function(message) {
                onmessage(socket, message);
            };
        }

        //////////////////////////////////////////////////////////////
        // Public SocketManager properties
        
        // connection retry timeout, in milliseconds
        this.retryTimeout = 5000;

        // true if socket has been started
        this.isStarted = false;

        //////////////////////////////////////////////////////////////
        // Public SocketManager functions
        this.setOnStatusChanged = function (statusChangedCallback) {
            onStatusChanged = statusChangedCallback;
            updateStatusChanged();
        };

        this.start = function() {
            this.isStarted = true;

            tryConnection(this);
        };

        this.stop = function() {
            this.isStarted = false;

            if (socket != null) {
                socket.close();
            }
        };

        //////////////////////////////////////////////////////////////
        // SocketManager initialization code
        if (window.WebSocket == null) {
            updateStatus("Your browser does not support web sockets!");
            return;
        }
    }

    //////////////////////////////////////////////////////////////
    // KinectConnector object constructor
    function KinectConnector() {

        //////////////////////////////////////////////////////////////
        // Private KinectConnector properties

        // Configure default connection values
        var DEFAULT_HOST_URI = "http://localhost";
        var DEFAULT_HOST_PORT = 8181;
        var DEFAULT_BASE_PATH = "Kinect";
        var DEFAULT_SENSOR_NAME = "default";

        // If connectionUri is null, it indicates that we're not connected yet
        var connectionUri = null;

        // If explicitDisconnect is true, it indicates that client has called
        // "KinectConnector.disconnect" explicitly.
        var explicitDisconnect = false;

        // Mapping between sensor names and KinectSensor objects
        var sensorMap = {};
        
        // true if server requests to REST endpoint should be asynchronous
        var asyncRequests = true;

        var connector = this;

        //////////////////////////////////////////////////////////////
        // KinectSensor object constructor
        //     KinectSensor(baseEndpointUri, onconnection(sensor, isConnected))
        // 
        // baseEndpointUri: base URI for web endpoints corresponding to sensor
        // onconnection: Function to call back whenever status of connection to the
        //               server that owns this sensor changes from disconnected to
        //               connected or vice versa.
        function KinectSensor(baseEndpointUri, onconnection) {

            //////////////////////////////////////////////////////////////
            // Private KinectSensor properties

            // URI used to connect to endpoint used to configure sensor state
            var stateEndpoint = baseEndpointUri + "/state";

            // true if sensor connection to server is currently enabled, false otherwise
            var isConnectionEnabled = false;
            
            // Array of registered stream frame ready handlers
            var streamFrameHandlers = [];
            
            // Header portion of a two-part stream message that is still missing a binary payload
            var pendingStreamFrame = null;

            // Reference to this sensor object for use in internal functions
            var sensor = this;

            var streamSocketManager = new SocketManager(
                baseEndpointUri + "/stream",
                function(socket, message) {

                    //console.log(message);

                    function broadcastFrame(frame) {
                        for (var iHandler = 0; iHandler < streamFrameHandlers.length; ++iHandler) {
                            streamFrameHandlers[iHandler](frame);
                        }
                    }

                    if (message.data instanceof ArrayBuffer) {
                        if ((pendingStreamFrame == null) || (pendingStreamFrame.bufferLength != message.data.byteLength)) {
                            // Ignore any binary messages that were not preceded by a header message
                            console.log("Binary socket message received without corresponding header");
                            pendingStreamFrame = null;
                            return;
                        }

                        pendingStreamFrame.buffer = message.data;
                        broadcastFrame(pendingStreamFrame);
                        pendingStreamFrame = null;
                    } else if (typeof(message.data) == "string") {
                        pendingStreamFrame = null;

                        //try {
                            // Get the data in JSON format.
                            var frameData = JSON.parse(message.data);

                            // If message has a 'bufferLength' property, it means that this is a message header
                            // and we should wait for the binary payload before broadcasting this message.
                            if ("bufferLength" in frameData) {
                                pendingStreamFrame = frameData;
                            } else {
                                broadcastFrame(frameData);
                            }
                        //} catch(error) {
                          //  console.log('Tried processing stream message, but failed with error: ' + error);
                        //}
                    } else {
                        // Ignore any messages of unexpected types.
                        console.log("Unexpected type for received socket message");
                        pendingStreamFrame = null;
                        return;
                    }
                },
                function(isConnected) {
                    // Use the existence of the stream channel connection to mean that a
                    // server exists and is ready to accept requests
                    sensor.isConnected = isConnected;
                    onconnection(sensor, isConnected);
                });
            
            // Array of registered event handlers
            var eventHandlers = [];

            var eventSocketManager = new SocketManager(baseEndpointUri + "/events", function(socket, message) {
                // Get the data in JSON format.
                var eventData = JSON.parse(message.data);

                for (var iHandler = 0; iHandler < eventHandlers.length; ++iHandler) {
                    eventHandlers[iHandler](eventData);
                }
            });

            // Registered hit test handler
            var hitTestHandler = null;
            
            var hitTestSocketManager = new SocketManager(baseEndpointUri + "/interaction/client", function (socket, message) {
                // Get the data in JSON format.
                var eventData = JSON.parse(message.data);
                var id = eventData.id;
                var name = eventData.name;
                var args = eventData.args;

                switch (name) {
                    case "getInteractionInfoAtLocation":
                        var handlerResult = null;
                        var defaultResult = { "isPressTarget": false, "isGripTarget": false };

                        if (hitTestHandler != null) {
                            try {
                                handlerResult = hitTestHandler.apply(sensor, args);
                            } catch(e) {
                                handlerResult = null;
                            }
                        }

                        socket.send(JSON.stringify({ "id": id, "result": ((handlerResult != null) ? handlerResult : defaultResult) }));
                        break;
                    
                    case "ping":
                        socket.send(JSON.stringify({ "id": id, "result": true }));
                        break;
                }
            });
            
            //////////////////////////////////////////////////////////////
            // Private KinectSensor functions

            // Perform ajax request
            //    ajax( method, uri, success(responseData) [, error(statusText)] )
            //
            // method: http method
            // uri: target uri of ajax call
            // requestData: data to send to uri as part of request (may be null)
            // success: Callback function executed if request succeeds.
            // error: Callback function executed if request fails (may be null)
            function ajax(method, uri, requestData, success, error) {
                if (!isConnectionEnabled) {
                    if (error != null) {
                        error("disconnected from server");
                    }
                    return;
                }
                
                var xhr = new XMLHttpRequest();
                xhr.open(method, uri, asyncRequests);
                xhr.onload = function (e) {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        if (xhr.status == 200) {
                            success(JSON.parse(xhr.responseText));
                        } else if (error != null) {
                            error(xhr.statusText);
                        }
                    }
                };
                if (error != null) {
                    xhr.onerror = function (e) {
                        error(xhr.statusText);
                    };
                }
                xhr.send(requestData);
            }
            
            // Respond to changes in the connection enabled status
            //    onConnectionEnabledChanged( )
            function onConnectionEnabledChanged() {
                if (isConnectionEnabled && !streamSocketManager.isStarted) {
                    streamSocketManager.start();
                } else if (!isConnectionEnabled && streamSocketManager.isStarted) {
                    streamSocketManager.stop();
                }
            }
            
            // Respond to changes in the number of registered event handlers
            //    onEventHandlersChanged( )
            function onEventHandlersChanged() {
                if ((eventHandlers.length > 0) && !eventSocketManager.isStarted) {
                    eventSocketManager.start();
                } else if ((eventHandlers.length == 0) && eventSocketManager.isStarted) {
                    eventSocketManager.stop();
                }
            }
            
            // Respond to changes in the registered hit test handler
            //    onHitTestHandlerChanged( )
            function onHitTestHandlerChanged() {
                if ((hitTestHandler != null) && !hitTestSocketManager.isStarted) {
                    hitTestSocketManager.start();
                } else if ((hitTestHandler == null) && hitTestSocketManager.isStarted) {
                    hitTestSocketManager.stop();
                }
            }
            
            //////////////////////////////////////////////////////////////
            // Public KinectSensor properties
            this.isConnected = false;

            //////////////////////////////////////////////////////////////
            // Public KinectSensor functions

            // Request current sensor configuration
            //    .getConfig( success(configData) [, error(statusText)] )
            //
            // success: Callback function executed if request succeeds.
            // error: Callback function executed if request fails.
            this.getConfig = function (success, error) {
                if ((arguments.length < 1) || (typeof success != 'function')) {
                    throw new Error("first parameter must be specified and must be a function");
                }

                if ((arguments.length >= 2) && (typeof error != 'function')) {
                    throw new Error("if second parameter is specified, it must be a function");
                }

                ajax("GET", stateEndpoint, null,
                    function(response) { success(response); },
                    (error != null) ? function (statusText) { error(statusText); } : null
                );
            };

            // Update current sensor configuration
            //     .postConfig( configData [, error(statusText [, data] )] )
            //
            // configData: New configuration property/value pairs to update
            //             for each sensor stream.
            // error: Callback function executed if request fails.
            //        data parameter of error callback will be null if request
            //        could not be completed at all, but will be a JSON object
            //        giving failure details in case of semantic failure to
            //        satisfy request.
            this.postConfig = function (configData, error) {
                if ((arguments.length < 1) || (typeof configData != 'object')) {
                    throw new Error("first parameter must be specified and must be an object");
                }

                if ((arguments.length >= 2) && (typeof error != 'function')) {
                    throw new Error("if second parameter is specified, it must be a function");
                }

                ajax("POST", stateEndpoint, JSON.stringify(configData),
                    function(response) {
                        if (!response.success && (error != null)) {
                            error("semantic failure", response);
                        }
                    },
                    (error != null) ? function (statusText) { error(statusText); } : null
                );
            };

            // Enable connections with server
            //    .connect()
            this.connect = function () {
                isConnectionEnabled = true;

                onConnectionEnabledChanged();
                onEventHandlersChanged();
                onHitTestHandlerChanged();
            };

            // Disable connections with server
            //    .disconnect()
            this.disconnect = function () {
                isConnectionEnabled = false;
                
                onConnectionEnabledChanged();
                onEventHandlersChanged();
                onHitTestHandlerChanged();
            };
            
            // Add a new stream frame handler.
            //     .addStreamFrameHandler( handler(streamFrame) )] )
            //
            // handler: Callback function to be executed when a stream frame is ready to
            //          be processed.
            this.addStreamFrameHandler = function (handler) {
                if (typeof(handler) != "function") {
                    throw new Error("first parameter must be specified and must be a function");
                }
                
                streamFrameHandlers.push(handler);
            };
            
            // Removes one (or all) stream frame handler(s).
            //     .removeStreamFrameHandler( [handler(streamFrame)] )] )
            //
            // handler: Stream frame handler callback function to be removed.
            //          If omitted, all stream frame handlers are removed.
            this.removeStreamFrameHandler = function (handler) {
                switch (typeof(handler)) {
                    case "undefined":
                        streamFrameHandlers = [];
                        break;
                    case "function":
                        var index = streamFrameHandlers.indexOf(handler);
                        if (index >= 0) {
                            streamFrameHandlers.slice(index, index + 1);
                        }
                        break;
                        
                    default:
                        throw new Error("first parameter must either be a function or left unspecified");
                }
            };
            
            // Add a new event handler.
            //     .addEventHandler( handler(event) )] )
            //
            // handler: Callback function to be executed when an event is ready to be processed.
            this.addEventHandler = function (handler) {
                if (typeof (handler) != "function") {
                    throw new Error("first parameter must be specified and must be a function");
                }

                eventHandlers.push(handler);

                onEventHandlersChanged();
            };

            // Removes one (or all) event handler(s).
            //     .removeEventHandler( [handler(streamFrame)] )] )
            //
            // handler: Event handler callback function to be removed.
            //          If omitted, all event handlers are removed.
            this.removeEventHandler = function (handler) {
                switch (typeof (handler)) {
                    case "undefined":
                        eventHandlers = [];
                        break;
                    case "function":
                        var index = eventHandlers.indexOf(handler);
                        if (index >= 0) {
                            eventHandlers.slice(index, index + 1);
                        }
                        break;

                    default:
                        throw new Error("first parameter must either be a function or left unspecified");
                }
                
                onEventHandlersChanged();
            };
            
            // Set hit test handler.
            //     .setHitTestHandler( [handler(skeletonTrackingId, handType, x, y)] )] )
            //
            // handler: Callback function to be executed when interaction stream needs 
            //          interaction information in order to adjust a hand pointer position
            //          relative to UI.
            //          If omitted, hit test handler is removed.
            //          - skeletonTrackingId: The skeleton tracking ID for which interaction
            //                                information is being retrieved.
            //          - handType: "left" or "right" to represent hand type for which
            //                       interaction information is being retrieved.
            //          - x: X-coordinate of UI location for which interaction information
            //               is being retrieved. 0.0 corresponds to left edge of interaction
            //               region and 1.0 corresponds to right edge of interaction region.
            //          - y: Y-coordinate of UI location for which interaction information
            //               is being retrieved. 0.0 corresponds to top edge of interaction
            //               region and 1.0 corresponds to bottom edge of interaction region.
            this.setHitTestHandler = function (handler) {
                switch (typeof (handler)) {
                    case "undefined":
                    case "function":
                        hitTestHandler = handler;
                        break;

                    default:
                        throw new Error("first parameter must be either a function or left unspecified");
                }

                onHitTestHandlerChanged();
            };
        }

        //////////////////////////////////////////////////////////////
        // Public KinectConnector properties
        
        // Server connection defaults
        this.DEFAULT_HOST_URI = DEFAULT_HOST_URI;
        this.DEFAULT_HOST_PORT = DEFAULT_HOST_PORT;
        this.DEFAULT_BASE_PATH = DEFAULT_BASE_PATH;
        this.DEFAULT_SENSOR_NAME = DEFAULT_SENSOR_NAME;
        
        // Supported stream names
        this.INTERACTION_STREAM_NAME = "interaction";
        this.USERVIEWER_STREAM_NAME = "userviewer";
        this.BACKGROUNDREMOVAL_STREAM_NAME = "backgroundRemoval";
        this.SKELETON_STREAM_NAME = "skeleton";
        this.SENSORSTATUS_STREAM_NAME = "sensorStatus";
        
        // Supported event categories and associated event types
        this.USERSTATE_EVENT_CATEGORY = "userState";
        this.PRIMARYUSERCHANGED_EVENT_TYPE = "primaryUserChanged";
        this.USERSTATESCHANGED_EVENT_TYPE = "userStatesChanged";
        this.SENSORSTATUS_EVENT_CATEGORY = "sensorStatus";
        this.SENSORSTATUSCHANGED_EVENT_TYPE = "statusChanged";
        
        //////////////////////////////////////////////////////////////
        // Public KinectConnector methods

        // Enable connections with server
        //    .connect( [ hostUri [, hostPort [, basePath ] ] ] )
        //
        // hostUri: URI for host that is serving Kinect data.
        //          Defaults to "http://localhost".
        // hostPort: HTTP port from which Kinect data is being served.
        //           Defaults to 8181.
        // basePath: base URI path for all endpoints that serve Kinect data.
        //           Defaults to "kinect".
        this.connect = function (hostUri, hostPort, basePath) {
            hostUri = (hostUri != null) ? hostUri : DEFAULT_HOST_URI;
            hostPort = (hostPort != null) ? hostPort : DEFAULT_HOST_PORT;
            basePath = (basePath != null) ? basePath : DEFAULT_BASE_PATH;

            // Indicate we're now connected
            connectionUri = hostUri + ":" + hostPort + "/" + basePath;
            explicitDisconnect = false;
        };

        // Disable connections with server
        //     .disconnect()
        this.disconnect = function () {
            // stop all sensors currently tracked
            
            for (var sensorKey in sensorMap) {
                var sensor = sensorMap[sensorKey];
                sensor.disconnect();
            }

            sensorMap = {};
            
            // Indicate we're now disconnected
            connectionUri = null;
            explicitDisconnect = true;
        };

        // Gets an object representing a connection with a specific Kinect sensor.
        //     .sensor( [sensorName [, onconnection(sensor, isConnected)]] )
        //
        // sensorName: name used to refer to a specific Kinect sensor exposed by the server.
        //             Defaults to "default".
        // onconnection: Function to call back whenever status of connection to the
        //               server that owns the sensor with specified name changes from
        //               disconnected to connected or vice versa.
        //
        // Remarks
        // - If client has never called KinectConnector.connect or .disconnect, .connect() is
        //   called implicitly with default server URI parameters.
        // - If client has explicitly called KinectConnector.disconnect, calling this method
        //   returns null.
        // - If a non-null sensor is returned, it will already be in connected state (i.e.:
        //   there is no need to call KinectSensor.connect immediately after calling this
        //   method).
        this.sensor = function (sensorName, onconnection) {
            switch (typeof(sensorName)) {
                case "undefined":
                case "string":
                    break;
                        
                default:
                    throw new Error("first parameter must be a string or left unspecified");
            }
            switch (typeof (onconnection)) {
                case "undefined":
                    // provide a guarantee to KinectSensor constructor that onconnection
                    // will exist and be a real function
                    onconnection = function() { };
                    break;
                case "function":
                    break;

                default:
                    throw new Error("second parameter must be a function or left unspecified");
            }

            if (explicitDisconnect) {
                return null;
            }
            
            if (connectionUri == null) {
                // If we're not connected yet, connect with default parameters
                // when someone asks for a sensor.
                this.connect();
            }

            sensorName = (sensorName != null) ? sensorName : DEFAULT_SENSOR_NAME;

            // If sensor for specified name doesn't exist yet, create it
            if (!sensorMap.hasOwnProperty(sensorName)) {
                sensorMap[sensorName] = new KinectSensor(connectionUri + "/" + sensorName, onconnection);

                // Start the sensors connected by default when they are requested
                sensorMap[sensorName].connect();
            }

            return sensorMap[sensorName];
        };

        // Get whether server requests to REST endpoints should be asynchronous (true by default)
        //     .async()
        //
        // -------------------------------------------------------------------------------------
        // Specify whether server requests to REST endpoints should be asynchronous
        //     .async( asyncRequests )
        // 
        // isAsync: true if server requests to REST endpoints should be asynchronous
        //          false if server requests to REST endpoints should be synchronous
        this.async = function(isAsync) {
            if (typeof isAsync == 'undefined') {
                return asyncRequests;
            }

            var newAsync = isAsync == true;
            asyncRequests = newAsync;
        };
    }

    // The global Kinect object is a singleton instance of our internal KinectConnector type
    return new KinectConnector();
})();

//////////////////////////////////////////////////////////////
// Create the global Kinect UI factory object
var KinectUI = (function () {
    "use strict";
    
    //////////////////////////////////////////////////////////////
    // KinectUIAdapter object constructor
    function KinectUIAdapter() {
        
        //////////////////////////////////////////////////////////////
        // HandPointer object constructor
        function HandPointer(trackingId, playerIndex, handType) {
            //////////////////////////////////////////////////////////////
            // Public HandPointer properties
            this.trackingId = trackingId;
            this.playerIndex = playerIndex;
            this.handType = handType;
            this.timestampOfLastUpdate = 0;
            this.handEventType = "None";
            this.isTracked = false;
            this.isActive = false;
            this.isInteractive = false;
            this.isPressed = false;
            this.isPrimaryHandOfUser = false;
            this.isPrimaryUser = false;
            this.isInGripInteraction = false;
            this.captured = null;
            this.x = 0.0;
            this.y = 0.0;
            this.pressExtent = 0.0;
            this.rawX = 0.0;
            this.rawY = 0.0;
            this.rawZ = 0.0;
            this.originalHandPointer = null;
            this.updated = false;

            //////////////////////////////////////////////////////////////
            // Public HandPointer methods
            
            // Get all DOM elements that this hand pointer has entered.
            //     .getEnteredElements()
            this.getEnteredElements = function () {
                var key = getHandPointerKey(this.trackingId, this.handType);
                var data = internalHandPointerData[key];

                if (data == null) {
                    return [];
                }

                return data.enteredElements;
            };

            // Determine whether this hand pointer is over the specified DOM element.
            //     .getIsOver( element )
            //
            // element: DOM element against which to check hand pointer position.
            this.getIsOver = function (element) {
                // Iterate over cached elements
                var enteredElements = this.getEnteredElements();

                for (var iElement = 0; iElement < enteredElements.length; ++iElement) {
                    if (enteredElements[iElement] === element) {
                        return true;
                    }
                }

                return false;
            };
            
            // Create a capture association between this hand pointer and the specified DOM
            // element. This means that event handlers associated with element will receive
            // events triggered by this hand pointer even if hand pointer is not directly
            // over element.
            //     .capture( element )
            //
            // element: DOM element capturing hand pointer.
            //          If null, this hand pointer stops being captured and resumes normal
            //          event routing behavior.
            this.capture = function (element) {
                return captureHandPointer(this, element);
            };
            
            // Determine whether this hand pointer corresponds to the primary hand of the
            // primary user.
            //     .getIsPrimaryHandOfPrimaryUser()
            this.getIsPrimaryHandOfPrimaryUser = function () {
                return this.isPrimaryUser && this.isPrimaryHandOfUser;
            };
            
            // Update this hand pointer's properties from the specified hand pointer received
            // from the interaction stream.
            //     .update( streamHandPointer )
            this.update = function (streamHandPointer) {
                // save the stream hand pointer in case it has additional properties
                // that clients might be interested in
                this.originalHandPointer = streamHandPointer;
                
                this.updated = true;
                
                this.timestampOfLastUpdate = streamHandPointer.timestampOfLastUpdate;
                this.handEventType = streamHandPointer.handEventType;

                var pressedChanged = this.isPressed != streamHandPointer.isPressed;
                this.isPressed = streamHandPointer.isPressed;

                this.isTracked = streamHandPointer.isTracked;
                this.isActive = streamHandPointer.isActive;
                this.isInteractive = streamHandPointer.isInteractive;

                var primaryHandOfPrimaryUserChanged = this.getIsPrimaryHandOfPrimaryUser() != (streamHandPointer.isPrimaryHandOfUser && streamHandPointer.isPrimaryUser);
                this.isPrimaryHandOfUser = streamHandPointer.isPrimaryHandOfUser;
                this.isPrimaryUser = streamHandPointer.isPrimaryUser;

                var newPosition = interactionZoneToWindow({ "x": streamHandPointer.x, "y": streamHandPointer.y });
                var positionChanged = !areUserInterfaceValuesClose(newPosition.x, this.x) ||
                        !areUserInterfaceValuesClose(newPosition.y, this.y) ||
                        !areUserInterfaceValuesClose(streamHandPointer.pressExtent, this.pressExtent);
                this.x = newPosition.x;
                this.y = newPosition.y;
                this.pressExtent = streamHandPointer.pressExtent;

                this.rawX = streamHandPointer.rawX;
                this.rawY = streamHandPointer.rawY;
                this.rawZ = streamHandPointer.rawZ;

                return {
                    "pressedChanged": pressedChanged,
                    "primaryHandOfPrimaryUserChanged": primaryHandOfPrimaryUserChanged,
                    "positionChanged": positionChanged
                };
            };
        }
        
        //////////////////////////////////////////////////////////////
        // ImageWorkerManager object constructor
        //     new ImageWorkerManager()
        //
        // Remarks
        // Manages background thread work related to processing image
        // stream frames to get them ready to be displayed in a canvas
        // element.
        function ImageWorkerManager() {
            
            //////////////////////////////////////////////////////////////
            // ImageMetadata object constructor
            function ImageMetadata(imageCanvas) {
                this.isProcessing = false;
                this.canvas = imageCanvas;
                this.width = 0;
                this.height = 0;
            }

            //////////////////////////////////////////////////////////////
            // Private ImageWorkerManager properties
            var workerThread = null;
            var imageMetadataMap = {};
            
            //////////////////////////////////////////////////////////////
            // Private ImageWorkerManager methods
            function ensureInitialized() {
                // Lazy-initialize web worker thread
                if (workerThread == null) {
                    workerThread = new Worker(scriptRootURIPath + "KinectWorker-1.8.0.js");
                    workerThread.addEventListener("message", function (event) {
                        var imageName = event.data.imageName;
                        if (!imageMetadataMap.hasOwnProperty(imageName)) {
                            return;
                        }
                        var metadata = imageMetadataMap[imageName];
                        
                        switch (event.data.message) {
                            case "imageReady":
                                // Put ready image data in associated canvas
                                var canvasContext = metadata.canvas.getContext("2d");
                                canvasContext.putImageData(event.data.imageData, 0, 0);
                                metadata.isProcessing = false;
                                break;
                                
                            case "notProcessed":
                                metadata.isProcessing = false;
                                break;
                        }
                    });
                }
            }

            //////////////////////////////////////////////////////////////
            // Public ImageWorkerManager methods
            
            // Send named image data to be processed by worker thread
            //     .processImageData(imageName, imageBuffer, width, height)
            //
            // imageName: Name of image to process
            // imageBuffer: ArrayBuffer containing image data
            // width: width of image corresponding to imageBuffer data
            // height: height of image corresponding to imageBuffer data
            this.processImageData = function (imageName, imageBuffer, width, height) {
                ensureInitialized();
                
                if (!imageMetadataMap.hasOwnProperty(imageName)) {
                    // We're not tracking this image, so no work to do
                    return;
                }
                var metadata = imageMetadataMap[imageName];
                
                if (metadata.isProcessing || (width <= 0) || (height <= 0)) {
                    // Don't send more data to worker thread when we are in the middle
                    // of processing data already.
                    // Also, Only do work if image data to process is of the expected size
                    return;
                }
                
                metadata.isProcessing = true;

                if ((width != metadata.width) || (height != metadata.height)) {
                    // Whenever the image width or height changes, update image tracking metadata
                    // and canvas ImageData associated with worker thread
                    
                    var canvasContext = metadata.canvas.getContext("2d");
                    var imageData = canvasContext.createImageData(width, height);
                    metadata.width = width;
                    metadata.height = height;
                    metadata.canvas.width = width;
                    metadata.canvas.height = height;

                    workerThread.postMessage({ "message": "setImageData", "imageName": imageName, "imageData": imageData });
                }
                
                workerThread.postMessage({ "message": "processImageData", "imageName": imageName, "imageBuffer": imageBuffer });
            };

            // Associate specified image name with canvas ImageData object for future usage by
            // worker thread
            //     .setImageData(imageName, canvas)
            //
            // imageName: Name of image stream to associate with ImageData object
            // canvas: Canvas to bind to user viewer stream
            this.setImageData = function (imageName, canvas) {
                ensureInitialized();

                if (canvas != null) {
                    var metadata = new ImageMetadata(canvas);
                    imageMetadataMap[imageName] = metadata;
                } else if (imageMetadataMap.hasOwnProperty(imageName)) {
                    // If specified canvas is null but we're already tracking image data,
                    // remove metadata associated with this image.
                    delete imageMetadataMap[imageName];
                }
            };
        }
        
        //////////////////////////////////////////////////////////////
        // Private KinectUIAdapter constants
        var LAZYRELEASE_RADIUS = 0.3;
        var LAZYRELEASE_YCUTOFF = LAZYRELEASE_RADIUS / 3;
        
        //////////////////////////////////////////////////////////////
        // Private KinectUIAdapter properties
        var uiAdapter = this;
        var isInInteractionFrame = false;
        var isClearRequestPending = false;
        var handPointerEventsEnabled = true;
        // Property names of internalHandPointerData are keys that encode user tracking id and hand type.
        // Property values are JSON objects with "handPointer" and "enteredElements" properties.
        var internalHandPointerData = {};
        var excludedElements = [];
        var eventHandlers = {};
        var bindableStreamNames = {};
        bindableStreamNames[Kinect.USERVIEWER_STREAM_NAME] = true;
        bindableStreamNames[Kinect.BACKGROUNDREMOVAL_STREAM_NAME] = true;
        var imageWorkerManager = new ImageWorkerManager();

        //////////////////////////////////////////////////////////////
        // Private KinectUIAdapter methods
        function interactionZoneToElement(point, element) {
            return { "x": point.x * element.offsetWidth, "y": point.y * element.offsetHeight };
        }

        function elementToInteractionZone(point, element) {
            return { "x": point.x / element.offsetWidth, "y": point.y / element.offsetHeight };
        }

        function interactionZoneToWindow(point) {
            return { "x": point.x * window.innerWidth, "y": point.y * window.innerHeight };
        }

        function windowToInteractionZone(point) {
            return { "x": point.x / window.innerWidth, "y": point.y / window.innerHeight };
        }

        function areUserInterfaceValuesClose(a, b) {
            return Math.abs(a - b) < 0.5;
        }

        function getPressTargetPoint(element) {
            // Hardcoded to always return the center point
            return { "x": 0.5, "y": 0.5 };
        }

        function getHandPointerKey(trackingId, handType) {
            return handType + trackingId;
        }

        function createInteractionEvent(eventName, detail) {
            var event = document.createEvent("CustomEvent");
            var canBubble = true;
            var cancelable = false;

            switch (eventName) {
                case uiController.HANDPOINTER_ENTER:
                case uiController.HANDPOINTER_LEAVE:
                    canBubble = false;
                    break;
            }

            event.initCustomEvent(eventName, canBubble, cancelable, detail);

            return event;
        }

        function raiseHandPointerEvent(element, eventName, handPointer) {
            if (!handPointerEventsEnabled) {
                return;
            }
            
            var event = createInteractionEvent(eventName, { "handPointer": handPointer });
            element.dispatchEvent(event);
        }
        
        function raiseGlobalUIEvent(eventName, eventData) {
            if (!handPointerEventsEnabled || !eventHandlers.hasOwnProperty(eventName)) {
                // Events are disabled, or there are no event handlers registered for event.
                return;
            }

            var handlerArray = eventHandlers[eventName];
            for (var i = 0; i < handlerArray.length; ++i) {
                handlerArray[i](eventData);
            }
        }
        
        function switchCapture(handPointer, oldElement, newElement) {
            handPointer.captured = newElement;

            if (oldElement != null) {
                raiseHandPointerEvent(oldElement, uiController.HANDPOINTER_LOSTCAPTURE, handPointer);
            }

            if (newElement != null) {
                raiseHandPointerEvent(newElement, uiController.HANDPOINTER_GOTCAPTURE, handPointer);
            }
        }

        function captureHandPointer(handPointer, element) {
            var id = getHandPointerKey(handPointer.trackingId, handPointer.handType);

            if (!internalHandPointerData.hasOwnProperty(id)) {
                // We're not already tracking a hand pointer with the same id.
                return false;
            }

            var handPointerData = internalHandPointerData[id];
            var checkHandPointer = handPointerData.handPointer;
            if (checkHandPointer !== handPointer) {
                // The hand pointer we're tracking is not the same one that was handed in.
                // Caller may have a stale hand pointer instance.
                return false;
            }

            if (element != null && handPointer.captured != null) {
                // Request wasn't to clear capture and some other element already has this
                // HandPointer captured.
                return false;
            }

            switchCapture(handPointer, handPointer.captured, element);
            return true;
        }

        // Get the DOM element branch (parent chain), rooted in body element,
        // that includes the specified leaf element.
        // If leafElement is null, the returned branch will be empty
        function getDOMBranch(leafElement) {
            var scanStop = document.body.parentNode;
            var branch = [];

            for (var scan = leafElement; (scan != null) && (scan != scanStop) && (scan != document) ; scan = scan.parentNode) {
                branch.push(scan);
            }

            return branch;
        }

        function doEnterLeaveNotifications(handPointer, primaryHandOfPrimaryUserChanged, oldEnteredElements, newEnteredElements) {
            var isPrimaryHandOfPrimaryUser = handPointer.getIsPrimaryHandOfPrimaryUser();
            var wasPrimaryHandOfPrimaryUser = primaryHandOfPrimaryUserChanged ? !isPrimaryHandOfPrimaryUser : isPrimaryHandOfPrimaryUser;

            // find common elements between old and new set
            // We take advantage of the fact that later elements in the array contain earlier
            // elements, so they will remain in the same state for a longer time.
            var firstOldMatch = oldEnteredElements.length;
            var firstNewMatch = newEnteredElements.length;
            while ((firstOldMatch > 0) &&
                   (firstNewMatch > 0) &&
                   (oldEnteredElements[firstOldMatch - 1] === newEnteredElements[firstNewMatch - 1])) {
                --firstOldMatch;
                --firstNewMatch;
            }

            // Tell old entered elements that are not entered anymore that we have left them
            for (var iLeft = 0; iLeft < oldEnteredElements.length; ++iLeft) {
                var leftElement = oldEnteredElements[iLeft];

                if (iLeft < firstOldMatch) {
                    // This element is not one of the common elements, so we have left it

                    // If we were or still are the HandPointer for the primary user's
                    // primary hand then clear out the "IsPrimaryHandPointerOver" property.
                    if (wasPrimaryHandOfPrimaryUser) {
                        uiController.setIsPrimaryHandPointerOver(leftElement, false);
                    }

                    // Tell this element that this hand pointer has left
                    raiseHandPointerEvent(leftElement, uiController.HANDPOINTER_LEAVE, handPointer);
                } else {
                    // This is one of the common elements
                    if (wasPrimaryHandOfPrimaryUser && !isPrimaryHandOfPrimaryUser) {
                        // Hand pointer didn't leave the element but it is no longer the primary
                        uiController.setIsPrimaryHandPointerOver(leftElement, false);
                    }
                }
            }

            // Tell new entered elements that were not previously entered we are now over them
            for (var iEntered = 0; iEntered < newEnteredElements.length; ++iEntered) {
                var enteredElement = newEnteredElements[iEntered];

                if (iEntered < firstNewMatch) {
                    // This element is not one of the common elements, so we have entered it

                    // If we are the HandPointer for the primary user's primary hand then
                    // set the "IsPrimaryHandPointerOver" property.
                    if (isPrimaryHandOfPrimaryUser) {
                        uiController.setIsPrimaryHandPointerOver(enteredElement, true);
                    }

                    // Tell this element that this hand pointer has left
                    raiseHandPointerEvent(enteredElement, uiController.HANDPOINTER_ENTER, handPointer);
                } else {
                    // This is one of the common elements
                    if (!wasPrimaryHandOfPrimaryUser && isPrimaryHandOfPrimaryUser) {
                        // Hand pointer was already in this element but it became the primary
                        uiController.setIsPrimaryHandPointerOver(enteredElement, true);
                    }
                }
            }
        }
        
        function beginInteractionFrame() {
            if (isInInteractionFrame) {
                console.log("Call to beginInteractionFrame was made without corresponding call to endInteractionFrame");
                return;
            }

            isInInteractionFrame = true;
            isClearRequestPending = false;

            for (var handPointerKey in internalHandPointerData) {
                var handPointer = internalHandPointerData[handPointerKey].handPointer;
                handPointer.updated = false;
            }
        }

        function handleHandPointerChanges(handPointerData, pressedChanged, positionChanged, primaryHandOfPrimaryUserChanged, removed) {
            var doPress = false;
            var doRelease = false;
            var doMove = false;
            var doLostCapture = false;
            var doGrip = false;
            var doGripRelease = false;
            var handPointer = handPointerData.handPointer;

            if (removed) {
                // Deny the existence of this hand pointer
                doRelease = handPointer.isPressed;
                doLostCapture = handPointer.captured != null;
            } else {
                if (pressedChanged) {
                    doPress = handPointer.isPressed;
                    doRelease = !handPointer.isPressed;
                }

                if (positionChanged) {
                    doMove = true;
                }

                doGrip = handPointer.handEventType.toLowerCase() == "grip";
                doGripRelease = handPointer.handEventType.toLowerCase() == "griprelease";
            }

            if (doLostCapture) {
                switchCapture(handPointer, handPointer.captured, null);
            }

            var targetElement = handPointer.captured;
            if (targetElement == null) {
                targetElement = hitTest(handPointer.x, handPointer.y);
            }

            // Update internal enter/leave state
            var oldEnteredElements = handPointerData.enteredElements;
            var newEnteredElements = getDOMBranch(removed ? null : targetElement);
            handPointerData.enteredElements = newEnteredElements;

            // See if this hand pointer is participating in a grip-initiated
            // interaction.
            var newIsInGripInteraction = false;
            if (targetElement != null) {
                var result = raiseHandPointerEvent(targetElement, uiController.QUERY_INTERACTION_STATUS, handPointer);

                if ((result != null) && result.isInGripInteraction) {
                    newIsInGripInteraction = true;
                }
            }

            handPointer.isInGripInteraction = newIsInGripInteraction;

            //// After this point there should be no more changes to the internal
            //// state of the handPointers.  We don't want event handlers calling us
            //// when our internal state is inconsistent.

            doEnterLeaveNotifications(handPointer, primaryHandOfPrimaryUserChanged, oldEnteredElements, newEnteredElements);

            if (targetElement == null) {
                return;
            }

            if (doGrip) {
                raiseHandPointerEvent(targetElement, uiController.HANDPOINTER_GRIP, handPointer);
            }

            if (doGripRelease) {
                raiseHandPointerEvent(targetElement, uiController.HANDPOINTER_GRIPRELEASE, handPointer);
            }

            if (doPress) {
                raiseHandPointerEvent(targetElement, uiController.HANDPOINTER_PRESS, handPointer);
            }

            if (doMove) {
                raiseHandPointerEvent(targetElement, uiController.HANDPOINTER_MOVE, handPointer);
            }

            if (doRelease) {
                raiseHandPointerEvent(targetElement, uiController.HANDPOINTER_PRESSRELEASE, handPointer);
            }
        }

        function handleHandPointerData(interactionStreamHandPointers) {
            if (!isInInteractionFrame) {
                console.log("Call to handleHandPointerData was made without call to beginInteractionFrame");
                return;
            }

            if (isClearRequestPending) {
                // We don't care about new hand pointer data if client requested to clear
                // all hand pointers while in the middle of interaction frame processing.
                return;
            }

            for (var iData = 0; iData < interactionStreamHandPointers.length; ++iData) {
                var streamHandPointer = interactionStreamHandPointers[iData];
                var id = getHandPointerKey(streamHandPointer.trackingId, streamHandPointer.handType);

                var handPointerData;
                var handPointer;
                if (internalHandPointerData.hasOwnProperty(id)) {
                    handPointerData = internalHandPointerData[id];
                    handPointer = handPointerData.handPointer;
                } else {
                    handPointer = new HandPointer(streamHandPointer.trackingId, streamHandPointer.playerIndex, streamHandPointer.handType);

                    handPointerData = { "handPointer": handPointer, "enteredElements": [] };
                    internalHandPointerData[id] = handPointerData;
                }

                var result = handPointer.update(streamHandPointer);
                handleHandPointerChanges(handPointerData, result.pressedChanged, result.positionChanged, result.primaryHandOfPrimaryUserChanged, false);
            }
        }

        function endInteractionFrame() {
            if (!isInInteractionFrame) {
                console.log("Call to endInteractionFrame was made without call to beginInteractionFrame");
                return;
            }

            removeStaleHandPointers();

            isClearRequestPending = false;
            isInInteractionFrame = false;
        }

        function removeStaleHandPointers() {
            var nonUpdatedHandpointers = [];

            for (var handPointerKey in internalHandPointerData) {
                // If we need to stop tracking this hand pointer
                var handPointer = internalHandPointerData[handPointerKey].handPointer;
                if (isClearRequestPending || !handPointer.updated) {
                    nonUpdatedHandpointers.push(handPointerKey);
                }
            }

            for (var i = 0; i < nonUpdatedHandpointers.length; ++i) {
                var handPointerKey = nonUpdatedHandpointers[i];
                var handPointerData = internalHandPointerData[handPointerKey];
                var handPointer = handPointerData.handPointer;
                var pressedChanged = handPointer.isPressed;
                var positionChanged = false;
                var primaryHandOfPrimaryUserChanged = handPointer.getIsPrimaryHandOfPrimaryUser();
                var removed = true;

                handPointer.isTracked = false;
                handPointer.isActive = false;
                handPointer.isInteractive = false;
                handPointer.isPressed = false;
                handPointer.isPrimaryUser = false;
                handPointer.isPrimaryHandOfUser = false;

                handleHandPointerChanges(handPointerData, pressedChanged, positionChanged, primaryHandOfPrimaryUserChanged, removed);

                delete internalHandPointerData[handPointerKey];
            }
        }
        
        function updatePublicHandPointers() {
            var iHandPointer = 0;

            for (var handPointerKey in internalHandPointerData) {
                var handPointer = internalHandPointerData[handPointerKey].handPointer;

                if (handPointer.isTracked) {
                    if (uiAdapter.handPointers.length > iHandPointer) {
                        uiAdapter.handPointers[iHandPointer] = handPointer;
                    } else {
                        uiAdapter.handPointers.push(handPointer);
                    }

                    ++iHandPointer;
                }
            }

            // Truncate the length of the array to the number of valid elements
            uiAdapter.handPointers.length = iHandPointer;

            raiseGlobalUIEvent(uiController.HANDPOINTERS_UPDATED, uiAdapter.handPointers);
        }
        
        function hitTest(x, y) {
            // Ensure excluded elements are hidden before performing hit test
            var displayProp = "display";
            var displayValues = [];
            for (var i = 0; i < excludedElements.length; ++i) {
                var element = excludedElements[i];
                displayValues.push(element.style[displayProp]);
                element.style[displayProp] = "none";
            }

            var hitElement = document.elementFromPoint(x, y);

            // Restore visibility to excluded elements
            for (var i = 0; i < excludedElements.length; ++i) {
                excludedElements[i].style[displayProp] = displayValues[i];
            }

            return hitElement;
        }
        
        function getElementId(element) {
            // First check if we've already set the kinect element ID.
            var id = jQuery.data(element, kinectIdPrefix);
            if (id != null) {
                return id;
            }

            // If not, fall back to regular element id, if present
            id = element.id;
            
            if (id.trim() == "") {
                // If there is no id on element, assign one ourselves
                id = kinectIdPrefix + (++lastAssignedControlId);
            }
            
            // Remember assigned id
            jQuery.data(element, kinectIdPrefix, id);
            return id;
        }
        
        function setCapture(element) {
            // Not all browsers support mouse capture functionality
            if (typeof element.setCapture == "function") {
                element.setCapture(true);
                return true;
            }

            return false;
        }

        function releaseCapture() {
            // Not all browsers support mouse capture functionality
            if (typeof document.releaseCapture == "function") {
                document.releaseCapture();
                return true;
            }

            return false;
        }

        function promoteToButton(element) {
            var content = element.innerHTML;

            if (element.children.length <= 0) {
                // If element has no children, wrap content in an element that will perform
                // default text alignment
                content = "<span class='kinect-button-text'>" + content + "</span>";
            }

            // Wrap all content in a "kinect-button-surface" div element to allow button
            // shrinking and expanding as user hovers over or presses button
            element.innerHTML = "<div class='kinect-button-surface'>" + content + "</div>";

            uiController.setIsPressTarget(element, true);
            var capturedHandPointer = null;
            var pressedElement = null;
            var isMouseOver = false;
            var isMouseCaptured = false;
            var removeCaptureEvents = false;

            var releaseButtonCapture = function(event) {
                releaseCapture();
                isMouseCaptured = false;

                if (removeCaptureEvents) {
                    $(event.target).off("mousemove");
                }
            };

            $(element).on({
                // respond to hand pointer events
                handPointerPress: function (event) {
                    var handPointer = event.originalEvent.detail.handPointer;
                    if (capturedHandPointer == null && handPointer.getIsPrimaryHandOfPrimaryUser()) {
                        handPointer.capture(event.currentTarget);
                        event.stopPropagation();
                    }
                },
                handPointerGotCapture: function (event) {
                    var handPointer = event.originalEvent.detail.handPointer;
                    if (capturedHandPointer == null) {
                        capturedHandPointer = handPointer;
                        pressedElement = handPointer.captured;
                        $(element).addClass(uiController.BUTTON_PRESSED_CLASS);
                        event.stopPropagation();
                    }
                },
                handPointerPressRelease: function (event) {
                    var handPointer = event.originalEvent.detail.handPointer;
                    if (capturedHandPointer == handPointer) {
                        var captured = handPointer.captured;
                        handPointer.capture(null);

                        if (captured == event.currentTarget) {
                            // Trigger click on press release if release point is close enough
                            // to around the top half of button, or if it's anywhere below
                            // button. I.e.: accept a "lazy-press" as a real press.
                            
                            var box = captured.getBoundingClientRect();
                            var insideButton = false;
                            if ((box.left <= handPointer.x) && (handPointer.x <= box.right) &&
                                (box.top <= handPointer.y) && (handPointer.y <= box.bottom)) {
                                insideButton = true;
                            }
                            
                            // Map hand pointer to a coordinate space around center of button
                            // and convert to be relative to window size.
                            var relativePoint = windowToInteractionZone({
                                "x": handPointer.x - ((box.left + box.right) / 2),
                                "y": handPointer.y - ((box.top + box.bottom) / 2)
                            });
                            var isWithinLazyReleaseArea = true;
                            if (relativePoint.y < LAZYRELEASE_YCUTOFF) {
                                isWithinLazyReleaseArea =
                                    Math.sqrt((relativePoint.x * relativePoint.x) + (relativePoint.y * relativePoint.y)) < LAZYRELEASE_RADIUS;
                            }
                            
                            if (insideButton || isWithinLazyReleaseArea) {
                                $(element).click();
                            }
                            
                            event.stopPropagation();
                        }
                    }
                },
                handPointerLostCapture: function (event) {
                    var handPointer = event.originalEvent.detail.handPointer;
                    if (capturedHandPointer == handPointer) {
                        capturedHandPointer = null;
                        pressedElement = null;
                        $(element).removeClass(uiController.BUTTON_PRESSED_CLASS);
                        event.stopPropagation();
                    }
                },
                handPointerEnter: function (event) {
                    var target = event.currentTarget;
                    if (KinectUI.getIsPrimaryHandPointerOver(target)) {
                        $(element).addClass(uiController.BUTTON_HOVER_CLASS);
                    }
                },
                handPointerLeave: function (event) {
                    var target = event.currentTarget;
                    if (!KinectUI.getIsPrimaryHandPointerOver(target)) {
                        $(element).removeClass(uiController.BUTTON_HOVER_CLASS);
                    }
                },
                // respond to mouse events in a similar way to hand pointer events
                // Note: We use button-hover class rather than :hover pseudo-class because
                //       :hover does not play well with our button-pressed class.
                mouseenter: function(event) {
                    isMouseOver = true;
                    $(element).addClass(uiController.BUTTON_HOVER_CLASS);
                    if (pressedElement != null) {
                        $(element).addClass(uiController.BUTTON_PRESSED_CLASS);
                    }
                },
                mouseleave: function (event) {
                    isMouseOver = false;
                    if (!isMouseCaptured || (pressedElement != null)) {
                        $(element).removeClass(uiController.BUTTON_HOVER_CLASS);
                        pressedElement = null;
                    }
                    $(element).removeClass(uiController.BUTTON_PRESSED_CLASS);
                },
                mousedown: function (event) {
                    if (event.button == 0) {
                        pressedElement = event.target;
                        if (setCapture(event.target)) {
                            isMouseCaptured = true;
                            
                            // Different browsers have slightly different behaviors related to which element
                            // will be considered the event target, and how mouseenter and mouseleave events
                            // are sent in case of capture, so cover all bases.
                            if (event.target != event.currentTarget) {
                                removeCaptureEvents = true;
                                $(event.target).mousemove(function (moveEvent) {
                                    var box = element.getBoundingClientRect();
                                    var insideBox = (box.left <= moveEvent.clientX) && (moveEvent.clientX <= box.right) &&
                                        (box.top <= moveEvent.clientY) && (moveEvent.clientY <= box.bottom);
                                    if (!insideBox && isMouseCaptured) {
                                        releaseButtonCapture(moveEvent);
                                    }
                                });
                            }
                        }
                        $(element).addClass(uiController.BUTTON_PRESSED_CLASS);

                        event.stopPropagation();
                    }
                },
                mouseup: function (event) {
                    if (event.button == 0) {
                        var fakeClick = false;
                        if ((pressedElement != null) && !isMouseCaptured && (pressedElement != event.target)) {
                            // If this browser doesn't support capture and the event target
                            // during mouse up does not match exactly the event target during
                            // mouse down then browser will not automatically trigger a click
                            // event, so we will trigger one ourselves because we know that the
                            // same logical Kinect button received a mouse down and mouse up.
                            //
                            // This condition can happen because of shrink and expand
                            // animations for Kinect button hover and press.
                            fakeClick = true;
                        }
                        
                        pressedElement = null;
                        if (isMouseCaptured) {
                            releaseButtonCapture(event);
                        }
                        $(element).removeClass(uiController.BUTTON_PRESSED_CLASS);
                        if (!isMouseOver) {
                            $(element).removeClass(uiController.BUTTON_HOVER_CLASS);
                        }
                        
                        if (fakeClick) {
                            $(element).click();
                        }

                        event.stopPropagation();
                    }
                }
            });
        }
        
        //////////////////////////////////////////////////////////////
        // Public KinectUIAdapter properties
        this.handPointers = [];
        
        //////////////////////////////////////////////////////////////
        // Public KinectUIAdapter methods

        // Function called back when a sensor stream frame is ready to be processed.
        //     .streamFrameHandler(streamFrame)
        //
        // streamFrame: stream frame ready to be processed
        //
        // Remarks
        // Processes interaction frames and ignores all other kinds of stream frames.
        this.streamFrameHandler = function (streamFrame) {
            if (typeof streamFrame != "object") {
                throw new Error("Frame must be an object");
            }
            
            if (streamFrame == null) {
                // Ignore null frames
                return;
            }

            var streamName = streamFrame.stream;
            switch (streamName) {
                case "interaction":
                    beginInteractionFrame();

                    if (streamFrame.handPointers != null) {
                        handleHandPointerData(streamFrame.handPointers);
                    }

                    endInteractionFrame();

                    updatePublicHandPointers();
                    break;
                    
                default:
                    if (bindableStreamNames[streamName]) {
                        // If this is one of the bindable stream names
                        imageWorkerManager.processImageData(streamName, streamFrame.buffer, streamFrame.width, streamFrame.height);
                    }
                    break;
            }
        };
        
        // Resets the hand pointer array to its initial state (zero hand pointers tracked).
        //     .clearHandPointers()
        this.clearHandPointers = function () {
            if (!isInInteractionFrame) {
                // If we're not already processing an interaction frame, we fake
                // an empty frame so that all hand pointers get cleared out.
                beginInteractionFrame();
                endInteractionFrame();
                updatePublicHandPointers();
            } else {
                // If we're in the middle of processing an interaction frame, we
                // can't modify all of our data structures immediately, but need to
                // remember to do so.
                isClearRequestPending = true;
            }
        };
        
        // Function called back when a sensor's interaction stream needs interaction
        // information in order to adjust a hand pointer position relative to UI.
        //     .hitTestHandler(trackingId, handType, xPos, yPos)
        //
        // trackingId: The skeleton tracking ID for which interaction information is
        //             being retrieved.
        // handType: "left" or "right" to represent hand type for which interaction
        //           information is being retrieved.
        // xPos: X-coordinate of UI location for which interaction information is being
        //       retrieved. 0.0 corresponds to left edge of interaction region and 1.0
        //       corresponds to right edge of interaction region.
        // yPos: Y-coordinate of UI location for which interaction information is being
        //       retrieved. 0.0 corresponds to top edge of interaction region and 1.0
        //       corresponds to bottom edge of interaction region.
        this.hitTestHandler = function (trackingId, handType, xPos, yPos) {
            if (typeof trackingId != "number") {
                throw new Error("First parameter must be a number");
            }
            if (typeof handType != "string") {
                throw new Error("Second parameter must be a string");
            }

            var interactionInfo = { "isPressTarget": false, "isGripTarget": false };

            // First scale coordinates to be relative to full browser window
            var windowPos = interactionZoneToWindow({ "x": xPos, "y": yPos });
            var handPointerId = getHandPointerKey(trackingId, handType);
            var capturedElement = internalHandPointerData.hasOwnProperty(handPointerId) ? internalHandPointerData[handPointerId].handPointer.captured : null;
            var targetElement = (capturedElement != null) ? capturedElement : hitTest(windowPos.x, windowPos.y);

            if (targetElement != null) {
                // Walk up the tree and try to find a grip target and/or a press target
                for (var searchElement = targetElement;
                                searchElement != null && searchElement != document &&
                                (!interactionInfo.isGripTarget || !interactionInfo.isPressTarget) ;
                                searchElement = searchElement.parentNode) {

                    if (!interactionInfo.isPressTarget) {
                        if (uiController.getIsPressTarget(searchElement)) {
                            interactionInfo.isPressTarget = true;
                            interactionInfo.pressTargetControlId = getElementId(searchElement);

                            // Get the press target point in client coordinates relative to search element
                            var pressTargetPoint = interactionZoneToElement(getPressTargetPoint(searchElement), searchElement);
                            var boundingRect = searchElement.getBoundingClientRect();

                            // Now adjust press target point coordinate to be relative to viewport
                            pressTargetPoint.x += boundingRect.left;
                            pressTargetPoint.y += boundingRect.top;

                            // Now scale press attraction point back to interaction zone coordinates
                            var adjustedPoint = windowToInteractionZone(pressTargetPoint);
                            interactionInfo.pressAttractionPointX = adjustedPoint.x;
                            interactionInfo.pressAttractionPointY = adjustedPoint.y;
                        }
                    }

                    if (!interactionInfo.isGripTarget) {
                        if (uiController.getIsGripTarget(searchElement)) {
                            interactionInfo.isGripTarget = true;
                        }
                    }
                }
            }
            
            return interactionInfo;
        };
        
        // Adds an element that should be excluded from hit testing (both for press adjustment
        // and for UI message routing).
        //     .addHitTestExclusion( element )
        //
        // element: Element to exlude from hit testing.
        this.addHitTestExclusion = function (element) {
            if (element == null) {
                console.log('Tried to add a hit test exclusion for a null element.');
                return;
            }
            
            excludedElements.push(element);
        };

        // Stops excluding an element from hit testing (both for press adjustment and for UI
        // message routing).
        //     .removeHitTestExclusion( element )
        //
        // element: Element to stop exluding from hit testing.
        this.removeHitTestExclusion = function (element) {
            if (element == null) {
                console.log('Tried to remove a hit test exclusion for a null element.');
                return;
            }
            
            var index = excludedElements.indexOf(element);
            if (index >= 0) {
                excludedElements.splice(index, 1);
            }
        };

        // Bind the specified canvas element with the specified image stream
        //     .bindStreamToCanvas( streamName, canvas )
        //
        // streamName: name of stream to bind to canvas element. Must be one of the supported
        //             image stream names (e.g.: KinectUI.USERVIEWER_STREAM_NAME and
        //             KinectUI.BACKGROUNDREMOVAL_STREAM_NAME)
        // canvas: Canvas to bind to user viewer stream
        //
        // Remarks
        // After binding a stream to a canvas, image data for that stream will
        // be rendered into the canvas whenever a new stream frame arrives.
        this.bindStreamToCanvas = function (streamName, canvas, width, height) {
            if (!bindableStreamNames[streamName]) {
                throw new Error("first parameter must be specified and must be one of the supported stream names");
            }

            if (!(canvas instanceof HTMLCanvasElement)) {
                throw new Error("second parameter must be specified and must be a canvas element");
            }

            this.unbindStreamFromCanvas(streamName);

            imageWorkerManager.setImageData(streamName, canvas);
        };

        // Unbind the specified image stream from previously bound canvas element, if any.
        //     .unbindStreamFromCanvas(streamName)
        //
        // streamName: name of stream to unbind from its corresponding canvas element
        this.unbindStreamFromCanvas = function(streamName) {
            imageWorkerManager.setImageData(streamName, null);
        };
        
        // Attach a new handler for a specified global UI event.
        //     .on( eventName, handler(eventData) )] )
        //
        // eventName: Name of global event for which handler is being attached.
        // handler: Callback function to be executed when a global UI event of the specified
        //          name occurs. E.g.: when set of hand pointers has been updated (eventName =
        //          "handPointersUpdated").
        this.on = function (eventName, handler) {
            if (typeof (eventName) != "string") {
                throw new Error("first parameter must be specified and must be a string");
            }
            if (typeof (handler) != "function") {
                throw new Error("second parameter must be specified and must be a function");
            }

            var handlerArray;
            if (eventHandlers.hasOwnProperty(eventName)) {
                handlerArray = eventHandlers[eventName];
            } else {
                handlerArray = [];
                eventHandlers[eventName] = handlerArray;
            }
            
            handlerArray.push(handler);
        };

        // Removes one (or all) global UI event handler(s) for specified global UI event.
        //     .removeEventHandler( eventName, [handler(eventData)] )] )
        //
        // eventName: Name of global event for which handler is being removed.
        // handler: Global UI event handler callback function to be removed.
        //          If omitted, all event handlers for specified event are removed.
        this.off = function (eventName, handler) {
            if (typeof (handler) != "string") {
                throw new Error("first parameter must be specified and must be a string");
            }

            var removeAll = false;
            switch (typeof (handler)) {
                case "undefined":
                    removeAll = true;
                    break;
                case "function":
                    break;

                default:
                    throw new Error("second parameter must either be a function or left unspecified");
            }
            
            if (!eventHandlers.hasOwnProperty(eventName)) {
                // If there are no event handlers associated with event, just return
                return;
            }

            if (removeAll) {
                eventHandlers[eventName] = [];
            } else {
                var index = eventHandlers[eventName].indexOf(handler);
                if (index >= 0) {
                    eventHandlers[eventName].slice(index, index + 1);
                }
            }
        };
        
        // Configures the specified DOM element array to act as a Kinect UI button
        //     .promoteButtons([elements])
        //
        // elements: DOM element array or HTMLCollection where each element will be configured
        //           to act as a Kinect UI button.
        //           If left unspecified, all document elements with class equal to
        //           KinectUI.BUTTON_CLASS will be promoted to buttons.
        this.promoteButtons = function (elements) {
            var type = typeof elements;
            var error = new Error("first parameter must be left unspecified or be an array equivalent");
            switch (type) {
                case "undefined":
                    elements = document.getElementsByClassName(uiController.BUTTON_CLASS);
                    break;
                case "object":
                    if (elements == null) {
                        // If null, treat as if an empty array was specified
                        return;
                    }
                    
                    if (!("length" in elements)) {
                        throw error;
                    }
                    break;
                    
                default:
                    throw error;
            }

            for (var i = 0; i < elements.length; ++i) {
                var element = elements[i];
                if ((typeof element != "object") || (element.nodeType != Node.ELEMENT_NODE)) {
                    throw new Error("each array element must be a DOM element");
                }

                promoteToButton(elements[i]);
            }
        };

        // Creates the default cursor UI elements with associated behavior
        //     .createDefaultCursor()
        //
        // Returns an object with the following properties/functions:
        // - element: property referencing the DOM element that represents the cursor
        // - hide(): function used to hide the cursor
        // - show(): function used to show the cursor
        this.createDefaultCursor = function() {
            // First check if cursor element has already been created
            var cursorElement = document.getElementById(uiController.CURSOR_ID);
            if (cursorElement != null) {
                return jQuery.data(cursorElement, uiController.CURSOR_ID);
            }
            
            var showCursor = true;
            cursorElement = document.createElement("div");
            cursorElement.id = uiController.CURSOR_ID;
            cursorElement.innerHTML = '\
                <svg viewBox="0 0 250 250">\
                    <defs>\
                        <radialGradient id="kinect-pressing-gradient" r="150%">\
                            <stop stop-color="#663085" offset="0.0%"></stop>\
                            <stop stop-color="white" offset="100.0%" ></stop>\
                        </radialGradient>\
                        <radialGradient id="kinect-extended-gradient">\
                            <stop stop-color="#01b3ff" offset="0.0%"></stop>\
                            <stop stop-color="#04e5ff" offset="98.1%" ></stop>\
                            <stop stop-color="#04e5ff" offset="99.2%" ></stop>\
                            <stop stop-color="#04e5ff" offset="100.0%" ></stop>\
                        </radialGradient>\
                        <path id="kinect-open-hand-base" stroke-width="2.66667px" stroke-miterlimit="2.75" d="M 184.325,52.329 C 177.166,51.961 174.195,56.492 173.858,59.838 C 173.858,59.838 170.148,117.100 170.148,118.229 C 170.148,121.405 166.840,124.394 163.662,124.394 C 160.488,124.394 157.912,121.819 157.912,118.644 C 157.912,117.843 160.558,26.069 160.558,26.069 C 160.746,21.648 156.897,14.964 148.905,14.845 C 140.912,14.727 137.941,20.814 137.759,25.106 C 137.759,25.106 136.400,107.066 136.400,108.288 C 136.400,111.463 133.825,114.038 130.650,114.038 C 127.474,114.038 124.900,111.463 124.900,108.288 C 124.900,107.743 120.237,15.217 119.553,13.920 C 118.498,10.296 113.940,7.103 108.746,7.227 C 102.840,7.368 98.306,11.584 98.410,15.973 C 98.412,16.051 98.427,16.125 98.431,16.202 C 98.162,17.142 102.662,111.920 102.662,112.943 C 102.662,116.118 100.087,118.693 96.912,118.693 C 93.735,118.693 89.829,116.118 89.829,112.943 C 89.829,112.611 78.418,41.710 77.470,40.035 C 77.142,38.973 75.392,30.547 65.819,31.637 C 56.246,32.727 56.261,43.062 56.588,44.996 L 71.393,145.191 C 72.726,150.746 73.426,157.547 67.168,159.684 C 66.531,159.901 46.958,133.145 46.958,133.145 C 25.587,108.413 11.363,121.842 11.363,121.842 C 5.045,128.159 9.566,133.019 12.931,137.088 C 12.931,137.088 55.426,192.383 68.087,207.555 C 80.746,222.727 102.327,240.773 125.829,240.773 C 158.920,240.773 182.465,216.875 185.017,180.696 C 187.571,144.516 193.480,62.303 193.480,62.303 C 193.712,60.008 191.484,52.696 184.325,52.329 Z"></path>\
                        <clipPath id="kinect-cursor-press-clip">\
                            <circle id="kinect-cursor-press-clip-circle" cx="125.0" cy="250.0" r="0.0"></circle>\
                        </clipPath>\
                    </defs>\
                    <path id="kinect-cursor-glow" fill="none" stroke="#7c6dcf" stroke-width="16" stroke-miterlimit="2.75" d="M 183.605,52.966 C 176.446,52.598 173.475,57.129 173.138,60.476 C 173.138,60.476 169.428,117.739 169.428,118.866 C 169.428,122.043 166.120,125.032 162.943,125.032 C 159.768,125.032 157.193,122.457 157.193,119.282 C 157.193,118.481 159.838,26.707 159.838,26.707 C 160.026,22.285 156.177,15.602 148.185,15.483 C 140.193,15.365 137.221,21.452 137.039,25.744 C 137.039,25.744 135.680,107.703 135.680,108.926 C 135.680,112.101 133.105,114.676 129.930,114.676 C 126.754,114.676 124.179,112.101 124.179,108.926 C 124.179,108.382 119.517,15.854 118.833,14.558 C 117.779,10.934 113.220,7.741 108.026,7.865 C 102.120,8.005 97.586,12.222 97.690,16.611 C 97.693,16.689 97.707,16.763 97.711,16.840 C 97.443,17.780 101.943,112.558 101.943,113.580 C 101.943,116.757 99.367,119.330 96.193,119.330 C 93.016,119.330 89.109,116.757 89.109,113.580 C 89.109,113.249 77.698,42.348 76.750,40.673 C 76.422,39.611 74.672,31.185 65.099,32.275 C 55.526,33.365 55.542,43.700 55.868,45.634 L 70.673,145.828 C 72.006,151.384 72.706,158.185 66.448,160.322 C 65.811,160.539 46.238,133.783 46.238,133.783 C 24.867,109.051 10.643,122.479 10.643,122.479 C 4.325,128.796 8.846,133.658 12.211,137.726 C 12.211,137.726 54.706,193.021 67.367,208.193 C 80.026,223.365 101.607,241.410 125.109,241.410 C 158.200,241.410 181.745,217.513 184.297,181.334 C 186.851,145.154 192.760,62.940 192.760,62.940 C 192.992,60.645 190.764,53.335 183.605,52.966 Z "></path>\
                    <use id="kinect-cursor-normal" xlink:href="#kinect-open-hand-base" fill="white" stroke="black"></use>\
                    <g id="kinect-cursor-progress" clip-path="url(#kinect-cursor-press-clip)">\
                        <use xlink:href="#kinect-open-hand-base" fill="url(#kinect-pressing-gradient)" stroke="none"></use>\
                        <path fill="#ffffff" opacity="0.26667" d="M 124.427,213.384 C 112.266,213.384 102.021,221.573 98.898,232.737 C 100.149,233.406 101.418,234.039 102.704,234.633 C 103.681,230.576 105.768,226.953 108.627,224.091 C 112.678,220.043 118.251,217.547 124.427,217.545 C 130.605,217.547 136.180,220.043 140.229,224.091 C 143.494,227.359 145.749,231.617 146.500,236.382 C 147.841,235.885 149.154,235.336 150.435,234.742 C 148.039,222.567 137.308,213.384 124.427,213.384"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 124.427,198.974 C 107.230,198.976 92.510,209.587 86.458,224.618 C 87.591,225.494 88.748,226.351 89.928,227.182 C 91.784,222.146 94.714,217.629 98.437,213.902 C 105.097,207.247 114.272,203.137 124.427,203.136 C 134.584,203.137 143.759,207.247 150.417,213.902 C 154.657,218.144 157.862,223.407 159.632,229.293 C 160.827,228.411 161.981,227.481 163.102,226.501 C 157.556,210.480 142.338,198.976 124.427,198.974"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 124.427,184.565 C 102.982,184.566 84.386,196.770 75.204,214.613 C 76.212,215.635 77.255,216.656 78.331,217.667 C 80.843,212.467 84.209,207.756 88.252,203.713 C 97.516,194.451 110.293,188.728 124.427,188.726 C 138.563,188.728 151.341,194.451 160.607,203.713 C 164.788,207.896 168.248,212.796 170.785,218.212 C 171.735,216.955 172.636,215.651 173.492,214.300 C 164.254,196.626 145.751,184.566 124.427,184.565"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 124.427,170.155 C 99.400,170.155 77.453,183.343 65.150,203.145 C 66.181,204.417 67.117,205.563 67.944,206.563 C 70.765,201.798 74.169,197.419 78.062,193.523 C 89.934,181.653 106.315,174.317 124.427,174.317 C 142.542,174.317 158.922,181.653 170.795,193.523 C 173.825,196.555 176.559,199.879 178.951,203.450 C 179.564,201.877 180.126,200.265 180.635,198.609 C 167.941,181.352 147.493,170.155 124.427,170.155"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 124.427,155.746 C 96.053,155.747 70.960,169.793 55.719,191.310 C 56.641,192.479 57.540,193.618 58.415,194.721 C 61.215,190.636 64.383,186.827 67.874,183.335 C 82.353,168.858 102.336,159.909 124.427,159.908 C 146.520,159.909 166.502,168.858 180.983,183.335 C 181.800,184.152 182.599,184.986 183.380,185.838 C 183.594,184.171 183.765,182.476 183.887,180.752 C 183.895,180.627 183.904,180.506 183.914,180.381 C 168.687,165.159 147.658,155.747 124.427,155.746"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 124.427,141.337 C 105.045,141.338 86.970,146.934 71.728,156.599 C 70.962,158.106 69.668,159.318 67.603,160.021 C 67.549,160.021 67.405,159.895 67.185,159.658 C 59.361,165.252 52.385,171.964 46.499,179.558 C 47.386,180.694 48.270,181.825 49.147,182.943 C 51.768,179.485 54.621,176.210 57.686,173.146 C 74.774,156.061 98.359,145.500 124.427,145.499 C 147.411,145.500 168.463,153.709 184.835,167.359 C 184.953,165.715 185.072,164.022 185.195,162.298 C 168.453,149.168 147.353,141.338 124.427,141.337"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 58.345,148.266 C 50.558,153.893 43.518,160.486 37.399,167.873 C 38.266,168.990 39.140,170.114 40.016,171.242 C 42.368,168.354 44.865,165.589 47.497,162.957 C 51.632,158.824 56.096,155.021 60.846,151.594 C 60.036,150.521 59.194,149.401 58.345,148.266 M 124.427,126.928 C 105.097,126.928 86.896,131.786 70.987,140.345 L 71.635,144.735 C 87.268,136.041 105.265,131.091 124.427,131.090 C 147.312,131.091 168.535,138.151 186.056,150.215 C 186.168,148.633 186.282,147.040 186.397,145.429 C 168.603,133.731 147.312,126.928 124.427,126.928"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 49.764,136.688 C 41.913,142.379 34.739,148.942 28.380,156.237 C 29.224,157.328 30.094,158.452 30.979,159.594 C 33.003,157.241 35.116,154.962 37.309,152.768 C 41.936,148.143 46.925,143.885 52.234,140.040 C 51.303,138.780 50.463,137.639 49.764,136.688 M 168.998,120.536 C 168.581,121.903 167.600,123.146 166.369,124.003 C 173.664,126.645 180.643,129.956 187.224,133.863 C 187.333,132.322 187.443,130.781 187.555,129.239 C 181.648,125.862 175.448,122.946 168.998,120.536 M 124.427,112.518 C 116.992,112.518 109.701,113.156 102.614,114.379 C 102.373,117.292 99.933,119.577 96.962,119.577 C 94.928,119.577 92.586,118.507 91.196,116.898 C 83.399,119.001 75.894,121.826 68.763,125.296 L 69.403,129.622 C 85.962,121.340 104.648,116.681 124.427,116.680 C 135.839,116.680 146.888,118.231 157.374,121.134 C 157.224,120.626 157.144,120.087 157.144,119.530 C 157.144,119.451 157.171,118.473 157.216,116.779 C 149.919,114.840 142.373,113.535 134.623,112.921 C 133.582,114.180 132.008,114.982 130.247,114.982 C 128.305,114.982 126.591,114.009 125.569,112.524 C 125.188,112.520 124.810,112.518 124.427,112.518"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 39.819,126.114 C 32.433,131.616 25.597,137.825 19.419,144.632 C 20.211,145.659 21.073,146.779 22.001,147.981 C 23.659,146.135 25.366,144.333 27.121,142.579 C 32.061,137.639 37.375,133.073 43.014,128.926 C 41.928,127.893 40.860,126.956 39.819,126.114 M 170.043,105.607 C 169.946,107.133 169.856,108.576 169.773,109.915 C 176.197,112.156 182.408,114.863 188.360,117.991 C 188.469,116.474 188.576,114.969 188.682,113.473 C 182.702,110.426 176.478,107.793 170.043,105.607 M 88.200,102.780 C 80.728,104.749 73.501,107.312 66.564,110.417 L 67.197,114.699 C 74.130,111.524 81.370,108.909 88.865,106.909 C 88.665,105.662 88.441,104.276 88.200,102.780 M 136.090,98.581 C 136.065,100.105 136.043,101.504 136.022,102.752 C 143.367,103.365 150.542,104.553 157.514,106.273 C 157.552,104.928 157.593,103.506 157.636,102.019 C 150.641,100.340 143.443,99.180 136.090,98.581 M 124.014,98.109 C 116.527,98.131 109.170,98.733 101.998,99.873 C 102.066,101.364 102.132,102.760 102.192,104.057 C 109.366,102.891 116.723,102.281 124.225,102.270 C 124.162,101.018 124.092,99.624 124.014,98.109"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 25.247,119.229 C 20.067,123.493 15.168,128.082 10.577,132.969 C 11.247,134.191 12.138,135.342 13.033,136.436 C 14.308,135.063 15.607,133.716 16.932,132.390 C 21.157,128.166 25.626,124.191 30.320,120.486 C 28.510,119.813 26.815,119.418 25.247,119.229 M 170.989,90.758 C 170.899,92.191 170.806,93.620 170.716,95.037 C 177.170,97.096 183.429,99.574 189.475,102.441 C 189.581,100.935 189.688,99.449 189.793,97.995 C 183.724,95.194 177.450,92.774 170.989,90.758 M 85.878,88.493 C 78.490,90.370 71.310,92.774 64.383,95.660 L 65.013,99.910 C 71.944,96.964 79.138,94.518 86.550,92.617 C 86.332,91.274 86.106,89.893 85.878,88.493 M 136.324,84.145 C 136.302,85.568 136.279,86.961 136.257,88.314 C 143.644,88.883 150.880,89.979 157.934,91.565 C 157.973,90.176 158.014,88.763 158.056,87.329 C 150.976,85.776 143.727,84.703 136.324,84.145 M 123.275,83.703 C 115.823,83.758 108.499,84.332 101.330,85.396 C 101.396,86.819 101.459,88.213 101.523,89.575 C 108.691,88.492 116.029,87.909 123.491,87.864 C 123.421,86.512 123.349,85.128 123.275,83.703"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 171.940,75.994 C 171.852,77.362 171.759,78.786 171.667,80.251 C 178.143,82.164 184.452,84.460 190.573,87.115 C 190.682,85.596 190.790,84.128 190.889,82.722 C 184.746,80.121 178.425,77.871 171.940,75.994 M 83.526,74.225 C 76.227,76.022 69.113,78.287 62.217,80.990 L 62.842,85.218 C 69.746,82.467 76.883,80.161 84.209,78.344 C 83.983,76.969 83.754,75.594 83.526,74.225 M 136.561,69.714 C 136.538,71.106 136.516,72.501 136.493,73.883 C 143.926,74.414 151.223,75.436 158.354,76.912 C 158.395,75.505 158.434,74.097 158.475,72.688 C 151.318,71.238 144.014,70.238 136.561,69.714 M 122.520,69.300 C 115.118,69.381 107.814,69.936 100.665,70.932 C 100.729,72.330 100.793,73.726 100.857,75.108 C 108.012,74.093 115.322,73.534 122.740,73.460 C 122.668,72.083 122.594,70.697 122.520,69.300"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 172.901,61.296 C 172.890,61.366 172.882,61.436 172.876,61.506 C 172.876,61.506 172.779,63.011 172.615,65.532 C 179.120,67.326 185.475,69.474 191.663,71.954 C 191.785,70.258 191.889,68.793 191.976,67.601 C 185.773,65.167 179.407,63.058 172.901,61.296 M 81.131,59.975 C 73.933,61.701 66.901,63.847 60.058,66.388 L 60.680,70.598 C 67.541,68.013 74.599,65.833 81.829,64.088 C 81.592,62.680 81.358,61.305 81.131,59.975 M 136.799,55.287 C 136.777,56.658 136.755,58.045 136.732,59.453 C 144.212,59.956 151.571,60.913 158.774,62.299 C 158.814,60.876 158.856,59.470 158.895,58.086 C 151.670,56.724 144.294,55.782 136.799,55.287 M 121.748,54.899 C 114.383,55.003 107.139,55.537 100.007,56.478 C 100.069,57.858 100.133,59.252 100.196,60.651 C 107.331,59.695 114.599,59.156 121.973,59.058 C 121.899,57.666 121.823,56.276 121.748,54.899"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 78.613,45.759 C 71.559,47.418 64.653,49.450 57.909,51.836 L 58.528,56.033 C 65.309,53.602 72.264,51.536 79.368,49.857 C 79.086,48.290 78.833,46.911 78.613,45.759 M 137.038,40.863 C 137.016,42.184 136.993,43.580 136.970,45.028 C 144.504,45.506 151.917,46.410 159.193,47.718 C 159.237,46.259 159.276,44.854 159.314,43.512 C 152.015,42.224 144.588,41.334 137.038,40.863 M 120.948,40.500 C 113.651,40.624 106.448,41.142 99.363,42.031 C 99.421,43.387 99.482,44.782 99.546,46.203 C 106.646,45.300 113.867,44.778 121.183,44.659 C 121.104,43.243 121.024,41.856 120.948,40.500"></path>\
                        <path fill="#ffffff" opacity="0.26667" d="M 67.994,33.588 C 65.759,34.198 63.541,34.842 61.336,35.523 C 59.365,36.980 58.275,39.064 57.693,41.068 C 63.251,39.203 68.915,37.564 74.669,36.163 C 73.215,34.735 71.092,33.607 67.994,33.588 M 137.328,26.443 C 137.298,26.715 137.275,26.981 137.264,27.241 C 137.264,27.241 137.244,28.463 137.209,30.606 C 144.794,31.062 152.266,31.921 159.613,33.163 C 159.668,31.221 159.712,29.780 159.734,28.963 C 152.384,27.741 144.913,26.895 137.328,26.443 M 120.090,26.104 C 112.882,26.247 105.763,26.747 98.746,27.587 C 98.799,28.872 98.857,30.267 98.919,31.758 C 105.961,30.905 113.110,30.400 120.347,30.262 C 120.259,28.784 120.173,27.393 120.090,26.104"></path>\
                        <use xlink:href="#kinect-open-hand-base" fill="none" stroke="black"></use>\
                    </g>\
                    <use id="kinect-cursor-extended" xlink:href="#kinect-open-hand-base" fill="url(#kinect-extended-gradient)" stroke="black"></use>\
                </svg>';
            document.body.appendChild(cursorElement);

            var cursorData = {
                "element": cursorElement,
                "show": function () {
                    // Cursor will be shown next time we get a valid hand pointer
                    showCursor = true;
                },
                "hide": function () {
                    // Hide cursor immediately
                    showCursor = false;
                    $(cursorElement).hide();
                }
            };
            jQuery.data(cursorElement, uiController.CURSOR_ID, cursorData);
            
            var wasHovering = false;
            var wasPressing = false;
            uiAdapter.addHitTestExclusion(cursorElement);

            uiAdapter.on(uiController.HANDPOINTERS_UPDATED, function(handPointers) {
                var MAXIMUM_CURSOR_SCALE = 1.0;
                var MINIMUM_CURSOR_SCALE = 0.8;
                var MINIMUM_PROGRESS_CLIP_RADIUS = 8.0;
                var RANGE_PROGRESS_CLIP_RADIUS = 240.0;

                // If cursor is not supposed to be showing, bail out immediately
                if (!showCursor) {
                    return;
                }

                var handPointer = null;

                for (var iPointer = 0; iPointer < handPointers.length; ++iPointer) {
                    var curPointer = handPointers[iPointer];

                    if (curPointer.getIsPrimaryHandOfPrimaryUser()) {
                        handPointer = curPointer;
                        break;
                    }
                }

                if (cursorElement == null) {
                    return;
                }

                function clamp(value, min, max) {
                    return Math.max(min, Math.min(max, value));
                }

                if (handPointer != null) {
                    var isOpen = !handPointer.isInGripInteraction;

                    // Get information about what this hand pointer is over
                    var isHovering = false;
                    var isOverPressTarget = false;
                    var enteredElements = handPointer.getEnteredElements();
                    for (var iEnteredElement = 0; iEnteredElement < enteredElements.length; ++iEnteredElement) {
                        var enteredElement = enteredElements[iEnteredElement];
                        if (KinectUI.getIsPressTarget(enteredElement)) {
                            isHovering = true;
                            isOverPressTarget = true;
                            break;
                        }

                        if (KinectUI.getIsGripTarget(enteredElement)) {
                            isHovering = true;
                        }
                    }

                    var isPressing = isOverPressTarget && handPointer.isPressed && !handPointer.isInGripInteraction;

                    if (isHovering != wasHovering) {
                        if (isHovering) {
                            $(cursorElement).addClass("cursor-hover");
                        } else {
                            $(cursorElement).removeClass("cursor-hover");
                        }
                        wasHovering = isHovering;
                    }

                    if (isPressing != wasPressing) {
                        if (isPressing) {
                            $(cursorElement).addClass("cursor-pressed");
                        } else {
                            $(cursorElement).removeClass("cursor-pressed");
                        }
                        wasPressing = isPressing;
                    }

                    var artworkWidth = $(cursorElement).width();
                    var artworkHeight = $(cursorElement).height();
                    var adjustedPressExtent = isOverPressTarget ? handPointer.pressExtent : 0.0;

                    document.getElementById("kinect-cursor-press-clip-circle").r.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, MINIMUM_PROGRESS_CLIP_RADIUS + (RANGE_PROGRESS_CLIP_RADIUS * adjustedPressExtent));

                    var scale = (1.0 - (adjustedPressExtent * ((MAXIMUM_CURSOR_SCALE - MINIMUM_CURSOR_SCALE) / 2.0)));
                    var xScale = (handPointer.handType == "Left") ? -scale : scale;
                    var yScale = scale;
                    $(cursorElement).css("transform", "scale(" + xScale + "," + yScale + ")");

                    var xPos = clamp(handPointer.x, 0, window.innerWidth);
                    var yPos = clamp(handPointer.y, 0, window.innerHeight);
                    var isClamped = (xPos != handPointer.x) || (yPos != handPointer.y);
                    var xDelta = (artworkWidth / 2) * scale;
                    var yDelta = (artworkHeight / 2) * scale;
                    var opacity = !isClamped ? 1.0 : 0.3;

                    $(cursorElement).show();
                    $(cursorElement).offset({ left: xPos - xDelta, top: yPos - yDelta });
                    $(cursorElement).css("opacity", opacity);
                } else {
                    $(cursorElement).hide();
                }
            });

            return cursorData;
        };

        // Enable triggering of UI events as interaction frames are received.
        //     .enableEvents()
        //
        // Remarks
        // This and .disableEvents() function serve as a global on/off switch
        // so that clients don't have to be registering and unregistering all
        // event handlers as they enter/exit a state where they don't want or
        // need to process Kinect UI events.
        // Events are enabled by default.
        this.enableEvents = function() {
            handPointerEventsEnabled = true;
        };

        // Disable triggering of UI events as interaction frames are received.
        //     .disableEvents()
        //
        // Remarks
        // This and .enableEvents() function serve as a global on/off switch
        // so that clients don't have to be registering and unregistering all
        // event handlers as they enter/exit a state where they don't want or
        // need to process Kinect UI events.
        // Events are enabled by default.
        this.disableEvents = function () {
            handPointerEventsEnabled = false;
        };
    }

    //////////////////////////////////////////////////////////////
    // KinectUIController object constructor
    function KinectUIController() {

        //////////////////////////////////////////////////////////////
        // Public KinectUIController methods

        // Creates a new Kinect UI adapter object optionally associated with a Kinect sensor.
        //     .createAdapter( [sensor] )
        //
        // sensor: sensor object associated with the new UI adapter
        this.createAdapter = function (sensor) {
            if (typeof sensor != 'object') {
                throw new Error("first parameter must be either a sensor object or left unspecified");
            }

            var uiAdapter = new KinectUIAdapter();

            if (sensor != null) {
                sensor.addStreamFrameHandler(uiAdapter.streamFrameHandler);
                sensor.setHitTestHandler(uiAdapter.hitTestHandler);
            }

            return uiAdapter;
        };

        // Determines whether the specified element has been designated as a press target
        //     .getIsPressTarget( element )
        //
        // element: DOM element for which we're querying press target status.
        this.getIsPressTarget = function (element) {
            return jQuery.data(element, "isPressTarget") ? true : false;
        };

        // Specifies whether the specified element should be designated as a press target
        //     .setIsPressTarget( element, isPressTarget )
        //
        // element: DOM element for which we're specifying press target status.
        // isPressTarget: true if element should be designated as a press target.
        //                false otherwise.
        this.setIsPressTarget = function (element, isPressTarget) {
            jQuery.data(element, "isPressTarget", isPressTarget);
        };

        // Determines whether the specified element has been designated as a grip target
        //     .getIsPressTarget( element )
        //
        // element: DOM element for which we're querying grip target status.
        this.getIsGripTarget = function (element) {
            return jQuery.data(element, "isGripTarget") ? true : false;
        };

        // Specifies whether the specified element should be designated as a grip target
        //     .setIsGripTarget( element, isGripTarget )
        //
        // element: DOM element for which we're specifying grip target status.
        // isGripTarget: true if element should be designated as a grip target.
        //               false otherwise.
        this.setIsGripTarget = function (element, isGripTarget) {
            jQuery.data(element, "isGripTarget", isGripTarget);
        };

        // Determines whether the primary hand pointer is over the specified element
        //     .getIsPrimaryHandPointerOver( element )
        //
        // element: DOM element for which we're querying if primary hand pointer is over it.
        this.getIsPrimaryHandPointerOver = function (element) {
            return jQuery.data(element, "isPrimaryHandPointerOver") ? true : false;
        };

        // Specifies whether the primary hand pointer is over the specified element
        //     .setIsPrimaryHandPointerOver( element )
        //
        // element: DOM element for which we're specifying if primary hand pointer is over it.
        // over: true if primary hand pointer is over the specified element. false otherwise.
        this.setIsPrimaryHandPointerOver = function (element, over) {
            jQuery.data(element, "isPrimaryHandPointerOver", over);
        };

        //////////////////////////////////////////////////////////////
        // Public KinectUIController properties

        // Element event names
        this.HANDPOINTER_MOVE = "handPointerMove";
        this.HANDPOINTER_ENTER = "handPointerEnter";
        this.HANDPOINTER_LEAVE = "handPointerLeave";
        this.HANDPOINTER_PRESS = "handPointerPress";
        this.HANDPOINTER_PRESSRELEASE = "handPointerPressRelease";
        this.HANDPOINTER_GRIP = "handPointerGrip";
        this.HANDPOINTER_GRIPRELEASE = "handPointerGripRelease";
        this.HANDPOINTER_GOTCAPTURE = "handPointerGotCapture";
        this.HANDPOINTER_LOSTCAPTURE = "handPointerLostCapture";
        this.QUERY_INTERACTION_STATUS = "queryInteractionStatus";

        // Global UI event names
        this.HANDPOINTERS_UPDATED = "handPointersUpdated";

        // Global UI id/class names
        this.BUTTON_CLASS = "kinect-button";
        this.BUTTON_TEXT_CLASS = "kinect-button-text";
        this.BUTTON_HOVER_CLASS = "button-hover";
        this.BUTTON_PRESSED_CLASS = "button-pressed";

        this.CURSOR_ID = "kinect-cursor";
    };
    
    //////////////////////////////////////////////////////////////
    // Private global properties common to all KinectUI objects
    
    // Get the path common to all script files
    var scriptRootURIPath = (function () {
        var rootPath = "";

        try {
            var scriptFileName = document.scripts[document.scripts.length - 1].src;
            var pathSeparatorIndex = scriptFileName.lastIndexOf("/");

            if (pathSeparatorIndex >= 0) {
                // If pathSeparator is found, return path up to and including separator
                rootPath = scriptFileName.substring(0, pathSeparatorIndex + 1);
            }
        } catch(error) {
        }
        console.log('rootPath',rootPath);

        return rootPath;
    })();

    // The global Kinect UI controller object is a singleton instance of our internal KinectUIController type
    var uiController = new KinectUIController();
    
    // Prefix for element IDs assigned by Kinect UI layer for purposes of hit test detection
    var kinectIdPrefix = "kinectId";

    // Id in sequence to assign to controls that don't already have an assigned DOM element id
    var lastAssignedControlId = 0;
    
    // return singleton
    return uiController;
})();

// Guarantee that Kinect and KinectUI objects are available from the global scope even if
// this file was loaded on-demand, in a restricted functional scope, a long time after web
// document was initially loaded.
window.Kinect = Kinect;
window.KinectUI = KinectUI;